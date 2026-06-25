const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { body, validationResult } = require('express-validator')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Validation middleware
const validateLogin = [
  body('email')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .trim()
]

const validateRegister = [
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces'),
  body('email')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .trim(),
  body('role')
    .optional()
    .isIn(['admin', 'trainer', 'member']).withMessage('Invalid role')
]

// Register
router.post('/register', validateRegister, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg })
  }

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

// Login
router.post('/login', validateLogin, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg })
  }

  const { email, password } = req.body

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) return res.status(400).json({ message: 'Invalid email or password' })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', data.user.id)
    .single()

  if (profileError) {
    return res.status(500).json({ message: 'Profile fetch failed' })
  }

  res.json({
    token: data.session.access_token,
    role: profile.role,
    full_name: profile.full_name
  })
})

module.exports = router