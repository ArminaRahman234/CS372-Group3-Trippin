// talks to the express api (replaces the old localStorage tripStorage.js)
// every function returns a promise and throws an Error with a readable message if something fails
const API_URL = import.meta.env.VITE_API_URL || "/api";

export const typeIcons = { // types of activities
  Flight: "✈️",
  Hotel: "🏨",
  Activity: "🎟️",
  Park: "🌳",
  Shopping: "🛍️",
  Food: "🍽️",
  Transportation: "🚗",
  "Saved Spot": "📍",
};

export const expenseCategories = {
  LODGING: { label: "Lodging", icon: "🏨" },
  TRANSPORTATION: { label: "Transit", icon: "🚗" },
  MEALS: { label: "Meals", icon: "🍽️" },
  ACTIVITIES: { label: "Activities", icon: "🎟️" },
  SHOPPING: { label: "Shopping", icon: "🛍️" },
  OTHER: { label: "Other", icon: "🧾" },
};

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Is the API running?");
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

// --- ITEM SHAPE CONVERSION ---
// the database stores date "YYYY-MM-DD" and time "HH:MM"
// the UI also wants a pretty date label, a 12 hour time and an icon

function toUiItem(item) {
  const [year, month, day] = item.date.split("-");

  let formattedTime = "";
  if (item.time) {
    const [hours, minutes] = item.time.split(":");
    const timeDate = new Date();
    timeDate.setHours(hours, minutes);
    formattedTime = timeDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return {
    ...item,
    rawDate: item.date,
    rawTime: item.time || "",
    date: new Date(year, month - 1, day).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    time: formattedTime,
    icon: typeIcons[item.type] || "📍",
  };
}

function toApiItem(item) {
  return {
    title: item.title,
    type: item.type,
    location: item.location,
    lat: item.lat ?? null,
    lng: item.lng ?? null,
    date: item.rawDate,
    time: item.rawTime,
    notes: item.notes || null,
  };
}

function toUiExpense(expense) {
  const [year, month, day] = expense.date.split("-");
  const meta = expenseCategories[expense.category] || expenseCategories.OTHER;

  return {
    ...expense,
    rawDate: expense.date,
    date: new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    categoryLabel: meta.label,
    icon: meta.icon,
  };
}

function toApiExpense(expense) {
  return {
    description: expense.description,
    amount: Number(expense.amount),
    category: expense.category,
    date: expense.rawDate || expense.date,
    receiptUrl: expense.receiptUrl || null,
  };
}

// --- TRIP FUNCTIONS ---
export function getTrips() {
  return request("/trips");
}

export function addTrip(tripData) {
  return request("/trips", { method: "POST", body: tripData });
}

export function updateTrip(tripId, updatedData) {
  return request(`/trips/${tripId}`, { method: "PUT", body: updatedData });
}

// the server also deletes the trip's itinerary items
export function deleteTrip(tripId) {
  return request(`/trips/${tripId}`, { method: "DELETE" });
}

export function shareTrip(tripId) {
  return request(`/trips/${tripId}/share`, { method: "POST" });
}

export async function getSharedTrip(token) {
  const data = await request(`/trips/shared/${token}`);
  return {
    trip: data.trip,
    items: (data.items || []).map(toUiItem),
  };
}

// --- ITINERARY FUNCTIONS ---
export async function getItineraryItems(tripId) {
  const items = await request(`/trips/${tripId}/items`);
  return items.map(toUiItem);
}

export async function createItineraryItem(tripId, itemData) {
  return toUiItem(await request(`/trips/${tripId}/items`, { method: "POST", body: toApiItem(itemData) }));
}

export async function updateItineraryItem(tripId, itemId, itemData) {
  return toUiItem(
    await request(`/trips/${tripId}/items/${itemId}`, { method: "PUT", body: toApiItem(itemData) })
  );
}

export function deleteItineraryItem(tripId, itemId) {
  return request(`/trips/${tripId}/items/${itemId}`, { method: "DELETE" });
}

// --- EXPENSE FUNCTIONS ---
export async function getExpenses(tripId) {
  const expenses = await request(`/trips/${tripId}/expenses`);
  return expenses.map(toUiExpense);
}

export async function createExpense(tripId, expenseData) {
  return toUiExpense(
    await request(`/trips/${tripId}/expenses`, { method: "POST", body: toApiExpense(expenseData) })
  );
}

export async function updateExpense(tripId, expenseId, expenseData) {
  return toUiExpense(
    await request(`/trips/${tripId}/expenses/${expenseId}`, {
      method: "PUT",
      body: toApiExpense(expenseData),
    })
  );
}

export function deleteExpense(tripId, expenseId) {
  return request(`/trips/${tripId}/expenses/${expenseId}`, { method: "DELETE" });
}