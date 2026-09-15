import { describe, expect, it } from 'vitest'
import { formatPaymentMethod, primaryPayment } from './payments'
import { normalizeTrip } from './storage'

describe('formatPaymentMethod', () => {
  it('joins kind, label, and account', () => {
    expect(
      formatPaymentMethod({
        id: '1',
        kind: 'bank',
        label: 'BCA',
        accountName: 'Maya Putri',
        accountNumber: '1234567890',
      }),
    ).toBe('Bank · BCA · Maya Putri · 1234567890')
  })
})

describe('person payment methods', () => {
  it('round-trips account info on a friend', () => {
    const trip = normalizeTrip({
      name: 'Test',
      people: [
        {
          id: 'p1',
          name: 'Maya',
          color: '#000',
          paymentMethods: [
            { id: 'm1', kind: 'bank', label: 'BCA', accountName: 'Maya', accountNumber: '123' },
          ],
        },
      ],
      expenses: [],
    })
    expect(trip?.people[0]?.paymentMethods?.[0]?.accountNumber).toBe('123')
    expect(primaryPayment(trip?.people[0])?.label).toBe('BCA')
  })
})
