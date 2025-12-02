
/*

  this shit WILL CHANGE and IS NOT PERMANENT
  the better one is on the doc
  these schemas are garbage that will be changing rapidly

  MatchSchema
    date (number): UnixTimestamp
    matchId (string)
    opposingTeamName (string)
    perPlayerData {[string]: {
      games ({
        [1] = {
          Wood (int),
          Score (int),
        },
        [2] = {
          Wood (int),
          Score (int),
        },
        [3] = {
          Wood (int),
          Score (int),
        },
      })
    }}
    comment (string)

  PlayerSchema
    playerId (string)
    displayName (string)
    matchIds ({string})
    graduationYear (number)

  TeamSchema
    displayName (string)
    teamId (string)
    playerIds ({string})
    awardsList ({string})

  UserSchema
    userId (string)
    email (string)
    password (string)
    username (string)
    displayName (string)
    teamIds ({string})
  
*/

const express = require('express')
const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')
const db = require('./lib/db')
const app = express()
const port = 3000

app.use(express.json())

// Load persisted data (or initialize empty collections)
const { users, teams, players, matches } = db.loadAll()

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

function sanitizeNumber(v) {
  if (v === undefined || v === null) return null
  const n = Number(v)
  if (Number.isNaN(n)) return null
  return n
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
  const hashed = bcrypt.hashSync(password, 10)
  /** @type {UserSchema} */
  const id = uuidv4()
  users[id] = {
    userId: id,
    email,
    password: hashed,
    username,
    displayName,
    teamIds: {}
  }
  db.saveAll({ users, teams, players, matches })
  res.status(201).json({ user: publicUser(users[id]) })
})

// Login for UI/auth screen
// POST /auth/login
// body: { email, password }
app.post('/auth/login', (req, res) => {
  let { email, password } = req.body || {}
  email = sanitizeString(email).toLowerCase()
  password = sanitizeString(password)
  if (!email || !password) return res.status(400).json({ ok: false, error: 'email and password required' })
  const user = Object.values(users).find(u => String(u.email).toLowerCase() === email)
  if (!user) return res.status(401).json({ ok: false, error: 'invalid credentials' })
  try {
    const ok = bcrypt.compareSync(password, user.password)
    if (!ok) return res.status(401).json({ ok: false, error: 'invalid credentials' })
    // Return a simple success for the login screen; real auth for protected routes still uses password checks
    return res.json({ ok: true, user: publicUser(user) })
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'internal error' })
  }
})

// --- Helpers for teams/players/matches ---
function publicTeam(team) {
  if (!team) return null
  const { /* no secrets currently */ ...rest } = team
  return rest
}

function publicPlayer(player) {
  if (!player) return null
  const { /* internal */ ...rest } = player
  return rest
}

function publicMatch(match) {
  if (!match) return null
  return match
}

function ensureUserAndTeam(userId, teamId) {
  const user = users[String(userId)]
  if (!user) return { ok: false, code: 404, msg: 'user not found' }
  const team = teams[String(teamId)]
  if (!team) return { ok: false, code: 404, msg: 'team not found' }
  if (String(team.ownerId) !== String(user.userId)) return { ok: false, code: 403, msg: 'forbidden: team does not belong to user' }
  return { ok: true, user, team }
}

function deleteTeamCascade(teamId) {
  const t = teams[teamId]
  if (!t) return
  // delete players
  for (const pid of Object.keys(t.playerIds || {})) {
    delete players[pid]
  }
  // delete matches
  for (const mid of Object.keys(t.matchIds || {})) {
    delete matches[mid]
  }
  delete teams[teamId]
}

// --- Team endpoints ---
// Create team: POST /users/:userId/teams  body: { password, displayName }
app.post('/users/:userId/teams', requireValidPassword, (req, res) => {
  const userId = req.params.userId
  let { displayName } = req.body || {}
  displayName = sanitizeString(displayName) || `Team ${Date.now()}`
  const user = users[String(userId)]
  if (!user) return res.status(404).json({ error: 'user not found' })
  const teamId = uuidv4()
  const team = {
    teamId,
    ownerId: user.userId,
    displayName,
    playerIds: {},
    awardsList: [],
    matchIds: {}
  }
  teams[teamId] = team
  user.teamIds[teamId] = true
  db.saveAll({ users, teams, players, matches })
  res.status(201).json({ team: publicTeam(team) })
})

