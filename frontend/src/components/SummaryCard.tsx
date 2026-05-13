interface SummaryCardProps {
  summary: string | null
  loading: boolean
  onGenerate: () => Promise<void>
}

export function SummaryCard({ summary, loading, onGenerate }: SummaryCardProps) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ng-muted">AI Summary</h3>
        <button type="button" className="btn-primary" disabled={loading} onClick={() => void onGenerate()}>
          {loading ? 'Generating...' : 'Generate Summary'}
        </button>
      </div>
      <p className="rounded-xl bg-ng-surface p-4 text-sm leading-relaxed text-ng-muted">
        {loading ? 'Analyzing candidate profile and scoring signals...' : summary ?? 'No summary generated yet.'}
      </p>
    </section>
  )
}
