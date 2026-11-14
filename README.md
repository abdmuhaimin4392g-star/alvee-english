# Alvee English

A 6-month English course for Alvee, built as a phone app that opens in Safari and can be added to the iPhone Home Screen.

- **24 weekly units, 108 lessons**: am / is / are → I like / she likes → do / does → time and routine → -ing → there is / are → can → directions → was / were → -ed → went / ate → did → will → going to → if → polite English → questions → telling her story → hotel pro → graduation. Months 4–6 have an extra real-life lesson in every unit.
- **50 conversations** of every kind: friends, family, love, work, hotel, food, shopping, health, travel, phone calls, home, weather.
- **English first, Thai as a helper**: no Thai↔English word matching. Exercises are “Which word fits?”, listening, pictures, fill the gap, build the sentence, pick the correct sentence and replies. Thai is behind a 🇹🇭 *Thai help* button (or always on, if she turns that on), and every word can be tapped for its meaning.
- **Every wrong answer is explained** in English and Thai, with a personal rule (“the person is *she* → *is*”) and ✅ / ❌ examples.
- **The app learns**: each answer is tagged with the grammar point it tests (am/is/are, past tense, he/she + s, will, questions…). Her weakest point gets extra practice inside lessons and a *Practice* button on her home screen.
- **Spaced repetition**: words and sentences come back after 1, 2, 4, 7, 14 and 30 days, sooner when she gets them wrong.
- **Tao the sea turtle**, animated island scenes that follow the time of day, a winding journey map, and a treasure chest of 29 medals (bronze, silver, gold, pearl).
- **Top bar**: Maldives time and Thai time side by side, and a 🌙 night mode button.
- **Download button** on the login page (installs the app; on iPhone it shows the Add to Home Screen steps). Installed, it always opens full screen.
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

## Checks

- `python3 tools/smoke.py` — builds and draws every lesson, review and conversation.
- `python3 tools/server_e2e.py` — first-time setup, two phones, online status, logging, messages.
