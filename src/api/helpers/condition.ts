import { SQLParameter } from './sql-parameter.js';

export enum ConditionType {
	AND = 'AND',
	OR = 'OR',
	GROUP = 'GROUP',
}

export type ConditionValue =
	| SQLParameter
	| Condition
	| (SQLParameter | Condition)[];

export class Condition {
	/**
	 * Método para construir condiciones anidadas
	 */
	static buildConditions(
		conditions: ConditionValue | ConditionValue[]
	): string {
		if (!Array.isArray(conditions)) conditions = [conditions];

		return conditions
			.map((condition) => {
				if (Array.isArray(condition))
					return Condition.buildConditions(condition);

				if (condition instanceof SQLParameter) return condition.toString();

				if (condition instanceof Condition) {
					if (condition.type === ConditionType.GROUP)
						return `(${Condition.buildConditions(
							Array.isArray(condition.value)
								? condition.value
								: [condition.value]
						)})`;

					if (condition.value instanceof Condition)
						return `${condition.type} ${Condition.buildConditions([
							condition.value,
						])}`;

					return `${condition.type} ${condition.value.toString()}`;
				}
			})
			.join(' ');
	}

	static and(condition: ConditionValue | ConditionValue[]) {
		return new Condition(ConditionType.AND, condition);
	}

	static or(condition: ConditionValue | ConditionValue[]) {
		return new Condition(ConditionType.OR, condition);
	}

	static group(...conditions: ConditionValue[]) {
		return new Condition(ConditionType.GROUP, conditions);
	}

	constructor(
		public type: ConditionType,
		public value: ConditionValue | ConditionValue[]
	) {}
}
