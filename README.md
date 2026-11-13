# Alvee English

A 6-month English course for Alvee, built as a phone app that opens in Safari and can be added to the iPhone Home Screen.

- **24 weekly units**: am / is / are → I like / she likes → do / does → time and routine → -ing → there is / are → can → directions → was / were → -ed → went / ate → did → will → going to → if → polite English → questions → telling her story → hotel pro → graduation.
- **46 conversations** of every kind: friends, family, love, work, hotel, food, shopping, health, travel, phone calls, home, weather.
- **Every English word can be tapped** for Thai meaning, Thai pronunciation, notes and several examples (English + Thai).
- **Spaced repetition**: words and sentences come back after 1, 2, 4, 7, 14 and 30 days, sooner when she gets them wrong. Wrong answers are always about her real mistakes (forgetting *am*, *is/are*, *-s*, past tense, *will*).
- **Your dashboard** (admin login): online status, the lesson and step she is on, every answer with her mistakes, words she looked up, mistakes by grammar topic, progress against the 6-month plan, messages to her (now or as a reward when she reaches a goal), and her login settings. She never sees when you are online.

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

**Backups:** copy `/var/lib/alvee-english` (db.json = logins and messages, state/ = progress, events/ = every step).

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
