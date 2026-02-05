interface AvatarProps {
  name: string
  email?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  role?: 'admin' | 'client'
  src?: string
  className?: string
}

export function Avatar({
  name,
  email,
  size = 'md',
  role,
  src,
  className = '',
}: AvatarProps) {
  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const initials = getInitials(name)

  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl',
  }

  // Role-based colors
  const roleColors = {
    admin: 'bg-brand-navy text-white',
    client: 'bg-brand-slate text-white',
    default: 'bg-brand-primary text-white',
  }

  const colorClass = role ? roleColors[role] : roleColors.default

  if (src) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${className}`}
      title={email || name}
    >
      {initials}
    </div>
  )
}

interface AvatarGroupProps {
  users: Array<{
    name: string
    email?: string
    role?: 'admin' | 'client'
    src?: string
  }>
  max?: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function AvatarGroup({ users, max = 3, size = 'md', className = '' }: AvatarGroupProps) {
  const visibleUsers = users.slice(0, max)
  const remaining = users.length - max

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {visibleUsers.map((user, index) => (
        <Avatar
          key={index}
          name={user.name}
          email={user.email}
          role={user.role}
          src={user.src}
          size={size}
          className="ring-2 ring-background-DEFAULT"
        />
      ))}
      {remaining > 0 && (
        <div
          className={`${
            size === 'xs'
              ? 'w-6 h-6 text-xs'
              : size === 'sm'
              ? 'w-8 h-8 text-sm'
              : size === 'md'
              ? 'w-10 h-10 text-base'
              : size === 'lg'
              ? 'w-12 h-12 text-lg'
              : 'w-16 h-16 text-2xl'
          } bg-neutral-gray-200 text-text-secondary rounded-full flex items-center justify-center font-semibold ring-2 ring-background-DEFAULT flex-shrink-0`}
          title={`+${remaining} more`}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}
