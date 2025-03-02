import type { ResultSet, Row } from '@libsql/client/web';

export class ZipDto<T> {
	data: T[];
	meta: Omit<ResultSet, 'rows' | 'columns' | 'lastInsertRowid'> & {
		lastInsertRowid?: string;
	};

	constructor({ columns, rows, ...rest }: ResultSet) {
		const { lastInsertRowid, ...restWithoutLastInsertRowid } = rest;
		this.data = this.#zip(columns, rows);
		this.meta = {
			lastInsertRowid: lastInsertRowid?.toString(),
			...restWithoutLastInsertRowid,
		};
	}

	#zip(columns: string[], rows: Row[]): T[] {
		return rows.map((row) =>
			columns.reduce((acc, key, idx) => ({ ...acc, [key]: row[idx] }), {} as T)
		);
	}
}
