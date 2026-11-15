# Alvee English

A 6-month English course for Alvee, built as a phone app that opens in Safari and can be added to the iPhone Home Screen.

- **The voyage (v5.1)**: the Operation Crab 3D map (three.js, self-hosted in `public/vendor/`), with the same sea, sky, live weather, land, lighthouse, islands, palms, clouds, rain, dolphins, route ribbons, boats, wakes and chests. 24 chapter islands (one per unit) from below Thailand to Addu Atoll in the Maldives; each island holds its lessons, its conversation and its timed test, and her boat moves closer with every lesson. Side-mission islands every few chapters. Big Thailand and Maldives clocks (day or night, weather) at the top of the map. If a phone cannot do 3D, a 2D chapter map is shown.
- **The Kraken**: now and then, while she is on the map (never during a lesson), the Kraken attacks. She taps 🔥 FIRE to drive it off (gold, pearls, sometimes a key). It bites the hull; if the hull breaks the boat sinks and the Kraken takes some gold, pearls and one treasure. Wood logs float on the sea and repair the hull. You can switch it off or send it from the Control Room.
- **A long voyage**: a few new lessons a day (set on your dashboard; version 5 starts at 3), a sea gate between seas (collect enough stars in the sea behind her, so she replays lessons for 3 stars), a new tide of things to collect every 4 hours, daily quests, keys, sealed chests and the boatyard.
- **Typing in tests**: from month 3 the timed tests ask her to type missing words; from month 5 she also types short sentences she hears (small spelling slips in long words are forgiven and shown).
- **Things to collect**: shells (16 kinds), oysters with white, pink, black or golden pearls, treasure chests, golden chests, sealed chests (need a 🔑 key) and bottles. Chests open with the Operation Crab opening animation after a short English task. The treasure book has 73 pieces in five sets (Maldives, Thailand, Pirate Hoard, Love and Spice, Deep Sea); epic and legendary pieces only come from golden and sealed chests, and the ones she has not found show as dark shapes.
- **Gold and the shop**: pearls sell for gold at the pearl market (the price moves every day). Boats cost gold, and the bigger ones only appear in the boatyard once she reaches a certain island. Keys come from finishing all three daily quests and from passing a timed test the first time.
- **Pop-ups and notifications**: new treasure, rare pearls, keys, quests to claim, gifts, new boats in the boatyard. Tapping one takes her straight to that thing. The 🔔 keeps the list, and the menu shows a dot on the tab with something new.
- **Voyage music**: an original tune played live by the phone (marimba, pads, the sea and gulls) while the map is open. 🎵 turns it off.
- **Booster islands**: extra lessons for her weakest grammar points, made from sentences she has already met, placed just before the test of the unit that teaches that point.
- **English everywhere**: menus, collections and the map are English only, so she learns from them too. Thai stays as lesson help (the 🇹🇭 button, tapping a word, the explanations).
- **Timers**: a stopwatch on every question; the island tests are timed (seconds per question set in the dashboard).
- **Control Room** (dashboard): drop gifts on her sea (chests, golden chests, sealed chests, bottles, pearls, gold, keys, shells, any treasure, a boat) with a note, start double-pearl events, open islands ahead or hold her at one, set the test time, switch side missions or quests off, and open her map. **Her screen** shows exactly what she sees, live.
- **24 weekly units, 108 lessons**: am / is / are → I like / she likes → do / does → time and routine → -ing → there is / are → can → directions → was / were → -ed → went / ate → did → will → going to → if → polite English → questions → telling her story → hotel pro → graduation. Months 4–6 have an extra real-life lesson in every unit.
- **50 conversations** of every kind: friends, family, love, work, hotel, food, shopping, health, travel, phone calls, home, weather.
- **English first, Thai as a helper**: no Thai↔English word matching. Exercises are “Which word fits?”, listening, pictures, fill the gap, build the sentence, pick the correct sentence and replies. Thai is behind a 🇹🇭 *Thai help* button (or always on, if she turns that on), and every word can be tapped for its meaning.
- **Every wrong answer is explained** in English and Thai, with a personal rule (“the person is *she* → *is*”) and ✅ / ❌ examples.
- **The app learns**: each answer is tagged with the grammar point it tests (am/is/are, past tense, he/she + s, will, questions…). Her weakest point gets extra practice inside lessons and a *Practice* button on her home screen.
- **Spaced repetition**: words and sentences come back after 1, 2, 4, 7, 14 and 30 days, sooner when she gets them wrong.
- **Tao the sea turtle**, animated island scenes that follow the time of day, a winding journey map, and a treasure chest of 29 medals (bronze, silver, gold, pearl).
- **Top bar**: Maldives time and Thai time side by side, and a 🌙 night mode button.
- **Download button** on the login page (installs the app; on iPhone it shows the Add to Home Screen steps). Installed, it always opens full screen.
- **Messages** from you are switched off on her side for now.
- **Your dashboard** (admin login): online status, every step and mistake, an **Insights** tab (weak grammar points with trends, repeated mistake patterns, hard exercise types, where she stops, and a downloadable report for planning the next update), progress with **reset per lesson / unit / month**, messages to her, and her login settings. She never sees when you are online.

