import { z } from 'zod';

export const videoCompleteSchema = z
  .object({
    playback_seconds: z
      .number({ invalid_type_error: 'playback_seconds harus berupa angka' })
      .min(0, 'playback_seconds tidak boleh negatif')
      .optional(),
  })
  .optional();

export type VideoCompleteInput = z.infer<typeof videoCompleteSchema>;
