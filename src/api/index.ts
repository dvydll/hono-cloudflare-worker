import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { timeout } from 'hono/timeout';
import { z } from 'zod';

import type { AppEnv } from 'types';
import { elementSchema, type Element } from './schemas/index';

import { sql } from './helpers/sql-literal';
import { SQLParameter } from './helpers/sql-parameter';
import {
	getTraceId,
	traceIdMiddleware,
} from './middlewares/trace-id.middleware';
import {
	getDbService,
	tursoClient,
} from './middlewares/turso-client.middleware';
import { ZipDto } from './services/db-service';

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
		const db = getDbService<Element>(c, 'elements');
		const { zip, ...rest } = c.req.query();
		const statement = sql`SELECT * FROM elements`;

		Object.entries(rest).forEach(([field, val], idx) => {
			const value = val.includes(',') ? val.split(',') : val;
			const param = new SQLParameter({ field, value });
			const { sql: query, args } =
				idx === 0 ? sql` WHERE ${param}` : sql` AND ${param}`;

			statement.sql += query;
			statement.args.push(...args);
		});
		// aplana los argumentos de la sentencia porque el driver de sqlite no soporta los arrays
		statement.args = statement.args.flat(Infinity);

		const queryResult = await db.getByQuery(statement);
		return c.json({
			message: `I'm running on Cloudflare Workers.`,
			result: Boolean(zip) ? new ZipDto<Element>(queryResult) : queryResult,
			traceId: getTraceId(c),
		});
	})

	.get('/:id', zValidator('param', idSchema), async (c) => {
		const db = getDbService<Element>(c, 'elements');
		const { id } = c.req.valid('param');
		const { zip } = c.req.query();

		const queryResult = await db.getById(Number(id));

		return c.json({
			message: `I'm running on Cloudflare Workers.`,
			result: Boolean(zip) ? new ZipDto<Element>(queryResult) : queryResult,
			traceId: getTraceId(c),
		});
	})

	.post('/', zValidator('json', elementSchema), async (c) => {
		const body = c.req.valid('json');
		const { zip } = c.req.query();
		const db = getDbService<Element>(c, 'elements');
		const queryResult = await db.create(body);
		return c.json({
			message: `I'm running on Cloudflare Workers.`,
			result: Boolean(zip) ? new ZipDto<Element>(queryResult) : queryResult,
			traceId: getTraceId(c),
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
