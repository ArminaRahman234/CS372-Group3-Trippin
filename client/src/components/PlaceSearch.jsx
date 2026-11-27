import { useState, useRef } from "react";
import { Autocomplete } from "@react-google-maps/api"; // Wrapper: Uses Google Places API to auto-suggest locations as you type

export function PlaceSearch({ onAddBookmark, isLoaded }) {
  const [autocomplete, setAutocomplete] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const inputRef = useRef(null);

  const onLoad = (autocompleteInstance) => { // auto-suggest locations as location is typed
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => { // get spot location details
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        setSelectedPlace({
          title: place.name || place.formatted_address,
          location: place.formatted_address || place.name,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          type: "Saved Spot",
          icon: "📍",
        });
      }
    }
  };

  const handleBookmark = () => { // bookmark spot
    if (!selectedPlace) return;

    onAddBookmark(selectedPlace);

    if (inputRef.current) { // reset search
      inputRef.current.value = "";
    }
    setSelectedPlace(null);
  };

  return (
    <div className="place-search-container" style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
      
      {/*search bar*/}
      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged} style={{ flex: 1 }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search places to bookmark (e.g., Millennium Park, Navy Pier)..."
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            fontSize: "14px",
          }}
        />
      </Autocomplete>

      {/*add bookmark*/}
      <button
        type="button"
        onClick={handleBookmark}
        disabled={!selectedPlace}
        style={{
          padding: "12px 20px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: selectedPlace ? "#6366f1" : "#94a3b8",
          color: "#ffffff",
          fontWeight: "600",
          cursor: selectedPlace ? "pointer" : "not-allowed",
        }}
      >
        + Bookmark Place
      </button>
    </div>
  );
}

export default PlaceSearch;