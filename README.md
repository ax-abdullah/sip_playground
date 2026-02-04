# Express.js Starter Kit

A production-ready Express.js starter kit with Winston logging, Redis caching, and Socket.io real-time communication.

## Features

- ✅ Express.js 4.x
- ✅ **Winston** - Structured logging with daily rotation
- ✅ **Redis** - Caching with ioredis client
- ✅ **Socket.io** - Real-time bidirectional communication
- ✅ Security middleware (Helmet, CORS)
- ✅ Request logging (Morgan → Winston)
- ✅ Graceful shutdown handling
- ✅ Environment configuration (dotenv)

## Project Structure

```
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware (cache, errorHandler)
│   ├── routes/           # API routes
│   ├── services/         # Business services (Redis)
│   ├── socket/           # Socket.io manager
│   ├── utils/            # Utilities (logger)
│   └── index.js          # App entry point
├── logs/                 # Log files (auto-generated)
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Redis server running

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start Redis (if using Docker)
docker run -d -p 6379:6379 redis:alpine

# Start development server
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with service status |
| GET | `/api` | API info |
| GET | `/socket/stats` | Socket.io statistics |
| GET/POST/PUT/DELETE | `/api/users` | User CRUD with Redis caching |

## Socket.io Events

### Default Namespace (`/`)

| Event | Direction | Description |
|-------|-----------|-------------|
| `join:room` | Client → Server | Join a room |
| `leave:room` | Client → Server | Leave a room |
| `message:private` | Client → Server | Send private message |
| `message:room` | Client → Server | Send room message |
| `message:receive` | Server → Client | Receive message |
| `typing:start/stop` | Client → Server | Typing indicators |

### Custom Namespaces

- `/notifications` - For pub/sub notifications
- `/chat` - For chat functionality

### Client Example

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'your-token' }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  socket.emit('join:room', 'general', (response) => {
    console.log('Joined room:', response);
  });
});

socket.on('message:receive', (data) => {
  console.log('Message:', data);
});
```

## Logging

Logs are written to `logs/` directory:
- `combined-YYYY-MM-DD.log` - All logs
- `error-YYYY-MM-DD.log` - Error logs only
- `exceptions-YYYY-MM-DD.log` - Uncaught exceptions

## Scripts

- `npm run dev` - Start with hot reload
- `npm start` - Production start
- `npm test` - Run tests

## License

MIT
