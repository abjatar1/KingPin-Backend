const request = require('supertest')
const { expect } = require('chai')
const app = require('..')

describe('Full good-flow integration', function() {
  this.timeout(5000)
  let userId, teamId, playerId, matchId
  const password = 'password123'

  it('creates an account', async () => {
    const res = await request(app)
      .post('/accounts')
      .send({ email: 'flow@example.com', password, username: 'flowuser', displayName: 'Flow User' })
      .expect(201)
    expect(res.body).to.have.property('user')
    const u = res.body.user
    expect(u).to.have.property('userId')
    expect(u).to.have.property('email', 'flow@example.com')
    expect(u).to.not.have.property('password')
    userId = u.userId
  })

  it('creates a team', async () => {
    const res = await request(app)
      .post(`/users/${userId}/teams`)
      .send({ password, displayName: 'Flow Team' })
      .expect(201)
    expect(res.body).to.have.property('team')
    teamId = res.body.team.teamId
    expect(teamId).to.be.a('string')
  })

  it('creates a player', async () => {
    const res = await request(app)
      .post(`/users/${userId}/teams/${teamId}/players`)
      .send({ password, displayName: 'Player One', graduationYear: 2026 })
      .expect(201)
    expect(res.body).to.have.property('player')
    playerId = res.body.player.playerId
    expect(playerId).to.be.a('string')
  })

  it('creates a match', async () => {
    const res = await request(app)
      .post(`/users/${userId}/teams/${teamId}/matches`)
      .send({ password, date: Date.now(), opposingTeamName: 'Opponents' })
      .expect(201)
    expect(res.body).to.have.property('match')
    matchId = res.body.match.matchId
    expect(matchId).to.be.a('string')
  })

  it('updates a player game entry', async () => {
    const res = await request(app)
      .put(`/users/${userId}/teams/${teamId}/matches/${matchId}/players/${playerId}/games/1`)
      .send({ password, Wood: 5, Score: 150 })
      .expect(200)
    expect(res.body).to.have.property('playerGame')
    expect(res.body.playerGame).to.deep.equal({ Wood: 5, Score: 150 })
  })

  it('retrieves per-player data with the updated game', async () => {
    const res = await request(app)
      .get(`/users/${userId}/teams/${teamId}/matches/${matchId}/players/${playerId}`)
      .expect(200)
    expect(res.body).to.have.property('perPlayerData')
    const pp = res.body.perPlayerData
    expect(pp).to.have.property('games')
    expect(pp.games['1']).to.deep.equal({ Wood: 5, Score: 150 })
  })

  it('lists players, matches and teams for the user', async () => {
    const teamsRes = await request(app).get(`/users/${userId}/teams`).expect(200)
    expect(teamsRes.body).to.have.property('teams')
    expect(teamsRes.body.teams).to.be.an('array').that.is.not.empty

    const playersRes = await request(app).get(`/users/${userId}/teams/${teamId}/players`).expect(200)
    expect(playersRes.body).to.have.property('players')
    expect(playersRes.body.players).to.be.an('array').that.is.not.empty

    const matchesRes = await request(app).get(`/users/${userId}/teams/${teamId}/matches`).expect(200)
    expect(matchesRes.body).to.have.property('matches')
    expect(matchesRes.body.matches).to.be.an('array').that.is.not.empty
  })

})
