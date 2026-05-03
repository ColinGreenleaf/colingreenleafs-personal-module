import { getSquareElevation } from './elevation.mjs';

const MOVEMENT_RANGE_NAME = 'movement-range-container';
const MODULE_ID = 'colingreenleafs-personal-module'; 



/* ___________________________________________________
 *
 * BFS Logic
 * ___________________________________________________
 */
const computeReachable = (token, multiplier = 1) => {
  const totalSpeed = token.actor?.system?.movement?.value ?? 0;
  
  // Calculate remaining speed
  const speed = (totalSpeed * multiplier);
  const movementTypes = token.actor?.system?.movement?.types;

  if (speed <= 0) return new Set();

  const G  = canvas.grid.size;
  const ox = Math.floor(token.document.x / G);
  const oy = Math.floor(token.document.y / G);

  const visited = new Map(); 
  const queue   = [{ x: ox, y: oy, cost: 0 }];
  visited.set(`${ox},${oy}`, 0);

  const DIRS = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }];

  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    for (const { dx, dy } of DIRS) {
      const nx   = cur.x + dx;
      const ny   = cur.y + dy;
      const nKey = `${nx},${ny}`;
      
      // const ray = new Ray(
      //   { x: (cur.x + 0.5) * G, y: (cur.y + 0.5) * G },
      //   { x: (nx + 0.5) * G, y: (ny + 0.5) * G }
      // );
      // if (canvas.walls.checkCollision(ray, { mode: "any" })) continue;

      const cost = cur.cost + getMoveCost(movementTypes, cur, { x: nx, y: ny }, cur.cost);

      if (cost > speed) continue;
      if ((visited.get(nKey) ?? Infinity) <= cost) continue;

      visited.set(nKey, cost);
      queue.push({ x: nx, y: ny, cost });
    }
  }

  return new Set(visited.keys());
};


const getMoveCost = (movementTypes, from, to, costSoFar) => {
  const eFrom = getSquareElevation(from);
  const eTo = getSquareElevation(to);
  const diff = eTo - eFrom;
  const absDiff = Math.abs(diff);

  // If the change is negligible (0 or 1), it's just standard 1 movement cost
  if (absDiff < 2) return 1;

  // CLIMBING DOWN (Elevation decreases by 2 or more)
  if (diff <= -2) {
    if (movementTypes?.has('climb')) return absDiff;
    else return 2 * absDiff - 1;
  }

  // CLIMBING UP (Elevation increases by 2 or more)
  if (diff >= 2) {
    if (movementTypes?.has('climb')) return absDiff;
    if (movementTypes?.has('fly')) {
      // Flyer logic: 1 free vertical per horizontal step taken
      const freeRemaining = costSoFar - eFrom;
      const extraVertical = Math.max(0, absDiff - Math.max(0, freeRemaining));
      return 1 + extraVertical;
    }
    // Default "scramble" up
    return 2 * absDiff - 1;
  }

  return 1;
};


/* ___________________________________________________
 *
 * RENDERING
 * ___________________________________________________
 */
const clearMovementRange = () => {
  const existing = canvas.primary.getChildByName(MOVEMENT_RANGE_NAME);
  if (existing) existing.destroy({ children: true });
};

const drawMovementRange = (token) => {
  clearMovementRange();

  const reachableKeys = computeReachable(token);
  if (!reachableKeys.size) return;

  const GRID         = canvas.grid.size;
  const container = new PIXI.Container();
  container.name  = MOVEMENT_RANGE_NAME;

  // --- Collect perimeter edges ---
  const DIRS    = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
  const edgeSet = new Set();
  const edges   = [];

  for (const key of reachableKeys) {
    const [x, y] = key.split(',').map(Number);
    for (const { dx, dy } of DIRS) {
      if (reachableKeys.has(`${x + dx},${y + dy}`)) continue;

      const isVert = dx !== 0;
      const edgeKey = isVert
        ? `v:${x + (dx > 0 ? 1 : 0)},${y}`
        : `h:${x},${y + (dy > 0 ? 1 : 0)}`;
      if (edgeSet.has(edgeKey)) continue;
      edgeSet.add(edgeKey);

      edges.push({
        x1: isVert ? (x + (dx > 0 ? 1 : 0)) * GRID : x * GRID,
        y1: isVert ? y * GRID                      : (y + (dy > 0 ? 1 : 0)) * GRID,
        x2: isVert ? (x + (dx > 0 ? 1 : 0)) * GRID : (x + 1) * GRID,
        y2: isVert ? (y + 1) * GRID                : (y + (dy > 0 ? 1 : 0)) * GRID,
      });
    }
  }

  // --- Glow layer ---
  const glow = new PIXI.Graphics();
  glow.lineStyle(10, 0xffffff, 0.35);
  for (const { x1, y1, x2, y2 } of edges)
    glow.moveTo(x1, y1).lineTo(x2, y2);
  glow.filters = [new PIXI.BlurFilter(8)];
  container.addChild(glow);

  // --- Crisp line ---
  const line = new PIXI.Graphics();
  line.lineStyle(5, 0xffffff, 0.9);
  for (const { x1, y1, x2, y2 } of edges)
    line.moveTo(x1, y1).lineTo(x2, y2);
  container.addChild(line);

  canvas.primary.addChild(container);
};

/* ___________________________________________________
 *
 * HOOKS
 * ___________________________________________________
 */

// Show range when a combatant's turn begins
Hooks.on('combatTurnChange', (combat, prior, current) => {
  const combatant = combat.combatants.get(current.combatantId);
  clearMovementRange();
  if (!combatant) return;
  const token = canvas.tokens.get(combatant.tokenId);
  if (token) drawMovementRange(token);
});

Hooks.on('updateToken', (tokenDoc, changes) => {
  if (changes.x === undefined && changes.y === undefined) return;

  // Only redraw if this is the active combatant's token
  const combat = game.combat;
  if (!combat?.combatant) return;
  if (combat.combatant.tokenId !== tokenDoc.id) return;

  const token = canvas.tokens.get(tokenDoc.id);
  if (!token) return;

  //wait for animation to finish before redrawing, else the redraw is delayed by 1 movement
  const animation = token.movementAnimationPromise;
  if (animation) {
    animation.then(() => drawMovementRange(token));
  } else {
    drawMovementRange(token);
  }
});

// Clear when combat ends
Hooks.on('deleteCombat', () => clearMovementRange());

// Clear when leaving the scene
Hooks.on('canvasTearDown', () => clearMovementRange());