// List teams for user: GET /users/:userId/teams
app.get('/users/:userId/teams', (req, res) => {
  const user = users[String(req.params.userId)]
  if (!user) return res.status(404).json({ error: 'user not found' })
  const list = Object.keys(user.teamIds || {}).map(id => publicTeam(teams[id]))
  res.json({ teams: list })
})

// Get team: GET /users/:userId/teams/:teamId
app.get('/users/:userId/teams/:teamId', (req, res) => {
  const { userId, teamId } = req.params
  const check = ensureUserAndTeam(userId, teamId)
  if (!check.ok) return res.status(check.code).json({ error: check.msg })
  res.json({ team: publicTeam(check.team) })
})

// Update team: PUT /users/:userId/teams/:teamId  body: { password, displayName }
app.put('/users/:userId/teams/:teamId', requireValidPassword, (req, res) => {
  const { userId, teamId } = req.params
  const { displayName } = req.body || {}
  const check = ensureUserAndTeam(userId, teamId)
  if (!check.ok) return res.status(check.code).json({ error: check.msg })
  check.team.displayName = sanitizeString(displayName) || check.team.displayName
  db.saveAll({ users, teams, players, matches })
  res.json({ team: publicTeam(check.team) })
})

// Delete team: DELETE /users/:userId/teams/:teamId  body: { password }
app.delete('/users/:userId/teams/:teamId', requireValidPassword, (req, res) => {
  const { userId, teamId } = req.params
  const check = ensureUserAndTeam(userId, teamId)
  if (!check.ok) return res.status(check.code).json({ error: check.msg })
  deleteTeamCascade(teamId)
  delete users[userId].teamIds[teamId]
  db.saveAll({ users, teams, players, matches })
  res.json({ success: true })
})

// --- Player endpoints ---
// Create player: POST /users/:userId/teams/:teamId/players  body: { password, displayName }
app.post('/users/:userId/teams/:teamId/players', requireValidPassword, (req, res) => {
  const { userId, teamId } = req.params
  let { displayName, graduationYear } = req.body || {}
  const check = ensureUserAndTeam(userId, teamId)
  if (!check.ok) return res.status(check.code).json({ error: check.msg })
  displayName = sanitizeString(displayName) || `Player ${Date.now()}`
  const gy = sanitizeNumber(graduationYear)
  if (gy !== null && (gy < 1900 || gy > 2100)) return res.status(400).json({ error: 'graduationYear must be a valid year' })
  const playerId = uuidv4()
  const player = { playerId, displayName, teamId, matchIds: {}, graduationYear: gy }
  players[playerId] = player
  check.team.playerIds[playerId] = true
  db.saveAll({ users, teams, players, matches })
  res.status(201).json({ player: publicPlayer(player) })
})

// List players: GET /users/:userId/teams/:teamId/players
app.get('/users/:userId/teams/:teamId/players', (req, res) => {
  const { userId, teamId } = req.params
  const check = ensureUserAndTeam(userId, teamId)
  if (!check.ok) return res.status(check.code).json({ error: check.msg })
  const list = Object.keys(check.team.playerIds || {}).map(id => publicPlayer(players[id]))
  res.json({ players: list })
})

// Get player: GET /users/:userId/teams/:teamId/players/:playerId
app.get('/users/:userId/teams/:teamId/players/:playerId', (req, res) => {
  const { userId, teamId, playerId } = req.params
  const check = ensureUserAndTeam(userId, teamId)
  if (!check.ok) return res.status(check.code).json({ error: check.msg })
  const p = players[playerId]
  if (!p || String(p.teamId) !== String(teamId)) return res.status(404).json({ error: 'player not found in team' })
  res.json({ player: publicPlayer(p) })
})

