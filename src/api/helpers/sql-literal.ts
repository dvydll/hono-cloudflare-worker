import { SQLParameter } from './sql-parameter';

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
