import { useMemo } from 'react';

const C = 38;
const BOARD = 15 * C;

const COL = {
  red:    { bg: '#E53935', lite: '#FFCDD2', dark: '#B71C1C' },
  green:  { bg: '#43A047', lite: '#C8E6C9', dark: '#1B5E20' },
  yellow: { bg: '#FDD835', lite: '#FFF9C4', dark: '#F57F17' },
  blue:   { bg: '#1E88E5', lite: '#BBDEFB', dark: '#0D47A1' },
};

// 52-cell clockwise path (row, col), index 0 = red start (top-left arm).
// Matches engine START_POSITIONS: red=0, green=13, yellow=26, blue=39.
const PATH = [
  [6,1],[6,2],[6,3],[6,4],[6,5],          // 0-4   red start, →
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],    // 5-10  ↑ left of top arm
  [0,7],[0,8],                            // 11-12 top crossover
  [1,8],[2,8],[3,8],[4,8],[5,8],          // 13-17 green start, ↓
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14], // 18-23 → right arm top
  [7,14],[8,14],                          // 24-25 right crossover
  [8,13],[8,12],[8,11],[8,10],[8,9],      // 26-30 yellow start, ←
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8], // 31-36 ↓ right of bottom arm
  [14,7],[14,6],                          // 37-38 bottom crossover
  [13,6],[12,6],[11,6],[10,6],[9,6],      // 39-43 blue start, ↑
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],    // 44-49 ← left arm bottom
  [7,0],                                  // 50    red lane entry
  [6,0],                                  // 51    final crossover
];

const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const START_IDX = { red: 0, green: 13, yellow: 26, blue: 39 };

// Home lanes (6 colored cells from edge toward center), per corner.
const HOME_LANE = {
  red:    (i) => [7, 1 + i],   // mid-left,  →
  green:  (i) => [1 + i, 7],   // mid-top,   ↓
  yellow: (i) => [7, 13 - i],  // mid-right, ←
  blue:   (i) => [13 - i, 7],  // mid-bottom,↑
};

// Home bases (6x6 corner)
const BASES = {
  red:    { r: 0, c: 0 },
  green:  { r: 0, c: 9 },
  yellow: { r: 9, c: 9 },
  blue:   { r: 9, c: 0 },
};
// dice-pattern slots inside a base (relative cells)
const SLOTS = [[1.5, 1.5], [1.5, 4.5], [4.5, 1.5], [4.5, 4.5]];

