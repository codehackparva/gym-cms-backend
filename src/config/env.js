const fs = require('fs')
const path = require('path')

const envPath = path.resolve(__dirname, '../../.env')
const envFile = fs.readFileSync(envPath, 'utf8')

envFile.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return
  const eqIndex = trimmed.indexOf('=')
  if (eqIndex === -1) return
  const key = trimmed.substring(0, eqIndex).trim()
  const value = trimmed.substring(eqIndex + 1).trim()
  process.env[key] = value
})