import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { timeout } from 'hono/timeout';
import { z } from 'zod';

import type { AppEnv } from 'types';
import type { Element } from './schemas/index';

import { sql } from './helpers/sql-literal';
import { traceIdMiddleware } from './middlewares/trace-id.middleware';
import {
	getTursoClient,
	tursoClient,
} from './middlewares/turso-client.middleware';
import { DbService, ZipDto } from './services/db-service';

const idSchema = z.object({
	id: z.string().regex(/^\d+$/, { message: 'El id debe ser un número.' }),
});

export const api = new Hono<AppEnv>()

	/**
	 * Configuración de la API.
	 * Permite usar middlewares comunes en toda la API.
	 */
	.use(logger())
	.use(cors())
	.use(timeout(5000, new HTTPException(504, { message: 'Gateway Timeout' })))
	.use(traceIdMiddleware)
	.use(tursoClient())

	/**
	 * Rutas a los diferentes endpoints de la API.
	 */
	.get('/', async (c) => {
		const traceId = c.get('traceId');
		const tursoClient = getTursoClient(c);
		const { elementName, zip } = c.req.query();

		const queryResult = elementName
			? await new DbService<Element>(tursoClient).getByQuery(
					sql`SELECT * FROM elements WHERE elementName = ${elementName}`
			  )
			: await new DbService<Element>(tursoClient).getAll();

		return c.json({
			message: `I'm running on Cloudflare Workers.`,
			result: Boolean(zip) ? new ZipDto<Element>(queryResult) : queryResult,
			traceId,
		});
	})

	.get('/:id', zValidator('param', idSchema), async (c) => {
		const traceId = c.get('traceId');
		const tursoClient = getTursoClient(c);
		const { id } = c.req.valid('param');
		const { zip } = c.req.query();

		const queryResult = await new DbService<Element>(tursoClient).getById(
			Number(id)
		);

		return c.json({
			message: `I'm running on Cloudflare Workers.`,
			result: Boolean(zip) ? new ZipDto<Element>(queryResult) : queryResult,
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
			error instanceof HTTPException ? error.status : 500
		);
	});
