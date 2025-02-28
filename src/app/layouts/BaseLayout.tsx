import { Context } from 'hono';
import { jsxRenderer } from 'hono/jsx-renderer';

import { AppEnv } from 'hono-cf-worker-template';

export const BaseLayout = jsxRenderer(
	({ children }, c: Context<AppEnv>) => {
		const title = c.get('title');
		return (
			<html lang='es-ES'>
				<head>
					<meta charset='UTF-8' />
					<meta
						name='viewport'
						content='width=device-width, initial-scale=1.0'
					/>
					<meta http-equiv='X-UA-Compatible' content='ie=edge' />
					<title>{title ?? 'Document'}</title>
					<link rel='stylesheet' href='/style.css' />
					<script type='module' src='/main.js'></script>
				</head>
				<body>{children}</body>
			</html>
		);
	},
	{ docType: '<!DOCTYPE html>' }
);
