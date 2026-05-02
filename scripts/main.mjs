import {applyMarkWhenWearerDamaged, clearRevengeMarks, clearRevengeOnTurnEnd, applyRevengeStrikeEffects} from "./Trinkets/Echelon 1/RevengersWrap.mjs";
import {dealSharedDamage} from "./Trinkets/Echelon 1/BloodboundBand.mjs";
import {renderElevationOverlay, getSquareElevation} from "../elevation.mjs";
import {registerSettings } from "../elevation-settings.mjs";
import {registerModuleButtons} from "../module-buttons.mjs";;

const MODULE_ID = 'colingreenleafs-personal-module'
const REVENGERS_WRAP_NAME = 'Revenger’s Wrap';
const BLOODBOUND_BAND_NAME = 'Bloodbound Band';



export function getActorsWithItem(game, itemName) {
  const actors = game.actors.contents.filter(a => a.items.find(i => i.name === itemName));
  return actors;
};

const addTools = (control, tools) => {
  if (!control) return;
  if (Array.isArray(control.tools)) {
    control.tools.push(...Object.values(tools));
  } else {
    let orderIndex = Object.keys(control.tools).length;
    for (const [key, tool] of Object.entries(tools)) {
      tool.order = orderIndex++;
      control.tools[key] = tool;
    }
  }
};

/* -------------------------------------------------- */
/*   Initialization                                   */
/* -------------------------------------------------- */

Hooks.once("init", () => {
  registerSettings();
  registerModuleButtons();

  
});


Hooks.on("ready", () => {
  //once the game is ready, check which settings are enabled and activate the corresponding functionality for each item
  toggleBloodboundBand(true);
  toggleRevengersWrap(true);

});

Hooks.on('canvasReady', () => {
  renderElevationOverlay();
});

Hooks.on('updateToken', async (token, changes, options, userId) => {
  // Check if the token's position changed
  if (changes.x !== undefined || changes.y !== undefined) {
    const gridSize = canvas.grid.size;
    const gridX = Math.floor((changes.x ?? token.x) / gridSize);
    const gridY = Math.floor((changes.y ?? token.y) / gridSize);
    const squareElevation = getSquareElevation({ x: gridX, y: gridY });
    
    if (squareElevation > 0 && token.elevation !== squareElevation) {
      await token.update({ elevation: squareElevation });
    } else if (squareElevation === 0 && token.elevation !== 0) {
      await token.update({ elevation: 0 });
    }

    //if the elevation is 2 or more squares higher than the token's current elevation, show a warning notification
    if (squareElevation > token.elevation + 1.9) {
      ui.notifications.warn(`${token.name} is moving onto a square with elevation ${squareElevation}, which is more than 1 higher than their current elevation of ${token.elevation}.`);
    }
  }
});












































  /* -------------------------------------------------- */
  /*   Revenger's Wrap Hook Controls                    */
  /* -------------------------------------------------- */
const toggleRevengersWrap = (enabled) => {
  if (enabled) {
    //find relevant actors
    const wrapActors = getActorsWithItem(game, REVENGERS_WRAP_NAME);
    const combatActors = game.combat?.combatants.filter(c => c.actor).map(c => c.actor) ?? [];

    /* -------------------------apply a mark to the actor that is selected when Revenger's Wrap wearer takes damage------------------------- */
    window._revengeHook = Hooks.on('updateActor', async (actor, changes, options) => {
      applyMarkWhenWearerDamaged(actor, changes, options, wrapActors, combatActors);
    });

    /* -------------------------clear mark from all actors when Revenger's Wrap wearer's turn ends------------------------- */
    window._eotHook = Hooks.on('combatTurnChange', async (combat, prior, current) => {
      clearRevengeOnTurnEnd(combat, prior, wrapActors, combatActors);
    });

    /* -------------------------roll additional effects when the wearer targets a marked enemy with a strike------------------------- */
    window._revengeRollHook = Hooks.on('createChatMessage', async (message) => {
      applyRevengeStrikeEffects(message, game, wrapActors, combatActors);
    });
  } else {
    Hooks.off('updateActor', window._revengeHook);
    Hooks.off('combatTurnChange', window._eotHook);
    Hooks.off('createChatMessage', window._revengeRollHook);
    window._revengeHook = null;
    window._eotHook = null;
    window._revengeRollHook = null;
    clearRevengeMarks(game.combat?.combatants.filter(c => c.actor).map(c => c.actor) ?? []);
  };
}

  /* -------------------------------------------------- */
  /*   Bloodbound Band Hook Controls                    */
  /* -------------------------------------------------- */
const toggleBloodboundBand = (enabled) => {
  if (enabled) {
    //find relevant actors
    const bandActors = getActorsWithItem(game, BLOODBOUND_BAND_NAME);

    /* -------------------------apply shared damage when an actor with the band takes damage------------------------- */
    window._bloodboundHook = Hooks.on('updateActor', async (actor, changes, options) => {
      dealSharedDamage(bandActors, actor, changes, options);
    });
  } else {
    Hooks.off('updateActor', window._bloodboundHook);
    window._bloodboundHook = null;
  } 
}
