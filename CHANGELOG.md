# Changelog

## Unreleased
- WFRP: "Career check" in the Downtime tab tells only you, in chat, whether the current career level is complete and what is missing (4th edition: characteristics and 8 career skills at 5 × level advances and one career talent; 5th edition: the career path advancements), with the XP you have and what moving up or changing career costs.

## 0.8.0
- Only the GM changes the big counter by hand (Advantage, Momentum, Superiority, Glory, Soulfire); players see the value and the rules in its tooltip. The Advantage counter in the action panel is GM-only too. Spending Advantage on its actions still works for players, as on the sheet.
- WFRP with the 5th edition rules: the big counter shows Momentum (Active/None) instead of Advantage, as the character sheet does, and follows the system gaining and losing it. The GM grants or takes it with a click, right-click takes it away. The Advantage actions (4th edition only) leave the action panel and the party frames show Momentum instead of Advantage.
- The party frames start hidden; turn them on with the button in the token controls or in the settings.
- Party mode of the party frames shows only the characters of players who are logged in.
- While Hands are shown, the small group of weapon icons is left out (Hands do the same job).
- Hands (WFRP, Imperium Maledictum): a slot for each hand next to the big counter shows what it holds and how many hands are in use. Click a hand to put a weapon in it (two-handed weapons take both, whatever was there is put away), right-click to empty it. In WFRP the off hand is marked and the number of hands follows the character's equip points.
- The HUD can be dragged from anywhere on it, not only by the handle. A plain click still uses the buttons, and releasing a drag over a button does not press it.

## 0.7.0
- WFRP: a Downtime tab with Income (the current career's earning test, as on the sheet), Rest (Endurance, or Toughness without the skill) and the world's endeavour pages.
- WFRP: channelled SL is shown where it builds up – on the spell ("2/4") in 4e and on the Wind in 5e, with a tooltip row – and "Lose the channelled power" at the top of the Magic tab clears it.
- The Old World: the world's endeavours in a Downtime tab; those with a plain skill test roll straight away for the HUD's character, the others open their page.
- Wrath & Glory: a Downtime tab with the Influence test and Wealth (+/−).
- Imperium Maledictum already shows its Warp Charge and The Old World the accumulated casting power; Soulbound and Imperium Maledictum have no player income or endeavours to add.

## 0.6.1
- Screenshots of every system in the README.
- The Old World spell tooltips show "CV" instead of a raw translation key, and a test now checks every tooltip row has a translation.
- Column layouts (skills) may use more of the screen, so Imperium Maledictum's nine characteristics fit without scrolling; Soulbound's skills use four columns.

## 0.6.0
- Every system has its own colours, taken from its character sheet; the party frames use them by default (Parchment and Imperium stay available).
- Imperium Maledictum, Wrath & Glory and Soulbound get full action panels like WFRP and The Old World, built from the same calls as their character sheets, with a tooltip on every action: weapons, defence tests, powers, talents, resources and conditions in each system's own terms.
- The big counter now follows the system: the party's Superiority in Imperium Maledictum, Glory in Wrath & Glory and Soulfire in Soulbound.
- HUD buttons stay readable in systems that restyle Foundry's buttons, and a rule message from the system (for example "Not enough Mettle!") is shown as is instead of a generic error.

## 0.5.1
- The module is now called **TomWa Warhammer HUD** (the id stays `warhammer-battle-hud`, so installs and settings carry on) and lives in the TomWa-Foundry-VTT-Workshop organisation on GitHub.

## 0.5.0
- The Old World: a full action panel instead of the skill list. Combat (combat actions with the Manoeuvre variants, equipped weapons with damage and range, reloading weapons that need it, attack abilities, shield Defence tests, armour), skills grouped by characteristic with their dice, magic (casting by lore, spells with CV and accumulated power, disposing of and rolling Miscasts), faith (Favour, prayers, the Miracle and regaining it), talents, abilities and lores, and status (Fate +/− and restore, conditions, wounds marked treated). Every action has a tooltip and uses the same system calls as the character sheet.
- The Old World party frames also show untreated wounds and a caster's Miscast pool.
- The Old World skills tab is laid out in four columns (two characteristics per column, two skills each) instead of a long scrolling list.

## 0.4.0
- WFRP action panel: every action has a tooltip with its key numbers (weapon damage, group, reach and skill; skill characteristic and advances; armour points per location; spell and prayer CN, range, target and duration; talent tests; condition descriptions), the description without raw links or roll formulas, and a reminder of the controls.
- Party frames: choose which characters are shown (header button, saved per player; in Party mode you can also add unassigned player characters), hide a single character with × on its frame, and hide the whole panel with the eye button. A party frames toggle in the token controls and an optional keybinding bring them back.

## 0.3.0
- WFRP: a new first tab, **Advantage**, with what the character can spend Advantage on and the cost of each: the system's Advantage actions (Batter, Trick and the rest from Up in Arms) and, with Underworld Crew 1.11.0 or later, the crew's tactical orders the retinue can carry out. Actions the character cannot afford are dimmed. The old Utility tab is gone; the Advantage counter moved into the new tab.

## 0.2.0
- The HUD floats: drag it by the handle and it stays where you put it, saved per player. Double-click the handle to reset it.
- WFRP: a large Advantage counter at the front of the HUD (click +1, right-click −1), also highlighted on the party frames.

## 0.1.0
- First version: party frames, an action panel and an ammunition bar for the Warhammer systems, with no other modules required. Don't use it together with other modules that add party frames, track ammunition or add an action HUD.
