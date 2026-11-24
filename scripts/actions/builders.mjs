/**
 * Budowanie list akcji HUD z danych aktora – bez zależności od Foundry.
 *
 * Każda funkcja dostaje aktora (dokument WFRP albo atrapę w testach) i środowisko `env`:
 *   { config, localize(key), edition: "4e"|"5e", settings: { onlyEquipped, showUnrollableTraits },
 *     conditionValue(actor, key) }
 * i zwraca listę danych akcji w formacie TAH Core: { id, name, encodedValue, img?, info1?, cssClass?, tooltip? }.
 */
import { ACTION_TYPES as T, encodeAction } from "./encoding.mjs";
import { equippableGrimoires } from "../grimoire-equipment.mjs";
import { currentAdvantage, normalizeAdvantageActions } from "./custom-advantage.mjs";

/** Grupy HUD (id grup TAH) – układ w scripts/defaults.mjs. */
export const GROUP_IDS = Object.freeze({
  characteristics: "characteristics",
  weaponsMelee: "weapons-melee",
  weaponsRanged: "weapons-ranged",
  armour: "armour",
  traits: "traits",
  petty: "spells-petty",
  spells: "spells",
  channelling: "channelling",
  blessings: "blessings",
  miracles: "miracles",
  talents: "talents",
  extended: "extended-tests",
  effects: "effects",
  conditions: "conditions",
  advantage: "advantage",
  advantageActions: "advantage-actions",
  equipment: "equipment",
  gangOrders: "gang-orders",
  gangOrdersCombat: "gang-orders-combat",
  downtime: "downtime",
  channelledReset: "channelled-reset"
});

const MAX_TOOLTIP = 500;

/** Bez HTML i skrócone – do podpowiedzi. */
export const plain = (html) => {
  const text = String(html ?? "")
    .replace(/<\/?(strong|em|b|i|span|a)\b[^>]*>/g, "")
    .replace(/<[^>]*>/g, " ")
    // Wzbogacenia Foundry: @UUID[...]{etykieta} → etykieta, @Condition[prone] → prone, [[/r 1d10]] → 1d10
    .replace(/@\w+\[[^\]]*\]\{([^}]*)\}/g, "$1")
    .replace(/@\w+\[([^\]]*)\]/g, "$1")
    .replace(/\[\[\/\w+\s+([^\]]*)\]\]/g, "$1")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > MAX_TOOLTIP ? `${text.slice(0, MAX_TOOLTIP - 1)}…` : text;
};

/** Wiersz statystyk podpowiedzi; puste wartości pomija tooltip.mjs. */
const tip = (env, key, value) => ({ label: (env.localize ?? String)(`WFRP4E_HUD.Tip.${key}`), value });

/** Nazwy zalet albo wad przedmiotu (system podaje je już przetłumaczone). */
const properties = (item, kind) => Object.values(item?.system?.properties?.[kind] ?? {}).map((p) => p?.display ?? p?.name).filter(Boolean).join(", ");

/** Etykieta z konfiguracji systemu (np. grupa broni, cecha), przetłumaczona. */
const configLabel = (env, table, key) => {
  const label = key ? env.config?.[table]?.[key] : undefined;
  return label ? env.localize(label) : undefined;
};

/** Środowisko zastępcze dla wywołań bez `env` (testy, starsze wywołania). */
const NO_ENV = { localize: (key) => key };

const items = (actor, type) => actor?.itemTypes?.[type] ?? [];
const byName = (a, b) => String(a.name).localeCompare(String(b.name));

/** Skrócony opis przedmiotu do podpowiedzi (bez HTML). */
export function plainDescription(item) {
  const text = plain(item?.system?.description?.value);
  // Opis będący tylko odnośnikiem do podręcznika („Atletyka”, „Broń Biała” przy specjalizacji) nic nie mówi
  return text && String(item?.name ?? "").startsWith(text) ? "" : text;
}

/** Wspólne pola akcji opartej na przedmiocie. */
function itemAction(item, type, extra = {}) {
  return {
    id: `${type}-${item.id}`,
    name: item.name,
    img: item.img,
    encodedValue: encodeAction(type, item.id),
    ...extra
  };
}

/** Wspólna reguła wszystkich systemów: postacie graczy pokazują tylko założony sprzęt (gdy włączone); NPC i stwory – wszystko. */
function showGear(actor, item, env) {
  if (!env.settings?.onlyEquipped || actor.type !== "character") return true;
  return item.system?.isEquipped !== false;
}

