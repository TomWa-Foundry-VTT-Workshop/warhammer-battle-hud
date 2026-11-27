/**
 * Panel akcji Age of Sigmar: Soulbound – budowanie list z danych aktora, bez zależności od Foundry.
 *
 * `env`: { config (game.aos.config), localize(key), statusEffects (CONFIG.statusEffects) }.
 * Pula kości testu to wartość atrybutu + wyszkolenie umiejętności; skupienie pozwala potem podbijać wyniki.
 */
import { plain } from "./builders.mjs";
import { equipmentActions, gearForUse, panelValue as v } from "./system-panel.mjs";

/** Typy postaci graczy – reguła „tylko założone” w Walce. */
const PC_TYPES = ["player"];
const gear = (actor, env, list) => gearForUse(actor, list, (item) => Boolean(item.system?.equipped), { onlyEquipped: env.onlyEquipped ?? true, pcTypes: PC_TYPES });

export const SB = Object.freeze({
  attribute: "attribute",
  skill: "skill",
  weapon: "weapon",
  armour: "armour",
  spell: "spell",
  miracle: "miracle",
  ability: "ability",
  condition: "condition",
  mettle: "mettle",
  initiative: "initiative",
  equip: "equip"
});

const tip = (env, key, value) => ({ label: env.localize(`WFRP4E_HUD.Tip.${key}`), value });
const hint = (env, key) => env.localize(`WHB_SB.Hint.${key}`);
const items = (actor, type) => [...(actor?.itemTypes?.[type] ?? [])].sort((a, b) => String(a.name).localeCompare(String(b.name)));
const description = (item) => {
  const text = plain(item?.system?.description ?? item?.system?.effect);
  return text && String(item?.name ?? "").startsWith(text) ? "" : text;
};
const traitNames = (item) => (item?.system?.traits ?? []).map((t) => t?.display ?? t?.name).filter(Boolean).join(", ") || undefined;

/** Atrybuty Ciało, Umysł i Dusza. */
export function buildAttributes(actor, env) {
  const attributes = actor?.system?.attributes ?? {};
  return Object.entries(env.config?.attributes ?? {})
    .filter(([key]) => attributes[key])
    .map(([key, label]) => ({
      name: env.localize(label),
      value: v(SB.attribute, key),
      detail: String(attributes[key].value ?? ""),
      tooltip: { details: [tip(env, "Dice", attributes[key].value)], hint: hint(env, "Roll") }
    }));
}

/** Umiejętności pogrupowane według atrybutu, z pulą kości (atrybut + wyszkolenie) i skupieniem. */
export function buildSkillGroups(actor, env) {
  const skills = actor?.system?.skills ?? {};
  const attributes = actor?.system?.attributes ?? {};
  return Object.entries(env.config?.attributes ?? {})
    .map(([attr, attrLabel]) => ({
      label: attributes[attr]?.value === undefined ? env.localize(attrLabel) : `${env.localize(attrLabel)} (${attributes[attr].value})`,
      actions: Object.entries(env.config?.skills ?? {})
        .filter(([key]) => skills[key]?.attribute === attr)
        .map(([key, label]) => {
          const skill = skills[key];
          const pool = (Number(attributes[attr]?.value) || 0) + (Number(skill.training) || 0);
          return {
            name: env.localize(label),
            value: v(SB.skill, key),
            detail: skill.focus ? `${pool}+${skill.focus}` : String(pool),
            tooltip: {
              details: [
                tip(env, "Characteristic", `${env.localize(attrLabel)} (${attributes[attr]?.value ?? "?"})`),
                tip(env, "Training", skill.training || undefined),
                tip(env, "Focus", skill.focus || undefined),
                tip(env, "Dice", pool)
              ],
              hint: hint(env, "Roll")
            }
          };
        })
    }))
    .filter((group) => group.actions.length);
}

