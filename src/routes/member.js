const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { protect, restrictTo } = require('../middleware/auth')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Get my plans
router.get('/my-plans', protect, restrictTo('member'), async (req, res) => {
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('id')
    .eq('profile_id', req.user.id)
    .single()

  if (memberError) return res.status(500).json({ message: memberError.message })

  const { data, error } = await supabase
    .from('assigments')
    .select(`
      *,
      plans (title, type, description, file_url)
    `)
    .eq('member_id', memberData.id)

  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

// Log progress
router.post('/log-progress', protect, restrictTo('member'), async (req, res) => {
  const { weight_kg, workout_done, notes } = req.body

  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('id')
    .eq('profile_id', req.user.id)
    .single()

  if (memberError) return res.status(500).json({ message: memberError.message })

  const { data, error } = await supabase
    .from('progress_logs')
    .insert({
      member_id: memberData.id,
      weight_kg,
      workout_done,
      notes
    })
    .select()

  if (error) return res.status(500).json({ message: error.message })
  res.status(201).json({ message: 'Progress logged successfully', data })
})

// Get my progress logs
router.get('/my-progress', protect, restrictTo('member'), async (req, res) => {
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('id')
    .eq('profile_id', req.user.id)
    .single()

  if (memberError) return res.status(500).json({ message: memberError.message })

  const { data, error } = await supabase
    .from('progress_logs')
    .select('*')
    .eq('member_id', memberData.id)
    .order('logged_at', { ascending: false })

  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

module.exports = router