// const { ApplicationV2 } = foundry.applications.api;

const ELEVATION_FLAG_KEY = 'elevation-levels';
const MODULE_NAME = 'colingreenleafs-personal-module';

const ELEVATION_COLORS = {
  0: 0xffffff,  // White for ground level
  1: 0xffff00,  // Yellow
  2: 0xff8800,  // Orange
  3: 0xff0000,  // Red
  4: 0xff00ff,  // Magenta
  5: 0x00ffff,  // Cyan
  6: 0x00ff00,   // Green
};

const getElevationColor = (elevation) => {
  return ELEVATION_COLORS[elevation] || ELEVATION_COLORS[0];
};

const getElevationMap = () => {
  return canvas.scene.getFlag(MODULE_NAME, ELEVATION_FLAG_KEY) ?? {};
};

const setElevationMap = async (map) => {
  //unset all flags, the set new map
  await canvas.scene.unsetFlag(MODULE_NAME, ELEVATION_FLAG_KEY);
  if (Object.keys(map).length > 0) {
    await canvas.scene.setFlag(MODULE_NAME, ELEVATION_FLAG_KEY, map);
  }
};

const toKey = (square) => `${square.x},${square.y}`;

// Get elevation for a specific square, defaulting to 0 if not set
export const getSquareElevation = (square) => {
  const map = getElevationMap();
  return map[toKey(square)] ?? 0;
};

// Set elevation for a specific square
export const setSquareElevation = async (square, elevation) => {
  const map = foundry.utils.deepClone(getElevationMap());
  const key = toKey(square);

  if (elevation === 0) {
    delete map[key];
  } else {
    map[key] = elevation;
  }

  await setElevationMap(map);
};

// Get a list of all squares with elevation data
export const getSquaresWithElevation = () => {
  const map = getElevationMap();
  return Object.entries(map).map(([key, value]) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y, elevation: value };
  });
};

// Clear elevation for a specific square
export const clearSquareElevation = async (square) => {
  await setSquareElevation(square, 0);
};

// Clear elevation for all squares
export const clearAllElevations = async () => {
  if (!canvas.scene) return;
  await canvas.scene.unsetFlag(MODULE_NAME, ELEVATION_FLAG_KEY);
  clearElevationOverlay();
  ui.notifications.info('All elevation markers have been cleared.');
};

/**
 * Draw elevation labels on tiles in the scene
 */
export const renderElevationLabels = () => {
  // Remove existing elevation text from canvas
  const existingText = canvas.stage.getChildByName('elevation-labels-container');
  if (existingText) canvas.stage.removeChild(existingText);

  // Create a new container for elevation labels
  const container = new PIXI.Container();
  container.name = 'elevation-labels-container';
  canvas.stage.addChild(container);

  const squares = getSquaresWithElevation();
  
  // Create text labels for each square with elevation
  squares.forEach(square => {
    const elevation = square.elevation;
    if (elevation === 0) return;

    const text = new PIXI.Text(elevation.toString(), {
      fontFamily: 'Arial',
      fontSize: Math.round(canvas.grid.size * 0.15),
      fontWeight: 'normal',
      fill: getElevationColor(elevation),
      stroke: 0x000000,
      strokeThickness: 2,
      align: 'center'
    });

    // const text = new PIXI.Text('*'.repeat(elevation), {
    //   fontFamily: 'Arial',
    //   fontSize: Math.round(canvas.grid.size * 0.15),
    //   fontWeight: 'normal',
    //   fill: getElevationColor(elevation),
    //   stroke: 0x000000,
    //   strokeThickness: 2,
    //   align: 'center'
    // });

    text.anchor.set(0, 0);
    text.x = square.x * canvas.grid.size;
    text.y = square.y * canvas.grid.size;
    text.zIndex = 1000;
    text.alpha = 0.6;

    container.addChild(text);
  });

  // Sort children to ensure proper rendering order
  container.sortChildren();
};

/**
 * Clear all elevation labels from the scene
 */
export const clearElevationLabels = () => {
  const existingText = canvas.stage.getChildByName('elevation-labels-container');
  if (existingText) canvas.stage.removeChild(existingText);
};

/**
 * Select squares on the canvas for elevation setting
 */
