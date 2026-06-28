const { v4: uuidv4 } = require('uuid');
const { GameEngine } = require('./GameEngine');

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return this.rooms.has(code) ? this.generateCode() : code;
  }

  createRoom(hostId, hostName, playerCount = 4) {
    const code = this.generateCode();
    const game = new GameEngine(playerCount);
    const color = game.addPlayer(hostId, hostName);

    const room = {
      code,
      hostId,
      playerCount,
      game,
      status: 'waiting',
      createdAt: Date.now(),
      disconnectedPlayers: new Map(),
    };

    this.rooms.set(code, room);
    return { code, color };
  }

  joinRoom(code, playerId, playerName) {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Room not found' };
    if (room.status === 'playing') {
      if (room.disconnectedPlayers.has(playerId)) {
        room.disconnectedPlayers.delete(playerId);
        return { success: true, reconnect: true, color: room.game.players[playerId]?.color };
      }
      return { error: 'Game already in progress' };
    }
    if (room.status === 'finished') return { error: 'Game has ended' };
    if (room.game.turnOrder.length >= room.playerCount) return { error: 'Room is full' };
    if (room.game.players[playerId]) return { error: 'Already in room' };

    const color = room.game.addPlayer(playerId, playerName);
    return { success: true, color };
  }

  leaveRoom(code, playerId) {
    const room = this.rooms.get(code);
    if (!room) return;

    if (room.status === 'waiting') {
      room.game.removePlayer(playerId);
      if (room.game.turnOrder.length === 0) {
        this.rooms.delete(code);
        return { roomClosed: true };
      }
      if (room.hostId === playerId) {
        room.hostId = room.game.turnOrder[0];
      }
    }
    return { roomClosed: false };
  }

  startGame(code, playerId) {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Room not found' };
    if (room.hostId !== playerId) return { error: 'Only host can start' };
    if (room.game.turnOrder.length < 2) return { error: 'Need at least 2 players' };

    const started = room.game.startGame();
    if (started) {
      room.status = 'playing';
      return { success: true };
    }
    return { error: 'Could not start game' };
  }

  getRoom(code) {
    return this.rooms.get(code);
  }

  playerDisconnected(code, playerId) {
    const room = this.rooms.get(code);
    if (!room) return;
    if (room.status === 'playing') {
      room.disconnectedPlayers.set(playerId, Date.now());
    }
  }

  cleanupStaleRooms() {
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000;
    for (const [code, room] of this.rooms) {
      if (now - room.createdAt > maxAge) {
        this.rooms.delete(code);
      }
    }
  }
}

module.exports = { RoomManager };
