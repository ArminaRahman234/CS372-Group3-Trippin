import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [react()],
  server: {
    // forwards /api calls to the express server so we don't need CORS or hardcoded urls
    proxy: {
      '/api': env.VITE_API_PROXY || 'http://localhost:5000',
    },
  },
  }
})
