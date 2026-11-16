interface Props {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onError: (message: string) => void;
}

export function PromptEditor({ value, disabled, onChange, onError }: Props) {
  const paste = async () => {
    try {
      if (!navigator.clipboard?.readText) throw new Error('Clipboard unavailable');
      onChange(await navigator.clipboard.readText());
    } catch {
      onError('Clipboard access was not allowed. Paste into the prompt field manually.');
    }
  };

  return (
    <section className="section-panel" aria-labelledby="prompt-heading">
      <div className="section-heading">
        <div><span>03</span><h2 id="prompt-heading">Gym video script</h2></div>
        <div className="flex gap-1">
          <button type="button" disabled={disabled || !value} onClick={() => onChange('')} className="small-action">Clear prompt</button>
          <button type="button" disabled={disabled} onClick={paste} className="small-action">Paste prompt</button>
        </div>
      </div>
      <label htmlFor="video-prompt" className="mb-2 block text-sm font-medium text-text">Your script and scene directions</label>
      <textarea
        id="video-prompt"
        value={value}
        disabled={disabled}
        maxLength={14000}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste your gym video script here. Include scenes, workout shots, camera movements, any spoken lines, and your closing call to action…"
        className="min-h-56 w-full resize-y rounded-lg border border-line bg-ink/60 px-4 py-3 text-base leading-7 text-text outline-none placeholder:text-muted/45 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-60"
      />
      <p className="mt-2 text-xs text-muted">Spoken lines require an audio-capable model with Audio turned on. Exact text and logo rendering are not guaranteed.</p>
      <p className="mt-2 text-right text-xs tabular-nums text-muted">{value.length.toLocaleString()} / 14,000</p>
    </section>
  );
}
