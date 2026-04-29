const MODULE_ID = "draw-steel-rewards-automation";
const ITEM_NAME = 'Hellcharger Helm';

const CHARGE_EFFECT_DATA = {
  name: 'Hellcharging',
  img: "icons/equipment/head/helm-barbute-horned-gold-red.webp",
  type: "base",
  system: {
    end: { type: "turn", roll: "1d10 + @combat.save.bonus" }
  },
  changes: [{ key: "system.movement.value", mode: 2, value: "5", priority: null }],
  disabled: false,
  duration: {
    startTime: 0, combat: null, seconds: null,
    rounds: null, turns: null, startRound: 0, startTurn: 0
  },
  description: "", tint: "#ffffff", transfer: false, statuses: [], sort: 0, flags: {}
};
const CHARGE_ORIGIN = 'module.draw-steel-rewards-automation';

export async function remindAndApplyHelmEffects(message, game, helmActors) {

    const attackingActor = game.actors.get(message.speaker?.actor)
    ?? canvas.tokens.get(message.speaker?.token)?.actor;

    if (!attackingActor) return;
    if (!helmActors.some(a => a.id === attackingActor.id)) return;

    const abilityName = message.content;
    if (abilityName !== "Charge") return;

    const effectData = foundry.utils.deepClone(CHARGE_EFFECT_DATA);
    effectData.origin = CHARGE_ORIGIN;
    await attackingActor.createEmbeddedDocuments("ActiveEffect", [effectData]);

    await ChatMessage.create({
        content: `<strong>${ITEM_NAME}:</strong> ${attackingActor.name} used Charge, gaining a +5 bonus to speed until the end of the current turn. After charging, you can use the Knockback maneuver as a free maneuver, regardless of the target creature's size.`
    });
}