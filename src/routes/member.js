const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { protect, restrictTo } = require('../middleware/auth')
const { body, validationResult } = require('express-validator')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const handleValidation = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg })
  }
  next()
}

// Get my plans
router.get('/my-plans', protect, restrictTo('member'), async (req, res) => {
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('id')
    .eq('profile_id', req.user.id)
    .single()

  if (memberError) return res.status(500).json({ message: 'Failed to fetch member' })

  const { data, error } = await supabase
    .from('assigments')
    .select(`*, plans (title, type, description, file_url)`)
    .eq('member_id', memberData.id)

  if (error) return res.status(500).json({ message: 'Failed to fetch plans' })
  res.json(data)
})

// Log progress
router.post('/log-progress',
  protect,
  restrictTo('member'),
  [
    body('weight_kg')
      .isFloat({ min: 20, max: 300 }).withMessage('Invalid weight — must be between 20 and 300 kg'),
    body('workout_done')
      .isBoolean().withMessage('workout_done must be true or false'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
  ],
  handleValidation,
  async (req, res) => {
    const { weight_kg, workout_done, notes } = req.body

    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('profile_id', req.user.id)
      .single()

    if (memberError) return res.status(500).json({ message: 'Failed to fetch member' })

    const { data, error } = await supabase
      .from('progress_logs')
      .insert({
        member_id: memberData.id,
        weight_kg,
        workout_done,
        notes
      })
      .select()

    if (error) return res.status(500).json({ message: 'Failed to log progress' })
    res.status(201).json({ message: 'Progress logged successfully', data })
  }
)

// Get my progress logs
router.get('/my-progress', protect, restrictTo('member'), async (req, res) => {
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('id')
    .eq('profile_id', req.user.id)
    .single()

  if (memberError) return res.status(500).json({ message: 'Failed to fetch member' })

  const { data, error } = await supabase
    .from('progress_logs')
    .select('*')
    .eq('member_id', memberData.id)
    .order('logged_at', { ascending: false })

  if (error) return res.status(500).json({ message: 'Failed to fetch progress' })
  res.json(data)
})

module.exports = router