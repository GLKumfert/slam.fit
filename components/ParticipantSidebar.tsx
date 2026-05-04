import RoleBadge from './RoleBadge'
import type { ParticipantShape } from '@/app/[slug]/types'

interface ParticipantSidebarProps {
  participants: ParticipantShape[]
  matchingParticipants?: ParticipantShape[]
  totalSlotCount: number
  selectedRoleIds: string[]
  isPublic: boolean
  selectedParticipantIds: Set<string> | null
  onParticipantSelectionChange: (ids: Set<string> | null) => void
}

export default function ParticipantSidebar({ 
  participants, 
  matchingParticipants,
  totalSlotCount, 
  selectedRoleIds, 
  isPublic,
  selectedParticipantIds,
  onParticipantSelectionChange
}: ParticipantSidebarProps) {
  const filtered = selectedRoleIds.length === 0
    ? participants
    : participants.filter(p => p.roles.some(r => selectedRoleIds.includes(r.id)))

  // Sort: matching participants first, then alphabetically
  filtered.sort((a, b) => {
    if (matchingParticipants) {
      const aMatch = matchingParticipants.some(mp => mp.id === a.id)
      const bMatch = matchingParticipants.some(mp => mp.id === b.id)
      if (aMatch && !bMatch) return -1
      if (!aMatch && bMatch) return 1
    }
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="flex flex-col h-full max-h-[800px]">
      <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <h2 className="font-display font-extrabold text-sm text-white">
          Participants <span className="font-normal text-white/60 ml-1">({filtered.length})</span>
        </h2>
        {filtered.length > 0 && (
          <div className="flex gap-2 text-[10px] uppercase font-bold tracking-wider text-white/50">
            <button onClick={() => onParticipantSelectionChange(null)} className="hover:text-dse-teal transition">All</button>
            <button onClick={() => onParticipantSelectionChange(new Set())} className="hover:text-dse-teal transition">None</button>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-white/50">No participants yet.</p>
        ) : (
          <ul className="divide-y divide-white/10 max-h-[500px] overflow-y-auto">
            {filtered.map(p => {
              const isMatching = matchingParticipants ? matchingParticipants.some(mp => mp.id === p.id) : true
              return (
                <li key={p.id} className={`px-4 py-3 hover:bg-white/5 transition-all ${isMatching ? '' : 'opacity-20 grayscale'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          if (selectedParticipantIds === null) {
                            const newSet = new Set(filtered.map(x => x.id))
                            newSet.delete(p.id)
                            onParticipantSelectionChange(newSet)
                          } else {
                            const newSet = new Set(selectedParticipantIds)
                            if (newSet.has(p.id)) newSet.delete(p.id)
                            else newSet.add(p.id)
                            onParticipantSelectionChange(newSet)
                          }
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                          (selectedParticipantIds === null || selectedParticipantIds.has(p.id))
                            ? 'bg-white border-white text-dse-navy'
                            : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white'
                        }`}
                      >
                        {isPublic ? p.name : 'Hidden Participant'}
                      </button>
                      {p.roles.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.roles.map(r => <RoleBadge key={r.id} name={r.name} color={r.color} />)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-white/50 shrink-0 ml-2">{p.availableSlotIds.length}/{totalSlotCount}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
