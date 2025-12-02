const fs = require('fs')
const path = require('path')
const { JsonDB, Config } = require('node-json-db')

// Require RAILWAY_VOLUME_MOUNT_PATH env var (set automatically by Railway).
// No fallbacks — fail fast if volume is not mounted.
if (!process.env.RAILWAY_VOLUME_MOUNT_PATH) {
  const err = new Error(
    'RAILWAY_VOLUME_MOUNT_PATH env var not set. ' +
    'Ensure a volume is attached to this service in Railway and the mount path is configured.'
  )
  console.error('[db] FATAL ERROR:', err.message)
  process.exit(1)
}

const dbFile = path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'database.json')

// Ensure directory exists
fs.mkdirSync(path.dirname(dbFile), { recursive: true })

// Informational log so deploy logs show where DB is written
console.info(`[db] using database file: ${dbFile}`)

// Ensure the DB file exists and is writable. Create a minimal initial file if missing.
try {
  const initialPayload = JSON.stringify({ users: {}, teams: {}, players: {}, matches: {} }, null, 2)
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, initialPayload, { flag: 'wx' })
    console.info(`[db] created initial database file at ${dbFile}`)
  } else {
    // test read/write access
    fs.accessSync(dbFile, fs.constants.R_OK | fs.constants.W_OK)
    console.info(`[db] database file exists and is writable: ${dbFile}`)
  }
} catch (err) {
  console.error(`[db] ERROR: cannot create or access database file at ${dbFile}: ${err && err.message}`)
}

const db = new JsonDB(new Config(dbFile, true, true, '/'))

function loadAll() {
  try {
    const data = db.getData('/')
    data.users = data.users || {}
    data.teams = data.teams || {}
    data.players = data.players || {}
    data.matches = data.matches || {}
    return data
  } catch (err) {
    const initial = { users: {}, teams: {}, players: {}, matches: {} }
    try {
      db.push('/', initial)
    } catch (e) {
      // if push fails, log it — higher-level code can still call saveAll later
      console.error('[db] failed to initialize DB with node-json-db:', e && e.message)
    }
    return initial
  }
}

function saveAll({ users, teams, players, matches }) {
  const payload = {
    users: users || {},
    teams: teams || {},
    players: players || {},
    matches: matches || {}
  }
  try {
    db.push('/', payload, true)
  } catch (e) {
    console.error('[db] failed to save DB:', e && e.message)
  }
}

module.exports = { loadAll, saveAll }
