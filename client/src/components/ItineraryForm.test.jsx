import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ItineraryItem, ItineraryForm } from './ItineraryForm'
import { chicagoTrip } from '../test/fixtures'

// an item the way the UI holds it (see toUiItem in services/api.js)
const uiItem = {
  id: 'item-1',
  type: 'Park',
  icon: '🌳',
  title: 'Millennium Park',
  location: 'Millennium Park, Chicago',
  lat: 41.88,
  lng: -87.62,
  date: 'Saturday, November 14',
  time: '10:00 AM',
  rawDate: '2026-11-14',
  rawTime: '10:00',
  notes: 'See the Bean',
}

describe('ItineraryItem', () => {
  it('shows the item details', () => {
    render(<ItineraryItem item={uiItem} onEdit={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Millennium Park' })).toBeInTheDocument()
    expect(screen.getByText('Park')).toBeInTheDocument()
    expect(screen.getByText(/10:00 AM/)).toBeInTheDocument()
    expect(screen.getByText(/Millennium Park, Chicago/)).toBeInTheDocument()
    expect(screen.getByText('See the Bean')).toBeInTheDocument()
  })

  it('shows the travel estimate only when there is one', () => {
    const { rerender } = render(<ItineraryItem item={uiItem} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByText(/from Navy Pier/)).not.toBeInTheDocument()

    rerender(
      <ItineraryItem
        item={uiItem}
        travel={{ duration: '12 min', distance: '2.1 mi', from: 'Navy Pier' }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByText(/12 min · 2\.1 mi from Navy Pier/)).toBeInTheDocument()
  })

  it('passes the item to Edit and its id to Delete', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const user = userEvent.setup()
    render(<ItineraryItem item={uiItem} onEdit={onEdit} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onEdit).toHaveBeenCalledWith(uiItem)
    expect(onDelete).toHaveBeenCalledWith('item-1')
  })
})

describe('ItineraryForm', () => {
  let alertMock

  beforeEach(() => {
    alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function renderForm(overrides = {}) {
    const props = {
      isOpen: true,
      onClose: vi.fn(),
      onSave: vi.fn(),
      editingItem: null,
      activeTrip: chicagoTrip,
      ...overrides,
    }
    const view = render(<ItineraryForm {...props} />)
    return { ...props, ...view, user: userEvent.setup() }
  }

  const fill = async (user, values) => {
    const labels = { title: /Activity or Booking Name/, location: /Location/, date: /Date/, time: /Time/ }
    for (const [field, value] of Object.entries(values)) {
      if (value) await user.type(screen.getByLabelText(labels[field]), value)
    }
  }

  const complete = {
    title: 'Boat Tour',
    location: 'Chicago Riverwalk',
    date: '2026-11-14',
    time: '14:30',
  }

  const submit = (user, name = 'Add to Itinerary') => user.click(screen.getByRole('button', { name }))

  it('renders nothing when closed', () => {
    const { container } = renderForm({ isOpen: false })

    expect(container).toBeEmptyDOMElement()
  })

  it.each(['Cancel', '×'])('closes without saving when %s is clicked', async (name) => {
    const { onClose, onSave, user } = renderForm()

    await user.click(screen.getByRole('button', { name }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })

  it.each(Object.keys(complete))('requires %s', async (field) => {
    const { onSave, user } = renderForm()

    await fill(user, { ...complete, [field]: '' })
    await submit(user)

    expect(alertMock).toHaveBeenCalledWith('Please complete the required fields.')
    expect(onSave).not.toHaveBeenCalled()
  })

  it.each(['2026-11-12', '2026-11-16'])('rejects %s, which is outside the trip', async (date) => {
    const { onSave, user } = renderForm()

    await fill(user, { ...complete, date })
    await submit(user)

    expect(alertMock).toHaveBeenCalledWith('Date must be within trip dates (2026-11-13 to 2026-11-15).')
    expect(onSave).not.toHaveBeenCalled()
  })

  it.each(['2026-11-13', '2026-11-15'])('accepts %s, an edge of the trip', async (date) => {
    const { onSave, user } = renderForm()

    await fill(user, { ...complete, date })
    await submit(user)

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('saves a new item with formatted date, time and icon, then closes', async () => {
    const { onSave, onClose, user } = renderForm({ onSave: vi.fn().mockResolvedValue(true) })

    await fill(user, complete)
    await user.selectOptions(screen.getByRole('combobox'), 'Food')
    await submit(user)

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Boat Tour',
        type: 'Food',
        icon: '🍽️',
        date: 'Saturday, November 14',
        rawDate: '2026-11-14',
        time: expect.stringMatching(/^2:30\sPM$/),
        rawTime: '14:30',
      }),
    )
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  describe('while saving', () => {
    // onSave stays pending until the test answers it
    function renderPendingSave(options) {
      let finish
      const onSave = vi.fn(() => new Promise((resolve) => (finish = resolve)))
      const view = renderForm({ onSave, ...options })
      return { ...view, finish: (saved) => act(async () => finish(saved)) }
    }

    it('stays open until the save succeeds', async () => {
      const { onClose, finish, user } = renderPendingSave()

      await fill(user, complete)
      await submit(user)
      expect(onClose).not.toHaveBeenCalled()

      await finish(true)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('keeps what was typed after a failed save', async () => {
      const { onClose, onSave, finish, user } = renderPendingSave()

      await fill(user, complete)
      await submit(user)
      await finish(false)

      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByLabelText(/Activity or Booking Name/)).toHaveValue('Boat Tour')
      expect(screen.getByLabelText(/Location/)).toHaveValue('Chicago Riverwalk')
      expect(screen.getByLabelText(/Date/)).toHaveValue('2026-11-14')
      expect(screen.getByLabelText(/Time/)).toHaveValue('14:30')

      await submit(user)
      expect(onSave).toHaveBeenCalledTimes(2)
    })

    it('keeps the changes after a failed edit', async () => {
      const { onClose, finish, user } = renderPendingSave({
        editingItem: uiItem,
        activeTrip: chicagoTrip,
      })

      await user.type(screen.getByLabelText(/Notes/), ' at sunset')
      await submit(user, 'Update Item')
      await finish(false)

      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByLabelText(/Notes/)).toHaveValue('See the Bean at sunset')
      expect(screen.getByRole('button', { name: 'Update Item' })).toBeEnabled()
    })

    it('saves only once when submitted twice before the screen updates', async () => {
      const { onSave, container } = renderPendingSave({ editingItem: uiItem })
      const form = container.querySelector('form')

      act(() => {
        fireEvent.submit(form)
        fireEvent.submit(form)
      })

      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it('cannot be closed', async () => {
      const { onClose, container, user } = renderPendingSave({ editingItem: uiItem })

      await submit(user, 'Update Item')

      for (const name of ['Saving...', 'Cancel', '×']) {
        expect(screen.getByRole('button', { name })).toBeDisabled()
      }
      fireEvent.mouseDown(container.querySelector('.modal-overlay'))
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  it('fills in the current values when editing', () => {
    renderForm({ editingItem: uiItem })

    expect(screen.getByRole('heading', { name: 'Edit Itinerary Item' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Activity or Booking Name/)).toHaveValue('Millennium Park')
    expect(screen.getByRole('combobox')).toHaveValue('Park')
    expect(screen.getByLabelText(/Date/)).toHaveValue('2026-11-14')
    expect(screen.getByLabelText(/Time/)).toHaveValue('10:00')
    expect(screen.getByLabelText(/Notes/)).toHaveValue('See the Bean')
  })

  it('drops old map coordinates when the location is retyped', async () => {
    const { onSave, user } = renderForm({ editingItem: uiItem })

    await user.type(screen.getByLabelText(/Location/), ' Garden')
    await submit(user, 'Update Item')

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-1', lat: null, lng: null }))
  })
})
