export class WrongResponseDto {
	constructor(
		public message: string,
		public details: Record<string, unknown>
	) {}
}
