'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Contact, ContactConnection, ContactCountryConnection } from '@/lib/db/schema'
import type { ConnectedContact } from '@/components/globe/ContactDetail'

export type ActivePanel = 'edit' | 'settings' | 'insights' | null
export type SidebarView = 'list' | 'detail'

function slugToState(slug?: string[]): { panel: ActivePanel; sidebarView: SidebarView; contactId: string | null; isNew: boolean } {
  if (!slug || slug.length === 0) return { panel: null, sidebarView: 'list', contactId: null, isNew: false }
  if (slug[0] === 'settings') return { panel: 'settings', sidebarView: 'list', contactId: null, isNew: false }
  if (slug[0] === 'contacts') return { panel: null, sidebarView: 'list', contactId: null, isNew: false }
  if (slug[0] === 'insights') return { panel: 'insights', sidebarView: 'list', contactId: null, isNew: false }
  if (slug[0] === 'contact') {
    if (slug[1] === 'new') return { panel: 'edit', sidebarView: 'list', contactId: null, isNew: true }
    if (slug[2] === 'edit') return { panel: 'edit', sidebarView: 'list', contactId: slug[1], isNew: false }
    if (slug[1]) return { panel: null, sidebarView: 'detail', contactId: slug[1], isNew: false }
  }
  return { panel: null, sidebarView: 'list', contactId: null, isNew: false }
}

