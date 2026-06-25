const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, not authorized' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    req.user = data.user
    next()
  } catch (err) {
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

      if (error || !data) {
        return res.status(403).json({ message: 'Access denied' })
      }

      if (!roles.includes(data.role)) {
        return res.status(403).json({ message: 'You do not have permission' })
      }

      req.role = data.role
      next()
    } catch (err) {
      return res.status(403).json({ message: 'Role check failed' })
    }
  }
}

module.exports = { protect, restrictTo }