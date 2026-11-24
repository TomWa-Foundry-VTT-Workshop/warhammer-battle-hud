import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  customAdvantageChatHtml,
  macroTrusted,
  normalizeAdvantageActions,
  playersCanRun,
  registerAdvantageActions,
  spendAdvantage,
  useCustomAdvantage
} from "../scripts/actions/custom-advantage.mjs";
import { buildCustomAdvantageActions } from "../scripts/actions/builders.mjs";
import { decodeAction } from "../scripts/actions/encoding.mjs";
import { resolveIntent } from "../scripts/actions/intent.mjs";
import { buildPanel } from "../scripts/actions/wfrp4e.mjs";

const PATH = "system.status.advantage.value";
const KEYS = ["cost", "description", "id", "macro", "name"];

/** Identyfikator w formacie Foundry: 16 liter i cyfr. */
const fid = (prefix, n) => `${prefix}${String(n).padStart(16 - prefix.length, "0")}`;
const entry = (n, data = {}) => ({ id: fid("act", n), name: `Akcja ${n}`, cost: 1, description: "", macro: "", ...data });

describe("normalizacja własnych akcji za Przewagę", () => {
  it("wartość, która nie jest tablicą, daje pustą listę", () => {
    expect(normalizeAdvantageActions(undefined)).toEqual([]);
    expect(normalizeAdvantageActions({ 0: entry(1) })).toEqual([]);
  });

  it("najwyżej 20 pierwszych poprawnych wpisów, w kolejności wejścia", () => {
    const valid = Array.from({ length: 25 }, (_, i) => entry(i + 1));
    const raw = [{ id: fid("bad", 1), name: "   ", cost: 1 }, ...valid.slice(0, 3), null, ...valid.slice(3)];
    expect(normalizeAdvantageActions(raw).map((e) => e.id)).toEqual(valid.slice(0, 20).map((e) => e.id));
  });

  it("wpis budowany od nowa: dokładnie pięć kluczy, bez command i __proto__, brakujące teksty puste", () => {
    const hostile = JSON.parse(`{"id":"${fid("act", 1)}","name":"Łyk","cost":1,"command":"alert(1)","__proto__":{"polluted":true}}`);
    const [result] = normalizeAdvantageActions([hostile]);
    expect(Object.keys(result).sort()).toEqual(KEYS);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result.polluted).toBeUndefined();
    expect(result).toEqual({ id: fid("act", 1), name: "Łyk", cost: 1, description: "", macro: "" });
  });

  it("nazwa i opis bez skrajnych spacji, ucięte do 60 i 500 znaków", () => {
    const [long, trimmed] = normalizeAdvantageActions([
      entry(1, { name: "n".repeat(61), description: "d".repeat(501) }),
      entry(2, { name: "  Łyk mikstury  ", description: "  Wypijasz miksturę.  " })
    ]);
    expect(long.name).toBe("n".repeat(60));
    expect(long.description).toBe("d".repeat(500));
    expect(trimmed).toMatchObject({ name: "Łyk mikstury", description: "Wypijasz miksturę." });
  });

  it.each([
    [0, 0],
    [10, 10],
    [" 3 ", 3]
  ])("koszt %j daje liczbę %d", (cost, expected) => {
    const [result] = normalizeAdvantageActions([entry(1, { cost })]);
    expect(result.cost).toBe(expected);
  });

  it.each([
    ["bez pola name", { name: undefined }],
    ["nazwa z samych spacji", { name: "   " }],
    ["id z |", { id: "abc|defghijklmno" }],
    ["id za krótkie", { id: "abcdefghijklmno" }],
    ["bez id", { id: undefined }],
    ...[-1, 11, 2.5, "x", "", "  ", undefined, null].map((cost) => [`koszt ${JSON.stringify(cost)}`, { cost }])
  ])("odrzuca wpis zamiast go poprawiać: %s", (_, data) => {
    expect(normalizeAdvantageActions([entry(1, data)])).toEqual([]);
  });

  it("powtórzone id: zostaje pierwszy wpis", () => {
    const first = entry(1, { name: "Pierwsza" });
    const result = normalizeAdvantageActions([first, { ...first, name: "Druga" }]);
    expect(result).toEqual([first]);
  });

  it("pomija elementy, które nie są zwykłymi obiektami", () => {
    const disguised = Object.assign([], entry(2));
    const result = normalizeAdvantageActions([null, 5, "tekst", disguised, entry(1)]);
    expect(result.map((e) => e.id)).toEqual([fid("act", 1)]);
  });

  it.each([
    ["Compendium.a.b.Macro.abcdefghijklmnop", ""],
    ["Actor.abcdefghijklmnop", ""],
    ["abcdefghijklmnop", "abcdefghijklmnop"]
  ])("makro %j daje %j", (macro, expected) => {
    const [result] = normalizeAdvantageActions([entry(1, { macro })]);
    expect(result.macro).toBe(expected);
  });
});

