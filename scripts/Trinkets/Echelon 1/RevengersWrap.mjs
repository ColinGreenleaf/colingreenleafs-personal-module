const MODULE_ID = "draw-steel-rewards-automation";
const ITEM_NAME = 'Revenger’s Wrap';

const REVENGE_EFFECT_DATA = {
  name: 'Marked for Revenge',
  img: "icons/skills/ranged/target-bullseye-arrow-glowing.webp",
  type: "base",
  system: {
    end: { type: "encounter", roll: "1d10 + @combat.save.bonus" }
  },
  changes: [],
  disabled: false,
  duration: {
    startTime: 0, combat: null, seconds: null,
    rounds: null, turns: null, startRound: 0, startTurn: 0
  },
  description: "", tint: "#ffffff", transfer: false, statuses: [], sort: 0, flags: {}
};
const REVENGE_ORIGIN = 'module.draw-steel-rewards-automation';

//returns actors that have a Revenger's Wrap in their inventory
export function getWrapActors(game) {
  const wrapActors = game.actors.contents.filter(a => a.items.find(i => i.name === ITEM_NAME));
  return wrapActors;
};

// removes the revenge mark from all actors and returns the list of actors that were unmarked
export async function clearRevengeMarks(combatActors) {
    const marked = combatActors.filter(a =>
      a.effects.some(e => e.name === REVENGE_EFFECT_DATA.name)
    );
    for (const actor of marked) {
      const effect = actor.effects.find(e => e.name === REVENGE_EFFECT_DATA.name);
      await effect.delete();
    }
    return marked;
};

// clears revenge marks at the end of the turn of any combatant whose actor is in wrapActors
export async function clearRevengeOnTurnEnd(combat, prior, wrapActors, combatActors) {

  const endedCombatant = combat.combatants.get(prior.combatantId);
  if (!endedCombatant){
    ui.notifications.warning('No previous combatant found for ID:', endedCombatantId);
    return;
  } 
  const endedActor = endedCombatant.actor;
  if (!endedActor || !wrapActors.some(a => a.id === endedActor.id)) return;

  clearRevengeMarks(combatActors);

  await ChatMessage.create({
    content: `${endedCombatant.name}'s turn ends and their revenge fades away.`
  });
};

// prompts the director to select a token to mark for revenge when an actor wearing the Revenger's Wrap takes damage, and applies the mark as an active effect
export async function applyMarkWhenWearerDamaged(actor, changes, options, wrapActors, combatActors) {

  if(!changes.system.stamina.value) return;
  if (!wrapActors.includes(actor)) return;
  
  if (options.bloodboundDamage) return;

  const newStamina  = changes.system?.stamina?.value;
  const newTemp     = changes.system?.stamina?.temporary;
  if (newStamina === undefined && newTemp === undefined) return;
  const prevStamina = options.ds?.previousStamina?.value       ?? actor.system.stamina.value;
  const prevTemp    = options.ds?.previousStamina?.temporary   ?? actor.system.stamina.temporary ?? 0;
  const currentVal  = newStamina ?? actor.system.stamina.value;
  const currentTemp = newTemp    ?? actor.system.stamina.temporary ?? 0;
  if ((currentVal + currentTemp) >= (prevStamina + prevTemp)) return;  

  let selected = canvas.tokens.controlled;

  if (selected.length !== 1) {
    const confirmed = await new Promise((resolve) => {
      const dialog = new foundry.applications.api.DialogV2({
        window: { title: "Mark for Revenge" },
        content: `<p><strong>${actor.name}</strong> took damage!</p><p> Select exactly one token to be marked for <i>revenge</i>.</p>`,
        form: { closeOnSubmit: false },
        buttons: [{
          action: "ok",
          label: "Confirm",
          default: true,
          callback: async (event, button, dialog) => {
            const currentSelection = canvas.tokens.controlled;
            if (currentSelection.length !== 1) {
              ui.notifications.error("Select exactly one token to receive the mark.");
              return;
            }
            resolve(true);
            dialog.close();
          }
        }],
      });

      dialog.addEventListener("close", () => resolve(null), { once: true });
      dialog.render({ force: true });
    });

    if (!confirmed) return;

    selected = canvas.tokens.controlled;
  }

  const selectedActor = selected[0].actor;

  if (wrapActors.includes(selectedActor)) return;

  clearRevengeMarks(combatActors);

  const effectData = foundry.utils.deepClone(REVENGE_EFFECT_DATA);
  effectData.origin = REVENGE_ORIGIN;
  await selectedActor.createEmbeddedDocuments("ActiveEffect", [effectData]);

  ui.notifications.info(`${selectedActor.name} marked for revenge.`);

  await ChatMessage.create({
    content: `<strong>Revenger's Wrap:</strong> ${actor.name} took damage and ${selectedActor.name} is marked for revenge.`
  });
};

// applies the bonus effect of the Revenger's Wrap when an actor wearing it makes a strike targeting a marked token
export async function applyRevengeStrikeEffects(message, game, wrapActors, combatActors) {
  if (!message.rolls?.length) return;
  if (message.rolls[0].options?.type !== 'test') return;

  const attackingActor = game.actors.get(message.speaker?.actor)
    ?? canvas.tokens.get(message.speaker?.token)?.actor;
  if (!attackingActor) return;

  if (!wrapActors.includes(attackingActor)) return;

  const abilityName = message.content;
  const itemData = Array.from(attackingActor.collections.items.values()).find(e => e.name === abilityName);
  if (!itemData) return;
  if (!itemData.system.keywords.has('strike')) return;  

  const markedActor = combatActors.find(a =>
    a.effects.some(e => e.name === REVENGE_EFFECT_DATA.name)
  );
  if (!markedActor) return;

  const allTargets = game.users.contents.flatMap(u => [...u.targets]);
  const markedIsTargeted = allTargets.some(t =>
    t.actor?.id === markedActor.id || t.id === markedActor.token?.id
  );

  if (!markedIsTargeted) return;

  const maxChar = Math.max(...Object.values(attackingActor.system.characteristics).map(c => c.value));
  await ChatMessage.create({
    content: `<strong>Revenger's Wrap Bonus Effect:</strong> <br/> [[/apply Bleeding turn]]`,
  });

  const roll = new ds.rolls.DamageRoll('' +maxChar);
  await roll.toMessage({
    flavor: `Revenger's Wrap Bonus Damage:`,
  });
}