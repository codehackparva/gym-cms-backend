const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { protect, restrictTo } = require('../middleware/auth')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Member checks themselves in
router.post('/check-in', protect, restrictTo('member'), async (req, res) => {
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('id')
    .eq('profile_id', req.user.id)
    .single()

  if (memberError) return res.status(500).json({ message: memberError.message })

  // Prevent duplicate check-in same day
  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('check_ins')
    .select('id')
    .eq('member_id', memberData.id)
    .gte('checked_in_at', `${today}T00:00:00`)
    .lte('checked_in_at', `${today}T23:59:59`)

  if (existing && existing.length > 0) {
    return res.status(400).json({ message: 'Already checked in today' })
  }

  const { data, error } = await supabase
    .from('check_ins')
    .insert({ member_id: memberData.id })
    .select()

  if (error) return res.status(500).json({ message: error.message })
  res.status(201).json({ message: 'Checked in successfully', data })
})

// Admin/trainer sees today's check-ins
router.get('/today', protect, restrictTo('admin', 'trainer'), async (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('check_ins')
    .select(`*, members (profiles (full_name))`)
    .gte('checked_in_at', `${today}T00:00:00`)
    .lte('checked_in_at', `${today}T23:59:59`)
    .order('checked_in_at', { ascending: false })

  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

module.exports = router