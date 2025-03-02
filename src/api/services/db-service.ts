import type { InStatement, Client as LibsqlClient } from '@libsql/client/web';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { Condition, ConditionValue } from '../helpers/condition';
import { sql } from '../helpers/sql-literal';
import { SQLParameter, SQLValue } from '../helpers/sql-parameter';

const idSchema = z.number().or(z.string()).or(z.bigint());
const COMA_SEPARATOR = ', ' as const;

export class DbService<T extends { id?: T['id'] }> {
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
		const statement = sql``;
		let fields: string, values: string;
		if (Array.isArray(input)) {
			const [first] = input;
			fields = Object.keys(first).join(COMA_SEPARATOR);
			values = input
				.map(
					(item) =>
						`(${Object.values(item)
							.map((val) => {
								statement.args.push(val);
								return '?';
							})
							.join(COMA_SEPARATOR)})`
				)
				.join(COMA_SEPARATOR);
		} else {
			fields = Object.keys(input).join(COMA_SEPARATOR);
			values = Object.values(input)
				.map((val) => {
					statement.args.push(val);
					return '?';
				})
				.join(COMA_SEPARATOR);
		}
		statement.sql = /* sql */ `INSERT INTO ${this.table} (${fields}) VALUES (${values})`;
		statement.args = statement.args.flat(Infinity);
		console.log('[DbService.create]', { statement });
		return await this.client.execute(statement);
	}

	async update(input: Partial<T>) {
		const { id, ...inputWithoutId } = input;
		const $id = idSchema.parse(id);
		const statement = sql``;
		const where = new SQLParameter({ field: 'id', value: $id });
		const fields = Object.entries(inputWithoutId)
			.map(([field, val], idx) => {
				const param = new SQLParameter({ field, value: val as SQLValue });
				statement.args.push(val);
				return param.toString();
			})
			.join(COMA_SEPARATOR);
		statement.args.push($id);
		statement.args = statement.args.flat(Infinity);
		statement.sql = /* sql */ `UPDATE ${this.table} SET ${fields} WHERE ${where}`;
		return await this.client.execute(statement);
	}

	async delete(id: T['id']) {
		const $id = idSchema.parse(id);
		const sql = /* sql */ `DELETE FROM ${this.table} WHERE id = $id`;
		return await this.client.execute({ sql, args: { $id } });
	}

	async count() {
		return await this.client.execute(
			/* sql */ `SELECT COUNT(*) AS count FROM ${this.table}`
		);
	}

	async countWhere(...conditions: ConditionValue[]) {
		const query = Condition.buildConditions(conditions);
		const statement = {
			sql: /* sql */ `SELECT COUNT(*) AS count FROM ${this.table} WHERE ${query}`,
			args: Condition.collectValues(),
		};
		return await this.client.execute(statement);
	}
}
