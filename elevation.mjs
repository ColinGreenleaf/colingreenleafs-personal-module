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
// export const renderElevationOverlay = () => {
//   // Remove existing elevation text from canvas
//   const existingText = canvas.stage.getChildByName('elevation-labels-container');
//   if (existingText) canvas.stage.removeChild(existingText);

//   // Create a new container for elevation labels
//   const container = new PIXI.Container();
//   container.name = 'elevation-labels-container';
//   canvas.stage.addChild(container);

//   const squares = getSquaresWithElevation();
  
//   // Create text labels for each square with elevation
//   squares.forEach(square => {
//     const elevation = square.elevation;
//     if (elevation === 0) return;

//     const text = new PIXI.Text(elevation.toString(), {
//       fontFamily: 'Arial',
//       fontSize: Math.round(canvas.grid.size * 0.15),
//       fontWeight: 'normal',
//       fill: getElevationColor(elevation),
//       stroke: 0x000000,
//       strokeThickness: 2,
//       align: 'center'
//     });

//     // const text = new PIXI.Text('*'.repeat(elevation), {
//     //   fontFamily: 'Arial',
//     //   fontSize: Math.round(canvas.grid.size * 0.15),
//     //   fontWeight: 'normal',
//     //   fill: getElevationColor(elevation),
//     //   stroke: 0x000000,
//     //   strokeThickness: 2,
//     //   align: 'center'
//     // });

//     text.anchor.set(0, 0);
//     text.x = square.x * canvas.grid.size;
//     text.y = square.y * canvas.grid.size;
//     text.zIndex = 1000;
//     text.alpha = 0.6;

//     container.addChild(text);
//   });

//   // Sort children to ensure proper rendering order
//   container.sortChildren();
// };

/**
 * Clear all elevation labels from the scene
 */
// export const clearElevationOverlay = () => {
//   const existingText = canvas.stage.getChildByName('elevation-labels-container');
//   if (existingText) canvas.stage.removeChild(existingText);
// };

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

export const toggleElevationOverlay = () => {
  const existing = canvas.primary.getChildByName(ELEVATION_OVERLAY_NAME);
  if (existing) {
    existing.destroy({ children: true, texture: false });
  } else {
    renderElevationOverlay();
  }

  ui.notifications.info('Elevation overlay ' + (existing ? 'hidden' : 'shown') + '.');
  
};

const ELEVATION_OVERLAY_NAME = 'elevation-overlay-container';

let _gradientTexture = null;
let _gradientTextureSize = null;
let _cornerTexture = null;

const getCornerTexture = () => {
    const size = canvas.grid.size;
    if (_cornerTexture && _gradientTextureSize === size) return _cornerTexture;
    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const ctx = offscreen.getContext('2d');
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.35);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    if (_cornerTexture) _cornerTexture.destroy();
    _cornerTexture = PIXI.Texture.from(offscreen);
    return _cornerTexture;
};

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

// const getColorTexture = (colorHex) => {
//     const size = canvas.grid.size;
//     if (_colorTexture && _ColorTextureSize === size) return _colorTexture;
//     const offscreen = document.createElement('canvas');
//     offscreen.width = size;
//     offscreen.height = size;
//     const ctx = offscreen.getContext('2d');
//     const grad = ctx.createPattern
//     grad.addColorStop(0, 'rgba(0,0,0,1)');
//     grad.addColorStop(1, 'rgba(0,0,0,0)');
//     ctx.fillStyle = grad;
//     ctx.fillRect(0, 0, size, size);
//     if (_gradientTexture) _gradientTexture.destroy();
//     _gradientTexture = PIXI.Texture.from(offscreen);
//     _gradientTextureSize = size;
//     return _gradientTexture;
// };

// Map of where the shadow should appear RELATIVE to the high square
const SHADOW_PUSH = [
    { dx:  0, dy: -1, side: 'bottom' }, // Shadow on North neighbor's bottom edge
    { dx:  1, dy:  0, side: 'left'   }, // Shadow on East neighbor's left edge
    { dx:  0, dy:  1, side: 'top'    }, // Shadow on South neighbor's top edge
    { dx: -1, dy:  0, side: 'right'  }, // Shadow on West neighbor's right edge
];

