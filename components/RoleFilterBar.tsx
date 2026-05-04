import type { RoleShape } from '@/app/[slug]/types'

interface RoleFilterBarProps {
  roles: RoleShape[]
  selectedRoleIds: string[]
  onChange: (ids: string[]) => void
}

export default function RoleFilterBar({ roles, selectedRoleIds, onChange }: RoleFilterBarProps) {
  if (roles.length === 0) return null

  function toggle(id: string) {
    onChange(
      selectedRoleIds.includes(id)
        ? selectedRoleIds.filter(r => r !== id)
        : [...selectedRoleIds, id]
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-dse-beige-dark">Filter:</span>
      <button
        onClick={() => onChange([])}
        className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
          selectedRoleIds.length === 0
            ? 'bg-white text-dse-navy border-white'
            : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white'
        }`}
      >
        All
      </button>
      {roles.map(role => {
        const active = selectedRoleIds.includes(role.id)
        return (
          <button
            key={role.id}
            onClick={() => toggle(role.id)}
            className="rounded-full px-3 py-1 text-xs font-semibold border transition"
            style={{
              backgroundColor: active ? role.color : 'transparent',
              borderColor: role.color,
              color: active ? 'white' : role.color,
            }}
          >
            {role.name}
          </button>
        )
      })}
    </div>
  )
}
