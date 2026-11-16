import { Router } from 'express';
import multer from 'multer';
import { RUNWAY_MODELS, type Resolution } from '../config/runwayModels.js';
import { createVideoTask, RunwayError, uploadEphemeral } from '../services/runway.js';
import { buildGymPrompt, imageFieldNames, parseImageUrls } from '../services/gymInputs.js';

export const generateRouter = Router();
const videoFieldName = 'referenceVideo' as const;
const fieldNames = [...imageFieldNames, videoFieldName] as const;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 64 * 1024 * 1024, files: 6, fields: 10, fieldSize: 64 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype) || (file.fieldname === videoFieldName ? !file.mimetype.startsWith('video/') : !file.mimetype.startsWith('image/'))) return callback(new RunwayError(400, 'INVALID_REFERENCE_TYPE', 'Use JPG, PNG, or WebP images and an MP4, MOV, or WebM reference video.'));
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

const isValidVideoBytes = (file: Express.Multer.File) => {
  const bytes = file.buffer;
  const mp4OrMov = bytes.subarray(4, 8).toString() === 'ftyp';
  const webm = bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return mp4OrMov || webm;
};

generateRouter.post(
  '/',
  upload.fields(fieldNames.map((name) => ({ name, maxCount: 1 }))),
  async (request, response, next) => {
    try {
      const script = String(request.body.prompt ?? '').trim();
      const gymName = String(request.body.gymName ?? '').trim();
      const imageUrls = parseImageUrls(request.body.imageUrls);
      const model = RUNWAY_MODELS[String(request.body.model ?? '')];
      const resolution = String(request.body.resolution ?? '') as Resolution;
      const ratio = String(request.body.ratio ?? '');
      const duration = Number(request.body.duration);
      const generateAudio = String(request.body.generateAudio) === 'true';
      buildGymPrompt(gymName, script, []);
      if (!model) throw new RunwayError(400, 'UNSUPPORTED_MODEL', 'This model configuration is not supported.');
      const ratioValue = model.ratios[resolution]?.[ratio];
      if (!ratioValue || !model.durations.includes(duration) || (generateAudio && !model.audioSupport)) {
        throw new RunwayError(400, 'UNSUPPORTED_MODEL', 'One or more settings are not supported by this model.');
      }

      const filesByField = (request.files ?? {}) as Record<string, Express.Multer.File[]>;
      const imageFiles = imageFieldNames.flatMap((name) => filesByField[name] ?? []);
      const videoFiles = filesByField[videoFieldName] ?? [];
      const files = fieldNames.flatMap((name) => filesByField[name] ?? []);
      if (imageFiles.some((file) => file.size > 16 * 1024 * 1024)) {
        throw new RunwayError(413, 'IMAGE_TOO_LARGE', 'Each image must be 16 MB or smaller.');
      }
      if (imageFieldNames.some((name) => imageUrls[name] && filesByField[name]?.length)) {
        throw new RunwayError(400, 'VALIDATION_ERROR', 'Choose either an upload or a link for each image, not both.');
      }
      if (imageFiles.some((file) => !isValidImageBytes(file))) {
        throw new RunwayError(400, 'INVALID_IMAGE_TYPE', 'One image does not match its JPG, PNG, or WebP file type.');
      }
      if (videoFiles.some((file) => !isValidVideoBytes(file))) {
        throw new RunwayError(400, 'INVALID_VIDEO_TYPE', 'The reference video must be an MP4, MOV, or WebM file.');
      }
      if (files.length + Object.keys(imageUrls).length > model.maxReferenceImages) {
        throw new RunwayError(400, 'UNSUPPORTED_MODEL', `${model.label} does not support the selected reference media.`);
      }

      const activeFields = fieldNames.filter((name) => filesByField[name]?.length || imageUrls[name]);
      const referenceUris = await Promise.all(activeFields.map((name) => {
        const file = filesByField[name]?.[0];
        return file ? uploadEphemeral(file) : Promise.resolve(imageUrls[name]!);
      }));
      const labels: Record<string, string> = { gymImage1: 'Gym image 1', gymImage2: 'Gym image 2', gymImage3: 'Gym image 3', gymImage4: 'Gym image 4', logo: 'Gym logo', referenceVideo: 'Reference video' };
      const prompt = buildGymPrompt(gymName, script, activeFields.map((name) => labels[name]!));
      const taskId = await createVideoTask({ model, prompt, ratioValue, duration, generateAudio, referenceUris });
      response.status(202).json({ success: true, taskId });
    } catch (error) { next(error); }
  },
);
