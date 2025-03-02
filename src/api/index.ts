import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { timeout } from 'hono/timeout';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';

import type { AppEnv } from 'types';
import { WrongResponseDto } from './dto/wrong-response.dto';
import { ZipDto } from './dto/zip.dto';
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
import { elementSchema, type Element } from './schemas/index';

const idSchema = z.object({
	id: z.string().regex(/^\d+$/, { message: 'El id debe ser un número.' }),
	zip: z.enum(['true', 'false']).optional(),
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
		const result = Boolean(zip)
			? new ZipDto<Element>(queryResult)
			: queryResult;
		return c.json(result);
	})

	.get('/count', async (c) => {
		const { atomicNumber } = c.req.query();
		const db = getDbService<Element>(c, 'elements');
		const queryResult = await db.countWhere(
			new SQLParameter({
				field: 'atomicNumber',
				value: atomicNumber.includes(',')
					? atomicNumber.split(',')
					: atomicNumber,
			})
		);
		return c.json(new ZipDto<{ count: number }>(queryResult));
	})

	.get('/:id', zValidator('param', idSchema), async (c) => {
		const db = getDbService<Element>(c, 'elements');
		const { id } = c.req.valid('param');
		const { zip } = c.req.query();
		const queryResult = await db.getById(Number(id));
		const result = Boolean(zip)
			? new ZipDto<Element>(queryResult)
			: queryResult;
		return c.json(result);
	})

	.post('/', zValidator('json', elementSchema), async (c) => {
		const body = c.req.valid('json');
		const { zip } = c.req.query();
		const db = getDbService<Element>(c, 'elements');
		const queryResult = await db.create(body);
		c.status(201);
		return Boolean(zip)
			? c.json(new ZipDto<Element>(queryResult))
			: c.json({ message: 'created', data: [body] });
	})

	.put(
		'/:id',
		zValidator('param', idSchema),
		zValidator('json', elementSchema),
		async (c) => {
			const { id, zip } = c.req.valid('param');
			const body = c.req.valid('json');
			const db = getDbService<Element>(c, 'elements');
			const queryResult = await db.update({ ...body, id: Number(id) });
			return Boolean(zip)
				? c.json(new ZipDto<Element>(queryResult))
				: c.json(queryResult);
		}
	)

	.delete('/:id', zValidator('param', idSchema), async (c) => {
		const { id, zip } = c.req.valid('param');
		const db = getDbService<Element>(c, 'elements');
		const queryResult = await db.delete(Number(id));
		const result = Boolean(zip)
			? new ZipDto<Element>(queryResult)
			: queryResult;
		return c.json(result);
	})

	/**
	 * Si busca una ruta que no existe, se lanza una respuesta 404.
	 */
	.notFound((c) => {
		const { path, method } = c.req;
		const traceId = getTraceId(c);
		const details = { path, method, status: 404 as ContentfulStatusCode };
		const wrong = new WrongResponseDto('No se encontro la ruta', details);
		console.error(`[api.notFound] [${traceId}]`, wrong);
		return c.json(wrong, details.status);
	})

	/**
	 * Actúa como un catch global para evitar envolver cada endpoint individualmente con try/catch.
	 */
	.onError((error, c) => {
		const traceId = c.get('traceId');
		console.error(`[api.error] [${traceId}]`, error);
		const { message, cause } = error;
		const status = error instanceof HTTPException ? error.status : 500;
		const wrong = new WrongResponseDto(message, { error, cause, status });
		return c.json(wrong, status);
	});
