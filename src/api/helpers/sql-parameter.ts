class ValidationError extends Error {}

type SQLValue =
	| boolean
	| string
	| number
	| bigint
	| null
	| (boolean | string | number | bigint | null | undefined)[];

export const DATABASE_DRIVERS = {
	POSTGRE_SQL: 'postgresql',
	MY_SQL: 'mysql',
	SQL_SERVER: 'mssql',
	SQLITE: 'sqlite',
} as const;

export class SQLParameter {
	static get COMMON_OPERATORS() {
		return [
			'=', // Igual
			'!=', // Desigual
			'<>', // Desigual (sinónimo de !=)
			'>', // Mayor que
			'<', // Menor que
			'>=', // Mayor o igual que
			'<=', // Menor o igual que
			'IS NULL', // Es nulo
			'IS NOT NULL', // No es nulo
			'IN', // Pertenece a un conjunto
			'NOT IN', // No pertenece a un conjunto
			'LIKE', // Coincide con un patrón
			'NOT LIKE', // No coincide con un patrón
			'BETWEEN', // Está entre dos valores
			'NOT BETWEEN', // No está entre dos valores
			'AND', // Y lógico
			'OR', // O lógico
			'EXISTS', // Existe un conjunto
			'NOT EXISTS', // No existe un conjunto
			'ANY', // Coincide con cualquiera de un conjunto
			'ALL', // Coincide con todos de un conjunto
		] as const;
	}

	static get PG_OPERATORS() {
		return [
			...SQLParameter.COMMON_OPERATORS,
			'ILIKE', // Coincide con un patrón (sin sensibilidad a mayúsculas)
			'NOT ILIKE', // No coincide con un patrón (sin sensibilidad a mayúsculas)
		] as const;
	}

	static get MYSQL_OPERATORS() {
		return [...SQLParameter.COMMON_OPERATORS] as const;
	}

	static get MSSQL_OPERATORS() {
		return [...SQLParameter.COMMON_OPERATORS] as const;
	}

	static get SQLITE_OPERATORS() {
		return [...SQLParameter.COMMON_OPERATORS] as const;
	}

	#field: string;
	#operator: string;
	#value: SQLValue;
	#placeholder: string[];
	// #validOperatorsRegexp: RegExp;

	constructor(
		{
			field,
			value,
			placeholder,
			operator,
			index = 1,
		}: {
			field: string;
			value?: SQLValue;
			operator?: string;
			placeholder?: string | string[];
			index?: number;
		},
		{ driver = DATABASE_DRIVERS.SQLITE }: { driver?: string } = {}
	) {
		const isArrayValue = Array.isArray(value);

		placeholder ??= this.#generatePlaceholders({ value, index, driver });
		operator ??= isArrayValue ? 'IN' : '=';
		operator = operator.toUpperCase();

		const validOperatorsRegexp = this.#getValidOperatorsRegexp(driver);

		if (!validOperatorsRegexp.test(operator))
			throw new ValidationError(`Operador '${operator}' no admitido`, {
				cause: { field, value, operator, index, driver },
			});

		if (operator.includes('BETWEEN') && (!isArrayValue || value.length !== 2))
			throw new ValidationError(
				`El operador '${operator}' requiere exactamente dos placeholders`,
				{ cause: { field, operator, value, index } }
			);

		this.#field = field;
		this.#operator = operator;
		this.#value = isArrayValue ? value : [value];
		this.#placeholder = Array.isArray(placeholder)
			? placeholder
			: [placeholder];
		// this.#validOperatorsRegexp = validOperatorsRegexp;
	}

	get field() {
		return this.#field;
	}

	get operator() {
		return this.#operator;
	}

