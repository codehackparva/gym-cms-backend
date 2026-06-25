require('./config/env')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const authRoutes = require('./routes/auth')
const adminRoutes = require('./routes/admin')
const trainerRoutes = require('./routes/trainer')
const memberRoutes = require('./routes/member')
const checkinRoutes = require('./routes/checkin')

const app = express()

// Security headers
app.use(helmet())

// CORS — only allow your frontend
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://gym-cms-smoky.vercel.app'
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json({ limit: '10kb' }))

// Global rate limiter — max 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later' }
})
app.use(globalLimiter)

// Stricter rate limit for auth routes — max 10 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts, please try again later' }
})
app.use('/api/auth', authLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/trainer', trainerRoutes)
app.use('/api/member', memberRoutes)
app.use('/api/checkin', checkinRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'Gym CMS API is running' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})