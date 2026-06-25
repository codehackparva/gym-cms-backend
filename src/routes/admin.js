const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { protect, restrictTo } = require('../middleware/auth')
const { body, param, validationResult } = require('express-validator')

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

// Get all members
router.get('/members', protect, restrictTo('admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('members')
    .select(`*, profiles (full_name, phone, role)`)

  if (error) return res.status(500).json({ message: 'Failed to fetch members' })
  res.json(data)
})

// Add new member
router.post('/members',
  protect,
  restrictTo('admin'),
  [
    body('full_name')
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters')
      .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces'),
    body('email')
      .isEmail().withMessage('Invalid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone')
      .optional()
      .trim()
      .matches(/^[0-9+\-\s]{7,15}$/).withMessage('Invalid phone number'),
    body('weight_kg')
      .optional()
      .isFloat({ min: 20, max: 300 }).withMessage('Invalid weight'),
    body('membership_expirey')
      .optional()
      .isDate().withMessage('Invalid date format')
  ],
  handleValidation,
  async (req, res) => {
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

    if (error) return res.status(500).json({ message: 'Failed to create member' })
    res.status(201).json({ message: 'Member added successfully', data })
  }
)

// Update member
router.patch('/members/:id',
  protect,
  restrictTo('admin'),
  [
    param('id').isUUID().withMessage('Invalid member ID'),
    body('weight_kg')
      .optional()
      .isFloat({ min: 20, max: 300 }).withMessage('Invalid weight'),
    body('membership_expirey')
      .optional()
      .isDate().withMessage('Invalid date format'),
    body('status')
      .optional()
      .isIn(['active', 'inactive']).withMessage('Invalid status')
  ],
  handleValidation,
  async (req, res) => {
    const { id } = req.params
    const { weight_kg, status, membership_expirey } = req.body

    const { data, error } = await supabase
      .from('members')
      .update({ weight_kg, status, membership_expirey })
      .eq('id', id)
      .select()

    if (error) return res.status(500).json({ message: 'Failed to update member' })
    res.json({ message: 'Member updated', data })
  }
)

// Get single member
router.get('/members/:id',
  protect,
  restrictTo('admin'),
  [param('id').isUUID().withMessage('Invalid member ID')],
  handleValidation,
  async (req, res) => {
    const { id } = req.params

    const { data, error } = await supabase
      .from('members')
      .select(`*, profiles (full_name, phone)`)
      .eq('id', id)
      .single()

    if (error) return res.status(500).json({ message: 'Failed to fetch member' })
    res.json(data)
  }
)

module.exports = router