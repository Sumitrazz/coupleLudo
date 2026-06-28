import { useState, useEffect, useCallback } from 'react';
import { socket } from './socket';
import { playClick, playTokenEnter, playError } from './audio';
import Lobby from './components/Lobby';
import Game from './components/Game';
import './App.css';

function App() {
  const [screen, setScreen] = useState('lobby');
  const [roomCode, setRoomCode] = useState('');
  const [gameState, setGameState] = useState(null);
  const [myColor, setMyColor] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [roomPlayerCount, setRoomPlayerCount] = useState(2);

  useEffect(() => {
    socket.connect();

    socket.on('game-started', ({ gameState }) => {
      playTokenEnter();
      setGameState(gameState);
      setScreen('game');
    });

    socket.on('player-joined', ({ gameState }) => {
      playClick();
      setGameState(gameState);
    });
    socket.on('player-left', ({ gameState }) => setGameState(gameState));
    socket.on('dice-rolled', ({ gameState }) => setGameState(gameState));
    socket.on('token-moved', ({ gameState }) => setGameState(gameState));
    socket.on('player-disconnected', ({ gameState }) => setGameState(gameState));

    return () => {
      socket.off('game-started');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('dice-rolled');
      socket.off('token-moved');
      socket.off('player-disconnected');
    };
  }, []);

  const createRoom = useCallback((name, playerCount) => {
    setPlayerName(name);
    setRoomPlayerCount(playerCount);
    socket.emit('create-room', { playerName: name, playerCount }, (res) => {
      if (res.error) { playError(); setError(res.error); return; }
      setRoomCode(res.code);
      setMyColor(res.color);
      setIsHost(res.isHost);
      setGameState(res.gameState);
      setScreen('room');
    });
  }, []);

  const joinRoom = useCallback((code, name) => {
    setPlayerName(name);
    socket.emit('join-room', { code, playerName: name }, (res) => {
      if (res.error) { playError(); setError(res.error); return; }
      setRoomCode(code.toUpperCase());
      setMyColor(res.color);
      setIsHost(res.isHost);
      setGameState(res.gameState);
      setScreen('room');
    });
  }, []);

  const startGame = useCallback(() => {
    playClick();
    socket.emit('start-game', {}, (res) => {
      if (res.error) { playError(); setError(res.error); }
    });
  }, []);

  const leaveRoom = useCallback(() => {
    playClick();
    socket.emit('leave-room');
    setScreen('lobby');
    setRoomCode('');
    setGameState(null);
    setMyColor('');
    setIsHost(false);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 onClick={() => { if (screen !== 'game') { leaveRoom(); } }}>
          <span className="logo-couple">couple</span>
          <span className="logo-ludo">Ludo</span>
        </h1>
      </header>

      {error && (
        <div className="error-banner" onClick={() => { playClick(); setError(''); }}>
          {error} <span className="dismiss">×</span>
        </div>
      )}

      {screen === 'lobby' && (
        <Lobby onCreateRoom={createRoom} onJoinRoom={joinRoom} />
      )}

      {screen === 'room' && gameState && (
        <div className="room-screen">
          <div className="room-card">
            <div className="room-code-display">
              <span className="label">SHARE THIS CODE</span>
              <div className="code-wrap">
                {roomCode.split('').map((c, i) => (
                  <span key={i} className="code-char">{c}</span>
                ))}
              </div>
              <button className="copy-btn" onClick={() => { playClick(); navigator.clipboard.writeText(roomCode); }}>
                Copy Code
              </button>
            </div>

            <div className="players-list">
              <h3>Players</h3>
              {gameState.players.map((p) => (
                <div key={p.id} className="player-tag">
                  <div className="player-avatar" style={{ background: p.color }}>{p.name[0]}</div>
                  <span className="player-tag-name">{p.name}</span>
                  {p.id === socket.id && <span className="you-badge">YOU</span>}
                </div>
              ))}
              {Array.from({ length: Math.max(0, roomPlayerCount - gameState.players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="player-tag empty-slot">
                  <div className="player-avatar empty">?</div>
                  <span className="player-tag-name">Waiting...</span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                className="btn-primary btn-start"
                onClick={startGame}
                disabled={gameState.players.length < 2}
              >
                {gameState.players.length < 2 ? 'Waiting for players...' : 'Start Game!'}
              </button>
            ) : (
              <div className="waiting-host">
                <div className="spinner" />
                <p>Waiting for host to start...</p>
              </div>
            )}
            <button className="btn-link" onClick={leaveRoom}>Leave Room</button>
          </div>
        </div>
      )}

      {screen === 'game' && gameState && (
        <Game
          gameState={gameState}
          myColor={myColor}
          myId={socket.id}
          onLeave={leaveRoom}
        />
      )}
    </div>
  );
}

export default App;
