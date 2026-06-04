import { getSupabase } from './supabase.mjs'

export async function getAuthenticatedUser(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { errorResponse: Response.json({ message: 'No token, not authorized' }, { status: 401 }) }
  }

  const token = authHeader.split(' ')[1]
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return { errorResponse: Response.json({ message: 'Invalid token' }, { status: 401 }) }
  }

  return { user: data.user }
}

export async function checkRole(userId, ...roles) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return { errorResponse: Response.json({ message: 'Access denied' }, { status: 403 }) }
  }

  if (!roles.includes(data.role)) {
    return { errorResponse: Response.json({ message: 'You do not have permission' }, { status: 403 }) }
  }

  return { role: data.role }
}
