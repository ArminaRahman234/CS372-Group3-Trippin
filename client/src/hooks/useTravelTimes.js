import { useEffect, useMemo, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { MAPS_LOADER_OPTIONS } from "../services/mapsConfig";

// turn milliseconds into minutes
function formatDuration(ms) {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

// turn meters into miles
function formatDistance(meters) {
  const miles = meters / 1609.344;
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}

// Calculates travel time between each itinerary stop and the one before it.
// Returns { [itemId]: { duration: "25 min", distance: "12.3 mi", from: "Hotel Check-In" } }
export function useTravelTimes(sortedItems, travelMode = "DRIVING") {
  const { isLoaded } = useJsApiLoader(MAPS_LOADER_OPTIONS);
  const [travelTimes, setTravelTimes] = useState({});

  // only stops that have coordinates can be routed
  const stops = useMemo(
    () => sortedItems.filter((item) => item.lat != null && item.lng != null),
    [sortedItems]
  );

  // changes only when a stop's location or the order changes,
  // so editing a title or notes doesn't trigger new API calls
  const stopsKey = stops.map((s) => `${s.id}:${s.lat},${s.lng}`).join("|");

  useEffect(() => {
    if (!isLoaded || stops.length < 2) {
      setTravelTimes({});
      return;
    }

    let cancelled = false; // ignore results if the stops changed while we were waiting

    async function loadTravelTimes() {
      try {
        const { RouteMatrix } = await window.google.maps.importLibrary("routes");

        // one small request per pair of back-to-back stops
        const results = await Promise.all(
          stops.slice(1).map(async (stop, i) => {
            const prev = stops[i];

            try {
              const { matrix } = await RouteMatrix.computeRouteMatrix({
                origins: [{ lat: Number(prev.lat), lng: Number(prev.lng) }],
                destinations: [{ lat: Number(stop.lat), lng: Number(stop.lng) }],
                travelMode,
                fields: ["durationMillis", "distanceMeters", "condition"],
              });

              const route = matrix.rows[0]?.items[0];
              if (route?.condition !== "ROUTE_EXISTS") return null; // e.g. no road between them

              return [
                stop.id,
                {
                  duration: formatDuration(route.durationMillis),
                  distance: formatDistance(route.distanceMeters),
                  from: prev.title || prev.location,
                },
              ];
            } catch (error) {
              console.error(`Could not get travel time to "${stop.title}":`, error);
              return null; // one failed pair shouldn't hide the others
            }
          })
        );

        if (!cancelled) {
          setTravelTimes(Object.fromEntries(results.filter(Boolean)));
        }
      } catch (error) {
        console.error("Could not load travel times:", error);
        if (!cancelled) setTravelTimes({});
      }
    }

    loadTravelTimes();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, stopsKey, travelMode]); // eslint-disable-line react-hooks/exhaustive-deps

  return travelTimes;
}

export default useTravelTimes;