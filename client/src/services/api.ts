export interface ModelConfig {
  id: string;
  label: string;
  resolutions: string[];
  ratios: Record<string, string[]>;
  durations: number[];
  imageReferenceSupport: 'multiple' | 'none';
  audioSupport: boolean;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  technicalDetails?: string;
}

export class ApiError extends Error {
  constructor(public details: ApiErrorShape) {
    super(details.message);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const fallback = response.status === 413
      ? { code: 'IMAGE_TOO_LARGE', message: 'Each image must be 16 MB or smaller.' }
      : { code: 'NETWORK_ERROR', message: 'The request could not be completed.' };
    throw new ApiError(data?.error ?? fallback);
  }
  return data as T;
}

export async function getModels() {
  const response = await fetch('/api/models');
  return parseResponse<{ success: true; models: ModelConfig[] }>(response);
}

export async function generateVideo(input: {
  files: Record<string, File | null>;
  prompt: string;
  model: string;
  resolution: string;
  ratio: string;
  duration: number;
  generateAudio: boolean;
  signal?: AbortSignal;
}) {
  const form = new FormData();
  for (const [name, file] of Object.entries(input.files)) if (file) form.append(name, file);
  form.append('prompt', input.prompt);
  form.append('model', input.model);
  form.append('resolution', input.resolution);
  form.append('ratio', input.ratio);
  form.append('duration', String(input.duration));
  form.append('generateAudio', String(input.generateAudio));
  const response = await fetch('/api/generate', { method: 'POST', body: form, signal: input.signal });
  return parseResponse<{ success: true; taskId: string }>(response);
}

export async function getTask(taskId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/task/${encodeURIComponent(taskId)}`, { signal });
  return parseResponse<{ success: true; status: string; output: string[]; failure?: string }>(response);
}
