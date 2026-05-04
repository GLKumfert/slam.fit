'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import RoleBadge from './RoleBadge'
import type { RoleShape } from '@/app/[slug]/types'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50),
})
type FormValues = z.infer<typeof schema>

interface JoinFormProps {
  sessionSlug: string
  roles: RoleShape[]
  rolesRequired: boolean
  selectedSlotIds: Set<string>
  onSuccess: (participantId: string, token: string) => void
  participantToken?: string
  initialName?: string
  initialRoleIds?: string[]
}

export default function JoinForm({ sessionSlug, roles, rolesRequired, selectedSlotIds, onSuccess, participantToken, initialName, initialRoleIds }: JoinFormProps) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set(initialRoleIds || []))
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initialName || '' },
  })

  function toggleRole(id: string) {
    setSelectedRoleIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function onSubmit(values: FormValues) {
    if (rolesRequired && selectedRoleIds.size === 0) {
      toast.error('Please select at least one role')
      return
    }
    if (selectedSlotIds.size === 0) {
      toast.error('Please select at least one time slot in the grid')
      return
    }
    setLoading(true)
    try {
      const isEdit = !!participantToken
      const url = isEdit ? `/api/sessions/${sessionSlug}/participant` : `/api/sessions/${sessionSlug}/join`
      const method = isEdit ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantToken, // Ignored on POST
          name: values.name,
          roleIds: Array.from(selectedRoleIds),
          availableSlotIds: Array.from(selectedSlotIds),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to save')
        return
      }
      if (!isEdit) {
        localStorage.setItem(`participantToken:${sessionSlug}`, json.token)
        localStorage.setItem(`participantId:${sessionSlug}`, json.participantId)
        toast.success('Availability saved!')
        onSuccess(json.participantId, json.token)
      } else {
        toast.success('Availability updated!')
        onSuccess('', participantToken) // Signals success for edit mode
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-white mb-1">Your name</label>
        <input
          {...register('name')}
          placeholder="e.g. Jordan"
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-dse-teal"
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      {roles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Your role{rolesRequired ? ' (required)' : ' (optional)'}
          </label>
          <div className="flex flex-wrap gap-2">
            {roles.map(role => (
              <button
                key={role.id}
                type="button"
                onClick={() => toggleRole(role.id)}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                  selectedRoleIds.has(role.id) ? 'opacity-100 ring-2 ring-offset-1' : 'opacity-60'
                }`}
                style={{
                  backgroundColor: selectedRoleIds.has(role.id) ? role.color + '33' : 'transparent',
                  borderColor: role.color,
                  color: role.color,
                  '--tw-ring-color': role.color,
                } as React.CSSProperties}
              >
                {role.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-dse-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-dse-teal-dark disabled:opacity-60"
      >
        {loading ? 'Saving…' : 'Save availability'}
      </button>
    </form>
  )
}
