import { z } from 'zod';

export const elementSchema = z.object({
	id: z.number().min(1).max(100).optional(),
	elementName: z.string().min(1).max(100),
	atomicNumber: z.number().min(1).max(100),
	symbol: z.string().min(1).max(100),
});

export type Element = z.infer<typeof elementSchema>;
