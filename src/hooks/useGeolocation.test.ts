import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGeolocation } from "./useGeolocation";

afterEach(() => vi.restoreAllMocks());

describe("useGeolocation", () => {
  it("starts watching and exposes the position as [lng, lat]", () => {
    const clearWatch = vi.fn();
    const fakePosition = {
      coords: {
        longitude: 19.77,
        latitude: 42.39,
        accuracy: 12,
        heading: null,
        altitude: null,
        altitudeAccuracy: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as GeolocationPosition;
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success(fakePosition);
    });
    const watchPosition = vi.fn((success: PositionCallback) => {
      success(fakePosition);
      return 1;
    });
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition, watchPosition, clearWatch } });

    const { result } = renderHook(() => useGeolocation());
    expect(result.current.position).toBeNull();

    act(() => result.current.start());

    expect(watchPosition).toHaveBeenCalledOnce();
    expect(result.current.position).toEqual([19.77, 42.39]); // [lng, lat]
    expect(result.current.accuracy).toBe(12);
    expect(result.current.watching).toBe(true);

    act(() => result.current.stop());
    expect(clearWatch).toHaveBeenCalledWith(1);
    expect(result.current.watching).toBe(false);
  });

  it("reports an error code when geolocation is unsupported", () => {
    vi.stubGlobal("navigator", {});
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.start());
    expect(result.current.error).toBe("unsupported");
  });
});
