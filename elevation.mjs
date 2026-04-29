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

export const getSquareElevation = (square) => {
  const map = getElevationMap();
  return map[toKey(square)] ?? 0;
};

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

export const getSquaresWithElevation = () => {
  const map = getElevationMap();
  return Object.entries(map).map(([key, value]) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y, elevation: value };
  });
};

export const clearSquareElevation = async (square) => {
  await setSquareElevation(square, 0);
};

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

  const container = new PIXI.Container();
  container.name = 'elevation-labels-container';
  canvas.stage.addChild(container);

  const squares = getSquaresWithElevation();
  
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
    const stage = canvas.app.stage;
    const selectedSquares = [];
    const graphics = new PIXI.Graphics();
    stage.addChild(graphics);

    const overlay = new PIXI.Container();
    overlay.interactive = true;
    overlay.eventMode = 'static';
    overlay.hitArea = new PIXI.Rectangle(0, 0, canvas.dimensions.width, canvas.dimensions.height);
    stage.addChild(overlay);

    const GRID = canvas.grid.size;
    let hoverSquare = null;

    const drawHighlights = () => {
      graphics.clear();
      graphics.lineStyle(2, 0xffff00, 0.8);

      for (const square of selectedSquares) {
        graphics.beginFill(0xffff00, 0.25);
        graphics.drawRect(square.x * GRID, square.y * GRID, GRID, GRID);
        graphics.endFill();
      }

      if (hoverSquare) {
        const alreadySelected = selectedSquares.some(s => s.x === hoverSquare.x && s.y === hoverSquare.y);
        graphics.beginFill(0xffff00, alreadySelected ? 0.15 : 0.45);
        graphics.drawRect(hoverSquare.x * GRID, hoverSquare.y * GRID, GRID, GRID);
        graphics.endFill();
      }
    };

    const toGrid = (pos) => ({
      x: Math.floor(pos.x / GRID),
      y: Math.floor(pos.y / GRID)
    });

    const onPointerMove = (event) => {
      hoverSquare = toGrid(event.data.getLocalPosition(stage));
      drawHighlights();
    };

    const onPointerDown = (event) => {
      const square = toGrid(event.data.getLocalPosition(stage));
      const idx = selectedSquares.findIndex(s => s.x === square.x && s.y === square.y);
      if (idx >= 0) selectedSquares.splice(idx, 1);
      else selectedSquares.push(square);
      drawHighlights();
    };

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

  const html = `
    <p>Set elevation level for ${squares.length} selected squares:</p>
    <select id="elevation-select">
      ${[0,1,2,3,4,5].map(e => `<option value="${e}">${e}</option>`).join('')}
    </select>
  `;

  setTimeout(async () => {
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
 
    const data = await foundry.applications.api.DialogV2.input({
    window: { title: "Select Elevation" },
    content: content,
    ok: {
        label: "SET",
    }
    })  ;

    const elevation = parseInt(data.elevation);
    for (const square of squares) {
      await setSquareElevation(square, elevation);
    }
    renderElevationLabels();
    }, 0);


    // new Dialog({
    //   title: 'Set Elevation',
    //   content: html,
    //   buttons: {
    //     set: {
    //       label: 'Set',
    //       callback: async (html) => {
    //         const level = parseInt(html.find('#elevation-select').val());
    //         for (const square of squares) {
    //           await setSquareElevation(square, level);
    //         }
    //         renderElevationLabels();
    //       }
    //     },
    //     cancel: {
    //       label: 'Cancel'
    //     }
    //   },
    //   default: 'set'
    // }).render(true);
};
