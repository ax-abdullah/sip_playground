/**
 * Socket.io Interactive Test Client
 * Run with: node postman/socket-client.js
 * 
 * This client properly uses Socket.io protocol (unlike raw WebSocket in Postman)
 */

const { io } = require('socket.io-client');
const readline = require('readline');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3000';

console.log('🔌 Socket.io Test Client');
console.log('========================\n');

// Connect to default namespace
const socket = io(SOCKET_URL, {
  auth: { token: 'test-token' },
  transports: ['websocket', 'polling']
});

// =========================================
// EVENTS TO LISTEN TO (Server → Client)
// =========================================

// Room events
socket.on('room:joined', (data) => {
  console.log('📥 [room:joined]', JSON.stringify(data, null, 2));
});

socket.on('room:left', (data) => {
  console.log('📥 [room:left]', JSON.stringify(data, null, 2));
});

socket.on('room:user_joined', (data) => {
  console.log('📥 [room:user_joined]', JSON.stringify(data, null, 2));
});

socket.on('room:user_left', (data) => {
  console.log('📥 [room:user_left]', JSON.stringify(data, null, 2));
});

// Message events
socket.on('message:receive', (data) => {
  console.log('📥 [message:receive]', JSON.stringify(data, null, 2));
});

// Typing events
socket.on('typing:update', (data) => {
  console.log('📥 [typing:update]', JSON.stringify(data, null, 2));
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected! Socket ID:', socket.id);
  console.log('\n📋 Available commands:');
  console.log('  1. join <room>     - Join a room');
  console.log('  2. leave <room>    - Leave a room');
  console.log('  3. msg <room> <text> - Send message to room');
  console.log('  4. private <socketId> <text> - Send private message');
  console.log('  5. typing <room>   - Send typing indicator');
  console.log('  6. stop <room>     - Stop typing indicator');
  console.log('  7. ping            - Check latency');
  console.log('  8. quit            - Disconnect\n');
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('🔴 Connection error:', error.message);
});

// =========================================
// INTERACTIVE CLI
// =========================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

rl.on('line', (line) => {
  const args = line.trim().split(' ');
  const command = args[0].toLowerCase();

  switch (command) {
    case '1':
    case 'join':
      const joinRoom = args[1] || 'general';
      console.log(`📤 [join:room] "${joinRoom}"`);
      socket.emit('join:room', joinRoom, (response) => {
        console.log('   Callback:', JSON.stringify(response));
      });
      break;

    case '2':
    case 'leave':
      const leaveRoom = args[1] || 'general';
      console.log(`📤 [leave:room] "${leaveRoom}"`);
      socket.emit('leave:room', leaveRoom, (response) => {
        console.log('   Callback:', JSON.stringify(response));
      });
      break;

    case '3':
    case 'msg':
      const msgRoom = args[1] || 'general';
      const msgText = args.slice(2).join(' ') || 'Hello!';
      console.log(`📤 [message:room] to "${msgRoom}": "${msgText}"`);
      socket.emit('message:room', {
        room: msgRoom,
        message: msgText,
        type: 'text'
      }, (response) => {
        console.log('   Callback:', JSON.stringify(response));
      });
      break;

    case '4':
    case 'private':
      const targetId = args[1];
      const privateMsg = args.slice(2).join(' ') || 'Hello!';
      if (!targetId) {
        console.log('   ⚠️  Usage: private <socketId> <message>');
        break;
      }
      console.log(`📤 [message:private] to "${targetId}": "${privateMsg}"`);
      socket.emit('message:private', {
        to: targetId,
        message: privateMsg,
        type: 'text'
      }, (response) => {
        console.log('   Callback:', JSON.stringify(response));
      });
      break;

    case '5':
    case 'typing':
      const typingRoom = args[1] || 'general';
      console.log(`📤 [typing:start] "${typingRoom}"`);
      socket.emit('typing:start', typingRoom);
      break;

    case '6':
    case 'stop':
      const stopRoom = args[1] || 'general';
      console.log(`📤 [typing:stop] "${stopRoom}"`);
      socket.emit('typing:stop', stopRoom);
      break;

    case '7':
    case 'ping':
      const start = Date.now();
      console.log('📤 [ping:check]');
      socket.emit('ping:check', (response) => {
        const latency = Date.now() - start;
        console.log(`   Latency: ${latency}ms`, response);
      });
      break;

    case '8':
    case 'quit':
    case 'exit':
      console.log('👋 Disconnecting...');
      socket.disconnect();
      process.exit(0);
      break;

    default:
      if (command) {
        console.log('   Unknown command. Type a number 1-8 or command name.');
      }
  }

  rl.prompt();
}).on('close', () => {
  socket.disconnect();
  process.exit(0);
});

// Start prompt after connection
setTimeout(() => rl.prompt(), 1000);
