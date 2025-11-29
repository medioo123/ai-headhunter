import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { functions } from '@/lib/inngest/functions'

// Create the Inngest API route handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})
