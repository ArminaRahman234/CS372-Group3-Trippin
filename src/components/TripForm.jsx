import { useState } from "react";

function TripForm({ isOpen, onClose, onSaveTrip }) { // object fields to store input data
  const [formData, setFormData] = useState({
    title: "",
    startLocation: "",
    destination: "",
    startDate: "",
    endDate: "",
  });

  if (!isOpen) return null;

  function handleChange(event) { // temporary data safekeep
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  }

  function handleSubmit(event) { // save the trip data
    event.preventDefault();

    if ( // check for required input
      !formData.title ||
      !formData.startLocation ||
      !formData.destination ||
      !formData.startDate ||
      !formData.endDate
    ) {
      alert("Please fill out all required fields.");
      return;
    }

    onSaveTrip(formData);
    onClose();
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">NEW TRIP</p>
            <h2>Create Your Trip</h2>
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
              value={formData.title}
              onChange={handleChange}
              placeholder="Example: Miami Summer Getaway"
            />
          </label>

          <div className="form-row">
            <label>
              Starting Location *
              <input
                type="text"
                name="startLocation"
                value={formData.startLocation}
                onChange={handleChange}
                placeholder="Example: Fort Wayne, IN"
              />
            </label>

            <label>
              Destination *
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                placeholder="Example: Miami, FL"
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Start Date *
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
              />
            </label>

            <label>
              End Date *
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
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
              Save Trip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TripForm;