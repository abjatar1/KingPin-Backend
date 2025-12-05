# KingPin Backend API Documentation

> Bowling stat tracking REST API with user authentication, team management, and per-player game statistics.

---

## Base URL
```
http://localhost:3000
```

---

## 📋 Table of Contents
- [Authentication](#authentication)
- [Accounts](#accounts)
- [Teams](#teams)
- [Players](#players)
- [Matches](#matches)
- [Per-Player Match Data](#per-player-match-data)

---

## Authentication

All endpoints (except account creation and login) require a valid password passed in the request body under `password` or `currentPassword`.

---

## Accounts

### ✅ Create Account
**POST** `/accounts`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "username": "johndoe",
  "displayName": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe",
    "displayName": "John Doe",
    "teamIds": {}
  }
}
```

**Validation:**
- ✓ Email is required and must be valid format
- ✓ Password must be at least 8 characters
- ✓ Username is required
- ✓ Email must be unique
- ✓ Username must be unique

**Error Responses:**
- `400` - Missing required fields or invalid email format
- `409` - Email or username already in use

---

### 🔐 Login
**POST** `/auth/login`

Authenticate user with email and password for UI/login screen.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe",
    "displayName": "John Doe",
    "teamIds": {}
  }
}
```

**Error Responses:**
- `400` - Missing email or password
- `401` - Invalid credentials

---

### 📖 Get Account
**GET** `/accounts/:userId`

Retrieve public user information.

**Response (200 OK):**
```json
{
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe",
    "displayName": "John Doe",
    "teamIds": {
      "team-id-1": true,
      "team-id-2": true
    }
  }
}
```

**Error Responses:**
- `404` - User not found

---

### 🔑 Change Password
**POST** `/accounts/:userId/password`

Update user password with authentication.

**Request Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Validation:**
- ✓ Current password must be correct
- ✓ New password must be at least 8 characters

**Error Responses:**
- `400` - New password is required or too short
- `401` - Invalid current password

---

### 👤 Change Display Name
**POST** `/accounts/:userId/displayName`

Update user display name with authentication.

**Request Body:**
```json
{
  "password": "SecurePass123",
  "displayName": "Johnny Appleseed"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe",
    "displayName": "Johnny Appleseed",
    "teamIds": {}
  }
}
```

**Error Responses:**
- `400` - Display name is required
- `401` - Invalid password

---

### ❌ Delete Account
**DELETE** `/accounts/:userId`

Permanently delete user account and all associated data.

**Request Body:**
```json
{
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Error Responses:**
- `401` - Invalid password

---

## Teams

### ✅ Create Team
**POST** `/users/:userId/teams`

Create a new team owned by the user.

**Request Body:**
```json
{
  "password": "SecurePass123",
  "displayName": "Bowling Legends"
}
```

**Response (201 Created):**
```json
{
  "team": {
    "teamId": "team-550e8400-e29b-41d4-a716",
    "ownerId": "550e8400-e29b-41d4-a716-446655440000",
    "displayName": "Bowling Legends",
    "playerIds": {},
    "awardsList": [],
    "matchIds": {}
  }
}
```

**Error Responses:**
- `401` - Invalid password
- `404` - User not found

---

### 📋 List Teams
**GET** `/users/:userId/teams`

Retrieve all teams owned by the user.

**Response (200 OK):**
```json
{
  "teams": [
    {
      "teamId": "team-550e8400-e29b-41d4-a716",
      "ownerId": "550e8400-e29b-41d4-a716-446655440000",
      "displayName": "Bowling Legends",
      "playerIds": {
        "player-1": true,
        "player-2": true
      },
      "awardsList": [],
      "matchIds": {
        "match-1": true
      }
    }
  ]
}
```

**Error Responses:**
- `404` - User not found

---

### 📖 Get Team
**GET** `/users/:userId/teams/:teamId`

Retrieve a specific team's information.

**Response (200 OK):**
```json
{
  "team": {
    "teamId": "team-550e8400-e29b-41d4-a716",
    "ownerId": "550e8400-e29b-41d4-a716-446655440000",
    "displayName": "Bowling Legends",
    "playerIds": {
      "player-1": true,
      "player-2": true
    },
    "awardsList": [],
    "matchIds": {
      "match-1": true
    }
  }
}
```

**Error Responses:**
- `403` - Team does not belong to user
- `404` - User or team not found

---

### ✏️ Update Team
**PUT** `/users/:userId/teams/:teamId`

Update team display name.

**Request Body:**
```json
{
  "password": "SecurePass123",
  "displayName": "Elite Bowlers"
}
```

**Response (200 OK):**
```json
{
  "team": {
    "teamId": "team-550e8400-e29b-41d4-a716",
    "ownerId": "550e8400-e29b-41d4-a716-446655440000",
    "displayName": "Elite Bowlers",
    "playerIds": {},
    "awardsList": [],
    "matchIds": {}
  }
}
```

**Error Responses:**
- `401` - Invalid password
- `403` - Forbidden
- `404` - User or team not found

---

### ❌ Delete Team
**DELETE** `/users/:userId/teams/:teamId`

Delete a team and all associated players and matches.

**Request Body:**
```json
{
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Error Responses:**
- `401` - Invalid password
- `403` - Forbidden
- `404` - User or team not found

---

## Players

### ✅ Create Player
**POST** `/users/:userId/teams/:teamId/players`

Add a new player to a team.

**Request Body:**
```json
{
  "password": "SecurePass123",
  "displayName": "Alice Johnson",
  "graduationYear": 2025
}
```

**Response (201 Created):**
```json
{
  "player": {
    "playerId": "player-550e8400-e29b-41d4-a716",
    "displayName": "Alice Johnson",
    "teamId": "team-550e8400-e29b-41d4-a716",
    "matchIds": {},
    "graduationYear": 2025
  }
}
```

**Validation:**
- ✓ Graduation year must be between 1900-2100

**Error Responses:**
- `400` - Invalid graduation year
- `401` - Invalid password
- `403` - Forbidden
- `404` - User or team not found

---

### 📋 List Players
**GET** `/users/:userId/teams/:teamId/players`

Retrieve all players on a team.

**Response (200 OK):**
```json
{
  "players": [
    {
      "playerId": "player-550e8400-e29b-41d4-a716",
      "displayName": "Alice Johnson",
      "teamId": "team-550e8400-e29b-41d4-a716",
      "matchIds": {
        "match-1": true
      },
      "graduationYear": 2025
    },
    {
      "playerId": "player-660e9411-f40c-52e5-b827",
      "displayName": "Bob Smith",
      "teamId": "team-550e8400-e29b-41d4-a716",
      "matchIds": {},
      "graduationYear": 2024
    }
  ]
}
```

**Error Responses:**
- `403` - Forbidden
- `404` - User or team not found

---

### 📖 Get Player
**GET** `/users/:userId/teams/:teamId/players/:playerId`

Retrieve a specific player's information.

**Response (200 OK):**
```json
{
  "player": {
    "playerId": "player-550e8400-e29b-41d4-a716",
    "displayName": "Alice Johnson",
    "teamId": "team-550e8400-e29b-41d4-a716",
    "matchIds": {
      "match-1": true
    },
    "graduationYear": 2025
  }
}
```

**Error Responses:**
- `403` - Forbidden
- `404` - User, team, or player not found

---

### ✏️ Update Player
**PUT** `/users/:userId/teams/:teamId/players/:playerId`

Update player display name and/or graduation year.

**Request Body:**
```json
{
  "password": "SecurePass123",
  "displayName": "Alice J.",
  "graduationYear": 2026
}
```

**Response (200 OK):**
```json
{
  "player": {
    "playerId": "player-550e8400-e29b-41d4-a716",
    "displayName": "Alice J.",
    "teamId": "team-550e8400-e29b-41d4-a716",
    "matchIds": {},
    "graduationYear": 2026
  }
}
```

**Validation:**
- ✓ Graduation year must be between 1900-2100 if provided

**Error Responses:**
- `400` - Invalid graduation year
- `401` - Invalid password
- `403` - Forbidden
- `404` - User, team, or player not found

---

### ❌ Delete Player
**DELETE** `/users/:userId/teams/:teamId/players/:playerId`

Remove a player from a team (also removes from all associated matches).

**Request Body:**
```json
{
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Error Responses:**
- `401` - Invalid password
- `403` - Forbidden
- `404` - User, team, or player not found

---

## Matches

### ✅ Create Match
**POST** `/users/:userId/teams/:teamId/matches`

Create a new match for a team with all players initialized.

**Request Body:**
```json
{
  "password": "SecurePass123",
  "date": 1701648000000,
  "opposingTeamName": "Thunder Strikers",
  "comment": "Friendly game"
}
```

**Response (201 Created):**
```json
{
  "match": {
    "matchId": "match-550e8400-e29b-41d4-a716",
    "teamId": "team-550e8400-e29b-41d4-a716",
    "date": 1701648000000,
    "opposingTeamName": "Thunder Strikers",
    "comment": "Friendly game",
    "perPlayerData": {
      "player-1": {
        "games": {
          "1": { "Wood": 0, "Score": 0 },
          "2": { "Wood": 0, "Score": 0 },
          "3": { "Wood": 0, "Score": 0 }
        }
      }
    }
  }
}
```

**Notes:**
- Date defaults to current timestamp if not provided
- All players on the team are auto-initialized with 3 games (slots 1-3) at 0 wood/score

**Error Responses:**
- `401` - Invalid password
- `403` - Forbidden
- `404` - User or team not found

---

### 📋 List Matches
**GET** `/users/:userId/teams/:teamId/matches`

Retrieve all matches for a team.

**Response (200 OK):**
```json
{
  "matches": [
    {
      "matchId": "match-550e8400-e29b-41d4-a716",
      "teamId": "team-550e8400-e29b-41d4-a716",
      "date": 1701648000000,
      "opposingTeamName": "Thunder Strikers",
      "comment": "Friendly game",
      "perPlayerData": {
        "player-1": {
          "games": {
            "1": { "Wood": 7, "Score": 142 },
            "2": { "Wood": 9, "Score": 189 },
            "3": { "Wood": 8, "Score": 156 }
          }
        }
      }
    }
  ]
}
```

**Error Responses:**
- `403` - Forbidden
- `404` - User or team not found

---

### 📖 Get Match
**GET** `/users/:userId/teams/:teamId/matches/:matchId`

Retrieve a specific match's information.

**Response (200 OK):**
```json
{
  "match": {
    "matchId": "match-550e8400-e29b-41d4-a716",
    "teamId": "team-550e8400-e29b-41d4-a716",
    "date": 1701648000000,
    "opposingTeamName": "Thunder Strikers",
    "comment": "Friendly game",
    "perPlayerData": {
      "player-1": {
        "games": {
          "1": { "Wood": 7, "Score": 142 },
          "2": { "Wood": 9, "Score": 189 },
          "3": { "Wood": 8, "Score": 156 }
        }
      }
    }
  }
}
```

**Error Responses:**
- `403` - Forbidden
- `404` - User, team, or match not found

---

### ✏️ Update Match
**PUT** `/users/:userId/teams/:teamId/matches/:matchId`

Update match metadata (date, opposing team name, comment).

**Request Body:**
```json
{
  "password": "SecurePass123",
  "date": 1701734400000,
  "opposingTeamName": "Elite Bowlers",
  "comment": "Updated comment"
}
```

**Response (200 OK):**
```json
{
  "match": {
    "matchId": "match-550e8400-e29b-41d4-a716",
    "teamId": "team-550e8400-e29b-41d4-a716",
    "date": 1701734400000,
    "opposingTeamName": "Elite Bowlers",
    "comment": "Updated comment",
    "perPlayerData": {}
  }
}
```

**Error Responses:**
- `401` - Invalid password
- `403` - Forbidden
- `404` - User, team, or match not found

---

### ❌ Delete Match
**DELETE** `/users/:userId/teams/:teamId/matches/:matchId`

Remove a match and all associated player statistics.

**Request Body:**
```json
{
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Error Responses:**
- `401` - Invalid password
- `403` - Forbidden
- `404` - User, team, or match not found

---

## Per-Player Match Data

### 🎳 Set Game Entry
**PUT** `/users/:userId/teams/:teamId/matches/:matchId/players/:playerId/games/:gameIndex`

Record bowling statistics for a player in a specific game (wood count and score).

**Request Body:**
```json
{
  "password": "SecurePass123",
  "Wood": 7,
  "Score": 142
}
```

**Response (200 OK):**
```json
{
  "playerGame": {
    "Wood": 7,
    "Score": 142
  }
}
```

**Parameters:**
- `gameIndex` - Game number: **1, 2, or 3** (required)
- `Wood` - Number of pins knocked down (0-10, defaults to 0)
- `Score` - Bowling score (0+, defaults to 0)

**Error Responses:**
- `400` - Invalid game index (must be 1, 2, or 3)
- `401` - Invalid password
- `403` - Forbidden
- `404` - User, team, match, or player not found

---

### 📊 Get Player Match Data
**GET** `/users/:userId/teams/:teamId/matches/:matchId/players/:playerId`

Retrieve all game statistics for a player in a match.

**Response (200 OK):**
```json
{
  "perPlayerData": {
    "games": {
      "1": { "Wood": 7, "Score": 142 },
      "2": { "Wood": 9, "Score": 189 },
      "3": { "Wood": 8, "Score": 156 }
    }
  }
}
```

**Notes:**
- All missing game slots are filled with default values (0 wood, 0 score)
- Returns empty games initialized with zeros if no data exists

**Error Responses:**
- `403` - Forbidden
- `404` - User, team, or match not found

---

## Status Codes

| Code | Meaning |
|------|---------|
| `200` | ✅ Success |
| `201` | ✅ Created |
| `400` | ⚠️ Bad Request (validation error) |
| `401` | 🔐 Unauthorized (auth failed) |
| `403` | 🚫 Forbidden (access denied) |
| `404` | ❌ Not Found |
| `409` | ⚠️ Conflict (duplicate entry) |
| `500` | 💥 Internal Server Error |

---

## Data Types

### User
```json
{
  "userId": "uuid-string",
  "email": "string",
  "password": "bcrypt-hashed-string",
  "username": "string",
  "displayName": "string",
  "teamIds": { "team-id-string": true }
}
```

### Team
```json
{
  "teamId": "uuid-string",
  "ownerId": "user-id-string",
  "displayName": "string",
  "playerIds": { "player-id-string": true },
  "awardsList": ["string"],
  "matchIds": { "match-id-string": true }
}
```

### Player
```json
{
  "playerId": "uuid-string",
  "displayName": "string",
  "teamId": "team-id-string",
  "matchIds": { "match-id-string": true },
  "graduationYear": "number-or-null"
}
```

### Match
```json
{
  "matchId": "uuid-string",
  "teamId": "team-id-string",
  "date": "unix-timestamp-number",
  "opposingTeamName": "string",
  "comment": "string",
  "perPlayerData": {
    "player-id-string": {
      "games": {
        "1": { "Wood": "number", "Score": "number" },
        "2": { "Wood": "number", "Score": "number" },
        "3": { "Wood": "number", "Score": "number" }
      }
    }
  }
}
```

---

## Example Workflows

### Workflow 1: Create Account & Team
```bash
# 1. Create account
curl -X POST http://localhost:3000/accounts \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Pass1234","username":"testuser"}'

# 2. Create team (use userId from response, provide password)
curl -X POST http://localhost:3000/users/{userId}/teams \
  -H "Content-Type: application/json" \
  -d '{"password":"Pass1234","displayName":"My Team"}'
```

### Workflow 2: Add Players & Create Match
```bash
# 1. Add player to team
curl -X POST http://localhost:3000/users/{userId}/teams/{teamId}/players \
  -H "Content-Type: application/json" \
  -d '{"password":"Pass1234","displayName":"Alice","graduationYear":2025}'

# 2. Create match
curl -X POST http://localhost:3000/users/{userId}/teams/{teamId}/matches \
  -H "Content-Type: application/json" \
  -d '{"password":"Pass1234","opposingTeamName":"Rivals","comment":"Championship"}'
```

### Workflow 3: Record Game Statistics
```bash
# 1. Set Game 1 stats for player
curl -X PUT http://localhost:3000/users/{userId}/teams/{teamId}/matches/{matchId}/players/{playerId}/games/1 \
  -H "Content-Type: application/json" \
  -d '{"password":"Pass1234","Wood":8,"Score":165}'

# 2. Get all player stats
curl -X GET http://localhost:3000/users/{userId}/teams/{teamId}/matches/{matchId}/players/{playerId}
```

---

**Last Updated:** December 4, 2025  
**Version:** 1.0.0