describe("przyciski własnych akcji za Przewagę", () => {
  const actor = (advantage = { value: 1, max: 10 }) => ({ type: "character", system: { status: { advantage } }, itemTypes: {}, items: [], effects: [] });
  const custom = [
    entry(1, { name: "Łyk mikstury", cost: 1, description: "Wypijasz miksturę." }),
    entry(2, { name: "Dodatkowy krok", cost: 2 }),
    entry(3, { name: "Okrzyk", cost: 0 })
  ];
  const env = (edition = "4e", customAdvantageActions = custom) => ({
    config: { groupAdvantageActions: [{ cost: 1, name: "Grzmotnięcie" }] },
    localize: (k) => k,
    edition,
    settings: {},
    endeavours: [],
    gangOrders: () => [],
    conditionValue: () => 0,
    isGM: true,
    customAdvantageActions
  });
  const advantageGroup = (panel) => panel.find((tab) => tab.id === "advantage")?.groups.find((g) => g.label === "WFRP4E_HUD.Groups.AdvantageActions");

  it("przycisk z ustawienia: wartość customAdvantage|id, koszt w podpowiedzi, opis jako tekst", () => {
    const raw = [{ id: "zły|id", name: "Zła", cost: 1 }, custom[0]];
    expect(buildCustomAdvantageActions(actor(), env("4e", raw))).toEqual([{
      id: `customAdvantage-${fid("act", 1)}`,
      name: "Łyk mikstury",
      encodedValue: `customAdvantage|${fid("act", 1)}`,
      tooltip: "Wypijasz miksturę.",
      details: [{ label: "WFRP4E_HUD.Tip.Cost", value: 1 }],
      info1: { text: "⚡1" },
      cssClass: "advantage-cost"
    }]);
  });

  it("zasady 5e albo postać bez Przewagi: brak własnych akcji", () => {
    expect(buildCustomAdvantageActions(actor(), env("5e"))).toEqual([]);
    expect(buildCustomAdvantageActions({ type: "character", system: {} }, env())).toEqual([]);
  });

  it("w grupie Użycie Przewagi najpierw akcje systemu, potem własne w kolejności z ustawienia", () => {
    const group = advantageGroup(buildPanel(actor(), env()));
    expect(group.actions.map((a) => a.value)).toEqual([
      "advantageAction|0",
      `customAdvantage|${fid("act", 1)}`,
      `customAdvantage|${fid("act", 2)}`,
      `customAdvantage|${fid("act", 3)}`
    ]);
    const [, potion, step, shout] = group.actions;
    expect([potion.detail, step.detail, shout.detail]).toEqual(["⚡1", "⚡2", ""]);
    expect([potion.cssClass, step.cssClass, shout.cssClass]).toEqual(["advantage-cost", "advantage-cost unaffordable", "advantage-cost"]);
    for (const action of [potion, step, shout]) expect(action.tooltip).toContain("WFRP4E_HUD.Hint.AdvantageAction");
  });

  it("nazwa z HTML trafia do podpowiedzi escapowana", () => {
    const panel = buildPanel(actor(), env("4e", [entry(1, { name: "<img src=x onerror=alert(1)>" })]));
    const [, action] = advantageGroup(panel).actions;
    expect(action.tooltip).toContain("&lt;img");
    expect(action.tooltip).not.toContain("<img");
  });

  it("lewy klik używa akcji, prawy nic nie robi", () => {
    expect(resolveIntent("customAdvantage", {})).toEqual({ intent: "use" });
    expect(resolveIntent("customAdvantage", { right: true })).toEqual({ intent: "none" });
  });
});

