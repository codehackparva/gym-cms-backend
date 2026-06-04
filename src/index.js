require('./config/env')
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const adminRoutes = require('./routes/admin')
const trainerRoutes = require('./routes/trainer')
const memberRoutes = require('./routes/member')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/trainer', trainerRoutes)
app.use('/api/member', memberRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'Gym CMS API is running' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})