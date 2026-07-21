# a quiet room

A small, offline **Alternate Reality Game / puzzle hunt** built with nothing
but HTML, CSS, and vanilla JavaScript.

You wake in a dark room. One gentle puzzle unlocks the next. Each solved
challenge hands you a single, quiet sentence. On their own the sentences mean
almost nothing — but as the room grows dimmer and heavier, they begin to fold
into a story about someone slowly making peace with a small, breaking thing.

There is no timer, no score, and no way to lose. If you ever feel stuck, the
**"I'm stuck"** button is always there — first with a hint, then with the
answer. The experience is meant to be *felt*, not *fought*.

---

## Features

- **19 interconnected challenges**, from finding a hidden button to a tiny
  maze, a memory game, Base64 / hex / Caesar / Morse decoders (with built-in
  references so no outside tools are needed), a slider puzzle, a drag-and-drop
  moment, a brightness-reveal, and a final keyboard gesture.
- **A hidden narrative** revealed one fragment at a time, collected in a
  **journal** (the ✦ button, bottom-left).
- **Progress saved** in LocalStorage — close the tab and return where you left
  off. Each challenge can only be completed once.
- **A progress indicator** at the top that fills as you go.
- **Atmosphere that shifts** with your progress: the palette cools, the
  vignette deepens, and the drifting particles dim and slow.
- **Cinematic touches**: ambient particle field, typewriter text, soft scene
  transitions, and a fade-to-black finale.
- **A fake ending** hidden before the real one.
- **Optional ambient audio** — drop `assets/ambient.mp3` and press ♪.
- **Fully responsive** and **100% offline**. No backend, no build step, no
  external requests.

---

## Run it

Just open `index.html` in any modern browser.

```
# option 1 — double-click index.html

# option 2 — serve locally (nicer for LocalStorage across reloads)
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Publish on GitHub Pages

1. Push this folder to a GitHub repository.
2. **Settings → Pages → Build and deployment → Deploy from a branch**.
3. Choose your branch and the `/ (root)` folder, then save.
4. Your journey goes live at `https://<user>.github.io/<repo>/`.

No configuration required — every path is relative.

---

## Project structure

```
/
├── index.html          # shell: particles, progress bar, stage, journal
├── style.css           # dark cinematic theme; palette driven by --p progress
├── script.js           # engine: storage, typewriter, particles, endings
├── assets/
│   └── README.md        # where to add optional ambient.mp3
├── challenges/
│   ├── challenges.js    # all 19 stages, self-contained
│   └── README.md        # how to add / edit a challenge
├── markdown/
│   └── ending.md        # the finale text (also embedded in script.js)
└── README.md
```

---

## A note on the story

Nothing is spelled out. The heaviness is meant to arrive quietly, through
atmosphere and small symbols, rather than through difficulty. Take your time.
Read the sentences you gather. Some things break before we ever get to call
them ours — and that is alright.

*(There is a small message or two hidden in the page source, and one waiting
in the browser console, for the kind of person who likes to look.)*
