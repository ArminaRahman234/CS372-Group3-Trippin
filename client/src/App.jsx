import { useState, useEffect } from "react";
import "./App.css";
import TripForm from "./components/TripForm";
import { ItineraryItem, ItineraryForm } from "./components/ItineraryForm";
import MapContainer from "./components/MapContainer";

import {
  getTrips,
  addTrip,
  updateTrip,
  deleteTrip,
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

const startingItems = [
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

const emptyTrip = {
  title: "",
  startLocation: "",
  destination: "",
  startDate: "",
  endDate: "",
};

function App() {
  const [trips, setTrips] = useState(() => getTrips());
  const hasSavedTrip = trips.length > 0;
  const activeTrip = hasSavedTrip ? trips[trips.length - 1] : defaultTrip; // default to last trip

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
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [tripDraft, setTripDraft] = useState({...emptyTrip});

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

  // Save a newly created trip or update an existing trip.
  function handleSaveTrip(newTripData) {
  let updatedTrips;

  try {
    updatedTrips =
      isEditingTrip && hasSavedTrip
        ? updateTrip(activeTrip.id, newTripData)
        : addTrip(newTripData);
  } catch {
    alert("Unable to save this trip to local storage.");
    return;
  }

  setTrips(updatedTrips);
  setTripDraft({ ...emptyTrip });
  setIsEditingTrip(false);
  setIsTripModalOpen(false);
  }

  // Open a blank form to create a new trip.
  function handleOpenTripModal() {
    setShowItemModal(false);
    setIsEditingTrip(false);
    setTripDraft({ ...emptyTrip });
    setIsTripModalOpen(true);
  }

  function handleCloseTripModal() {
    setIsTripModalOpen(false);
    setIsEditingTrip(false);
    setTripDraft({ ...emptyTrip });
  }

  // Open the form with the current trip's details.
  function handleEditTrip() {
    if (!hasSavedTrip) return;

    setShowItemModal(false);
    setIsEditingTrip(true);
    setTripDraft({
      title: activeTrip.title || "",
      startLocation: activeTrip.startLocation || "",
      destination: activeTrip.destination || "",
      startDate: activeTrip.startDate || "",
      endDate: activeTrip.endDate || "",
    });
    setIsTripModalOpen(true);
  }

  // Delete the current trip after confirmation.
  function handleDeleteTrip() {
    if (!hasSavedTrip) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this trip?"
    );

    if (!confirmed) return;

    let updatedTrips;

    try {
      updatedTrips = deleteTrip(activeTrip.id);
    } catch {
      alert("Unable to delete the trip from local storage.");
      return;
    }

    setTrips(updatedTrips);
    setTripDraft({ ...emptyTrip });
    setIsEditingTrip(false);
    setIsTripModalOpen(false);
  }

  function handleAddBookmark(bookmarkData) { // open form with bookmarked spot pre-filled
    setEditingItem({
      id: null,
      title: bookmarkData.title || "",
      type: "Saved Spot",
      location: bookmarkData.location || "",
      lat: bookmarkData.lat || null,
      lng: bookmarkData.lng || null,
      rawDate: "",
      rawTime: "",
      notes: "",
    });

    setIsTripModalOpen(false);
    setShowItemModal(true);
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
            <h1>{activeTrip.title}</h1>

            <p className="route">
              {`${activeTrip.startLocation} → ${activeTrip.destination}`}
            </p>

            <p className="dates">
              {`${activeTrip.startDate} – ${activeTrip.endDate}`}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="add-button"
              onClick={handleOpenTripModal}
            >
              + Create Trip
            </button>

            {hasSavedTrip && (
              <>
                <button
                  className="save-button"
                  onClick={handleEditTrip}
                >
                  ✏️ Edit Trip
                </button>

                <button
                  className="save-button"
                  onClick={handleDeleteTrip}
                >
                  🗑️ Delete Trip
                </button>
              </>
            )}

            <button
              className="save-button"
              onClick={() => {
                if (!hasSavedTrip) {
                  alert("Please create a trip first.");
                  return;
                }

                try {
                  localStorage.setItem(
                    "trippin.currentTrip",
                    JSON.stringify(activeTrip)
                  );

                  alert("Trip saved successfully!");
                } catch {
                  alert("Unable to save the trip.");
                }
              }}
            >
              ♡ Save Trip
            </button>
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

          <MapContainer onAddBookmark={handleAddBookmark} /> {/*render map and spot search and bookmark*/}

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

      <TripForm
        isOpen={isTripModalOpen}
        onClose={handleCloseTripModal}
        onSaveTrip={handleSaveTrip}
        tripDraft={tripDraft}
        setTripDraft={setTripDraft}
        isEditing={isEditingTrip}
      />
    </div>
  );
}

export default App;
