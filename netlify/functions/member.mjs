import { getSupabase } from './_shared/supabase.mjs'
import { getAuthenticatedUser, checkRole } from './_shared/auth.mjs'

export default async (req, context) => {
  const authResult = await getAuthenticatedUser(req)
  if (authResult.errorResponse) return authResult.errorResponse

  const roleResult = await checkRole(authResult.user.id, 'member')
  if (roleResult.errorResponse) return roleResult.errorResponse

  const user = authResult.user
  const pathname = new URL(req.url).pathname

  if (pathname === '/api/member/my-plans' && req.method === 'GET') return getMyPlans(user.id)
  if (pathname === '/api/member/log-progress' && req.method === 'POST') return logProgress(req, user.id)
  if (pathname === '/api/member/my-progress' && req.method === 'GET') return getMyProgress(user.id)

  return Response.json({ message: 'Not found' }, { status: 404 })
}

export const config = {
  path: ['/api/member/my-plans', '/api/member/log-progress', '/api/member/my-progress']
}

async function getMyPlans(userId) {
  const supabase = getSupabase()
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('id')
    .eq('profile_id', userId)
    .single()

  if (memberError) return Response.json({ message: memberError.message }, { status: 500 })

  const { data, error } = await supabase
    .from('assigments')
    .select('*, plans (title, type, description, file_url)')
    .eq('member_id', memberData.id)

  if (error) return Response.json({ message: error.message }, { status: 500 })
  return Response.json(data)
}

async function logProgress(req, userId) {
  try {
    const { weight_kg, workout_done, notes } = await req.json()
    const supabase = getSupabase()

    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('profile_id', userId)
      .single()

    if (memberError) return Response.json({ message: memberError.message }, { status: 500 })

    const { data, error } = await supabase.from('progress_logs').insert({
      member_id: memberData.id,
      weight_kg,
      workout_done,
      notes
    }).select()

    if (error) return Response.json({ message: error.message }, { status: 500 })
    return Response.json({ message: 'Progress logged successfully', data }, { status: 201 })
  } catch {
    return Response.json({ message: 'Internal server error' }, { status: 500 })
  }
}

async function getMyProgress(userId) {
  const supabase = getSupabase()
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('id')
    .eq('profile_id', userId)
    .single()

  if (memberError) return Response.json({ message: memberError.message }, { status: 500 })

  const { data, error } = await supabase
    .from('progress_logs')
    .select('*')
    .eq('member_id', memberData.id)
    .order('logged_at', { ascending: false })

  if (error) return Response.json({ message: error.message }, { status: 500 })
  return Response.json(data)
}
