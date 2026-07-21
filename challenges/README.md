# challenges

All stages of the journey are defined in **`challenges.js`** as a single
ordered array (`CHALLENGES`). The engine in `../script.js` walks this array
from top to bottom, one challenge at a time.

## Anatomy of a challenge

```js
{
  id:       "unique-key",        // stored in LocalStorage; each solved once
  title:    "small heading",     // typed onto the screen
  prompt:   "atmospheric line",  // typed onto the screen
  fragment: "the sentence revealed once solved",
  hint:     "a gentle, very obvious nudge",
  mount(ctx) {
    // build your interactive DOM inside ctx.el
    // call ctx.solve() exactly once when the player succeeds
    // register ctx.assist(fn) so "I'm stuck" can reveal / auto-solve
  }
}
```

`ctx` provides:

| field         | purpose                                                        |
| ------------- | -------------------------------------------------------------- |
| `ctx.el`      | empty container to draw the puzzle into                         |
| `ctx.solve()` | call once on success — advances the story                      |
| `ctx.assist(fn)` | register a reveal/auto-solve used by the "I'm stuck" button |

## Design rules

- Clever, but **never** frustrating.
- Every challenge carries an **obvious** clue.
- No outside knowledge, no programming, no real cryptography.
- Everything solvable offline — references and decoders are built in.
- The "I'm stuck" button guarantees no one is ever truly stuck.

## Adding a stage

Insert a new object anywhere in the array and give it a fresh `id`. The
progress bar, LocalStorage, and journal all adjust to the array length
automatically — no other file needs to change.
