/**
 * Panel akcji Wrath & Glory (system wrath-and-glory) – budowanie list z danych aktora, bez zależności od Foundry.
 *
 * `env`: { config (game.wng.config), localize(key), statusEffects (CONFIG.statusEffects) }.
 */
import { plain } from "./builders.mjs";
import { equipmentActions, gearForUse, panelValue as v } from "./system-panel.mjs";

/** Typy postaci graczy (Agent) – reguła „tylko założone” w Walce. */
const PC_TYPES = ["agent"];
const gear = (actor, env, list) => gearForUse(actor, list, (item) => Boolean(item.system?.equipped), { onlyEquipped: env.onlyEquipped ?? true, pcTypes: PC_TYPES });

export const WNG = Object.freeze({
  attribute: "attribute",
  skill: "skill",
  generic: "generic",
  weapon: "weapon",
  armour: "armour",
  power: "power",
  ability: "ability",
  sheet: "sheet",
  condition: "condition",
  wrath: "wrath",
  wealth: "wealth",
  faith: "faith",
  initiative: "initiative",
  equip: "equip"
});

const tip = (env, key, value) => ({ label: env.localize(`WFRP4E_HUD.Tip.${key}`), value });
const hint = (env, key) => env.localize(`WHB_WNG.Hint.${key}`);
const items = (actor, type) => [...(actor?.itemTypes?.[type] ?? [])].sort((a, b) => String(a.name).localeCompare(String(b.name)));
const description = (item) => {
  const text = plain(item?.system?.description ?? item?.system?.effect);
  return text && String(item?.name ?? "").startsWith(text) ? "" : text;
};
const list = (value) => (Array.isArray(value) ? value.join(", ") : value) || undefined;

/** Atrybuty z wartością całkowitą. */
export function buildAttributes(actor, env) {
  const attributes = actor?.system?.attributes ?? {};
  return Object.entries(env.config?.attributes ?? {})
    .filter(([key]) => attributes[key])
    .map(([key, label]) => ({
      name: env.localize(label),
      value: v(WNG.attribute, key),
      detail: String(attributes[key].total ?? ""),
      tooltip: { details: [tip(env, "Rating", attributes[key].rating), tip(env, "Total", attributes[key].total)], hint: hint(env, "Roll") }
    }));
}

/** Umiejętności pogrupowane według atrybutu (pula kości = atrybut + umiejętność). */
export function buildSkillGroups(actor, env) {
  const skills = actor?.system?.skills ?? {};
  const attributes = actor?.system?.attributes ?? {};
  return Object.entries(env.config?.attributes ?? {})
    .map(([attr, attrLabel]) => ({
      label: attributes[attr]?.total === undefined ? env.localize(attrLabel) : `${env.localize(attrLabel)} (${attributes[attr].total})`,
      actions: Object.entries(env.config?.skills ?? {})
        .filter(([key]) => skills[key]?.attribute === attr)
        .map(([key, label]) => ({
          name: env.localize(label),
          value: v(WNG.skill, key),
          detail: String(skills[key].total ?? ""),
          tooltip: {
            details: [tip(env, "Characteristic", `${env.localize(attrLabel)} (${attributes[attr]?.total ?? "?"})`), tip(env, "Rating", skills[key].rating), tip(env, "Dice", skills[key].total)],
            hint: hint(env, "Roll")
          }
        }))
    }))
    .filter((group) => group.actions.length);
}

/** Walka: założona broń, testy obronne (Determinacja itd.), Inicjatywa i pancerz. */
export function buildCombat(actor, env) {
  const weapons = items(actor, "weapon").filter((w) => w.system?.isActiveMobAbility !== false);
  const shown = gear(actor, env, weapons);
  const weaponAction = (weapon) => {
    const s = weapon.system ?? {};
    const reload = Boolean(s.needsReload);
    return {
      name: weapon.name,
      img: weapon.img,
      value: v(WNG.weapon, weapon.id),
      detail: String(s.damage?.formatted ?? ""),
      cssClass: reload ? "unaffordable" : "",
      tooltip: {
        details: [
          tip(env, "Damage", s.damage?.formatted),
          tip(env, "ED", s.damage?.ED),
          tip(env, "AP", s.damage?.AP),
          tip(env, "Range", s.Range),
          tip(env, "Salvo", s.isRanged ? s.salvo : undefined),
          tip(env, "Ammo", s.ammo?.document ? `${s.ammo.document.name} (${s.ammo.document.system?.quantity ?? 0})` : undefined),
          tip(env, "Traits", list(s.traits?.formatted))
        ],
        text: description(weapon),
        hint: hint(env, reload ? "Reload" : "Attack")
      }
    };
  };
  const combat = actor?.system?.combat ?? {};
  const generic = ["determination", "resolve", "conviction"].map((key) => ({
    name: env.localize(`WHB_WNG.${key}`),
    value: v(WNG.generic, key),
    detail: String(combat[key]?.total ?? ""),
    tooltip: { hint: hint(env, key) }
  }));
  generic.push({ name: env.localize("WHB_WNG.initiative"), value: v(WNG.initiative), tooltip: { hint: hint(env, "initiative") } });
  const armour = gear(actor, env, items(actor, "armour")).map((piece) => ({
    name: piece.name,
    img: piece.img,
    value: v(WNG.armour, piece.id),
    detail: String(piece.system?.rating ?? ""),
    tooltip: {
      details: [tip(env, "AR", piece.system?.rating), tip(env, "Invulnerable", piece.system?.invulnerable ? env.localize("Yes") : undefined), tip(env, "Traits", list(piece.system?.traits?.formatted))],
      text: description(piece),
      hint: hint(env, "Sheet")
    }
  }));
  return {
    melee: shown.filter((w) => !w.system?.isRanged).map(weaponAction),
    ranged: shown.filter((w) => w.system?.isRanged).map(weaponAction),
    tests: generic,
    armour
  };
}

