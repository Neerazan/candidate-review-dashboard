export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return <div className="rounded-xl border border-ng-line bg-ng-white p-6 text-sm text-ng-muted">{label}</div>
}
