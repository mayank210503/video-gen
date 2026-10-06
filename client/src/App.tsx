import { useEffect, useMemo, useRef, useState } from 'react';
import { GenerationSettings, type Settings } from './components/GenerationSettings';
import { GenerationStatus, type GenerationPhase } from './components/GenerationStatus';
import { ImageUploadCard } from './components/ImageUploadCard';
import { PromptEditor } from './components/PromptEditor';
import { VideoResult } from './components/VideoResult';
import { ApiError, generateVideo, getModels, getTask, type ApiErrorShape, type ModelConfig } from './services/api';

const references = [
  { key: 'graphene', label: 'Graphene' },
  { key: 'thermonix', label: 'Thermonix DTX' },
  { key: 'hvac', label: 'HVAC Filtration' },
  { key: 'asphene', label: 'Asphene' },
] as const;

const initialFiles = () => ({ graphene: null, thermonix: null, hvac: null, asphene: null }) as Record<string, File | null>;
const initialSettings: Settings = { model: 'seedance2_5', resolution: '1080p', ratio: '16:9', duration: 30, generateAudio: false };

function normalizeError(error: unknown): ApiErrorShape {
  if (error instanceof ApiError) return error.details;
  if (error instanceof DOMException && error.name === 'AbortError') return { code: 'CANCELLED', message: 'Generation cancelled.' };
  return { code: 'NETWORK_ERROR', message: 'A network error occurred. Please try again.', technicalDetails: error instanceof Error ? error.message : undefined };
}

