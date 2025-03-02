import { Condition } from './condition.js';
import { QueryBuilder } from './query-builder.js';

export class QueryBuilderUpdate extends QueryBuilder {
	#queryParts;

	get queryParts() {
		return { ...this.#queryParts, ...super.queryParts };
	}

	/**
	 * @param {import('pg').PoolClient} client
	 * @param {string} awsRequestId
	 */
	constructor(client, awsRequestId) {
		super(client, awsRequestId);
		this.#queryParts = {
			...super.queryParts,
			placeholders: [],
			/** @type {string[]} */ returning: [],
		};
	}

	/** @param {...(string|string[])} fields */
	returning(...fields) {
		this.#queryParts.returning.push(...fields.flat());
		return this;
	}

	_buildQuery() {
		const {
			schema,
			table,
			fields,
			sqlWhereConditions,
			whereConditions,
			returning,
		} = this.queryParts;
		let whereClause = Array.isArray(sqlWhereConditions)
			? sqlWhereConditions.join(`
	`)
			: sqlWhereConditions;

		if (whereConditions.length)
			whereClause = `${Condition.buildConditions(whereConditions)}
	${whereClause}`;

		const returningClause = returning.length
			? /* sql */ `RETURNING ${returning.join(', ')}`
			: /* sql */ `RETURNING *`;

		const schemaTable = schema ? `${schema}.${table}` : table;
		const query = /* sql */ `UPDATE ${schemaTable}
SET ${fields
			.map(
				(field, idx) => /* sql */ `
	${field} = $${idx + 1}`
			)
			.join(`,	`)}
WHERE
	${whereClause}
${returningClause};`;
		return query;
	}
}
