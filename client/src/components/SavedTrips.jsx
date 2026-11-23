// Saved Trips tab (US-08 / #11)
// lists every trip as a card, filters to bookmarked trips, and lets the user
// bookmark, open, or create a trip without going through the My Trips dropdown

const FILTERS = [
  { id: "all", label: "All Trips" },
  { id: "bookmarked", label: "Bookmarked" },
];

// "YYYY-MM-DD" -> local Date (new Date("YYYY-MM-DD") would be UTC and can shift a day)
function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start) return "No dates set";

  const options = { month: "short", day: "numeric", year: "numeric" };
  if (!end || startDate === endDate) return start.toLocaleDateString("en-US", options);

  return `${start.toLocaleDateString("en-US", options)} – ${end.toLocaleDateString("en-US", options)}`;
}

function tripLength(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return "";

  const days = Math.round((end - start) / 86400000) + 1; // inclusive of both days
  return days === 1 ? "1 day" : `${days} days`;
}

function formatBudget(budget) {
  if (budget === null || budget === undefined || budget === "") return "No budget set";
  return Number(budget).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// bookmarked trips first, then by start date (soonest first)
function sortTrips(trips) {
  return [...trips].sort((a, b) => {
    if (a.isBookmarked !== b.isBookmarked) return a.isBookmarked ? -1 : 1;
    return (a.startDate || "").localeCompare(b.startDate || "");
  });
}

function TripCard({ trip, isActive, onOpen, onToggleBookmark }) {
  const length = tripLength(trip.startDate, trip.endDate);

  return (
    <article className={`trip-card${isActive ? " trip-card--active" : ""}`}>
      <div className="trip-card__top">
        <div>
          {isActive && <span className="trip-card__badge">Current trip</span>}
          <h3>{trip.title}</h3>
        </div>

        <button
          type="button"
          className={`bookmark-toggle${trip.isBookmarked ? " bookmark-toggle--on" : ""}`}
          onClick={() => onToggleBookmark(trip)}
          aria-pressed={Boolean(trip.isBookmarked)}
          aria-label={trip.isBookmarked ? `Remove ${trip.title} from bookmarks` : `Bookmark ${trip.title}`}
          title={trip.isBookmarked ? "Remove bookmark" : "Bookmark this trip"}
        >
          {trip.isBookmarked ? "♥" : "♡"}
        </button>
      </div>

      <p className="trip-card__route">
        {trip.startLocation} → {trip.destination}
      </p>

      <dl className="trip-card__details">
        <div>
          <dt>Dates</dt>
          <dd>
            {formatDateRange(trip.startDate, trip.endDate)}
            {length && <span className="trip-card__length"> · {length}</span>}
          </dd>
        </div>
        <div>
          <dt>Budget</dt>
          <dd>{formatBudget(trip.budget)}</dd>
        </div>
      </dl>

      <button type="button" className="add-button trip-card__open" onClick={() => onOpen(trip.id)}>
        Open Trip
      </button>
    </article>
  );
}

function SavedTrips({
  trips,
  activeTripId,
  filter,
  onFilterChange,
  onOpenTrip,
  onToggleBookmark,
  onCreateTrip,
  isLoading,
}) {
  const bookmarkedCount = trips.filter((trip) => trip.isBookmarked).length;
  const counts = { all: trips.length, bookmarked: bookmarkedCount };

  const visibleTrips = sortTrips(
    filter === "bookmarked" ? trips.filter((trip) => trip.isBookmarked) : trips
  );

  let emptyMessage = "";
  if (!isLoading && trips.length === 0) {
    emptyMessage = "You haven't planned any trips yet. Create one to get started.";
  } else if (!isLoading && visibleTrips.length === 0) {
    emptyMessage = "No bookmarked trips yet. Tap ♡ on a trip to bookmark it for quick access.";
  }

  return (
    <section className="saved-trips">
      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR TRIPS</p>
          <h2>Saved Trips</h2>
        </div>

        <button type="button" className="add-button" onClick={onCreateTrip}>
          + Create Trip
        </button>
      </div>

      <div className="filter-pills" role="group" aria-label="Filter trips">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`filter-pill${filter === id ? " filter-pill--active" : ""}`}
            onClick={() => onFilterChange(id)}
            aria-pressed={filter === id}
          >
            {label}
            <span className="filter-pill__count">{counts[id]}</span>
          </button>
        ))}
      </div>

      {emptyMessage ? (
        <div className="saved-trips__empty">
          <p>{emptyMessage}</p>
          {trips.length === 0 ? (
            <button type="button" className="add-button" onClick={onCreateTrip}>
              + Create your first trip
            </button>
          ) : (
            <button type="button" className="cancel-button" onClick={() => onFilterChange("all")}>
              Show all trips
            </button>
          )}
        </div>
      ) : (
        <div className="trip-grid">
          {visibleTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              isActive={trip.id === activeTripId}
              onOpen={onOpenTrip}
              onToggleBookmark={onToggleBookmark}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default SavedTrips;