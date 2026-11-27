/**
 * Panel akcji Warhammer: The Old World (system whtow) – budowanie list z danych aktora, bez zależności od Foundry.
 *
 * `env`: { config (game.oldworld.config), localize(key), isGM }.
 * Akcja: { name, value ("typ|id|dodatek"), img?, detail?, tooltip ({ details, text, hint }), cssClass? }.
 */
import { plain } from "./builders.mjs";
import { equipmentActions, gearForUse } from "./system-panel.mjs";
import { equippableGrimoires, towIsEquipped } from "../grimoire-equipment.mjs";

/** Typy postaci graczy (reguła „tylko założone” w Walce). */
const PC_TYPES = ["character"];
const gear = (actor, env, list) => gearForUse(actor, list, (item) => item.system?.isEquipped, { onlyEquipped: env.onlyEquipped ?? true, pcTypes: PC_TYPES });

/** Typy akcji panelu The Old World. */
export const TOW = Object.freeze({
  action: "action",
  skill: "skill",
  weapon: "weapon",
  reload: "reload",
  ability: "ability",
  shield: "shield",
  armour: "armour",
  castLore: "castLore",
  spell: "spell",
  miscastDispose: "miscastDispose",
  miscastRoll: "miscastRoll",
  blessing: "blessing",
  use: "use",
  condition: "condition",
  fate: "fate",
  fateRefresh: "fateRefresh",
  wound: "wound",
  woundAdd: "woundAdd",
  endeavour: "endeavour",
  equip: "equip",
  opposed: "opposed",
  mount: "mount",
  mountItem: "mountItem"
});

/** Wartość przycisku i jej odczyt; identyfikatory UUID nie zawierają „|”. */
export const towValue = (type, id = "", extra = "") => [type, id, extra].join("|").replace(/\|+$/, "");
export function readTowValue(value) {
  const [type, id = "", extra = ""] = String(value ?? "").split("|");
  return Object.values(TOW).includes(type) ? { type, id, extra } : null;
}

const tip = (env, key, value) => ({ label: env.localize(`WFRP4E_HUD.Tip.${key}`), value });
const hint = (env, key) => env.localize(`WHB_TOW.Hint.${key}`);
const items = (actor, type) => [...(actor?.itemTypes?.[type] ?? [])].sort((a, b) => String(a.name).localeCompare(String(b.name)));
const description = (item) => {
  const text = plain(item?.system?.description?.public);
  return text && String(item?.name ?? "").startsWith(text) ? "" : text;
};
const rangeLabel = (env, key) => (key === undefined || key === null || key === "" ? undefined : env.config?.range?.[key] ?? String(key));

/** Zasięg broni lub ataku: w zwarciu jedna wartość, na dystans przedział. */
function weaponRange(env, system) {
  if (system.isMelee) return rangeLabel(env, system.range?.melee ?? system.attack?.range?.melee);
  const range = system.range ?? system.attack?.range ?? {};
  const [min, max] = [rangeLabel(env, range.min), rangeLabel(env, range.max)];
  return min && max && min !== max ? `${min} – ${max}` : max ?? min;
}

/** Akcje walki z konfiguracji systemu; manewry rozpisane na warianty. */
export function buildCombatActions(env) {
  const out = [];
  for (const [key, action] of Object.entries(env.config?.actions ?? {})) {
    const subs = Object.entries(action.subActions ?? {});
    if (!subs.length) {
      out.push({ name: env.localize(action.label), value: towValue(TOW.action, key), tooltip: { text: plain(action.description), hint: hint(env, "Action") } });
      continue;
    }
    for (const [subKey, sub] of subs) {
      out.push({
        name: `${env.localize(action.label)}: ${env.localize(sub.label)}`,
        value: towValue(TOW.action, key, subKey),
        tooltip: {
          details: [tip(env, "Test", sub.test?.skill ? env.config?.skills?.[sub.test.skill] : undefined)],
          text: plain(sub.description),
          hint: hint(env, "Action")
        }
      });
    }
  }
  return out;
}

