import { Hono } from 'hono';

import type { AppEnv } from 'types';
import { BaseLayout } from './layouts/BaseLayout';

export const app = new Hono<AppEnv>()

	.use('*', BaseLayout)

	.get('/', (c) => {
		c.set('title', 'Hola mundo!');
		return c.render(<h1>Hola mundo!</h1>);
	});
