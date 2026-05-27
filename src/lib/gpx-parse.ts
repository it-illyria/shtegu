// Thin GPX parser that extracts a name and track coordinates.
// Returns GeoJSON-order coords ([lng, lat]).

export interface GpxData {
  name: string;
  coords: [number, number][]; // [lng, lat] — GeoJSON order
}

export function parseGpx(xml: string): GpxData | null {
  const doc = new DOMParser().parseFromString(xml, "text/xml");

  // Name: first <name> inside <metadata>, then first <name> inside <trk>.
  const metaName = doc.querySelector("metadata > name")?.textContent?.trim();
  const trkName = doc.querySelector("trk > name")?.textContent?.trim();
  const name = metaName || trkName || "Imported Route";

  // Coords: all <trkpt lat="..." lon="..."> elements.
  const coords: [number, number][] = [];
  doc.querySelectorAll("trkpt").forEach((pt) => {
    const lat = parseFloat(pt.getAttribute("lat") ?? "");
    const lon = parseFloat(pt.getAttribute("lon") ?? "");
    if (!isNaN(lat) && !isNaN(lon)) {
      coords.push([lon, lat]); // GeoJSON order: [lng, lat]
    }
  });

  if (coords.length < 2) return null;

  return { name, coords };
}
