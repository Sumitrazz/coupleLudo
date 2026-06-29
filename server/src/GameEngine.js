const BOARD_SIZE = 52;

// Classic board layout (clockwise corners): Red=TL, Green=TR, Yellow=BR, Blue=BL.
// 2-player games get the diagonal pair (Red vs Yellow) for a face-off feel.
const PLAYER_COLORS = ['red', 'yellow', 'green', 'blue'];

const START_POSITIONS = { red: 0, green: 13, yellow: 26, blue: 39 };

const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

const HOME_LANE_ENTRY = { red: 50, green: 11, yellow: 24, blue: 37 };

const HOME_LANE_LENGTH = 6;

class GameEngine {
  constructor(playerCount = 4) {
    this.playerCount = playerCount;
    this.players = {};
    this.currentPlayerIndex = 0;
    this.turnOrder = [];
    this.winner = null;
    this.gameStatus = 'waiting';
    this.lastDice = null;
    this.consecutiveSixes = 0;
    this.finishedPlayers = [];
  }

  addPlayer(playerId, name) {
    if (this.turnOrder.length >= this.playerCount) return null;
    const color = PLAYER_COLORS[this.turnOrder.length];
    this.players[playerId] = {
      id: playerId,
      name,
      color,
      tokens: [
        { id: 0, state: 'home', position: -1, homeLanePos: -1 },
        { id: 1, state: 'home', position: -1, homeLanePos: -1 },
        { id: 2, state: 'home', position: -1, homeLanePos: -1 },
        { id: 3, state: 'home', position: -1, homeLanePos: -1 },
      ],
      finishedCount: 0,
    };
    this.turnOrder.push(playerId);
    return color;
  }

  removePlayer(playerId) {
    const idx = this.turnOrder.indexOf(playerId);
    if (idx === -1) return;
    this.turnOrder.splice(idx, 1);
    delete this.players[playerId];
    if (this.currentPlayerIndex >= this.turnOrder.length) {
      this.currentPlayerIndex = 0;
    }
  }

  startGame() {
    if (this.turnOrder.length < 2) return false;
    this.gameStatus = 'playing';
    this.currentPlayerIndex = 0;
    return true;
  }

  getCurrentPlayer() {
    if (this.turnOrder.length === 0) return null;
    return this.turnOrder[this.currentPlayerIndex];
  }

  rollDice(playerId) {
    if (this.gameStatus !== 'playing') return null;
    if (this.getCurrentPlayer() !== playerId) return null;

    const value = Math.floor(Math.random() * 6) + 1;
    this.lastDice = value;

    if (value === 6) {
      this.consecutiveSixes++;
      if (this.consecutiveSixes >= 3) {
        this.consecutiveSixes = 0;
        this.nextTurn();
        return { value, validMoves: [], bust: true };
      }
    } else {
      this.consecutiveSixes = 0;
    }

    const validMoves = this.getValidMoves(playerId, value);

    if (validMoves.length === 0) {
      if (value !== 6) {
        this.nextTurn();
      }
      return { value, validMoves, autoSkip: value !== 6 };
    }

    return { value, validMoves };
  }

  getValidMoves(playerId, diceValue) {
    const player = this.players[playerId];
    if (!player) return [];
    const moves = [];

    for (const token of player.tokens) {
      if (token.state === 'finished') continue;

      if (token.state === 'home') {
        if (diceValue === 6) {
          moves.push({ tokenId: token.id, action: 'enter' });
        }
        continue;
      }

      if (token.state === 'homeLane') {
        const newHomeLanePos = token.homeLanePos + diceValue;
        if (newHomeLanePos === HOME_LANE_LENGTH) {
          moves.push({ tokenId: token.id, action: 'finish' });
        } else if (newHomeLanePos < HOME_LANE_LENGTH) {
          moves.push({ tokenId: token.id, action: 'moveInLane' });
        }
        continue;
      }

      // active token
      const entrySquare = HOME_LANE_ENTRY[player.color];
      const stepsToEntry = this.distanceTo(token.position, entrySquare, player.color);

      if (stepsToEntry < BOARD_SIZE && diceValue > stepsToEntry) {
        const remainingAfterEntry = diceValue - stepsToEntry - 1;
        if (remainingAfterEntry < HOME_LANE_LENGTH) {
          moves.push({ tokenId: token.id, action: 'enterLane' });
        } else if (remainingAfterEntry === HOME_LANE_LENGTH - 1) {
          // exact finish from board not through lane explicitly
        }
        continue;
      }

      if (stepsToEntry < BOARD_SIZE && diceValue === stepsToEntry + 1) {
        moves.push({ tokenId: token.id, action: 'enterLane' });
        continue;
      }

      const newPos = (token.position + diceValue) % BOARD_SIZE;
      moves.push({ tokenId: token.id, action: 'move', newPos });
    }

    return moves;
  }

