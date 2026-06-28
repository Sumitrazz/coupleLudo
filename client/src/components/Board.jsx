import { useMemo } from 'react';

const C = 38;
const BOARD = 15 * C;

const COL = {
  red:    { bg: '#E53935', lite: '#FFCDD2', dark: '#B71C1C' },
  green:  { bg: '#43A047', lite: '#C8E6C9', dark: '#1B5E20' },
  yellow: { bg: '#FDD835', lite: '#FFF9C4', dark: '#F57F17' },
  blue:   { bg: '#1E88E5', lite: '#BBDEFB', dark: '#0D47A1' },
};

// 52-cell clockwise path (row, col) matching standard Ludo layout
const PATH = [
  // Red start (bottom-right) going UP along right column
  [6,14],[6,13],[6,12],[6,11],[6,10],[6,9],
  // Turn left along top of right arm
  [5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
  // Cross to green quadrant
  [0,7],[0,6],
  // Green start going DOWN along left of top arm
  [1,6],[2,6],[3,6],[4,6],[5,6],
  // Turn left along left side
  [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
  // Cross to blue quadrant
  [7,0],[8,0],
  // Blue start going RIGHT along bottom of left arm
  [8,1],[8,2],[8,3],[8,4],[8,5],
  // Turn down
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],
  // Cross to yellow quadrant
  [14,7],[14,8],
  // Yellow start going LEFT along right of bottom arm
  [13,8],[12,8],[11,8],[10,8],[9,8],
  // Turn right along bottom
  [8,9],[8,10],[8,11],[8,12],[8,13],[8,14],
  // Cross back to red quadrant
  [7,14],
];

const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const HOME_LANE = {
  red:    (i) => [7, 13 - i],
  green:  (i) => [1 + i, 7],
  blue:   (i) => [7, 1 + i],
  yellow: (i) => [13 - i, 7],
};

const BASES = {
  red:    { r: 9, c: 9, tk: [[10.5,10.5],[12.5,10.5],[10.5,12.5],[12.5,12.5]] },
  green:  { r: 0, c: 9, tk: [[1.5,10.5],[3.5,10.5],[1.5,12.5],[3.5,12.5]] },
  blue:   { r: 0, c: 0, tk: [[1.5,1.5],[3.5,1.5],[1.5,3.5],[3.5,3.5]] },
  yellow: { r: 9, c: 0, tk: [[10.5,1.5],[12.5,1.5],[10.5,3.5],[12.5,3.5]] },
};

const START_IDX = { red: 0, blue: 26, green: 13, yellow: 39 };

export default function Board({ gameState, myColor, validMoves, onTokenClick }) {
  const movable = useMemo(
    () => new Set(validMoves.map(m => `${myColor}-${m.tokenId}`)),
    [validMoves, myColor]
  );

  // Colored quadrant backgrounds
  const quads = () => (
    <g>
      <rect x={9*C} y={9*C} width={6*C} height={6*C} fill={COL.red.bg} />
      <rect x={9*C} y={0}   width={6*C} height={6*C} fill={COL.green.bg} />
      <rect x={0}   y={0}   width={6*C} height={6*C} fill={COL.blue.bg} />
      <rect x={0}   y={9*C} width={6*C} height={6*C} fill={COL.yellow.bg} />
    </g>
  );

  // White inner boxes in each home base
  const homeInners = () => Object.entries(BASES).map(([color, b]) => (
    <g key={`inner-${color}`}>
      <rect x={(b.c+0.6)*C} y={(b.r+0.6)*C} width={4.8*C} height={4.8*C}
        fill="white" rx={10} stroke={COL[color].dark} strokeWidth={2} />
    </g>
  ));

  // Grid cells for the cross/path area
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
            fill="white" stroke="#ddd" strokeWidth={0.5} />
        );
      }
    }
    return cells;
  };

  // Color the path cells & home lanes with solid bright colors
  const coloredPath = () => {
    const els = [];

    // Color specific path cells for each player's arm
    const armColors = [
      // Red arm: right side columns 9-14, row 8 (bottom) and row 6 (top)
      { color: 'red', cells: [[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[6,14],[6,13],[6,12],[6,11],[6,10],[6,9]] },
      // Green arm: top rows 0-5, col 8 (right) and col 6 (left)
      { color: 'green', cells: [[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[0,6],[1,6],[2,6],[3,6],[4,6],[5,6]] },
      // Blue arm: left side columns 0-5, row 6 (top) and row 8 (bottom)
      { color: 'blue', cells: [[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5]] },
      // Yellow arm: bottom rows 9-14, col 6 (left) and col 8 (right)
      { color: 'yellow', cells: [[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,8],[13,8],[12,8],[11,8],[10,8],[9,8]] },
    ];

    armColors.forEach(({ color, cells }) => {
      cells.forEach(([r, c]) => {
        els.push(
          <rect key={`arm-${r}-${c}`} x={c*C} y={r*C} width={C} height={C}
            fill={COL[color].lite} stroke={COL[color].bg} strokeWidth={0.5} />
        );
      });
    });

    // Home lanes (solid color)
    ['red','green','blue','yellow'].forEach(color => {
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

  // Safe square markers
  const safeMarkers = () => {
    const els = [];
    SAFE.forEach(idx => {
      if (idx >= PATH.length) return;
      const [r, c] = PATH[idx];
      els.push(
        <text key={`safe-${idx}`} x={c*C+C/2} y={r*C+C/2+1}
          textAnchor="middle" dominantBaseline="middle"
          fill={COL[Object.keys(START_IDX).find(k => START_IDX[k] === idx)]?.dark || '#999'}
          fontSize={20} opacity={0.6}>★</text>
      );
    });
    return els;
  };

  // Start position arrows
  const startArrows = () => {
    const arrows = {
      red:    { pos: PATH[0], char: '→' },
      green:  { pos: PATH[13], char: '↓' },
      blue:   { pos: PATH[26], char: '←' },
      yellow: { pos: PATH[39], char: '↑' },
    };
    return Object.entries(arrows).map(([color, { pos, char }]) => (
      <text key={`start-${color}`} x={pos[1]*C+C/2} y={pos[0]*C+C/2+2}
        textAnchor="middle" dominantBaseline="middle"
        fill={COL[color].dark} fontSize={16} fontWeight="bold">{char}</text>
    ));
  };

  // Center triangles
  const center = () => {
    const cx = 7.5*C, cy = 7.5*C, s = 1.5*C;
    return (
      <g>
        {[
          { color: 'red',    pts: `${cx},${cy+s} ${cx+s},${cy} ${cx},${cy}` },
          { color: 'yellow', pts: `${cx-s},${cy} ${cx},${cy+s} ${cx},${cy}` },
          { color: 'blue',   pts: `${cx},${cy-s} ${cx-s},${cy} ${cx},${cy}` },
          { color: 'green',  pts: `${cx+s},${cy} ${cx},${cy-s} ${cx},${cy}` },
        ].map(({ color, pts }) => (
          <polygon key={`ct-${color}`} points={pts}
            fill={COL[color].bg} stroke="white" strokeWidth={2} />
        ))}
        <polygon points={`${cx},${cy-s} ${cx+s},${cy} ${cx},${cy+s} ${cx-s},${cy}`}
          fill="none" stroke="white" strokeWidth={3} />
      </g>
    );
  };

  // Token renderer
  const drawToken = (key, cx, cy, color, canMove, id, onClick) => {
    const col = COL[color];
    return (
      <g key={key} onClick={onClick} style={{ cursor: canMove ? 'pointer' : 'default' }}>
        {/* Shadow */}
        <ellipse cx={cx} cy={cy+2} rx={C*0.34} ry={C*0.2} fill="rgba(0,0,0,0.15)" />
        {/* Base */}
        <circle cx={cx} cy={cy} r={C*0.38}
          fill={col.bg} stroke={canMove ? '#fff' : col.dark}
          strokeWidth={canMove ? 3 : 2}
          className={canMove ? 'token-pulse' : ''} />
        {/* Shine */}
        <circle cx={cx-3} cy={cy-4} r={C*0.15} fill="white" opacity={0.35} />
        {/* Number */}
        <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize={12} fontWeight="bold"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{id+1}</text>
        {/* Glow ring for movable */}
        {canMove && (
          <circle cx={cx} cy={cy} r={C*0.44} fill="none"
            stroke="white" strokeWidth={2} opacity={0.5}
            className="token-pulse" />
        )}
      </g>
    );
  };

  // Home tokens
  const homeTokens = () => {
    const els = [];
    for (const player of gameState.players) {
      const base = BASES[player.color];
      if (!base) continue;
      for (const token of player.tokens) {
        if (token.state !== 'home') continue;
        const [tr, tc] = base.tk[token.id];
        const key = `${player.color}-${token.id}`;
        const canMove = movable.has(key);
        els.push(drawToken(key, tc*C, tr*C, player.color, canMove, token.id,
          () => canMove && onTokenClick(token.id)));
      }
    }
    return els;
  };

  // Active + home-lane tokens
  const activeTokens = () => {
    const els = [];
    const occupied = {};

    for (const player of gameState.players) {
      for (const token of player.tokens) {
        let r, c;
        if (token.state === 'active') {
          if (token.position >= PATH.length) continue;
          [r, c] = PATH[token.position];
        } else if (token.state === 'homeLane') {
          [r, c] = HOME_LANE[player.color](token.homeLanePos);
        } else continue;

        const posKey = `${r}-${c}`;
        const count = occupied[posKey] || 0;
        occupied[posKey] = count + 1;
        const ox = (count % 2) * 10 - 5 * Math.min(count, 1);
        const oy = Math.floor(count / 2) * 10 - 5 * Math.min(Math.floor(count/2), 1);

        const key = `${player.color}-${token.id}`;
        const canMove = movable.has(key);
        els.push(drawToken(key, c*C+C/2+ox, r*C+C/2+oy, player.color, canMove, token.id,
          () => canMove && onTokenClick(token.id)));
      }
    }
    return els;
  };

  return (
    <div className="board-container">
      <svg viewBox={`-2 -2 ${BOARD+4} ${BOARD+4}`} className="board-svg">
        {/* Board background */}
        <rect x={-2} y={-2} width={BOARD+4} height={BOARD+4}
          fill="#f5f0e1" rx={12} stroke="#5D4037" strokeWidth={4} />

        {quads()}
        {grid()}
        {coloredPath()}
        {homeInners()}
        {safeMarkers()}
        {startArrows()}
        {center()}
        {homeTokens()}
        {activeTokens()}
      </svg>
    </div>
  );
}
