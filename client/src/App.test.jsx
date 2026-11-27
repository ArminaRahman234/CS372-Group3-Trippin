import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import App from './App'
import { fakeApi } from './test/fakeApi'
import { chicagoTrip, apiItem } from './test/fixtures'

const itinerary = {
  'trip-1': [
    apiItem({ id: 'c', title: 'Brunch', date: '2026-11-15', time: '11:00' }),
    apiItem({ id: 'b', title: 'Navy Pier', date: '2026-11-14', time: '13:00' }),
    apiItem({ id: 'a', title: 'Millennium Park', date: '2026-11-14', time: '09:00', notes: 'See the Bean' }),
  ],
}

let alertMock
let confirmMock

beforeEach(() => {
  alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
  confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function renderApp(data = { trips: [chicagoTrip], items: itinerary }) {
  const fetchMock = fakeApi(data)
  render(<App />)
  if (data.trips.length) {
    await screen.findByRole('heading', { level: 1, name: data.trips.at(-1).title })
  } else {
    await screen.findByText('No itinerary items added yet for this trip.')
  }
  return { fetchMock, user: userEvent.setup() }
}

const itemTitles = () => screen.queryAllByRole('heading', { level: 4 }).map((h) => h.textContent)
const cardFor = (title) => screen.getByRole('heading', { name: title }).closest('article')

describe('itinerary list', () => {
  it('groups items by day and sorts them by date and time', async () => {
    await renderApp()
    await screen.findByRole('heading', { name: 'Brunch' })

    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Saturday, November 14',
      'Sunday, November 15',
    ])
    expect(itemTitles()).toEqual(['Millennium Park', 'Navy Pier', 'Brunch'])
    expect(within(cardFor('Millennium Park')).getByText('See the Bean')).toBeInTheDocument()
  })

  it('shows an empty message when the trip has no items', async () => {
    await renderApp({ trips: [chicagoTrip] })

    expect(await screen.findByText('No itinerary items added yet for this trip.')).toBeInTheDocument()
  })

  it('shows the items of whichever trip is chosen', async () => {
    const second = { ...chicagoTrip, id: 'trip-2', title: 'Miami Break' }
    const { user } = await renderApp({
      trips: [chicagoTrip, second],
      items: { ...itinerary, 'trip-2': [apiItem({ id: 'm', tripId: 'trip-2', title: 'South Beach' })] },
    })
    await screen.findByRole('heading', { name: 'South Beach' })

    await user.selectOptions(screen.getByRole('combobox', { name: 'Choose a trip' }), 'trip-1')

    await screen.findByRole('heading', { name: 'Brunch' })
    expect(itemTitles()).not.toContain('South Beach')
  })

  it('shows an error when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')))

    render(<App />)

    expect(await screen.findByText('Cannot reach the server. Is the API running?')).toBeInTheDocument()
  })
})

describe('trip modal', () => {
  it('opens a blank form from Create Trip and closes it on Cancel', async () => {
    const { user } = await renderApp()
    expect(screen.queryByRole('heading', { name: 'Create Your Trip' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Create Trip' }))
    expect(screen.getByRole('heading', { name: 'Create Your Trip' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Trip Title/)).toHaveValue('')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('heading', { name: 'Create Your Trip' })).not.toBeInTheDocument()
  })

  it('saves changes made through Edit Trip', async () => {
    const { user } = await renderApp()

    await user.click(screen.getByRole('button', { name: /Edit Trip/ }))
    const title = screen.getByLabelText(/Trip Title/)
    expect(title).toHaveValue('Chicago Weekend')
    await user.clear(title)
    await user.type(title, 'Windy City')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Windy City' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Edit Your Trip' })).not.toBeInTheDocument()
  })

  it.each([
    [true, 'No trip yet'],
    [false, 'Chicago Weekend'],
  ])('deletes the trip only after confirming (confirmed: %s)', async (answer, heading) => {
    confirmMock.mockReturnValue(answer)
    const { user } = await renderApp()

    await user.click(screen.getByRole('button', { name: /Delete Trip/ }))

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })
})

describe('itinerary modal', () => {
  const addBoatTour = async (user) => {
    await user.click(screen.getByRole('button', { name: '+ Add Item' }))
    await user.type(screen.getByLabelText(/Activity or Booking Name/), 'Boat Tour')
    await user.type(screen.getByLabelText(/Location/), 'Chicago Riverwalk')
    await user.type(screen.getByLabelText(/Date/), '2026-11-14')
    await user.type(screen.getByLabelText(/Time/), '10:30')
    await user.click(screen.getByRole('button', { name: 'Add to Itinerary' }))
  }

  it('adds an item to the list in time order and closes', async () => {
    const { fetchMock, user } = await renderApp()
    await screen.findByRole('heading', { name: 'Brunch' })

    await addBoatTour(user)

    await screen.findByRole('heading', { name: 'Boat Tour' })
    expect(itemTitles()).toEqual(['Millennium Park', 'Boat Tour', 'Navy Pier', 'Brunch'])
    expect(screen.queryByRole('heading', { name: 'Add Itinerary Item' })).not.toBeInTheDocument()

    const [, request] = fetchMock.mock.calls.find(([, options]) => options.method === 'POST')
    expect(JSON.parse(request.body)).toMatchObject({ date: '2026-11-14', time: '10:30' })
  })

  it('updates an item through its Edit button', async () => {
    const { user } = await renderApp()
    await screen.findByRole('heading', { name: 'Brunch' })

    await user.click(within(cardFor('Brunch')).getByRole('button', { name: 'Edit' }))
    const name = screen.getByLabelText(/Activity or Booking Name/)
    await user.clear(name)
    await user.type(name, 'Late Brunch')
    await user.click(screen.getByRole('button', { name: 'Update Item' }))

    expect(await screen.findByRole('heading', { name: 'Late Brunch' })).toBeInTheDocument()
    expect(itemTitles()).toHaveLength(3)
  })

  it('opens blank again after an edit is cancelled', async () => {
    const { user } = await renderApp()
    await screen.findByRole('heading', { name: 'Brunch' })

    await user.click(within(cardFor('Brunch')).getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: '+ Add Item' }))

    expect(screen.getByLabelText(/Activity or Booking Name/)).toHaveValue('')
  })

  it.each([
    [true, 2],
    [false, 3],
  ])('deletes an item only after confirming (confirmed: %s)', async (answer, remaining) => {
    confirmMock.mockReturnValue(answer)
    const { user } = await renderApp()
    await screen.findByRole('heading', { name: 'Brunch' })

    await user.click(within(cardFor('Brunch')).getByRole('button', { name: 'Delete' }))

    await vi.waitFor(() => expect(itemTitles()).toHaveLength(remaining))
  })

  // known bug: both forms close right away, so typed details are lost if saving fails
  // it.fails passes while the bug exists; once it's fixed, change it to a normal it()
  it.fails('keeps the form open when saving fails', async () => {
    const { fetchMock, user } = await renderApp()
    await screen.findByRole('heading', { name: 'Brunch' })
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Nope' }) })

    await addBoatTour(user)
    await vi.waitFor(() => expect(alertMock).toHaveBeenCalledWith('Unable to save this item: Nope'))

    expect(screen.getByLabelText(/Activity or Booking Name/)).toHaveValue('Boat Tour')
  })
})
