import { useState } from "react";
import "./App.css";
import TripForm from "./components/TripForm";

const startingItems = [ // temporary sample data for UI
  {
    id: 1,
    date: "Friday, October 16",
    icon: "🚗",
    type: "Transportation",
    title: "Drive to Chicago",
    time: "10:00 AM",
    location: "Fort Wayne, IN → Chicago, IL",
    notes: "Estimated travel time: 3 hr 15 min",
  },
  {
    id: 2,
    date: "Friday, October 16",
    icon: "🏨",
    type: "Hotel",
    title: "Hotel Check-In",
    time: "3:00 PM",
    location: "Hyatt Regency Chicago",
    notes: "151 E Wacker Dr, Chicago",
  },
  {
    id: 3,
    date: "Friday, October 16",
    icon: "🍽️",
    type: "Food",
    title: "Dinner",
    time: "7:00 PM",
    location: "Downtown Chicago",
    notes: "",
  },
  {
    id: 4,
    date: "Saturday, October 17",
    icon: "☕",
    type: "Food",
    title: "Breakfast",
    time: "9:00 AM",
    location: "Chicago, IL",
    notes: "",
  },
  {
    id: 5,
    date: "Saturday, October 17",
    icon: "🎡",
    type: "Activity",
    title: "Navy Pier",
    time: "11:00 AM",
    location: "600 E Grand Ave, Chicago",
    notes: "Explore the pier and lakefront",
  },
  {
    id: 6,
    date: "Saturday, October 17",
    icon: "🛍️",
    type: "Shopping",
    title: "Magnificent Mile",
    time: "3:00 PM",
    location: "Michigan Avenue, Chicago",
    notes: "Shopping and sightseeing",
  },
  {
    id: 7,
    date: "Sunday, October 18",
    icon: "🌳",
    type: "Saved Spot",
    title: "Millennium Park",
    time: "10:30 AM",
    location: "201 E Randolph St, Chicago",
    notes: "Visit Cloud Gate and explore the park",
  },
  {
    id: 8,
    date: "Sunday, October 18",
    icon: "🏙️",
    type: "Activity",
    title: "Willis Tower",
    time: "3:00 PM",
    location: "233 S Wacker Dr, Chicago",
    notes: "Visit Skydeck Chicago",
  },
  {
    id: 9,
    date: "Monday, October 19",
    icon: "🏨",
    type: "Hotel",
    title: "Hotel Check-Out",
    time: "10:00 AM",
    location: "Hyatt Regency Chicago",
    notes: "",
  },
  {
    id: 10,
    date: "Monday, October 19",
    icon: "🚗",
    type: "Transportation",
    title: "Return to Fort Wayne",
    time: "11:00 AM",
    location: "Chicago, IL → Fort Wayne, IN",
    notes: "",
  },
];

const typeIcons = {
  Flight: "✈️",
  Hotel: "🏨",
  Activity: "🎟️",
  Park: "🌳",
  Shopping: "🛍️",
  Food: "🍽️",
  Transportation: "🚗",
  "Saved Spot": "📍",
};

function App() {
  const [items, setItems] = useState(startingItems);
  const [showModal, setShowModal] = useState(false);
  const [trip, setTrip] = useState(null);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  
  const [tripDraft, setTripDraft] = useState({ // trip creation form
    title: "",
    startLocation: "",
    destination: "",
    startDate: "",
    endDate: "",
  });

  const [form, setForm] = useState({ // itenary item creation form
    title: "",
    type: "Activity",
    location: "",
    date: "",
    time: "",
    notes: "",
  });

  const groupedItems = items.reduce((groups, item) => { // group itenary items by date
    if (!groups[item.date]) {
      groups[item.date] = [];
    }

    groups[item.date].push(item);
    return groups;
  }, {});

  function handleChange(event) { // temporary data safekeep
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });
  }

  function handleSubmit(event) { // save the itenary data
    event.preventDefault();

    if (!form.title || !form.location || !form.date || !form.time) { // check for required input
      alert("Please complete the required fields.");
      return;
    }

    const selectedDate = new Date(`${form.date}T12:00:00`);

    const formattedDate = selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const [hours, minutes] = form.time.split(":");
    const timeDate = new Date();
    timeDate.setHours(hours, minutes);

    const formattedTime = timeDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    const newItem = {
      id: Date.now(),
      date: formattedDate,
      icon: typeIcons[form.type] || "📍",
      type: form.type,
      title: form.title,
      time: formattedTime,
      location: form.location,
      notes: form.notes,
    };

    setItems([...items, newItem]);

    setForm({
      title: "",
      type: "Activity",
      location: "",
      date: "",
      time: "",
      notes: "",
    });

    setShowModal(false);
  }

  function handleSaveTrip(newTripData) {
    setTrip(newTripData);
    setTripDraft({
      title: "",
      startLocation: "",
      destination: "",
      startDate: "",
      endDate: "",
    });
  }

  function handleOpenTripModal() {
    setShowModal(false);
    setIsTripModalOpen(true);  }

  function handleCloseTripModal() {
    setIsTripModalOpen(false);
  }

  return (
    <div className="app">
      <header className="navbar">
        <div className="logo">Trippin</div>

        <nav>
          <span className="active">My Trips</span>
          <span>Explore</span>
          <span>Budget</span>
        </nav>
      </header>

      <main className="container">
        <section className="trip-header">
          <div>
            <p className="eyebrow">MY TRIP</p>
            <h1>{trip ? trip.title : "Chicago Weekend"}</h1>
            <p className="route">
              {trip? `${trip.startLocation} → ${trip.destination}`: "Fort Wayne, IN → Chicago, IL"}
            </p>
            <p className="dates">
              {trip ? `${trip.startDate} – ${trip.endDate}`: "October 16 – October 19, 2026"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button className="add-button" onClick={handleOpenTripModal}>
              + Create Trip
            </button>

            <button className="save-button">♡ Save Trip</button>
          </div>
        </section>

        <section className="itinerary-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">TRIP SCHEDULE</p>
              <h2>My Itinerary</h2>
            </div>

            <button
              className="add-button"
              onClick={() => {
                setIsTripModalOpen(false);
                setShowModal(true);
              }}
            >
              + Add Item
            </button>
          </div>

          <div className="timeline">
            {Object.entries(groupedItems).map(([date, dayItems]) => (
              <div className="day" key={date}>
                <h3>{date}</h3>

                <div className="day-items">
                  {dayItems.map((item) => (
                    <article className="itinerary-card" key={item.id}>
                      <div className="item-icon">{item.icon}</div>

                      <div className="item-info">
                        <span className="item-type">{item.type}</span>
                        <h4>{item.title}</h4>

                        <div className="item-details">
                          <span>🕐 {item.time}</span>
                          <span>📍 {item.location}</span>
                        </div>

                        {item.notes && (
                          <p className="notes">{item.notes}</p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {showModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div className="modal"> {/*Style the form*/}
            <div className="modal-header">
              <div>
                <p className="eyebrow">TRIP PLANNER</p>
                <h2>Add Itinerary Item</h2>
              </div>

              <button
                className="close-button"
                onClick={() => setShowModal(false)}
              >
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
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                >
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
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Example: Chicago Riverwalk"
                />
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
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="submit-button">
                  Add to Itinerary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TripForm // add trip form
        isOpen={isTripModalOpen}
        onClose={handleCloseTripModal}
        onSaveTrip={handleSaveTrip}
        tripDraft={tripDraft}
        setTripDraft={setTripDraft}
      />
    </div>
  );
}

export default App;