export const selectSquares = () => {
  return new Promise((resolve) => {
    // Create a transparent overlay to capture clicks and show highlights
    const stage = canvas.app.stage;
    const selectedSquares = [];
    const graphics = new PIXI.Graphics();
    stage.addChild(graphics);

    // Create an interactive overlay to capture pointer events
    const overlay = new PIXI.Container();
    overlay.interactive = true;
    overlay.eventMode = 'static';
    overlay.hitArea = new PIXI.Rectangle(0, 0, canvas.dimensions.width, canvas.dimensions.height);
    stage.addChild(overlay);

    // Grid size for calculations
    const GRID = canvas.grid.size;
    let hoverSquare = null;

    // Function to draw highlights on selected and hovered squares
    const drawHighlights = () => {
      graphics.clear();
      graphics.lineStyle(2, 0xffff00, 0.8);

     // Draw highlights for selected squares
      for (const square of selectedSquares) {
        graphics.beginFill(0xffff00, 0.25);
        graphics.drawRect(square.x * GRID, square.y * GRID, GRID, GRID);
        graphics.endFill();
      }
      // Draw highlight for hovered square
      if (hoverSquare) {
        const alreadySelected = selectedSquares.some(s => s.x === hoverSquare.x && s.y === hoverSquare.y);
        graphics.beginFill(0xffff00, alreadySelected ? 0.15 : 0.45);
        graphics.drawRect(hoverSquare.x * GRID, hoverSquare.y * GRID, GRID, GRID);
        graphics.endFill();
      }
    };

    // Convert pixel position to grid coordinates
    const toGrid = (pos) => ({
      x: Math.floor(pos.x / GRID),
      y: Math.floor(pos.y / GRID)
    });

    // Update hover square on pointer move
    const onPointerMove = (event) => {
      hoverSquare = toGrid(event.data.getLocalPosition(stage));
      drawHighlights();
    };

    // Toggle square selection on click
    const onPointerDown = (event) => {
      const square = toGrid(event.data.getLocalPosition(stage));
      const idx = selectedSquares.findIndex(s => s.x === square.x && s.y === square.y);
      if (idx >= 0) selectedSquares.splice(idx, 1);
      else selectedSquares.push(square);
      drawHighlights();
    };

    // Handle keyboard input for confirming or canceling selection
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        cleanup();
        resolve(null);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        overlay.off('pointermove', onPointerMove);
        hoverSquare = null;
        drawHighlights();
        resolve({ squares: selectedSquares, cleanup });
      }
    };

    // Cleanup function to remove event listeners and graphics
    const cleanup = () => {
      overlay.off('pointermove', onPointerMove);
      overlay.off('pointerdown', onPointerDown);
      stage.removeChild(overlay);
      stage.removeChild(graphics);
      document.removeEventListener('keydown', onKeyDown);
    };

    overlay.on('pointermove', onPointerMove);
    overlay.on('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    drawHighlights();
  });
};

// Export the elevation tool function for use in main.mjs
export const selectForAssignment = async () => {
  ui.notifications.info('Click on tiles to select them for elevation setting. Press Enter to confirm or Escape to cancel.');
  const result = await selectSquares();
  if (!result || !result.squares || result.squares.length === 0) {
    ui.notifications.warn('No squares selected.');
    if (result && result.cleanup) result.cleanup();
    return;
  }

  const { squares, cleanup } = result;

  const content = `
  <div >
    <div style='display:flex; flex-direction:row; align-items:center; 
        gap:5px; margin-bottom:5px' >
    <label>Elevation: </label><br>
    <select name="elevation" >
        ${[1,2,3,4,5,6].map(e => `<option value="${e}">${e}</option>`).join('')}
    </select>
    </div>
    </br>
  </div>
  `;

  try {
    // Show a dialog to select elevation level
    const data = await foundry.applications.api.DialogV2.input({
    window: { title: "Select Elevation" },
    content: content,
    ok: {
        label: "SET",
    }
    });

    // Update elevation for selected squares
    const elevation = parseInt(data.elevation);
    for (const square of squares) {
      await setSquareElevation(square, elevation);
    }

    // Re-render elevation labels after a short delay to ensure updates are applied
    renderElevationOverlay();
  } finally {
    cleanup();
  }
};

export const selectForClearing = async () => {
  ui.notifications.info('Click on tiles to select them for elevation clearing. Press Enter to confirm or Escape to cancel.');
  const result = await selectSquares();
  if (!result || !result.squares || result.squares.length === 0) {
    ui.notifications.warn('No squares selected.');
    if (result && result.cleanup) result.cleanup();
    return;
  }

  const { squares, cleanup } = result;
  try {
    for (const square of squares) {
      await clearSquareElevation(square);
    }
    // Re-render elevation labels after a short delay to ensure updates are applied
    renderElevationOverlay();
  } finally {
    cleanup();
  }
};

