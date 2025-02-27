import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { AppEnv } from 'hono-cloudflare-worker';

import { api } from './api';

const app = new Hono<AppEnv>()

	/**
	 * Configuración de la aplicación.
	 * Permite usar middlewares globales.
	 */
	.use(cors())

	/**
	 * Rutas a los diferentes endpoints de la API.
	 */
	.route('/api', api)
	.get('/', (c) => {
		return c.html('<h1>Hola mundo!</h1>');
	})

	/**
	 * Si busca una ruta que no existe, se lanza una respuesta 404.
	 */
	.notFound((c) => {
		const { path } = c.req;
		console.error('[app.notFound]', { path });
		return c.json(
			{
				message: 'No se encontro la ruta',
				details: { path },
				traceId: crypto.randomUUID(),
			},
			404
		);
	})

	/**
	 * Actúa como un catch global para evitar envolver cada endpoint individualmente con try/catch.
	 */
	.onError((error, c) => {
		console.error('[app.error]', error);
		return c.json(
			{
				message: error.message,
				details: { error },
				traceId: crypto.randomUUID(),
			},
			500
		);
	});

export default app;
