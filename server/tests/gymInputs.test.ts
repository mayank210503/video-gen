import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import { buildGymPrompt, parseImageUrls } from '../src/services/gymInputs.js';
import { generateRouter } from '../src/routes/generate.js';
import { RunwayError } from '../src/services/runway.js';

test('image links are normalized and empty slots omitted', () => {
  assert.deepEqual(parseImageUrls('{"gymImage1":" https://example.com/gym.jpg ","logo":""}'), { gymImage1: 'https://example.com/gym.jpg' });
  for (const raw of ['null', '[]', '{', '{"unexpected":"https://example.com"}', '{"logo":"http://example.com"}', '{"logo":"https://user:pass@example.com"}']) {
    assert.throws(() => parseImageUrls(raw), RunwayError);
  }
});

test('gym prompts preserve scripts and label references', () => {
  const script = 'Open with a squat. Close with: Join us today.';
  const prompt = buildGymPrompt('Peak Fitness', script, ['Gym image 2', 'Gym logo']);
  assert.ok(prompt.includes('Peak Fitness'));
  assert.ok(prompt.endsWith(script));
  assert.ok(prompt.includes('1: Gym image 2; 2: Gym logo'));
  assert.ok(prompt.includes('preserve its design'));
  assert.ok(buildGymPrompt('G'.repeat(120), 'S'.repeat(14000), ['Gym image 1', 'Gym image 2', 'Gym image 3', 'Gym image 4', 'Gym logo', 'Reference video']).length <= 15000);
  assert.throws(() => buildGymPrompt('', script, []), RunwayError);
  assert.throws(() => buildGymPrompt('Gym', 'x'.repeat(14001), []), RunwayError);
});

test('generation route sends dynamic gym inputs and rejects invalid requests', async () => {
  const app = express();
  app.use('/api/generate', generateRouter);
  app.use((error: RunwayError, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    response.status(error.status || 500).json({ error: error.message });
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const nativeFetch = globalThis.fetch;
  const previousSecret = process.env.RUNWAYML_API_SECRET;
  process.env.RUNWAYML_API_SECRET = 'test-secret';
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith('https://api.dev.runwayml.com/')) {
      requests.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ id: 'test-task' }), { status: 200 });
    }
    return nativeFetch(input, init);
  };
  const send = (overrides: Record<string, string> = {}, file?: Blob) => {
    const form = new FormData();
    for (const [key, value] of Object.entries({ gymName: 'Dynamic Gym', prompt: 'Train with us.', model: 'seedance2_5', resolution: '1080p', ratio: '16:9', duration: '30', generateAudio: 'false', imageUrls: JSON.stringify({ gymImage2: 'https://example.com/gym.png', logo: 'https://example.com/logo.png' }), ...overrides })) form.append(key, value);
    if (file) form.append('gymImage1', file, 'gym.png');
    return fetch(`http://127.0.0.1:${address.port}/api/generate`, { method: 'POST', body: form });
  };
  try {
    const result = await send();
    assert.equal(result.status, 202);
    assert.deepEqual(await result.json(), { success: true, taskId: 'test-task' });
    assert.deepEqual(requests[0]?.references, [{ uri: 'https://example.com/gym.png' }, { uri: 'https://example.com/logo.png' }]);
    assert.match(String(requests[0]?.promptText), /Dynamic Gym/);
    assert.equal((await send({ gymName: '' })).status, 400);
    assert.equal((await send({ imageUrls: '{"logo":"javascript:alert(1)"}' })).status, 400);
    assert.equal((await send({ model: 'gen4_5', resolution: '720p', duration: '5' })).status, 400);
    assert.equal((await send({}, new Blob(['not an image'], { type: 'image/png' }))).status, 400);
    assert.equal(requests.length, 1);
  } finally {
    globalThis.fetch = nativeFetch;
    if (previousSecret === undefined) delete process.env.RUNWAYML_API_SECRET;
    else process.env.RUNWAYML_API_SECRET = previousSecret;
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});