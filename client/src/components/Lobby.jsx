import { useState } from 'react';
import { playClick } from '../audio';

export default function Lobby({ onCreateRoom, onJoinRoom }) {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [playerCount, setPlayerCount] = useState(2);
  const [mode, setMode] = useState(null);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    playClick();
    onCreateRoom(name.trim(), playerCount);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name.trim() || !joinCode.trim()) return;
    playClick();
    onJoinRoom(joinCode.trim(), name.trim());
  };

  return (
    <div className="lobby">
      <div className="lobby-card">
        <div className="lobby-board-icon">
          <svg viewBox="0 0 80 80" width={80} height={80}>
            <rect x={0} y={0} width={40} height={40} fill="#e53935" rx={4} />
            <rect x={40} y={0} width={40} height={40} fill="#43a047" rx={4} />
            <rect x={0} y={40} width={40} height={40} fill="#1e88e5" rx={4} />
            <rect x={40} y={40} width={40} height={40} fill="#fdd835" rx={4} />
            <circle cx={15} cy={15} r={6} fill="white" opacity={0.8} />
            <circle cx={25} cy={25} r={6} fill="white" opacity={0.8} />
            <circle cx={55} cy={15} r={6} fill="white" opacity={0.8} />
            <circle cx={65} cy={25} r={6} fill="white" opacity={0.8} />
            <circle cx={15} cy={55} r={6} fill="white" opacity={0.8} />
            <circle cx={25} cy={65} r={6} fill="white" opacity={0.8} />
            <circle cx={55} cy={55} r={6} fill="white" opacity={0.8} />
            <circle cx={65} cy={65} r={6} fill="white" opacity={0.8} />
          </svg>
        </div>
        <h2>couple<span className="highlight">Ludo</span></h2>
        <p className="subtitle">Play Ludo online with friends!</p>

        <div className="name-input-wrap">
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="input-field"
          />
        </div>

        {!mode && (
          <div className="lobby-actions">
            <button className="btn-primary btn-create" onClick={() => { playClick(); setMode('create'); }} disabled={!name.trim()}>
              <span className="btn-icon">+</span> Create Room
            </button>
            <button className="btn-secondary btn-join" onClick={() => { playClick(); setMode('join'); }} disabled={!name.trim()}>
              <span className="btn-icon">→</span> Join Room
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="lobby-form">
            <label className="form-label">Number of Players</label>
            <div className="player-count-select">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`count-btn ${playerCount === n ? 'active' : ''}`}
                  onClick={() => { playClick(); setPlayerCount(n); }}
                >
                  {n} <span className="count-label">{n === 2 ? 'Duo' : n === 3 ? 'Trio' : 'Squad'}</span>
                </button>
              ))}
            </div>
            <button type="submit" className="btn-primary">Create Game</button>
            <button type="button" className="btn-link" onClick={() => { playClick(); setMode(null); }}>← Back</button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="lobby-form">
            <input
              type="text"
              placeholder="ROOM CODE"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="input-field code-input"
              autoFocus
            />
            <button type="submit" className="btn-primary" disabled={joinCode.length < 6}>
              Join Game
            </button>
            <button type="button" className="btn-link" onClick={() => { playClick(); setMode(null); }}>← Back</button>
          </form>
        )}
      </div>
    </div>
  );
}
