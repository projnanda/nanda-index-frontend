# NANDA Index

Open registry for autonomous agents with REST API and web interface.

## Overview

NANDA Index is a lightweight registry system for autonomous agents. It provides a web interface for browsing agents and a REST API for programmatic access. The system supports Google OAuth authentication and implements full CRUD operations with ownership controls.

## Features

- REST API for agent management
- Google OAuth 2.0 authentication
- Web interface for agent browsing
- MongoDB data persistence
- Owner-based access controls
- Real-time agent statistics

## Installation

### Prerequisites

- Node.js 16+
- MongoDB Atlas account
- Google Cloud Console project with OAuth 2.0 credentials

### Setup

1. Clone the repository:
```bash
git clone https://github.com/aidecentralized/nanda-index.git
cd nanda-index
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=your_random_session_secret
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
PORT=3000
```

4. Start the server:
```bash
npm start
```

## API Reference

### Base URL
```
http://localhost:3000
```

### Authentication

Authentication is required for create, update, and delete operations. The API uses session-based authentication via Google OAuth 2.0.

#### Endpoints

- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - OAuth callback (redirect)
- `GET /auth/logout` - Sign out user
- `GET /api/user` - Get current user session

### Agent Operations

#### List All Agents

```http
GET /api/agents
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "username": "alice",
    "agent_facts_link": "https://example.com/alice.json",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "source_agent_id": "agent-abc123-xyz789",
    "source_user_id": "google_user_id",
    "created_by_email": "alice@example.com"
  }
]
```

#### Create Agent

```http
POST /api/agents
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "alice",
  "agent_facts_link": "https://example.com/alice.json"
}
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "username": "alice",
  "agent_facts_link": "https://example.com/alice.json",
  "created_at": "2024-01-15T10:30:00.000Z",
  "source_agent_id": "agent-abc123-xyz789",
  "source_user_id": "google_user_id",
  "created_by_email": "alice@example.com"
}
```

**Error Response:**
```json
{
  "error": "Username already exists"
}
```

#### Update Agent

```http
PUT /api/agents/:id
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "alice_updated",
  "agent_facts_link": "https://example.com/alice_v2.json"
}
```

**Response:**
```json
{
  "message": "Agent updated successfully"
}
```

#### Delete Agent

```http
DELETE /api/agents/:id
```

**Response:**
```json
{
  "message": "Agent deleted successfully"
}
```

### Error Responses

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

Error responses include descriptive messages:
```json
{
  "error": "Authentication required"
}
```

## API Testing

### Using curl

**List agents:**
```bash
curl http://localhost:3000/api/agents
```

**Create agent (requires authentication via web interface first):**
```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{"username":"testbot","agent_facts_link":"https://example.com/test.json"}' \
  --cookie "session_cookie_from_browser"
```

**Update agent:**
```bash
curl -X PUT http://localhost:3000/api/agents/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{"username":"testbot_v2","agent_facts_link":"https://example.com/test_v2.json"}' \
  --cookie "session_cookie_from_browser"
```

**Delete agent:**
```bash
curl -X DELETE http://localhost:3000/api/agents/507f1f77bcf86cd799439011 \
  --cookie "session_cookie_from_browser"
```

### Using Node.js

```javascript
const fetch = require('node-fetch');

// List all agents
async function listAgents() {
  const response = await fetch('http://localhost:3000/api/agents');
  const agents = await response.json();
  console.log(agents);
}

// Note: Create, update, delete require authentication
// Use the web interface to authenticate first
```

## Data Schema

### Agent Document

```json
{
  "_id": "ObjectId",
  "username": "string (unique)",
  "agent_facts_link": "string (URL)",
  "created_at": "ISO 8601 string",
  "updated_at": "ISO 8601 string",
  "source_agent_id": "string (auto-generated)",
  "source_user_id": "string (Google user ID)",
  "created_by_email": "string"
}
```

### Validation Rules

- `username`: Required, unique, alphanumeric characters and underscores only
- `agent_facts_link`: Required, valid URL format
- Authentication required for create, update, delete operations
- Users can only modify agents they created

## Deployment

### Railway

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Docker

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Development

### Project Structure

```
├── server.js          # Express server and API routes
├── public/
│   └── index.html     # Web interface
├── package.json       # Dependencies and scripts
├── .env.example       # Environment template
└── README.md          # Documentation
```

### Adding New Features

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## License

MIT License

## Support

For issues and feature requests, please use the GitHub issues page. 