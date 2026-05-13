import { GenerateIcon } from './Icons'
import { AiIcon } from './Icons'
import { formatLongDateTime } from '../utils/date'
import { Button } from './Button'

interface SummaryCardProps {
  summary: string | null
  loading: boolean
  generatedAt?: string
  disabled?: boolean
  onGenerate: () => Promise<void>
}

export function SummaryCard({ summary, loading, generatedAt, disabled = false, onGenerate }: SummaryCardProps) {
  const hasSummary = Boolean(summary)

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ng-muted">
          <AiIcon className="h-4 w-4" />
          AI Summary
        </h3>
        <Button
          type="button"
          variant="primary"
          disabled={loading || disabled}
          onClick={() => void onGenerate()}
          leftIcon={!loading ? <GenerateIcon className="h-4 w-4" /> : undefined}
        >
          {loading ? 'Generating...' : hasSummary ? 'Regenerate Summary' : 'Generate Summary'}
        </Button>
      </div>
      <p className="rounded-xl bg-ng-surface p-4 text-sm leading-relaxed text-ng-muted">
        {loading ? 'Analyzing candidate profile and scoring signals...' : summary ?? 'No summary generated yet.'}
      </p>
      {hasSummary && generatedAt ? (
        <p className="mt-2 text-xs text-ng-ghost">Generated on {formatLongDateTime(generatedAt)}</p>
      ) : null}
    </section>
  )
}
