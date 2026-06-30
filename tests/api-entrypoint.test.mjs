import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import handler from '../api/index.mjs';

test('Vercel entrypoint forwards requests to the Express app', async () => {
  const server = createServer(handler);

  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object' && 'port' in address);

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/profile`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.ok(body.profile || body.error, 'expected a profile payload or an error payload from the Express app');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
