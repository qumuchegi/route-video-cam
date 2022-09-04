export function recordGPS(
  posUpdateCallback?: (pos: GeolocationPosition) => void
) {
  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      posUpdateCallback?.(pos);
    },
    (err) => {
      console.error("recordGPS", err);
    }
  );
  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}
