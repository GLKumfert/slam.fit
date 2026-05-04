'use client'
import { useState, useRef, useMemo } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isBefore, startOfDay } from 'date-fns'

interface DateDragGridProps {
  dates: Set<string>
  onChange: (dates: Set<string>) => void
}

export default function DateDragGrid({ dates, onChange }: DateDragGridProps) {
  const [mode, setMode] = useState<'specific' | 'days'>('specific')
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  
  const dragRef = useRef<{ toggling: boolean } | null>(null)

  const daysInMonth = useMemo(() => eachDayOfInterval({ start: currentMonth, end: endOfMonth(currentMonth) }), [currentMonth])
  const startDayOfWeek = getDay(currentMonth)
  const paddingDays = Array(startDayOfWeek).fill(null)

  const today = startOfDay(new Date())

  function handleMouseDown(dateStr: string) {
    const next = new Set(dates)
    const toggling = !next.has(dateStr)
    toggling ? next.add(dateStr) : next.delete(dateStr)
    onChange(next)
    dragRef.current = { toggling }
  }

  function handleMouseEnter(dateStr: string) {
    if (!dragRef.current) return
    const next = new Set(dates)
    dragRef.current.toggling ? next.add(dateStr) : next.delete(dateStr)
    onChange(next)
  }

  function handleMouseUp() {
    dragRef.current = null
  }

  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const [selectedDow, setSelectedDow] = useState<Set<number>>(new Set())

  function toggleDow(dayIndex: number) {
    const next = new Set(selectedDow)
    next.has(dayIndex) ? next.delete(dayIndex) : next.add(dayIndex)
    setSelectedDow(next)
    
    // Generate dates for the next 4 weeks for these days
    const nextDates = new Set<string>()
    let current = today
    for (let i = 0; i < 28; i++) {
      if (next.has(getDay(current))) {
        nextDates.add(format(current, 'yyyy-MM-dd'))
      }
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000)
    }
    onChange(nextDates)
  }

  return (
    <div className="w-full space-y-4 select-none" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="flex rounded-lg border border-white/20 overflow-hidden bg-white/5 p-1 gap-1">
        <button type="button" onClick={() => setMode('specific')} className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${mode === 'specific' ? 'bg-dse-teal text-white' : 'hover:bg-white/10 text-white'}`}>Specific dates</button>
        <button type="button" onClick={() => setMode('days')} className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${mode === 'days' ? 'bg-dse-teal text-white' : 'hover:bg-white/10 text-white'}`}>Days of the week</button>
      </div>

      {mode === 'specific' ? (
        <div className="rounded-lg border border-white/20 p-4 bg-dse-navy-deep">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 rounded hover:bg-white/10 text-white">◀</button>
            <span className="font-semibold text-white">{format(currentMonth, 'MMMM yyyy')}</span>
            <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 rounded hover:bg-white/10 text-white">▶</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {DOW.map(d => <div key={d} className="text-xs font-medium text-dse-beige-dark">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
            {daysInMonth.map(date => {
              const dateStr = format(date, 'yyyy-MM-dd')
              const selected = dates.has(dateStr)
              const past = isBefore(date, today)
              return (
                <button
                  type="button"
                  key={dateStr}
                  disabled={past}
                  onMouseDown={() => handleMouseDown(dateStr)}
                  onMouseEnter={() => handleMouseEnter(dateStr)}
                  className={`aspect-square rounded-md flex items-center justify-center text-sm transition-colors ${past ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} ${selected ? 'bg-dse-teal text-white font-bold' : 'bg-white/5 hover:bg-white/15 text-white'}`}
                >
                  {format(date, 'd')}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {DOW.map((d, i) => (
            <button
              type="button"
              key={d}
              onClick={() => toggleDow(i)}
              className={`py-3 rounded-lg border text-sm font-medium transition ${selectedDow.has(i) ? 'bg-dse-teal border-dse-teal text-white' : 'bg-white/5 border-white/20 text-white hover:border-dse-teal'}`}
            >
              {d}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
