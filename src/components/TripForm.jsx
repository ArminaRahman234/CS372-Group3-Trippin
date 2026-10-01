function TripForm({ isOpen, onClose, onSaveTrip, tripDraft, setTripDraft }) { // object fields to store input data

  if (!isOpen) return null;

  function handleChange(event) { // temporary data safekeep
    const { name, value } = event.target;
    setTripDraft({
      ...tripDraft,
      [name]: value,
    });
  }

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
              value={tripDraft.title}
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
                value={tripDraft.startLocation}
                onChange={handleChange}
                placeholder="Example: Fort Wayne, IN"
              />
            </label>

            <label>
              Destination *
              <input
                type="text"
                name="destination"
                value={tripDraft.destination}
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
              Save Trip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TripForm;