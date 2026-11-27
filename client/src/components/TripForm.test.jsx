import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import TripForm from './TripForm'

const emptyTrip = {
  title: '',
  startLocation: '',
  destination: '',
  startDate: '',
  endDate: '',
}

const validTrip = {
  title: 'Chicago Weekend',
  startLocation: 'Fort Wayne, IN',
  destination: 'Chicago, IL',
  startDate: '2026-11-13',
  endDate: '2026-11-15',
}

// holds the draft in state, the same way App does
function renderTripForm({ trip = emptyTrip, ...overrides } = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onSaveTrip: vi.fn(),
    ...overrides,
  }

  function Wrapper() {
    const [tripDraft, setTripDraft] = useState(trip)
    return <TripForm {...props} tripDraft={tripDraft} setTripDraft={setTripDraft} />
  }

  const view = render(<Wrapper />)
  return { ...props, ...view, user: userEvent.setup() }
}

const save = (user) => user.click(screen.getByRole('button', { name: 'Save Trip' }))

describe('TripForm', () => {
  let alertMock
  let confirmMock

  beforeEach(() => {
    // freeze "today" so the past-date warning behaves the same every time
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 5, 1))
    alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
    confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('modal state', () => {
    it('renders nothing when closed', () => {
      const { container } = renderTripForm({ isOpen: false })

      expect(container).toBeEmptyDOMElement()
    })

    it('shows the create form when open', () => {
      renderTripForm()

      expect(screen.getByRole('heading', { name: 'Create Your Trip' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save Trip' })).toBeInTheDocument()
    })

    it('shows the edit wording and the current values when editing', () => {
      renderTripForm({ isEditing: true, trip: validTrip })

      expect(screen.getByRole('heading', { name: 'Edit Your Trip' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
      expect(screen.getByLabelText(/Trip Title/)).toHaveValue('Chicago Weekend')
    })

    it.each(['Cancel', '✕'])('closes when %s is clicked', async (name) => {
      const { onClose, onSaveTrip, user } = renderTripForm()

      await user.click(screen.getByRole('button', { name }))

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onSaveTrip).not.toHaveBeenCalled()
    })

    it('closes when the background is clicked, but not the form itself', () => {
      const { onClose, container } = renderTripForm()

      fireEvent.mouseDown(screen.getByRole('heading', { name: 'Create Your Trip' }))
      expect(onClose).not.toHaveBeenCalled()

      fireEvent.mouseDown(container.querySelector('.modal-overlay'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('validation', () => {
    it.each(Object.keys(validTrip))('requires %s', async (field) => {
      const { onSaveTrip, onClose, user } = renderTripForm({ trip: { ...validTrip, [field]: '' } })

      await save(user)

      expect(alertMock).toHaveBeenCalledWith('Please fill out all required fields.')
      expect(onSaveTrip).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })

    it('rejects an end date before the start date', async () => {
      const { onSaveTrip, user } = renderTripForm({ trip: { ...validTrip, endDate: '2026-11-12' } })

      await save(user)

      expect(alertMock).toHaveBeenCalledWith('End date cannot be earlier than start date.')
      expect(onSaveTrip).not.toHaveBeenCalled()
    })

    it('accepts a one day trip', async () => {
      const { onSaveTrip, user } = renderTripForm({ trip: { ...validTrip, endDate: '2026-11-13' } })

      await save(user)

      expect(onSaveTrip).toHaveBeenCalledTimes(1)
    })

    it.each([
      [true, 1],
      [false, 0],
    ])('asks before saving a past trip (confirmed: %s)', async (answer, saves) => {
      confirmMock.mockReturnValue(answer)
      const { onSaveTrip, user } = renderTripForm({
        trip: { ...validTrip, startDate: '2026-05-01', endDate: '2026-05-03' },
      })

      await save(user)

      expect(confirmMock).toHaveBeenCalledTimes(1)
      expect(onSaveTrip).toHaveBeenCalledTimes(saves)
    })
  })

  it('saves what was typed and closes the modal', async () => {
    const { onSaveTrip, onClose, user } = renderTripForm()

    await user.type(screen.getByLabelText(/Trip Title/), validTrip.title)
    await user.type(screen.getByLabelText(/Starting Location/), validTrip.startLocation)
    await user.type(screen.getByLabelText(/Destination/), validTrip.destination)
    await user.type(screen.getByLabelText(/Start Date/), validTrip.startDate)
    await user.type(screen.getByLabelText(/End Date/), validTrip.endDate)
    await save(user)

    expect(onSaveTrip).toHaveBeenCalledWith(expect.objectContaining(validTrip))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('drops old map coordinates when a location is retyped', async () => {
    const { onSaveTrip, user } = renderTripForm({
      trip: { ...validTrip, startLat: 41.07, startLng: -85.13, destLat: 41.87, destLng: -87.62 },
    })

    await user.type(screen.getByLabelText(/Destination/), ' Loop')
    await save(user)

    expect(onSaveTrip).toHaveBeenCalledWith(
      expect.objectContaining({ startLat: 41.07, startLng: -85.13, destLat: null, destLng: null }),
    )
  })
})