export default function Board({ gameState, myColor, validMoves, onTokenClick }) {
  const movable = useMemo(
    () => new Set(validMoves.map(m => `${myColor}-${m.tokenId}`)),
    [validMoves, myColor]
  );

  const quads = () => (
    <g>
      <rect x={0}   y={0}   width={6*C} height={6*C} fill={COL.red.bg} />
      <rect x={9*C} y={0}   width={6*C} height={6*C} fill={COL.green.bg} />
      <rect x={9*C} y={9*C} width={6*C} height={6*C} fill={COL.yellow.bg} />
      <rect x={0}   y={9*C} width={6*C} height={6*C} fill={COL.blue.bg} />
    </g>
  );

  // White rounded inner box + 4 dice-dot circles per base
  const homeInners = () => Object.entries(BASES).map(([color, b]) => (
    <g key={`inner-${color}`}>
      <rect x={(b.c + 0.55) * C} y={(b.r + 0.55) * C}
        width={4.9 * C} height={4.9 * C}
        fill="white" rx={12} stroke={COL[color].dark} strokeWidth={2.5} />
      {SLOTS.map(([dr, dc], i) => (
        <circle key={i}
          cx={(b.c + dc) * C} cy={(b.r + dr) * C} r={C * 0.42}
          fill="none" stroke={COL[color].bg} strokeWidth={3} />
      ))}
    </g>
  ));

  const grid = () => {
    const cells = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const inQuad = (r < 6 && c < 6) || (r < 6 && c > 8) ||
                       (r > 8 && c < 6) || (r > 8 && c > 8);
        const inCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;
        if (inQuad || inCenter) continue;
        cells.push(
          <rect key={`g${r}-${c}`} x={c*C} y={r*C} width={C} height={C}
            fill="white" stroke="#cfcfcf" strokeWidth={0.75} />
        );
      }
    }
    return cells;
  };

  const coloredCells = () => {
    const els = [];
    Object.entries(START_IDX).forEach(([color, idx]) => {
      const [r, c] = PATH[idx];
      els.push(
        <rect key={`start-${color}`} x={c*C} y={r*C} width={C} height={C}
          fill={COL[color].bg} stroke="white" strokeWidth={1} />
      );
    });
    ['red', 'green', 'yellow', 'blue'].forEach(color => {
      for (let i = 0; i < 6; i++) {
        const [r, c] = HOME_LANE[color](i);
        els.push(
          <rect key={`hl-${color}-${i}`} x={c*C} y={r*C} width={C} height={C}
            fill={COL[color].bg} stroke="white" strokeWidth={1.5} />
        );
      }
    });
    return els;
  };

  // Clockwise direction chevrons along the track
  const directionArrows = () => {
    const els = [];
    for (let i = 0; i < PATH.length; i++) {
      if (SAFE.has(i)) continue;
      const [r, c] = PATH[i];
      const [nr, nc] = PATH[(i + 1) % PATH.length];
      let rot = 0;
      if (nc > c) rot = 0;
      else if (nc < c) rot = 180;
      else if (nr > r) rot = 90;
      else rot = 270;
      const cx = c * C + C / 2;
      const cy = r * C + C / 2;
      els.push(
        <text key={`arr-${i}`} x={cx} y={cy + 1}
          textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(${rot} ${cx} ${cy})`}
          fill="#c2c2c2" fontSize={16} fontWeight="bold"
          style={{ pointerEvents: 'none' }}>›</text>
      );
    }
    return els;
  };

  // Colored arrows pointing into each home lane
  const laneEntryArrows = () => {
    const arrows = [
      { color: 'red',    cell: PATH[50], char: '→' },
      { color: 'green',  cell: PATH[11], char: '↓' },
      { color: 'yellow', cell: PATH[24], char: '←' },
      { color: 'blue',   cell: PATH[37], char: '↑' },
    ];
    return arrows.map(({ color, cell, char }) => (
      <text key={`le-${color}`} x={cell[1]*C+C/2} y={cell[0]*C+C/2+2}
        textAnchor="middle" dominantBaseline="middle"
        fill={COL[color].bg} fontSize={20} fontWeight="bold"
        style={{ pointerEvents: 'none' }}>{char}</text>
    ));
  };

  const safeMarkers = () => {
    const els = [];
    SAFE.forEach(idx => {
      const [r, c] = PATH[idx];
      const isStart = Object.values(START_IDX).includes(idx);
      els.push(
        <text key={`safe-${idx}`} x={c*C+C/2} y={r*C+C/2+1}
          textAnchor="middle" dominantBaseline="middle"
          fill={isStart ? 'rgba(255,255,255,0.85)' : '#9e9e9e'}
          fontSize={19} style={{ pointerEvents: 'none' }}>★</text>
      );
    });
    return els;
  };

  const center = () => {
    const cx = 7.5*C, cy = 7.5*C, s = 1.5*C;
    return (
      <g>
        {[
          { color: 'red',    pts: `${cx-s},${cy-s} ${cx-s},${cy+s} ${cx},${cy}` },
          { color: 'green',  pts: `${cx-s},${cy-s} ${cx+s},${cy-s} ${cx},${cy}` },
          { color: 'yellow', pts: `${cx+s},${cy-s} ${cx+s},${cy+s} ${cx},${cy}` },
          { color: 'blue',   pts: `${cx-s},${cy+s} ${cx+s},${cy+s} ${cx},${cy}` },
        ].map(({ color, pts }) => (
          <polygon key={`ct-${color}`} points={pts}
            fill={COL[color].bg} stroke="white" strokeWidth={2} />
        ))}
        <polygon points={`${cx},${cy-s} ${cx+s},${cy} ${cx},${cy+s} ${cx-s},${cy}`}
          fill="none" stroke="white" strokeWidth={3} />
      </g>
    );
  };

  const drawToken = (key, cx, cy, color, canMove, id, onClick) => {
    const col = COL[color];
    return (
      <g key={key} onClick={onClick} style={{ cursor: canMove ? 'pointer' : 'default' }}>
        <ellipse cx={cx} cy={cy+2} rx={C*0.32} ry={C*0.18} fill="rgba(0,0,0,0.18)" />
        <circle cx={cx} cy={cy} r={C*0.36}
          fill={col.bg} stroke={canMove ? '#fff' : col.dark}
          strokeWidth={canMove ? 3 : 2}
          className={canMove ? 'token-pulse' : ''} />
        <circle cx={cx-3} cy={cy-4} r={C*0.13} fill="white" opacity={0.4} />
        <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize={12} fontWeight="bold">{id+1}</text>
        {canMove && (
          <circle cx={cx} cy={cy} r={C*0.44} fill="none"
            stroke="#fff" strokeWidth={2} opacity={0.55}
            className="token-pulse" />
        )}
      </g>
    );
  };

  const homeTokens = () => {
    const els = [];
    for (const player of gameState.players) {
      const base = BASES[player.color];
      if (!base) continue;
      for (const token of player.tokens) {
        if (token.state !== 'home') continue;
        const [sr, sc] = SLOTS[token.id];
        const key = `${player.color}-${token.id}`;
        const canMove = movable.has(key);
        els.push(drawToken(key, (base.c+sc)*C, (base.r+sr)*C, player.color, canMove,
          token.id, () => canMove && onTokenClick(token.id)));
      }
    }
    return els;
  };

  const activeTokens = () => {
    const els = [];
    const occupied = {};
    for (const player of gameState.players) {
      for (const token of player.tokens) {
        let r, c;
        if (token.state === 'active') {
          if (token.position < 0 || token.position >= PATH.length) continue;
          [r, c] = PATH[token.position];
        } else if (token.state === 'homeLane') {
          const lp = Math.min(token.homeLanePos, 5);
          [r, c] = HOME_LANE[player.color](lp);
        } else continue;

        const posKey = `${r}-${c}`;
        const n = occupied[posKey] || 0;
        occupied[posKey] = n + 1;
        const ox = n > 0 ? (n % 2) * 9 - 4.5 : 0;
        const oy = n > 0 ? Math.floor(n / 2) * 9 - 4.5 : 0;

        const key = `${player.color}-${token.id}`;
        const canMove = movable.has(key);
        els.push(drawToken(key, c*C+C/2+ox, r*C+C/2+oy, player.color, canMove,
          token.id, () => canMove && onTokenClick(token.id)));
      }
    }
    return els;
  };

  return (
    <div className="board-container">
      <svg viewBox={`-3 -3 ${BOARD+6} ${BOARD+6}`} className="board-svg">
        <rect x={-3} y={-3} width={BOARD+6} height={BOARD+6}
          fill="#ffffff" rx={14} stroke="#1a1a2e" strokeWidth={5} />

        {quads()}
        {grid()}
        {coloredCells()}
        {homeInners()}
        {directionArrows()}
        {safeMarkers()}
        {laneEntryArrows()}
        {center()}
        {homeTokens()}
        {activeTokens()}
      </svg>
    </div>
  );
}
