import { test, expect } from 'bun:test';
import { handleRequestRoutes } from '../request-routes';

test('release gate rejects publication until activation', async () => {
  const req = new Request('https://direcciones507.com/v1/admin/requests/123e4567-e89b-42d3-a456-426614174000/publish', {method:'POST'});
  const response = await handleRequestRoutes(req, {enabled:false} as any);
  expect(response?.status).toBe(503);
});
