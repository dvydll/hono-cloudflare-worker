import { Condition, ConditionType } from './condition.js';
import { DATABASE_DRIVERS, SQLParameter } from './sql-parameter.js';

type QueryParts = {
	schema?: string;
	table: string;
	fields: string[];
	sqlWhereConditions: string[];
	whereConditions: (SQLParameter | Condition)[];
};

export type WhereObject = {
	field: string;
	value?: string | number | bigint | null | (string | number | bigint)[];
	operator?: string;
	condition?: 'AND' | 'OR';
};

function* nextIndex(startIndex: number = 1) {
	while (true) yield startIndex++;
}

export class SQLBuilder {
	static get BLACKLIST() {
		return [
			'--',
			';',
			'/',
			'@@',
			'@',
			'nvarchar',
			'BEGIN',
			'CURSOR',
			'CREATE',
			'DECLARE',
			'DROP',
			'EXECUTE',
			'FETCH',
			'DELETE',
			'KILL',
			'sysobjects',
			'syscolumns',
			'TABLE',
			'SYSIBM.SYSDUMMY1',
		] as const;
	}

	static isArray(value: unknown) {
		return Array.isArray(value) && value?.length > 0;
	}

	static isAsterisk(value: unknown) {
		return typeof value === 'string' && value.trim() === '*';
	}

	static injectionFilter(query: string) {
		const original = query;
		const blacklistRegex = new RegExp(
			SQLBuilder.BLACKLIST.map((word) => `\\b${word}\\b`).join('|'),
			'gi' // 'g' para búsqueda global y 'i' para ignorar mayúsculas
		);

		if (query?.match(blacklistRegex)) {
			query = query?.replace(blacklistRegex, (matched) => {
				console.warn(
					`[m-injectionFilter] Se ha eliminado de la query '${query}' la palabra '${matched}'.`
				);
				return ''; // Reemplazar coincidencias por una cadena vacía
			});
		}

		if (original !== query)
			console.warn('[injectionFilter] updated', { original, updated: query });

		return query;
	}

	#idxGenerator: Generator<number>;
	#queryParts: QueryParts = {
		schema: '',
		table: '',
		fields: [],
		sqlWhereConditions: [],
		whereConditions: [],
	};
	#values: any[] = [];

	constructor(private driver: string = DATABASE_DRIVERS.SQLITE, idx = 1) {
		this.#idxGenerator = nextIndex(idx);
	}

	get queryParts() {
		return this.#queryParts;
	}

	get values() {
		return this.#values;
	}

	addValues(...values: any[]) {
		this.#values.push(...values.flat().filter((x) => x !== undefined));
	}

	table(table: string, schema?: string) {
		this.#queryParts.table = table.trim();
		this.#queryParts.schema = schema?.trim();
		return this;
	}

	fields(...fields: (string | string[])[]) {
		this.#queryParts.fields.push(...fields.flat());
		return this;
	}

	sqlWhere(...where: (string | string[])[]) {
		this.#queryParts.sqlWhereConditions.push(...where.flat());
		return this;
	}

	where({ field, value, operator, condition }: WhereObject) {
		if (value !== undefined) {
			this.#values.push(value);
		}

		const whereParam = new SQLParameter(
			{
				field,
				value,
				operator,
				index: this.#getNextIndex(),
			},
			{ driver: this.driver }
		);

		switch (condition) {
			case ConditionType.AND:
				this.#queryParts.whereConditions.push(Condition.and(whereParam));
				break;

			case ConditionType.OR:
				this.#queryParts.whereConditions.push(Condition.or(whereParam));
				break;

			default:
				this.#queryParts.whereConditions.push(whereParam);
				break;
		}

		return this;
	}

	whereGroup(
		callback: (sqlb: SQLBuilder, index: number) => void,
		condition = ConditionType.AND
	) {
		const nextIndex = this.#getNextIndex();
		const groupBuilder = new SQLBuilder(this.driver, nextIndex);
		callback(groupBuilder, nextIndex);
		const groupConditions = groupBuilder.queryParts.whereConditions;
		this.#queryParts.whereConditions.push(
			condition === ConditionType.AND
				? Condition.and(Condition.group(groupConditions))
				: Condition.or(Condition.group(groupConditions))
		);
		this.#values.push(
			...groupBuilder.values.filter((val) => val !== undefined)
		);
		return this;
	}

	build() {
		const query = this._buildQuery();
		const validatedQuery = SQLBuilder.injectionFilter(query);
		return { sql: validatedQuery, args: this.values.flat(Infinity) };
	}

	/**
	 * Método para construir la consulta SQL
	 */
	protected _buildQuery(): string {
		const {
			schema,
			table,
			fields,

			whereConditions,
			sqlWhereConditions,
		} = this.queryParts;

		let query = /* sql */ `SELECT ${
			SQLBuilder.isArray(fields) && !SQLBuilder.isAsterisk(fields[0])
				? fields.join(', ')
				: SQLBuilder.isAsterisk(fields)
				? '*'
				: fields
		} FROM ${schema && schema !== '' ? `${schema}.${table}` : table}`;

		if (whereConditions.length || sqlWhereConditions.length) {
			query += /* sql */ ` WHERE 1 = 1`;
		}

		if (whereConditions.length) {
			const whereClause = Condition.buildConditions(whereConditions);
			query += /* sql */ ` AND ${whereClause}`;
		}

		if (sqlWhereConditions?.length)
			query += /* sql */ ` AND ${sqlWhereConditions.join('\n\t')}`;

		return query;
	}

	#getNextIndex() {
		return this.#idxGenerator.next().value!;
	}
}
