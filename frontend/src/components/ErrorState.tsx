export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-xl border border-ng-red/40 bg-ng-red-light p-4 text-sm text-ng-red">{message}</div>
}
