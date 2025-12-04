const mongoose = require('mongoose')

// Require MONGODB_URI env var. For Railway, use DATABASE_URL or MONGODB_URI.
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL
if (!MONGODB_URI) {
  const err = new Error(
    'MONGODB_URI env var not set. ' +
    'Set MONGODB_URI or DATABASE_URL to your MongoDB connection string (e.g., mongodb://user:pass@host:27017/dbname).'
  )
  console.error('[db] FATAL ERROR:', err.message)
  process.exit(1)
}

console.info(`[db] connecting to MongoDB: ${MONGODB_URI.replace(/:[^:]*@/, ':***@')}`)

// Connect to MongoDB
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.info('[db] MongoDB connected successfully'))
  .catch(err => {
    console.error('[db] MongoDB connection error:', err.message)
    process.exit(1)
  })

// Schemas
const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  username: { type: String, unique: true, required: true },
  displayName: String,
  teamIds: { type: Map, of: Boolean, default: {} }
}, { collection: 'users' })

const teamSchema = new mongoose.Schema({
  teamId: { type: String, unique: true, required: true },
  ownerId: String,
  displayName: String,
  playerIds: { type: Map, of: Boolean, default: {} },
  awardsList: [String],
  matchIds: { type: Map, of: Boolean, default: {} }
}, { collection: 'teams' })

const playerSchema = new mongoose.Schema({
  playerId: { type: String, unique: true, required: true },
  displayName: String,
  teamId: String,
  matchIds: { type: Map, of: Boolean, default: {} },
  graduationYear: Number
}, { collection: 'players' })

const matchSchema = new mongoose.Schema({
  matchId: { type: String, unique: true, required: true },
  teamId: String,
  date: Number,
  opposingTeamName: String,
  comment: String,
  perPlayerData: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
}, { collection: 'matches' })

// Models
const User = mongoose.model('User', userSchema)
const Team = mongoose.model('Team', teamSchema)
const Player = mongoose.model('Player', playerSchema)
const Match = mongoose.model('Match', matchSchema)

// Wrapper functions to match the old JSON DB interface
async function loadAll() {
  try {
    const [users, teams, players, matches] = await Promise.all([
      User.find({}),
      Team.find({}),
      Player.find({}),
      Match.find({})
    ])
    
    // Convert arrays to objects keyed by ID
    const usersObj = {}
    const teamsObj = {}
    const playersObj = {}
    const matchesObj = {}
    
    users.forEach(u => { usersObj[u.userId] = u.toObject() })
    teams.forEach(t => { teamsObj[t.teamId] = t.toObject() })
    players.forEach(p => { playersObj[p.playerId] = p.toObject() })
    matches.forEach(m => { matchesObj[m.matchId] = m.toObject() })
    
    return { users: usersObj, teams: teamsObj, players: playersObj, matches: matchesObj }
  } catch (err) {
    console.error('[db] error loading data:', err.message)
    return { users: {}, teams: {}, players: {}, matches: {} }
  }
}

async function saveAll({ users, teams, players, matches }) {
  try {
    // Upsert users
    for (const [userId, userData] of Object.entries(users || {})) {
      await User.updateOne({ userId }, userData, { upsert: true })
    }
    // Upsert teams
    for (const [teamId, teamData] of Object.entries(teams || {})) {
      await Team.updateOne({ teamId }, teamData, { upsert: true })
    }
    // Upsert players
    for (const [playerId, playerData] of Object.entries(players || {})) {
      await Player.updateOne({ playerId }, playerData, { upsert: true })
    }
    // Upsert matches
    for (const [matchId, matchData] of Object.entries(matches || {})) {
      await Match.updateOne({ matchId }, matchData, { upsert: true })
    }
  } catch (err) {
    console.error('[db] error saving data:', err.message)
  }
}

module.exports = { loadAll, saveAll }
