const MODULE_ID = "draw-steel-combat-tracker";
const ITEM_NAME = 'Bloodbound Band';

export async function dealSharedDamage(bandActors, actor, changes, options) {

    if (options.bloodboundDamage) return;
    if (!bandActors.some(a => a.id === actor.id)) return;

    const newStamina  = changes.system?.stamina?.value;
    const newTemp     = changes.system?.stamina?.temporary;
    if (newStamina === undefined && newTemp === undefined) return;

    const prevStamina = options.ds?.previousStamina?.value       ?? actor.system.stamina.value;
    const prevTemp    = options.ds?.previousStamina?.temporary   ?? actor.system.stamina.temporary ?? 0;
    const currentVal  = newStamina ?? actor.system.stamina.value;
    const currentTemp = newTemp    ?? actor.system.stamina.temporary ?? 0;

    if ((currentVal + currentTemp) >= (prevStamina + prevTemp)) return;

    const others = bandActors.filter(a => a.id !== actor.id);
    for (const other of others) {
        const temp      = other.system.stamina.temporary ?? 0;
        const current   = other.system.stamina.value ?? 0;
        const min       = other.system.stamina.min ?? 0;
        const absorbed  = Math.min(temp, 1);
        const remainder = 1 - absorbed;
        const updates   = { 'system.stamina.temporary': temp - absorbed };
        if (remainder > 0) updates['system.stamina.value'] = Math.max(current - remainder, min);
        await other.update(updates, { bloodboundDamage: true });
    }

    await ChatMessage.create({
        content: `<strong>Bloodbound Band:</strong> ${actor.name} took damage and therefore ${others.map(a => a.name).join(', ')} ${others.length === 1 ? 'takes' : 'take'} 1 damage which can’t be reduced in any way.`
    });
}
