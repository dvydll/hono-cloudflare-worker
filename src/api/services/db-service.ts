import type {
	InStatement,
	Client as LibsqlClient,
	ResultSet,
	Row,
} from '@libsql/client/web';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { Condition } from '../helpers/condition';
import { sql } from '../helpers/sql-literal';

const idSchema = z.number().or(z.string()).or(z.bigint());

export class DbService<T extends { id: T['id'] }> {
	constructor(private client: LibsqlClient, private table: string) {}

	async getAll() {
		return await this.client.execute({
			sql: /* sql */ `SELECT * FROM ${this.table};`,
			args: [],
		});
	}

	async getById(id: T['id']) {
		const $id = idSchema.parse(id);
		const result = await this.client.execute({
			sql: /* sql */ `SELECT * FROM ${this.table} WHERE id = $id;`,
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

	async create(input: T | T[]) {
		const COMA_SEPARATOR = ', ' as const;
		const insertInto = /* sql */ `INSERT INTO ${this.table}`;
		let fields: string, values: string;
		if (Array.isArray(input)) {
			const [first] = input;
			fields = Object.keys(first).join(COMA_SEPARATOR);
			values = input.map(this.#buildValues).join(COMA_SEPARATOR);
		} else {
			fields = Object.keys(input).join(COMA_SEPARATOR);
			values = Object.values(input).join(COMA_SEPARATOR);
		}
		const statement = sql` (${fields}) VALUES (${values})`;
		statement.sql = insertInto + statement.sql;
		return await this.client.execute(statement);
	}

	async update() {}

	async delete() {}

	async count() {
		return await this.client.execute(
			/* sql */ `SELECT COUNT(*) AS count FROM ${this.table}`
		);
	}

	async countWhere(conditions: Condition[]) {
		const query = Condition.buildConditions(conditions);
		const statement = /* sql */ `SELECT COUNT(*) AS count FROM ${this.table} WHERE ${query}`;
		return await this.client.execute(statement);
	}

	#buildValues(item: T) {
		return `(${Object.values(item).join(', ')})`;
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
