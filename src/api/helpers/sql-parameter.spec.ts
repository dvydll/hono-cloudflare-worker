import { describe, expect, test } from 'vitest';
import { SQLParameter } from './sql-parameter'; // Ajusta la ruta según tu estructura

const drivers = ['postgresql', 'mysql', 'mssql'];

describe('SQLParameter', () => {
	test('Debe crear instancias correctamente con diferentes drivers', () => {
		drivers.forEach((driver) => {
			const param = new SQLParameter(
				{ field: 'age', operator: '=', value: 30, index: 1 },
				{ driver }
			);
			expect(param.field).toBe('age');
			expect(param.operator).toBe('=');
			expect(param.value).toBe(30);
			switch (driver) {
				case 'postgresql':
					expect(param.placeholder).toBe('$1');
					break;
				case 'mysql':
					expect(param.placeholder).toBe('?');
					break;
				case 'mssql':
					expect(param.placeholder).toBe('@param1');
					break;
			}
		});
	});

	test('Debe lanzar error con un operador no válido', () => {
		expect(
			() =>
				new SQLParameter(
					{ field: 'age', operator: 'INVALID', value: 30, index: 1 },
					{ driver: 'postgresql' }
				)
		).toThrow();
	});

	test('Debe generar placeholders correctamente', () => {
		// PostgreSQL
		const paramPG = new SQLParameter(
			{ field: 'age', operator: '=', value: 30, index: 1 },
			{ driver: 'postgresql' }
		);
		expect(paramPG.placeholder).toEqual('$1');

		const paramPGmulti = new SQLParameter(
			{ field: 'age', operator: 'IN', value: [30, 40, 50], index: 1 },
			{ driver: 'postgresql' }
		);
		expect(paramPGmulti.placeholder).toEqual(['$1', '$2', '$3']);

		// MySQL
		const paramMySQL = new SQLParameter(
			{ field: 'age', operator: '=', value: 30, index: 1 },
			{ driver: 'mysql' }
		);
		expect(paramMySQL.placeholder).toEqual('?');

		const paramMySQLmulti = new SQLParameter(
			{ field: 'age', operator: 'IN', value: [30, 40, 50], index: 1 },
			{ driver: 'mysql' }
		);
		expect(paramMySQLmulti.placeholder).toEqual(['?', '?', '?']);

		// SQL Server
		const paramMSSQL = new SQLParameter(
			{ field: 'age', operator: '=', value: 30, index: 1 },
			{ driver: 'mssql' }
		);
		expect(paramMSSQL.placeholder).toEqual('@param1');

		const paramMSSQLmulti = new SQLParameter(
			{ field: 'age', operator: 'IN', value: [30, 40, 50], index: 1 },
			{ driver: 'mssql' }
		);
		expect(paramMSSQLmulti.placeholder).toEqual([
			'@param1',
			'@param2',
			'@param3',
		]);
	});

	test('Debe manejar valores como arrays correctamente', () => {
		const param = new SQLParameter(
			{ field: 'id', operator: 'IN', value: [1, 2, 3], index: 1 },
			{ driver: 'postgresql' }
		);
		expect(param.placeholder).toEqual(['$1', '$2', '$3']);
	});

	test('Debe retornar el string correcto en toString()', () => {
		const param = new SQLParameter(
			{ field: 'age', operator: '>=', value: 18, index: 1 },
			{ driver: 'postgresql' }
		);
		expect(param.toString()).toBe('age >= $1');
	});
});
