const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// manually read .env file
const envPath = path.resolve(__dirname, '../../.env')
const envFile = fs.readFileSync(envPath, 'utf8')
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    process.env[key.trim()] = value.trim()
  }
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

module.exports = supabase