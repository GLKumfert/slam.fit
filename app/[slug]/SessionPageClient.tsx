'use client'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import JoinForm from '@/components/JoinForm'
import RoleFilterBar from '@/components/RoleFilterBar'
import TimezoneSelector from '@/components/TimezoneSelector'
import AvailabilityGrid from '@/components/AvailabilityGrid'
import ParticipantSidebar from '@/components/ParticipantSidebar'
import HostPanel from '@/components/HostPanel'
import Footer from '@/components/Footer'
import { SessionRealtimeProvider } from '@/lib/realtime/SessionRealtimeProvider'
import type { SessionPageData } from './types'

export default function SessionPageClient({ data }: { data: SessionPageData }) {
  const { session, timeSlots, shiftLabels, roles, participants } = data

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [localParticipants, setLocalParticipants] = useState(participants)

  // ---------- URL-synced role filter ----------
  const rolesParam = searchParams.get('roles') ?? ''
  const selectedRoleIds = useMemo(
    () => rolesParam ? rolesParam.split(',').filter(Boolean) : [],
    [rolesParam]
  )

  // ---------- URL-synced timezone ----------
  const tzParam = searchParams.get('tz')
  const [timezone, setTimezone] = useState<string>(() => tzParam ?? 'UTC')
  useEffect(() => {
    if (!tzParam) setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tzParam && tzParam !== timezone) setTimezone(tzParam)
  }, [tzParam]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Grid input selection ----------
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set())

  // ---------- Participant filtering ----------
  const [selectedParticipantFilter, setSelectedParticipantFilter] = useState<Set<string> | null>(null)

  const [viewMode, setViewMode] = useState<'input' | 'heatmap'>('input')
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false)

  // ---------- Heatmap Filtering ----------
  const [heatmapSelectedSlotIds, setHeatmapSelectedSlotIds] = useState<Set<string>>(new Set())
  const [heatmapFilterMode, setHeatmapFilterMode] = useState<'all' | 'any'>('all')

  // ---------- Identity state from localStorage ----------
  const [hasJoined, setHasJoined] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [mounted, setMounted] = useState(false)

  const activeParticipantsForGrid = useMemo(() => {
    let pList = localParticipants
    if (selectedParticipantFilter !== null) {
      pList = pList.filter(p => selectedParticipantFilter.has(p.id))
    }
    if (viewMode === 'heatmap' && heatmapSelectedSlotIds.size > 0) {
      pList = pList.filter(p => {
        const selected = Array.from(heatmapSelectedSlotIds)
        if (heatmapFilterMode === 'all') {
          return selected.every(id => p.availableSlotIds.includes(id))
        } else {
          return selected.some(id => p.availableSlotIds.includes(id))
        }
      })
    }
    return pList
  }, [localParticipants, selectedParticipantFilter, viewMode, heatmapSelectedSlotIds, heatmapFilterMode])

  useEffect(() => {
    setMounted(true)
    const participantToken = localStorage.getItem(`participantToken:${session.slug}`)
    if (participantToken) {
      setHasJoined(true)
      setViewMode('heatmap')
    }

    // Host token: from URL param first, then localStorage
    const urlHostToken = searchParams.get('host')
    const storedHostToken = localStorage.getItem(`hostToken:${session.slug}`)
    if (urlHostToken) {
      localStorage.setItem(`hostToken:${session.slug}`, urlHostToken)
      setIsHost(true)
      // Clean the token from the URL after saving it
      const params = new URLSearchParams(searchParams.toString())
      params.delete('host')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    } else if (storedHostToken) {
      setIsHost(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveGridMode = session.isClosed ? 'heatmap' : viewMode

  function handleViewModeToggle(mode: 'input' | 'heatmap') {
    if (mode === 'input' && hasJoined && !hasLoadedDraft) {
      const myToken = localStorage.getItem(`participantId:${session.slug}`)
      const myParticipant = localParticipants.find(p => p.id === myToken)
      if (myParticipant) setSelectedSlotIds(new Set(myParticipant.availableSlotIds))
      setHasLoadedDraft(true)
    }
    setViewMode(mode)
  }

  // ---------- URL param helpers ----------
  function buildUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      v === null || v === '' ? params.delete(k) : params.set(k, v)
    }
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  function handleRolesChange(ids: string[]) {
    router.replace(buildUrl({ roles: ids.length > 0 ? ids.join(',') : null }), { scroll: false })
  }

  function handleTimezoneChange(tz: string) {
    setTimezone(tz)
    router.replace(buildUrl({ tz }), { scroll: false })
  }

  async function handleJoinSuccess(_participantId: string, _token: string) {
    await refreshParticipants()
    setHasJoined(true)
    setViewMode('heatmap')
  }

  async function refreshParticipants() {
    try {
      const res = await fetch(`/api/sessions/${session.slug}`)
      if (!res.ok) return
      const fetchedData = await res.json()
      setLocalParticipants(fetchedData.participants)
    } catch { /* ignore */ }
  }

  if (!mounted) return null // avoid hydration flicker

  return (
    <SessionRealtimeProvider sessionId={session.id} onUpdate={refreshParticipants}>
      <div className="min-h-screen flex flex-col">
        {session.isClosed && (
          <div role="status" className="border-b border-dse-teal/30 bg-dse-teal/10 px-4 py-2.5 text-center text-sm font-medium text-dse-beige">
            This session is no longer accepting responses.
          </div>
        )}

        <header className="border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-3">
            <a href="/" className="font-display font-extrabold text-lg text-dse-beige hover:text-white transition">slam.fit</a>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-extrabold text-white">{session.title}</h1>
            <p className="mt-1.5 text-sm text-dse-beige-dark">{session.description}</p>
          </div>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            {/* Main column */}
            <div className="min-w-0 flex-1">
              
              {/* Controls area */}
              <div className="flex flex-col gap-4 mb-4">
                {/* Top row: View mode & Timezone */}
                <div className="flex items-center justify-between gap-4">
                  {!session.isClosed ? (
                    <div className="flex shrink-0 gap-1 bg-black/20 p-1 rounded-xl border border-white/10">
                      <button
                        onClick={() => handleViewModeToggle('input')}
                        className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-colors ${
                          viewMode === 'input' 
                            ? 'bg-dse-teal text-white shadow-sm' 
                            : 'text-white/50 hover:text-white'
                        }`}
                      >
                        Your availability
                      </button>
                      <button
                        onClick={() => handleViewModeToggle('heatmap')}
                        className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-colors ${
                          viewMode === 'heatmap' 
                            ? 'bg-dse-teal text-white shadow-sm' 
                            : 'text-white/50 hover:text-white'
                        }`}
                      >
                        Group availability
                      </button>
                    </div>
                  ) : <div />}
                  <TimezoneSelector value={timezone} hostTimezone={session.timezone} onChange={handleTimezoneChange} />
                </div>

                {/* Bottom row: Filters (only in heatmap mode) */}
                {viewMode === 'heatmap' && (
                  <div className="flex flex-wrap items-center gap-4">
                    <div className={`flex shrink-0 items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/10 transition-opacity duration-200 ${
                      heatmapSelectedSlotIds.size > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}>
                      <button
                        onClick={() => setHeatmapFilterMode('all')}
                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                          heatmapFilterMode === 'all' ? 'bg-white text-dse-navy' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setHeatmapFilterMode('any')}
                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                          heatmapFilterMode === 'any' ? 'bg-white text-dse-navy' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        Any
                      </button>
                      <div className="w-px h-4 bg-white/20 mx-1" />
                      <button
                        onClick={() => setHeatmapSelectedSlotIds(new Set())}
                        className="px-2 py-1 text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                        aria-label="Clear selection"
                      >
                        ✕
                      </button>
                    </div>
                    <RoleFilterBar roles={roles} selectedRoleIds={selectedRoleIds} onChange={handleRolesChange} />
                  </div>
                )}
              </div>

              {/* Join / Edit form */}
              {!session.isClosed && viewMode === 'input' && (
                <div className="mb-6 rounded-xl border border-dse-teal/30 bg-dse-teal/5 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-display font-extrabold text-base text-dse-teal">{hasJoined ? 'Edit your details' : 'Join this session'}</h2>
                  </div>
                  <p className="text-xs text-dse-beige-dark mb-4">
                    Click cells in the grid below to mark your available times, then enter your name and hit Save.
                  </p>
                  <JoinForm
                    sessionSlug={session.slug}
                    roles={roles}
                    rolesRequired={session.rolesRequired}
                    selectedSlotIds={selectedSlotIds}
                    onSuccess={handleJoinSuccess}
                    participantToken={hasJoined ? localStorage.getItem(`participantToken:${session.slug}`) || undefined : undefined}
                    initialName={hasJoined ? localParticipants.find(p => p.id === localStorage.getItem(`participantId:${session.slug}`))?.name : undefined}
                    initialRoleIds={hasJoined ? localParticipants.find(p => p.id === localStorage.getItem(`participantId:${session.slug}`))?.roles.map(r => r.id) : undefined}
                  />
                </div>
              )}

              {/* Grid */}
              <AvailabilityGrid
                timeSlots={timeSlots}
                shiftLabels={shiftLabels}
                mode={effectiveGridMode}
                selectedSlotIds={effectiveGridMode === 'input' ? selectedSlotIds : heatmapSelectedSlotIds}
                onSelectionChange={effectiveGridMode === 'input' ? setSelectedSlotIds : setHeatmapSelectedSlotIds}
                timezone={timezone}
                sessionTimezone={session.timezone}
                participants={activeParticipantsForGrid}
                selectedRoleIds={selectedRoleIds}
                isPublic={session.isPublic}
              />
            </div>

            {/* Sidebar */}
            <aside className="w-full shrink-0 lg:w-72">
              {isHost && (
                <div className="mb-4">
                  <HostPanel
                    sessionSlug={session.slug}
                    isClosed={session.isClosed}
                    participants={localParticipants}
                    onSessionClosed={() => window.location.reload()}
                    onParticipantDeleted={id => setLocalParticipants(prev => prev.filter(p => p.id !== id))}
                  />
                </div>
              )}
              <div className="rounded-xl border border-white/10 bg-white/5 shadow-sm overflow-hidden">
                <ParticipantSidebar
                  participants={localParticipants}
                  matchingParticipants={activeParticipantsForGrid}
                  totalSlotCount={timeSlots.length}
                  selectedRoleIds={selectedRoleIds}
                  isPublic={session.isPublic}
                  selectedParticipantIds={selectedParticipantFilter}
                  onParticipantSelectionChange={setSelectedParticipantFilter}
                />
              </div>
            </aside>
          </div>
        </main>
        <Footer />
      </div>
    </SessionRealtimeProvider>
  )
}
