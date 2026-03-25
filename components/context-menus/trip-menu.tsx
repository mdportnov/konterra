'use client'

import { Pencil, Trash2, Copy, Plus, MapPin, Calendar, ArrowLeftRight, Files, ClipboardList } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu'
import { toast } from 'sonner'
import { toDateStr, copyToClipboard } from '@/lib/utils'
import type { Trip } from '@/lib/db/schema'

function formatDateRange(trip: Trip): string {
  const fmt = (d: Date | string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const arr = fmt(trip.arrivalDate)
  const dep = fmt(trip.departureDate)
  return dep ? `${arr} – ${dep}` : arr
}

interface TripContextMenuProps {
  trip: Trip
  children: React.ReactNode
  onEdit?: (trip: Trip) => void
  onDelete?: (trip: Trip) => void
  onAddTrip?: (prefill?: { arrivalDate?: string; departureDate?: string; city?: string; country?: string }) => void
  onTripClick?: (trip: Trip) => void
  compareMode?: boolean
  onToggleCompareTrip?: (id: string) => void
  disabled?: boolean
}

export default function TripContextMenu({
  trip,
  children,
  onEdit,
  onDelete,
  onAddTrip,
  onTripClick,
  compareMode,
  onToggleCompareTrip,
  disabled,
}: TripContextMenuProps) {
  if (disabled) return <>{children}</>

  const copyLocation = async () => {
    const ok = await copyToClipboard(`${trip.city}, ${trip.country}`)
    toast[ok ? 'success' : 'error'](ok ? 'Location copied' : 'Copy failed')
  }

  const copyDates = async () => {
    const ok = await copyToClipboard(formatDateRange(trip))
    toast[ok ? 'success' : 'error'](ok ? 'Dates copied' : 'Copy failed')
  }

  const copyFullInfo = async () => {
    const parts = [`${trip.city}, ${trip.country}`, formatDateRange(trip)]
    if (trip.durationDays != null) parts.push(`${trip.durationDays}d`)
    const ok = await copyToClipboard(parts.join(' · '))
    toast[ok ? 'success' : 'error'](ok ? 'Info copied' : 'Copy failed')
  }

  const handleAddNext = () => {
    if (!onAddTrip) return
    const depStr = toDateStr(trip.departureDate || trip.arrivalDate)
    const nextDay = new Date(depStr + 'T00:00:00')
    nextDay.setDate(nextDay.getDate() + 1)
    onAddTrip({ arrivalDate: toDateStr(nextDay) })
  }

  const handleDuplicate = () => {
    if (!onAddTrip) return
    onAddTrip({ city: trip.city, country: trip.country })
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {onTripClick && (
          <ContextMenuItem onClick={() => onTripClick(trip)}>
            <MapPin className="h-3.5 w-3.5" />
            Show on globe
          </ContextMenuItem>
        )}
        {onEdit && (
          <ContextMenuItem onClick={() => onEdit(trip)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit trip
          </ContextMenuItem>
        )}
        {onAddTrip && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleAddNext}>
              <Plus className="h-3.5 w-3.5" />
              Add next trip
            </ContextMenuItem>
            <ContextMenuItem onClick={handleDuplicate}>
              <Files className="h-3.5 w-3.5" />
              Duplicate trip
            </ContextMenuItem>
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Copy className="h-3.5 w-3.5" />
            Copy
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuItem onClick={copyLocation}>
              <MapPin className="h-3.5 w-3.5" />
              Location
            </ContextMenuItem>
            <ContextMenuItem onClick={copyDates}>
              <Calendar className="h-3.5 w-3.5" />
              Dates
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={copyFullInfo}>
              <ClipboardList className="h-3.5 w-3.5" />
              Full info
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        {compareMode && onToggleCompareTrip && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onToggleCompareTrip(trip.id)}>
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Toggle compare
            </ContextMenuItem>
          </>
        )}
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => onDelete(trip)}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete trip
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
