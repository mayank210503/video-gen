export function VideoResult({ url }: { url: string }) {
  return (
    <section className="section-panel" aria-labelledby="result-heading">
      <div className="section-heading"><div><span>06</span><h2 id="result-heading">Result</h2></div></div>
      <video src={url} controls playsInline className="aspect-video w-full rounded-xl border border-line bg-black object-contain" />
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <a href={url} download className="button-primary flex-1 text-center">Download video</a>
        <a href={url} target="_blank" rel="noreferrer" className="button-secondary flex-1 text-center">Open video</a>
      </div>
      <p className="mt-3 break-all text-xs text-muted">{url}</p>
    </section>
  );
}
