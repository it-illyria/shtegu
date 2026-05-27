"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface GeoState {
  /** [lng, lat] to match GeoJSON / MapLibre ordering. */
  position: [number, number] | null;
  accuracy: number | null;
  heading: number | null;
  error: string | null;
  watching: boolean;
}

const initial: GeoState = {
  position: null,
  accuracy: null,
  heading: null,
  error: null,
  watching: false,
};

/**
 * Foreground geolocation watch. A PWA can track position while the page is
 * visible; true background tracking (screen off) needs a native wrapper.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>(initial);
  const watchId = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setState((s) => ({ ...s, watching: false }));
  }, []);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, error: "Geolocation not supported" }));
      return;
    }
    if (watchId.current !== null) return;
    setState((s) => ({ ...s, watching: true, error: null }));
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          position: [pos.coords.longitude, pos.coords.latitude],
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          error: null,
          watching: true,
        });
      },
      (err) => setState((s) => ({ ...s, error: err.message, watching: false })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { ...state, start, stop };
}
