import type { Config as LibsqlConfig } from '@libsql/client/web';
import type { Context, MiddlewareHandler } from 'hono';
import type { AppEnv } from 'hono-cf-worker-template';

import { createClient } from '@libsql/client/web';
import { createMiddleware } from 'hono/factory';

const TURSO_CLIENT_KEY = 'tursoClient';

export const tursoClient: (
	clientConfig?: Omit<LibsqlConfig, 'url' | 'authToken'>
) => MiddlewareHandler<AppEnv> = (
	clientConfig = {}
): MiddlewareHandler<AppEnv> =>
	createMiddleware(async (c, next) => {
		const { TURSO_URL: url, TURSO_AUTH_TOKEN: authToken } = c.env;

		if (!url || !authToken)
			throw new Error('No se ha configurado TURSO_URL o TURSO_AUTH_TOKEN');

		const tursoClient = createClient({ url, authToken, ...clientConfig });

		c.set(TURSO_CLIENT_KEY, tursoClient);

		return await next();
	});

export const getTursoClient = (c: Context<AppEnv>) => {
	const tursoClient = c.get(TURSO_CLIENT_KEY);
	if (!tursoClient) throw new Error('No se ha inicializado el contexto de DB');
	return tursoClient;
};