// Update player: PUT /users/:userId/teams/:teamId/players/:playerId  body: { password, displayName }
app.put('/users/:userId/teams/:teamId/players/:playerId', requireValidPassword, (req, res) => {
  const { userId, teamId, playerId } = req.params
  let { displayName, graduationYear } = req.body || {}
  const check = ensureUserAndTeam(userId, teamId)
  if (!check.ok) return res.status(check.code).json({ error: check.msg })
  const p = players[playerId]
  if (!p || String(p.teamId) !== String(teamId)) return res.status(404).json({ error: 'player not found in team' })
  p.displayName = sanitizeString(displayName) || p.displayName
  const gy = sanitizeNumber(graduationYear)
  if (graduationYear !== undefined) {
    if (gy === null || gy < 1900 || gy > 2100) return res.status(400).json({ error: 'graduationYear must be a valid year' })
    p.graduationYear = gy
  }
  db.saveAll({ users, teams, players, matches })
  res.json({ player: publicPlayer(p) })
})

// Delete player: DELETE /users/:userId/teams/:teamId/players/:playerId  body: { password }
app.delete('/users/:userId/teams/:teamId/players/:playerId', requireValidPassword, (req, res) => {
  const { userId, teamId, playerId } = req.params
  const check = ensureUserAndTeam(userId, teamId)
  if (!check.ok) return res.status(check.code).json({ error: check.msg })
  const p = players[playerId]
  if (!p || String(p.teamId) !== String(teamId)) return res.status(404).json({ error: 'player not found in team' })
  // remove from matches perPlayerData
  for (const mid of Object.keys(check.team.matchIds || {})) {
    const m = matches[mid]
    if (m && m.perPlayerData) delete m.perPlayerData[playerId]
  }
  delete players[playerId]
  delete check.team.playerIds[playerId]
  db.saveAll({ users, teams, players, matches })
  res.json({ success: true })
})

// --- Match endpoints ---
// Create match: POST /users/:userId/teams/:teamId/matches  body: { password, date, opposingTeamName }
app.post('/users/:userId/teams/:teamId/matches', requireValidPassword, (req, res) => {
  const { userId, teamId } = req.params
  let { date, opposingTeamName } = req.body || {}
  const check = ensureUserAndTeam(userId, teamId)
  if (!check.ok) return res.status(check.code).json({ error: check.msg })
  date = Number(date) || Date.now()
  opposingTeamName = sanitizeString(opposingTeamName)
  const matchId = uuidv4()
  const perPlayerData = {}
  // initialize perPlayerData.games with slots 1..3 matching the MatchSchema
  for (const pid of Object.keys(check.team.playerIds || {})) {
    perPlayerData[pid] = {
      games: {
        1: { Wood: 0, Score: 0 },
        2: { Wood: 0, Score: 0 },
        3: { Wood: 0, Score: 0 }
      }
    }
  }
  const matchComment = sanitizeString(req.body.comment)
  const match = { matchId, teamId, date, opposingTeamName, comment: matchComment, perPlayerData }
  matches[matchId] = match
  check.team.matchIds[matchId] = true
  db.saveAll({ users, teams, players, matches })
  res.status(201).json({ match: publicMatch(match) })
})

// List matches: GET /users/:userId/teams/:teamId/matches
app.get('/users/:userId/teams/:teamId/matches', (req, res) => {
  const { userId, teamId } = req.params
  const check = ensureUserAndTeam(userId, teamId)
  if (!check.ok) return res.status(check.code).json({ error: check.msg })
  const list = Object.keys(check.team.matchIds || {}).map(id => publicMatch(matches[id]))
  res.json({ matches: list })
})

// Get match: GET /users/:userId/teams/:teamId/matches/:matchId
app.get('/users/:userId/teams/:teamId/matches/:matchId', (req, res) => {
  const { userId, teamId, matchId } = req.params
  const check = ensureUserAndTeam(userId, teamId)
  if (!check.ok) return res.status(check.code).json({ error: check.msg })
  const m = matches[matchId]
  if (!m || String(m.teamId) !== String(teamId)) return res.status(404).json({ error: 'match not found in team' })
  res.json({ match: publicMatch(m) })
})

// Update match meta: PUT /users/:userId/teams/:teamId/matches/:matchId  body: { password, date, opposingTeamName }
app.put('/users/:userId/teams/:teamId/matches/:matchId', requireValidPassword, (req, res) => {
  const { userId, teamId, matchId } = req.params
  let { date, opposingTeamName } = req.body || {}
  const check = ensureUserAndTeam(userId, teamId)
  if (!check.ok) return res.status(check.code).json({ error: check.msg })
  const m = matches[matchId]
  if (!m || String(m.teamId) !== String(teamId)) return res.status(404).json({ error: 'match not found in team' })
  if (date) m.date = Number(date) || m.date
  if (opposingTeamName) m.opposingTeamName = sanitizeString(opposingTeamName)
  if ('comment' in req.body) m.comment = sanitizeString(req.body.comment)
  db.saveAll({ users, teams, players, matches })
  res.json({ match: publicMatch(m) })
})

