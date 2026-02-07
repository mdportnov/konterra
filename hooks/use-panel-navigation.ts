'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Contact, ContactConnection } from '@/lib/db/schema'
import type { ConnectedContact } from '@/components/globe/ContactDetail'

export type ActivePanel = 'detail' | 'edit' | 'settings' | 'browser' | 'insights' | null

function slugToState(slug?: string[]): { panel: ActivePanel; contactId: string | null; isNew: boolean } {
  if (!slug || slug.length === 0) return { panel: null, contactId: null, isNew: false }
  if (slug[0] === 'settings') return { panel: 'settings', contactId: null, isNew: false }
  if (slug[0] === 'contacts') return { panel: 'browser', contactId: null, isNew: false }
  if (slug[0] === 'insights') return { panel: 'insights', contactId: null, isNew: false }
  if (slug[0] === 'contact') {
    if (slug[1] === 'new') return { panel: 'edit', contactId: null, isNew: true }
    if (slug[2] === 'edit') return { panel: 'edit', contactId: slug[1], isNew: false }
    if (slug[1]) return { panel: 'detail', contactId: slug[1], isNew: false }
  }
  return { panel: null, contactId: null, isNew: false }
}

function stateToUrl(panel: ActivePanel, contactId?: string | null): string {
  switch (panel) {
    case 'detail': return contactId ? `/contact/${contactId}` : '/'
    case 'edit': return contactId ? `/contact/${contactId}/edit` : '/contact/new'
    case 'settings': return '/settings'
    case 'browser': return '/contacts'
    case 'insights': return '/insights'
    default: return '/'
  }
}

function pushUrl(url: string) {
  if (window.location.pathname !== url) {
    window.history.pushState(null, '', url)
  }
}

function pathnameToSlug(pathname: string): string[] {
  return pathname.split('/').filter(Boolean)
}

