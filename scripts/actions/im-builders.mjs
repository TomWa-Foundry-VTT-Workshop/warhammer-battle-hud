/**
 * Panel akcji Imperium Maledictum (system impmal) – budowanie list z danych aktora, bez zależności od Foundry.
 *
 * `env`: { config (game.impmal.config), localize(key), statusEffects (CONFIG.statusEffects) }.
 * Akcja: { name, value ("typ|id|dodatek"), img?, detail?, tooltip ({ details, text, hint }), cssClass? }.
 */
import { plain } from "./builders.mjs";
import { equipmentActions, gearForUse } from "./system-panel.mjs";

const PC_TYPES = ["character"];
const isEquipped = (item) => Boolean(item.system?.equipped?.value);
const gear = (actor, env, list) => gearForUse(actor, list, isEquipped, { onlyEquipped: env.onlyEquipped ?? true, pcTypes: PC_TYPES });

export const IM = Object.freeze({
  action: "action",
  characteristic: "characteristic",
  skill: "skill",
  weapon: "weapon",
  reload: "reload",
  dodge: "dodge",
  initiative: "initiative",
  trait: "trait",
  protection: "protection",
  power: "power",
  warp: "warp",
  purge: "purge",
  use: "use",
  sheet: "sheet",
  condition: "condition",
  fate: "fate",
  equip: "equip"
});

export const imValue = (type, id = "", extra = "") => [type, id, extra].join("|").replace(/\|+$/, "");
export function readImValue(value) {
  const [type, id = "", extra = ""] = String(value ?? "").split("|");
  return Object.values(IM).includes(type) ? { type, id, extra } : null;
}

const tip = (env, key, value) => ({ label: env.localize(`WFRP4E_HUD.Tip.${key}`), value });
const hint = (env, key) => env.localize(`WHB_IM.Hint.${key}`);
const items = (actor, type) => [...(actor?.itemTypes?.[type] ?? [])].sort((a, b) => String(a.name).localeCompare(String(b.name)));
const description = (item) => {
  const text = plain(item?.system?.notes?.player ?? item?.system?.description?.value);
  return text && String(item?.name ?? "").startsWith(text) ? "" : text;
};
const traits = (item) => item?.system?.traits?.displayString || undefined;

/** Akcje walki systemu (Celowanie, Szarża, Unik…): wybór akcji tury, jak w trackerze walki. */
export function buildActions(env) {
  return Object.entries(env.config?.actions ?? {}).map(([key, action]) => ({
    name: env.localize(action.label),
    value: imValue(IM.action, key),
    tooltip: { text: plain(action.description), hint: hint(env, "Action") }
  }));
}

/** Cechy i umiejętności z wartościami; specjalizacje jako osobne testy pod umiejętnością. */
export function buildCharacteristics(actor, env) {
  const characteristics = actor?.system?.characteristics ?? {};
  return Object.entries(env.config?.characteristics ?? {})
    .filter(([key]) => characteristics[key])
    .map(([key, label]) => ({
      name: env.localize(label),
      value: imValue(IM.characteristic, key),
      detail: String(characteristics[key].total ?? ""),
      tooltip: {
        details: [
          tip(env, "Initial", characteristics[key].starting),
          tip(env, "Advances", characteristics[key].advances || undefined),
          tip(env, "Modifier", characteristics[key].modifier || undefined),
          tip(env, "Total", characteristics[key].total)
        ],
        hint: hint(env, "Roll")
      }
    }));
}

/** Umiejętności pogrupowane według cech (jak na karcie), specjalizacje pod swoją umiejętnością. */
export function buildSkillGroups(actor, env) {
  const skills = buildSkills(actor, env);
  return Object.entries(env.config?.characteristics ?? {})
    .map(([key, label]) => {
      const value = actor?.system?.characteristics?.[key]?.total;
      return { label: value === undefined ? env.localize(label) : `${env.localize(label)} (${value})`, actions: skills.filter((a) => a.characteristic === key) };
    })
    .filter((group) => group.actions.length);
}

