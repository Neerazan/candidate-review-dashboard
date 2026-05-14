export function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, string> = {
    new: 'bg-ng-blue-light text-ng-blue border border-ng-blue/25',
    reviewed: 'bg-violet-100 text-violet-700 border border-violet-300/70',
    hired: 'bg-emerald-100 text-emerald-700 border border-emerald-300/70',
    rejected: 'bg-ng-red-light text-ng-red border border-ng-red/35',
    archived: 'bg-ng-surface text-ng-muted border border-ng-line',
  }

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${palette[status] ?? 'bg-ng-surface text-ng-muted border border-ng-line'}`}>
      {status}
    </span>
  )
}
