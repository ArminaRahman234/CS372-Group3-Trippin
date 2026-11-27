// shared Google Maps loader settings
// every useJsApiLoader call must use this exact object, or the loader throws
// "Loader must not be called again with different options"
const LIBRARIES = ["places"]; // spots api library

export const MAPS_LOADER_OPTIONS = {
  id: "google-map-script",
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  libraries: LIBRARIES,
};