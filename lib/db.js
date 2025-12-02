const fs = require('fs')
const path = require('path')
const { JsonDB, Config } = require('node-json-db')

// Resolve DB file path. Priority:
// 1. If the common volume mount path `/app/realdata` exists, use it (Railway mount).
// 2. If `JSON_DB_FILE` env var is set, use that exact file path.
// 3. If `REALDATA_DIR` env var is set, use REALDATA_DIR/database.json.
// 4. Fallback to ./realdata/database.json (relative to process.cwd()).
const dbFile = (() => {
  try {
    const mounted = '/app/realdata'
    if (fs.existsSync(mounted)) {
      return path.join(mounted, 'database.json')
    }
  } catch (e) {
    // ignore
  }
  if (process.env.JSON_DB_FILE) return path.resolve(process.env.JSON_DB_FILE)
  if (process.env.REALDATA_DIR) return path.join(path.resolve(process.env.REALDATA_DIR), 'database.json')
  return path.join(process.cwd(), 'realdata', 'database.json')
})()

// Ensure directory exists
fs.mkdirSync(path.dirname(dbFile), { recursive: true })

// Informational log so deploy logs show where DB is written
console.info(`[db] using database file: ${dbFile}`)

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
    db.push('/', initial)
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
  db.push('/', payload, true)
}

module.exports = { loadAll, saveAll }
