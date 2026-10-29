import { useRef } from "react";
import { Autocomplete } from "@react-google-maps/api";

function TripForm({
  isOpen,
  onClose,
  onSaveTrip,
  tripDraft,
  setTripDraft,
  isEditing = false,
}) { // object fields to store input data

  const startAutoRef = useRef(null);
  const destAutoRef = useRef(null);

  if (!isOpen) return null;

  function handleChange(event) { // temporary data safekeep
    const { name, value } = event.target;
    setTripDraft((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  const onStartPlaceChanged = () => { // start location
    if (startAutoRef.current) {
      const place = startAutoRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        setTripDraft((prev) => ({
          ...prev,
          startLocation: place.formatted_address || place.name,
          startLat: place.geometry.location.lat(),
          startLng: place.geometry.location.lng(),
        }));
      }
    }
  };

  const onDestPlaceChanged = () => { // destination location
    if (destAutoRef.current) {
      const place = destAutoRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        setTripDraft((prev) => ({
          ...prev,
          destination: place.formatted_address || place.name,
          destLat: place.geometry.location.lat(),
          destLng: place.geometry.location.lng(),
        }));
      }
    }
  };

  function handleSubmit(event) { // save the trip data
    event.preventDefault();

    if ( // check for required input
      !tripDraft.title ||
      !tripDraft.startLocation ||
      !tripDraft.destination ||
      !tripDraft.startDate ||
      !tripDraft.endDate
    ) {
      alert("Please fill out all required fields.");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(`${tripDraft.startDate}T00:00:00`);
    const end = new Date(`${tripDraft.endDate}T00:00:00`);

    if (end < start) { // check for start date is before end date
      alert("End date cannot be earlier than start date.");
      return;
    }

    if (start < today) { // warning for past start date
      const confirmPastTrip = window.confirm(
        "Notice: The start date you selected is in the past. Do you still want to save this trip?"
      );
      if (!confirmPastTrip) return;
    }

    onSaveTrip(tripDraft);
    onClose();
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal"> {/*Style the form*/}
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              {isEditing ? "EDIT TRIP" : "NEW TRIP"}
            </p>

            <h2>
              {isEditing ? "Edit Your Trip" : "Create Your Trip"}
            </h2>
          </div>

          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Trip Title *
            <input
              type="text"
              name="title"
              value={tripDraft.title}
              onChange={handleChange}
              placeholder="Example: Miami Summer Getaway"
            />
          </label>

          <div className="form-row">
            <label>
              Starting Location *
              {/*auto-suggest locations*/}
              <Autocomplete
                  onLoad={(auto) => (startAutoRef.current = auto)}
                  onPlaceChanged={onStartPlaceChanged}
                >
                  <input
                    type="text"
                    name="startLocation"
                    value={tripDraft.startLocation}
                    onChange={handleChange}
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                    placeholder="Example: Fort Wayne, IN"
                  />
                </Autocomplete>
            </label>

            <label>
              Destination *
              {/*auto-suggest locations*/}
              <Autocomplete
                onLoad={(auto) => (destAutoRef.current = auto)}
                onPlaceChanged={onDestPlaceChanged}
              >
                <input
                  type="text"
                  name="destination"
                  value={tripDraft.destination}
                  onChange={handleChange}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  placeholder="Example: Miami, FL"
                />
              </Autocomplete>
            </label>
          </div>

          <div className="form-row">
            <label>
              Start Date *
              <input
                type="date"
                name="startDate"
                value={tripDraft.startDate}
                onChange={handleChange}
              />
            </label>

            <label>
              End Date *
              <input
                type="date"
                name="endDate"
                value={tripDraft.endDate}
                onChange={handleChange}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="submit-button">
  {isEditing ? "Save Changes" : "Save Trip"}
</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TripForm;