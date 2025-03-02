import { describe, expect, test } from 'vitest';
import { Condition, ConditionType } from './condition';
import { SQLBuilder } from './sql-builder';

describe('SQLBuilder', () => {
	test('should initialize with empty query parts', () => {
		const builder = new SQLBuilder();
		expect(builder.queryParts.table).toBe('');
		expect(builder.queryParts.fields).toEqual([]);
		expect(builder.queryParts.sqlWhereConditions).toEqual([]);
		expect(builder.queryParts.whereConditions).toEqual([]);
		expect(builder.values).toEqual([]);
	});

	test('should set table and schema', () => {
		const builder = new SQLBuilder().table('users', 'public');
		expect(builder.queryParts.table).toBe('users');
		expect(builder.queryParts.schema).toBe('public');
	});

	test('should add fields', () => {
		const builder = new SQLBuilder().fields('id', 'name', 'email');
		expect(builder.queryParts.fields).toEqual(['id', 'name', 'email']);
	});

	test('should add SQL WHERE conditions', () => {
		const builder = new SQLBuilder().sqlWhere('id = 1', "name = 'John'");
		expect(builder.queryParts.sqlWhereConditions).toEqual([
			'id = 1',
			"name = 'John'",
		]);
	});

	test('should add a simple WHERE condition', () => {
		const builder = new SQLBuilder().where({
			field: 'id',
			value: 1,
			operator: '=',
		});
		expect(builder.queryParts.whereConditions).toHaveLength(1);
		expect(builder.values).toEqual([1]);
	});

	test('should add an AND condition', () => {
		const builder = new SQLBuilder().where({
			field: 'id',
			value: 1,
			operator: '=',
			condition: 'AND',
		});
		expect(builder.queryParts.whereConditions[0]).toBeInstanceOf(Condition);
		expect((builder.queryParts.whereConditions[0] as Condition).type).toBe(
			ConditionType.AND
		);
	});

	test('should add an OR condition', () => {
		const builder = new SQLBuilder().where({
			field: 'id',
			value: 1,
			operator: '=',
			condition: 'OR',
		});
		expect(builder.queryParts.whereConditions[0]).toBeInstanceOf(Condition);
		expect((builder.queryParts.whereConditions[0] as Condition).type).toBe(
			ConditionType.OR
		);
	});

	test('should create a grouped WHERE condition', () => {
		const builder = new SQLBuilder().whereGroup((qb) => {
			qb.where({ field: 'age', value: 30, operator: '>' });
			qb.where({
				field: 'name',
				value: 'Alice',
				operator: '=',
				condition: 'OR',
			});
		}, ConditionType.AND);

		expect(builder.queryParts.whereConditions[0]).toBeInstanceOf(Condition);
		expect((builder.queryParts.whereConditions[0] as Condition).type).toBe(
			ConditionType.AND
		);
	});

	test('should filter out SQL injection attempts', () => {
		const maliciousQuery = 'DROP TABLE users; --';
		const filteredQuery = SQLBuilder.injectionFilter(maliciousQuery);
		expect(filteredQuery).not.toContain('DROP TABLE');
		expect(filteredQuery).toBe('');
	});

	test('should add multiple values', () => {
		const builder = new SQLBuilder();
		builder.addValues(1, 'test', null);
		expect(builder.values).toEqual([1, 'test', null]);
	});

	test('should build a simple query', () => {
		const query = new SQLBuilder()
			.table('users', 'public')
			.fields('username', 'age')
			.where({ field: 'id', value: 1 })
			.where({ field: 'username', value: 'John', condition: ConditionType.AND })
			.whereGroup((qb) => {
				qb.where({ field: 'age', value: 30 });
				qb.where({
					field: 'is_working',
					value: 'false',
					condition: ConditionType.AND,
				});
			}, ConditionType.OR)
			.build();

		expect(query.sql).toBe(
			/* sql */ `SELECT username, age FROM public.users WHERE 1 = 1 AND id = $1 AND username = $2 OR (age = $3 AND is_working = $4)`
		);
		expect(query.args).toEqual([1, 'John', 30, 'false']);
	});
});
