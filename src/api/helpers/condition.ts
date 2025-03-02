import { InValue, SQLParameter } from './sql-parameter.js';

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
	static #valuesCollection: Array<InValue> = [];

	static collectValues() {
		return Condition.#valuesCollection.filter((v) => v !== undefined);
	}

	/**
	 * Método para construir condiciones anidadas
	 */
	static buildConditions(
		conditions: ConditionValue | ConditionValue[]
	): string {
		this.#valuesCollection = []; // Limpiar colección de valores
		const conditionsArray = Array.isArray(conditions)
			? conditions
			: [conditions];

		return conditionsArray
			.map((condition) => {
				if (Array.isArray(condition))
					return Condition.buildConditions(condition);

				if (condition instanceof SQLParameter) {
					if (condition.value !== undefined) {
						// Si no es un array, se convierte en un array con un solo elemento
						const valueToPush = Array.isArray(condition.value)
							? condition.value
							: [condition.value];
						Condition.#valuesCollection.push(...valueToPush);
					}

					return condition.toString();
				}

				if (condition instanceof Condition) {
					if (condition.type === ConditionType.GROUP) {
						return `(${Condition.buildConditions(
							Array.isArray(condition.value)
								? condition.value
								: [condition.value]
						)})`;
					}

					if (condition.value instanceof Condition) {
						return `${condition.type} ${Condition.buildConditions([
							condition.value,
						])}`;
					}

					if (Array.isArray(condition.value)) {
						return Condition.buildConditions(condition.value);
					}

					if (condition.value.value !== undefined) {
						// Si no es un array, se convierte en un array con un solo elemento
						const valueToPush = Array.isArray(condition.value.value)
							? condition.value.value
							: [condition.value.value];
						Condition.#valuesCollection.push(...valueToPush);
					}

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
