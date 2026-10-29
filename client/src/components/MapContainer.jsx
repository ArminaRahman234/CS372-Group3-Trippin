import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Marker, Polyline } from "@react-google-maps/api";
import PlaceSearch from "./PlaceSearch";

const containerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "15px",
};

const defaultCenter = { // default map view Chicago
  lat: 41.8781,
  lng: -87.6298,
};

const LIBRARIES = ["places"];

export function MapContainer({onAddBookmark, activeTrip, itineraryItems = []}) {
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({ // load map
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES, // spots api library
  });

  const onLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const [routeMode, setRouteMode] = useState("all");
  const [selectedDay, setSelectedDay] = useState("all");

    const availableDays = useMemo( // available days to filter map
    () => Array.from(new Set(itineraryItems.map((item) => item.rawDate).filter(Boolean))).sort(),
    [itineraryItems]
  );

  
  const points = useMemo(() => {
    const pts = [];

    if (routeMode === "all" && activeTrip?.startLat && activeTrip?.startLng) { 
      pts.push({
        lat: Number(activeTrip.startLat),
        lng: Number(activeTrip.startLng),
        title: `Start: ${activeTrip.startLocation || "Start Point"}`,
      });
    }

    itineraryItems.forEach((item) => { 
      if (item.lat && item.lng && (selectedDay === "all" || item.rawDate === selectedDay)) {
        pts.push({
          lat: Number(item.lat),
          lng: Number(item.lng),
          title: item.title || item.location,
        });
      }
    });

    if (routeMode === "all" && activeTrip?.destLat && activeTrip?.destLng) { 
      pts.push({
        lat: Number(activeTrip.destLat),
        lng: Number(activeTrip.destLng),
        title: `Destination: ${activeTrip.destination || "End Point"}`,
      });
    }

    return pts;
  }, [activeTrip, itineraryItems, routeMode, selectedDay]);

  useEffect(() => { 
    if (mapRef.current && points.length > 0 && window.google) {
      const bounds = new window.google.maps.LatLngBounds();
      points.forEach((pt) => bounds.extend({ lat: pt.lat, lng: pt.lng }));
      mapRef.current.fitBounds(bounds);

      if (points.length === 1) {
        mapRef.current.setZoom(12);
      }
    }
  }, [points, isLoaded]);

  const polylinePath = points.map((pt) => ({ lat: pt.lat, lng: pt.lng }));

  if (loadError) {
    return <div style={{ padding: "20px", color: "#ef4444" }}>Error loading Google Maps.</div>;
  }

  if (!isLoaded) {
    return <div style={{ padding: "20px", color: "#64748b" }}>Loading Map...</div>;
  }

  return (
    <div className="map-wrapper" style={{ marginBottom: "30px" }}>
        <PlaceSearch onAddBookmark={onAddBookmark} /> {/* render spot search and bookmark*/}
      
        {/*route filters*/}
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button
            type="button"
            onClick={() => setRouteMode("all")}
            
            style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: routeMode === "all" ? "#6366f1" : "#e2e8f0",
                color: routeMode === "all" ? "#fff" : "#334155",
                fontWeight: "bold",
                cursor: "pointer",
            }}
            >
            Full Trip Route
            </button>

            <button
            type="button"
            onClick={() => setRouteMode("itinerary")}
            
            style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: routeMode === "itinerary" ? "#6366f1" : "#e2e8f0",
                color: routeMode === "itinerary" ? "#fff" : "#334155",
                fontWeight: "bold",
                cursor: "pointer",
            }}
            >
            Itinerary Spots Only
            </button>
            
            <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            
            style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#fff",
                color: "#334155",
                fontWeight: "bold",
                cursor: "pointer",
            }}
            >

            <option value="all">All Days</option>
            
            {availableDays.map((day) => (
                <option key={day} value={day}>
                    {day}
                </option>
            ))}
            </select>
        </div>

        {/*render map*/}
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={12}
            onLoad={onLoad}
            onUnmount={onUnmount}
        >
        
        {/*render pins*/}
        {points.map((pt, idx) => (
          <Marker key={idx} position={{ lat: pt.lat, lng: pt.lng }} title={pt.title} />
        ))}

        {/*draw route lines*/}
        {polylinePath.length > 1 && (
          <Polyline
            path={polylinePath}
            
            options={{
              strokeColor: "#6366f1",
              strokeOpacity: 0.8,
              strokeWeight: 4,
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}

export default MapContainer;