import { render, screen, within, fireEvent } from '@testing-library/react'
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

const serverError = () => ({ ok: false, status: 500, json: async () => ({ error: 'Nope' }) })
const requests = (fetchMock, method) =>
  fetchMock.mock.calls.filter(([, options]) => options.method === method)

// leaves the next request unanswered until the returned function is called
function holdNextRequest(fetchMock) {
  const answer = fetchMock.getMockImplementation()
  let release
  const gate = new Promise((resolve) => (release = resolve))
  fetchMock.mockImplementationOnce(async (...args) => {
    await gate
    return answer(...args)
  })
  return release
}

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

  // dates far in the future, so the past-date warning never shows up
  const fillNewTrip = async (user) => {
    await user.click(screen.getByRole('button', { name: '+ Create Trip' }))
    await user.type(screen.getByLabelText(/Trip Title/), 'Miami Break')
    await user.type(screen.getByLabelText(/Starting Location/), 'Fort Wayne, IN')
    await user.type(screen.getByLabelText(/Destination/), 'Miami, FL')
    await user.type(screen.getByLabelText(/Start Date/), '2099-03-01')
    await user.type(screen.getByLabelText(/End Date/), '2099-03-05')
  }

  it('keeps a new trip in the form when saving fails', async () => {
    const { fetchMock, user } = await renderApp()
    await fillNewTrip(user)
    fetchMock.mockResolvedValueOnce(serverError())

    await user.click(screen.getByRole('button', { name: 'Save Trip' }))
    await vi.waitFor(() => expect(alertMock).toHaveBeenCalledWith('Unable to save this trip: Nope'))

    expect(screen.getByRole('heading', { name: 'Create Your Trip' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Trip Title/)).toHaveValue('Miami Break')
    expect(screen.getByLabelText(/Starting Location/)).toHaveValue('Fort Wayne, IN')
    expect(screen.getByLabelText(/Destination/)).toHaveValue('Miami, FL')
    expect(screen.getByLabelText(/Start Date/)).toHaveValue('2099-03-01')
    expect(screen.getByLabelText(/End Date/)).toHaveValue('2099-03-05')

    // trying again with the same details works
    await user.click(screen.getByRole('button', { name: 'Save Trip' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Miami Break' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Create Your Trip' })).not.toBeInTheDocument()
  })

  it('keeps an edit open when saving fails, and updates the same trip on retry', async () => {
    const { fetchMock, user } = await renderApp()

    await user.click(screen.getByRole('button', { name: /Edit Trip/ }))
    const title = screen.getByLabelText(/Trip Title/)
    await user.clear(title)
    await user.type(title, 'Windy City')
    fetchMock.mockResolvedValueOnce(serverError())
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await vi.waitFor(() => expect(alertMock).toHaveBeenCalledWith('Unable to save this trip: Nope'))

    expect(screen.getByRole('heading', { name: 'Edit Your Trip' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Trip Title/)).toHaveValue('Windy City')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chicago Weekend')

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Windy City' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Edit Your Trip' })).not.toBeInTheDocument()
    expect(requests(fetchMock, 'POST')).toHaveLength(0)
    expect(requests(fetchMock, 'PUT')).toHaveLength(2)
  })

  it('creates only one trip when submitted twice while saving', async () => {
    const { fetchMock, user } = await renderApp()
    await fillNewTrip(user)
    const release = holdNextRequest(fetchMock)

    await user.click(screen.getByRole('button', { name: 'Save Trip' }))
    const saving = screen.getByRole('button', { name: 'Saving...' })
    expect(saving).toBeDisabled()
    fireEvent.submit(saving.closest('form'))
    release()

    expect(await screen.findByRole('heading', { level: 1, name: 'Miami Break' })).toBeInTheDocument()
    expect(requests(fetchMock, 'POST')).toHaveLength(1)
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

  it('keeps the form open when saving fails', async () => {
    const { fetchMock, user } = await renderApp()
    await screen.findByRole('heading', { name: 'Brunch' })
    fetchMock.mockResolvedValueOnce(serverError())

    await addBoatTour(user)
    await vi.waitFor(() => expect(alertMock).toHaveBeenCalledWith('Unable to save this item: Nope'))

    expect(screen.getByLabelText(/Activity or Booking Name/)).toHaveValue('Boat Tour')
    expect(screen.getByLabelText(/Location/)).toHaveValue('Chicago Riverwalk')
    expect(screen.getByLabelText(/Date/)).toHaveValue('2026-11-14')
    expect(screen.getByLabelText(/Time/)).toHaveValue('10:30')
    expect(itemTitles()).not.toContain('Boat Tour')

    // trying again with the same details works
    await user.click(screen.getByRole('button', { name: 'Add to Itinerary' }))

    await screen.findByRole('heading', { name: 'Boat Tour' })
    expect(screen.queryByRole('heading', { name: 'Add Itinerary Item' })).not.toBeInTheDocument()
    expect(itemTitles()).toHaveLength(4)
  })

  it('keeps an edit open when saving fails, and updates the same item on retry', async () => {
    const { fetchMock, user } = await renderApp()
    await screen.findByRole('heading', { name: 'Brunch' })

    await user.click(within(cardFor('Brunch')).getByRole('button', { name: 'Edit' }))
    const name = screen.getByLabelText(/Activity or Booking Name/)
    await user.clear(name)
    await user.type(name, 'Late Brunch')
    fetchMock.mockResolvedValueOnce(serverError())
    await user.click(screen.getByRole('button', { name: 'Update Item' }))
    await vi.waitFor(() => expect(alertMock).toHaveBeenCalledWith('Unable to save this item: Nope'))

    expect(screen.getByRole('heading', { name: 'Edit Itinerary Item' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Activity or Booking Name/)).toHaveValue('Late Brunch')

    await user.click(screen.getByRole('button', { name: 'Update Item' }))

    await screen.findByRole('heading', { level: 4, name: 'Late Brunch' })
    expect(screen.queryByRole('heading', { name: 'Edit Itinerary Item' })).not.toBeInTheDocument()
    expect(itemTitles()).toHaveLength(3)
    expect(requests(fetchMock, 'POST')).toHaveLength(0)
    expect(requests(fetchMock, 'PUT')).toHaveLength(2)
  })

  it('keeps the form open when there is no trip to add the item to', async () => {
    const { user } = await renderApp({ trips: [] })

    await user.click(screen.getByRole('button', { name: '+ Add Item' }))
    await user.type(screen.getByLabelText(/Activity or Booking Name/), 'Boat Tour')
    await user.type(screen.getByLabelText(/Location/), 'Chicago Riverwalk')
    await user.type(screen.getByLabelText(/Date/), '2026-11-14')
    await user.type(screen.getByLabelText(/Time/), '10:30')
    await user.click(screen.getByRole('button', { name: 'Add to Itinerary' }))

    expect(alertMock).toHaveBeenCalledWith('Please create a trip first.')
    expect(screen.getByLabelText(/Activity or Booking Name/)).toHaveValue('Boat Tour')
  })

  it('creates only one item when submitted twice while saving', async () => {
    const { fetchMock, user } = await renderApp()
    await screen.findByRole('heading', { name: 'Brunch' })
    const release = holdNextRequest(fetchMock)

    await addBoatTour(user)
    const saving = screen.getByRole('button', { name: 'Saving...' })
    expect(saving).toBeDisabled()
    fireEvent.submit(saving.closest('form'))
    release()

    await screen.findByRole('heading', { name: 'Boat Tour' })
    expect(requests(fetchMock, 'POST')).toHaveLength(1)
    expect(itemTitles()).toHaveLength(4)
  })
})