describe("karta czatu własnej akcji", () => {
  it("nazwa i opis escapowane", () => {
    expect(customAdvantageChatHtml({ name: "<b>Łyk</b> & co", description: "<b>Mikstura</b> & woda" }))
      .toBe("<p><strong>&lt;b&gt;Łyk&lt;/b&gt; &amp; co</strong>: &lt;b&gt;Mikstura&lt;/b&gt; &amp; woda</p>");
  });

  it("bez opisu: sama nazwa, bez dwukropka", () => {
    expect(customAdvantageChatHtml({ name: "Okrzyk", description: "" })).toBe("<p><strong>Okrzyk</strong></p>");
  });
});

describe("zaufanie do makra", () => {
  const LEVELS = { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 };
  const gm = { id: "gm", isGM: true };
  const player = { id: "marta", isGM: false };
  const users = [gm, player];
  /** Atrapa makra: poziom uprawnień każdego użytkownika i lista tych, którzy mogą je uruchomić. */
  const macro = (levels, runners = []) => ({
    testUserPermission: (user, level) => (LEVELS[levels[user.id] ?? "NONE"] ?? 0) >= LEVELS[level],
    canUserExecute: (user) => runners.includes(user.id)
  });

  it.each([
    ["właściciel tylko MG", { gm: "OWNER" }, true],
    ["gracz z dostępem Obserwator", { gm: "OWNER", marta: "OBSERVER" }, true],
    ["gracz jako właściciel (np. autor)", { gm: "OWNER", marta: "OWNER" }, false]
  ])("macroTrusted: %s: %j → %j", (_, levels, expected) => {
    expect(macroTrusted(macro(levels), users)).toBe(expected);
  });

  it.each([
    ["gracz może uruchomić", ["gm", "marta"], true],
    ["tylko MG może uruchomić", ["gm"], false]
  ])("playersCanRun: %s: %j → %j", (_, runners, expected) => {
    expect(playersCanRun(macro({ gm: "OWNER" }, runners), users)).toBe(expected);
  });
});

describe("wydatek Przewagi", () => {
  const actor = (value, extra = {}) => ({ system: { status: { advantage: { value, max: 10 } } }, update: vi.fn(async () => {}), ...extra });

  it.each([
    ["koszt 0", { status: { advantage: { value: 0, max: 10 } } }, 0, true],
    ["za mało Przewagi", { status: { advantage: { value: 1, max: 10 } } }, 2, false],
    ["aktor bez Przewagi, bez wyjątku", {}, 1, false]
  ])("%s: wynik bez spend i update", async (_, system, cost, expected) => {
    const a = { system, spend: vi.fn(async () => true), update: vi.fn(async () => {}) };
    expect(await spendAdvantage(a, cost)).toBe(expected);
    expect(a.spend).not.toHaveBeenCalled();
    expect(a.update).not.toHaveBeenCalled();
  });

  it.each([
    [true, true],
    [false, false],
    [undefined, false]
  ])("przez actor.spend, wynik spend %j daje %j", async (spent, expected) => {
    const a = actor(3, { spend: vi.fn(async () => spent) });
    expect(await spendAdvantage(a, 2)).toBe(expected);
    expect(a.spend).toHaveBeenCalledWith(PATH, 2);
    expect(a.update).not.toHaveBeenCalled();
  });

  it("aktor bez spend: update z wartością pomniejszoną o koszt", async () => {
    const a = actor(3);
    expect(await spendAdvantage(a, 2)).toBe(true);
    expect(a.update).toHaveBeenCalledWith({ [PATH]: 1 });
  });
});

