# Smart City Ecosystem — Albania
> Ekosistemi #17 nga 18 | 7 produkte | B2G + B2C

---

## 🗺️ Përmbledhja

```
Smart City Ecosystem
├── ✅ BusSHQ          → Udhëto Shqip (komplet)
├── 🔲 AirQSHQ         → Monitorim ajri (hapi tjetër)
├── 🔲 WaterSHQ        → Monitorim uji
├── 🔲 EnergjSHQ       → Smart grid
├── 🔲 CityAI          → Digital twin + AI administrim
├── 🔲 Smart Tirana    → IoT qytet + kamera AI
└── 🔲 Digital Albania → eID + X-Road + SSO kombëtar
```

**Financimi:** Qeveria + BE fondet (B2G kontrata)
**Strategjia:** Ndërto produktet private fillimisht → pitch bashkinë me të dhëna reale

---

## ✅ BusSHQ — "Udhëto Shqip" (KOMPLET)

**Repo:** `workspace/transit/tirana-transit`
**Stack:** React Native + Expo SDK 55 + expo-sqlite + GTFS

| Feature | Detaje |
|---|---|
| Urban transit | 28+ linja Tiranë, 221 stacione |
| Intercity | 55 rrugë, 3 terminale |
| International | 47 rrugë, 17 vende |
| Trip Planner | Algoritëm RAPTOR me transferta |
| Offline | GTFS i cache-uar në SQLite |
| Realtime hartë | react-native-maps + Leaflet |
| Bilingual | Shqip + Anglisht |
| Dark/Light mode | ✅ |

---

## 🔲 AirQSHQ — Monitorim Ajri (HAPI TJETËR)

**Stack:** OpenAQ API + Supabase (PostGIS) + React Native + react-native-maps
**Kohëzgjatja:** 1-2 javë (stack identik me Udhëto Shqip)

### Arkitektura

```
OpenAQ API (të dhëna reale Shqipëri)
         ↓
  Cron Job (sync çdo orë)
         ↓
  Supabase PostgreSQL + PostGIS
         ↓
  React Native App
  ├── Hartë me markers AQI (ngjyrë sipas nivelit)
  ├── Heatmap layer
  ├── Grafik 24h për çdo stacion
  └── Alertet push (AQI > 100)
```

### Database Schema

```sql
create table air_stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text default 'openaq',
  location geography(point, 4326) not null,
  external_id text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table air_readings (
  id uuid primary key default gen_random_uuid(),
  station_id uuid references air_stations(id),
  pm25 numeric,
  pm10 numeric,
  no2  numeric,
  o3   numeric,
  co   numeric,
  aqi  integer,
  recorded_at timestamptz not null,
  created_at timestamptz default now()
);

create index on air_stations using gist(location);
create index on air_readings(station_id, recorded_at desc);
alter table air_readings replica identity full;
```

### AQI Calculator

```typescript
// lib/aqi.ts
export function calculateAQI(pm25: number): number {
  const breakpoints = [
    { low: 0,     high: 12.0,  aqiLow: 0,   aqiHigh: 50  },
    { low: 12.1,  high: 35.4,  aqiLow: 51,  aqiHigh: 100 },
    { low: 35.5,  high: 55.4,  aqiLow: 101, aqiHigh: 150 },
    { low: 55.5,  high: 150.4, aqiLow: 151, aqiHigh: 200 },
    { low: 150.5, high: 250.4, aqiLow: 201, aqiHigh: 300 },
  ]
  const bp = breakpoints.find(b => pm25 >= b.low && pm25 <= b.high)
  if (!bp) return 301
  return Math.round(
    ((bp.aqiHigh - bp.aqiLow) / (bp.high - bp.low)) * (pm25 - bp.low) + bp.aqiLow
  )
}

export function aqiColor(aqi: number) {
  if (aqi <= 50)  return '#00e400'
  if (aqi <= 100) return '#ffff00'
  if (aqi <= 150) return '#ff7e00'
  if (aqi <= 200) return '#ff0000'
  if (aqi <= 300) return '#8f3f97'
  return '#7e0023'
}

export function aqiLabel(aqi: number) {
  if (aqi <= 50)  return 'E mirë'
  if (aqi <= 100) return 'E moderuar'
  if (aqi <= 150) return 'Ndikim i kufizuar'
  if (aqi <= 200) return 'Jo e shëndetshme'
  if (aqi <= 300) return 'Shumë jo e shëndetshme'
  return 'Hazardoze'
}
```

### OpenAQ Sync

