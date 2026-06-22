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
// Get dashboard statistics
router.get('/stats', protect, restrictTo('admin'), async (req, res) => {
  try {
    // Get check-ins for the last 14 days
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const { data: checkinData, error: checkinError } = await supabase
      .from('check_ins')
      .select('checked_in_at')
      .gte('checked_in_at', fourteenDaysAgo.toISOString())
      .order('checked_in_at', { ascending: true })

    if (checkinError) return res.status(500).json({ message: checkinError.message })

    // Group check-ins by date
    const dailyCounts = {}
    for (let i = 0; i < 14; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
      const key = d.toISOString().split('T')[0]
      dailyCounts[key] = 0
    }
    checkinData.forEach(c => {
      const key = c.checked_in_at.split('T')[0]
      if (dailyCounts[key] !== undefined) dailyCounts[key]++
    })

    const attendanceTrend = Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      count
    }))

    // Get all members for status breakdown
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('membership_expirey')

    if (memberError) return res.status(500).json({ message: memberError.message })

    const now = new Date()
    let active = 0, expiringSoon = 0, expired = 0
    members.forEach(m => {
      if (!m.membership_expirey) { expired++; return }
      const expiry = new Date(m.membership_expirey)
      if (expiry < now) { expired++ }
      else {
        const diffDays = (expiry - now) / (1000 * 60 * 60 * 24)
        if (diffDays <= 30) { expiringSoon++ }
        else { active++ }
      }
    })

    res.json({
      attendanceTrend,
      membershipBreakdown: { active, expiringSoon, expired, total: members.length }
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats' })
  }
})

module.exports = router