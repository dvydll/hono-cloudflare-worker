import { DATABASE_DRIVERS, SQLParameter } from './sql-parameter';

export function sql(strings: TemplateStringsArray, ...values: any[]) {
	const sanitizedValues = values.map((val, i) => {
		if (!(val instanceof SQLParameter)) return '?';

		// Pasamos solo los valores reales
		values[i] = val.value;
		return val.toString();
	});

	const query = strings.reduce(
		(acc, str, i) => acc + str + (sanitizedValues[i] ?? ''),
		''
	);

	return { sql: query, args: values };
}

export class QueryBuilder {
	constructor(private driver: string = DATABASE_DRIVERS.SQLITE) {}

	sql(strings: TemplateStringsArray, ...values: any[]) {
		const sanitizedValues = values.map((val, i) => {
			if (!(val instanceof SQLParameter))
				switch (this.driver) {
					case DATABASE_DRIVERS.POSTGRE_SQL:
						return `$${i + 1}`;

					case DATABASE_DRIVERS.SQL_SERVER:
						return `@param${i + 1}`;

					case DATABASE_DRIVERS.MY_SQL:
					case DATABASE_DRIVERS.SQLITE:
					default:
						return '?';
				}

			// Pasamos solo los valores reales
			values[i] = val.value;
			return val.toString();
		});

		const query = strings.reduce(
			(acc, str, i) => acc + str + (sanitizedValues[i] ?? ''),
			''
		);

		return { sql: query, args: values };
	}
}
