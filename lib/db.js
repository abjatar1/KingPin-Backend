const fs = require('fs')
const path = require('path')
const { JsonDB, Config } = require('node-json-db')

const dbFile = path.join(process.cwd(), 'realdata', 'database.json')
fs.mkdirSync(path.dirname(dbFile), { recursive: true })

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
