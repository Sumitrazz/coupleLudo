import { useState, useEffect } from 'react';
import { playDiceRoll } from '../audio';

const DOT_POSITIONS = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[30, 30], [50, 50], [70, 70]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 25], [70, 25], [30, 50], [70, 50], [30, 75], [70, 75]],
};

export default function Dice({ value, rolling, onRoll, disabled }) {
  const [showValue, setShowValue] = useState(value || 1);
  const [animFrames, setAnimFrames] = useState(false);

  useEffect(() => {
    if (rolling) {
      setAnimFrames(true);
      const interval = setInterval(() => {
        setShowValue(Math.floor(Math.random() * 6) + 1);
      }, 60);
      return () => clearInterval(interval);
    } else {
      setAnimFrames(false);
      if (value) setShowValue(value);
    }
  }, [rolling, value]);

  const dots = DOT_POSITIONS[showValue] || DOT_POSITIONS[1];

  const handleClick = () => {
    if (disabled || rolling) return;
    playDiceRoll();
    onRoll();
  };

  return (
    <div className="dice-area">
      <div
        className={`dice-3d ${animFrames ? 'dice-rolling' : ''} ${!disabled && !rolling ? 'dice-clickable' : ''}`}
        onClick={handleClick}
      >
        <svg viewBox="0 0 100 100" width={90} height={90}>
          <defs>
            <linearGradient id="dice-face" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e8e8e8" />
            </linearGradient>
            <filter id="dice-shadow">
              <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.35" />
            </filter>
            <radialGradient id="dot-grad" cx="40%" cy="40%">
              <stop offset="0%" stopColor="#555" />
              <stop offset="100%" stopColor="#1a1a1a" />
            </radialGradient>
          </defs>
          <rect
            x={5} y={5} width={90} height={90}
            rx={16} ry={16}
            fill="url(#dice-face)"
            stroke="#ccc"
            strokeWidth={2}
            filter="url(#dice-shadow)"
          />
          {dots.map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={9} fill="url(#dot-grad)" />
          ))}
        </svg>
      </div>
      {!disabled && !rolling && (
        <p className="dice-hint">Tap to roll!</p>
      )}
    </div>
  );
}
