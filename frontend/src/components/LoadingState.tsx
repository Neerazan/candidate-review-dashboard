type LoadingVariant = 'inline' | 'list' | 'detail'

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-ng-line/70 ${className}`} />
}

export function LoadingState({
  label = 'Loading...',
  variant = 'inline',
}: {
  label?: string
  variant?: LoadingVariant
}) {
  if (variant === 'list') {
    return (
      <div className="space-y-4">
        <div className="card p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="rounded-xl border border-ng-line bg-ng-white p-4">
                <SkeletonBlock className="mb-3 h-4 w-20" />
                <SkeletonBlock className="h-8 w-14" />
                <SkeletonBlock className="mt-2 h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <SkeletonBlock className="mb-3 h-10 w-full" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <SkeletonBlock className="h-10 w-full xl:col-span-2" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
        </div>
        <div className="card p-4">
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((row) => (
              <SkeletonBlock key={row} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'detail') {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="card p-5">
            <SkeletonBlock className="mb-3 h-8 w-52" />
            <SkeletonBlock className="mb-2 h-4 w-40" />
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-4 h-16 w-full" />
          </div>
          <div className="card p-5">
            <SkeletonBlock className="mb-3 h-5 w-36" />
            {[0, 1, 2].map((row) => (
              <SkeletonBlock key={row} className="mb-2 h-14 w-full" />
            ))}
          </div>
          <div className="card p-5">
            <SkeletonBlock className="mb-3 h-5 w-28" />
            <SkeletonBlock className="h-28 w-full" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-4">
            <SkeletonBlock className="mb-3 h-5 w-24" />
            <SkeletonBlock className="mb-2 h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
          <div className="card p-4">
            <SkeletonBlock className="mb-3 h-5 w-32" />
            <SkeletonBlock className="h-28 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-ng-line bg-ng-white p-6 text-sm text-ng-muted">
      <SkeletonBlock className="mb-2 h-4 w-40" />
      <span>{label}</span>
    </div>
  )
}
