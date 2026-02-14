'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import type { Contact, ContactCountryConnection, Trip } from '@/lib/db/schema'
import type { DisplayOptions } from '@/types/display'

interface UsePopupStateOptions {
  contacts: Contact[]
  filteredContacts: Contact[]
  countryConnections: ContactCountryConnection[]
  trips: Trip[]
  displayOptions: DisplayOptions
  onContactClick: (contact: Contact) => void
  onAddContact: (prefill?: Record<string, string>) => void
  setFlyTarget: (target: { lat: number; lng: number; ts: number }) => void
  onTripSelected: (tripId: string) => void
}

export function usePopupState({
  contacts,
  filteredContacts,
  countryConnections,
  trips,
  displayOptions,
  onContactClick,
  onAddContact,
  setFlyTarget,
  onTripSelected,
}: UsePopupStateOptions) {
  const [countryPopup, setCountryPopup] = useState<{ country: string; contacts: Contact[]; x: number; y: number } | null>(null)
  const [countryPopupOpen, setCountryPopupOpen] = useState(false)
  const countryClosingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [tripCountryPopup, setTripCountryPopup] = useState<{ country: string; x: number; y: number } | null>(null)
  const [tripCountryPopupOpen, setTripCountryPopupOpen] = useState(false)
  const tripCountryClosingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (countryClosingTimer.current) clearTimeout(countryClosingTimer.current)
      if (tripCountryClosingTimer.current) clearTimeout(tripCountryClosingTimer.current)
    }
  }, [])

  const handleCountryClick = useCallback((country: string, event: { x: number; y: number }) => {
    if (displayOptions.showTravel && !displayOptions.showNetwork) {
      if (tripCountryClosingTimer.current) clearTimeout(tripCountryClosingTimer.current)
      const hasTrips = trips.some((t) => t.country === country)
      if (!hasTrips) return
      setTripCountryPopup({ country, x: event.x, y: event.y })
      requestAnimationFrame(() => setTripCountryPopupOpen(true))
      return
    }
    if (countryClosingTimer.current) clearTimeout(countryClosingTimer.current)
    const matched = filteredContacts.filter((c) => c.country === country)
    setCountryPopup({ country, contacts: matched, x: event.x, y: event.y })
    requestAnimationFrame(() => setCountryPopupOpen(true))
  }, [filteredContacts, displayOptions.showTravel, displayOptions.showNetwork, trips])

  const closeCountryPopup = useCallback(() => {
    setCountryPopupOpen(false)
    countryClosingTimer.current = setTimeout(() => setCountryPopup(null), 150)
  }, [])

  const closeTripCountryPopup = useCallback(() => {
    setTripCountryPopupOpen(false)
    tripCountryClosingTimer.current = setTimeout(() => setTripCountryPopup(null), 150)
  }, [])

  const handleCountryPopupSelect = useCallback((contact: Contact) => {
    closeCountryPopup()
    onContactClick(contact)
  }, [closeCountryPopup, onContactClick])

  const handleAddContactToCountry = useCallback(() => {
    const country = countryPopup?.country
    closeCountryPopup()
    onAddContact(country ? { country } : undefined)
  }, [closeCountryPopup, onAddContact, countryPopup?.country])

  const handleTripCountryTripClick = useCallback((trip: Trip) => {
    closeTripCountryPopup()
    if (trip.lat != null && trip.lng != null) {
      onTripSelected(trip.id)
      setFlyTarget({ lat: trip.lat, lng: trip.lng, ts: Date.now() })
    }
  }, [closeTripCountryPopup, setFlyTarget, onTripSelected])

  const indirectPopupContacts = useMemo(() => {
    if (!countryPopup) return []
    const directIds = new Set(countryPopup.contacts.map((c) => c.id))
    const indirectContactIds = countryConnections
      .filter((cc) => cc.country === countryPopup.country)
      .map((cc) => cc.contactId)
      .filter((id) => !directIds.has(id))
    const contactMap = new Map(contacts.map((c) => [c.id, c]))
    return [...new Set(indirectContactIds)].map((id) => contactMap.get(id)).filter(Boolean) as Contact[]
  }, [countryPopup, countryConnections, contacts])

  const tripCountryTrips = useMemo(() => {
    if (!tripCountryPopup) return []
    return trips.filter((t) => t.country === tripCountryPopup.country)
  }, [tripCountryPopup, trips])

  const contactCountsByCountry = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of contacts) {
      if (c.country) map.set(c.country, (map.get(c.country) || 0) + 1)
    }
    for (const cc of countryConnections) {
      map.set(cc.country, (map.get(cc.country) || 0) + 1)
    }
    return map
  }, [contacts, countryConnections])

  return {
    countryPopup,
    countryPopupOpen,
    tripCountryPopup,
    tripCountryPopupOpen,
    handleCountryClick,
    closeCountryPopup,
    closeTripCountryPopup,
    handleCountryPopupSelect,
    handleAddContactToCountry,
    handleTripCountryTripClick,
    indirectPopupContacts,
    tripCountryTrips,
    contactCountsByCountry,
  }
}
