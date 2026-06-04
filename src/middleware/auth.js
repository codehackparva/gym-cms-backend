const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization

  console.log('Auth header:', authHeader)

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, not authorized' })
  }

  const token = authHeader.split(' ')[1]

  console.log('Token received:', token ? 'YES' : 'NO')

  try {
    const { data, error } = await supabase.auth.getUser(token)

    console.log('Supabase user data:', data)
    console.log('Supabase error:', error)

    if (error || !data.user) {
      return res.status(401).json({ message: 'Invalid token', error: error?.message })
    }

    req.user = data.user
    next()
  } catch (err) {
    console.log('Catch error:', err)
    return res.status(401).json({ message: 'Token verification failed' })
  }
}

const restrictTo = (...roles) => {
  return async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single()

      console.log('Profile data:', data)
      console.log('Profile error:', error)

      if (error || !data) {
        return res.status(403).json({ message: 'Access denied' })
      }

      if (!roles.includes(data.role)) {
        return res.status(403).json({ message: 'You do not have permission' })
      }

      req.role = data.role
      next()
    } catch (err) {
      console.log('restrictTo error:', err)
      return res.status(403).json({ message: 'Role check failed' })
    }
  }
}

module.exports = { protect, restrictTo }