```typescript
// scripts/sync-openaq.ts — ekzekuto me cron çdo orë
async function syncAlbania() {
  const res = await fetch(
    'https://api.openaq.io/v3/locations?country=AL&limit=50',
    { headers: { 'X-API-Key': process.env.OPENAQ_API_KEY } }
  )
  const { results } = await res.json()

  for (const station of results) {
    const { data: st } = await supabase
      .from('air_stations')
      .upsert({ external_id: String(station.id), name: station.name })
      .select().single()

    const r = await fetch(
      `https://api.openaq.io/v3/locations/${station.id}/measurements?limit=1`
    )
    const { results: measures } = await r.json()
    const pm25 = measures.find(m => m.parameter === 'pm25')?.value
    if (!pm25) continue

    await supabase.from('air_readings').insert({
      station_id: st.id,
      pm25,
      aqi: calculateAQI(pm25),
      recorded_at: new Date().toISOString()
    })
  }
}
```

### Map Screen

```typescript
// app/(tabs)/air-quality.tsx
export default function AirQualityScreen() {
  const [stations, setStations] = useState([])

  useEffect(() => {
    const channel = supabase
      .channel('air_readings')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'air_readings' },
        payload => updateStation(payload.new)
      )
      .subscribe()

    fetchStations()
    return () => supabase.removeChannel(channel)
  }, [])

  return (
    <MapView initialRegion={{ latitude: 41.3275, longitude: 19.8187, latitudeDelta: 0.1, longitudeDelta: 0.1 }}>
      {stations.map(s => (
        <Marker key={s.id} coordinate={{ latitude: s.lat, longitude: s.lng }}>
          <AQIMarker aqi={s.aqi} color={aqiColor(s.aqi)} />
        </Marker>
      ))}
      <Heatmap
        points={stations.map(s => ({ latitude: s.lat, longitude: s.lng, weight: s.aqi / 300 }))}
        radius={50}
        opacity={0.6}
      />
    </MapView>
  )
}
```

### Strukturë Projektit

```
airqshq/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Harta + heatmap
│   │   ├── stations.tsx       # Lista + ranking
│   │   └── alerts.tsx         # AQI > 100
│   └── station/[id].tsx       # Detaje + grafiku 24h
├── lib/
│   ├── aqi.ts
│   ├── airquality.ts          # OpenAQ client
│   └── supabase.ts
├── components/
│   ├── AQIMarker.tsx
│   ├── AQICard.tsx
│   └── AQIChart.tsx           # Victory Native
└── scripts/
    └── sync-openaq.ts
```

### Ndryshimi nga Udhëto Shqip

| Udhëto Shqip | AirQSHQ |
|---|---|
| GTFS → orare autobusash | OpenAQ → të dhëna ajri |
| Markers = stacione | Markers = sensorë me ngjyrë AQI |
| Real-time = pozicion autobusi | Real-time = lexime të reja |
| SQLite offline | Supabase + PostGIS |

---

## 🔲 WaterSHQ — Monitorim Uji

**Stack:** OpenWater + ThingsBoard + Supabase + Ntfy
**Parametrat:** pH, turbidity, dissolved oxygen, temperature
**Burimet:** Lumi Lana, Lumi Erzen, rezervuarët e ujit të pijshëm

---

## 🔲 EnergjSHQ — Smart Grid

**Stack:** OpenEMS + ThingsBoard + Grafana + Akaunting
- Monitorim konsumi real-time për ndërtesa publike
- AI optimizim konsumi (Ollama)
- Dashboard bashkie me kursime €

---

## 🔲 CityAI — Digital Twin

**Stack:** PostGIS + Eclipse Ditto + Ollama + Apache Superset
- Digital twin i Tiranës (ndërtesa + rrugë + utilities)
- AI asistent për administratorët bashkie
- Raporte automatike: trafik, mjedis, energji

---

## 🔲 Digital Albania Stack — Infrastruktura Kombëtare

**Stack:** X-Road + TARA + CDOC2 + SiGa + Keycloak + Superset
**Analogu:** e-Estonia | **Financimi:** BE (IPA) + Qeveria

| Komponenta | Tool | Çfarë bën |
|---|---|---|
| Data exchange | X-Road | Backbone ndërmjet institucioneve |
| SSO | TARA | Autentifikim i unifikuar |
| Enkriptim | CDOC2 | Quantum-resistant encryption |
| Nënshkrim | SiGa | Signature Gateway |
| Identity | Keycloak | OAuth2 + SAML + eID |
| Analytics | Superset | Open data dashboard |

---

## 📊 Gjendja & Hapat Tjetër

| Produkt | Status | Hapi Tjetër |
|---|---|---|
| BusSHQ | ✅ Komplet | Publish App Store |
| AirQSHQ | 🟡 Arkitektura gati | Fillo ndërtimin |
| WaterSHQ | 🔲 Planifikuar | Pas AirQSHQ |
| EnergjSHQ | 🔲 Planifikuar | — |
| CityAI | 🔲 Planifikuar | Kërkon të dhëna bashkie |
| Smart Tirana | 🔲 Planifikuar | B2G pitch |
| Digital Albania | 🔲 Afatgjatë | Kërkon qeveri |

### Strategjia e Pitchit

```
1. BusSHQ live       → downloads + users si provë
2. AirQSHQ live      → të dhëna reale ajri Tiranë
3. Paketo si "Smart Tirana Suite" → pitch bashkinë
4. Bashkia paguan SaaS ose blen produktin
5. Shto WaterSHQ + EnergjSHQ → pitch qeverinë
6. Digital Albania Stack → pitch Ministrinë
```

---

*Gjeneruar: Maj 2026 | Pjesë e ALBANIA_TECH_MASTER.md*