/** Umiejętności pogrupowane według cech, z liczbą kości. */
/**
 * Pula kości testu umiejętności, jak w systemie (`{cecha}d10cs<={umiejętność}`):
 * rzucamy tyloma k10, ile wynosi cecha, a sukcesem jest każda kość z wynikiem nie większym niż umiejętność.
 */
export function dicePool(env, dice, target) {
  if (dice === undefined || dice === null || target === undefined || target === null) return "";
  return env.localize("WHB_TOW.DicePool").replace("{dice}", dice).replace("{target}", target);
}

export function buildSkillGroups(actor, env) {
  const skills = actor?.system?.skills ?? {};
  const characteristics = actor?.system?.characteristics ?? {};
  return Object.entries(env.config?.characteristics ?? {})
    .map(([ch, label]) => {
      const dice = characteristics[ch]?.value;
      return {
        // Nagłówek z wartością cechy: od razu widać, iloma kośćmi rzuca każda umiejętność z kolumny
        label: dice === undefined ? env.localize(label) : `${env.localize(label)} (${dice})`,
        actions: Object.entries(skills)
          .filter(([, skill]) => skill?.characteristic === ch)
          .map(([key, skill]) => ({
            name: env.localize(env.config?.skills?.[key] ?? key),
            value: towValue(TOW.skill, key),
            detail: dicePool(env, dice, skill.value) || String(skill.value ?? ""),
            tooltip: {
              details: [
                tip(env, "Dice", dice === undefined ? undefined : `${dice} (${env.localize(label)})`),
                tip(env, "Target", skill.value),
                tip(env, "Advances", skill.advances || undefined),
                tip(env, "Improvement", skill.improvement || undefined)
              ],
              text: env.localize("WHB_TOW.DicePoolRule"),
              hint: hint(env, "Roll")
            }
          }))
      };
    })
    .filter((group) => group.actions.length);
}

/** Broń i pancerz do walki (wspólna reguła „tylko założone”), przeładowanie, zdolności ataku. */
export function buildCombat(actor, env) {
  const shown = gear(actor, env, items(actor, "weapon"));
  const weaponAction = (weapon) => {
    const system = weapon.system ?? {};
    const unloaded = system.requiresLoading && !system.isLoaded;
    return {
      name: weapon.name,
      img: weapon.img,
      value: towValue(TOW.weapon, weapon.uuid),
      detail: String(system.damage?.value ?? ""),
      cssClass: unloaded ? "unaffordable" : "",
      tooltip: {
        details: [
          tip(env, "Damage", system.damage?.value),
          tip(env, "Range", weaponRange(env, system)),
          tip(env, "Skill", env.config?.skills?.[system.skill]),
          tip(env, "Grip", system.grip),
          tip(env, "Traits", system.traits),
          tip(env, "Loaded", system.requiresLoading ? `${system.reload?.current ?? 0} / ${system.reload?.value ?? 0}` : undefined)
        ],
        text: description(weapon),
        hint: hint(env, unloaded ? "Unloaded" : "Attack")
      }
    };
  };
  const reload = shown
    .filter((w) => w.system?.requiresLoading && !w.system?.isLoaded)
    .map((w) => ({
      name: `${env.localize("WHB_TOW.Reload")}: ${w.name}`,
      img: w.img,
      value: towValue(TOW.reload, w.uuid),
      detail: `${w.system.reload?.current ?? 0}/${w.system.reload?.value ?? 0}`,
      tooltip: { hint: hint(env, "Reload") }
    }));
  const attacks = items(actor, "ability").filter((a) => a.system?.isAttack).map((ability) => ({
    name: ability.name,
    img: ability.img,
    value: towValue(TOW.ability, ability.uuid),
    detail: String(ability.system?.damage?.value ?? ""),
    tooltip: {
      details: [
        tip(env, "Damage", ability.system?.damage?.value),
        tip(env, "Dice", ability.system?.attack?.dice || undefined),
        tip(env, "Traits", ability.system?.attack?.traits)
      ],
      text: description(ability),
      hint: hint(env, "Attack")
    }
  }));
  const armour = gear(actor, env, items(actor, "armour"));
  const armourAction = (piece) => ({
    name: piece.name,
    img: piece.img,
    value: towValue(piece.system?.shield ? TOW.shield : TOW.armour, piece.uuid),
    detail: String(piece.system?.resilience ?? ""),
    tooltip: {
      details: [tip(env, "Resilience", piece.system?.resilience), tip(env, "Traits", piece.system?.traits)],
      text: description(piece),
      hint: hint(env, piece.system?.shield ? "Shield" : "Sheet")
    }
  });
  return {
    melee: shown.filter((w) => w.system?.isMelee).map(weaponAction),
    ranged: shown.filter((w) => w.system?.isRanged).map(weaponAction),
    reload,
    attacks,
    armour: armour.map(armourAction)
  };
}

