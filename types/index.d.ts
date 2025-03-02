import type { Client as LibsqlClient } from '@libsql/client/web';

type UUID = `${string}-${string}-${string}-${string}`;

export type Bindings = {
	PORT: number;
	TURSO_URL: string;
	TURSO_AUTH_TOKEN: string;
};

export type Variables = {
	tursoClient: LibsqlClient;
	traceId: UUID;
	title?: string;
};

export type AppEnv = {
	Bindings: Bindings;
	Variables: Variables;
};
