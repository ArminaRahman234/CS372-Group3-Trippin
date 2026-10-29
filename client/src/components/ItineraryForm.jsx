import { useState, useEffect, useRef } from "react";
import { Autocomplete } from "@react-google-maps/api";

const typeIcons = { // types of activities
  Flight: "✈️",
  Hotel: "🏨",
  Activity: "🎟️",
  Park: "🌳",
  Shopping: "🛍️",
  Food: "🍽️",
  Transportation: "🚗",
  "Saved Spot": "📍",
};

export function ItineraryItem({ item, onEdit, onDelete }) { // display
  return (
    <article className="itinerary-card">
      <div className="item-icon">{item.icon}</div>

      <div className="item-info">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="item-type">{item.type}</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => onEdit(item)}
              style={{
                border: "none",
                background: "transparent",
                color: "#6366f1",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "12px",
              }}
            >
              Edit
            </button>

            <button
              onClick={() => onDelete(item.id)}
              style={{
                border: "none",
                background: "transparent",
                color: "#ef4444",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "12px",
              }}
            >
              Delete
            </button>
          </div>
        </div>

        <h4>{item.title}</h4>

        <div className="item-details">
          <span>🕐 {item.time}</span>
          <span>📍 {item.location}</span>
        </div>

        {item.notes && <p className="notes">{item.notes}</p>}
      </div>
    </article>
  );
}

export function ItineraryForm({ isOpen, onClose, onSave, editingItem, activeTrip }) {
  const [form, setForm] = useState({ // form fields
    title: "",
    type: "Activity",
    location: "",
    lat: null,
    lng: null,
    date: "",
    time: "",
    notes: "",
  });

  const autocompleteRef = useRef(null);

  useEffect(() => { // edit itenary items
    if (editingItem) {
      setForm({
        title: editingItem.title || "",
        type: editingItem.type || "Activity",
        location: editingItem.location || "",
        lat: editingItem.lat || null,
        lng: editingItem.lng || null,
        date: editingItem.rawDate || "",
        time: editingItem.rawTime || "",
        notes: editingItem.notes || "",
      });
    } else {
      setForm({
        title: "",
        type: "Activity",
        location: "",
        lat: null,
        lng: null,
        date: "",
        time: "",
        notes: "",
      });
    }
  }, [editingItem, isOpen]);

  const onLoad = (autoInstance) => {
    autocompleteRef.current = autoInstance;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        setForm((prev) => ({
          ...prev,
          location: place.formatted_address || place.name,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        }));
      }
    }
  };

  if (!isOpen) return null;

    function handleChange(event) { // temporary data safekeep
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "location" && { lat: null, lng: null }), // typed text = old coords no longer valid
    }));
  }

  function handleSubmit(event) { // save the data
    event.preventDefault();

    if (!form.title || !form.location || !form.date || !form.time) { // check for required input
      alert("Please complete the required fields.");
      return;
    }

    if (activeTrip && activeTrip.startDate && activeTrip.endDate) { // check for date is between trip dates
      const itemDate = new Date(`${form.date}T00:00:00`);
      const tripStart = new Date(`${activeTrip.startDate}T00:00:00`);
      const tripEnd = new Date(`${activeTrip.endDate}T00:00:00`);

      if (itemDate < tripStart || itemDate > tripEnd) {
        alert(
          `Date must be within trip dates (${activeTrip.startDate} to ${activeTrip.endDate}).`
        );

        return;
      }
    }

    const [year, month, day] = form.date.split("-"); // date format
    const selectedDate = new Date(year, month - 1, day);

    const formattedDate = selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const [hours, minutes] = form.time.split(":"); // time format
    const timeDate = new Date();

    timeDate.setHours(hours, minutes);

    const formattedTime = timeDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    const savedData = { // data storage
      id: editingItem?.id || Date.now(),
      date: formattedDate,
      rawDate: form.date,
      rawTime: form.time,
      icon: typeIcons[form.type] || "📍",
      type: form.type,
      title: form.title,
      time: formattedTime,
      location: form.location,
      lat: form.lat,
      lng: form.lng,
      notes: form.notes,
    };

    onSave(savedData);
    onClose();
  }

  return (
    <div
      className="modal-overlay"

      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal"> {/* style the form */}
        <div className="modal-header">
          <div>
            <p className="eyebrow">TRIP PLANNER</p>
            <h2>{editingItem?.id ? "Edit Itinerary Item" : "Add Itinerary Item"}</h2>
          </div>

          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Activity or Booking Name *
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Example: Architecture Boat Tour"
            />
          </label>

          <label>
            Type
            <select name="type" value={form.type} onChange={handleChange}>
              <option>Flight</option>
              <option>Hotel</option>
              <option>Activity</option>
              <option>Park</option>
              <option>Shopping</option>
              <option>Food</option>
              <option>Transportation</option>
              <option>Saved Spot</option>
            </select>
          </label>

          <label>
            Location *
            {/*auto-suggest locations*/}
            <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                placeholder="Example: Chicago Riverwalk"
              />
            </Autocomplete>
          </label>

          <div className="form-row">
            <label>
              Date *
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
              />
            </label>

            <label>
              Time *
              <input
                type="time"
                name="time"
                value={form.time}
                onChange={handleChange}
              />
            </label>
          </div>

          <label>
            Notes
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Add reservation details or other notes..."
              rows="3"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            
            <button type="submit" className="submit-button">
              {editingItem?.id ? "Update Item" : "Add to Itinerary"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}