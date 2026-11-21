# TomWa Warhammer HUD (`warhammer-battle-hud`)

**English** | [Polski](README.pl.md)

Everything a character needs in a fight, on one screen and with no other modules required: party frames, an action panel and an ammunition bar. It detects the active Warhammer system.

Requires **Foundry VTT v14** and one of: **WFRP 4e / 5e** (`wfrp4e` 10.0+), **The Old World** (`whtow`), **Imperium Maledictum** (`impmal`), **Wrath & Glory** (`wrath-and-glory`), **Soulbound** (`age-of-sigmar-soulbound`).

Don't enable it together with other modules that add party frames, track ammunition or add an action HUD: they would do the same job twice and get in each other's way.

## 🖼️ Screenshots

| | |
|---|---|
| ![WFRP: the Advantage counter and what Advantage can buy](docs/screenshots/wfrp-advantage.png)<br>WFRP: the Advantage counter and what Advantage can buy | ![WFRP: a weapon tooltip](docs/screenshots/wfrp-tooltip.png)<br>WFRP: a weapon tooltip |
| ![The Old World: skills by characteristic](docs/screenshots/old-world-skills.png)<br>The Old World: skills by characteristic | ![The Old World: a spell tooltip](docs/screenshots/old-world-spell.png)<br>The Old World: a spell tooltip |
| ![Imperium Maledictum: skills and specialisations, the party's Superiority](docs/screenshots/imperium-maledictum-skills.png)<br>Imperium Maledictum: skills and specialisations, the party's Superiority | ![Wrath & Glory: combat, a weapon tooltip and Glory](docs/screenshots/wrath-and-glory-combat.png)<br>Wrath & Glory: combat, a weapon tooltip and Glory |
| ![Soulbound: attributes and skills with the dice pool, Soulfire](docs/screenshots/soulbound-skills.png)<br>Soulbound: attributes and skills with the dice pool, Soulfire | |

## 📥 Installation

Paste into *Manifest URL* under **Add-on Modules → Install Module**:

```
https://github.com/TomWa-Foundry-VTT-Workshop/warhammer-battle-hud/releases/latest/download/module.json
```

## 🧭 Floating HUD

The HUD (Advantage, action panel and ammunition) floats over the scene. Hold the mouse button anywhere on it and drag (a plain click still uses the buttons); the position is saved to your user account, so it follows you to any computer. **Double-click** the handle to put it back above the hotbar.

## ✋ Hands (WFRP, Imperium Maledictum)

Next to the big counter, **Hands** shows what each hand holds and how many are in use (2/2). A two-handed weapon fills both hands; the other hand is marked **Off**, and its tooltip explains the off-hand penalty the system applies. **Click** a hand to pick a weapon for it: whatever was there is put away, a two-handed weapon clears both hands, and a weapon already held moves to the chosen hand. **Right-click** empties the hand.

In WFRP the number of hands is the character's equip points (2, or more for creatures with extra arms) and the system's limit on equipped weapons still applies. In Imperium Maledictum it is the left and right hand, with the dominant one as the main hand; a hand that cannot be used (an injury) is crossed out. While Hands are shown, the small group of weapon icons in the ammunition row is left out, since Hands do the same job. It can be hidden in the settings.

## 🎨 System colours

The HUD and the party frames take the colours of the active system's character sheet: parchment and dark red in WFRP, cream and crimson in The Old World, navy, teal and orange in Imperium Maledictum, Imperial red on graphite in Wrath & Glory, and Azyr blue with gold in Soulbound. The frames' look can be switched back to Parchment or Imperium in the settings.

## ⚡ Advantage (WFRP)

The big counter at the front of the HUD follows the system: the party's Superiority in Imperium Maledictum, Glory in Wrath & Glory and Soulfire in Soulbound. In WFRP, the large counter shows the character's Advantage and glows brighter as it grows, up to the maximum. Only the GM changes the counter by hand: **click** +1, **right-click** −1. Players see the value and its rules in the tooltip. The party frames highlight it too. It can be hidden in the settings.

The first tab of the action panel, **Advantage**, lists what the character can spend Advantage on right now, each with its cost (⚡1, ⚡2): the system's Advantage actions (with Up in Arms: Batter, Trick, Additional Effort, Flee from Harm, Additional Action) and, with **Underworld Crew** (`wfrp4e-underworld`), the tactical orders the Chief's retinue can carry out. Actions the character cannot afford yet are dimmed. Clicking an Advantage action spends the cost, posts it to chat and rolls its test, just like the button on the character sheet; clicking a crew order opens Underworld's order dialog.

## ⚔️ Action panel

Tabs above the hotbar for the selected token, or your assigned character. In WFRP: characteristics, skills, combat, magic, religion, talents, conditions, Advantage and Downtime (Income from the current career, Career check, Rest, and the world's endeavours). **Career check** posts to chat, for your eyes only, whether the current career level is complete and what is still missing (4th edition: characteristics and 8 career skills at 5 × level advances and one career talent; 5th edition career paths, which the system allows with the "5e Career Advancement" option: the advancements on the current tier; without that option a character keeps a 4th edition career and is checked by the 4th edition rule), with your XP and the cost of moving up or changing career. Channelled SL stays visible: on the spell ("2/4" in 4e), on the Wind (5e), and as "Lose the channelled power" at the top of the Magic tab. In The Old World: combat (the system's combat actions with the Manoeuvre variants, equipped weapons, reloading, attack abilities, shields and armour), skills grouped by characteristic with their dice, magic (casting by lore, spells with CV and accumulated power, the Miscast pool), faith (Favour, prayers, the Miracle), talents, abilities and lores, status (Fate, conditions, wounds) and the world's endeavours. In Imperium Maledictum: combat (the turn's actions, weapons with magazines and reloading, Dodge, Initiative, attack traits, protection), characteristics, skills with specialisations by characteristic, psychic powers with the Warp Charge and purging, talents and traits, and status (Fate, minor and major conditions, injuries and criticals). In Wrath & Glory: combat (weapons with damage, ED, AP and salvo, Determination, Resolve and Conviction tests, Initiative, armour), attributes, skills by attribute, psychic powers, abilities, talents and keywords, status (Wrath, Faith, Corruption, conditions, injuries and mutations) and Downtime (Influence test, Wealth). In Soulbound: combat (weapons, Initiative, Mettle, armour), attributes and skills with the dice pool and focus, spells and miracles, talents and conditions.