## Run it on a computer

```
node server/server.js          # needs Node.js 18 or newer
```
Open http://localhost:8080. The first time, the server prints a **setup code**; enter it in the app to create your login and Alvee's login.

## Put it on your Ubuntu server

On the server, paste this one line (it downloads this repo and installs it):

```
curl -fsSL https://github.com/abdmuhaimin4392g-star/alvee-english/archive/refs/heads/main.tar.gz | tar -xz -C /tmp && sudo bash /tmp/alvee-english-main/deploy/install.sh english.raaverifarmai.com
```

Or copy this folder to the server yourself and run `sudo bash deploy/install.sh english.raaverifarmai.com`.

- Without a domain (`sudo bash deploy/install.sh`) it runs on `http://SERVER-IP:3088`.
- With a domain, first add a DNS **A record** for that name pointing to the server. The script adds a new site to Caddy or nginx (existing sites are not changed; if the config check fails it rolls back).
- It prints the first-time setup code at the end.
- Run the same command again later to update. Her progress is kept in `/var/lib/alvee-english` and is never overwritten.

**Backups:** copy `/var/lib/alvee-english` (db.json = logins and messages, state/ = progress, events/ = every step). Every reset from the dashboard first saves a copy in `archive/`.

**Updating never touches her progress** — the install script only replaces the app code in `/opt/alvee-english`.

## Add it to Alvee's iPhone

Open the link in **Safari** → Share button → **Add to Home Screen**. It then opens full screen like an app, with sound (🔊 and 🐢 slow).

## Change or add lessons

Lessons are plain text in `content/` (`dict.txt` = dictionary, `m1.txt` … `m6.txt` = months). After editing run:

```
node tools/build.mjs
```

It rebuilds the app data and lists any English word that is missing a Thai entry or has fewer than two examples.

## Version 5 update: a fresh start

When version 5 is installed, `server/migrate-v5.js` runs once. It reads her answers on the server, works out her weakest grammar points (printed in the install output), keeps a full copy of her progress in `/var/lib/alvee-english/archive/`, adds booster islands for those points, and starts the voyage again from island 1. Her treasure, shells, pearls, boats, medals, streak days and mistake statistics stay. Running the install again does not reset her a second time.

Version 5.4 then runs once more: XP, study days, time, streak, rest days and medals go back to zero. Only the collections she had before the map update are taken away (pearls, shells, treasure, postcards, boats); everything she collected after it stays, with her gold, keys and logs. Her finished lessons stay. A copy is saved in the archive first, and it runs only once.

## The 3D map

`public/js/crab3d.js` is built from the Operation Crab map code by `tools/crab3d/build.py` (the Operation Crab blocks are in `tools/crab3d/src/`, Alvee's route and screens are in `glue_*.js`). Run `python3 tools/crab3d/build.py` after changing them. The styles are `public/crab.css`.

## Checks

- `python3 tools/smoke.py` — builds and draws every lesson, review and conversation.
- `python3 tools/server_e2e.py` — first-time setup, two phones, online status, logging, messages.
