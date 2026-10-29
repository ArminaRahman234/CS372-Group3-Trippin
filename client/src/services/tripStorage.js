// subject to change when api is implemented
const STORAGE_KEY = "trippin.trips";
const ITINERARY_KEY = "trippin.itinerary";

// --- TRIP FUNCTIONS ---
export function getTrips() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addTrip(tripData) {
  const newTrip = {
    ...tripData,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  const trips = [...getTrips(), newTrip];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  return trips;
}

export function updateTrip(tripId, updatedData) {
  const trips = getTrips();
  const updatedTrips = trips.map((trip) =>
    trip.id === tripId ? { ...trip, ...updatedData } : trip
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTrips));
  return updatedTrips;
}

export function deleteTrip(tripId) {
  const trips = getTrips();
  const updatedTrips = trips.filter((trip) => trip.id !== tripId);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTrips));

  //added to remove a trips itenerary items when we delete the trip so they arent in local storage
  const remainingItems = getItineraryItems().filter((item) => item.tripId !== tripId);
  localStorage.setItem(ITINERARY_KEY, JSON.stringify(remainingItems));

  return updatedTrips;
}

export function getItineraryItems(tripId) { // access itinerary items
  try {
    const raw = localStorage.getItem(ITINERARY_KEY);
    const allItems = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(allItems)) return [];

    return tripId ? allItems.filter((item) => item.tripId === tripId) : allItems;
  } catch {
    return [];
  }
}

export function saveItineraryItem(itemData, tripId) { // itinerary data storage
  try {
    const raw = localStorage.getItem(ITINERARY_KEY);
    const allItems = raw ? JSON.parse(raw) : [];

    let updatedItems;

    const existingIndex = allItems.findIndex((item) => item.id === itemData.id);

    if (existingIndex >= 0) { // edit itinerary items
      updatedItems = [...allItems];
      updatedItems[existingIndex] = { ...updatedItems[existingIndex], ...itemData };
    } else {
      const newItem = {
        ...itemData,
        id: itemData.id || Date.now(),
        tripId: tripId || "default",
      };

      updatedItems = [...allItems, newItem];
    }

    localStorage.setItem(ITINERARY_KEY, JSON.stringify(updatedItems));
   
    return tripId
      ? updatedItems.filter((item) => item.tripId === tripId)
      : updatedItems;
  } catch {
    return [];
  }
}

export function deleteItineraryItem(itemId, tripId) { // delete itinerary items
  try {
    const raw = localStorage.getItem(ITINERARY_KEY);
    const allItems = raw ? JSON.parse(raw) : [];
    const updatedItems = allItems.filter((item) => item.id !== itemId);

    localStorage.setItem(ITINERARY_KEY, JSON.stringify(updatedItems));

    return tripId
      ? updatedItems.filter((item) => item.tripId === tripId)
      : updatedItems;
  } catch {
    return [];
  }
}