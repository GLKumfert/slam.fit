'use client'
import { useState, useRef, useMemo } from 'react'
import { generateTimeSlots } from '@/lib/utils/dates'
import { formatInTimeZone } from 'date-fns-tz'

export interface ShiftDraft {
  id: string
  name: string
  color: string
  startTime: string
  endTime: string
}

interface VisualShiftBuilderProps {
  dates: string[]
  timeRange: [number, number]
  timezone: string
  shifts: ShiftDraft[]
  onChange: (shifts: ShiftDraft[]) => void
}

const CELL_H = 24

export default function VisualShiftBuilder({ dates, timeRange, timezone, shifts, onChange }: VisualShiftBuilderProps) {
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set())
  const dragRef = useRef<{ toggling: boolean } | null>(null)
  
  const [popover, setPopover] = useState<{ x: number, y: number, slotIds: string[] } | null>(null)
  const [shiftName, setShiftName] = useState('')
  const [shiftColor, setShiftColor] = useState('#177072')

  const timeSlots = useMemo(() => {
    if (dates.length === 0) return []
    const startH = Math.floor(timeRange[0] / 60)
    const startM = timeRange[0] % 60
    const endH = Math.floor(timeRange[1] / 60)
    const endM = timeRange[1] % 60
    
    return generateTimeSlots({
      dates,
      timeRange: { start: `${startH}:${startM.toString().padStart(2, '0')}`, end: `${endH}:${endM.toString().padStart(2, '0')}` },
      granularity: 30, // Default for shift builder visual
      timezone
    }).map(s => ({
      id: s.startTime.toISOString(),
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
    }))
  }, [dates, timeRange, timezone])

  // Group by day
  const days = useMemo(() => {
    if (timeSlots.length === 0) return []
    const map = new Map<string, typeof timeSlots>()
    for (const slot of timeSlots) {
      const key = formatInTimeZone(new Date(slot.startTime), timezone, 'yyyy-MM-dd')
      const arr = map.get(key) ?? []
      arr.push(slot)
      map.set(key, arr)
    }
    return Array.from(map.entries())
  }, [timeSlots, timezone])

  if (timeSlots.length === 0) return <div className="text-sm text-dse-beige-dark pb-4">Select dates first to create shifts</div>

  function handleMouseDown(e: React.MouseEvent, slotId: string) {
    if (popover) setPopover(null) // dismiss popover
    const next = new Set(selectedSlotIds)
    const toggling = !next.has(slotId)
    toggling ? next.add(slotId) : next.delete(slotId)
    setSelectedSlotIds(next)
    dragRef.current = { toggling }
  }

  function handleMouseEnter(slotId: string) {
    if (!dragRef.current) return
    const next = new Set(selectedSlotIds)
    dragRef.current.toggling ? next.add(slotId) : next.delete(slotId)
    setSelectedSlotIds(next)
  }

  function handleMouseUp(e: React.MouseEvent) {
    dragRef.current = null
    if (selectedSlotIds.size > 0 && !popover) {
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      // Show popover slightly below the mouse release point
      setPopover({ x: e.clientX, y: e.clientY + 10, slotIds: Array.from(selectedSlotIds) })
    }
  }

  function saveShift() {
    if (!shiftName.trim() || !popover) return
    // Find absolute start and end of selected slots
    const selectedTimeSlots = timeSlots.filter(s => popover.slotIds.includes(s.id))
    selectedTimeSlots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    
    const draft: ShiftDraft = {
      id: crypto.randomUUID(),
      name: shiftName.trim(),
      color: shiftColor,
      startTime: selectedTimeSlots[0].startTime,
      endTime: selectedTimeSlots[selectedTimeSlots.length - 1].endTime,
    }
    onChange([...shifts, draft])
    setPopover(null)
    setSelectedSlotIds(new Set())
    setShiftName('')
  }

  const timeLabels = days[0]?.[1].map(slot => formatInTimeZone(new Date(slot.startTime), timezone, 'h:mm a')) ?? []

  return (
    <div className="relative">
      <div className="overflow-x-auto select-none pb-4" onMouseUp={handleMouseUp} onMouseLeave={() => { dragRef.current = null }}>
        <div className="flex min-w-max lg:justify-center w-full px-4">
          <div className="flex flex-col mr-2 shrink-0">
            <div style={{ height: 24 }} />
            {timeLabels.map((label, i) => (
              <div key={i} style={{ height: CELL_H }} className="flex items-center justify-end pr-2 text-[10px] font-medium text-dse-beige-dark whitespace-nowrap">
                {label}
              </div>
            ))}
          </div>

          {days.map(([dayKey, daySlots]) => {
            const dayLabel = formatInTimeZone(new Date(dayKey + 'T12:00:00'), timezone, 'EEE M/d')
            return (
              <div key={dayKey} className="flex flex-col mr-3">
                <div style={{ height: 24 }} className="flex items-center justify-center text-[11px] font-semibold text-dse-beige px-2 whitespace-nowrap">
                  {dayLabel}
                </div>
                <div className="flex">
                  {/* Fixed space for shift tabs so grid doesn't jut out */}
                  <div style={{ width: 20 }} className="shrink-0" />
                  <div className="flex flex-col">
                  {daySlots.map(slot => {
                    const isSelected = selectedSlotIds.has(slot.id)
                    // Check if part of existing shift
                    const shiftMatch = shifts.find(s => {
                      const st = new Date(s.startTime).getTime()
                      const et = new Date(s.endTime).getTime()
                      const slotSt = new Date(slot.startTime).getTime()
                      return slotSt >= st && slotSt < et
                    })
                    
                    let bg = 'bg-dse-beige/30'
                    let inlineStyle = {}
                    if (shiftMatch) {
                      bg = ''
                      inlineStyle = { backgroundColor: shiftMatch.color }
                    } else if (isSelected) {
                      bg = 'bg-dse-teal-dark'
                    }

                    return (
                      <div
                        key={slot.id}
                        style={{ height: CELL_H, width: 32, ...inlineStyle }}
                        className={`border border-white/60 cursor-pointer transition-colors ${bg} hover:opacity-80`}
                        onMouseDown={(e) => handleMouseDown(e, slot.id)}
                        onMouseEnter={() => handleMouseEnter(slot.id)}
                      />
                    )
                  })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {popover && (
        <div className="fixed z-50 rounded-xl bg-dse-navy-deep shadow-xl border border-white/20 p-4 w-64" style={{ left: Math.min(popover.x, window.innerWidth - 280), top: popover.y }}>
          <p className="text-xs font-semibold text-white mb-2">Create Shift</p>
          <div className="flex gap-2 mb-3">
            <input value={shiftName} onChange={e => setShiftName(e.target.value)} placeholder="Shift name" autoFocus className="flex-1 rounded border border-white/20 bg-white/5 text-white placeholder:text-white/40 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-dse-teal" />
            <input type="color" value={shiftColor} onChange={e => setShiftColor(e.target.value)} className="w-8 h-8 rounded border border-white/20 bg-white/5 cursor-pointer p-0" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveShift} className="flex-1 rounded bg-dse-teal hover:bg-dse-teal-dark transition-colors py-1.5 text-xs font-medium text-white">Save</button>
            <button onClick={() => { setPopover(null); setSelectedSlotIds(new Set()) }} className="flex-1 rounded border border-white/20 py-1.5 text-xs font-medium text-white/70 hover:text-white hover:border-white transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {shifts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {shifts.map(s => (
            <div key={s.id} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs" style={{ backgroundColor: s.color + '33', border: `1px solid ${s.color}` }}>
              <span>{s.name}</span>
              <button onClick={() => onChange(shifts.filter(x => x.id !== s.id))} className="ml-1 opacity-60 hover:opacity-100 text-red-500">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