describe("kliknięcie własnej akcji za Przewagę", () => {
  const MACRO = "macro0000000heal";
  const OTHER = "macro000000other";
  let actorSeq = 0;

  /** Atrapa aktora z Przewagą; spend zachowuje się jak w systemie (za mało → false bez zmian). */
  function makeActor({ advantage = 1, owner = true, spendResult } = {}) {
    actorSeq += 1;
    const actor = {
      id: `marta${actorSeq}`,
      uuid: `Actor.marta${actorSeq}`,
      isOwner: owner,
      system: { status: { advantage: { value: advantage, max: 10 } } },
      update: vi.fn(async () => {})
    };
    actor.spend = vi.fn(async (path, cost) => {
      calls.push("spend");
      if (spendResult !== undefined) return spendResult;
      if (actor.system.status.advantage.value < cost) return false;
      actor.system.status.advantage.value -= cost;
      return true;
    });
    return actor;
  }

  let calls = [];
  const makeMacro = (data = {}) => ({ canExecute: true, execute: vi.fn(async () => { calls.push("execute"); }), ...data });
  const token = { id: "token" };
  const speaker = { alias: "Marta" };

  function makeDeps({ entries = [entry(1, { name: "Łyk mikstury", cost: 1, macro: MACRO })], macros = {}, trusted = true } = {}) {
    calls = [];
    return {
      entries: vi.fn(() => entries),
      getMacro: vi.fn((id) => macros[id]),
      trusted: vi.fn(() => trusted),
      warn: vi.fn(),
      postChat: vi.fn(async () => { calls.push("postChat"); }),
      context: vi.fn(() => ({ token, speaker }))
    };
  }

  const click = (id = fid("act", 1), extra = "") => decodeAction(`customAdvantage|${id}${extra ? `|${extra}` : ""}`);

  /** Nic nie zostało wydane, nie ma karty czatu i makro nie ruszyło. */
  function expectNothingDone(actor, deps, macros = {}) {
    expect(actor.spend).not.toHaveBeenCalled();
    expect(actor.update).not.toHaveBeenCalled();
    expect(deps.postChat).not.toHaveBeenCalled();
    for (const macro of Object.values(macros)) expect(macro.execute).not.toHaveBeenCalled();
  }

  it("wydatek, czat i makro w tej kolejności; makro dostaje aktora, token, mówcę i akcję", async () => {
    const macros = { [MACRO]: makeMacro() };
    const deps = makeDeps({ macros });
    const actor = makeActor({ advantage: 1 });
    expect(await useCustomAdvantage(actor, click(), deps)).toBe(true);
    expect(calls).toEqual(["spend", "postChat", "execute"]);
    expect(actor.spend).toHaveBeenCalledWith(PATH, 1);
    expect(deps.postChat).toHaveBeenCalledWith(actor, expect.objectContaining({ id: fid("act", 1), name: "Łyk mikstury", cost: 1 }));
    expect(deps.trusted).toHaveBeenCalledWith(macros[MACRO]);
    expect(deps.context).toHaveBeenCalledWith(actor);
    expect(macros[MACRO].execute).toHaveBeenCalledTimes(1);
    expect(macros[MACRO].execute).toHaveBeenCalledWith({ token, speaker, actor, advantageAction: { id: fid("act", 1), name: "Łyk mikstury", cost: 1 } });
    expect(deps.warn).not.toHaveBeenCalled();
  });

  it("akcja bez makra: wydatek i czat, bez szukania makra", async () => {
    const deps = makeDeps({ entries: [entry(1, { cost: 1 })] });
    const actor = makeActor({ advantage: 1 });
    expect(await useCustomAdvantage(actor, click(), deps)).toBe(true);
    expect(calls).toEqual(["spend", "postChat"]);
    expect(deps.getMacro).not.toHaveBeenCalled();
    expect(deps.warn).not.toHaveBeenCalled();
  });

  it("makro z ustawienia, nie z dodatku w wartości przycisku", async () => {
    const macros = { [MACRO]: makeMacro(), [OTHER]: makeMacro() };
    const deps = makeDeps({ macros });
    expect(await useCustomAdvantage(makeActor(), click(fid("act", 1), OTHER), deps)).toBe(true);
    expect(deps.getMacro).toHaveBeenCalledWith(MACRO);
    expect(deps.getMacro).not.toHaveBeenCalledWith(OTHER);
    expect(macros[MACRO].execute).toHaveBeenCalledTimes(1);
    expect(macros[OTHER].execute).not.toHaveBeenCalled();
  });

  it.each([
    ["cudza postać", { actor: { owner: false } }, "NotOwner"],
    ["id spoza ustawienia", { id: fid("act", 9) }, "CustomMissing"],
    ["ujemny koszt w ustawieniu nie dodaje Przewagi", { entries: [entry(1, { cost: -3 })] }, "CustomMissing"],
    ["makra już nie ma", { macros: {} }, "MacroMissing"],
    ["makro, które może edytować gracz", { trusted: false }, "MacroUntrusted"],
    ["gracz bez dostępu do makra", { macros: { [MACRO]: makeMacro({ canExecute: false }) } }, "MacroNoAccess"]
  ])("%s: ostrzeżenie i nic nie wydane", async (_, { actor: actorData, id, ...depsData }, key) => {
    const macros = depsData.macros ?? { [MACRO]: makeMacro() };
    const deps = makeDeps({ ...depsData, macros });
    const actor = makeActor({ advantage: 1, ...actorData });
    expect(await useCustomAdvantage(actor, click(id), deps)).toBe(false);
    expect(deps.warn).toHaveBeenCalledWith(key);
    expectNothingDone(actor, deps, macros);
    expect(actor.system.status.advantage.value).toBe(1);
  });

  it.each([
    ["koszt 2 przy Przewadze 1", { advantage: 1 }, 2, { cost: 2, current: 1 }],
    ["spend odmawia", { advantage: 3, spendResult: false }, 2, { cost: 2, current: 3 }]
  ])("za mało Przewagi (%s): NotEnoughAdvantage, bez czatu i makra", async (_, actorData, cost, data) => {
    const macros = { [MACRO]: makeMacro() };
    const deps = makeDeps({ macros, entries: [entry(1, { cost, macro: MACRO })] });
    const actor = makeActor(actorData);
    expect(await useCustomAdvantage(actor, click(), deps)).toBe(false);
    expect(deps.warn).toHaveBeenCalledWith("NotEnoughAdvantage", data);
    expect(deps.postChat).not.toHaveBeenCalled();
    expect(macros[MACRO].execute).not.toHaveBeenCalled();
  });

  it.each([
    ["odrzucona obietnica", () => Promise.reject(new Error("błąd makra"))],
    ["błąd synchroniczny", () => { throw new Error("błąd makra"); }]
  ])("błąd makra (%s) wychodzi na zewnątrz, Przewaga nie wraca, kolejne kliknięcie działa", async (_, failure) => {
    const macro = makeMacro();
    macro.execute.mockImplementationOnce(failure);
    const macros = { [MACRO]: macro };
    const deps = makeDeps({ macros });
    const actor = makeActor({ advantage: 2 });
    await expect(useCustomAdvantage(actor, click(), deps)).rejects.toThrow("błąd makra");
    expect(actor.spend).toHaveBeenCalledTimes(1);
    expect(actor.update).not.toHaveBeenCalled();
    expect(actor.system.status.advantage.value).toBe(1);

    expect(await useCustomAdvantage(actor, click(), deps)).toBe(true);
    expect(actor.spend).toHaveBeenCalledTimes(2);
  });

  it("dwa równoczesne kliknięcia tej samej postaci: jeden wydatek i jedno makro", async () => {
    const macros = { [MACRO]: makeMacro() };
    const deps = makeDeps({ macros });
    const actor = makeActor({ advantage: 3 });
    let release;
    const pending = new Promise((resolve) => { release = resolve; });
    actor.spend.mockImplementationOnce(async () => { await pending; return true; });

    const first = useCustomAdvantage(actor, click(), deps);
    const second = useCustomAdvantage(actor, click(), deps);
    release();
    expect(await Promise.all([first, second])).toEqual([true, false]);
    expect(actor.spend).toHaveBeenCalledTimes(1);
    expect(macros[MACRO].execute).toHaveBeenCalledTimes(1);
    expect(deps.warn).not.toHaveBeenCalled();

    expect(await useCustomAdvantage(actor, click(), deps)).toBe(true);
    expect(actor.spend).toHaveBeenCalledTimes(2);
  });

  it("blokada dotyczy jednej postaci: równoczesne kliknięcie innej postaci przechodzi", async () => {
    const deps = makeDeps({ macros: { [MACRO]: makeMacro() } });
    const marta = makeActor({ advantage: 1 });
    const hans = makeActor({ advantage: 1 });
    expect(await Promise.all([useCustomAdvantage(marta, click(), deps), useCustomAdvantage(hans, click(), deps)])).toEqual([true, true]);
    expect(marta.spend).toHaveBeenCalledTimes(1);
    expect(hans.spend).toHaveBeenCalledTimes(1);
  });
});

