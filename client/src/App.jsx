import { useState, useEffect } from "react";
import "./App.css";
import TripForm from "./components/TripForm";
import { ItineraryItem, ItineraryForm } from "./components/ItineraryForm";

import {
  getTrips,
  addTrip,
  getItineraryItems,
  saveItineraryItem,
  deleteItineraryItem,
} from "./services/tripStorage";

const defaultTrip = { // temporary sample data for UI
  id: "default-chicago",
  title: "Chicago Weekend",
  startLocation: "Fort Wayne, IN",
  destination: "Chicago, IL",
  startDate: "2026-10-16",
  endDate: "2026-10-19",
};

const startingItems = [ // temporary sample data for UI
  {
    id: 1,
    tripId: "default-chicago",
    date: "Friday, October 16",
    rawDate: "2026-10-16",
    rawTime: "10:00",
    icon: "🚗",
    type: "Transportation",
    title: "Drive to Chicago",
    time: "10:00 AM",
    location: "Fort Wayne, IN → Chicago, IL",
    notes: "Estimated travel time: 3 hr 15 min",
  },

  {
    id: 2,
    tripId: "default-chicago",
    date: "Friday, October 16",
    rawDate: "2026-10-16",
    rawTime: "15:00",
    icon: "🏨",
    type: "Hotel",
    title: "Hotel Check-In",
    time: "3:00 PM",
    location: "Hyatt Regency Chicago",
    notes: "151 E Wacker Dr, Chicago",
  },
];

function App() {
  const [trips, setTrips] = useState(() => getTrips());
  const activeTrip = trips.length > 0 ? trips[trips.length - 1] : defaultTrip; // default to last trip

  const [items, setItems] = useState(() => {
    const storedItems = getItineraryItems(activeTrip.id);

    if (storedItems.length === 0 && activeTrip.id === "default-chicago") {
      return startingItems;
    }

    return storedItems;
  });

  useEffect(() => {
    const storedItems = getItineraryItems(activeTrip.id);

    if (storedItems.length === 0 && activeTrip.id === "default-chicago") {
      setItems(startingItems);
    } else {
      setItems(storedItems);
    }
  }, [activeTrip.id]);

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);

  const [tripDraft, setTripDraft] = useState({
    title: "",
    startLocation: "",
    destination: "",
    startDate: "",
    endDate: "",
  });

  const sortedItems = [...items].sort((a, b) => { // sort itenary items list
    const dateA = a.rawDate ? new Date(`${a.rawDate}T00:00:00`) : new Date(a.date);
    const dateB = b.rawDate ? new Date(`${b.rawDate}T00:00:00`) : new Date(b.date);

    return dateA - dateB;
  });

  const groupedItems = sortedItems.reduce((groups, item) => { // group itenary items by date
    if (!groups[item.date]) {
      groups[item.date] = [];
    }

    groups[item.date].push(item);
    return groups;
  }, {});

  function handleSaveItem(itemData) {
    const updated = saveItineraryItem(itemData, activeTrip?.id);
    setItems(updated);
    setEditingItem(null);
  }

  function handleDeleteItem(itemId) {
    if (window.confirm("Are you sure you want to delete this item?")) {
      const updated = deleteItineraryItem(itemId, activeTrip?.id);
      setItems(updated);
    }
  }

  function handleEditItem(item) {
    setEditingItem(item);
    setShowItemModal(true);
  }

  function handleSaveTrip(newTripData) {
    const updatedTrips = addTrip(newTripData);
    setTrips(updatedTrips);

    setTripDraft({
      title: "",
      startLocation: "",
      destination: "",
      startDate: "",
      endDate: "",
    });
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
            <h1>{activeTrip ? activeTrip.title : "Chicago Weekend"}</h1>

            <p className="route">
              {activeTrip
                ? `${activeTrip.startLocation} → ${activeTrip.destination}`
                : "Fort Wayne, IN → Chicago, IL"}
            </p>

            <p className="dates">
              {activeTrip
                ? `${activeTrip.startDate} – ${activeTrip.endDate}`
                : "October 16 – October 19, 2026"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="add-button"
              onClick={() => {
                setShowItemModal(false);
                setIsTripModalOpen(true);
              }}
            >
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
                setEditingItem(null);
                setIsTripModalOpen(false);
                setShowItemModal(true);
              }}
            >
              + Add Item
            </button>
          </div>

          <div className="timeline">
            {Object.keys(groupedItems).length === 0 ? (
              <p style={{ color: "#64748b" }}>No itinerary items added yet for this trip.</p>
            ) : (
              Object.entries(groupedItems).map(([date, dayItems]) => (
                <div className="day" key={date}>
                  <h3>{date}</h3>

                  <div className="day-items">
                    {dayItems.map((item) => (
                      <ItineraryItem
                        key={item.id}
                        item={item}
                        onEdit={handleEditItem}
                        onDelete={handleDeleteItem}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <ItineraryForm // add itinerary form
        isOpen={showItemModal}

        onClose={() => {
          setShowItemModal(false);
          setEditingItem(null);
        }}
        
        onSave={handleSaveItem}
        editingItem={editingItem}
        activeTrip={activeTrip}
      />

      <TripForm // add trip form
        isOpen={isTripModalOpen}
        onClose={() => setIsTripModalOpen(false)}
        onSaveTrip={handleSaveTrip}
        tripDraft={tripDraft}
        setTripDraft={setTripDraft}
      />
    </div>
  );
}

export default App;