export function buildCharacteristics(actor, env) {
  const characteristics = actor?.system?.characteristics ?? {};
  return Object.entries(env.config?.characteristics ?? {})
    .filter(([key]) => characteristics[key])
    .map(([key, label]) => ({
      id: `${T.characteristic}-${key}`,
      name: env.localize(label),
      encodedValue: encodeAction(T.characteristic, key),
      info1: { text: String(characteristics[key].value ?? "") },
      details: [
        tip(env, "Initial", characteristics[key].initial),
        tip(env, "Advances", characteristics[key].advances || undefined),
        tip(env, "Modifier", characteristics[key].modifier || undefined),
        tip(env, "Total", characteristics[key].value)
      ]
    }));
}

/**
 * Umiejętności w kolumnach według cech (jak w pozostałych systemach), z wartością cechy w nagłówku.
 * Cechy bez umiejętności postaci nie mają kolumny.
 */
export function buildSkillGroups(actor, env = NO_ENV) {
  const characteristics = actor?.system?.characteristics ?? {};
  const skills = [...items(actor, "skill")].sort(byName);
  return Object.entries(env.config?.characteristics ?? {})
    .map(([key, label]) => {
      const value = characteristics[key]?.value;
      const name = env.localize(label);
      return {
        label: value === undefined ? name : `${name} (${value})`,
        actions: skills
          .filter((skill) => skill.system?.characteristic?.value === key)
          .map((skill) => itemAction(skill, T.skill, {
            info1: { text: String(skill.system?.total?.value ?? "") },
            tooltip: plainDescription(skill) || undefined,
            details: [
              tip(env, "Characteristic", value === undefined ? name : `${name} (${value})`),
              tip(env, "Advances", skill.system?.advances?.value || undefined),
              tip(env, "Total", skill.system?.total?.value)
            ]
          }))
      };
    })
    .filter((group) => group.actions.length);
}

/** Ekwipunek: każda broń i pancerz – klik zakłada albo odkłada (system pilnuje limitu rąk). */
export function buildEquipment(actor, env = NO_ENV) {
  return [...items(actor, "weapon"), ...items(actor, "armour"), ...equippableGrimoires(actor)].sort(byName).map((item) => {
    const equipped = Boolean(item.system?.isEquipped);
    const isWeapon = item.type === "weapon";
    return {
      id: `${T.equip}-${item.id}`,
      name: item.name,
      img: item.img,
      encodedValue: encodeAction(T.equip, item.id),
      info1: { text: String((isWeapon ? item.system?.Damage ?? item.system?.damage?.value : undefined) ?? "") },
      cssClass: equipped ? "toggle active" : "toggle",
      details: [tip(env, isWeapon ? "Damage" : "Equipped", isWeapon ? item.system?.Damage ?? item.system?.damage?.value : env.localize(equipped ? "Yes" : "No"))]
    };
  });
}

/** Umiejętności podstawowe i zaawansowane osobno (system: advanced.value = "bsc" | "adv"). */
export function buildSkills(actor, env = NO_ENV) {
  const basic = [];
  const advanced = [];
  for (const skill of [...items(actor, "skill")].sort(byName)) {
    const action = itemAction(skill, T.skill, {
      info1: { text: String(skill.system?.total?.value ?? "") },
      tooltip: plainDescription(skill) || undefined,
      details: [
        tip(env, "Characteristic", configLabel(env, "characteristics", skill.system?.characteristic?.value)),
        tip(env, "Advances", skill.system?.advances?.value || undefined),
        tip(env, "Total", skill.system?.total?.value)
      ]
    });
    (skill.system?.advanced?.value === "adv" ? advanced : basic).push(action);
  }
  return { basic, advanced };
}

