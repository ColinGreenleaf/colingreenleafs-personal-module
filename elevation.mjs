const { ApplicationV2 } = foundry.applications.api;

const ELEVATION_FLAG_KEY = 'elevation-levels';
const MODULE_NAME = 'colingreenleafs-personal-module';

const ELEVATION_COLORS = {
  0: 0xffffff,  // White for ground level
  1: 0xffff00,  // Yellow
  2: 0xff8800,  // Orange
  3: 0xff0000,  // Red
  4: 0xff00ff,  // Magenta
  5: 0x0000ff,  // Blue
  6: 0x00ffff   // Cyan
};

const getElevationColor = (elevation) => {
  return ELEVATION_COLORS[elevation] || ELEVATION_COLORS[0];
};

const getElevationMap = () => {
  return canvas.scene?.getFlag(MODULE_NAME, ELEVATION_FLAG_KEY) ?? {};
};

const setElevationMap = async (map) => {
  await canvas.scene.setFlag(MODULE_NAME, ELEVATION_FLAG_KEY, map);
};

const toKey = (square) => `${square.x},${square.y}`;

// Get elevation for a specific square, defaulting to 0 if not set
export const getSquareElevation = (square) => {
  const map = getElevationMap();
  return map[toKey(square)] ?? 0;
};

// Set elevation for a specific square
export const setSquareElevation = async (square, elevation) => {
  const map = getElevationMap();
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
  clearElevationLabels();
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
      fontSize: 32,
      fontWeight: 'bold',
      fill: getElevationColor(elevation),
      stroke: 0x000000,
      strokeThickness: 2,
      align: 'center'
    });

    text.anchor.set(0.5, 0.5);
    text.x = square.x * canvas.grid.size + canvas.grid.size / 2;
    text.y = square.y * canvas.grid.size + canvas.grid.size / 2;
    text.zIndex = 1000;

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
        cleanup();
        resolve(selectedSquares);
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
export const runSelection = async () => {
  ui.notifications.info('Click on tiles to select them for elevation setting. Press Enter to confirm or Escape to cancel.');
  const squares = await selectSquares();
  if (!squares || squares.length === 0) {
    ui.notifications.warn('No squares selected.');
    return;
  }

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

  setTimeout(async () => {
    // Show a dialog to select elevation level
    const data = await foundry.applications.api.DialogV2.input({
    window: { title: "Select Elevation" },
    content: content,
    ok: {
        label: "SET",
    }
    })  ;

    // Update elevation for selected squares
    const elevation = parseInt(data.elevation);
    for (const square of squares) {
      await setSquareElevation(square, elevation);
    }

    // Re-render elevation labels after a short delay to ensure updates are applied
    renderElevationLabels();
    }, 0);
};