export function buildSkills(actor, env) {
  const skills = actor?.system?.skills ?? {};
  const out = [];
  for (const [key, label] of Object.entries(env.config?.skills ?? {})) {
    const skill = skills[key];
    if (!skill) continue;
    const chLabel = env.config?.characteristicAbbrev?.[skill.characteristic] ?? skill.characteristic;
    out.push({
      name: env.localize(label),
      value: imValue(IM.skill, key),
      characteristic: skill.characteristic,
      detail: String(skill.total ?? ""),
      tooltip: {
        details: [tip(env, "Characteristic", env.localize(chLabel)), tip(env, "Advances", skill.advances || undefined), tip(env, "Total", skill.total)],
        hint: hint(env, "Roll")
      }
    });
    for (const spec of skill.specialisations ?? []) {
      out.push({
        name: spec.name,
        value: imValue(IM.skill, key, spec.id),
        characteristic: skill.characteristic,
        detail: String(spec.system?.total ?? ""),
        cssClass: "specialisation",
        tooltip: {
          details: [tip(env, "Skill", env.localize(label)), tip(env, "Advances", spec.system?.advances || undefined), tip(env, "Total", spec.system?.total)],
          hint: hint(env, "Roll")
        }
      });
    }
  }
  return out;
}

/** Walka: broń (wspólna reguła „tylko założone”), przeładowanie, Unik, Inicjatywa, cechy ataku i ochrona. */
export function buildCombat(actor, env) {
  const shown = gear(actor, env, items(actor, "weapon"));
  const weaponAction = (weapon) => {
    const s = weapon.system ?? {};
    // Magazynek mają tylko bronie dystansowe (broń biała ma w danych domyślne mag.value = 1)
    const mag = s.isRanged && s.mag?.value > 0 ? s.mag : null;
    const empty = mag && !(mag.current > 0);
    return {
      name: weapon.name,
      img: weapon.img,
      value: imValue(IM.weapon, weapon.id),
      detail: mag ? `${mag.current}/${mag.value}` : String(s.damage?.value ?? ""),
      cssClass: empty ? "unaffordable" : "",
      tooltip: {
        details: [
          tip(env, "Damage", s.damage?.value),
          tip(env, "Skill", s.skillTotal),
          tip(env, "Range", s.isRanged ? env.config?.ranges?.[s.range] ?? s.range : undefined),
          tip(env, "Magazine", mag ? `${mag.current} / ${mag.value}` : undefined),
          tip(env, "Ammo", s.ammo?.document?.name),
          tip(env, "Traits", traits(weapon))
        ],
        text: description(weapon),
        hint: hint(env, empty ? "Empty" : "Attack")
      }
    };
  };
  const reload = shown
    .filter((w) => w.system?.isRanged && w.system?.mag?.value > 0 && w.system.mag.current < w.system.mag.value)
    .map((w) => ({
      name: `${env.localize("WHB_IM.Reload")}: ${w.name}`,
      img: w.img,
      value: imValue(IM.reload, w.id),
      detail: `${w.system.mag.current}/${w.system.mag.value}`,
      tooltip: { details: [tip(env, "Ammo", w.system.ammo?.document ? `${w.system.ammo.document.name} (${w.system.ammo.document.system?.quantity ?? 0})` : undefined)], hint: hint(env, "Reload") }
    }));
  const defence = [
    { name: env.localize("WHB_IM.Dodge"), value: imValue(IM.dodge), tooltip: { details: [tip(env, "Skill", actor?.system?.skills?.reflexes?.total)], hint: hint(env, "Roll") } },
    { name: env.localize("WHB_IM.Initiative"), value: imValue(IM.initiative), detail: String(actor?.system?.combat?.initiative ?? ""), tooltip: { hint: hint(env, "Initiative") } }
  ];
  const attackTraits = items(actor, "trait").filter((t) => t.system?.attack?.type).map((trait) => ({
    name: trait.name,
    img: trait.img,
    value: imValue(IM.trait, trait.id),
    detail: String(trait.system.attack.damage?.value ?? ""),
    tooltip: { details: [tip(env, "Damage", trait.system.attack.damage?.value)], text: description(trait), hint: hint(env, "Attack") }
  }));
  const protection = gear(actor, env, items(actor, "protection")).map((piece) => ({
    name: piece.name,
    img: piece.img,
    value: imValue(IM.protection, piece.id),
    detail: String(piece.system?.armour ?? ""),
    tooltip: {
      details: [tip(env, "AP", piece.system?.armour), tip(env, "Locations", piece.system?.locations?.label), tip(env, "Traits", traits(piece))],
      text: description(piece),
      hint: hint(env, "Sheet")
    }
  }));
  return {
    melee: shown.filter((w) => w.system?.isMelee).map(weaponAction),
    ranged: shown.filter((w) => w.system?.isRanged).map(weaponAction),
    reload,
    defence,
    traits: attackTraits,
    protection
  };
}