export function buildWeapons(actor, env) {
  const melee = [];
  const ranged = [];
  const weapons = [...items(actor, "weapon")].sort(byName);
  // Bez założonej broni grupy są puste – broń zakłada się w grupie Ekwipunek (jak w pozostałych systemach)
  for (const weapon of weapons) {
    if (!showGear(actor, weapon, env)) continue;
    const system = weapon.system ?? {};
    const damaged = system.damageToItem?.value > 0;
    const action = itemAction(weapon, T.weapon, {
      tooltip: plainDescription(weapon) || undefined,
      details: [
        tip(env, "Damage", system.Damage ?? system.damage?.value),
        tip(env, "Group", configLabel(env, "weaponGroups", system.weaponGroup?.value)),
        system.isRanged
          ? tip(env, "Range", system.Range || system.range?.value)
          : tip(env, "Reach", configLabel(env, "weaponReaches", system.reach?.value)),
        tip(env, "Skill", system.skillToUse ? `${system.skillToUse.name} (${system.skillToUse.system?.total?.value ?? "?"})` : undefined),
        tip(env, "Qualities", properties(weapon, "qualities")),
        tip(env, "Flaws", properties(weapon, "flaws")),
        tip(env, "ItemDamage", damaged ? system.damageToItem.value : undefined)
      ],
      cssClass: damaged ? "wfrp4e-action-hud-damaged" : undefined,
      info2: damaged ? { text: `-${system.damageToItem.value}`, title: env.localize("WFRP4E_HUD.Info.Damage") } : undefined
    });
    if (system.isRanged) {
      const ammo = system.ammo;
      if (ammo) action.info1 = { text: String(ammo.system?.quantity?.value ?? ""), title: ammo.name };
      ranged.push(action);
    } else {
      melee.push(action);
    }
  }
  return { melee, ranged };
}

