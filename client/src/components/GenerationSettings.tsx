import type { ModelConfig } from '../services/api';

export interface Settings {
  model: string;
  resolution: string;
  ratio: string;
  duration: number;
  generateAudio: boolean;
}

interface Props {
  models: ModelConfig[];
  value: Settings;
  disabled?: boolean;
  onChange: (next: Settings) => void;
}

export function GenerationSettings({ models, value, disabled, onChange }: Props) {
  const selected = models.find((model) => model.id === value.model);
  const changeModel = (id: string) => {
    const model = models.find((item) => item.id === id);
    if (!model) return;
    const resolution = model.resolutions.includes(value.resolution) ? value.resolution : (model.resolutions.includes('1080p') ? '1080p' : model.resolutions[0]);
    const ratios = model.ratios[resolution] ?? [];
    const ratio = ratios.includes(value.ratio) ? value.ratio : (ratios.includes('16:9') ? '16:9' : ratios[0]);
    const duration = model.durations.includes(value.duration) ? value.duration : model.durations.at(-1)!;
    onChange({ model: id, resolution, ratio, duration, generateAudio: model.audioSupport ? value.generateAudio : false });
  };

  const fieldClass = 'h-11 w-full rounded-lg border border-line bg-ink/60 px-3 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-50';
  return (
    <section className="section-panel" aria-labelledby="settings-heading">
      <div className="section-heading"><div><span>03</span><h2 id="settings-heading">Settings</h2></div></div>
      {selected && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="setting-label lg:col-span-1">Model
            <select disabled={disabled} value={value.model} onChange={(event) => changeModel(event.target.value)} className={fieldClass}>
              {models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
            </select>
          </label>
          <label className="setting-label">Resolution
            <select disabled={disabled} value={value.resolution} onChange={(event) => {
              const resolution = event.target.value;
              const ratios = selected.ratios[resolution] ?? [];
              onChange({ ...value, resolution, ratio: ratios.includes(value.ratio) ? value.ratio : (ratios.includes('16:9') ? '16:9' : ratios[0]) });
            }} className={fieldClass}>
              {selected.resolutions.map((resolution) => <option key={resolution}>{resolution}</option>)}
            </select>
          </label>
          <label className="setting-label">Aspect ratio
            <select disabled={disabled} value={value.ratio} onChange={(event) => onChange({ ...value, ratio: event.target.value })} className={fieldClass}>
              {(selected.ratios[value.resolution] ?? []).map((ratio) => <option key={ratio}>{ratio}</option>)}
            </select>
          </label>
          <label className="setting-label">Duration
            <select disabled={disabled} value={value.duration} onChange={(event) => onChange({ ...value, duration: Number(event.target.value) })} className={fieldClass}>
              {selected.durations.map((duration) => <option key={duration} value={duration}>{duration} seconds</option>)}
            </select>
          </label>
          <div className="setting-label">Audio
            <button type="button" role="switch" aria-checked={value.generateAudio} disabled={disabled || !selected.audioSupport} onClick={() => onChange({ ...value, generateAudio: !value.generateAudio })} className={`${fieldClass} flex items-center justify-between disabled:cursor-not-allowed`}>
              <span>{selected.audioSupport ? (value.generateAudio ? 'On' : 'Off') : 'Not supported'}</span>
              <span className={`relative h-5 w-9 rounded-full transition ${value.generateAudio ? 'bg-accent' : 'bg-line'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${value.generateAudio ? 'left-[18px]' : 'left-0.5'}`} /></span>
            </button>
          </div>
        </div>
      )}
      {selected?.imageReferenceSupport === 'none' && <p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-sm text-amber-100/80">Gen-4.5 text-to-video does not accept reference images. Remove uploaded images to use this model.</p>}
    </section>
  );
}