/** Walka: założona broń, rzut na Inicjatywę, pancerz i Hart (Mettle). */
export function buildCombat(actor, env) {
  const shown = gear(actor, env, items(actor, "weapon"));
  const combat = actor?.system?.combat ?? {};
  const weaponAction = (weapon) => ({
    name: weapon.name,
    img: weapon.img,
    value: v(SB.weapon, weapon.id),
    detail: String(weapon.system?.damage ?? ""),
    tooltip: {
      details: [
        tip(env, "Damage", weapon.system?.damage),
        tip(env, "Skill", weapon.system?.isRanged ? combat.accuracy?.ability : combat.melee?.ability),
        tip(env, "Traits", traitNames(weapon))
      ],
      text: description(weapon),
      hint: hint(env, "Attack")
    }
  });
  const armour = gear(actor, env, items(actor, "armour")).map((piece) => ({
    name: piece.name,
    img: piece.img,
    value: v(SB.armour, piece.id),
    detail: String(piece.system?.benefit ?? ""),
    tooltip: { details: [tip(env, "AP", piece.system?.benefit), tip(env, "Traits", traitNames(piece))], text: description(piece), hint: hint(env, "Sheet") }
  }));
  const other = [
    { name: env.localize("WHB_SB.Initiative"), value: v(SB.initiative), detail: String(combat.initiative?.total ?? ""), tooltip: { hint: hint(env, "Initiative") } },
    { name: env.localize("WHB_SB.Mettle"), value: v(SB.mettle), detail: `${combat.mettle?.value ?? 0}/${combat.mettle?.max ?? 0}`, tooltip: { hint: hint(env, "Counter") } }
  ];
  return {
    melee: shown.filter((w) => !w.system?.isRanged).map(weaponAction),
    ranged: shown.filter((w) => w.system?.isRanged).map(weaponAction),
    other,
    armour
  };
}

/** Ekwipunek: broń i pancerz – klik zakłada albo odkłada. */
export function buildEquipment(actor, env) {
  const isWeapon = (item) => item.type === "weapon";
  return equipmentActions([...items(actor, "weapon"), ...items(actor, "armour")], {
    isEquipped: (item) => Boolean(item.system?.equipped),
    value: (item) => v(SB.equip, item.id),
    detail: (item) => (isWeapon(item) ? item.system?.damage : item.system?.benefit),
    details: (item) => [tip(env, isWeapon(item) ? "Damage" : "AP", isWeapon(item) ? item.system?.damage : item.system?.benefit)],
    hint: hint(env, "Equip")
  });
}

/** Czary i cuda z ST, celem, zasięgiem i czasem trwania. */
export function buildPowers(actor, env) {
  const power = (type) => (item) => {
    const s = item.system ?? {};
    const duration = typeof s.duration === "object" ? [s.duration?.value, s.duration?.unit].filter(Boolean).join(" ") : s.duration;
    return {
      name: item.name,
      img: item.img,
      value: v(type, item.id),
      school: s.lore ?? "",
      detail: type === SB.spell ? String(s.dn ?? "") : s.cost ? String(s.cost) : "",
      tooltip: {
        details: [
          tip(env, "DN", s.dn),
          tip(env, "Cost", type === SB.miracle ? s.cost : undefined),
          tip(env, "Target", s.target),
          tip(env, "Range", s.range),
          tip(env, "Duration", duration),
          tip(env, "Damage", s.damage)
        ],
        text: description(item),
        hint: hint(env, type === SB.spell ? "Spell" : "Miracle")
      }
    };
  };
  return { spells: items(actor, "spell").map(power(SB.spell)), miracles: items(actor, "miracle").map(power(SB.miracle)) };
}

/** Talenty (z testem albo opisem na czacie). */
export function buildTalents(actor, env) {
  return items(actor, "talent").map((talent) => ({
    name: talent.name,
    img: talent.img,
    value: v(SB.ability, talent.uuid),
    tooltip: { text: description(talent), hint: hint(env, "Ability") }
  }));
}

/** Stany. */
export function buildConditions(actor, env) {
  return (env.statusEffects ?? []).filter((s) => s.id && s.id !== "dead").map((status) => {
    const active = Boolean(actor?.hasCondition?.(status.id));
    return {
      name: env.localize(status.name ?? status.id),
      img: status.img,
      value: v(SB.condition, status.id),
      cssClass: active ? "toggle active" : "toggle",
      tooltip: { hint: hint(env, "Condition") }
    };
  });
}
