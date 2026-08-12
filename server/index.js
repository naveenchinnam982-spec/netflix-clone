// ============================
// StreamFlix Realtime Server
// ============================
// Standalone Socket.io server for:
//   - Live classes: room membership, chat, raise hand, mute, WebRTC signaling
//   - Watch Together: play/pause/seek sync relay
//   - Notifications: push to online users
//
// Deploy on Railway (or any Node host) and set NEXT_PUBLIC_SOCKET_URL to its
// public URL. Run:  node server/index.js
//
// CORS is configured for the Next.js app origin.

const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(server, {
  cors: {
    origin: [CLIENT_ORIGIN, /\.vercel\.app$/],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Room membership: room -> Map<socketId, { displayName, role }>
const roomUsers = new Map();

function addUser(room, socket, meta) {
  if (!roomUsers.has(room)) roomUsers.set(room, new Map());
  roomUsers.get(room).set(socket.id, meta);
}

function removeUser(room, socketId) {
  const users = roomUsers.get(room);
  if (!users) return;
  users.delete(socketId);
  if (users.size === 0) roomUsers.delete(room);
}

function broadcastViewers(room) {
  io.to(room).emit('stream:viewers', roomUsers.get(room)?.size || 0);
}

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  // ---------------- Live streams ----------------
  socket.on('stream:join', ({ streamId, user }) => {
    socket.join(streamId);
    addUser(streamId, socket, { displayName: user?.displayName || 'Guest', role: user?.role || 'student' });
    broadcastViewers(streamId);
    socket.to(streamId).emit('stream:chat', {
      id: `sys-${Date.now()}`,
      streamId,
      userId: 'system',
      user: { displayName: 'System' },
      message: `${user?.displayName || 'A participant'} joined`,
      type: 'join',
      timestamp: new Date().toISOString(),
    });
    socket.emit('stream:viewers', roomUsers.get(streamId)?.size || 1);
  });

  socket.on('stream:leave', ({ streamId }) => {
    const meta = roomUsers.get(streamId)?.get(socket.id);
    removeUser(streamId, socket.id);
    socket.leave(streamId);
    broadcastViewers(streamId);
    if (meta) {
      io.to(streamId).emit('stream:chat', {
        id: `sys-${Date.now()}`,
        streamId,
        userId: 'system',
        user: { displayName: 'System' },
        message: `${meta.displayName} left`,
        type: 'leave',
        timestamp: new Date().toISOString(),
      });
    }
  });

  socket.on('stream:chat', ({ streamId, message, user }) => {
    io.to(streamId).emit('stream:chat', {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      streamId,
      userId: user?.uid || socket.id,
      user: { displayName: user?.displayName || 'User', photoURL: user?.photoURL || '' },
      message,
      type: 'text',
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('stream:raise-hand', ({ streamId, raised }) => {
    const meta = roomUsers.get(streamId)?.get(socket.id);
    io.to(streamId).emit('stream:raise-hand', {
      userId: socket.id,
      displayName: meta?.displayName || 'Student',
      raised: Boolean(raised),
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('stream:mute', ({ streamId, peerId }) => {
    socket.to(streamId).emit('stream:mute-request', { peerId, by: socket.id });
  });

  // WebRTC signaling relay (mesh): offer/answer/ICE between peers.
  socket.on('stream:signal', ({ to, signal }) => {
    io.to(to).emit('stream:signal', { from: socket.id, signal });
  });

  // ---------------- Watch Together ----------------
  socket.on('wt:join', ({ roomId }) => {
    socket.join(`wt:${roomId}`);
    io.to(`wt:${roomId}`).emit('wt:peers', { count: io.sockets.adapter.rooms.get(`wt:${roomId}`)?.size || 1 });
  });

  socket.on('wt:sync', ({ roomId, type, time }) => {
    socket.to(`wt:${roomId}`).emit('wt:sync', { type, time, sender: socket.id });
  });

  socket.on('wt:leave', ({ roomId }) => {
    socket.leave(`wt:${roomId}`);
    io.to(`wt:${roomId}`).emit('wt:peers', { count: io.sockets.adapter.rooms.get(`wt:${roomId}`)?.size || 0 });
  });

  // ---------------- Notifications ----------------
  socket.on('notify:subscribe', ({ userId }) => {
    socket.join(`user:${userId}`);
  });

  socket.on('notify:send', ({ userId, notification }) => {
    io.to(`user:${userId}`).emit('notification:new', { notification });
  });

  socket.on('disconnect', () => {
    // Clean up any rooms this socket belonged to.
    for (const [room, users] of roomUsers) {
      if (users.has(socket.id)) {
        removeUser(room, socket.id);
        broadcastViewers(room);
      }
    }
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`[socket] StreamFlix realtime server listening on :${PORT}`);
  console.log(`[socket] Allowing client origin: ${CLIENT_ORIGIN}`);
});
