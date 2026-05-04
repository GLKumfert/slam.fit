'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import DateDragGrid from './DateDragGrid'
import TimeRangeSlider from './TimeRangeSlider'
import VisualShiftBuilder, { type ShiftDraft } from './VisualShiftBuilder'
import TimezoneSelector from './TimezoneSelector'

const DSE_COLORS = ['#177072','#B3CE3C','#21748E','#759F3F','#844E18','#9B846D','#115156','#2C763B']

const schema = z.object({
  title:         z.string().min(1, 'Title required').max(100),
  description:   z.string().max(500).optional(),
  granularity:   z.enum(['15', '30', '60']),
  timezone:      z.string(),
  isPublic:      z.boolean(),
  rolesRequired: z.boolean(),
})
type FormValues = z.infer<typeof schema>

interface RoleDraft { id: string; name: string; color: string }

interface SessionFormProps {
  onSuccess: (slug: string, hostToken: string) => void
}

export default function SessionForm({ onSuccess }: SessionFormProps) {
  const [roles, setRoles] = useState<RoleDraft[]>([])
  const [roleName, setRoleName] = useState('')
  const [roleColor, setRoleColor] = useState(DSE_COLORS[0])
  const [dates, setDates] = useState<Set<string>>(new Set())
  const [timeRange, setTimeRange] = useState<[number, number]>([9 * 60, 17 * 60]) // 9am-5pm default
  const [shifts, setShifts] = useState<ShiftDraft[]>([])
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      granularity: '15',
      timezone: typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
      isPublic: true,
      rolesRequired: false,
    },
  })

  function addRole() {
    if (!roleName.trim()) return
    setRoles(prev => [...prev, { id: crypto.randomUUID(), name: roleName.trim(), color: roleColor }])
    setRoleName('')
    setRoleColor(DSE_COLORS[(roles.length + 1) % DSE_COLORS.length])
  }

  function removeRole(id: string) {
    setRoles(prev => prev.filter(r => r.id !== id))
  }

  async function onSubmit(values: FormValues) {
    if (roles.length === 0) { toast.error('Add at least one role'); return }
    if (dates.size === 0) { toast.error('Select at least one date'); return }
    
    setLoading(true)
    try {
      const startH = Math.floor(timeRange[0] / 60)
      const startM = timeRange[0] % 60
      const endH = Math.floor(timeRange[1] / 60)
      const endM = timeRange[1] % 60

      const body = {
        title:         values.title,
        description:   values.description || undefined,
        dates:         Array.from(dates).sort(),
        timeRange:     { 
          start: `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`, 
          end: `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}` 
        },
        granularity:   parseInt(values.granularity) as 15 | 30 | 60,
        timezone:      values.timezone,
        isPublic:      values.isPublic,
        rolesRequired: values.rolesRequired,
        roles:         roles.map(r => ({ name: r.name, color: r.color })),
        shiftLabels:   shifts.length > 0
          ? shifts.map(s => ({ name: s.name, color: s.color, startTime: s.startTime, endTime: s.endTime }))
          : undefined,
      }
      const res  = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Failed to create session'); return }
      localStorage.setItem(`hostToken:${json.slug}`, json.hostToken)
      const shareUrl = `${window.location.origin}/${json.slug}`
      toast.success('Session created!', {
        duration: 8000,
        action: {
          label: 'Copy link',
          onClick: () => { navigator.clipboard.writeText(shareUrl); toast.success('Link copied!') },
        },
      })
      onSuccess(json.slug, json.hostToken)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">

      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-white mb-1">
          Session title <span className="text-red-500">*</span>
        </label>
        <input {...register('title')} placeholder="e.g. DSI NA #3"
          className="w-full rounded-lg border border-white/20 bg-white/5 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-dse-teal" />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-white mb-1">Description</label>
        <textarea {...register('description')} rows={2} placeholder="Optional details for your crew"
          className="w-full rounded-lg border border-white/20 bg-white/5 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-dse-teal resize-none" />
      </div>

      {/* Date Range Calendar */}
      <div>
        <label className="block text-sm font-semibold text-white mb-1">What dates might work? <span className="text-red-500">*</span></label>
        <p className="text-xs text-dse-beige-dark mb-3">Click and drag to select days.</p>
        <DateDragGrid dates={dates} onChange={setDates} />
      </div>

      {/* Time Range Slider */}
      <div>
        <label className="block text-sm font-semibold text-white mb-1">What times might work? <span className="text-red-500">*</span></label>
        <p className="text-xs text-dse-beige-dark mb-1">Drag the handles to set your daily time boundary.</p>
        <TimeRangeSlider value={timeRange} onChange={setTimeRange} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-white mb-1">Slot size</label>
          <select {...register('granularity')}
            className="w-full rounded-lg border border-white/20 bg-dse-navy-deep text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-dse-teal">
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">60 min</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-white mb-1">Timezone</label>
          <TimezoneSelector 
            value={watch('timezone')} 
            onChange={v => setValue('timezone', v)} 
            hideLabel 
            className="w-full"
          />
        </div>
      </div>

      {/* Roles */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Roles <span className="text-red-500">*</span>
          <span className="ml-1 font-normal text-dse-beige-dark text-xs">(min 1)</span>
        </label>
        <div className="flex gap-2 mb-2">
          <input value={roleName} onChange={e => setRoleName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRole())}
            placeholder="Role name (e.g. PBP)"
            className="flex-1 rounded-lg border border-white/20 bg-white/5 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-dse-teal" />
          <input type="color" value={roleColor} onChange={e => setRoleColor(e.target.value)}
            className="h-10 w-10 rounded-lg border border-white/20 bg-white/5 cursor-pointer p-0.5" />
          <button type="button" onClick={addRole}
            className="rounded-lg bg-dse-teal px-3 py-2 text-sm font-medium text-white hover:bg-dse-teal-dark transition">
            Add
          </button>
        </div>
        {roles.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {roles.map(r => (
              <li key={r.id} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                style={{ backgroundColor: r.color + '33', color: r.color, border: `1px solid ${r.color}66` }}>
                {r.name}
                <button type="button" onClick={() => removeRole(r.id)} className="opacity-60 hover:opacity-100">✕</button>
              </li>
            ))}
          </ul>
        )}
        <label className="mt-2 flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" {...register('rolesRequired')} className="accent-dse-teal" />
          Require participants to select a role
        </label>
      </div>

      {/* Shifts */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">Create Shifts (optional)</label>
        <p className="text-xs text-dse-beige-dark mb-4">
          Click and drag on the grid below to create named blocks (e.g. "Game 1"). Participants can click a shift tab to select the whole block in one tap.
        </p>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <VisualShiftBuilder
            dates={Array.from(dates).sort()}
            timeRange={timeRange}
            timezone={watch('timezone')}
            shifts={shifts}
            onChange={setShifts}
          />
        </div>
      </div>

      {/* Privacy */}
      <label className="flex items-center gap-2 text-sm text-white">
        <input type="checkbox" {...register('isPublic')} className="accent-dse-teal" />
        Public session (everyone sees participant names)
      </label>

      {/* Submit */}
      <button type="submit" disabled={loading}
        className="w-full rounded-xl bg-dse-teal py-3 text-base font-semibold text-white transition hover:bg-dse-teal-dark disabled:opacity-60">
        {loading ? 'Creating…' : 'Create session →'}
      </button>
    </form>
  )
}