/** Szybkość i Wytrzymałość z karty postaci – do nagłówków grup w zakładce Walka. */
export function combatStats(actor, env) {
  const speed = actor?.system?.speed?.value;
  return {
    speed: speed === undefined || speed === null || speed === "" ? undefined : env.localize(env.config?.speed?.[speed] ?? String(speed)),
    resilience: actor?.system?.resilience?.value
  };
}

/** Obrona: atak, na który odpowie następny test postaci (jak „Defending Against” na karcie). */
export function buildDefending(actor, env) {
  const test = actor?.system?.opposed?.system?.test;
  if (!test) return [];
  const successes = test.result?.successes;
  return [{
    name: test.actor?.name ?? env.localize("WHB_TOW.Attacker"),
    img: test.actor?.prototypeToken?.texture?.src ?? test.actor?.img,
    value: towValue(TOW.opposed),
    detail: successes === undefined ? "" : String(successes),
    cssClass: "untreated",
    tooltip: {
      details: [tip(env, "Weapon", test.item?.name), tip(env, "Successes", successes)],
      text: env.localize("WHB_TOW.DefendingText"),
      hint: hint(env, "Defending")
    }
  }];
}

/** Ekwipunek: każda broń, pancerz i tarcza – klik zakłada albo zdejmuje (jak w zakładce Wyposażenie). */
export function buildEquipment(actor, env) {
  const isWeapon = (item) => item.type === "weapon";
  return equipmentActions([...items(actor, "weapon"), ...items(actor, "armour"), ...equippableGrimoires(actor)], {
    isEquipped: towIsEquipped,
    value: (item) => towValue(TOW.equip, item.uuid),
    detail: (item) => (isWeapon(item) ? item.system?.damage?.value : item.system?.resilience),
    details: (item) => item.type === "trapping"
      ? [tip(env, "Equipped", env.localize(towIsEquipped(item) ? "Yes" : "No"))]
      : [tip(env, isWeapon(item) ? "Damage" : "Resilience", isWeapon(item) ? item.system?.damage?.value : item.system?.resilience)],
    hint: hint(env, "Equip")
  });
}

/** Wierzchowiec: dosiadanie/zsiadanie i jego przedmioty (ataki wierzchowca), jak sekcja Mount na karcie. */
export function buildMount(actor, env) {
  const mount = actor?.system?.mount;
  const doc = mount?.document;
  if (!doc) return [];
  const mounted = !mount.dismounted;
  const out = [{
    name: doc.name,
    img: doc.prototypeToken?.texture?.src ?? doc.img,
    value: towValue(TOW.mount),
    detail: env.localize(mounted ? "WHB_TOW.Mounted" : "WHB_TOW.Dismounted"),
    cssClass: mounted ? "toggle active" : "toggle",
    tooltip: { hint: hint(env, "Mount") }
  }];
  // Wierzchowiec bez danych przedmiotów (np. zwykły aktor) – getter systemu rzuca wyjątek
  const mountItems = (() => {
    try {
      return [...(mount.items ?? [])];
    } catch {
      return [];
    }
  })();
  for (const item of mountItems) {
    out.push({
      name: item.name,
      img: item.img,
      value: towValue(TOW.mountItem, item.uuid),
      detail: String(item.system?.damage?.value ?? ""),
      cssClass: mounted ? "" : "unaffordable",
      tooltip: { details: [tip(env, "Damage", item.system?.damage?.value)], text: description(item), hint: hint(env, "MountItem") }
    });
  }
  return out;
}

