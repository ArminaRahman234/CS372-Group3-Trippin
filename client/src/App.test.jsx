import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('Itinerary List', () => {
  it('renders the itinerary section', () => {
    render(<App />)

    expect(
      screen.getByText('My Itinerary')
    ).toBeInTheDocument()
  })

  it('renders itinerary items', () => {
    render(<App />)

    expect(screen.getByText('Drive to Chicago')).toBeInTheDocument()
    expect(screen.getByText('Hotel Check-In')).toBeInTheDocument()
    expect(screen.getByText('Navy Pier')).toBeInTheDocument()
    expect(screen.getByText('Millennium Park')).toBeInTheDocument()
  })

  it('renders itinerary item details', () => {
    render(<App />)

    expect(
      screen.getByText(/Estimated travel time: 3 hr 15 min/i)
    ).toBeInTheDocument()

    expect(
      screen.getByText(/Explore the pier and lakefront/i)
    ).toBeInTheDocument()
  })
})