'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import type { ParticipantShape } from '@/app/[slug]/types'

interface HostPanelProps {
  sessionSlug: string
  isClosed: boolean
  participants: ParticipantShape[]
  onSessionClosed: () => void
  onParticipantDeleted: (id: string) => void
}

export default function HostPanel({ sessionSlug, isClosed, participants, onSessionClosed, onParticipantDeleted }: HostPanelProps) {
  const [closing, setClosing] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const hostToken = typeof window !== 'undefined' ? localStorage.getItem(`hostToken:${sessionSlug}`) ?? '' : ''
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${sessionSlug}` : ''
  const hostUrl = `${shareUrl}?host=${hostToken}`

  async function closeSession() {
    setClosing(true)
    const res = await fetch(`/api/sessions/${sessionSlug}/close`, {
      method: 'PATCH',
      headers: { 'x-host-token': hostToken },
    })
    setClosing(false)
    setConfirmClose(false)
    if (res.ok) { toast.success('Session closed'); onSessionClosed() }
    else toast.error('Failed to close session')
  }

  async function deleteParticipant(id: string, name: string) {
    setDeletingId(id)
    const res = await fetch(`/api/sessions/${sessionSlug}/participants/${id}`, {
      method: 'DELETE',
      headers: { 'x-host-token': hostToken },
    })
    setDeletingId(null)
    setConfirmDeleteId(null)
    if (res.ok) { toast.success(`Removed ${name}`); onParticipantDeleted(id) }
    else toast.error('Failed to remove participant')
  }

  function copyLink(url: string, label: string) {
    navigator.clipboard.writeText(url)
    toast.success(`${label} copied`)
  }

  return (
    <div className="rounded-xl border border-dse-teal/30 bg-dse-teal/5 p-4 space-y-4">
      <h2 className="font-display font-extrabold text-sm text-dse-teal tracking-wide">Host</h2>

      <div className="space-y-2">
        <button
          onClick={() => copyLink(shareUrl, 'Share link')}
          className="w-full rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition text-left"
        >
          Copy share link
        </button>
        <button
          onClick={() => copyLink(hostUrl, 'Host link')}
          className="w-full rounded-lg border border-dse-teal/30 px-3 py-2 text-xs font-medium text-dse-teal/80 hover:bg-dse-teal/10 hover:text-dse-teal transition text-left"
        >
          Copy host link
        </button>
      </div>

      {participants.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider font-bold text-white/40 mb-2">Participants</p>
          {participants.map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-white/5 transition group">
              <span className="text-xs text-white/80">{p.name}</span>
              {confirmDeleteId === p.id ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => deleteParticipant(p.id, p.name)}
                    disabled={deletingId === p.id}
                    className="text-[10px] font-semibold text-red-400 hover:text-red-300 transition disabled:opacity-50"
                  >
                    {deletingId === p.id ? 'Removing…' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-[10px] text-white/40 hover:text-white/70 transition ml-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(p.id)}
                  className="text-[10px] text-white/30 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!isClosed && (
        confirmClose ? (
          <div className="flex gap-2">
            <button
              onClick={closeSession}
              disabled={closing}
              className="flex-1 rounded-lg bg-red-500/20 border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition disabled:opacity-60"
            >
              {closing ? 'Closing…' : 'Confirm close'}
            </button>
            <button
              onClick={() => setConfirmClose(false)}
              className="rounded-lg border border-white/20 px-3 py-2 text-xs text-white/50 hover:text-white/80 transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClose(true)}
            className="w-full rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white/50 hover:text-white/80 hover:border-white/40 transition"
          >
            Close session
          </button>
        )
      )}
    </div>
  )
}
