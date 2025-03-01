import type { Client as LibsqlClient, Row } from '@libsql/client/web';

export class DbService<T> {
	constructor(private client: LibsqlClient) {}

	async getAll(): Promise<{
		data: T[];
		meta: {
			columnTypes: string[];
			rowsAffected: number;
			lastInsertRowid?: bigint;
		};
	}> {
		const { columns, rows, ...rest } = await this.client.execute({
			sql: /* sql */ `SELECT * FROM elements;`,
			args: [],
		});

		return { data: this.#zip(columns, rows), meta: { ...rest } };
	}

	async getById(id: number): Promise<{
		data: T[];
		meta: {
			columnTypes: string[];
			rowsAffected: number;
			lastInsertRowid?: bigint;
		};
	}> {
		const { columns, rows, ...rest } = await this.client.execute({
			sql: /* sql */ `SELECT * FROM elements WHERE id = ?;`,
			args: [id],
		});

		return { data: this.#zip(columns, rows), meta: { ...rest } };
	}

	#zip(columns: string[], rows: Row[], initialValue: T = {} as T): T[] {
		return rows.map((row) =>
			columns.reduce((acc, key, idx) => ({ ...acc, [key]: row[idx] }), {
				...initialValue,
			})
		);
	}
}
