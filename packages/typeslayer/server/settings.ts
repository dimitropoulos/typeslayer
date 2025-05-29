import { z } from "zod/v4";

export const settingsInput = z.object({
	simplifyPaths: z.boolean(),
});

export type Settings = z.infer<typeof settingsInput>;

export const settings: Settings = {
	simplifyPaths: true,
};
