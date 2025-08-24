import { z } from 'zod'

export const Evidence = z.object({
  id: z.string(),
  kind: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'PDF', 'OTHER']),
  sha256: z.string(),
  objectKey: z.string()
})

export type Evidence = z.infer<typeof Evidence>
