import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// the real Google Maps components need a script from Google, which tests don't load
// Autocomplete just renders its input, and the map stays in its "loading" state
vi.mock('@react-google-maps/api', () => ({
  Autocomplete: ({ children }) => children,
  GoogleMap: () => null,
  Marker: () => null,
  Polyline: () => null,
  useJsApiLoader: () => ({ isLoaded: false, loadError: undefined }),
}))
