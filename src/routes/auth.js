const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

router.post('/register', async (req, res) => {
  const { full_name, email, password, role } = req.body

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role }
  })

  if (error) return res.status(400).json({ message: error.message })

  await supabase.from('profiles').insert({
    id: data.user.id,
    full_name,
    role: role || 'member'
  })

  res.status(201).json({ message: 'User created successfully' })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) return res.status(400).json({ message: error.message })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', data.user.id)
    .single()

  if (profileError) {
    return res.status(500).json({ message: 'Profile fetch failed', error: profileError.message })
  }

  res.json({
    token: data.session.access_token,
    role: profile.role,
    full_name: profile.full_name
  })
})

module.exports = router