const CORNER_PUSH = [
    { dx: -1, dy: -1, corner: 'br' }, // High is NW, shadow on SE corner of neighbor
    { dx:  1, dy: -1, corner: 'bl' }, // High is NE, shadow on SW corner of neighbor
    { dx:  1, dy:  1, corner: 'tl' }, // High is SE, shadow on NW corner of neighbor
    { dx: -1, dy:  1, corner: 'tr' }  // High is SW, shadow on NE corner of neighbor
];

const EDGE_ROTATIONS = {
    top:    { rotation: 0,             anchorX: 0, anchorY: 0 },
    right:  { rotation: Math.PI / 2,   anchorX: 0, anchorY: 1 },
    bottom: { rotation: Math.PI,       anchorX: 1, anchorY: 1 },
    left:   { rotation: -Math.PI / 2,  anchorX: 1, anchorY: 0 },
};

const CORNER_ROTATIONS = {
    tl: { rotation: 0,             ax: 0, ay: 0 },
    tr: { rotation: Math.PI / 2,   ax: 0, ay: 1 },
    br: { rotation: Math.PI,       ax: 1, ay: 1 },
    bl: { rotation: -Math.PI / 2,  ax: 1, ay: 0 }
};

const BASE_GRADIENT_STRENGTH = 0.65;
const CONTOUR_DARK_ALPHA = 0.6;
const CONTOUR_LIGHT_ALPHA = 0.3;

export const renderElevationOverlay = () => {
  if (!game.settings.get(MODULE_NAME, "OverlayVisualization")) return; 

  const overlayMode = game.settings.get(MODULE_NAME, "OverlayStyle");

  if (overlayMode === 'gradient') {
    renderGradient();
    console.log('rendering gradient overlay')
  } else if (overlayMode === 'color') {
    renderColorTiles();
    console.log('rendering color tile overlay')
  }
  const drawNumbers = game.settings.get(MODULE_NAME, "NumberOverlay");
  if (drawNumbers) {
    renderNumbers();
    console.log('rendering numbers')
  }
}