* **Left click**: roll, add a condition or Advantage, post a talent to chat.
* **Hover** (WFRP): a tooltip with the key numbers (e.g. a weapon's damage, group and reach, a skill's characteristic and advances, armour points, a spell's CN, range and duration), the description and a reminder of the controls.
* **Shift**: Blind GM roll. **Alt**: skip the roll dialog. **Ctrl + left / right** on weapons and armour: repair / damage.

## 🏹 Ammunition

In systems that track ammunition (WFRP, Imperium Maledictum, Wrath & Glory): choose the ammunition, reload, and equip weapons or shields with one click. The count turns amber when low and red when gone.

## 🏃 Momentum (WFRP, 5th edition rules)

The WFRP system can run on the 4th edition rules (the default) or the 5th edition ones (Edition Manager → Use 5e). With the 5th edition rules there is no Advantage pool, so the big counter shows **Momentum** instead, as the character sheet does: **Active** or **None**. Momentum gives +1 Advantage on Weapon Skill tests; the system grants it for winning a melee opposed test in combat or charging, and removes it when the character takes damage, loses a melee opposed test, gains a condition, or combat ends. The HUD follows those changes. The GM can also grant or take it by hand: **click** toggles it, **right-click** takes it away. Players only see it. The Advantage actions are 4th edition only, so they leave the action panel, and the party frames show Momentum in place of Advantage.

## 🖼️ Party frames

The frames are hidden at first: turn them on with the party frames button in the token controls (or in the settings). In Party mode they show the characters of the players who are logged in right now (a player's assigned character, or the characters they own); players who log out drop off. Portrait, health, the system's resources and conditions for each character. **Click** targets the token, **double-click** goes to it, **right-click** opens the sheet. The header switches between Party, Combat and Selected tokens, collapses the frames and moves them when dragged.

* **Choose characters** (the person icon in the header): a list of the mode's characters where you tick who is shown. In Party mode you can also add a player character that isn't assigned to anyone. The number next to the icon says how many are hidden. The choice is yours and follows you to any computer.
* **×** on a frame (on hover) hides that one character.
* **Hide the frames** (the eye in the header) hides the whole panel. Bring it back with the party frames button in the token controls, an optional keybinding (set it in Configure Controls) or in the module settings.

## 🎯 Token HUD

Four quick tests with their values on the token's HUD. Each part can be switched off in the settings.

## 🌐 Languages

English and Polish are built in. To add another language:

```bash
npm run lang:add -- de "Deutsch"
```

## 📄 License

MIT – see [LICENSE](LICENSE).

Unofficial fan content, not affiliated with or endorsed by Games Workshop or Cubicle 7. Warhammer and all related names are trademarks of Games Workshop Limited. The module ships no rulebook text or artwork; it works with the content you already own.
