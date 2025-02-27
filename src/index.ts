import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { AppEnv } from 'hono-cloudflare-worker';

import { api } from './api';

const app = new Hono<AppEnv>()

	/**
	 * Configuración de la aplicación.
	 * Permite usar middlewares globales.
	 *
	 * En este caso, validar que en el query string venga
	 * el id de la instancia para disponibilizar el contexto
	 * de la base de datos en todos los endpoints.
	 */
	.use(cors())

	/**
	 * Rutas a los diferentes endpoints de la API.
	 *
	 * Es imprescindible el `prefix` y debe coincidir con la ruta
	 * especificada en el archivo de definición de la lambda de `serverless.yml`.
	 */
	.route('/api', api)

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
