const express = require('express')
const app = express()
const port = 3000

let userSchema = {
    teamIds: {}, // teamId: teamSchema
    userId: 0,
    email: "",
    password: "",
    username: "",
    displayName: ""
}

let teamSchema = {
    playerIds: {}, // playerId: playerSchema
    awardsList: {} // simple array of strings
}

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})