	get placeholder() {
		return Array.isArray(this.#placeholder) && this.#placeholder.length === 1
			? this.#placeholder[0]
			: this.#placeholder;
	}

	get value() {
		return Array.isArray(this.#value) && this.#value.length === 1
			? this.#value[0]
			: this.#value;
	}

	// set field(value) {
	// 	this.#field = value;
	// }

	// set operator(value) {
	// 	value = value.toUpperCase();

	// 	if (this.#validOperatorsRegexp.test(value))
	// 		throw new ValidationError(`Operador '${value}' no admitido`, {
	// 			cause: { operator: value },
	// 		});

	// 	this.#operator = value;
	// }

	// set placeholder(newValue) {
	// 	let oldValue = this.#value;

	// 	// Si no es un array, se convierte en un array con un solo elemento
	// 	if (!Array.isArray(oldValue))
	// 		oldValue = [oldValue].filter((v) => v === undefined);

	// 	if (!Array.isArray(newValue))
	// 		newValue = [newValue].filter((v) => v === undefined);

	// 	if (this.#operator.includes('BETWEEN') && newValue.length !== 2)
	// 		throw new ValidationError(
	// 			`El operador '${this.#operator}' requiere exactamente dos placeholders`,
	// 			{ cause: { operator: this.#operator, newValue } }
	// 		);

	// 	if (newValue.length !== oldValue.length)
	// 		throw new ValidationError(
	// 			`El número de placeholders debe coincidir con el número de valores`,
	// 			{ cause: { oldValue: this.#placeholder, newValue } }
	// 		);

	// 	if (newValue.some((newPh, idx) => !newPh.includes(this.#placeholder[idx])))
	// 		// Validar que los nuevos placeholder contenga los viejos
	// 		throw new ValidationError(
	// 			`El nuevo placeholder '${newValue}' debe contener '${
	// 				this.#placeholder
	// 			}'`,
	// 			{ cause: { oldValue: this.#placeholder, newValue } }
	// 		);

	// 	this.#placeholder = newValue;
	// }

	// set value(newValue) {
	// 	let oldValue = this.#value;

	// 	// Si no es un array, se convierte en un array con un solo elemento
	// 	if (!Array.isArray(newValue))
	// 		newValue = [newValue].filter((v) => v === undefined);

	// 	if (!Array.isArray(oldValue))
	// 		oldValue = [oldValue].filter((v) => v === undefined);

	// 	if (this.#operator.includes('BETWEEN') && newValue.length !== 2)
	// 		throw new ValidationError(
	// 			`El operador '${this.#operator}' requiere exactamente dos valores`,
	// 			{ cause: { operator: this.#operator, newValue } }
	// 		);

	// 	if (newValue.length !== oldValue?.length)
	// 		throw new ValidationError(
	// 			`El número de nuevos valores debe coincidir con el número de valores antiguo`,
	// 			{ cause: { oldValue, newValue } }
	// 		);

	// 	this.#value = newValue;
	// }

	toString(subQuery = null) {
		switch (this.#operator) {
			case 'IN':
			case 'NOT IN':
				return `${this.#field} ${this.#operator} (${this.#placeholder.join(
					', '
				)})`;

			case 'BETWEEN':
			case 'NOT BETWEEN':
				return `${this.#field} ${this.#operator} ${this.#placeholder[0]} AND ${
					this.#placeholder[1]
				}`;

			case 'IS NULL':
			case 'IS NOT NULL':
				return `${this.#field} ${this.#operator}`; // No necesita placeholder

			case 'EXISTS':
			case 'NOT EXISTS':
				return `${this.#operator} (${subQuery})`;

			case 'ANY':
			case 'ALL':
				return `${this.#field} ${this.#operator} (${subQuery})`;

			default:
				return `${this.#field} ${this.#operator} ${this.#placeholder[0]}`;
		}
	}

	#generatePlaceholders({
		value,
		index,
		driver,
	}: {
		driver: string;
		value?: SQLValue;
		index: number;
	}) {
		switch (driver) {
			case DATABASE_DRIVERS.POSTGRE_SQL:
				return Array.isArray(value)
					? value.map((_, i) => `$${index + i}`)
					: [`$${index}`];

			case DATABASE_DRIVERS.MY_SQL:
			case DATABASE_DRIVERS.SQLITE:
				return Array.isArray(value) ? value.map(() => `?`) : [`?`];

			case DATABASE_DRIVERS.SQL_SERVER:
				return Array.isArray(value)
					? value.map((_, i) => `@param${index + i}`)
					: [`@param${index}`];

			default:
				throw new Error(`El adaptador '${driver}' no está implementado`);
		}
	}

	#getValidOperatorsRegexp(driver: string) {
		switch (driver) {
			case DATABASE_DRIVERS.POSTGRE_SQL:
				return new RegExp(
					`^(${Object.values(SQLParameter.PG_OPERATORS).join('|')})$`
				);

			case DATABASE_DRIVERS.MY_SQL:
			case DATABASE_DRIVERS.SQLITE:
				return new RegExp(
					`^(${Object.values(SQLParameter.MYSQL_OPERATORS).join('|')})$`
				);

			case DATABASE_DRIVERS.SQL_SERVER:
				return new RegExp(
					`^(${Object.values(SQLParameter.MSSQL_OPERATORS).join('|')})$`
				);

			default:
				throw new Error(`El adaptador '${driver}' no está implementado`);
		}
	}
}
