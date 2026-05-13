interface SummaryCardProps {
  summary: string | null
  loading: boolean
  generatedAt?: string
  onGenerate: () => Promise<void>
}

export function SummaryCard({ summary, loading, generatedAt, onGenerate }: SummaryCardProps) {
  const hasSummary = Boolean(summary)

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ng-muted">AI Summary</h3>
        <button type="button" className="btn-primary" disabled={loading} onClick={() => void onGenerate()}>
          {loading ? 'Generating...' : hasSummary ? 'Regenerate Summary' : 'Generate Summary'}
        </button>
      </div>
      <p className="rounded-xl bg-ng-surface p-4 text-sm leading-relaxed text-ng-muted">
        {loading ? 'Analyzing candidate profile and scoring signals...' : summary ?? 'No summary generated yet.'}
      </p>
      {hasSummary && generatedAt ? (
        <p className="mt-2 text-xs text-ng-ghost">Generated on {new Date(generatedAt).toLocaleString()}</p>
      ) : null}
    </section>
  )
}
