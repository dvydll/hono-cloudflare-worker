import { describe, expect, test } from 'vitest';
import { sql } from './sql-literal';
import { SQLParameter } from './sql-parameter';

function multiplica(a: number, b: number) {
	if (a < 0 || b < 0) return 'error';

	return a * b;
}

describe('sql template literal function', () => {
	test('should replace values with placeholders and return correct args', () => {
		const id = 42;
		const name = 'John';

		const {
			sql: safeSql,
			args,
		} = sql`SELECT * FROM users WHERE id = ${id} AND name = ${name}`;

		expect(safeSql).toBe('SELECT * FROM users WHERE id = ? AND name = ?');
		expect(args).toEqual([42, 'John']);
	});

	test('should handle SQLParameter instances correctly', () => {
		const param = new SQLParameter(
			{ field: 'age', value: 30, operator: '>' },
			{ adapter: 'sqlite' }
		);

		const { sql: query, args } = sql`SELECT * FROM users WHERE ${param}`;

		expect(query).toBe('SELECT * FROM users WHERE age > ?');
		expect(args).toEqual([30]);
	});

	test('should correctly handle multiple values', () => {
		const [first, second, third] = [1, 2, 3];

		const {
			sql: query,
			args,
		} = sql`INSERT INTO numbers (num1, num2, num3) VALUES (${first}, ${second}, ${third})`;

		expect(query).toBe(
			'INSERT INTO numbers (num1, num2, num3) VALUES (?, ?, ?)'
		);
		expect(args).toEqual([1, 2, 3]);
	});

	test('should prevent SQL injection attempts', () => {
		const maliciousValue = 'DROP TABLE users; --';

		const {
			sql: query,
			args,
		} = sql`SELECT * FROM users WHERE name = ${maliciousValue}`;

		expect(query).toBe('SELECT * FROM users WHERE name = ?');
		expect(args).toEqual(['DROP TABLE users; --']); // No se ejecuta, solo se pasa como parámetro
	});

	test('should handle empty inputs gracefully', () => {
		const { sql: query, args } = sql``;

		expect(query).toBe('');
		expect(args).toEqual([]);
	});
});