describe("rejestracja ustawienia i okna", () => {
  class CustomizeMenu {}
  const settings = () => ({ register: vi.fn(), registerMenu: vi.fn() });

  it("WFRP4e: ustawienie świata poza listą i menu tylko dla MG", () => {
    const s = settings();
    const onChange = vi.fn();
    expect(registerAdvantageActions(s, { systemId: "wfrp4e", menuType: CustomizeMenu, onChange })).toBe(true);
    expect(s.register).toHaveBeenCalledWith("warhammer-battle-hud", "advantageActions", { scope: "world", config: false, type: Array, default: [], onChange });
    expect(s.registerMenu).toHaveBeenCalledWith("warhammer-battle-hud", "customize", {
      name: "WFRP4E_HUD.Customize.MenuName",
      label: "WFRP4E_HUD.Customize.MenuLabel",
      hint: "WFRP4E_HUD.Customize.MenuHint",
      icon: "fa-solid fa-sliders",
      type: CustomizeMenu,
      restricted: true
    });
  });

  it("inny system: nic nie rejestruje", () => {
    const s = settings();
    expect(registerAdvantageActions(s, { systemId: "whtow", menuType: CustomizeMenu, onChange: vi.fn() })).toBe(false);
    expect(s.register).not.toHaveBeenCalled();
    expect(s.registerMenu).not.toHaveBeenCalled();
  });
});

