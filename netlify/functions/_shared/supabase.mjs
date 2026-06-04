import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  return createClient(
    Netlify.env.get('SUPABASE_URL'),
    Netlify.env.get('SUPABASE_SERVICE_KEY')
  )
}
