const MODULE_ID = "draw-steel-rewards-automation";
const ITEM_NAME = 'Kuran’zoi Prismscale';


//reminds the wearer of the Kuran'zoi Prismscale bonus to use their triggered reaction to apply Slowed to an enemy within 5 squares that damages them, when they take damage
export async function remindWhenWearerDamaged(actor, changes, options, scaleActors,) {

  if(!changes.system.stamina.value) return;
  if (!scaleActors.includes(actor)) return;
  
  if (options.bloodboundDamage) return;

  const newStamina  = changes.system?.stamina?.value;
  const newTemp     = changes.system?.stamina?.temporary;
  if (newStamina === undefined && newTemp === undefined) return;
  const prevStamina = options.ds?.previousStamina?.value       ?? actor.system.stamina.value;
  const prevTemp    = options.ds?.previousStamina?.temporary   ?? actor.system.stamina.temporary ?? 0;
  const currentVal  = newStamina ?? actor.system.stamina.value;
  const currentTemp = newTemp    ?? actor.system.stamina.temporary ?? 0;
  if ((currentVal + currentTemp) >= (prevStamina + prevTemp)) return;  

  await ChatMessage.create({
    content: `<strong>Kuran’zoi Prismscale:</strong> ${actor.name} took damage. If it was caused by an enemy within 5 squares, they may use a triggered action to apply [[/apply Slowed turn]] to the damaging creature.`
  });
};
