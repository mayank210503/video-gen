import type { RunwayModelConfig } from '../config/runwayModels.js';

const API_BASE = 'https://api.dev.runwayml.com';
const API_VERSION = '2024-11-06';

export class RunwayError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public technicalDetails?: string,
  ) {
    super(message);
  }
}

const secret = () => {
  const value = process.env.RUNWAYML_API_SECRET?.trim();
  if (!value || value === 'YOUR_RUNWAY_API_KEY') {
    throw new RunwayError(503, 'RUNWAY_NOT_CONFIGURED', 'Runway is not configured on the server.');
  }
  return value;
};

const safeDetails = (value: unknown) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]').slice(0, 1500);
};

const messageForStatus = (status: number, details: string) => {
  if (status === 401 || status === 403) return ['INVALID_API_KEY', 'The Runway API key is invalid or not authorized.'] as const;
  if (status === 429) return ['RATE_LIMITED', 'Runway is rate limited. Please wait and try again.'] as const;
  if (status === 402 || /credit|balance|quota/i.test(details)) return ['INSUFFICIENT_CREDITS', 'There are not enough Runway credits for this generation.'] as const;
  return ['RUNWAY_ERROR', 'Runway could not complete the request.'] as const;
};

async function runwayRequest(path: string, init: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secret()}`,
        'X-Runway-Version': API_VERSION,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new RunwayError(502, 'NETWORK_ERROR', 'Could not reach Runway. Check the network and try again.', safeDetails(error));
  }

  const raw = await response.text();
  let data: unknown = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = raw; }
  if (!response.ok) {
    const details = safeDetails(data);
    const [code, message] = messageForStatus(response.status, details);
    throw new RunwayError(response.status, code, message, details);
  }
  return data as Record<string, unknown>;
}

export async function uploadEphemeral(file: Express.Multer.File) {
  const prepared = await runwayRequest('/v1/uploads', {
    method: 'POST',
    body: JSON.stringify({ filename: file.originalname, type: 'ephemeral' }),
  });

  const uploadUrl = prepared.uploadUrl;
  const fields = prepared.fields;
  const runwayUri = prepared.runwayUri;
  if (typeof uploadUrl !== 'string' || typeof runwayUri !== 'string' || !fields || typeof fields !== 'object') {
    throw new RunwayError(502, 'UPLOAD_FAILED', 'Runway did not prepare the image upload correctly.');
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
  form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(uploadUrl, { method: 'POST', body: form, signal: AbortSignal.timeout(120_000) });
  } catch (error) {
    throw new RunwayError(502, 'UPLOAD_FAILED', 'The reference image upload failed.', safeDetails(error));
  }
  if (!uploadResponse.ok) {
    throw new RunwayError(502, 'UPLOAD_FAILED', 'The reference image upload failed.', `Storage returned HTTP ${uploadResponse.status}.`);
  }
  return runwayUri;
}

export async function createVideoTask(args: {
  model: RunwayModelConfig;
  prompt: string;
  ratioValue: string;
  duration: number;
  generateAudio: boolean;
  referenceUris: string[];
}) {
  const body: Record<string, unknown> = {
    model: args.model.apiModelId,
    promptText: args.prompt,
    ratio: args.ratioValue,
    duration: args.duration,
  };
  if (args.model.audioSupport) body.audio = args.generateAudio;
  if (args.referenceUris.length) body.references = args.referenceUris.map((uri) => ({ uri }));

  const data = await runwayRequest(args.model.endpoint, { method: 'POST', body: JSON.stringify(body) });
  if (typeof data.id !== 'string') throw new RunwayError(502, 'GENERATION_FAILED', 'Runway did not return a generation task.');
  return data.id;
}

export async function getTask(taskId: string) {
  return runwayRequest(`/v1/tasks/${encodeURIComponent(taskId)}`);
}
