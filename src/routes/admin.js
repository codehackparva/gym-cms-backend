const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { protect, restrictTo } = require('../middleware/auth')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Get all members
router.get('/members', protect, restrictTo('admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      profiles (full_name, phone, role)
    `)

  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

// Add new member
router.post('/members', protect, restrictTo('admin'), async (req, res) => {
  const { full_name, email, password, phone, weight_kg, membership_expirey } = req.body

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: 'member' }
  })

  if (authError) return res.status(400).json({ message: authError.message })

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

  if (error) return res.status(500).json({ message: error.message })
  res.status(201).json({ message: 'Member added successfully', data })
})

// Update member
router.patch('/members/:id', protect, restrictTo('admin'), async (req, res) => {
  const { id } = req.params
  const { weight_kg, status, membership_expirey } = req.body

  const { data, error } = await supabase
    .from('members')
    .update({ weight_kg, status, membership_expirey })
    .eq('id', id)
    .select()

  if (error) return res.status(500).json({ message: error.message })
  res.json({ message: 'Member updated', data })
})

// Get single member
router.get('/members/:id', protect, restrictTo('admin'), async (req, res) => {
  const { id } = req.params

  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      profiles (full_name, phone)
    `)
    .eq('id', id)
    .single()

  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

module.exports = router