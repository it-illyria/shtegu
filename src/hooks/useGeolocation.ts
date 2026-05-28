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
      setState((s) => ({ ...s, error: "unsupported" }));
      return;
    }
    if (watchId.current !== null) return;
    setState((s) => ({ ...s, watching: true, error: null }));
    const onSuccess = (pos: GeolocationPosition) => {
      setState({
        position: [pos.coords.longitude, pos.coords.latitude],
        accuracy: pos.coords.accuracy,
        heading: pos.coords.heading,
        error: null,
        watching: true,
      });
    };

    const codeFor = (err: GeolocationPositionError) =>
      err.code === 1 ? "denied" : err.code === 3 ? "timeout" : "unavailable";

    // Quick first fix: allow cached position + network-based geolocation.
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      () => {/* ignore — watch will report errors */},
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );

    const startWatch = (highAccuracy: boolean) => {
      watchId.current = navigator.geolocation.watchPosition(
        onSuccess,
        (err) => {
          // On timeout with high accuracy, retry once with lower accuracy.
          if (err.code === 3 && highAccuracy) {
            if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
            startWatch(false);
            return;
          }
          setState((s) => ({ ...s, error: codeFor(err), watching: false }));
        },
        { enableHighAccuracy: highAccuracy, maximumAge: 30_000, timeout: 30_000 },
      );
    };
    startWatch(true);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { ...state, start, stop };
}
