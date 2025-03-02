import { Condition } from './condition.js';
import { QueryBuilder } from './sql-builder.js';
import { SQLParameter } from './sql-parameter.js';

export class QueryBuilderSelect extends QueryBuilder {
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
			/** @type {string[]} */ joins: [],
			/** @type {string[]} */ sqlJoins: [],
			/** @type {string[]} */ groupByFields: [],
			/** @type {SQLParameter[]} */ havingConditions: [],
			/** @type {string[]} */ orderByFields: [],
			/** @type {number?} */ limit: null,
			/** @type {number?} */ offset: null,
			/** @type {string[]} */ sqlHavingConditions: [],
		};
	}

	/**
	 * @param {Object} param0
	 * @param {string} param0.table
	 * @param {string} param0.condition
	 * @param {string} [param0.type='INNER'] default `INNER`
	 * @example
	 * ```js
	 * // input
	 * { table: 'our_table', condition: 'id IN (2, 3)' }
	 * // build
	 * 'INNER JOIN our_table ON id IN (2, 3)'
	 * ```
	 */
	join({ table, condition, type = 'INNER' }) {
		this.#queryParts.joins.push(
			/* sql */ `${type} JOIN ${table} ON ${condition}`
		);
		return this;
	}

	sqlJoins(/** @type {string[]} */ sqlJoins) {
		this.#queryParts.joins.push(...sqlJoins);
		return this;
	}

	/** @param {...(string|string[])} fields */
	groupBy(...fields) {
		this.#queryParts.groupByFields.push(...fields.flat());
		return this;
	}

	sqlHaving(/** @type {string[]} */ having) {
		this.#queryParts.sqlHavingConditions = having;
		return this;
	}

	/**
	 * @param {Object} param0
	 * @param {string} param0.field
	 * @param {string} [param0.value]
	 * @param {string} [param0.operator]
	 * @param {number} [param0.index]
	 */
	having({ field, value, operator }) {
		if (value !== undefined) this.addValues(value);
		const havingParam = new SQLParameter({
			field,
			value,
			operator,
			index: this.values.length + 2,
		});
		this.#queryParts.havingConditions.push(havingParam);
		return this;
	}

	/** @param {...(string|string[])} fields */
	orderBy(...fields) {
		this.#queryParts.orderByFields.push(...fields.flat());
		return this;
	}

	/** @param {string|number} limit */
	limit(limit) {
		this.#queryParts.limit =
			typeof limit === 'string' ? parseInt(limit) : limit;
		return this;
	}

	/** @param {string|number} offset */
	offset(offset) {
		this.#queryParts.offset =
			typeof offset === 'string' ? parseInt(offset) : offset;
		return this;
	}

	_buildQuery() {
		const {
			schema,
			table,
			fields,
			joins,
			sqlJoins,

			whereConditions,
			sqlWhereConditions,
			sqlOrWhereConditions,
			sqlAndWhereConditions,

			groupByFields,

			sqlHavingConditions,
			havingConditions,
			orderByFields,

			limit,
			offset,
		} = this.queryParts;

		let query = /* sql */ `SELECT
	${
		QueryBuilderSelect.isArray(fields) &&
		!QueryBuilderSelect.isAsterisk(fields[0])
			? fields.join(',\n\t')
			: QueryBuilderSelect.isAsterisk(fields)
			? '*'
			: fields
	}
FROM
	${schema && schema !== '' ? `${schema}.${table}` : table}`;

		if (joins.length) {
			query += /* sql */ `
${joins.join('\n')}`;
		}
		if (sqlJoins?.length) {
			query += /* sql */ `
${sqlJoins.join('\n')}`;
		}

		if (whereConditions.length || sqlWhereConditions.length) {
			query += /* sql */ `
WHERE 1 = 1`;
		}

		if (whereConditions.length) {
			const whereClause = Condition.buildConditions(whereConditions);
			query += /* sql */ `
	${whereClause}`;
		}

		if (sqlWhereConditions?.length)
			query += /* sql */ ` AND ${sqlWhereConditions.join('\n\t')}`;

		// AND conditions
		if (sqlAndWhereConditions?.length)
			query += /* sql */ ` AND (${sqlAndWhereConditions.join(' AND ')})`;

		// OR conditions
		if (sqlOrWhereConditions?.length)
			query += /* sql */ ` OR (${sqlOrWhereConditions.join(' OR ')})`;

		if (groupByFields.length) {
			query += /* sql */ `
GROUP BY
	${groupByFields.join(',\n\t')}`;
		}

		if (havingConditions.length) {
			const havingClause = havingConditions
				.map(
					({ placeholder, field, operator }) =>
						`${field} ${operator} ${placeholder}`
				)
				.join(/* sql */ ` AND `);
			query += /* sql */ `
HAVING
	${havingClause}`;
		}

		if (sqlHavingConditions.length) {
			query += /* sql */ `
HAVING
	${sqlHavingConditions}`;
		}

		if (orderByFields.length) {
			query += /* sql */ `
ORDER BY
	${orderByFields.join(',\n\t')}`;
		}

		if (limit) {
			query += /* sql */ `
LIMIT ${limit}`;
		}

		if (offset) {
			query += /* sql */ `
OFFSET ${offset}`;
		}

		return query;
	}
}