// Delete match: DELETE /users/:userId/teams/:teamId/matches/:matchId  body: { password }
app.delete('/users/:userId/teams/:teamId/matches/:matchId', requireValidPassword, (req, res) => {
  const { userId, teamId, matchId } = req.params
  const check = ensureUserAndTeam(userId, teamId)
  if (!check.ok) return res.status(check.code).json({ error: check.msg })
  const m = matches[matchId]
  if (!m || String(m.teamId) !== String(teamId)) return res.status(404).json({ error: 'match not found in team' })
  delete matches[matchId]
  delete check.team.matchIds[matchId]
  db.saveAll({ users, teams, players, matches })
  res.json({ success: true })
})

// --- Per-player match data ---
// Set a game entry for a player in a match:
// PUT /users/:userId/teams/:teamId/matches/:matchId/players/:playerId/games/:gameIndex
// body: { password, Wood, Score }
app.put('/users/:userId/teams/:teamId/matches/:matchId/players/:playerId/games/:gameIndex', requireValidPassword, (req, res) => {
  const { userId, teamId, matchId, playerId, gameIndex } = req.params
  let { Wood, Score } = req.body || {}
  const check = ensureUserAndTeam(userId, teamId)
  if (!check.ok) return res.status(check.code).json({ error: check.msg })
  const m = matches[matchId]
  if (!m || String(m.teamId) !== String(teamId)) return res.status(404).json({ error: 'match not found in team' })
  const p = players[playerId]
  if (!p || String(p.teamId) !== String(teamId)) return res.status(404).json({ error: 'player not found in team' })
  const gi = Number(gameIndex)
  if (!Number.isInteger(gi) || gi < 1 || gi > 3) return res.status(400).json({ error: 'gameIndex must be 1, 2 or 3' })
  if (!m.perPlayerData[playerId]) {
    // initialize perPlayerData for the player with schema
    m.perPlayerData[playerId] = { games: { 1: { Wood: 0, Score: 0 }, 2: { Wood: 0, Score: 0 }, 3: { Wood: 0, Score: 0 } } }
  }
  const entry = {
    Wood: Number(Wood) || 0,
    Score: Number(Score) || 0
  }
  m.perPlayerData[playerId].games[gi] = entry
  db.saveAll({ users, teams, players, matches })
  res.json({ playerGame: m.perPlayerData[playerId].games[gi] })
})

// Get per-player data: GET /users/:userId/teams/:teamId/matches/:matchId/players/:playerId
app.get('/users/:userId/teams/:teamId/matches/:matchId/players/:playerId', (req, res) => {
  const { userId, teamId, matchId, playerId } = req.params
  const check = ensureUserAndTeam(userId, teamId)
  if (!check.ok) return res.status(check.code).json({ error: check.msg })
  const m = matches[matchId]
  if (!m || String(m.teamId) !== String(teamId)) return res.status(404).json({ error: 'match not found in team' })
  // ensure we return a games object with keys 1..3
  const pp = m.perPlayerData[playerId] || { games: { 1: { Wood: 0, Score: 0 }, 2: { Wood: 0, Score: 0 }, 3: { Wood: 0, Score: 0 } } }
  // fill missing game slots with defaults
  for (const idx of [1,2,3]) {
    if (!pp.games[idx]) pp.games[idx] = { Wood: 0, Score: 0 }
  }
  res.json({ perPlayerData: pp })
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
  db.saveAll({ users, teams, players, matches })
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
  db.saveAll({ users, teams, players, matches })
  res.json({ user: publicUser(users[String(userId)]) })
})

// Delete account
// DELETE /accounts/:userId
// body: { password }
app.delete('/accounts/:userId', requireValidPassword, (req, res) => {
  const userId = req.params.userId
  delete users[String(userId)]
  db.saveAll({ users, teams, players, matches })
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

// Start server only when run directly. Export `app` for tests.
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
}

module.exports = app

