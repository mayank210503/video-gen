import { RunwayError } from './runway.js';

export const imageFieldNames = ['gymImage1', 'gymImage2', 'gymImage3', 'gymImage4', 'logo'] as const;

export function parseImageUrls(raw: unknown): Record<string, string> {
  let data: unknown;
  try { data = JSON.parse(String(raw ?? '{}')); }
  catch { throw new RunwayError(400, 'VALIDATION_ERROR', 'Image links must be a valid object.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new RunwayError(400, 'VALIDATION_ERROR', 'Image links must be a valid object.');
  }
  const urls: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!imageFieldNames.includes(key as typeof imageFieldNames[number]) || typeof value !== 'string') {
      throw new RunwayError(400, 'VALIDATION_ERROR', 'An image link field is invalid.');
    }
    if (!value.trim()) continue;
    try {
      const url = new URL(value.trim());
      if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2048) throw new Error();
      urls[key] = url.href;
    } catch { throw new RunwayError(400, 'VALIDATION_ERROR', 'Image and logo links must be public HTTPS URLs without credentials, up to 2,048 characters.'); }
  }
  return urls;
}

export function buildGymPrompt(gymName: string, script: string, referenceLabels: string[]) {
  if (!gymName || gymName.length > 120) throw new RunwayError(400, 'VALIDATION_ERROR', 'Enter a gym name of up to 120 characters.');
  if (!script || script.length > 14000) throw new RunwayError(400, 'VALIDATION_ERROR', 'Enter a gym video script of up to 14,000 characters.');
  return [
    `Create a gym/fitness promotional video for ${JSON.stringify(gymName)}.`,
    'Follow the supplied script and scene directions. Use the supplied gym images as visual references. Do not invent offers or contact details.',
    referenceLabels.length ? `References in order: ${referenceLabels.map((label, index) => `${index + 1}: ${label}`).join('; ')}.` : '',
    referenceLabels.includes('Gym logo') ? 'Use the gym logo as the brand reference; preserve its design and avoid inventing a different logo.' : '',
    'Script and scene directions:',
    script,
  ].filter(Boolean).join('\n\n');
}