export function usePanelNavigation(
  slug: string[] | undefined,
  contacts: Contact[],
  connections: ContactConnection[],
  isMobile: boolean,
  setMobileView: (v: 'globe' | 'dashboard') => void,
) {
  const initialState = useRef(slugToState(slug))
  const pendingContactId = useRef<string | null>(initialState.current.contactId)

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [activePanel, setActivePanel] = useState<ActivePanel>(initialState.current.panel)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; ts: number } | null>(null)

  useEffect(() => {
    const onPopState = () => {
      const s = slugToState(pathnameToSlug(window.location.pathname))
      setActivePanel(s.panel)
      if (s.panel === null) {
        setSelectedContact(null)
        setEditingContact(null)
      } else if (s.panel === 'detail' && s.contactId) {
        const c = contacts.find((x) => x.id === s.contactId)
        if (c) {
          setSelectedContact(c)
          if (c.lat != null && c.lng != null) {
            setFlyTarget({ lat: c.lat, lng: c.lng, ts: Date.now() })
          }
        }
      } else if (s.panel === 'edit' && s.contactId) {
        const c = contacts.find((x) => x.id === s.contactId)
        if (c) setEditingContact(c)
      } else if (s.panel === 'edit' && s.isNew) {
        setEditingContact(null)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [contacts])

  const flyToContact = useCallback((c: Contact) => {
    if (c.lat != null && c.lng != null) {
      setFlyTarget({ lat: c.lat, lng: c.lng, ts: Date.now() })
    }
  }, [])

  const handleContactClick = useCallback((contact: Contact) => {
    setSelectedContact(contact)
    setActivePanel('detail')
    pushUrl(stateToUrl('detail', contact.id))
    if (isMobile) setMobileView('globe')
    flyToContact(contact)
  }, [isMobile, setMobileView, flyToContact])

  const handleCloseDetail = useCallback(() => {
    setActivePanel(null)
    pushUrl('/')
  }, [])

  const handleEditContact = useCallback((contact: Contact) => {
    setEditingContact(contact)
    setActivePanel('edit')
    pushUrl(stateToUrl('edit', contact.id))
  }, [])

  const handleAddContact = useCallback(() => {
    setEditingContact(null)
    setActivePanel('edit')
    pushUrl('/contact/new')
    if (isMobile) setMobileView('globe')
  }, [isMobile, setMobileView])

  const handleCancelEdit = useCallback(() => {
    setActivePanel(null)
    setEditingContact(null)
    pushUrl('/')
  }, [])

  const handleContactSaved = useCallback((saved: Contact, setContacts: React.Dispatch<React.SetStateAction<Contact[]>>) => {
    setContacts((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
    setSelectedContact(saved)
    setActivePanel('detail')
    setEditingContact(null)
    pushUrl(stateToUrl('detail', saved.id))
  }, [])

  const handleDeleteContact = useCallback((contactId: string, setContacts: React.Dispatch<React.SetStateAction<Contact[]>>, setConnections: React.Dispatch<React.SetStateAction<ContactConnection[]>>) => {
    setContacts((prev) => prev.filter((c) => c.id !== contactId))
    setConnections((prev) => prev.filter((c) => c.sourceContactId !== contactId && c.targetContactId !== contactId))
    setSelectedContact(null)
    setActivePanel(null)
    pushUrl('/')
  }, [])

  const handleOpenSettings = useCallback(() => {
    setActivePanel('settings')
    pushUrl('/settings')
  }, [])

  const handleCloseSettings = useCallback(() => {
    setActivePanel(null)
    pushUrl('/')
  }, [])

  const handleOpenContactsBrowser = useCallback(() => {
    setActivePanel('browser')
    pushUrl('/contacts')
    if (isMobile) setMobileView('globe')
  }, [isMobile, setMobileView])

  const handleCloseBrowser = useCallback(() => {
    setActivePanel(null)
    pushUrl('/')
  }, [])

  const handleBrowserSelectContact = useCallback((contact: Contact) => {
    setSelectedContact(contact)
    setActivePanel('detail')
    pushUrl(stateToUrl('detail', contact.id))
    flyToContact(contact)
  }, [flyToContact])

  const handleOpenInsights = useCallback(() => {
    setActivePanel('insights')
    pushUrl('/insights')
    if (isMobile) setMobileView('globe')
  }, [isMobile, setMobileView])

  const handleCloseInsights = useCallback(() => {
    setActivePanel(null)
    pushUrl('/')
  }, [])

  const connectedContacts: ConnectedContact[] = useMemo(() => {
    if (!selectedContact) return []
    const result: ConnectedContact[] = []
    const contactMap = new Map(contacts.map((c) => [c.id, c]))

    for (const conn of connections) {
      let otherId: string | null = null
      if (conn.sourceContactId === selectedContact.id) otherId = conn.targetContactId
      else if (conn.targetContactId === selectedContact.id) otherId = conn.sourceContactId
      if (!otherId) continue
      const other = contactMap.get(otherId)
      if (other && !result.some((r) => r.id === other.id)) {
        result.push({ id: other.id, name: other.name, lat: other.lat, lng: other.lng })
      }
    }

    if (result.length === 0 && selectedContact.tags?.length) {
      for (const c of contacts) {
        if (c.id === selectedContact.id) continue
        if (c.tags?.some((t) => selectedContact.tags?.includes(t))) {
          result.push({ id: c.id, name: c.name, lat: c.lat, lng: c.lng })
        }
      }
    }

    return result
  }, [contacts, connections, selectedContact])

  const handleConnectedContactClick = useCallback((cc: ConnectedContact) => {
    const c = contacts.find((x) => x.id === cc.id)
    if (c) {
      setSelectedContact(c)
      setActivePanel('detail')
      pushUrl(stateToUrl('detail', c.id))
      flyToContact(c)
    }
  }, [contacts, flyToContact])

  const resolveInitialContact = useCallback((data: Contact[]) => {
    if (pendingContactId.current) {
      const c = data.find((x) => x.id === pendingContactId.current)
      if (c) {
        if (initialState.current.panel === 'detail') {
          setSelectedContact(c)
          flyToContact(c)
        } else if (initialState.current.panel === 'edit') {
          setEditingContact(c)
          setSelectedContact(c)
        }
      }
      pendingContactId.current = null
    }
  }, [flyToContact])

  return {
    selectedContact, setSelectedContact,
    activePanel, setActivePanel,
    editingContact, setEditingContact,
    flyTarget, setFlyTarget,
    connectedContacts,
    resolveInitialContact,
    handleContactClick,
    handleCloseDetail,
    handleEditContact,
    handleAddContact,
    handleCancelEdit,
    handleContactSaved,
    handleDeleteContact,
    handleOpenSettings,
    handleCloseSettings,
    handleOpenContactsBrowser,
    handleCloseBrowser,
    handleBrowserSelectContact,
    handleOpenInsights,
    handleCloseInsights,
    handleConnectedContactClick,
    flyToContact,
  }
}
