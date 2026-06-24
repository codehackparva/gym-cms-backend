import { getSupabase } from './_shared/supabase.mjs'

export default async (req, context) => {
  const { action } = context.params

  if (req.method === 'POST' && action === 'register') return handleRegister(req)
  if (req.method === 'POST' && action === 'login') return handleLogin(req)

  return Response.json({ message: 'Not found' }, { status: 404 })
}

export const config = {
  path: '/api/auth/:action'
}

async function handleRegister(req) {
  try {
    const { full_name, email, password, role } = await req.json()
    const supabase = getSupabase()

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }
    })

    if (error) return Response.json({ message: error.message }, { status: 400 })

    await supabase.from('profiles').insert({
      id: data.user.id,
      full_name,
      role: role || 'member'
    })

    return Response.json({ message: 'User created successfully' }, { status: 201 })
  } catch {
    return Response.json({ message: 'Internal server error' }, { status: 500 })
  }
}

async function handleLogin(req) {
  try {
    const { email, password } = await req.json()
    const supabase = getSupabase()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return Response.json({ message: error.message }, { status: 400 })

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      return Response.json({ message: 'Profile fetch failed', error: profileError.message }, { status: 500 })
    }

    return Response.json({
      token: data.session.access_token,
      role: profile.role,
      full_name: profile.full_name
    })
  } catch {
    return Response.json({ message: 'Internal server error' }, { status: 500 })
  }
}
