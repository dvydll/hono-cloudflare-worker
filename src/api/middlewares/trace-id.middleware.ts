import type { Context, MiddlewareHandler } from 'hono';
import type { AppEnv } from 'types';

import { createMiddleware } from 'hono/factory';

const TRACE_ID_KEY = 'traceId';

export const traceIdMiddleware: MiddlewareHandler<AppEnv> = createMiddleware(
	(c, next) => {
		const traceId = crypto.randomUUID();
		c.set(TRACE_ID_KEY, traceId);
		return next();
	}
);

export const getTraceId = (c: Context<AppEnv>) => {
	const traceId = c.get(TRACE_ID_KEY);
	if (!traceId) throw new Error('No se ha generado el traceId');
	return traceId;
};
