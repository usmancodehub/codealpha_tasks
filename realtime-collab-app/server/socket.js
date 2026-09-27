const socketIo = require('socket.io');

// rooms = { roomId: [{ id, username }] }
const rooms = {};

module.exports = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    socket.on('join-room', ({ roomId, username }) => {
      // Leave any previous room
      socket.rooms.forEach((r) => {
        if (r !== socket.id) socket.leave(r);
      });

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.username = username;

      // Initialize room
      if (!rooms[roomId]) rooms[roomId] = [];

      // Send existing users to the new joiner (so they initiate connections)
      const existingUsers = rooms[roomId].filter((u) => u.id !== socket.id);
      socket.emit('room-users', existingUsers);

      // Add the new user to room
      rooms[roomId].push({ id: socket.id, username });

      // Notify OTHERS that a new user joined
      socket.to(roomId).emit('user-joined', {
        id: socket.id,
        username,
      });

      console.log(`👤 ${username} (${socket.id}) joined room ${roomId}. Total: ${rooms[roomId].length}`);
    });

    // WebRTC signaling
    socket.on('signal', ({ to, from, signal }) => {
      io.to(to).emit('signal', { from, signal });
    });

    // Chat
    socket.on('send-message', ({ roomId, message, sender }) => {
      io.to(roomId).emit('receive-message', {
        message,
        sender,
        timestamp: new Date().toISOString(),
      });
    });

    // Whiteboard
    socket.on('draw', ({ roomId, ...data }) => {
      socket.to(roomId).emit('draw', data);
    });

    // Disconnect
    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      const username = socket.data.username;

      if (roomId && rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter((u) => u.id !== socket.id);

        // Notify others
        socket.to(roomId).emit('user-left', socket.id);

        // Cleanup empty rooms
        if (rooms[roomId].length === 0) {
          delete rooms[roomId];
        }

        console.log(`👋 ${username} (${socket.id}) left room ${roomId}`);
      }
    });
  });
};