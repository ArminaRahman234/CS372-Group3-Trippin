// small browser-only preferences kept in localStorage (#11)
// trips themselves live in PostgreSQL; this only remembers which trip was open
// and which Saved Trips filter was picked, so a reload lands where the user left off

const KEYS = {
  activeTripId: "trippin.activeTripId",
  savedTripsFilter: "trippin.savedTripsFilter",
};

// localStorage can throw (private mode, storage disabled), so never let it break the app
function read(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore: the app still works, it just won't remember the choice
  }
}

export function getStoredActiveTripId() {
  return read(KEYS.activeTripId);
}

export function storeActiveTripId(tripId) {
  write(KEYS.activeTripId, tripId);
}

export function getStoredSavedTripsFilter() {
  return read(KEYS.savedTripsFilter) === "bookmarked" ? "bookmarked" : "all";
}

export function storeSavedTripsFilter(filter) {
  write(KEYS.savedTripsFilter, filter);
}