/** Ekwipunek: broń i pancerz – klik zakłada albo odkłada. */
export function buildEquipment(actor, env) {
  const isWeapon = (item) => item.type === "weapon";
  return equipmentActions([...items(actor, "weapon"), ...items(actor, "armour")], {
    isEquipped: (item) => Boolean(item.system?.equipped),
    value: (item) => v(WNG.equip, item.id),
    detail: (item) => (isWeapon(item) ? item.system?.damage?.formatted : item.system?.rating),
    details: (item) => [tip(env, isWeapon(item) ? "Damage" : "AR", isWeapon(item) ? item.system?.damage?.formatted : item.system?.rating)],
    hint: hint(env, "Equip")
  });
}

/** Moce psioniczne z ST, aktywacją, zasięgiem i czasem trwania. */
export function buildPowers(actor, env) {
  return items(actor, "psychicPower").map((power) => {
    const s = power.system ?? {};
    return {
      name: power.name,
      img: power.img,
      value: v(WNG.power, power.id),
      school: s.discipline ?? "",
      detail: s.dn ? `DN ${s.dn}` : "",
      tooltip: {
        details: [
          tip(env, "DN", s.dn),
          tip(env, "Activation", s.Activation),
          tip(env, "Range", s.Range ?? s.range),
          tip(env, "Duration", s.duration),
          tip(env, "Damage", s.damage?.enabled ? s.damage?.formatted : undefined),
          tip(env, "Discipline", s.discipline)
        ],
        text: description(power),
        hint: hint(env, "Power")
      }
    };
  });
}

/** Zdolności i talenty (z testem albo opisem na czacie) oraz słowa kluczowe. */
export function buildAbilities(actor, env) {
  const ability = (item) => ({
    name: item.name,
    img: item.img,
    value: v(WNG.ability, item.id),
    tooltip: { text: description(item), hint: hint(env, "Ability") }
  });
  return {
    abilities: items(actor, "ability").map(ability),
    talents: items(actor, "talent").map(ability),
    keywords: items(actor, "keyword").map((k) => ({ name: k.name, value: v(WNG.sheet, k.id), tooltip: { text: description(k), hint: hint(env, "Sheet") } }))
  };
}

/** Gniew i Wiara postaci, test Spaczenia, stany, urazy i mutacje. */
export function buildStatus(actor, env) {
  const res = actor?.system?.resources ?? {};
  const resources = [
    { name: env.localize("WHB_WNG.Wrath"), value: v(WNG.wrath), detail: String(res.wrath ?? 0), tooltip: { hint: hint(env, "Counter") } },
    ...(res.faith?.total > 0 ? [{ name: env.localize("WHB_WNG.Faith"), value: v(WNG.faith), detail: `${res.faith.current ?? 0}/${res.faith.total}`, tooltip: { hint: hint(env, "Counter") } }] : []),
    { name: env.localize("WHB_WNG.corruption"), value: v(WNG.generic, "corruption"), detail: String(actor?.system?.corruption?.current ?? 0), tooltip: { hint: hint(env, "corruption") } }
  ];
  // Poza walką: Wpływy (test jak na karcie) i Bogactwo (wartość do zmiany)
  const social = [
    { name: env.localize("WHB_WNG.influence"), value: v(WNG.generic, "influence"), detail: String(res.influence ?? 0), tooltip: { hint: hint(env, "influence") } },
    { name: env.localize("WHB_WNG.Wealth"), value: v(WNG.wealth), detail: String(res.wealth ?? 0), tooltip: { hint: hint(env, "Counter") } }
  ];
  const conditions = (env.statusEffects ?? []).filter((s) => s.id && s.id !== "dead").map((status) => {
    const active = Boolean(actor?.hasCondition?.(status.id));
    return {
      name: env.localize(status.name ?? status.id),
      img: status.img,
      value: v(WNG.condition, status.id),
      cssClass: active ? "toggle active" : "toggle",
      tooltip: { text: plain(env.localize(env.config?.conditionDescriptions?.[status.id] ?? "")), hint: hint(env, "Condition") }
    };
  });
  const injuries = [...items(actor, "memorableInjury"), ...items(actor, "traumaticInjury"), ...items(actor, "mutation")].map((item) => ({
    name: item.name,
    img: item.img,
    value: v(WNG.sheet, item.id),
    cssClass: "untreated",
    tooltip: { text: description(item), hint: hint(env, "Sheet") }
  }));
  return { resources, social, conditions, injuries };
}