describe("tłumaczenia własnych akcji", () => {
  /** Klucze pod WFRP4E_HUD użyte w kodzie i szablonie: pełne nazwy w cudzysłowie, ostrzeżenia kliknięcia i teksty okna. */
  const sources = [
    ["scripts/actions/custom-advantage.mjs", [[/"WFRP4E_HUD\.([\w.]+)"/g, ""], [/refuse\("(\w+)"/g, "Notify."]]],
    ["scripts/customize/customize-hud.mjs", [[/"WFRP4E_HUD\.([\w.]+)"/g, ""], [/\bt\("([\w.]+)"/g, ""]]],
    ["templates/customize-hud.hbs", [[/"WFRP4E_HUD\.([\w.]+)"/g, ""]]]
  ];
  const keysBySource = sources.map(([file, patterns]) => {
    const text = readFileSync(file, "utf8");
    return patterns.flatMap(([pattern, prefix]) => [...text.matchAll(pattern)].map((m) => prefix + m[1]));
  });

  it("każdy klucz z kodu i szablonu okna ma niepusty tekst w en i pl", () => {
    expect(keysBySource.map((keys) => keys.length > 0)).toEqual(sources.map(() => true));
    for (const lang of ["en", "pl"]) {
      const catalog = JSON.parse(readFileSync(`lang/${lang}.json`, "utf8")).WFRP4E_HUD;
      const missing = keysBySource.flat().filter((key) => {
        const value = key.split(".").reduce((node, part) => node?.[part], catalog);
        return typeof value !== "string" || !value.trim();
      });
      expect(missing, lang).toEqual([]);
    }
  });
});