function stateToUrl(panel: ActivePanel, sidebarView: SidebarView, contactId?: string | null): string {
  if (panel === 'edit') return contactId ? `/contact/${contactId}/edit` : '/contact/new'
  if (panel === 'settings') return '/settings'
  if (panel === 'insights') return '/insights'
  if (sidebarView === 'detail' && contactId) return `/contact/${contactId}`
  return '/'
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
  const [initParsed] = useState(() => slugToState(slug))
  const initialState = useRef(initParsed)
  const pendingContactId = useRef<string | null>(initParsed.contactId)

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [activePanel, setActivePanel] = useState<ActivePanel>(initParsed.panel)
  const [sidebarView, setSidebarView] = useState<SidebarView>(initParsed.sidebarView)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; ts: number } | null>(null)

  useEffect(() => {
    const onPopState = () => {
      const s = slugToState(pathnameToSlug(window.location.pathname))
      setActivePanel(s.panel)
      setSidebarView(s.sidebarView)
      if (s.sidebarView === 'detail' && s.contactId) {
        const c = contacts.find((x) => x.id === s.contactId)
        if (c) {
          setSelectedContact(c)
          if (c.lat != null && c.lng != null) {
            setFlyTarget({ lat: c.lat, lng: c.lng, ts: Date.now() })
          }
        }
        if (isMobile) setMobileView('dashboard')
      } else if (s.sidebarView === 'list' && s.panel === null) {
        setSelectedContact(null)
        setEditingContact(null)
        if (isMobile) setMobileView('dashboard')
      }
      if (s.panel === 'edit' && s.contactId) {
        const c = contacts.find((x) => x.id === s.contactId)
        if (c) setEditingContact(c)
        if (isMobile) setMobileView('globe')
      } else if (s.panel === 'edit' && s.isNew) {
        setEditingContact(null)
        if (isMobile) setMobileView('globe')
      }
      if (s.panel === 'settings' || s.panel === 'insights') {
        if (isMobile) setMobileView('globe')
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [contacts, isMobile, setMobileView])

  const flyToContact = useCallback((c: Contact, fallback?: { lat: number; lng: number }) => {
    if (c.lat != null && c.lng != null) {
      setFlyTarget({ lat: c.lat, lng: c.lng, ts: Date.now() })
    } else if (fallback) {
      setFlyTarget({ lat: fallback.lat, lng: fallback.lng, ts: Date.now() })
    } else if (c.country) {
      const peer = contacts.find((o) => o.country === c.country && o.lat != null && o.lng != null && o.id !== c.id)
      if (peer) setFlyTarget({ lat: peer.lat!, lng: peer.lng!, ts: Date.now() })
    }
  }, [contacts])

  const handleContactClick = useCallback((contact: Contact) => {
    setSelectedContact(contact)
    setSidebarView('detail')
    setActivePanel(null)
    pushUrl(stateToUrl(null, 'detail', contact.id))
    if (isMobile) setMobileView('dashboard')
    flyToContact(contact)
  }, [isMobile, setMobileView, flyToContact])

  const handleBackToList = useCallback(() => {
    setSidebarView('list')
    setSelectedContact(null)
    pushUrl('/')
    if (isMobile) setMobileView('dashboard')
  }, [isMobile, setMobileView])

  const handleEditContact = useCallback((contact: Contact) => {
    setEditingContact(contact)
    setActivePanel('edit')
    pushUrl(stateToUrl('edit', 'list', contact.id))
    if (isMobile) setMobileView('globe')
  }, [isMobile, setMobileView])

  const [editPrefill, setEditPrefill] = useState<Record<string, string>>({})

  const handleAddContact = useCallback((prefill?: Record<string, string>) => {
    setEditingContact(null)
    setEditPrefill(prefill || {})
    setActivePanel('edit')
    pushUrl('/contact/new')
    if (isMobile) setMobileView('globe')
  }, [isMobile, setMobileView])

  const handleCancelEdit = useCallback(() => {
    setActivePanel(null)
    setEditingContact(null)
    if (selectedContact) {
      setSidebarView('detail')
      pushUrl(stateToUrl(null, 'detail', selectedContact.id))
    } else {
      pushUrl('/')
    }
    if (isMobile) setMobileView('dashboard')
  }, [selectedContact, isMobile, setMobileView])

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
    setSidebarView('detail')
    setActivePanel(null)
    setEditingContact(null)
    pushUrl(stateToUrl(null, 'detail', saved.id))
    if (isMobile) setMobileView('dashboard')
  }, [isMobile, setMobileView])

  const handleDeleteContact = useCallback((contactId: string, setContacts: React.Dispatch<React.SetStateAction<Contact[]>>, setConnections: React.Dispatch<React.SetStateAction<ContactConnection[]>>, setCountryConnections?: React.Dispatch<React.SetStateAction<ContactCountryConnection[]>>) => {
    setContacts((prev) => prev.filter((c) => c.id !== contactId))
    setConnections((prev) => prev.filter((c) => c.sourceContactId !== contactId && c.targetContactId !== contactId))
    setCountryConnections?.((prev) => prev.filter((c) => c.contactId !== contactId))
    setSelectedContact(null)
    setSidebarView('list')
    setActivePanel(null)
    pushUrl('/')
    if (isMobile) setMobileView('dashboard')
  }, [isMobile, setMobileView])

  const handleOpenSettings = useCallback(() => {
    setActivePanel('settings')
    pushUrl('/settings')
    if (isMobile) setMobileView('globe')
  }, [isMobile, setMobileView])

  const handleCloseSettings = useCallback(() => {
    setActivePanel(null)
    if (selectedContact && sidebarView === 'detail') {
      pushUrl(stateToUrl(null, 'detail', selectedContact.id))
    } else {
      pushUrl('/')
    }
    if (isMobile) setMobileView('dashboard')
  }, [selectedContact, sidebarView, isMobile, setMobileView])

  const handleOpenInsights = useCallback(() => {
    setActivePanel('insights')
    pushUrl('/insights')
    if (isMobile) setMobileView('globe')
  }, [isMobile, setMobileView])

  const handleCloseInsights = useCallback(() => {
    setActivePanel(null)
    if (selectedContact && sidebarView === 'detail') {
      pushUrl(stateToUrl(null, 'detail', selectedContact.id))
    } else {
      pushUrl('/')
    }
    if (isMobile) setMobileView('dashboard')
  }, [selectedContact, sidebarView, isMobile, setMobileView])

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
      setSidebarView('detail')
      setActivePanel(null)
      pushUrl(stateToUrl(null, 'detail', c.id))
      flyToContact(c)
    }
  }, [contacts, flyToContact])

  const resolveInitialContact = useCallback((data: Contact[]) => {
    if (pendingContactId.current) {
      const c = data.find((x) => x.id === pendingContactId.current)
      if (c) {
        if (initialState.current.sidebarView === 'detail') {
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
    sidebarView, setSidebarView,
    editingContact, setEditingContact,
    editPrefill,
    flyTarget, setFlyTarget,
    connectedContacts,
    resolveInitialContact,
    handleContactClick,
    handleBackToList,
    handleEditContact,
    handleAddContact,
    handleCancelEdit,
    handleContactSaved,
    handleDeleteContact,
    handleOpenSettings,
    handleCloseSettings,
    handleOpenInsights,
    handleCloseInsights,
    handleConnectedContactClick,
    flyToContact,
  }
}
