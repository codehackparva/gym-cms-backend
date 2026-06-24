import { getSupabase } from './_shared/supabase.mjs'
import { getAuthenticatedUser, checkRole } from './_shared/auth.mjs'

export default async (req, context) => {
  const authResult = await getAuthenticatedUser(req)
  if (authResult.errorResponse) return authResult.errorResponse

  const roleResult = await checkRole(authResult.user.id, 'admin', 'trainer')
  if (roleResult.errorResponse) return roleResult.errorResponse

  const user = authResult.user
  const pathname = new URL(req.url).pathname

  if (pathname === '/api/trainer/members' && req.method === 'GET') return getMembers()

  if (pathname === '/api/trainer/plans') {
    if (req.method === 'GET') return getPlans()
    if (req.method === 'POST') return createPlan(req, user.id)
  }

  if (pathname === '/api/trainer/assign' && req.method === 'POST') return assignPlan(req, user.id)

  if (context.params.member_id && req.method === 'GET') return getAssignments(context.params.member_id)

  return Response.json({ message: 'Not found' }, { status: 404 })
}

export const config = {
  path: [
    '/api/trainer/members',
    '/api/trainer/plans',
    '/api/trainer/assign',
    '/api/trainer/assignments/:member_id'
  ]
}

async function getMembers() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('members')
    .select('*, profiles (full_name, phone)')

  if (error) return Response.json({ message: error.message }, { status: 500 })
  return Response.json(data)
}

async function createPlan(req, userId) {
  try {
    const { title, type, description, file_url } = await req.json()
    const supabase = getSupabase()

    const { data, error } = await supabase.from('plans').insert({
      title,
      type,
      description,
      file_url,
      created_by: userId
    }).select()

    if (error) return Response.json({ message: error.message }, { status: 500 })
    return Response.json({ message: 'Plan created successfully', data }, { status: 201 })
  } catch {
    return Response.json({ message: 'Internal server error' }, { status: 500 })
  }
}

async function getPlans() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('plans')
    .select('*, profiles (full_name)')

  if (error) return Response.json({ message: error.message }, { status: 500 })
  return Response.json(data)
}

async function assignPlan(req, userId) {
  try {
    const { member_id, plan_id } = await req.json()
    const supabase = getSupabase()

    const { data, error } = await supabase.from('assigments').insert({
      member_id,
      plan_id,
      assigned_by: userId
    }).select()

    if (error) return Response.json({ message: error.message }, { status: 500 })
    return Response.json({ message: 'Plan assigned successfully', data }, { status: 201 })
  } catch {
    return Response.json({ message: 'Internal server error' }, { status: 500 })
  }
}

async function getAssignments(memberId) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('assigments')
    .select('*, plans (title, type, description, file_url)')
    .eq('member_id', memberId)

  if (error) return Response.json({ message: error.message }, { status: 500 })
  return Response.json(data)
}
