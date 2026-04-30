import {applyMarkWhenWearerDamaged, clearRevengeMarks, clearRevengeOnTurnEnd, applyRevengeStrikeEffects} from "./Trinkets/Echelon 1/RevengersWrap.mjs";
import {dealSharedDamage} from "./Trinkets/Echelon 1/BloodboundBand.mjs";
import {selectForAssignment, selectForClearing, renderElevationLabels, clearAllElevations, getSquareElevation} from "../elevation.mjs";

const MODULE_ID = 'colingreenleafs-personal-module'
const REVENGERS_WRAP_NAME = 'Revenger’s Wrap';
const BLOODBOUND_BAND_NAME = 'Bloodbound Band';

Hooks.on("init", function() {
  console.log("This code runs once the Foundry VTT software begins its initialization workflow.");
});

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

//add buttons to the wall controls for selecting squares to assign elevation to, selecting squares to clear elevation from, and clearing all elevation markers from the map
Hooks.on('getSceneControlButtons', (controls) => {
  const wallControl  = controls.walls  || controls.wall;
  addTools(wallControl, {
    'elevation': {
      name: 'elevation',
      title: 'Elevation Designer',
      icon: 'fas fa-arrow-up',
      button: true,
      visible: game.user.isGM,
      onClick: () => {selectForAssignment(), renderElevationLabels()}
    },
    'clear-elevation': {
      name: 'clear-elevation',
      title: 'Elevation Remover',
      icon: 'fas fa-arrow-down',
      button: true,
      visible: game.user.isGM,
      onClick: () => {selectForClearing(), renderElevationLabels()}
    },
    'clear-all-elevation': {
      name: 'clear-all-elevation',
      title: 'Clear All Elevation Markers',
      icon: 'fas fa-trash-alt',
      button: true,
      visible: game.user.isGM,
      onClick: () => {clearAllElevations(), renderElevationLabels()}
    },
  });
});

/* -------------------------------------------------- */
/*   Initialization                                   */
/* -------------------------------------------------- */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "revengersWrap", {
    name: `${MODULE_ID}.Settings.RevengersWrap.Name`,
    hint: `${MODULE_ID}.Settings.RevengersWrap.Hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {toggleRevengersWrap(value)}
  });

  game.settings.register(MODULE_ID, "bloodboundBand", {
    name: `${MODULE_ID}.Settings.BloodboundBand.Name`,
    hint: `${MODULE_ID}.Settings.BloodboundBand.Hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {toggleBloodboundBand(value)}
  });
  // game.settings.register(MODULE_ID, "colorCloaks", {
  //   name: `${MODULE_ID}.Settings.ColorCloaks.Name`,
  //   hint: `${MODULE_ID}.Settings.ColorCloaks.Hint`,
  //   scope: "world",
  //   config: true,
  //   type: Boolean,
  //   default: true,
  //   onChange: (value) => {toggleColorCloaks(value)}
  // });
  // game.settings.register(MODULE_ID, "hellchargerHelm", {
  //   name: `${MODULE_ID}.Settings.HellchargerHelm.Name`,
  //   hint: `${MODULE_ID}.Settings.HellchargerHelm.Hint`,
  //   scope: "world",
  //   config: true,
  //   type: Boolean,
  //   default: true,
  //   onChange: (value) => {toggleHellchargerHelm(value)}
  // });
  // game.settings.register(MODULE_ID, "kuranzoiPrismscale", {
  //   name: `${MODULE_ID}.Settings.KuranzoiPrismscale.Name`,
  //   hint: `${MODULE_ID}.Settings.KuranzoiPrismscale.Hint`,
  //   scope: "world",
  //   config: true,
  //   type: Boolean,
  //   default: true,
  //   onChange: (value) => {toggleKuranzoiPrismscale(value)}
  // });
});
Hooks.on("ready", () => {
  //once the game is ready, check which settings are enabled and activate the corresponding functionality for each item
  if (game.settings.get(MODULE_ID, "revengersWrap"))    toggleRevengersWrap(true);
  if (game.settings.get(MODULE_ID, "bloodboundBand"))   toggleBloodboundBand(true);

});
Hooks.on('canvasReady', () => {
  renderElevationLabels();
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

//   /* -------------------------------------------------- */
//   /*   Color Cloaks Hook Controls                       */
//   /* -------------------------------------------------- */
// const toggleColorCloaks = (enabled) => {
//   if (enabled) {
//     //find relevant actors
//     const blueCloakActors = getActorsWithItem(game, COLOR_CLOAKS_NAMES[0]);
//     const redCloakActors = getActorsWithItem(game, COLOR_CLOAKS_NAMES[1]);
//     const yellowCloakActors = getActorsWithItem(game, COLOR_CLOAKS_NAMES[2]);

//     /* -------------------------apply color cloak effects when an effect occurs on a target wearing a cloak------------------------- */
//     window._colorCloakHook = Hooks.on('createChatMessage', async (message) => {
//       remindColorCloakEffects(message, game, blueCloakActors, redCloakActors, yellowCloakActors);
//     })
//   } else {
//     Hooks.off('createChatMessage', window._colorCloakHook);
//     window._colorCloakHook = null;
//   }
// }

//   /* -------------------------------------------------- */
//   /*   Hellcharger Helm Hook Controls                   */
//   /* -------------------------------------------------- */
// const toggleHellchargerHelm = (enabled) => {
//   if (enabled) {
//     //find relevant actors
//     const helmActors = getActorsWithItem(game, HELLCHARGER_HELM_NAME);


//     window._helmHook = Hooks.on('createChatMessage', async (message) => {
//       remindAndApplyHelmEffects(message, game, helmActors);
//     })
//   } else {
//     Hooks.off('createChatMessage', window._helmHook);
//     window._helmHook = null;
//   }
// }

//   /* -------------------------------------------------- */
//   /*   Kuran'zoi Prismscale Hook Controls                   */
//   /* -------------------------------------------------- */
// const toggleKuranzoiPrismscale = (enabled) => {
//   if (enabled) {
//     //find relevant actors
//     const scaleActors = getActorsWithItem(game, "Kuran’zoi Prismscale");
//     window._scaleHook = Hooks.on('updateActor', async (actor, changes, options) => {
//       remindWhenWearerDamaged(actor, changes, options, scaleActors);
//     })
//   } else {
//     Hooks.off('updateActor', window._scaleHook);
//     window._scaleHook = null;
//   } 
// }

