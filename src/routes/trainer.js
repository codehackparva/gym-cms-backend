const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { protect, restrictTo } = require('../middleware/auth')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Get all members
router.get('/members', protect, restrictTo('admin', 'trainer'), async (req, res) => {
  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      profiles (full_name, phone)
    `)

  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

// Create a plan
router.post('/plans', protect, restrictTo('admin', 'trainer'), async (req, res) => {
  const { title, type, description, file_url } = req.body

  const { data, error } = await supabase
    .from('plans')
    .insert({
      title,
      type,
      description,
      file_url,
      created_by: req.user.id
    })
    .select()

  if (error) return res.status(500).json({ message: error.message })
  res.status(201).json({ message: 'Plan created successfully', data })
})

// Get all plans
router.get('/plans', protect, restrictTo('admin', 'trainer'), async (req, res) => {
  const { data, error } = await supabase
    .from('plans')
    .select(`
      *,
      profiles (full_name)
    `)

  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

// Assign plan to member
router.post('/assign', protect, restrictTo('admin', 'trainer'), async (req, res) => {
  const { member_id, plan_id } = req.body

  const { data, error } = await supabase
    .from('assigments')
    .insert({
      member_id,
      plan_id,
      assigned_by: req.user.id
    })
    .select()

  if (error) return res.status(500).json({ message: error.message })
  res.status(201).json({ message: 'Plan assigned successfully', data })
})

// Get assignments for a member
router.get('/assignments/:member_id', protect, restrictTo('admin', 'trainer'), async (req, res) => {
  const { member_id } = req.params

  const { data, error } = await supabase
    .from('assigments')
    .select(`
      *,
      plans (title, type, description, file_url)
    `)
    .eq('member_id', member_id)

  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

module.exports = router