export default function App() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [files, setFiles] = useState(initialFiles);
  const [prompt, setPrompt] = useState('');
  const [settings, setSettings] = useState(initialSettings);
  const [phase, setPhase] = useState<GenerationPhase>();
  const [taskId, setTaskId] = useState<string>();
  const [videoUrl, setVideoUrl] = useState<string>();
  const [error, setError] = useState<ApiErrorShape>();
  const requestController = useRef<AbortController | undefined>(undefined);
  const busy = Boolean(phase && !['completed', 'failed'].includes(phase));
  const selectedModel = models.find((model) => model.id === settings.model);
  const hasFiles = useMemo(() => Object.values(files).some(Boolean), [files]);
  const referencesAllowed = selectedModel?.imageReferenceSupport !== 'none';

  useEffect(() => {
    getModels().then(({ models: data }) => setModels(data)).catch((caught) => setError(normalizeError(caught)));
    return () => requestController.current?.abort();
  }, []);

  useEffect(() => {
    if (!taskId || ['completed', 'failed'].includes(phase ?? '')) return;
    const controller = new AbortController();
    let timer: number | undefined;
    const poll = async () => {
      try {
        const task = await getTask(taskId, controller.signal);
        if (task.status === 'SUCCEEDED') {
          if (!task.output[0]) throw new ApiError({ code: 'GENERATION_FAILED', message: 'Runway completed without returning a video.' });
          setVideoUrl(task.output[0]); setPhase('completed'); setTaskId(undefined); return;
        }
        if (['FAILED', 'CANCELED'].includes(task.status)) {
          setError({ code: 'GENERATION_FAILED', message: 'Runway generation failed.', technicalDetails: task.failure });
          setPhase('failed'); setTaskId(undefined); return;
        }
        setPhase(['PENDING', 'THROTTLED', 'QUEUED'].includes(task.status) ? 'queued' : 'running');
        timer = window.setTimeout(poll, 5000);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(normalizeError(caught)); setPhase('failed'); setTaskId(undefined);
      }
    };
    timer = window.setTimeout(poll, 1500);
    return () => { controller.abort(); if (timer) window.clearTimeout(timer); };
  }, [taskId]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool?: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'set_video_prompt', title: 'Set video prompt',
      description: 'Set the temporary Runway video prompt shown in the editor. This does not start or save a generation.',
      inputSchema: { type: 'object', properties: { prompt: { type: 'string', maxLength: 15000 } }, required: ['prompt'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input: unknown) {
        const next = (input as { prompt?: unknown })?.prompt;
        if (typeof next !== 'string' || next.length > 15000) throw new Error('A prompt of up to 15,000 characters is required.');
        setPrompt(next);
        return { updated: true, characters: next.length };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const startGeneration = async () => {
    setError(undefined); setVideoUrl(undefined);
    if (!prompt.trim()) return setError({ code: 'VALIDATION_ERROR', message: 'Enter a video prompt.' });
    if (prompt.length > 15_000) return setError({ code: 'VALIDATION_ERROR', message: 'The prompt must be 15,000 characters or fewer.' });
    if (!selectedModel) return setError({ code: 'UNSUPPORTED_MODEL', message: 'Model settings are still loading.' });
    if (hasFiles && !referencesAllowed) return setError({ code: 'UNSUPPORTED_MODEL', message: `${selectedModel.label} does not accept reference images in text-to-video mode. Remove the images or choose another model.` });
    const controller = new AbortController(); requestController.current = controller;
    setPhase('preparing');
    const stageTimer = window.setTimeout(() => setPhase(hasFiles ? 'uploading' : 'starting'), 250);
    try {
      const result = await generateVideo({ files, prompt: prompt.trim(), ...settings, signal: controller.signal });
      window.clearTimeout(stageTimer); setPhase('starting'); setTaskId(result.taskId);
    } catch (caught) {
      window.clearTimeout(stageTimer);
      if (controller.signal.aborted) return;
      setError(normalizeError(caught)); setPhase('failed');
    }
  };

  const reset = () => {
    requestController.current?.abort();
    setFiles(initialFiles()); setPrompt(''); setSettings(initialSettings); setPhase(undefined); setTaskId(undefined); setVideoUrl(undefined); setError(undefined);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-ink text-text">
      <header className="border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5 sm:px-6">
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-accent/30 bg-accent/10 font-semibold text-accent">N</div>
          <div><h1 className="text-lg font-semibold tracking-tight sm:text-xl">Nanomatrix Runway Generator</h1><p className="text-xs text-muted">Temporary session · nothing is saved</p></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-7 sm:px-6 sm:py-10">
        <section className="section-panel" aria-labelledby="references-heading">
          <div className="section-heading"><div><span>01</span><h2 id="references-heading">Reference images</h2></div><p>Optional · fixed order</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {references.map((reference, index) => <ImageUploadCard key={reference.key} index={index + 1} label={reference.label} file={files[reference.key]} disabled={busy} onChange={(file) => setFiles((current) => ({ ...current, [reference.key]: file }))} onError={(message) => setError({ code: 'IMAGE_ERROR', message })} />)}
          </div>
        </section>
        <PromptEditor value={prompt} disabled={busy} onChange={setPrompt} onError={(message) => setError({ code: 'CLIPBOARD_ERROR', message })} />
        <GenerationSettings models={models} value={settings} disabled={busy} onChange={setSettings} />
        {error && (
          <div role="alert" className="rounded-xl border border-red-400/25 bg-red-400/5 p-4">
            <div className="flex gap-3"><span className="text-red-300">!</span><div><p className="font-medium text-red-100">{error.message}</p>{error.technicalDetails && <details className="mt-2 text-sm text-muted"><summary className="cursor-pointer select-none">Technical details</summary><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded bg-black/25 p-3 text-xs">{error.technicalDetails}</pre></details>}</div></div>
          </div>
        )}
        <section className="section-panel" aria-labelledby="generate-heading">
          <div className="section-heading"><div><span>04</span><h2 id="generate-heading">Generate</h2></div></div>
          <button type="button" onClick={startGeneration} disabled={busy || !models.length} className="button-primary w-full py-4 text-sm uppercase tracking-[.14em] disabled:cursor-not-allowed disabled:opacity-45">{busy ? 'Generation in progress…' : 'Generate video'}</button>
          <p className="mt-3 text-center text-xs text-muted">Reference files are uploaded directly from server memory and are not retained by this app.</p>
        </section>
        {phase && <GenerationStatus phase={phase} />}
        {videoUrl && <VideoResult url={videoUrl} />}
        {(phase || videoUrl || error) && <button type="button" onClick={reset} className="button-secondary w-full py-3">New generation</button>}
      </main>
      <footer className="mx-auto max-w-6xl px-6 pb-8 text-center text-xs text-muted/65">Refresh at any time to clear the current session.</footer>
    </div>
  );
}