/** Magia: rzucanie z tradycji, zaklęcia z Wartością Rzucania i postępem, pula Miscastów. */
export function buildMagic(actor, env) {
  const magic = actor?.system?.magic ?? {};
  const spells = items(actor, "spell");
  if (!(magic.level > 0) && !spells.length) return { lores: [], spells: [], miscasts: [] };
  const lores = Object.entries(magic.lores ?? {}).filter(([key, lore]) => key !== "none" && lore?.spells?.length);
  const castLore = lores.map(([key, lore]) => ({
    name: `${env.localize("WHB_TOW.Cast")}: ${lore.label}`,
    value: towValue(TOW.castLore, key),
    school: key,
    detail: lore.progress ? String(lore.progress) : "",
    tooltip: { details: [tip(env, "Progress", lore.progress || undefined)], hint: hint(env, "Cast") }
  }));
  const spellActions = spells.map((spell) => {
    const s = spell.system ?? {};
    const pick = (field, table) => [field?.custom, field?.value ? env.config?.[table]?.[field.value] ?? field.value : ""].filter(Boolean).join(" ");
    return {
      name: spell.name,
      img: spell.img,
      value: towValue(TOW.spell, spell.uuid, s.lore ?? ""),
      school: s.lore ?? "",
      detail: s.progress ? `${s.progress}/${s.cv}` : String(s.cv ?? ""),
      tooltip: {
        details: [
          tip(env, "CV", s.cv),
          tip(env, "Progress", s.progress ? `${s.progress} / ${s.cv}` : undefined),
          tip(env, "Lore", env.config?.magicLore?.[s.lore] ?? s.lore),
          tip(env, "Target", pick(s.target, "target")),
          tip(env, "Range", pick(s.range, "range")),
          tip(env, "Duration", pick(s.duration, "duration"))
        ],
        text: description(spell),
        hint: hint(env, "Cast")
      }
    };
  });
  const pool = `${magic.miscasts ?? 0}/${magic.level ?? 0}`;
  const miscasts = magic.miscasts > 0 ? [
    { name: env.localize("WHB_TOW.MiscastDispose"), value: towValue(TOW.miscastDispose), detail: pool, tooltip: { hint: hint(env, "MiscastDispose") } },
    { name: env.localize("WHB_TOW.MiscastRoll"), value: towValue(TOW.miscastRoll), detail: `${magic.miscasts}d10`, cssClass: magic.miscasts > magic.level ? "untreated" : "", tooltip: { hint: hint(env, "MiscastRoll") } }
  ] : [];
  return { lores: castLore, spells: spellActions, miscasts };
}

/** Błogosławieństwo: Łaska od 1. poziomu, modlitwy od 2., cud od 3. (raz, potem trzeba go odzyskać). */
export function buildBlessing(actor, env) {
  const blessed = actor?.system?.blessed ?? {};
  const doc = blessed.document;
  if (!doc || !(blessed.level > 0)) return [];
  const system = doc.system ?? {};
  const out = [{ name: env.localize("WHB_TOW.Favour"), value: towValue(TOW.blessing, "favour"), tooltip: { text: plain(system.favour?.description), hint: hint(env, "Blessing") } }];
  if (blessed.level > 1) {
    (system.prayers?.list ?? []).forEach((prayer, index) => out.push({
      name: prayer.name,
      value: towValue(TOW.blessing, "prayer", index),
      tooltip: { text: plain(prayer.description), hint: hint(env, "Blessing") }
    }));
  }
  if (blessed.level > 2) {
    const used = Boolean(system.miracles?.used);
    out.push({
      name: env.localize(used ? "WHB_TOW.RegainMiracle" : "WHB_TOW.Miracle"),
      value: towValue(TOW.blessing, used ? "regainMiracle" : "miracle"),
      cssClass: used ? "unaffordable" : "",
      tooltip: { text: plain(system.miracles?.description), hint: hint(env, used ? "RegainMiracle" : "Blessing") }
    });
  }
  return out;
}

