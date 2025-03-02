import type {
	InStatement,
	Client as LibsqlClient,
	ResultSet,
	Row,
} from '@libsql/client/web';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

const idSchema = z.number().or(z.string()).or(z.bigint());

export class DbService<T extends { id: T['id'] }> {
	constructor(private client: LibsqlClient) {}

	async getAll() {
		return await this.client.execute({
			sql: /* sql */ `SELECT * FROM elements;`,
			args: [],
		});
	}

	async getById(id: T['id']) {
		const $id = idSchema.parse(id);
		const result = await this.client.execute({
			sql: /* sql */ `SELECT * FROM elements WHERE id = $id;`,
			args: { $id },
		});

		if (result.rows.length === 0)
			throw new HTTPException(404, {
				message: 'Element not found',
				cause: { id },
			});

		return result;
	}

	async getByQuery(statement: InStatement) {
		const result = await this.client.execute(statement);

		if (result.rows.length === 0)
			throw new HTTPException(404, {
				message: 'Element not found',
				cause: { statement },
			});

		return result;
	}
}

export class ZipDto<T> {
	data: T[];
	meta: Omit<ResultSet, 'rows' | 'columns'>;

	constructor({ columns, rows, ...rest }: ResultSet) {
		this.data = this.#zip(columns, rows);
		this.meta = rest;
	}

	#zip(columns: string[], rows: Row[]): T[] {
		return rows.map((row) =>
			columns.reduce((acc, key, idx) => ({ ...acc, [key]: row[idx] }), {} as T)
		);
	}
}