export const renderGradient = () => {
    // FIX: Consistently check and use canvas.primary
    const existing = canvas.primary.getChildByName(ELEVATION_OVERLAY_NAME);
    if (existing) existing.destroy({ children: true, texture: false });

    const map = getElevationMap();
    if (!Object.keys(map).length) return;

    const GRID = canvas.grid.size;
    const container = new PIXI.Container();
    container.name = ELEVATION_OVERLAY_NAME;

    const gradientContainer = new PIXI.Container();
    const graphics = new PIXI.Graphics();
    container.addChild(gradientContainer);
    container.addChild(graphics);

    const gradTex = getGradientTexture();
    const cornerTex = getCornerTexture();

    // Iterate through squares we KNOW have elevation
    for (const [key, elev] of Object.entries(map)) {
        const [x, y] = key.split(',').map(Number);

        // 1. PROJECT ORTHOGONAL SHADOWS
        for (const { dx, dy, side } of SHADOW_PUSH) {
            const nx = x + dx;
            const ny = y + dy;
            const neighborElev = map[`${nx},${ny}`] ?? 0;

            if (neighborElev < elev) {
                const delta = elev - neighborElev;
                const alpha = BASE_GRADIENT_STRENGTH * Math.min(1, 0.3 + delta * 0.2);
                const { rotation, anchorX, anchorY } = EDGE_ROTATIONS[side];

                const sprite = new PIXI.Sprite(gradTex);
                sprite.width = sprite.height = GRID;
                sprite.alpha = alpha;
                sprite.rotation = rotation;
                sprite.anchor.set(anchorX, anchorY);

                // Position on the neighbor
                const npx = nx * GRID;
                const npy = ny * GRID;
                
                const bOff = (side === 'bottom') ? -GRID : 0;
                const lOff = (side === 'left') ? -GRID : 0;
                const rOff = (side === 'right') ? -GRID : 0;

                sprite.x = npx + (anchorX * GRID) + bOff + lOff;
                sprite.y = npy + (anchorY * GRID) + rOff + bOff;
                gradientContainer.addChild(sprite);
            }
        }

        // 2. PROJECT CORNER SHADOWS
        for (const { dx, dy, corner } of CORNER_PUSH) {
            const nx = x + dx;
            const ny = y + dy;
            const neighborElev = map[`${nx},${ny}`] ?? 0;

            if (neighborElev < elev) {
                // Skip corner shadow if orthogonal shadows are already covering it
                const adj1 = map[`${x + dx},${y}`] ?? 0;
                const adj2 = map[`${x},${y + dy}`] ?? 0;
                if (adj1 >= elev || adj2 >= elev) continue;

                const delta = elev - neighborElev;
                const alpha = BASE_GRADIENT_STRENGTH * Math.min(1, 0.2 + delta * 0.15);
                const { rotation, ax, ay } = CORNER_ROTATIONS[corner];

                const sprite = new PIXI.Sprite(cornerTex);
                sprite.width = sprite.height = GRID;
                sprite.alpha = alpha;
                sprite.rotation = rotation;
                sprite.anchor.set(ax, ay);

                const npx = nx * GRID;
                const npy = ny * GRID;
                const xOff = (corner === 'br' || corner === 'bl') ? -GRID : 0;
                const yOff = (corner === 'tr' || corner === 'br') ? -GRID : 0;

                sprite.x = npx + (ax * GRID) + xOff;
                sprite.y = npy + (ay * GRID) + yOff;
                gradientContainer.addChild(sprite);
            }
        }
    }

    // 3. CONTOUR LINES (Drawn between any mismatch)
    const drawnEdges = new Set();
    for (const [key, elev] of Object.entries(map)) {
        const [x, y] = key.split(',').map(Number);
        
        for (const { dx, dy } of [{dx:0, dy:-1}, {dx:1, dy:0}, {dx:0, dy:1}, {dx:-1, dy:0}]) {
            const neighborElev = map[`${x+dx},${y+dy}`] ?? 0;
            if (neighborElev === elev) continue;

            // Generate unique edge key to avoid double-drawing
            const side = dx === 1 ? 'r' : dx === -1 ? 'l' : dy === 1 ? 'b' : 't';
            const edgeKey = side === 'r' ? `v:${x+1},${y}` : side === 'l' ? `v:${x},${y}` : side === 'b' ? `h:${x},${y+1}` : `h:${x},${y}`;
            if (drawnEdges.has(edgeKey)) continue;
            drawnEdges.add(edgeKey);

            const isV = side === 'r' || side === 'l';
            const lx1 = isV ? (x + (side === 'r' ? 1 : 0)) * GRID : x * GRID;
            const ly1 = isV ? y * GRID : (y + (side === 'b' ? 1 : 0)) * GRID;
            const lx2 = isV ? lx1 : (x + 1) * GRID;
            const ly2 = isV ? (y + 1) * GRID : ly1;

            graphics.lineStyle(2, 0xffffff, CONTOUR_LIGHT_ALPHA);
            graphics.moveTo(lx1, ly1).lineTo(lx2, ly2);
            graphics.lineStyle(2, 0x000000, CONTOUR_DARK_ALPHA);
            graphics.moveTo(lx1, ly1).lineTo(lx2, ly2);
        }
    }

    canvas.primary.addChild(container);
};

export const renderColorTiles = () => {
  // FIX: Consistently check and use canvas.primary
    const existing = canvas.primary.getChildByName(ELEVATION_OVERLAY_NAME);
    if (existing) existing.destroy({ children: true, texture: false });

    const map = getElevationMap();
    if (!Object.keys(map).length) return;

    const GRID = canvas.grid.size;
    const container = new PIXI.Container();
    container.name = ELEVATION_OVERLAY_NAME;

    const graphics = new PIXI.Graphics();
    container.addChild(graphics);
    const squares = getSquaresWithElevation();

    graphics.clear();

    // Iterate through squares with elevation and draw its appropriate color
    for (const square of squares) {
      const color = getElevationColor(square.elevation);

        graphics.beginFill(color, 0.3);
        graphics.drawRect(square.x * GRID, square.y * GRID, GRID, GRID);
        graphics.endFill();
      

    };

    // CONTOUR LINES (Drawn between any mismatch)
    // const drawnEdges = new Set();
    // for (const [key, elev] of Object.entries(map)) {
    //     const [x, y] = key.split(',').map(Number);
        
    //     for (const { dx, dy } of [{dx:0, dy:-1}, {dx:1, dy:0}, {dx:0, dy:1}, {dx:-1, dy:0}]) {
    //         const neighborElev = map[`${x+dx},${y+dy}`] ?? 0;
    //         if (neighborElev === elev) continue;

    //         // Generate unique edge key to avoid double-drawing
    //         const side = dx === 1 ? 'r' : dx === -1 ? 'l' : dy === 1 ? 'b' : 't';
    //         const edgeKey = side === 'r' ? `v:${x+1},${y}` : side === 'l' ? `v:${x},${y}` : side === 'b' ? `h:${x},${y+1}` : `h:${x},${y}`;
    //         if (drawnEdges.has(edgeKey)) continue;
    //         drawnEdges.add(edgeKey);

    //         const isV = side === 'r' || side === 'l';
    //         const lx1 = isV ? (x + (side === 'r' ? 1 : 0)) * GRID : x * GRID;
    //         const ly1 = isV ? y * GRID : (y + (side === 'b' ? 1 : 0)) * GRID;
    //         const lx2 = isV ? lx1 : (x + 1) * GRID;
    //         const ly2 = isV ? (y + 1) * GRID : ly1;

    //         graphics.lineStyle(2, 0xffffff, CONTOUR_LIGHT_ALPHA);
    //         graphics.moveTo(lx1, ly1).lineTo(lx2, ly2);
    //         graphics.lineStyle(2, 0x000000, CONTOUR_DARK_ALPHA);
    //         graphics.moveTo(lx1, ly1).lineTo(lx2, ly2);
    //     }
    // }

    canvas.primary.addChild(container);
}