/** Talenty, zdolności bez ataku i wiedze – „użyj” jak obrazek na karcie postaci. */
export function buildUsable(actor, env) {
  const use = (item) => ({
    name: item.name,
    img: item.img,
    value: towValue(TOW.use, item.uuid),
    tooltip: {
      details: [tip(env, "Test", item.system?.test?.skill ? env.config?.skills?.[item.system.test.skill] : undefined)],
      text: description(item),
      hint: hint(env, "Use")
    }
  });
  return {
    talents: items(actor, "talent").map(use),
    abilities: items(actor, "ability").filter((a) => !a.system?.isAttack).map(use),
    lores: items(actor, "lore").map(use)
  };
}

/** Los, stany i rany. */
export function buildStatus(actor, env) {
  const fate = actor?.system?.fate;
  const fateActions = fate ? [
    { name: env.localize("WHB_TOW.Fate"), value: towValue(TOW.fate), detail: `${fate.current ?? 0}/${fate.max ?? 0}`, tooltip: { hint: hint(env, "Counter") } },
    { name: env.localize("WHB_TOW.FateRefresh"), value: towValue(TOW.fateRefresh), cssClass: fate.current >= fate.max ? "unaffordable" : "", tooltip: { hint: hint(env, "FateRefresh") } }
  ] : [];
  const conditions = Object.entries(env.config?.conditions ?? {}).map(([key, condition]) => {
    const active = Boolean(actor?.hasCondition?.(key));
    return {
      name: env.localize(condition.name ?? key),
      img: condition.img,
      value: towValue(TOW.condition, key),
      cssClass: active ? "toggle active" : "toggle",
      tooltip: { text: plain(condition.description), hint: hint(env, "Condition") }
    };
  });
  const wounds = items(actor, "wound").map((wound) => ({
    name: wound.name,
    img: wound.img,
    value: towValue(TOW.wound, wound.uuid),
    cssClass: wound.system?.treated ? "" : "untreated",
    tooltip: {
      details: [
        tip(env, "Healing", env.config?.woundHealing?.[wound.system?.healing]),
        tip(env, "Treated", env.localize(wound.system?.treated ? "Yes" : "No"))
      ],
      text: description(wound),
      hint: hint(env, "Wound")
    }
  }));
  // Nowa rana jak przycisk „+” na karcie
  wounds.push({ name: env.localize("WHB_TOW.AddWound"), value: towValue(TOW.woundAdd), tooltip: { hint: hint(env, "WoundAdd") } });
  return { fate: fateActions, conditions, wounds };
}

/**
 * Przedsięwzięcia między przygodami: strony dziennika z flagą systemu. Te z samym testem umiejętności
 * HUD wykonuje od razu dla tej postaci; skrypty i wybór umiejętności zostają na stronie przedsięwzięcia.
 */
export function buildEndeavours(env) {
  return (env.endeavours ?? []).map((page) => {
    const data = page.flags?.whtow?.endeavour ?? {};
    const direct = Boolean(data.test?.skill) && !data.script && !data.chooseSkill;
    return {
      name: page.name,
      value: towValue(TOW.endeavour, page.uuid),
      detail: direct ? env.config?.skills?.[data.test.skill] ?? data.test.skill : "",
      tooltip: {
        details: [tip(env, "Test", direct ? env.config?.skills?.[data.test.skill] : undefined)],
        text: plain(page.text?.content),
        hint: hint(env, direct ? "EndeavourTest" : "EndeavourPage")
      }
    };
  });
}
