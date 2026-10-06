//subject to change when api is implemented
//export is used so other files can import the functions

const STORAGE_KEY = "trippin.trips";

// returns all trips or and empty array if there are none
export function getTrips(){
    try {
        const raw = localStorage.getItem(STORAGE_KEY); //get what string is stored in STORAGE_KEY
        const parsed = raw ? JSON.parse(raw) : []; //parse raw or returna an empty array so it doesnt crash
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // in case of error rather than crash it returns empty
        return [];
    }
}


//adds a new trip with a random id to the list and returns that list
export function addTrip(tripData){
    const newTrip = {
        ...tripData, //spread operator, just copies all fields from the form data
        id: crypto.randomUUID(), //id 
        createdAt: new Date().toISOString(), //timestamp it was made
    };

    const trips = [...getTrips(), newTrip]; //creates a new array, fills it with the old list, then adds new trip
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips)); //turns the array into strings
    return trips;
}