import { useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
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

export function MapContainer({ onAddBookmark }) {
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

  if (loadError) {
    return <div style={{ padding: "20px", color: "#ef4444" }}>Error loading Google Maps.</div>;
  }

  if (!isLoaded) {
    return <div style={{ padding: "20px", color: "#64748b" }}>Loading Map...</div>;
  }

  return (
    <div className="map-wrapper" style={{ marginBottom: "30px" }}>
      <PlaceSearch onAddBookmark={onAddBookmark} /> {/* render spot search and bookmark */}

      <GoogleMap // render map
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
      />
    </div>
  );
}

export default MapContainer;