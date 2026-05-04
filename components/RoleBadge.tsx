interface RoleBadgeProps {
  name: string
  color: string
  size?: 'sm' | 'md'
}

export default function RoleBadge({ name, color, size = 'sm' }: RoleBadgeProps) {
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${padding}`}
      style={{ backgroundColor: color + '33', color, border: `1px solid ${color}66` }}
    >
      {name}
    </span>
  )
}
