import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { publicModelConfigs } from './config/runwayModels.js';
import { generateRouter } from './routes/generate.js';
import { taskRouter } from './routes/task.js';
import { RunwayError } from './services/runway.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server/.env'),
  path.resolve(here, '../.env'),
  path.resolve(here, '../../.env'),
].find((candidate) => existsSync(candidate));

dotenv.config(envPath ? { path: envPath } : undefined);

const app = express();
const port = Number(process.env.PORT) || 3001;
const configured = Boolean(process.env.RUNWAYML_API_SECRET && process.env.RUNWAYML_API_SECRET !== 'YOUR_RUNWAY_API_KEY');

app.disable('x-powered-by');
app.use(cors({ origin: /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/ }));
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (_request, response) => response.json({ success: true, runwayConfigured: configured }));
app.get('/api/models', (_request, response) => response.json({ success: true, models: publicModelConfigs }));
app.use('/api/generate', generateRouter);
app.use('/api/task', taskRouter);

const clientDist = path.resolve(here, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (request, response, next) => {
  if (request.path.startsWith('/api/')) return next();
  response.sendFile(path.join(clientDist, 'index.html'));
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  let normalized = error;
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    normalized = new RunwayError(413, 'IMAGE_TOO_LARGE', 'Each image must be 16 MB or smaller.');
  }
  if (normalized instanceof RunwayError) {
    response.status(normalized.status >= 400 && normalized.status < 600 ? normalized.status : 500).json({
      success: false,
      error: { code: normalized.code, message: normalized.message, ...(normalized.technicalDetails ? { technicalDetails: normalized.technicalDetails } : {}) },
    });
    return;
  }
  response.status(500).json({ success: false, error: { code: 'UNEXPECTED_ERROR', message: 'Something went wrong. Please try again.' } });
});

app.listen(port, () => {
  console.log(`Nanomatrix server ready on http://localhost:${port}`);
});
