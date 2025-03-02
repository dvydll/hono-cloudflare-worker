import { describe, expect, test } from 'vitest';
import { QueryBuilder, sql } from './sql-literal';
import { DATABASE_DRIVERS, SQLParameter } from './sql-parameter';

describe('sql: template literal function', () => {
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
			{ driver: 'sqlite' }
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

describe('QueryBuilder: sql template literal class', () => {
	test('should replace values with placeholders and return correct args', () => {
		const qb = new QueryBuilder();

		const id = 42;
		const name = 'John';

		const {
			sql,
			args,
		} = qb.sql`SELECT * FROM users WHERE id = ${id} AND name = ${name}`;

		expect(sql).toBe('SELECT * FROM users WHERE id = ? AND name = ?');
		expect(args).toEqual([42, 'John']);
	});

	test('should handle database PostgreSQL driver correctly', () => {
		const qb = new QueryBuilder(DATABASE_DRIVERS.POSTGRE_SQL);
		const age = 30;

		const { sql, args } = qb.sql`SELECT * FROM users WHERE age >= ${age}`;

		expect(sql).toBe('SELECT * FROM users WHERE age >= $1');
		expect(args).toEqual([30]);
	});

	test('should handle database SQLServer driver correctly', () => {
		const qb = new QueryBuilder(DATABASE_DRIVERS.SQL_SERVER);
		const age = 30;

		const { sql, args } = qb.sql`SELECT * FROM users WHERE age >= ${age}`;

		expect(sql).toBe('SELECT * FROM users WHERE age >= @param1');
		expect(args).toEqual([30]);
	});

	test('should handle SQLParameter instances correctly', () => {
		const qb = new QueryBuilder();
		const param = new SQLParameter(
			{ field: 'age', value: 30, operator: '>' },
			{ driver: 'sqlite' }
		);

		const { sql, args } = qb.sql`SELECT * FROM users WHERE ${param}`;

		expect(sql).toBe('SELECT * FROM users WHERE age > ?');
		expect(args).toEqual([30]);
	});

	test('should correctly handle multiple values', () => {
		const qb = new QueryBuilder();
		const [first, second, third] = [1, 2, 3];

		const {
			sql,
			args,
		} = qb.sql`INSERT INTO numbers (num1, num2, num3) VALUES (${first}, ${second}, ${third})`;

		expect(sql).toBe('INSERT INTO numbers (num1, num2, num3) VALUES (?, ?, ?)');
		expect(args).toEqual([1, 2, 3]);
	});

	test('should prevent SQL injection attempts', () => {
		const qb = new QueryBuilder();
		const maliciousValue = 'DROP TABLE users; --';

		const {
			sql,
			args,
		} = qb.sql`SELECT * FROM users WHERE name = ${maliciousValue}`;

		expect(sql).toBe('SELECT * FROM users WHERE name = ?');
		expect(args).toEqual(['DROP TABLE users; --']); // No se ejecuta, solo se pasa como parámetro
	});

	test('should handle empty inputs gracefully', () => {
		const qb = new QueryBuilder();
		const { sql, args } = qb.sql``;

		expect(sql).toBe('');
		expect(args).toEqual([]);
	});
});
