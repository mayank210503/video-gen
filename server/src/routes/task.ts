import { Router } from 'express';
import { RunwayError, getTask } from '../services/runway.js';

export const taskRouter = Router();
const taskIdPattern = /^[0-9a-f-]{20,64}$/i;

taskRouter.get('/:taskId', async (request, response, next) => {
  try {
    if (!taskIdPattern.test(request.params.taskId)) throw new RunwayError(400, 'VALIDATION_ERROR', 'Invalid task ID.');
    const task = await getTask(request.params.taskId);
    const status = typeof task.status === 'string' ? task.status : 'UNKNOWN';
    const output = Array.isArray(task.output) ? task.output.filter((item): item is string => typeof item === 'string') : [];
    const failure = typeof task.failure === 'string' ? task.failure : undefined;
    response.json({ success: true, status, output, ...(failure ? { failure: failure.slice(0, 1000) } : {}) });
  } catch (error) { next(error); }
});
