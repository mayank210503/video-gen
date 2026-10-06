import { Router } from 'express';
import multer from 'multer';
import { RUNWAY_MODELS, type Resolution } from '../config/runwayModels.js';
import { createVideoTask, RunwayError, uploadEphemeral } from '../services/runway.js';

export const generateRouter = Router();
const fieldNames = ['graphene', 'thermonix', 'hvac', 'asphene'] as const;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024, files: 4, fields: 10 },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) return callback(new RunwayError(400, 'INVALID_IMAGE_TYPE', 'Use a JPG, JPEG, PNG, or WebP image.'));
    callback(null, true);
  },
});

const isValidImageBytes = (file: Express.Multer.File) => {
  const bytes = file.buffer;
  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  return jpg || png || webp;
};

generateRouter.post(
  '/',
  upload.fields(fieldNames.map((name) => ({ name, maxCount: 1 }))),
  async (request, response, next) => {
    try {
      const prompt = String(request.body.prompt ?? '').trim();
      const model = RUNWAY_MODELS[String(request.body.model ?? '')];
      const resolution = String(request.body.resolution ?? '') as Resolution;
      const ratio = String(request.body.ratio ?? '');
      const duration = Number(request.body.duration);
      const generateAudio = String(request.body.generateAudio) === 'true';
      if (!prompt) throw new RunwayError(400, 'VALIDATION_ERROR', 'Enter a video prompt.');
      if (prompt.length > 15_000) throw new RunwayError(400, 'VALIDATION_ERROR', 'The prompt is too long for the selected model.');
      if (!model) throw new RunwayError(400, 'UNSUPPORTED_MODEL', 'This model configuration is not supported.');
      const ratioValue = model.ratios[resolution]?.[ratio];
      if (!ratioValue || !model.durations.includes(duration) || (generateAudio && !model.audioSupport)) {
        throw new RunwayError(400, 'UNSUPPORTED_MODEL', 'One or more settings are not supported by this model.');
      }

      const filesByField = (request.files ?? {}) as Record<string, Express.Multer.File[]>;
      const files = fieldNames.flatMap((name) => filesByField[name] ?? []);
      if (files.some((file) => !isValidImageBytes(file))) {
        throw new RunwayError(400, 'INVALID_IMAGE_TYPE', 'One image does not match its JPG, PNG, or WebP file type.');
      }
      if (files.length > model.maxReferenceImages) {
        throw new RunwayError(400, 'UNSUPPORTED_MODEL', `${model.label} does not support the selected reference images.`);
      }

      const referenceUris = await Promise.all(files.map(uploadEphemeral));
      const taskId = await createVideoTask({ model, prompt, ratioValue, duration, generateAudio, referenceUris });
      response.status(202).json({ success: true, taskId });
    } catch (error) { next(error); }
  },
);
