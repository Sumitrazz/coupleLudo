import { useState, useCallback, useEffect } from 'react';
import { socket } from '../socket';
import Board from './Board';
import Dice from './Dice';
import {
  playClick, playDiceResult, playTokenMove, playTokenEnter,
  playCapture, playFinish, playWin, playTurnStart, playError,
  playExtraTurn, playSix,
} from '../audio';

export default function Game({ gameState, myColor, myId, onLeave }) {
  const [diceValue, setDiceValue] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [validMoves, setValidMoves] = useState([]);
  const [message, setMessage] = useState('');

  const isMyTurn = gameState.currentPlayer === myId;
  const currentPlayerData = gameState.players.find((p) => p.id === gameState.currentPlayer);

  useEffect(() => {
    if (isMyTurn && !rolling && validMoves.length === 0) {
      playTurnStart();
    }
  }, [isMyTurn, gameState.currentPlayer]);

  useEffect(() => {
    const handleDiceRolled = (data) => {
      setDiceValue(data.value);
      setRolling(false);

      if (data.value === 6) playSix();
      else playDiceResult();

      if (data.bust) {
        playError();
        setMessage('Three 6s in a row! Turn lost.');
        setValidMoves([]);
        return;
      }

      if (data.playerId === myId) {
        setValidMoves(data.validMoves || []);
        if (data.autoSkip) {
          setMessage(`Rolled ${data.value} — no moves available`);
          setValidMoves([]);
        } else if (data.validMoves?.length === 1) {
          socket.emit('move-token', { tokenId: data.validMoves[0].tokenId }, () => {});
          setValidMoves([]);
        } else if (data.validMoves?.length > 1) {
          setMessage(`Rolled ${data.value} — pick a token`);
        }
      } else {
        setValidMoves([]);
      }
    };

    const handleTokenMoved = (data) => {
      setValidMoves([]);
      setDiceValue(null);

      if (data.winner) {
        playWin();
        const winner = gameState.players.find((p) => p.id === data.playerId);
        setMessage(`${winner?.name || 'Someone'} wins!`);
      } else if (data.captures?.length > 0) {
        playCapture();
        setMessage('Capture!');
      } else if (data.finished) {
        playFinish();
        setMessage('Token home!');
      } else if (data.action === 'enter') {
        playTokenEnter();
        setMessage('');
      } else {
        playTokenMove();
        setMessage('');
      }

      if (data.extraTurn && !data.winner) {
        setTimeout(() => {
          playExtraTurn();
          setMessage('Extra turn!');
        }, 300);
      }
    };

    socket.on('dice-rolled', handleDiceRolled);
    socket.on('token-moved', handleTokenMoved);

    return () => {
      socket.off('dice-rolled', handleDiceRolled);
      socket.off('token-moved', handleTokenMoved);
    };
  }, [myId, gameState.players]);

  const rollDice = useCallback(() => {
    if (!isMyTurn || rolling) return;
    setRolling(true);
    setMessage('');

    setTimeout(() => {
      socket.emit('roll-dice', {}, (res) => {
        if (res.error) {
          setRolling(false);
          playError();
          setMessage(res.error);
        }
      });
    }, 350);
  }, [isMyTurn, rolling]);

  const handleTokenClick = useCallback((tokenId) => {
    if (!isMyTurn || validMoves.length === 0) return;
    const move = validMoves.find((m) => m.tokenId === tokenId);
    if (!move) return;
    playClick();
    socket.emit('move-token', { tokenId }, (res) => {
      if (res.error) {
        playError();
        setMessage(res.error);
      }
    });
    setValidMoves([]);
  }, [isMyTurn, validMoves]);

  return (
    <div className="game-screen">
      <div className="game-info-bar">
        {gameState.players.map((p) => (
          <div
            key={p.id}
            className={`player-chip ${p.id === gameState.currentPlayer ? 'active-chip' : ''} ${p.id === myId ? 'my-chip' : ''}`}
            style={{ '--player-color': p.color }}
          >
            <div className="chip-avatar" style={{ background: p.color }}>{p.name[0]}</div>
            <div className="chip-info">
              <span className="chip-name">{p.name}{p.id === myId ? ' (You)' : ''}</span>
              <div className="chip-tokens">
                {[0,1,2,3].map(i => (
                  <span key={i} className={`mini-token ${p.tokens[i].state === 'finished' ? 'done' : ''}`}
                    style={{ background: p.tokens[i].state === 'finished' ? p.color : 'rgba(255,255,255,0.2)' }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Board
        gameState={gameState}
        myColor={myColor}
        validMoves={validMoves}
        onTokenClick={handleTokenClick}
      />

      <div className="game-controls">
        {message && (
          <div className={`game-message ${message.includes('wins') ? 'winner-msg' : message.includes('Capture') ? 'capture-msg' : ''}`}>
            {message}
          </div>
        )}

        <div className="turn-indicator">
          {gameState.gameStatus === 'finished' ? (
            <div className="winner-banner">
              <span className="trophy">&#127942;</span>
              {gameState.players.find((p) => p.id === gameState.winner)?.name} wins!
            </div>
          ) : isMyTurn ? (
            <span className="your-turn">Your Turn!</span>
          ) : (
            <span className="waiting">
              <span className="waiting-dot" style={{ background: currentPlayerData?.color }} />
              {currentPlayerData?.name}'s turn...
            </span>
          )}
        </div>

        {gameState.gameStatus !== 'finished' && (
          <Dice
            value={diceValue}
            rolling={rolling}
            onRoll={rollDice}
            disabled={!isMyTurn || validMoves.length > 0}
          />
        )}

        <button className="btn-leave" onClick={() => { playClick(); onLeave(); }}>
          Leave Game
        </button>
      </div>
    </div>
  );
}
