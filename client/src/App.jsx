import { useState, useEffect, useMemo } from "react";
import "./App.css";
import TripForm from "./components/TripForm";
import { ItineraryItem, ItineraryForm } from "./components/ItineraryForm";
import MapContainer from "./components/MapContainer";
import { useTravelTimes } from "./hooks/useTravelTimes";
import ExpenseTracker from "./components/ExpenseTracker";

import {
  getTrips,
  addTrip,
  updateTrip,
  deleteTrip,
  getItineraryItems,
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "./services/api";

// shown only while there are no saved trips
const placeholderTrip = {
  id: null,
  title: "No trip yet",
  startLocation: "Start",
  destination: "Destination",
  startDate: "",
  endDate: "",
  budget: null
};

const emptyTrip = {
  title: "",
  startLocation: "",
  destination: "",
  startDate: "",
  endDate: "",
  budget: ""
};

function App() {
  const [trips, setTrips] = useState([]);
  const [activeTripId, setActiveTripId] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const hasSavedTrip = trips.length > 0;
  // default to the last trip when nothing is selected (or the selected one was deleted)
  const activeTrip =
    trips.find((trip) => trip.id === activeTripId) || trips[trips.length - 1] || placeholderTrip;

  // load every saved trip from the API once on startup
  useEffect(() => {
    let cancelled = false;

    getTrips()
      .then((loaded) => {
        if (!cancelled) setTrips(loaded);
      })
      .catch((err) => {
        if (!cancelled) setErrorMessage(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // load the itinerary whenever the selected trip changes
  useEffect(() => {
    if (!activeTrip.id) {
      setItems([]);
      setExpenses([]);
      return;
    }

    let cancelled = false;

    Promise.all([
      getItineraryItems(activeTrip.id),
      getExpenses(activeTrip.id),
    ])
      .then(([loadedItems, loadedExpenses]) => {
        if (!cancelled) {
          setItems(loadedItems);
          setExpenses(loadedExpenses);
        }
      })
      .catch((err) => {
        if (!cancelled) setErrorMessage(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTrip.id]);

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [tripDraft, setTripDraft] = useState({...emptyTrip});

  const [expenses, setExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState("trips"); // "trips" | "budget"
  const [prefilledExpense, setPrefilledExpense] = useState(null);

  const itemTypeToCategory = {
    Hotel: "LODGING",
    Flight: "TRANSPORTATION",
    Transportation: "TRANSPORTATION",
    Food: "MEALS",
    Activity: "ACTIVITIES",
    Park: "ACTIVITIES",
    Shopping: "SHOPPING",
    "Saved Spot": "OTHER",
  };

  const expenseCategoryToItemType = {
    LODGING: "Hotel",
    TRANSPORTATION: "Transportation",
    MEALS: "Food",
    ACTIVITIES: "Activity",
    SHOPPING: "Shopping",
    OTHER: "Saved Spot",
  };

  function findItemExpense(item) {
    return (
      expenses.find(
        (exp) =>
          exp.description.trim().toLowerCase() === item.title.trim().toLowerCase() &&
          exp.rawDate === item.rawDate
      ) || null
    );
  }

  function handleLogItemExpense(item, existingExpense = null) {
    const matched = existingExpense || findItemExpense(item);
    if (matched) {
      setPrefilledExpense({ existingExpense: matched });
    } else {
      setPrefilledExpense({
        itemId: item.id,
        description: item.title,
        category: itemTypeToCategory[item.type] || "OTHER",
        rawDate: item.rawDate || activeTrip.startDate || "",
      });
    }
    setActiveTab("budget");
  }

  const sortedItems = useMemo(() => [...items].sort((a, b) => { // sort itenary items list by date, then time
    const dateA = a.rawDate ? new Date(`${a.rawDate}T${a.rawTime || "00:00"}`) : new Date(a.date);
    const dateB = b.rawDate ? new Date(`${b.rawDate}T${b.rawTime || "00:00"}`) : new Date(b.date);

    return dateA - dateB;
  }), [items]);

  const travelTimes = useTravelTimes(sortedItems);

  const groupedItems = sortedItems.reduce((groups, item) => { // group itenary items by date
    if (!groups[item.date]) {
      groups[item.date] = [];
    }

    groups[item.date].push(item);
    return groups;
  }, {});


  async function handleSaveItem(itemData) {
    if (!activeTrip.id) {
      alert("Please create a trip first.");
      return;
    }

    try {
      if (editingItem?.id) {
        const saved = await updateItineraryItem(activeTrip.id, editingItem.id, itemData);
        setItems((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      } else {
        const saved = await createItineraryItem(activeTrip.id, itemData);
        setItems((prev) => [...prev, saved]);
      }
      setErrorMessage("");
    } catch (err) {
      alert(`Unable to save this item: ${err.message}`);
    }

    setEditingItem(null);
  }

  async function handleDeleteItem(itemId) {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      await deleteItineraryItem(activeTrip.id, itemId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      alert(`Unable to delete this item: ${err.message}`);
    }
  }

  async function handleSaveExpense(expenseData, expenseId = null) {
    if (!activeTrip.id) {
      alert("Please create a trip first.");
      return;
    }

    try {
      if (expenseId) {
        const saved = await updateExpense(activeTrip.id, expenseId, expenseData);
        setExpenses((prev) => prev.map((exp) => (exp.id === saved.id ? saved : exp)));
      } else {
        const saved = await createExpense(activeTrip.id, expenseData);
        setExpenses((prev) => [saved, ...prev]);

        // Also create a matching itinerary item if one doesn't already exist
        const alreadyInItinerary = items.some(
          (item) =>
            item.title.trim().toLowerCase() === expenseData.description.trim().toLowerCase() &&
            item.rawDate === expenseData.rawDate
        );

        if (!alreadyInItinerary) {
          const itemType = expenseCategoryToItemType[expenseData.category] || "Activity";
          const newItem = await createItineraryItem(activeTrip.id, {
            title: expenseData.description,
            type: itemType,
            location: "",
            lat: null,
            lng: null,
            rawDate: expenseData.rawDate,
            rawTime: "",
            notes: "",
          });
          setItems((prev) => [...prev, newItem]);
        }
      }
      setErrorMessage("");
    } catch (err) {
      alert(`Unable to save this expense: ${err.message}`);
    }
  }

  async function handleDeleteExpense(expenseId) {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;

    try {
      await deleteExpense(activeTrip.id, expenseId);
      setExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));
    } catch (err) {
      alert(`Unable to delete this expense: ${err.message}`);
    }
  }

  function handleEditItem(item) {
    setEditingItem(item);
    setShowItemModal(true);
  }

  // Save a newly created trip or update an existing trip.
  async function handleSaveTrip(newTripData) {
    try {
      if (isEditingTrip && hasSavedTrip) {
        const saved = await updateTrip(activeTrip.id, newTripData);
        setTrips((prev) => prev.map((trip) => (trip.id === saved.id ? saved : trip)));
      } else {
        const saved = await addTrip(newTripData);
        setTrips((prev) => [...prev, saved]);
        setActiveTripId(saved.id); // jump to the trip that was just created
      }
    } catch (err) {
      alert(`Unable to save this trip: ${err.message}`);
      return;
    }

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
      startLat: activeTrip.startLat ?? null,
      startLng: activeTrip.startLng ?? null,
      destLat: activeTrip.destLat ?? null,
      destLng: activeTrip.destLng ?? null,
      budget: activeTrip.budget ?? "",
    });
    setIsTripModalOpen(true);
  }

  // Delete the current trip after confirmation.
  async function handleDeleteTrip() {
    if (!hasSavedTrip) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this trip?"
    );

    if (!confirmed) return;

    try {
      await deleteTrip(activeTrip.id);
    } catch (err) {
      alert(`Unable to delete the trip: ${err.message}`);
      return;
    }

    setTrips((prev) => prev.filter((trip) => trip.id !== activeTrip.id));
    setActiveTripId(null);
    setTripDraft({ ...emptyTrip });
    setIsEditingTrip(false);
    setIsTripModalOpen(false);
  }

  // Bookmark (or un-bookmark) the current trip in the database.
  async function handleToggleSaveTrip() {
    if (!hasSavedTrip) {
      alert("Please create a trip first.");
      return;
    }

    try {
      const saved = await updateTrip(activeTrip.id, { isBookmarked: !activeTrip.isBookmarked });
      setTrips((prev) => prev.map((trip) => (trip.id === saved.id ? saved : trip)));
    } catch (err) {
      alert(`Unable to save the trip: ${err.message}`);
    }
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
          <span
            className={activeTab === "trips" ? "active" : ""}
            onClick={() => setActiveTab("trips")}
          >
            My Trips
          </span>
          <span
            className={activeTab === "budget" ? "active" : ""}
            onClick={() => setActiveTab("budget")}
          >
            Budget
          </span>
        </nav>
      </header>

      <main className="container">
        {isLoading && <p style={{ color: "#64748b" }}>Loading your trips...</p>}
        {errorMessage && <p style={{ color: "#ef4444" }}>{errorMessage}</p>}

        <section className="trip-header">
          <div>
            <p className="eyebrow">MY TRIP</p>
            {trips.length > 1 && (
              <select
                value={activeTrip.id}
                onChange={(event) => setActiveTripId(event.target.value)}
                aria-label="Choose a trip"
              >
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.title}
                  </option>
                ))}
              </select>
            )}
            <h1>{activeTrip.title}</h1>

            <p className="route">
              {`${activeTrip.startLocation} → ${activeTrip.destination}`}
            </p>

            <p className="dates">
              {activeTrip.startDate ? `${activeTrip.startDate} – ${activeTrip.endDate}` : ""}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "12px",
            }}
          >
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
                onClick={handleToggleSaveTrip}
              >
                {activeTrip.isBookmarked ? "♥ Saved" : "♡ Save Trip"}
              </button>
            </div>

            {hasSavedTrip && (
              <div
                onClick={() => setActiveTab("budget")}
                title="View Budget & Expenses"
                style={{
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "600",
                  background: "rgba(255, 255, 255, 0.16)",
                  padding: "6px 14px",
                  borderRadius: "10px",
                }}
              >
                💰 Spent:{" "}
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(
                  expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
                )}
                {activeTrip.budget !== null && activeTrip.budget !== undefined
                  ? ` / ${new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(Number(activeTrip.budget))}`
                  : ""}
              </div>
            )}
          </div>
        </section>

        {activeTab === "trips" ? (
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

            {/*render map, spot search and bookmark, spot pins, route lines*/}
            <MapContainer
              onAddBookmark={handleAddBookmark}
              activeTrip={activeTrip}
              itineraryItems={sortedItems}
            />

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
                          travel={travelTimes[item.id]}
                          itemExpense={findItemExpense(item)}
                          onEdit={handleEditItem}
                          onDelete={handleDeleteItem}
                          onLogExpense={handleLogItemExpense}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : (
          <ExpenseTracker
            activeTrip={activeTrip}
            expenses={expenses}
            itineraryItems={sortedItems}
            prefilledExpense={prefilledExpense}
            onClearPrefilledExpense={() => setPrefilledExpense(null)}
            onSaveExpense={handleSaveExpense}
            onDeleteExpense={handleDeleteExpense}
            onEditTripBudget={handleEditTrip}
          />
        )}
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
