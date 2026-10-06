export type GenerationPhase = 'preparing' | 'uploading' | 'starting' | 'queued' | 'running' | 'completed' | 'failed';

const labels: Record<GenerationPhase, string> = {
  preparing: 'Preparing images', uploading: 'Uploading references', starting: 'Starting generation',
  queued: 'Queued', running: 'Running', completed: 'Completed', failed: 'Failed',
};

export function GenerationStatus({ phase }: { phase: GenerationPhase }) {
  const complete = phase === 'completed';
  const failed = phase === 'failed';
  return (
    <section className="section-panel" aria-live="polite" aria-labelledby="status-heading">
      <div className="section-heading"><div><span>05</span><h2 id="status-heading">Generation status</h2></div></div>
      <div className="flex items-center gap-4 rounded-lg border border-line bg-ink/50 p-4">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${complete ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : failed ? 'border-red-400/40 bg-red-400/10 text-red-300' : 'border-accent/40 bg-accent/10 text-accent'}`}>
          {complete ? '✓' : failed ? '!' : <span className="h-3 w-3 animate-pulse rounded-full bg-current" />}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-text">{labels[phase]}</p>
          <p className="mt-1 text-sm text-muted">{complete ? 'Your video is ready.' : failed ? 'The generation could not be completed.' : phase === 'uploading' ? 'Sending reference images securely to Runway…' : phase === 'running' ? 'Runway is processing your video…' : 'This can take several minutes.'}</p>
        </div>
      </div>
    </section>
  );
}
