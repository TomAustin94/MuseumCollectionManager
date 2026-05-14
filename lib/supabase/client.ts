import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createClient = () => createClientComponentClient<any>()
