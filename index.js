/**
 * Typings (JSDoc) — describe the in-memory shapes used in this file.
 *
 * @typedef {Object} TeamSchema
 * @property {Object.<string, any>} playerIds - Map of playerId => player object (simple lookup)
 * @property {string[]} awardsList - Array of award strings
 *
 * @typedef {Object} UserSchema
 * @property {string} userId - Unique user identifier (stored as a string)
 * @property {string} email
 * @property {string} password - Password hash (bcrypt) stored here
 * @property {string} username
 * @property {string} displayName
 * @property {Object.<string, TeamSchema>} teamIds - Map of teamId => TeamSchema
 */

const express = require('express')
const bcrypt = require('bcrypt')
const app = express()
const port = 3000

app.use(express.json())

// Simple in-memory store for users keyed by userId (string)
const users = {}
let nextUserId = 1

// Helper: get safe public view of a user (omit password)
function publicUser(user) {
  if (!user) return null
  const { password, ...rest } = user
  return rest
}

// Simple password check function. Returns true if password matches stored password.
function checkPassword(userId, password) {
  const user = users[String(userId)]
  if (!user) return false
  try {
    return bcrypt.compareSync(password, user.password)
  } catch (err) {
    return false
  }
}

// Basic input sanitization helpers
function sanitizeString(v) {
  if (typeof v !== 'string') return ''
  return v.trim()
}

function isValidEmail(email) {
  if (!email) return false
  // simple email regex (good enough for basic validation)
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
}

function emailExists(email) {
  const e = String(email).toLowerCase()
  return Object.values(users).some(u => String(u.email).toLowerCase() === e)
}

function usernameExists(username) {
  const n = String(username)
  return Object.values(users).some(u => String(u.username) === n)
}

// Middleware to require a valid password provided in the request body.
// The middleware expects the password under either `password` or `currentPassword`.
function requireValidPassword(req, res, next) {
  const userId = req.params.userId
  const provided = req.body.password ?? req.body.currentPassword
  if (!provided) {
    return res.status(400).json({ error: 'password is required in request body' })
  }
  if (!checkPassword(userId, provided)) {
    return res.status(401).json({ error: 'invalid password' })
  }
  next()
}

// Create account
// POST /accounts
// body: { email, password, username, displayName }
app.post('/accounts', (req, res) => {
  let { email, password, username, displayName } = req.body || {}
  email = sanitizeString(email).toLowerCase()
  password = sanitizeString(password)
  username = sanitizeString(username)
  displayName = sanitizeString(displayName) || username

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'email, password and username are required' })
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'invalid email format' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' })
  }
  if (emailExists(email)) {
    return res.status(409).json({ error: 'email already in use' })
  }
  if (usernameExists(username)) {
    return res.status(409).json({ error: 'username already in use' })
  }
  const userId = String(nextUserId++)
  const hashed = bcrypt.hashSync(password, 10)
  /** @type {UserSchema} */
  users[userId] = {
    userId,
    email,
    password: hashed,
    username,
    displayName,
    teamIds: {}
  }
  res.status(201).json({ user: publicUser(users[userId]) })
})

// Change password
// POST /accounts/:userId/password
// body: { currentPassword, newPassword }
app.post('/accounts/:userId/password', requireValidPassword, (req, res) => {
  const userId = req.params.userId
  let { newPassword } = req.body || {}
  newPassword = sanitizeString(newPassword)
  if (!newPassword) return res.status(400).json({ error: 'newPassword is required' })
  if (newPassword.length < 8) return res.status(400).json({ error: 'newPassword must be at least 8 characters' })
  const hashed = bcrypt.hashSync(newPassword, 10)
  users[String(userId)].password = hashed
  res.json({ success: true })
})

// Change display name
// POST /accounts/:userId/displayName
// body: { password, displayName }
app.post('/accounts/:userId/displayName', requireValidPassword, (req, res) => {
  const userId = req.params.userId
  let { displayName } = req.body || {}
  displayName = sanitizeString(displayName)
  if (!displayName) return res.status(400).json({ error: 'displayName is required' })
  users[String(userId)].displayName = displayName
  res.json({ user: publicUser(users[String(userId)]) })
})

// Delete account
// DELETE /accounts/:userId
// body: { password }
app.delete('/accounts/:userId', requireValidPassword, (req, res) => {
  const userId = req.params.userId
  delete users[String(userId)]
  res.json({ success: true })
})

// Optional: get public user info
app.get('/accounts/:userId', (req, res) => {
  const user = users[String(req.params.userId)]
  if (!user) return res.status(404).json({ error: 'user not found' })
  res.json({ user: publicUser(user) })
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

