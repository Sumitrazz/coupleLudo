const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { RoomManager } = require('./RoomManager');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? true : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
}

const roomManager = new RoomManager();
const playerRooms = new Map();

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('create-room', ({ playerName, playerCount }, callback) => {
    const { code, color } = roomManager.createRoom(socket.id, playerName, playerCount);
    socket.join(code);
    playerRooms.set(socket.id, code);
    const room = roomManager.getRoom(code);
    callback({ code, color, gameState: room.game.getState(), isHost: true });
  });

  socket.on('join-room', ({ code, playerName }, callback) => {
    const upperCode = code.toUpperCase();
    const result = roomManager.joinRoom(upperCode, socket.id, playerName);
    if (result.error) {
      callback({ error: result.error });
      return;
    }
    socket.join(upperCode);
    playerRooms.set(socket.id, upperCode);
    const room = roomManager.getRoom(upperCode);
    const gameState = room.game.getState();
    callback({ color: result.color, gameState, isHost: room.hostId === socket.id });
    socket.to(upperCode).emit('player-joined', { gameState });
  });

  socket.on('start-game', (_, callback) => {
    const code = playerRooms.get(socket.id);
    if (!code) { callback({ error: 'Not in a room' }); return; }
    const result = roomManager.startGame(code, socket.id);
    if (result.error) { callback({ error: result.error }); return; }
    const room = roomManager.getRoom(code);
    const gameState = room.game.getState();
    io.to(code).emit('game-started', { gameState });
    callback({ success: true });
  });

  socket.on('roll-dice', (_, callback) => {
    const code = playerRooms.get(socket.id);
    if (!code) { callback({ error: 'Not in a room' }); return; }
    const room = roomManager.getRoom(code);
    if (!room) { callback({ error: 'Room not found' }); return; }

    const result = room.game.rollDice(socket.id);
    if (!result) { callback({ error: 'Not your turn' }); return; }

    io.to(code).emit('dice-rolled', {
      playerId: socket.id,
      value: result.value,
      validMoves: result.validMoves,
      bust: result.bust,
      autoSkip: result.autoSkip,
      gameState: room.game.getState(),
    });
    callback({ success: true, ...result });
  });

  socket.on('move-token', ({ tokenId }, callback) => {
    const code = playerRooms.get(socket.id);
    if (!code) { callback({ error: 'Not in a room' }); return; }
    const room = roomManager.getRoom(code);
    if (!room) { callback({ error: 'Room not found' }); return; }

    const result = room.game.moveToken(socket.id, tokenId);
    if (!result) { callback({ error: 'Invalid move' }); return; }

    io.to(code).emit('token-moved', {
      ...result,
      gameState: room.game.getState(),
    });
    callback({ success: true });
  });

  socket.on('leave-room', () => {
    handleLeave(socket);
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    const code = playerRooms.get(socket.id);
    if (code) {
      const room = roomManager.getRoom(code);
      if (room && room.status === 'playing') {
        roomManager.playerDisconnected(code, socket.id);
        socket.to(code).emit('player-disconnected', {
          playerId: socket.id,
          gameState: room.game.getState(),
        });
      } else {
        handleLeave(socket);
      }
    }
  });
});

function handleLeave(socket) {
  const code = playerRooms.get(socket.id);
  if (!code) return;
  const result = roomManager.leaveRoom(code, socket.id);
  socket.leave(code);
  playerRooms.delete(socket.id);
  if (!result?.roomClosed) {
    const room = roomManager.getRoom(code);
    if (room) {
      io.to(code).emit('player-left', { playerId: socket.id, gameState: room.game.getState() });
    }
  }
}

setInterval(() => roomManager.cleanupStaleRooms(), 30 * 60 * 1000);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

if (process.env.NODE_ENV === 'production') {
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`coupleLodo server running on port ${PORT}`));