export function buildArmour(actor, env) {
  return [...items(actor, "armour")]
    .filter((armour) => showGear(actor, armour, env))
    .sort(byName)
    .map((armour) => {
      const damage = Object.values(armour.system?.APdamage ?? {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
      const ap = Object.entries(armour.system?.AP ?? {})
        .filter(([, value]) => Number(value) > 0)
        .map(([location, value]) => `${configLabel(env, "locations", location) ?? location} ${value}`)
        .join(", ");
      return itemAction(armour, T.armour, {
        tooltip: plainDescription(armour) || undefined,
        details: [
          tip(env, "AP", ap),
          tip(env, "Qualities", properties(armour, "qualities")),
          tip(env, "Flaws", properties(armour, "flaws")),
          tip(env, "ItemDamage", damage > 0 ? damage : undefined)
        ],
        cssClass: damage > 0 ? "wfrp4e-action-hud-damaged" : undefined,
        info1: damage > 0 ? { text: `-${damage}`, title: env.localize("WFRP4E_HUD.Info.Damage") } : undefined
      });
    });
}

/** Cechy z testem (rollable). Pozostałe tylko gdy włączone w ustawieniach. */
export function buildTraits(actor, env) {
  return [...items(actor, "trait")]
    .filter((trait) => trait.system?.rollable?.value || env.settings?.showUnrollableTraits)
    .sort(byName)
    .map((trait) => itemAction(trait, trait.system?.rollable?.value ? T.trait : T.talent, {
      // Pełna nazwa ze specjalizacją („Afraid (Elves)”, „Fear (3)”), jak składa ją system
      name: trait.system?.DisplayName || trait.name,
      tooltip: plainDescription(trait) || undefined
    }));
}

/** Zasięg, cel i czas trwania czaru albo modlitwy (system trzyma je jako tekst, czasem z formułą). */
function castingDetails(item, env, cn) {
  const system = item.system ?? {};
  return [
    tip(env, "CN", cn || undefined),
    tip(env, "Range", system.range?.value),
    tip(env, "Target", system.target?.value),
    tip(env, "Duration", system.duration?.value)
  ];
}

/** Czary: Magia Prosta osobno; reszta z nazwą tradycji. Splatanie osobno: w 4e według czaru, w 5e według Wiatru. */
export function buildSpells(actor, env) {
  const petty = [];
  const spells = [];
  const channelling = [];
  for (const spell of [...items(actor, "spell")].sort(byName)) {
    const lores = [spell.system?.lore?.value].flat().filter(Boolean);
    const cn = spell.system?.cn?.value;
    const tooltip = plainDescription(spell) || undefined;
    const isPetty = lores.includes("petty");
    // 4e: Poziomy Sukcesu splatania zbierają się w zaklęciu (cn.SL) aż do rzucenia albo porażki
    const channelled = env.edition !== "5e" ? Number(spell.system?.cn?.SL) || 0 : 0;
    const info1 = channelled > 0
      ? { text: `${channelled}/${cn}`, title: env.localize("WFRP4E_HUD.Tip.Channelled") }
      : cn ? { text: String(cn), title: env.localize("WFRP4E_HUD.Info.CN") } : undefined;
    const details = [...castingDetails(spell, env, cn), tip(env, "Channelled", channelled > 0 ? `${channelled} / ${cn}` : undefined)];
    const cssClass = channelled > 0 ? "channelled" : undefined;
    (isPetty ? petty : spells).push(itemAction(spell, T.spell, { info1, tooltip, details, cssClass }));
    if (!isPetty && cn && env.edition !== "5e") {
      channelling.push({
        ...itemAction(spell, T.channel, { info1, tooltip, details, cssClass }),
        id: `${T.channel}-${spell.id}`
      });
    }
  }
  if (env.edition === "5e") {
    const status = actor.system?.status?.channelling;
    for (const [wind, data] of Object.entries(status?.winds ?? {})) {
      channelling.push({
        id: `${T.channelWind}-${wind}`,
        name: env.localize(data.label),
        img: data.img,
        encodedValue: encodeAction(T.channelWind, wind),
        // 5e: zebrana moc należy do postaci i do jednego Wiatru naraz
        info1: status.wind === wind && status.value > 0 ? { text: String(status.value), title: env.localize("WFRP4E_HUD.Tip.Channelled") } : undefined,
        cssClass: status.wind === wind && status.value > 0 ? "channelled" : undefined,
        details: [tip(env, "Channelled", status.wind === wind && status.value > 0 ? status.value : undefined)]
      });
    }
  }
  return { petty, spells, channelling };
}

export function buildPrayers(actor, env = NO_ENV) {
  const blessings = [];
  const miracles = [];
  for (const prayer of [...items(actor, "prayer")].sort(byName)) {
    const action = itemAction(prayer, T.prayer, { tooltip: plainDescription(prayer) || undefined, details: castingDetails(prayer, env) });
    (prayer.system?.type?.value === "miracle" ? miracles : blessings).push(action);
  }
  return { blessings, miracles };
}

/** Talenty: jeden wpis na nazwę, z liczbą wykupień. */
export function buildTalents(actor, env = NO_ENV) {
  const byTalentName = new Map();
  for (const talent of items(actor, "talent")) {
    const entry = byTalentName.get(talent.name);
    if (entry) entry.count += 1;
    else byTalentName.set(talent.name, { talent, count: 1 });
  }
  return [...byTalentName.values()]
    .sort((a, b) => byName(a.talent, b.talent))
    .map(({ talent, count }) => itemAction(talent, T.talent, {
      info1: count > 1 ? { text: `×${count}` } : undefined,
      tooltip: plainDescription(talent) || undefined,
      details: [tip(env, "Taken", count > 1 ? count : undefined), tip(env, "Tests", talent.system?.tests?.value)]
    }));
}

export function buildExtendedTests(actor, env = NO_ENV) {
  return [...items(actor, "extendedTest")].sort(byName).map((test) => {
    const sl = test.system?.SL ?? {};
    return itemAction(test, T.extended, {
      info1: { text: `${sl.current ?? 0}/${sl.target ?? 0}` },
      tooltip: plainDescription(test) || undefined,
      details: [tip(env, "Test", test.system?.test?.value), tip(env, "SL", `${sl.current ?? 0} / ${sl.target ?? 0}`)]
    });
  });
}

/**
 * Ręczne skrypty efektów (trigger "manual") z efektów aktora i jego przedmiotów.
 * @param {Array<{uuid: string, name: string, img?: string, manualScripts?: Array}>} effects
 */
export function buildManualEffects(effects) {
  const seen = new Set();
  const actions = [];
  for (const effect of effects ?? []) {
    if (!effect?.uuid || seen.has(effect.uuid)) continue;
    seen.add(effect.uuid);
    for (const script of effect.manualScripts ?? []) {
      const label = script.Label ?? script.label ?? effect.name;
      actions.push({
        id: `${T.effect}-${effect.uuid}-${script.index}`,
        name: label === effect.name ? effect.name : `${effect.name}: ${label}`,
        img: effect.img,
        encodedValue: encodeAction(T.effect, effect.uuid, script.index)
      });
    }
  }
  return actions.sort(byName);
}

/** Nazwa stanu; system nie ma tłumaczenia dla każdego z nich, a surowego klucza nie pokazujemy. */
function conditionName(key, label, status, env) {
  for (const source of [label, status?.name]) {
    const text = source ? env.localize(source) : source;
    if (text && text !== source) return text;
  }
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** Stany z konfiguracji systemu; aktywne podświetlone, numerowane z wartością. */
/**
 * Mapa nazw stanów w konfiguracji systemu (`conditions`) nazywa stan „dead” kluczem „defeated” i nie zna stanów,
 * które mają tylko efekt (np. Besmirched w 5e). Przycisk musi używać identyfikatora efektu, bo
 * `addCondition("defeated")` nie znajduje efektu i kończy się błędem.
 */
export const CONDITION_EFFECT_ID = Object.freeze({ defeated: "dead" });

/**
 * Stany do przycisków: prawdziwe efekty statusu systemu (stąd Besmirched w 5e i Dead), w kolejności mapy nazw,
 * a te, których mapa nie zna, na końcu. Bez listy efektów (np. w testach) zostaje mapa nazw.
 */
export function buildConditions(actor, env) {
  const effects = env.config?.statusEffects ?? [];
  const names = env.config?.conditions ?? {};
  const mapped = Object.keys(names).map((nameKey) => ({ nameKey, key: CONDITION_EFFECT_ID[nameKey] ?? nameKey }));
  const known = new Set(mapped.map((c) => c.key));
  const extra = effects.filter((e) => e.id && !known.has(e.id)).map((e) => ({ nameKey: e.id, key: e.id }));
  const effectIds = new Set(effects.map((e) => e.id));
  const list = [...mapped, ...extra].filter((c) => !effects.length || effectIds.has(c.key));
  const numbered = new Set(effects.filter((s) => s.system?.condition?.numbered).map((s) => s.id));
  return list.map(({ nameKey, key }) => {
    const value = env.conditionValue(actor, key);
    const status = effects.find((s) => s.id === key);
    // „Dead” ma w mapie nazwę „Defeated”; przycisk nosi nazwę efektu z systemu
    const label = nameKey === key ? names[nameKey] : undefined;
    const descriptions = env.config?.conditionDescriptions ?? {};
    // Opis bez tłumaczenia (np. Besmirched w 5e, którego system nie opisuje) nie może pokazywać surowego klucza
    const descriptionKey = descriptions[key] ?? descriptions[nameKey] ?? status?.description ?? "";
    const description = descriptionKey ? env.localize(descriptionKey) : "";
    return {
      id: `${T.condition}-${key}`,
      name: conditionName(key, label, status, env),
      img: status?.img,
      encodedValue: encodeAction(T.condition, key),
      cssClass: value ? "toggle active" : "toggle",
      info1: value && numbered.has(key) ? { text: String(value) } : undefined,
      tooltip: description && description !== descriptionKey ? plain(description) || undefined : undefined
    };
  });
}

export function buildAdvantage(actor, env) {
  const advantage = actor?.system?.status?.advantage;
  if (!advantage || env.edition === "5e" || env.isGM === false) return [];
  return [{
    id: `${T.advantage}`,
    name: env.localize("WFRP4E_HUD.Advantage"),
    encodedValue: encodeAction(T.advantage),
    info1: { text: `${advantage.value ?? 0}${advantage.max ? `/${advantage.max}` : ""}` }
  }];
}

/** Koszt w Przewadze: podpis przy akcji i klasa przygaszenia, gdy postaci na nią nie stać. */
function costView(cost, current) {
  return {
    info1: cost > 0 ? { text: `⚡${cost}` } : undefined,
    cssClass: cost > current ? "advantage-cost unaffordable" : "advantage-cost"
  };
}

/** Użycia Przewagi z konfiguracji systemu (np. Grzmotnięcie, Sztuczka z Up in Arms), z kosztem. */
export function buildAdvantageActions(actor, env) {
  if (!actor?.system?.status?.advantage || env.edition === "5e") return [];
  const current = currentAdvantage(actor);
  return (env.config?.groupAdvantageActions ?? []).map((action, index) => {
    const cost = Number(action.cost) || 0;
    return {
      id: `${T.advantageAction}-${index}`,
      name: action.name,
      encodedValue: encodeAction(T.advantageAction, index),
      tooltip: [plain(action.description), plain(action.effect)].filter(Boolean).join(" — "),
      details: [tip(env, "Cost", cost || undefined)],
      ...costView(cost, current)
    };
  });
}

/** Własne akcje za Przewagę z ustawienia modułu (`env.customAdvantageActions`), z kosztem. */
export function buildCustomAdvantageActions(actor, env) {
  if (!actor?.system?.status?.advantage || env.edition === "5e") return [];
  const current = currentAdvantage(actor);
  return normalizeAdvantageActions(env.customAdvantageActions).map(({ id, name, cost, description }) => ({
    id: `${T.customAdvantage}-${id}`,
    name,
    encodedValue: encodeAction(T.customAdvantage, id),
    tooltip: description,
    details: [tip(env, "Cost", cost || undefined)],
    ...costView(cost, current)
  }));
}

/** Rozkazy taktyczne szajki z modułu Underworld (gdy jest aktywny), z kosztem w Przewadze i wykonawcą. */
export function buildGangOrders(actor, env) {
  const orders = env.gangOrders?.(actor) ?? [];
  const current = currentAdvantage(actor);
  return orders.map((order) => ({
    id: `${T.gangOrder}-${order.id}`,
    name: order.name,
    encodedValue: encodeAction(T.gangOrder, order.id),
    tooltip: [plain(order.description), plain(order.effect)].filter(Boolean).join(" — "),
    details: [tip(env, "Cost", Number(order.cost) || undefined), tip(env, "Executor", order.executor)],
    ...costView(Number(order.cost) || 0, current)
  }));
}

/**
 * Zebrane splatanie: zaklęcia z Poziomami Sukcesu (4e) albo Wiatr z mocą (5e), do wyczyszczenia,
 * gdy mag przestaje się skupiać (np. zostaje rozproszony).
 */
export function buildChannelledReset(actor, env) {
  const spells = items(actor, "spell").filter((s) => Number(s.system?.cn?.SL) > 0);
  const status = actor?.system?.status?.channelling;
  const total = env.edition === "5e" ? Number(status?.value) || 0 : spells.reduce((sum, s) => sum + Number(s.system.cn.SL), 0);
  if (!(total > 0)) return [];
  return [{
    id: `${T.channelReset}`,
    name: env.localize("WFRP4E_HUD.ChannelledReset"),
    encodedValue: encodeAction(T.channelReset),
    info1: { text: String(total) },
    cssClass: "channelled",
    tooltip: env.edition === "5e" ? "" : spells.map((s) => `${s.name}: ${s.system.cn.SL}/${s.system.cn.value}`).join(" · ")
  }];
}

/** Między przygodami: dochód z bieżącej kariery, odpoczynek i przedsięwzięcia (strony dziennika). */
export function buildDowntime(actor, env) {
  if (!["character", "npc"].includes(actor?.type)) return [];
  const out = [];
  const career = items(actor, "career").find((c) => c.system?.current?.value);
  const path = items(actor, "careerPath")[0];
  const status = actor.system?.details?.status;
  if (career || path) {
    out.push({
      id: T.income,
      name: env.localize("WFRP4E_HUD.Income"),
      encodedValue: encodeAction(T.income),
      info1: status?.value ? { text: String(status.value) } : undefined,
      details: [tip(env, "Career", (career ?? path).name), tip(env, "Status", status?.value)]
    });
    // Sprawdzenie zmiany profesji: wynik tylko dla gracza na czacie
    out.push({
      id: T.careerCheck,
      name: env.localize("WFRP4E_HUD.CareerCheck"),
      encodedValue: encodeAction(T.careerCheck),
      details: [tip(env, "Career", career?.name ?? actor.system?.career?.current?.name ?? path.name)],
      tooltip: env.localize("WFRP4E_HUD.CareerCheckText")
    });
  }
  out.push({
    id: T.rest,
    name: env.localize("WFRP4E_HUD.Rest"),
    encodedValue: encodeAction(T.rest),
    details: [tip(env, "Test", env.localize(actor.itemTypes?.skill?.some((s) => s.name === env.localize("NAME.Endurance")) ? "NAME.Endurance" : "CHAR.T"))]
  });
  for (const page of env.endeavours ?? []) {
    out.push({
      id: `${T.endeavour}-${page.uuid}`,
      name: page.name,
      encodedValue: encodeAction(T.endeavour, page.uuid),
      tooltip: plain(page.text?.content) || undefined
    });
  }
  return out;
}
