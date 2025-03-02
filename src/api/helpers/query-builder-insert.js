import { QueryBuilder } from './query-builder.js';
import { SQLParameter } from './sql-parameter.js';

export class QueryBuilderInsert extends QueryBuilder {
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
			/** @type {string[]} */ placeholders: [],
			/** @type {string[]} */ returning: [],
		};
	}

	/** @param {...(string | string[])} fields */
	returning(...fields) {
		this.#queryParts.returning.push(...fields.flat());
		return this;
	}

	async insert({ data, sequence, schema, lastIndex = 0 }) {
		/** @type {string[]} */ const rowPlaceholder = [];
		if (sequence) {
			const sqlSequence = schema ? `${schema}.${sequence.name}` : sequence.name;
			const result = await this.client?.query(
				/* sql */ `SELECT nextval('${sqlSequence}')`
			);
			const [{ nextval }] = result?.rows ?? [{ nextval: -1 }];
			sequence.fields.forEach((field) => (data[field] = nextval.toString()));
		}

		const sqlParams = Object.entries(data ?? {}).map(
			([field, value], index) => {
				const val = Array.isArray(value) ? value.shift() : value;
				return new SQLParameter({
					field,
					value: val,
					index: index + 1 + lastIndex,
				});
			}
		);
		sqlParams.forEach(({ field, placeholder, value }) => {
			this.queryParts.fields.push(field);
			rowPlaceholder.push(
				placeholder /** @todo revisar placeholder */
				// Array.isArray(placeholder) ? placeholder.join(', ') : placeholder
			);
			this.values.push(value);
		});
		this.queryParts.placeholders.push(`(${rowPlaceholder.join(', ')})`);
	}

	_buildQuery() {
		const { schema, table, fields, placeholders, returning } = this.queryParts;
		const nonRepeatedFields = [...new Set(fields)];
		const schemaTable = schema && schema !== '' ? `${schema}.${table}` : table;
		const sqlFields = Array.isArray(nonRepeatedFields)
			? nonRepeatedFields.join(`,
	`)
			: nonRepeatedFields;
		const sqlPlaceholders = placeholders.join(`,
	`);
		const returningClause = returning.length
			? /* sql */ `RETURNING ${returning.join(', ')}`
			: /* sql */ `RETURNING *`;
		return /* sql */ `INSERT INTO ${schemaTable} 
(
	${sqlFields}
)
VALUES
	${sqlPlaceholders}
${returningClause};`;
	}
}