  distanceTo(from, to, color) {
    const start = START_POSITIONS[color];
    const normalizedFrom = (from - start + BOARD_SIZE) % BOARD_SIZE;
    const normalizedTo = (to - start + BOARD_SIZE) % BOARD_SIZE;
    if (normalizedTo >= normalizedFrom) {
      return normalizedTo - normalizedFrom;
    }
    return BOARD_SIZE - normalizedFrom + normalizedTo;
  }

  moveToken(playerId, tokenId) {
    if (this.gameStatus !== 'playing') return null;
    if (this.getCurrentPlayer() !== playerId) return null;
    if (this.lastDice === null) return null;

    const player = this.players[playerId];
    const token = player.tokens[tokenId];
    const diceValue = this.lastDice;
    const validMoves = this.getValidMoves(playerId, diceValue);
    const move = validMoves.find(m => m.tokenId === tokenId);

    if (!move) return null;

    const result = { playerId, tokenId, diceValue, action: move.action, captures: [] };

    switch (move.action) {
      case 'enter': {
        const startPos = START_POSITIONS[player.color];
        token.state = 'active';
        token.position = startPos;
        result.newPosition = startPos;
        const captured = this.checkCapture(playerId, startPos);
        result.captures = captured;
        break;
      }
      case 'move': {
        const newPos = (token.position + diceValue) % BOARD_SIZE;
        token.position = newPos;
        result.newPosition = newPos;
        const captured = this.checkCapture(playerId, newPos);
        result.captures = captured;
        break;
      }
      case 'enterLane': {
        const entrySquare = HOME_LANE_ENTRY[player.color];
        const stepsToEntry = this.distanceTo(token.position, entrySquare, player.color);
        const remaining = diceValue - stepsToEntry - 1;
        token.state = 'homeLane';
        token.position = -1;
        token.homeLanePos = remaining;
        result.homeLanePos = remaining;
        break;
      }
      case 'moveInLane': {
        token.homeLanePos += diceValue;
        result.homeLanePos = token.homeLanePos;
        break;
      }
      case 'finish': {
        token.state = 'finished';
        token.homeLanePos = HOME_LANE_LENGTH;
        player.finishedCount++;
        result.finished = true;
        if (player.finishedCount === 4) {
          this.finishedPlayers.push(playerId);
          if (!this.winner) {
            this.winner = playerId;
            result.winner = true;
          }
          result.playerFinished = true;
        }
        break;
      }
    }

    const extraTurn = diceValue === 6 || result.captures.length > 0;

    if (!extraTurn) {
      this.nextTurn();
    }

    this.lastDice = null;
    result.extraTurn = extraTurn;
    result.nextPlayer = this.getCurrentPlayer();

    if (this.checkGameOver()) {
      this.gameStatus = 'finished';
      result.gameOver = true;
    }

    return result;
  }

  checkCapture(playerId, position) {
    if (SAFE_SQUARES.includes(position)) return [];
    const captures = [];
    for (const [otherId, otherPlayer] of Object.entries(this.players)) {
      if (otherId === playerId) continue;
      for (const token of otherPlayer.tokens) {
        if (token.state === 'active' && token.position === position) {
          token.state = 'home';
          token.position = -1;
          captures.push({ playerId: otherId, tokenId: token.id, color: otherPlayer.color });
        }
      }
    }
    return captures;
  }

  checkGameOver() {
    const activePlayers = this.turnOrder.filter(id => this.players[id].finishedCount < 4);
    return activePlayers.length <= 1;
  }

  nextTurn() {
    this.consecutiveSixes = 0;
    let attempts = 0;
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.turnOrder.length;
      attempts++;
    } while (
      this.players[this.turnOrder[this.currentPlayerIndex]]?.finishedCount === 4 &&
      attempts < this.turnOrder.length
    );
  }

  getState() {
    return {
      players: Object.values(this.players).map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        tokens: p.tokens.map(t => ({ ...t })),
        finishedCount: p.finishedCount,
      })),
      currentPlayer: this.getCurrentPlayer(),
      gameStatus: this.gameStatus,
      lastDice: this.lastDice,
      winner: this.winner,
      finishedPlayers: this.finishedPlayers,
    };
  }
}

module.exports = { GameEngine, BOARD_SIZE, PLAYER_COLORS, START_POSITIONS, SAFE_SQUARES, HOME_LANE_ENTRY, HOME_LANE_LENGTH };