Hooks.on('updateScene', (scene, delta) => {
  // Only react if it's the currently viewed scene
  if (scene.id !== canvas.scene?.id) return;
  
  // Only react if our elevation flag was part of the update
  const elevationChanged = foundry.utils.hasProperty(
    delta, 
    `flags.${MODULE_NAME}.${ELEVATION_FLAG_KEY}`
  ) || foundry.utils.hasProperty(
    delta,
    `flags.${MODULE_NAME}.-=${ELEVATION_FLAG_KEY}`
  );

  if (!elevationChanged) return;

  renderElevationOverlay();
});









const ELEVATION_OVERLAY_NAME = 'elevation-overlay-container';

let _gradientTexture = null;
let _gradientTextureSize = null;

const getGradientTexture = () => {
  const size = canvas.grid.size;
  if (_gradientTexture && _gradientTextureSize === size) return _gradientTexture;

  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const ctx = offscreen.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, size * 0.35);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  if (_gradientTexture) _gradientTexture.destroy();
  _gradientTexture = PIXI.Texture.from(offscreen);
  _gradientTextureSize = size;

  return _gradientTexture;
};

const EDGE_ROTATIONS = {
  top:    { rotation: 0,             anchorX: 0,   anchorY: 0   },
  right:  { rotation: Math.PI / 2,   anchorX: 0,   anchorY: 1   },
  bottom: { rotation: Math.PI,       anchorX: 1,   anchorY: 1   },
  left:   { rotation: -Math.PI / 2,  anchorX: 1,   anchorY: 0   },
};

const NEIGHBOR_DIRS = [
  { dx:  0, dy: -1, side: 'top'    },
  { dx:  1, dy:  0, side: 'right'  },
  { dx:  0, dy:  1, side: 'bottom' },
  { dx: -1, dy:  0, side: 'left'   },
];

const BASE_GRADIENT_STRENGTH = 0.55;
const CONTOUR_DARK_ALPHA = 0.6;
const CONTOUR_LIGHT_ALPHA = 0.3;
const CONTOUR_DARK_WIDTH = 2;
const CONTOUR_LIGHT_WIDTH = 2;

const getNeighborElev = (map, x, y, cols, rows) => {
  if (x < 0 || y < 0 || x >= cols || y >= rows) return 0;
  return map[`${x},${y}`] ?? 0;
};

export const toggleElevationOverlay = () => {
  const existing = canvas.stage.getChildByName(ELEVATION_OVERLAY_NAME);
  if (existing) {
    existing.destroy({ children: true, texture: false });
  } else {
    renderElevationOverlay();
  }

  ui.notifications.info('Elevation overlay ' + (existing ? 'hidden' : 'shown') + '.');
  
};

