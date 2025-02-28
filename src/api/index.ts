import { Hono } from 'hono';

import type { AppEnv } from 'hono-cf-worker-template';
import { cors } from 'hono/cors';
import { traceIdMiddleware } from './middlewares/trace-id.middleware';
import {
	getTursoClient,
	tursoClient,
} from './middlewares/turso-client.middleware';

export const api = new Hono<AppEnv>()

	/**
	 * Configuración de la API.
	 * Permite usar middlewares comunes en toda la API.
	 */
	.use(cors())
	.use(traceIdMiddleware)
	.use(tursoClient())

	/**
	 * Rutas a los diferentes endpoints de la API.
	 */
	.get('/health', async (c) => {
		const traceId = c.get('traceId');
		const tursoClient = getTursoClient(c);

		const { rowsAffected, columnTypes, lastInsertRowid, columns, rows } =
			await tursoClient.execute({
				sql: /* sql */ `SELECT * FROM elements;`,
				args: [],
			});

		const data = rows.map((row) =>
			columns.reduce((acc, key, idx) => {
				Reflect.set(acc, key, row[idx]);
				return acc;
			}, {})
		);

		return c.json({
			message: `I'm running on Cloudflare Workers.`,
			result: { data, meta: { rowsAffected, columnTypes, lastInsertRowid } },
			traceId,
		});
	})

	/**
	 * Si busca una ruta que no existe, se lanza una respuesta 404.
	 */
	.notFound((c) => {
		const { path } = c.req;
		const traceId = c.get('traceId');
		console.error(`[api.notFound] [${traceId}]`, { path });
		return c.json(
			{
				message: 'No se encontro la ruta',
				details: { path },
				traceId,
			},
			404
		);
	})

	/**
	 * Actúa como un catch global para evitar envolver cada endpoint individualmente con try/catch.
	 */
	.onError((error, c) => {
		const traceId = c.get('traceId');
		console.error(`[api.error] [${traceId}]`, error);
		return c.json(
			{
				message: error.message,
				details: { error, cause: error.cause },
				traceId,
			},
			500
		);
	});
