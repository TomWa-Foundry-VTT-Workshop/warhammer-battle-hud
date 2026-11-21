/**
 * Czy postać może zmienić profesję albo wejść na wyższy poziom – czysta logika, bez zależności od Foundry.
 *
 * 4e: poziom kariery jest ukończony, gdy cechy kariery mają co najmniej 5 × poziom rozwinięć,
 *     8 umiejętności kariery (albo wszystkie, gdy jest ich mniej) ma tyle samo, a postać zna
 *     co najmniej 1 talent kariery. Umiejętności i talenty dopasowujemy po nazwie, jak system.
 * 5e: system liczy postępy na ścieżce kariery; poziom jest ukończony, gdy jest ich tyle, ile wymaga
 *     (8 + 2 × poziom).
 */

/** Ile umiejętności kariery musi mieć wymagane rozwinięcia. */
export const SKILLS_NEEDED = 8;

const lower = (name) => String(name ?? "").trim().toLowerCase();

/** Specjalizacja „dowolna” w nazwach umiejętności kariery (EN i PL). */
const ANY = ["any", "dowolny", "dowolna", "dowolne", "dowolnej"];
const SPEC = /^(.*?)\s*\(([^)]*)\)\s*$/;
const isAny = (name) => ANY.includes(lower(SPEC.exec(String(name))?.[2]));
const baseName = (name) => lower(SPEC.exec(String(name))?.[1] ?? name);

/**
 * @param {object} input
 * @param {number} input.level                poziom kariery (1–4)
 * @param {{key, label, advances}[]} input.characteristics  cechy kariery z rozwinięciami postaci
 * @param {string[]} input.careerSkills       umiejętności kariery (nazwy)
 * @param {{name, advances}[]} input.skills   umiejętności postaci
 * @param {string[]} input.careerTalents      talenty kariery (nazwy)
 * @param {string[]} input.talents            talenty postaci (nazwy)
 */
export function careerCheck4e({ level, characteristics = [], careerSkills = [], skills = [], careerTalents = [], talents = [] }) {
  const needed = Math.max(1, Number(level) || 1) * 5;

  const chars = characteristics.map((c) => ({ ...c, advances: Number(c.advances) || 0, ok: (Number(c.advances) || 0) >= needed }));

  // Najpierw dokładne nazwy, potem „(Dowolny)” bierze najlepszą wolną specjalizację – żadna nie liczy się dwa razy
  const owned = skills.map((s) => ({ name: String(s.name ?? ""), key: lower(s.name), advances: Number(s.advances) || 0 }));
  const used = new Set();
  const names = [...new Set(careerSkills.map((n) => String(n).trim()).filter(Boolean))];
  const found = new Map();
  for (const name of names.filter((n) => !isAny(n))) {
    const skill = owned.find((s) => s.key === lower(name));
    if (skill) used.add(skill.key);
    found.set(name, skill);
  }
  for (const name of names.filter(isAny)) {
    const base = baseName(name);
    const skill = owned
      .filter((s) => !used.has(s.key) && baseName(s.name) === base)
      .sort((a, b) => b.advances - a.advances)[0];
    if (skill) used.add(skill.key);
    found.set(name, skill);
  }
  const careerSkillRows = names.map((name) => {
    const skill = found.get(name);
    const advances = skill?.advances ?? 0;
    return { name: skill && isAny(name) ? skill.name : name, owned: Boolean(skill), advances, ok: advances >= needed };
  });
  const skillsRequired = Math.min(SKILLS_NEEDED, careerSkillRows.length);
  const skillsDone = careerSkillRows.filter((s) => s.ok).length;

  const known = new Set(talents.map(lower));
  const talentsOwned = careerTalents.filter((t) => known.has(lower(t)));

  const parts = {
    characteristics: chars.every((c) => c.ok),
    skills: skillsDone >= skillsRequired,
    talent: careerTalents.length === 0 || talentsOwned.length > 0
  };
  return {
    edition: "4e",
    needed,
    characteristics: chars,
    skills: { rows: careerSkillRows, done: skillsDone, required: skillsRequired },
    talents: { owned: talentsOwned, all: careerTalents },
    parts,
    complete: parts.characteristics && parts.skills && parts.talent
  };
}

/**
 * @param {object} input
 * @param {number} input.level      poziom na ścieżce kariery
 * @param {number} input.done       zdobyte postępy na tym poziomie
 * @param {number} input.needed     wymagane postępy
 * @param {string} [input.next]     nazwa następnego poziomu (jeśli jest)
 */
export function careerCheck5e({ level, done = 0, needed = 0, next }) {
  return {
    edition: "5e",
    level,
    done: Number(done) || 0,
    needed: Number(needed) || 0,
    missing: Math.max(0, (Number(needed) || 0) - (Number(done) || 0)),
    next: next || null,
    complete: (Number(done) || 0) >= (Number(needed) || 0)
  };
}

/**
 * Koszt w PD: wyższy poziom tej samej kariery i zmiana profesji (4e: 100 za ukończoną, 200 za nieukończoną,
 * +100 za inną klasę; 5e: wyższy poziom 100, zmiana 100 w tej samej klasie albo 200 w innej).
 */
export function careerCosts(report) {
  if (report.edition === "5e") return { nextLevel: 100, sameClass: 100, otherClass: 200 };
  const change = report.complete ? 100 : 200;
  return { nextLevel: 100, sameClass: change, otherClass: change + 100 };
}