/** Ekwipunek: broń (przez ręce systemu) i ochrona – klik zakłada albo odkłada. */
export function buildEquipment(actor, env) {
  const isWeapon = (item) => item.type === "weapon";
  return equipmentActions([...items(actor, "weapon"), ...items(actor, "protection")], {
    isEquipped,
    value: (item) => imValue(IM.equip, item.id),
    detail: (item) => (isWeapon(item) ? item.system?.damage?.value : item.system?.armour),
    details: (item) => [tip(env, isWeapon(item) ? "Damage" : "AP", isWeapon(item) ? item.system?.damage?.value : item.system?.armour)],
    hint: hint(env, "Equip")
  });
}

/** Moce psioniczne z Wartością Spaczni i trudnością, test Spaczni i oczyszczenie (gdy jest ładunek). */
export function buildPsychic(actor, env) {
  const powers = items(actor, "power");
  const warp = actor?.system?.warp ?? {};
  if (!powers.length) return { powers: [], warp: [] };
  const powerActions = powers.map((power) => {
    const s = power.system ?? {};
    return {
      school: s.discipline ?? "",
      name: power.name,
      img: power.img,
      value: imValue(IM.power, power.id),
      detail: String(s.rating ?? ""),
      tooltip: {
        details: [
          tip(env, "WarpRating", s.rating),
          tip(env, "Difficulty", env.config?.difficulties?.[s.difficulty]?.name ?? s.difficulty),
          tip(env, "Discipline", env.config?.disciplines?.[s.discipline] ?? s.discipline),
          tip(env, "Range", env.config?.powerRanges?.[s.range] ?? s.range),
          tip(env, "Target", s.target),
          tip(env, "Duration", env.config?.powerDurations?.[s.duration] ?? s.duration),
          tip(env, "Overt", s.overt ? env.localize("Yes") : undefined)
        ],
        text: description(power),
        hint: hint(env, "Power")
      }
    };
  });
  const charge = `${warp.charge ?? 0}/${warp.threshold ?? 0}`;
  const over = warp.charge > warp.threshold;
  const warpActions = [
    { name: env.localize("WHB_IM.WarpCharge"), value: imValue(IM.warp), detail: charge, cssClass: over ? "untreated" : "", tooltip: { hint: hint(env, "Warp") } },
    ...(warp.charge > 0 ? [{ name: env.localize("WHB_IM.Purge"), value: imValue(IM.purge), tooltip: { hint: hint(env, "Purge") } }] : [])
  ];
  return { powers: powerActions, warp: warpActions };
}

/** Talenty i cechy bez ataku do użycia; zepsucie, urazy i rany krytyczne do podglądu. */
export function buildTalents(actor, env) {
  const use = (item) => ({
    name: item.name,
    img: item.img,
    value: imValue(IM.use, item.id),
    detail: item.system?.taken > 1 ? `×${item.system.taken}` : "",
    tooltip: { text: description(item), hint: hint(env, "Use") }
  });
  const sheet = (item) => ({ name: item.name, img: item.img, value: imValue(IM.sheet, item.id), tooltip: { text: description(item), hint: hint(env, "Sheet") } });
  return {
    talents: items(actor, "talent").map(use),
    traits: items(actor, "trait").filter((t) => !t.system?.attack?.type).map(use),
    corruption: items(actor, "corruption").map(sheet)
  };
}

/** Los, stany (drobne i poważne) oraz urazy i rany krytyczne. */
export function buildStatus(actor, env) {
  const fate = actor?.system?.fate;
  const fateActions = fate ? [{ name: env.localize("WHB_IM.Fate"), value: imValue(IM.fate), detail: `${fate.value ?? 0}/${fate.max ?? 0}`, tooltip: { hint: hint(env, "Counter") } }] : [];
  const conditions = (env.statusEffects ?? []).filter((s) => s.id && s.id !== "dead").map((status) => {
    const active = actor?.hasCondition?.(status.id);
    const tier = active ? env.localize(active.isMajor ? "WHB_IM.Major" : "WHB_IM.Minor") : "";
    return {
      name: env.localize(status.name ?? status.id),
      img: status.img,
      value: imValue(IM.condition, status.id),
      detail: tier,
      cssClass: active ? "toggle active" : "toggle",
      tooltip: { hint: hint(env, "Condition") }
    };
  });
  const injuries = [...items(actor, "injury"), ...items(actor, "critical")].map((item) => ({
    name: item.name,
    img: item.img,
    value: imValue(IM.sheet, item.id),
    cssClass: "untreated",
    tooltip: { text: description(item), hint: hint(env, "Sheet") }
  }));
  return { fate: fateActions, conditions, injuries };
}
