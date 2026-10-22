import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TripForm from './TripForm'

const emptyTrip = {
  title: '',
  startLocation: '',
  destination: '',
  startDate: '',
  endDate: '',
}

function renderTripForm(overrides = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onSaveTrip: vi.fn(),
    tripDraft: emptyTrip,
    setTripDraft: vi.fn(),
    ...overrides,
  }

  render(<TripForm {...props} />)

  return props
}

describe('TripForm', () => {
  it('does not display the form when the modal is closed', () => {
    renderTripForm({ isOpen: false })

    expect(
      screen.queryByText('Create Your Trip')
    ).not.toBeInTheDocument()
  })

  it('displays the form when the modal is open', () => {
    renderTripForm()

    expect(
      screen.getByText('Create Your Trip')
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: 'Save Trip' })
    ).toBeInTheDocument()
  })

  it('closes the modal when Cancel is clicked', () => {
    const { onClose } = renderTripForm()

    fireEvent.click(
      screen.getByRole('button', { name: 'Cancel' })
    )

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows an alert when required fields are missing', () => {
    const alertMock = vi
      .spyOn(window, 'alert')
      .mockImplementation(() => {})

    const { onSaveTrip } = renderTripForm()

    fireEvent.click(
      screen.getByRole('button', { name: 'Save Trip' })
    )

    expect(alertMock).toHaveBeenCalledWith(
      'Please fill out all required fields.'
    )

    expect(onSaveTrip).not.toHaveBeenCalled()

    alertMock.mockRestore()
  })

  it('shows an alert when the end date is earlier than the start date', () => {
    const alertMock = vi
      .spyOn(window, 'alert')
      .mockImplementation(() => {})

    const invalidTrip = {
      title: 'Chicago Weekend',
      startLocation: 'Fort Wayne, IN',
      destination: 'Chicago, IL',
      startDate: '2027-10-10',
      endDate: '2027-10-08',
    }

    const { onSaveTrip } = renderTripForm({
      tripDraft: invalidTrip,
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Save Trip' })
    )

    expect(alertMock).toHaveBeenCalledWith(
      'End date cannot be earlier than start date.'
    )

    expect(onSaveTrip).not.toHaveBeenCalled()

    alertMock.mockRestore()
  })

  it('saves a valid trip and closes the modal', () => {
    const validTrip = {
      title: 'Chicago Weekend',
      startLocation: 'Fort Wayne, IN',
      destination: 'Chicago, IL',
      startDate: '2027-10-10',
      endDate: '2027-10-12',
    }

    const { onSaveTrip, onClose } = renderTripForm({
      tripDraft: validTrip,
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Save Trip' })
    )

    expect(onSaveTrip).toHaveBeenCalledWith(validTrip)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})