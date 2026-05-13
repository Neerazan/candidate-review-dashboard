interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClassMap: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-lg',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({ name, size = 'md' }: AvatarProps) {
  return (
    <div className={`flex items-center justify-center rounded-full bg-ng-blue-light font-bold text-ng-blue ${sizeClassMap[size]}`}>
      {getInitials(name || 'User')}
    </div>
  )
}