export const renderElevationOverlay = () => {
  const existing = canvas.stage.getChildByName(ELEVATION_OVERLAY_NAME);
  // Use canvas.primary to ensure it stays below tokens but above the map
  if (existing) existing.destroy({ children: true, texture: false });

  const map = getElevationMap();
  if (!Object.keys(map).length) return;

  const bgSprite = canvas.primary.background;
  if (!bgSprite?.texture) return;

  const GRID = canvas.grid.size;
  const container = new PIXI.Container();
  container.name = ELEVATION_OVERLAY_NAME;
  container.sortableChildren = true;

  // Use a consistent multiplier for elevation height
  const WALL_STEEPNESS = Math.ceil(GRID * 0.025); 

  const sceneRect = canvas.dimensions.sceneRect; 
  const texBase = bgSprite.texture.baseTexture;
  
  const scaleX = texBase.width / sceneRect.width;
  const scaleY = texBase.height / sceneRect.height;

  const sortedKeys = Object.keys(map).sort((a, b) => {
    const [ax, ay] = a.split(',').map(Number);
    const [bx, by] = b.split(',').map(Number);
    // Sort North-to-South primarily
    return ay - by || ax - bx;
  });

  for (const key of sortedKeys) {
    const [gx, gy] = key.split(',').map(Number);
    const elev = map[key];
    const px = gx * GRID;
    const py = gy * GRID;
    const heightOffset = elev * WALL_STEEPNESS;

    const localX = (px - sceneRect.x) * scaleX;
    const localY = (py - sceneRect.y) * scaleY;
    const localGridW = GRID * scaleX;
    const localGridH = GRID * scaleY;

    const block = new PIXI.Container();
    
    // --- THE FIX: GRANULAR Z-INDEX ---
    // We multiply gy by a large factor to keep rows distinct, 
    // then add 'elev' so higher blocks in the same row render ON TOP of lower ones.
    block.zIndex = (gy * 100) + elev; 

    // 1. THE CAP
    const capFrame = new PIXI.Rectangle(localX, localY, localGridW, localGridH);
    const capTex = new PIXI.Texture(texBase, capFrame);
    const cap = new PIXI.Sprite(capTex);
    
    cap.width = GRID;
    cap.height = GRID;
    cap.x = px;
    cap.y = py - heightOffset;
    cap.tint = 0xf0f0f0;

    const border = new PIXI.Graphics();
    border.lineStyle(1, 0x000000, 0.2);
    border.drawRect(px, py - heightOffset, GRID, GRID);
    
    // 2. THE FRONT WALL (South)
    const southElev = getNeighborElev(map, gx, gy + 1);
    if (southElev < elev) {
      const wallFrame = new PIXI.Rectangle(localX, localY + localGridH - 2, localGridW, 2);
      const wallTex = new PIXI.Texture(texBase, wallFrame);
      const wall = new PIXI.Sprite(wallTex);
      
      const wallHeight = (elev - southElev) * WALL_STEEPNESS;
      wall.x = px;
      wall.y = py - heightOffset + GRID;
      wall.width = GRID;
      wall.height = wallHeight;
      wall.tint = 0x777777;
      block.addChild(wall);
    }

// 3. THE BACK LIP (North edge)
    const northElev = getNeighborElev(map, gx, gy - 1);
    if (northElev < elev) {
      // Create a "Rim" highlight/shadow to show the drop-off
      const lip = new PIXI.Graphics();
      
      // We draw a dark line to show the "edge" and a faint light line 
      // inside it to give it 3D "rounding"
      const lipY = py - heightOffset;
      
      // The Dark Edge
      lip.lineStyle(10, 0x000000, 0.4);
      lip.moveTo(px, lipY);
      lip.lineTo(px + GRID, lipY);
      
      // The Light Highlight (Inner Bevel)
      lip.lineStyle(1, 0xffffff, 0.2);
      lip.moveTo(px, lipY + 1);
      lip.lineTo(px + GRID, lipY + 1);
      
      block.addChild(lip);
    }

    // 4. THE EAST WALL (Right)
    const eastElev = getNeighborElev(map, gx + 1, gy);
    if (eastElev < elev) {
      const wallFrame = new PIXI.Rectangle(localX + localGridW - 2, localY, 2, localGridH);
      const wallTex = new PIXI.Texture(texBase, wallFrame);
      const wall = new PIXI.Sprite(wallTex);
      
      const wallWidth = 4;
      const wallHeight = GRID; 
      
      wall.x = px + GRID;
      wall.y = py - heightOffset;
      wall.width = wallWidth;
      wall.height = wallHeight;
      wall.tint = 0x555555;
      block.addChild(wall);
    }

    // 5. THE WEST WALL (Left)
    const westElev = getNeighborElev(map, gx - 1, gy);
    if (westElev < elev) {
      const wallFrame = new PIXI.Rectangle(localX, localY, 2, localGridH);
      const wallTex = new PIXI.Texture(texBase, wallFrame);
      const wall = new PIXI.Sprite(wallTex);
      
      const wallWidth = 4;
      wall.x = px - wallWidth;
      wall.y = py - heightOffset;
      wall.width = wallWidth;
      wall.height = GRID;
      wall.tint = 0x555555;
      block.addChild(wall);
    }

    block.addChild(cap);
    block.addChild(border);
    container.addChild(block);
  }

  // Add to primary so it sorts with other map elements
  canvas.primary.addChild(container);
  
  // Final sort to apply the new zIndex logic
  container.sortChildren();
};

export const clearElevationOverlay = () => {
  const existing = canvas.stage.getChildByName(ELEVATION_OVERLAY_NAME);
  if (existing) existing.destroy({ children: true, texture: false });
};

Hooks.on('refreshToken', async (token) => {
  // Ensure the constant matches your renderElevationOverlay WALL_STEEPNESS
  const STEEPNESS = Math.ceil(canvas.grid.size * 0.025); 
  const elevation = Number(token.document.elevation || 0);
  const visualOffset = elevation * STEEPNESS;


    await token.document.update({
      "texture.anchorY": 0.5 + (elevation === 0 ? 0 : elevation/35) // 0.5 is center, >0.5 moves texture down, <0.5 moves up
    });


  const squareElev = getSquareElevation({ x: Math.floor(token.x / canvas.grid.size), y: Math.floor(token.y / canvas.grid.size) });
  console.log(`Token at (${token.x}, ${token.y}) has elevation ${elevation} and is on square with elevation ${squareElev}`);
});