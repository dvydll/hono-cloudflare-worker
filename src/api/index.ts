import { Hono } from 'hono';

import type { AppEnv } from 'hono-cloudflare-worker';

export const api = new Hono<AppEnv>().get('/', (c) => {
	const { PORT: port, API_URL: apiUrl, API_KEY: apiKey } = c.env;
	return c.json({
		message: `Hello Hono! I'm running on Cloudflare Workers.`,
		env: { port, apiUrl, apiKey },
	});
});
