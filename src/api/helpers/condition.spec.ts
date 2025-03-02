import { describe, expect, test } from 'vitest';
import { Condition, ConditionType } from './condition';
import { DATABASE_DRIVERS, SQLParameter } from './sql-parameter';

describe('Condition', () => {
	test('should create an AND condition', () => {
		const condition = Condition.and(
			new SQLParameter({ field: 'field', operator: '=', value: 1 })
		);
		expect(condition.type).toBe(ConditionType.AND);
		expect(condition.value).toBeInstanceOf(SQLParameter);
	});

	test('should create an OR condition', () => {
		const condition = Condition.or(
			new SQLParameter({ field: 'field', operator: '=', value: 2 })
		);
		expect(condition.type).toBe(ConditionType.OR);
		expect(condition.value).toBeInstanceOf(SQLParameter);
	});

	test('should create a GROUP condition', () => {
		const condition = Condition.group(
			new SQLParameter({ field: 'field', value: 1 }),
			new SQLParameter({ field: 'field', value: 2 })
		);
		expect(condition.type).toBe(ConditionType.GROUP);
		expect(Array.isArray(condition.value)).toBe(true);
		expect(condition.value).toHaveLength(2);
	});

	test('should build simple conditions', () => {
		const sqlParam1 = new SQLParameter(
			{ field: 'field_1', value: 1 },
			{ driver: DATABASE_DRIVERS.SQL_SERVER }
		);
		const sqlParam2 = new SQLParameter(
			{
				field: 'field_2',
				value: [2, 3],
				index: 2,
			},
			{ driver: DATABASE_DRIVERS.SQL_SERVER }
		);

		const condition = Condition.buildConditions([sqlParam1, sqlParam2]);
		expect(condition).toBe('field_1 = @param1 field_2 IN (@param2, @param3)');
	});

	test('should build nested AND conditions', () => {
		const condition = Condition.and(
			new SQLParameter(
				{ field: 'field', operator: 'BETWEEN', value: [1, 2] },
				{ driver: DATABASE_DRIVERS.POSTGRE_SQL }
			)
		);
		const result = Condition.buildConditions([condition]);
		expect(result).toBe('AND field BETWEEN $1 AND $2');
	});

	test('should build nested OR conditions', () => {
		const condition = Condition.or(
			new SQLParameter({ field: 'field', operator: '=', value: 2 })
		);
		const result = Condition.buildConditions([condition]);
		expect(result).toBe('OR field = ?');
	});

	test('should build grouped conditions', () => {
		const sqlParam1 = new SQLParameter(
			{
				field: 'field_1',
				value: [1, 2, 3, 4, 5],
			},
			{ driver: DATABASE_DRIVERS.POSTGRE_SQL }
		);
		const sqlParam2 = new SQLParameter(
			{
				field: 'field_2',
				operator: '=',
				value: 2,
				index: Array.isArray(sqlParam1.value) ? sqlParam1.value.length + 1 : 2,
			},
			{ driver: DATABASE_DRIVERS.POSTGRE_SQL }
		);
		const condition = Condition.group(sqlParam1, Condition.and(sqlParam2));
		const result = Condition.buildConditions([condition]);
		expect(result).toBe('(field_1 IN ($1, $2, $3, $4, $5) AND field_2 = $6)');
	});

	test('should build deeply nested conditions', () => {
		const condition = Condition.and(
			Condition.group(
				new SQLParameter(
					{ field: 'field_1', value: 1 },
					{ driver: DATABASE_DRIVERS.POSTGRE_SQL }
				),
				Condition.or(
					new SQLParameter(
						{ field: 'field_2', value: 2, index: 2 },
						{ driver: DATABASE_DRIVERS.POSTGRE_SQL }
					)
				)
			)
		);
		const result = Condition.buildConditions([condition]);
		expect(result).toBe('AND (field_1 = $1 OR field_2 = $2)');
	});

	test('should handle empty conditions', () => {
		const result = Condition.buildConditions([]);
		expect(result).toBe('');
	});
});
