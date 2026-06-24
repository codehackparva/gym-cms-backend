import { getSupabase } from './_shared/supabase.mjs'
import { getAuthenticatedUser, checkRole } from './_shared/auth.mjs'

export default async (req, context) => {
  const authResult = await getAuthenticatedUser(req)
  if (authResult.errorResponse) return authResult.errorResponse

  const roleResult = await checkRole(authResult.user.id, 'admin')
  if (roleResult.errorResponse) return roleResult.errorResponse

  const { id } = context.params

  if (id !== undefined) {
    if (req.method === 'GET') return getMember(id)
    if (req.method === 'PATCH') return updateMember(req, id)
    return Response.json({ message: 'Method not allowed' }, { status: 405 })
  }

  if (req.method === 'GET') return getMembers()
  if (req.method === 'POST') return addMember(req)
  return Response.json({ message: 'Method not allowed' }, { status: 405 })
}

export const config = {
  path: ['/api/admin/members', '/api/admin/members/:id']
}

async function getMembers() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('members')
    .select('*, profiles (full_name, phone, role)')

  if (error) return Response.json({ message: error.message }, { status: 500 })
  return Response.json(data)
}

async function addMember(req) {
  try {
    const { full_name, email, password, phone, weight_kg, membership_expirey } = await req.json()
    const supabase = getSupabase()

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'member' }
    })
    if (authError) return Response.json({ message: authError.message }, { status: 400 })

    await supabase.from('profiles').insert({
      id: authData.user.id,
      full_name,
      phone,
      role: 'member'
    })

    const { data, error } = await supabase.from('members').insert({
      profile_id: authData.user.id,
      weight_kg,
      membership_expirey,
      status: 'active'
    }).select()

    if (error) return Response.json({ message: error.message }, { status: 500 })
    return Response.json({ message: 'Member added successfully', data }, { status: 201 })
  } catch {
    return Response.json({ message: 'Internal server error' }, { status: 500 })
  }
}

async function updateMember(req, id) {
  try {
    const { weight_kg, status, membership_expirey } = await req.json()
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('members')
      .update({ weight_kg, status, membership_expirey })
      .eq('id', id)
      .select()

    if (error) return Response.json({ message: error.message }, { status: 500 })
    return Response.json({ message: 'Member updated', data })
  } catch {
    return Response.json({ message: 'Internal server error' }, { status: 500 })
  }
}

async function getMember(id) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('members')
    .select('*, profiles (full_name, phone)')
    .eq('id', id)
    .single()

  if (error) return Response.json({ message: error.message }, { status: 500 })
  return Response.json(data)
}
