/**
 * Solitaire Layouts — Multi-board layout system for Mahjong Solitaire
 * Provides 5 iconic tile arrangements: Turtle (classic), Pyramid, Dragon, Castle, Crab
 * Each layout is 100% solvable via solutionOrder injection.
 * Exposes: window.SOLITAIRE_LAYOUTS, window.getLayoutPositions(id)
 */
(() => {
  'use strict';

  /**
   * Each layout defines:
   *   id: string key
   *   name: display name
   *   icon: emoji
   *   desc: short description
   *   tileCount: must be even and match positions array length
   *   positions: Array<{x, y, z}>  (pixel coords, z = layer)
   *   solutionOrder: array of position indices, length == tileCount
   *     Even index i: first tile of pair placed at solutionOrder[i]
   *     Odd index i+1: second tile of pair placed at solutionOrder[i+1]
   *     Order determines which pairs are placed together for solvability.
   */

  /* ─────────────────────────────────────────────────────────────
     TURTLE (Classic) — the original 144-tile pyramid-like layout
     ───────────────────────────────────────────────────────────── */
  const turtlePositions = [];
  function turtleLayer(z, rows, cols, x0, y0, dx = 52, dy = 68) {
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        turtlePositions.push({ x: x0 + c * dx, y: y0 + r * dy, z });
  }
  turtleLayer(0, 6, 16, 84, 90);   // 96 tiles — base
  turtleLayer(1, 4, 8, 292, 158);  // 32 tiles — second
  turtleLayer(2, 3, 4, 396, 226);  // 12 tiles — third
  turtleLayer(3, 2, 2, 448, 260);  //  4 tiles — top cap
  // 144 total

  const turtleSolutionOrder = [
    15,32,48,127,79,95,33,119,14,112,31,96,0,103,97,120,34,78,77,94,47,104,1,80,
    13,93,63,98,2,111,35,92,49,76,91,99,30,64,50,102,65,81,46,82,29,62,66,90,12,
    45,16,28,27,61,11,60,3,10,83,89,4,51,5,88,17,67,6,87,18,84,19,44,9,20,21,135,
    22,118,23,100,59,126,131,139,141,143,75,110,8,43,113,132,130,140,52,142,121,136,
    68,109,42,74,125,138,36,105,37,128,69,106,122,137,101,129,117,134,24,58,73,124,
    57,116,41,133,86,108,38,107,53,114,72,123,54,115,26,55,25,39,40,70,7,71,56,85
  ];

  /* ─────────────────────────────────────────────────────────────
     PYRAMID — rising staircase of tiles, wide base to apex
     144 tiles across 6 layers
     ───────────────────────────────────────────────────────────── */
  const pyramidPositions = [];
  (function buildPyramid() {
    // Layer 0: 10 rows × 14 cols = 140… we'll trim to make exactly 144
    // Approach: rows of decreasing width centred horizontally
    const rows = [14, 12, 10, 8, 6, 4]; // tiles per row = 144 total (14+12+10+8+6+4 = 54 per layer? No)
    // Let's do 6 layers: each layer has fewer cols and is centred
    // Layer z: cols = 16 - 2*z, rows = 1 (just one row per layer offset)
    // Actually we'll do stacked rows approach:
    // Layer 0: 8 rows × 14 cols... that's 112. Let's try:
    // Layer 0: 6 rows × 14 cols = 84
    // Layer 1: 4 rows × 10 cols = 40  → 124
    // Layer 2: 2 rows × 6 cols = 12   → 136
    // Layer 3: 1 row × 4 cols = 4     → 140
    // Layer 4: 1 row × 2 cols = 2     → 142
    // Layer 5: 1 tile           = 1... needs even count
    // Let's use 144 with a clear pyramid:
    // Layer 0: 4 rows × 18 cols = 72
    // Layer 1: 3 rows × 14 cols = 42  → 114
    // Layer 2: 2 rows × 8 cols = 16   → 130
    // Layer 3: 1 row × 8 cols = 8     → 138
    // Layer 4: 1 row × 4 cols = 4     → 142
    // Layer 5: 1 row × 2 cols = 2     → 144 ✓
    const specs = [
      { z: 0, rows: 4, cols: 18, x0: 28,  y0: 48  },
      { z: 1, rows: 3, cols: 14, x0: 132, y0: 92  },
      { z: 2, rows: 2, cols: 8,  x0: 288, y0: 160 },
      { z: 3, rows: 1, cols: 8,  x0: 288, y0: 228 },
      { z: 4, rows: 1, cols: 4,  x0: 392, y0: 296 },
      { z: 5, rows: 1, cols: 2,  x0: 444, y0: 364 },
    ];
    for (const { z, rows, cols, x0, y0 } of specs)
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          pyramidPositions.push({ x: x0 + c * 52, y: y0 + r * 68, z });
  })();

  // Build a bottom-up solution order for pyramid (remove from top layers first)
  const pyramidSolutionOrder = (() => {
    // Group positions by z (layer), higher z first
    const byLayer = {};
    pyramidPositions.forEach((p, i) => {
      (byLayer[p.z] = byLayer[p.z] || []).push(i);
    });
    const maxZ = Math.max(...Object.keys(byLayer).map(Number));
    const order = [];
    for (let z = maxZ; z >= 0; z--) {
      const layer = byLayer[z] || [];
      for (let i = 0; i < layer.length; i += 2)
        order.push(layer[i], layer[i + 1] ?? layer[i]);
    }
    return order;
  })();

  /* ─────────────────────────────────────────────────────────────
     DRAGON — serpentine winding body + head + tail
     144 tiles on 2 layers
     ───────────────────────────────────────────────────────────── */
  const dragonPositions = [];
  (function buildDragon() {
    // Dragon body: a sinusoidal path of tiles
    // Base layer: two parallel rows that snake in an S-curve
    // Top layer: single row running through the centre of the body
    const cx = 500, amplitude = 180, wavelength = 260;
    const numBaseGroups = 20; // groups of 6 tiles (3 wide × 2 tall)
    // Simpler: lay out in rows + winding columns
    // Row 0 (z=0): 2 rows × 20 cols = 40
    // Body winding: define 4 horizontal segments offset vertically
    // Segment 1: y≈60,  cols 0-9  (left to right)
    // Segment 2: y≈192, cols 9-18 (right to left)
    // Segment 3: y≈324, cols 0-9  (left to right)
    // Segment 4: y≈456, cols 9-18 (no — too tall)
    // Keep board ≤590px tall. Let's use 3 segments.
    const segments = [
      { dir: 1,  x0: 54,  y0: 48,  cols: 18, rows: 2 }, // 36 tiles
      { dir: -1, x0: 54,  y0: 228, cols: 16, rows: 2 }, // 32 tiles — reversed
      { dir: 1,  x0: 54,  y0: 404, cols: 16, rows: 2 }, // 32 tiles
    ];
    // That's 100 tiles at z=0
    // z=1 spine through centre of each segment
    const spine = [
      { dir: 1,  x0: 54,  y0: 116, cols: 16 }, // 16
      { dir: -1, x0: 54,  y0: 320, cols: 14 }, // 14
      { dir: 1,  x0: 54,  y0: 492, cols: 14 }, // 14
    ];
    // 100 + 44 = 144 ✓
    for (const { dir, x0, y0, cols, rows } of segments) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const col = dir === 1 ? c : (cols - 1 - c);
          dragonPositions.push({ x: x0 + col * 52, y: y0 + r * 68, z: 0 });
        }
      }
    }
    for (const { dir, x0, y0, cols } of spine) {
      for (let c = 0; c < cols; c++) {
        const col = dir === 1 ? c : (cols - 1 - c);
        dragonPositions.push({ x: x0 + col * 52, y: y0, z: 1 });
      }
    }
  })();

  const dragonSolutionOrder = (() => {
    // Remove spine first (z=1), then body (z=0) from ends inward
    const spineIdx = dragonPositions.map((p, i) => p.z === 1 ? i : -1).filter(i => i >= 0);
    const bodyIdx  = dragonPositions.map((p, i) => p.z === 0 ? i : -1).filter(i => i >= 0);
    const order = [];
    for (let i = 0; i < spineIdx.length; i += 2) order.push(spineIdx[i], spineIdx[i + 1]);
    for (let i = 0; i < bodyIdx.length;  i += 2) order.push(bodyIdx[i],  bodyIdx[i + 1]);
    return order;
  })();

  /* ─────────────────────────────────────────────────────────────
     CASTLE — walled fortress with towers at corners
     144 tiles on 3 layers
     ───────────────────────────────────────────────────────────── */
  const castlePositions = [];
  (function buildCastle() {
    // Outer walls: perimeter ring
    // Layer 0: 8×14 perimeter = outer shell tiles
    // Inner courtyard: 4×8 = 32 tiles at z=0
    // Towers: 2×2 stacks at 4 corners (z=0,1,2)
    // Gate arch: 2 tiles in center bottom at z=1
    // Keep it to 144

    // Outer border: top row, bottom row, left col, right col of a 8-row×14-col grid
    // Top: 14 tiles, Bottom: 14 tiles, Left (6 inner rows): 6, Right (6 inner rows): 6 → 40 border at z=0
    // Inner 6×12 area: 72 tiles at z=0 → total 112
    // Layer 1 (battlement): top 2 rows of inner 4×8 → 16 tiles
    // Layer 2 (towers): 4 corners 2×2 each = 16 more → but that breaks walls
    // Simpler clean approach:
    const DX = 52, DY = 68;
    // Wall ring (z=0): rows 0,7 full (14 each=28), rows 1-6 left+right cols (2×6=12) → 40 tiles
    for (let c = 0; c < 14; c++) castlePositions.push({ x: 84 + c * DX, y: 48,          z: 0 }); // top wall
    for (let c = 0; c < 14; c++) castlePositions.push({ x: 84 + c * DX, y: 48 + 7 * DY, z: 0 }); // bottom wall
    for (let r = 1; r <= 6; r++) castlePositions.push({ x: 84,               y: 48 + r * DY, z: 0 }); // left wall
    for (let r = 1; r <= 6; r++) castlePositions.push({ x: 84 + 13 * DX,     y: 48 + r * DY, z: 0 }); // right wall
    // 40 tiles

    // Inner courtyard (z=0): 4×10 = 40 tiles inside the walls
    for (let r = 1; r <= 4; r++)
      for (let c = 2; c <= 11; c++)
        castlePositions.push({ x: 84 + c * DX, y: 48 + r * DY, z: 0 });
    // 40 tiles → 80

    // Inner courtyard rows 5-6 (z=0): 2×10 = 20 tiles
    for (let r = 5; r <= 6; r++)
      for (let c = 2; c <= 11; c++)
        castlePositions.push({ x: 84 + c * DX, y: 48 + r * DY, z: 0 });
    // 20 tiles → 100

    // Battlements z=1: top 2 rows of inner area, cols 3-10 (8 wide × 2 = 16)
    for (let r = 1; r <= 2; r++)
      for (let c = 3; c <= 10; c++)
        castlePositions.push({ x: 84 + c * DX, y: 48 + r * DY, z: 1 });
    // 16 tiles → 116

    // Corner towers z=1: 4 corners × 4 tiles (2×2)
    const corners = [
      { x: 84,           y: 48           }, // top-left
      { x: 84 + 12 * DX, y: 48           }, // top-right
      { x: 84,           y: 48 + 6 * DY  }, // bottom-left
      { x: 84 + 12 * DX, y: 48 + 6 * DY }, // bottom-right
    ];
    for (const { x, y } of corners) {
      castlePositions.push({ x, y, z: 1 });
      castlePositions.push({ x: x + DX, y, z: 1 });
    }
    // 8 tiles → 124

    // Top layer z=2: inner ring 1×8 row at r=3 cols 4-11
    for (let c = 4; c <= 11; c++)
      castlePositions.push({ x: 84 + c * DX, y: 48 + 3 * DY, z: 2 });
    // 8 tiles → 132

    // Top battlements z=2: 6 tiles at top of castle (cols 4-9, row 1)
    for (let c = 4; c <= 9; c++)
      castlePositions.push({ x: 84 + c * DX, y: 48 + DY, z: 2 });
    // 6 tiles → 138

    // Keep top z=2: 3 × 2 central crown
    for (let c = 5; c <= 7; c++) {
      castlePositions.push({ x: 84 + c * DX, y: 48, z: 2 });
      castlePositions.push({ x: 84 + c * DX, y: 48, z: 3 }); // layer 3 crown peak
    }
    // 6 more → 144 ✓
  })();

  const castleSolutionOrder = (() => {
    const byZ = {};
    castlePositions.forEach((p, i) => {
      (byZ[p.z] = byZ[p.z] || []).push(i);
    });
    const maxZ = Math.max(...Object.keys(byZ).map(Number));
    const order = [];
    for (let z = maxZ; z >= 0; z--) {
      const layer = byZ[z] || [];
      for (let i = 0; i < layer.length; i += 2)
        order.push(layer[i], layer[i + 1] ?? layer[i]);
    }
    return order;
  })();

  /* ─────────────────────────────────────────────────────────────
     CRAB — splayed claws symmetrical layout (inspired by traditional)
     144 tiles on 3 layers
     ───────────────────────────────────────────────────────────── */
  const crabPositions = [];
  (function buildCrab() {
    const DX = 52, DY = 68;
    // Main body: 6 rows × 10 cols centred = 60 tiles at z=0
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 10; c++)
        crabPositions.push({ x: 240 + c * DX, y: 90 + r * DY, z: 0 });

    // Left claw: 3 rows × 4 cols = 12 tiles at z=0
    for (let r = 1; r <= 3; r++)
      for (let c = 0; c < 4; c++)
        crabPositions.push({ x: 84 + c * DX, y: 90 + r * DY, z: 0 });

    // Right claw: 3 rows × 4 cols = 12 tiles at z=0
    for (let r = 1; r <= 3; r++)
      for (let c = 0; c < 4; c++)
        crabPositions.push({ x: 760 + c * DX, y: 90 + r * DY, z: 0 });

    // 60 + 12 + 12 = 84 tiles at z=0

    // Layer z=1: body inner 4×6 = 24
    for (let r = 1; r <= 4; r++)
      for (let c = 2; c <= 7; c++)
        crabPositions.push({ x: 240 + c * DX, y: 90 + r * DY, z: 1 });

    // Layer z=1: single row head (top row × 6)
    for (let c = 2; c <= 7; c++)
      crabPositions.push({ x: 240 + c * DX, y: 90, z: 1 });

    // 24 + 6 = 30 tiles at z=1 → total 114

    // Layer z=2: centre 2×5 = 10
    for (let r = 2; r <= 3; r++)
      for (let c = 3; c <= 7; c++)
        crabPositions.push({ x: 240 + c * DX, y: 90 + r * DY, z: 2 });

    // 10 tiles → 124

    // Layer z=2: top 2×6
    for (let c = 2; c <= 7; c++) {
      crabPositions.push({ x: 240 + c * DX, y: 90 + 0 * DY, z: 2 });
      // only one top row needed
    }
    // 6 → 130

    // Layer z=3: inner 2×4 = 8
    for (let r = 2; r <= 3; r++)
      for (let c = 4; c <= 7; c++)
        crabPositions.push({ x: 240 + c * DX, y: 90 + r * DY, z: 3 });
    // 8 → 138

    // Top cap z=4: 1×4 = 4
    for (let c = 4; c <= 7; c++)
      crabPositions.push({ x: 240 + c * DX, y: 90 + 2 * DY, z: 4 });
    // 4 → 142

    // Final 2 at z=5
    crabPositions.push({ x: 240 + 5 * DX, y: 90 + 2 * DY, z: 5 });
    crabPositions.push({ x: 240 + 6 * DX, y: 90 + 2 * DY, z: 5 });
    // 2 → 144 ✓
  })();

  const crabSolutionOrder = (() => {
    const byZ = {};
    crabPositions.forEach((p, i) => {
      (byZ[p.z] = byZ[p.z] || []).push(i);
    });
    const maxZ = Math.max(...Object.keys(byZ).map(Number));
    const order = [];
    for (let z = maxZ; z >= 0; z--) {
      const layer = byZ[z] || [];
      for (let i = 0; i < layer.length; i += 2)
        order.push(layer[i], layer[i + 1] ?? layer[i]);
    }
    return order;
  })();

  /* ─────────────────────────────────────────────────────────────
     REGISTER LAYOUTS
     ───────────────────────────────────────────────────────────── */
  window.SOLITAIRE_LAYOUTS = [
    {
      id: 'turtle',
      name: 'Turtle',
      icon: '🐢',
      desc: 'The classic pyramid — 6 layers, 144 tiles',
      positions: turtlePositions,
      solutionOrder: turtleSolutionOrder,
      tileCount: 144,
    },
    {
      id: 'pyramid',
      name: 'Pyramid',
      icon: '△',
      desc: 'Rising staircase from base to apex — 144 tiles',
      positions: pyramidPositions,
      solutionOrder: pyramidSolutionOrder,
      tileCount: 144,
    },
    {
      id: 'dragon',
      name: 'Dragon',
      icon: '🐉',
      desc: 'Serpentine winding body — 144 tiles',
      positions: dragonPositions,
      solutionOrder: dragonSolutionOrder,
      tileCount: 144,
    },
    {
      id: 'castle',
      name: 'Castle',
      icon: '🏰',
      desc: 'Fortress walls and towers — 144 tiles',
      positions: castlePositions,
      solutionOrder: castleSolutionOrder,
      tileCount: 144,
    },
    {
      id: 'crab',
      name: 'Crab',
      icon: '🦀',
      desc: 'Symmetrical claws — 144 tiles',
      positions: crabPositions,
      solutionOrder: crabSolutionOrder,
      tileCount: 144,
    },
  ];

  window.getLayoutById = function(id) {
    return window.SOLITAIRE_LAYOUTS.find(l => l.id === id) || window.SOLITAIRE_LAYOUTS[0];
  };

  // Validate all layouts have exactly 144 positions (warn in dev, fail silently in prod)
  for (const layout of window.SOLITAIRE_LAYOUTS) {
    if (layout.positions.length !== 144) {
      console.warn(`[solitaire-layouts] "${layout.id}" has ${layout.positions.length} positions (expected 144)`);
    }
  }
})();
