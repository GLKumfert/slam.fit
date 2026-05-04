'use client'
import { useMemo } from 'react'
import { getTimeZones } from '@vvo/tzdb'

interface TimezoneSelectorProps {
  value: string
  hostTimezone?: string // Make optional so SessionForm can omit it during creation
  onChange: (tz: string) => void
  hideLabel?: boolean
  className?: string
}

const CURATED_ZONES = [
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Halifax",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Helsinki",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland"
]

export default function TimezoneSelector({ value, hostTimezone, onChange, hideLabel, className }: TimezoneSelectorProps) {
  const zones = useMemo(() => {
    const includeSet = new Set([...CURATED_ZONES, value, hostTimezone].filter(Boolean) as string[])
    return getTimeZones({ includeUtc: true })
      .filter(tz => includeSet.has(tz.name))
      .sort((a, b) => a.currentTimeOffsetInMinutes - b.currentTimeOffsetInMinutes)
  }, [value, hostTimezone])

  return (
    <div className={`flex items-center gap-1.5 ${className || ''}`}>
      {!hideLabel && <span className="text-xs text-dse-beige-dark shrink-0">Timezone:</span>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full max-w-[280px] truncate rounded-lg border border-white/20 bg-dse-navy-deep text-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-dse-teal"
      >
        {zones.map(tz => {
          const base = tz.currentTimeFormat.split(' - ')[0]
          const city = tz.mainCities?.[0]
          const label = city ? `${base} (${city})` : base
          const isHost = hostTimezone && tz.name === hostTimezone
          
          return (
            <option key={tz.name} value={tz.name}>
              {isHost ? `Host TZ: ${label}` : label}
            </option>
          )
        })}
      </select>
    </div>
  )
}