export const renderNumbers = () => {
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
      fill: (game.settings.get(MODULE_NAME, 'NumberOverlayColor') ? getElevationColor(elevation) : 0x000000),
      stroke: 0x000000,
      strokeThickness: (game.settings.get(MODULE_NAME, 'NumberOverlayColor') ? 2 : 0),
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
}

export const clearElevationOverlay = () => {
    const existing = canvas.primary.getChildByName(ELEVATION_OVERLAY_NAME);
    if (existing) existing.destroy({ children: true, texture: false });
};


export const checkSquareElevation = async () => {
  ui.notifications.info('Hover to check elevations. Press Escape to exit.');
  await runHoverTool();
};

const runHoverTool = () => {
  return new Promise((resolve) => {
    const stage = canvas.app.stage;
    const graphics = new PIXI.Graphics();
    const overlay = new PIXI.Container();

    const GRID = canvas.grid.size;
    
    // Create a floating label to show the elevation number
    const label = new PIXI.Text("", {
      fontFamily: 'Arial',
      fontSize: Math.ceil(GRID * 0.5),
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 4,
      fontWeight: 'bold'
    });

    overlay.interactive = true;
    overlay.eventMode = 'static';
    overlay.hitArea = new PIXI.Rectangle(0, 0, canvas.dimensions.width, canvas.dimensions.height);
    
    stage.addChild(graphics);
    stage.addChild(label);
    stage.addChild(overlay);

    

    const drawHighlights = (hoverSquare, mousePos) => {
      graphics.clear();
      
      const hoverElevation = getSquareElevation(hoverSquare);
      const color = getElevationColor(hoverElevation);
      
      // Update the floating label
      label.text = `${hoverElevation}`;
      label.x = mousePos.x; // Offset from cursor
      label.y = mousePos.y - GRID * 0.5;
      label.style.fill = color;

      // Highlight all squares with the same elevation
      const map = getElevationMap();
      
      // We always draw the hover square, even if elevation is 0
      graphics.lineStyle(4, color, 0.8);
      
      // Find all matches
      for (const [key, elev] of Object.entries(map)) {
        if (elev === hoverElevation && elev !== 0) {
          const [x, y] = key.split(',').map(Number);
          graphics.beginFill(color, 0.3);
          graphics.drawRect(x * GRID, y * GRID, GRID, GRID);
          graphics.endFill();
        }
      }

      // Special highlight for the square currently under the mouse
      graphics.lineStyle(6, 0xffffff, 0.5);
      graphics.drawRect(hoverSquare.x * GRID, hoverSquare.y * GRID, GRID, GRID);
    };

    const onPointerMove = (event) => {
      const mousePos = event.data.getLocalPosition(stage);
      const hoverSquare = {
        x: Math.floor(mousePos.x / GRID),
        y: Math.floor(mousePos.y / GRID)
      };
      drawHighlights(hoverSquare, mousePos);
    };

    const cleanup = () => {
      overlay.off('pointermove', onPointerMove);
      stage.removeChild(overlay);
      stage.removeChild(graphics);
      stage.removeChild(label);
      document.removeEventListener('keydown', onKeyDown);
      resolve();
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        cleanup();
      }
    };

    overlay.on('pointermove', onPointerMove);
    document.addEventListener('keydown', onKeyDown);
  });
};