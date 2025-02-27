import { Hono } from 'hono';
import type { Bindings } from './index.d';

const app = new Hono<Bindings>();

app.get('/', (c) => {
	const { PORT: port, API_URL: apiUrl, API_KEY: apiKey } = c.env;
	return c.json({
		message: `Hello Hono! I'm running on Cloudflare Workers.`,
		env: { port, apiUrl, apiKey },
	});
});

export default app;
