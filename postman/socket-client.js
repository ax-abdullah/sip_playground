/**
 * Socket.io Client Example
 * Run with: node postman/socket-client.js
 */

const { io } = require('socket.io-client');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3000';

// Connect to default namespace
const socket = io(SOCKET_URL, {
  auth: {
    token: 'your-auth-token' // Optional if SOCKET_AUTH_REQUIRED=false
  },
  transports: ['websocket', 'polling']
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
  
  // Join a room
  socket.emit('join:room', 'general', (response) => {
    console.log('📍 Joined room:', response);
  });
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('🔴 Connection error:', error.message);
});

// Message events
socket.on('message:receive', (data) => {
  console.log('📨 Message received:', data);
});

socket.on('typing:update', (data) => {
  console.log('⌨️ Typing:', data);
});

// Send a room message after connection
setTimeout(() => {
  if (socket.connected) {
    socket.emit('message:room', {
      room: 'general',
      message: 'Hello from Node.js client!',
      type: 'text'
    }, (response) => {
      console.log('📤 Message sent:', response);
    });
  }
}, 2000);

// Keep alive
console.log('🔌 Connecting to', SOCKET_URL);
console.log('Press Ctrl+C to disconnect\n');
