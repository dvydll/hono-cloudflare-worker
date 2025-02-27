declare module 'hono-cloudflare-worker' {
	export type Bindings = {
		PORT: number;
		API_URL: string;
		API_KEY: string;
	};

	export type AppEnv = {
		Bindings: Bindings;
		Variables: {};
	};
}
