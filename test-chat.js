// Test script for Socket.IO chat
// Usage: node test-chat.js <token> <conversationId>

const io = require('socket.io-client');

const TOKEN = process.argv[2] || process.env.TOKEN;
const CONV_ID = process.argv[3] || process.env.CONV_ID;

if (!TOKEN || !CONV_ID) {
  console.log('Usage: node test-chat.js <token> <conversationId>');
  console.log('Example: node test-chat.js "eyJhbG..." "conversation-uuid"');
  process.exit(1);
}

console.log('🔌 Connecting to Socket.IO chat server...\n');

const socket = io('http://localhost:3000/chat', {
  auth: { token: TOKEN },
  transports: ['websocket'],
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected! Socket ID:', socket.id);
  
  // Join conversation
  console.log('\n📥 Joining conversation:', CONV_ID);
  socket.emit('rejoindre_conversation', { conversationId: CONV_ID });
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

// Chat events
socket.on('conversation_rejointe', (data) => {
  console.log('✅ Joined conversation:', data.conversationId);
  
  // Send a test message
  console.log('\n📤 Sending message...');
  socket.emit('envoyer_message', {
    conversationId: CONV_ID,
    contenu: 'Hello from Socket.IO test!'
  });
});

socket.on('nouveau_message', (message) => {
  console.log('📨 New message received:', message);
});

socket.on('erreur', (error) => {
  console.error('❌ Error:', error);
});

// Keep process alive
console.log('Press Ctrl+C to exit');

