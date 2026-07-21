/* =============================================================
   challenges.js
   ---------------------------------------------------------------
   Every stage of the journey lives here as a self-contained object.

   Each challenge object provides:
     id        unique key stored in LocalStorage
     title     the small heading shown at the top of the scene
     prompt    the atmospheric line (typed out on screen)
     fragment  the sentence revealed once the challenge is solved
     hint      a gentle nudge (shown by the "I'm stuck" button)
     mount(ctx)  builds the interactive DOM

   The engine (script.js) passes a small context object to mount():
     ctx.el        an empty container to draw into
     ctx.solve()   call this exactly once when the challenge is solved
     ctx.assist(fn)  register a "reveal / auto-solve" helper the
                     "I'm stuck" button can trigger — so no one is
                     ever truly stuck.

   Design rule for the whole file: clever but never frustrating.
   Every puzzle carries an obvious clue, needs no outside knowledge,
   no programming, and no real cryptography.
   ============================================================= */

/* ---------- shared tiny helpers ---------- */

// normalise an answer so spacing / case / punctuation never matter
function norm(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Caesar shift (used to *generate* the puzzle so it's always correct)
function caesar(str, shift) {
  return str.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26) + base);
  });
}

// text -> "68 6f 70 65" hex, generated at runtime so it's never wrong
function toHex(str) {
  return str.split("").map((c) => c.charCodeAt(0).toString(16)).join(" ");
}

// Build a simple answer box (input + submit + soft feedback).
// Reused by most "type the word" challenges.
function answerBox(el, { answers, solve, assist, placeholder = "type it here", warm = "…" }) {
  const wrap = document.createElement("div");
  wrap.className = "row";
  wrap.style.flexDirection = "column";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = placeholder;
  input.autocomplete = "off";
  input.spellcheck = false;

  const btn = document.createElement("button");
  btn.className = "btn";
  btn.textContent = "continue";

  const fb = document.createElement("div");
  fb.className = "feedback";

  const accepted = answers.map(norm);
  let tries = 0;

  function check() {
    if (accepted.includes(norm(input.value))) {
      fb.textContent = warm;
      fb.classList.add("warm");
      solve();
      return;
    }
    tries++;
    input.classList.remove("nudge-wrong");
    void input.offsetWidth; // restart animation
    input.classList.add("nudge-wrong");
    fb.textContent = tries >= 2 ? "not quite — take another look, gently." : "not quite. no rush.";
  }

  btn.addEventListener("click", check);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });

  wrap.appendChild(input);
  wrap.appendChild(btn);
  el.appendChild(wrap);
  el.appendChild(fb);

  setTimeout(() => input.focus(), 400);

  // let the "I'm stuck" button quietly fill the answer
  if (assist) {
    assist(() => {
      input.value = answers[0];
      input.focus();
      fb.textContent = "there it is. press continue whenever you're ready.";
    });
  }
}

/* =============================================================
   THE CHALLENGES  (order = the order they are experienced)
   ============================================================= */

const CHALLENGES = [

  /* 1 — a hidden button revealed by looking closely --------- */
  {
    id: "awaken",
    title: "the room is dark",
    prompt: "Stay a moment. Let your eyes adjust. Something here is waiting to be seen.",
    fragment: "A day had been circled on the calendar.",
    hint: "There is a word dimmer than the rest, a little below the centre. Rest your cursor over the dark and it will warm.",
    mount(ctx) {
      const box = document.createElement("div");
      box.className = "hidden-begin";
      box.innerHTML = `<span class="veil">( look, don't rush )</span>`;

      const secret = document.createElement("button");
      secret.className = "secret-btn";
      secret.textContent = "begin";
      secret.addEventListener("click", () => ctx.solve());
      box.appendChild(secret);
      ctx.el.appendChild(box);

      // Kindness: after a while, let the word glow a little on its own.
      const nudge = setTimeout(() => secret.classList.add("nudge"), 9000);
      ctx.assist(() => { clearTimeout(nudge); secret.classList.add("nudge"); });
    },
  },

  /* 2 — click the numbered dots in order -------------------- */
  {
    id: "order",
    title: "small steps",
    prompt: "Nothing worth doing happens all at once. Touch them in order — one, then two, then three.",
    fragment: "I wanted to arrive as my better self.",
    hint: "Follow the numbers from smallest to largest. If you slip, it simply resets — no harm done.",
    mount(ctx) {
      const field = document.createElement("div");
      field.className = "dotfield";
      ctx.el.appendChild(field);

      const spots = [ [12, 20], [70, 8], [40, 55], [8, 72], [78, 66] ]; // % positions
      const order = [1, 2, 3, 4, 5];
      let next = 1;
      const dots = [];

      order.forEach((n, i) => {
        const d = document.createElement("button");
        d.className = "order-dot";
        d.textContent = n;
        d.style.left = spots[i][0] + "%";
        d.style.top = spots[i][1] + "%";
        d.addEventListener("click", () => {
          if (n === next) {
            d.classList.add("done");
            next++;
            if (next > order.length) setTimeout(ctx.solve, 350);
          } else {
            // gentle reset
            dots.forEach((x) => x.classList.remove("done"));
            next = 1;
            field.classList.add("nudge-wrong");
            setTimeout(() => field.classList.remove("nudge-wrong"), 450);
          }
        });
        dots.push(d);
        field.appendChild(d);
      });

      ctx.assist(() => {
        dots.forEach((x) => x.classList.add("done"));
        setTimeout(ctx.solve, 400);
      });
    },
  },

  /* 3 — Base64 (with a literal clue + a built-in decoder) ---- */
  {
    id: "base64",
    title: "a message, wrapped",
    prompt: "This is written in Base64. Press the lens to unwrap it, then tell me the last word.",
    fragment: "The good shirt was folded and waiting.",
    hint: "Press “decode”. The sentence appears. The final word is the one you type.",
    mount(ctx) {
      const plain = "the good shirt is folded";
      const encoded = btoa(plain);

      const ciph = document.createElement("div");
      ciph.className = "cipher";
      ciph.textContent = encoded;
      ctx.el.appendChild(ciph);

      const decodeBtn = document.createElement("button");
      decodeBtn.className = "btn subtle";
      decodeBtn.textContent = "decode (lens)";
      const out = document.createElement("div");
      out.className = "reference";
      out.style.display = "none";
      decodeBtn.addEventListener("click", () => {
        out.style.display = "block";
        out.innerHTML = `it reads: <b>${atob(encoded)}</b>`;
      });
      ctx.el.appendChild(decodeBtn);
      ctx.el.appendChild(out);

      answerBox(ctx.el, { answers: ["folded"], solve: ctx.solve, assist: ctx.assist, placeholder: "the last word" });
    },
  },

  /* 4 — reverse a word -------------------------------------- */
  {
    id: "reverse",
    title: "turned around",
    prompt: "Here is a word facing the wrong way. Read it backwards and give it back to me.",
    fragment: "I practiced the way I might smile.",
    hint: "Read the letters from right to left. n-o-i-t-c-e-l-f-e-r …",
    mount(ctx) {
      const plain = "reflection";
      const rev = plain.split("").reverse().join("");
      const ciph = document.createElement("div");
      ciph.className = "cipher";
      ciph.textContent = rev;
      ctx.el.appendChild(ciph);
      answerBox(ctx.el, { answers: [plain], solve: ctx.solve, assist: ctx.assist, placeholder: "the word, forwards" });
    },
  },

  /* 5 — Caesar cipher, ROT3, with a full reference ---------- */
  {
    id: "caesar",
    title: "a shifted word",
    prompt: "Each letter has walked three steps forward. Walk them three steps back. (This is ROT3.)",
    fragment: "There was a small bottle I had been saving.",
    hint: "Use the table below. Under the shifted letter is the true one. v→s, d→a, y→v, h→e, g→d.",
    mount(ctx) {
      const plain = "saved";
      const shifted = caesar(plain, 3);

      const ciph = document.createElement("div");
      ciph.className = "cipher";
      ciph.textContent = shifted;
      ctx.el.appendChild(ciph);

      // reference: normal alphabet over shifted alphabet
      const normalAlpha = "abcdefghijklmnopqrstuvwxyz";
      const shiftAlpha = caesar(normalAlpha, 3);
      const ref = document.createElement("div");
      ref.className = "reference";
      ref.innerHTML =
        `<b>ROT3 key</b> — find the shifted letter on top, read the true letter below:<br>` +
        `shifted: ${shiftAlpha.split("").join(" ")}<br>` +
        `true&nbsp;&nbsp;&nbsp;: ${normalAlpha.split("").join(" ")}`;
      ctx.el.appendChild(ref);

      answerBox(ctx.el, { answers: [plain], solve: ctx.solve, assist: ctx.assist, placeholder: "the true word" });
    },
  },

  /* 6 — hexadecimal, with an ASCII conversion hint ---------- */
  {
    id: "hex",
    title: "numbers for letters",
    prompt: "These pairs are letters wearing number-costumes. Turn them back into a word.",
    fragment: "I kept it for a day that mattered.",
    hint: "Each pair is one letter. Match them in the little table: 6b→k, 65→e, 70→p, 74→t.",
    mount(ctx) {
      const plain = "kept";
      const hex = toHex(plain);
      const ciph = document.createElement("div");
      ciph.className = "cipher";
      ciph.textContent = hex;
      ctx.el.appendChild(ciph);

      // small, focused conversion table for exactly these letters
      const rows = plain.split("").map((c) =>
        `<b>${c.charCodeAt(0).toString(16)}</b> = ${c}`).join("&nbsp;&nbsp;·&nbsp;&nbsp;");
      const ref = document.createElement("div");
      ref.className = "reference";
      ref.innerHTML = `<b>hex → letter</b><br>${rows}`;
      ctx.el.appendChild(ref);

      answerBox(ctx.el, { answers: [plain], solve: ctx.solve, assist: ctx.assist, placeholder: "the word" });
    },
  },

  /* 7 — a small memory game -------------------------------- */
  {
    id: "memory",
    title: "what matches",
    prompt: "Turn them over, two at a time. Find the pairs that belong together.",
    fragment: "The light in the room felt a little thinner.",
    hint: "Flip two cards. If they match they stay lit. Only four pairs — remember where each one lives.",
    mount(ctx) {
      const symbols = ["✦", "✧", "❖", "✶"];
      let deck = symbols.concat(symbols);
      // shuffle
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }

      const grid = document.createElement("div");
      grid.className = "grid";
      grid.style.gridTemplateColumns = "repeat(4, auto)";
      ctx.el.appendChild(grid);

      let first = null, lock = false, matched = 0;
      const cards = [];

      deck.forEach((sym) => {
        const c = document.createElement("button");
        c.className = "card";
        c.textContent = sym;
        c.addEventListener("click", () => {
          if (lock || c.classList.contains("flipped") || c.classList.contains("matched")) return;
          c.classList.add("flipped");
          if (!first) { first = c; return; }
          if (first.textContent === c.textContent) {
            first.classList.add("matched"); c.classList.add("matched");
            first = null; matched++;
            if (matched === symbols.length) setTimeout(ctx.solve, 450);
          } else {
            lock = true;
            const a = first; first = null;
            setTimeout(() => { a.classList.remove("flipped"); c.classList.remove("flipped"); lock = false; }, 750);
          }
        });
        cards.push(c);
        grid.appendChild(c);
      });

      ctx.assist(() => { cards.forEach((c) => c.classList.add("matched")); setTimeout(ctx.solve, 400); });
    },
  },

  /* 8 — a tiny maze (arrow keys / dpad) --------------------- */
  {
    id: "maze",
    title: "a way through",
    prompt: "Move with the arrow keys (or the buttons). Carry the light to the far corner.",
    fragment: "The hallway had gone quiet.",
    hint: "The path is short. From the start, go right along the top, then find your way down the open squares.",
    mount(ctx) {
      // S = start, G = goal, # = wall, . = path
      const map = [
        "S...#",
        "###.#",
        "....#",
        ".####",
        "....G",
      ];
      const rows = map.length, cols = map[0].length;
      let pr = 0, pc = 0;
      let gr = 0, gc = 0;
      map.forEach((row, r) => row.split("").forEach((ch, c) => {
        if (ch === "S") { pr = r; pc = c; }
        if (ch === "G") { gr = r; gc = c; }
      }));

      const grid = document.createElement("div");
      grid.className = "maze";
      grid.style.gridTemplateColumns = `repeat(${cols}, auto)`;
      ctx.el.appendChild(grid);

      const cells = [];
      for (let r = 0; r < rows; r++) {
        cells[r] = [];
        for (let c = 0; c < cols; c++) {
          const cell = document.createElement("div");
          cell.className = "maze-cell";
          if (map[r][c] === "#") cell.classList.add("wall");
          if (map[r][c] === "G") cell.classList.add("goal");
          cells[r][c] = cell;
          grid.appendChild(cell);
        }
      }

      const player = document.createElement("div");
      player.className = "maze-player";

      function draw() {
        cells[pr][pc].appendChild(player);
        if (pr === gr && pc === gc) { cleanup(); setTimeout(ctx.solve, 300); }
      }
      function move(dr, dc) {
        const nr = pr + dr, nc = pc + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) return;
        if (map[nr][nc] === "#") return;
        pr = nr; pc = nc; draw();
      }
      function onKey(e) {
        const k = e.key;
        if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"].includes(k)) e.preventDefault();
        if (k === "ArrowUp" || k === "w") move(-1, 0);
        else if (k === "ArrowDown" || k === "s") move(1, 0);
        else if (k === "ArrowLeft" || k === "a") move(0, -1);
        else if (k === "ArrowRight" || k === "d") move(0, 1);
      }
      function cleanup() { window.removeEventListener("keydown", onKey); }
      window.addEventListener("keydown", onKey);

      // on-screen dpad for touch devices
      const pad = document.createElement("div");
      pad.className = "dpad";
      const layout = [ ["", "↑", ""], ["←", "↓", "→"] ];
      const dirs = { "↑": [-1,0], "↓": [1,0], "←": [0,-1], "→": [0,1] };
      layout.flat().forEach((label) => {
        const b = document.createElement("button");
        if (!label) { b.style.visibility = "hidden"; }
        else { b.textContent = label; b.addEventListener("click", () => move(...dirs[label])); }
        pad.appendChild(b);
      });
      ctx.el.appendChild(pad);

      draw();
      ctx.assist(() => { cleanup(); setTimeout(ctx.solve, 300); });
      // ensure listener is dropped if the engine tears the scene down
      ctx.el._cleanup = cleanup;
    },
  },

  /* 9 — text hidden with CSS opacity ------------------------ */
  {
    id: "opacity",
    title: "in plain sight",
    prompt: "One word here is almost the colour of the dark. Brush your cursor across the line to wake it, then type it.",
    fragment: "The desk sat exactly where I left it.",
    hint: "Hover over — or click-drag to select — the middle of the sentence. A hidden word glows. It is “quiet”.",
    mount(ctx) {
      const p = document.createElement("p");
      p.className = "hidden-para";
      p.innerHTML = `the room kept everything the same, the air stayed <span class="ghost">quiet</span> and still, as if it were holding its breath.`;
      ctx.el.appendChild(p);
      answerBox(ctx.el, { answers: ["quiet"], solve: ctx.solve, assist: ctx.assist, placeholder: "the hidden word" });
    },
  },

  /* 10 — match two identical symbols among near-copies ------ */
  {
    id: "twins",
    title: "two the same",
    prompt: "All of these look alike, but only two are truly identical. Find the pair and touch them both.",
    fragment: "But something small had changed.",
    hint: "Compare carefully — most differ by a tiny stroke. The matching pair are the two plain circles: ○ and ○.",
    mount(ctx) {
      // a field of near-identical glyphs; exactly two share the same character
      const decoys = ["◔","◕","◐","◑","◒","◓","☉","◍","◌","⊙","⊘","⦿","◉","⊚","◎"];
      const twin = "○";
      let field = decoys.slice(0, 14).concat([twin, twin]);
      for (let i = field.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [field[i], field[j]] = [field[j], field[i]];
      }

      const grid = document.createElement("div");
      grid.className = "grid";
      grid.style.gridTemplateColumns = "repeat(4, auto)";
      ctx.el.appendChild(grid);

      let picked = [];
      const nodes = [];
      field.forEach((sym) => {
        const s = document.createElement("button");
        s.className = "symbol";
        s.textContent = sym;
        s.dataset.sym = sym;
        s.addEventListener("click", () => {
          if (s.classList.contains("picked")) { s.classList.remove("picked"); picked = picked.filter((x) => x !== s); return; }
          s.classList.add("picked"); picked.push(s);
          if (picked.length === 2) {
            if (picked[0].dataset.sym === picked[1].dataset.sym) setTimeout(ctx.solve, 350);
            else {
              const [a, b] = picked;
              grid.classList.add("nudge-wrong");
              setTimeout(() => { a.classList.remove("picked"); b.classList.remove("picked"); grid.classList.remove("nudge-wrong"); }, 500);
            }
            picked = [];
          }
        });
        nodes.push(s);
        grid.appendChild(s);
      });

      ctx.assist(() => {
        nodes.filter((n) => n.dataset.sym === twin).forEach((n) => n.classList.add("picked"));
        setTimeout(ctx.solve, 400);
      });
    },
  },

  /* 11 — read the word inside an HTML comment --------------- */
  {
    id: "comment",
    title: "a note to itself",
    prompt: "Pages leave themselves little notes, tucked between marks the reader never sees. Here is one. Read what it hides.",
    fragment: "I looked closer than I wanted to.",
    hint: "In the panel, the coloured part between < !-- and --> is a comment. The word it names is the answer.",
    mount(ctx) {
      // A stylised "source view" so no dev-tools are needed — the comment
      // is right there on the page, rendered as text.
      const panel = document.createElement("pre");
      panel.className = "source-panel";
      panel.innerHTML =
`<span class="tag">&lt;div class="room"&gt;</span>
  <span class="tag">&lt;p&gt;</span>everything is where it should be<span class="tag">&lt;/p&gt;</span>
  <span class="comment">&lt;!-- some things stay behind and linger --&gt;</span>
<span class="tag">&lt;/div&gt;</span>`;
      ctx.el.appendChild(panel);
      answerBox(ctx.el, { answers: ["linger"], solve: ctx.solve, assist: ctx.assist, placeholder: "the word in the note" });
    },
  },

  /* 12 — a word revealed by turning up the brightness ------- */
  {
    id: "brightness",
    title: "turn up the light",
    prompt: "There is a word here, drawn almost in the dark. Slide the light up, slowly, until you can read it.",
    fragment: "A shape caught the light the wrong way.",
    hint: "Drag the slider to the right. As the picture brightens, a word appears: “scent”.",
    mount(ctx) {
      const wrap = document.createElement("div");
      wrap.className = "bright-wrap";
      const canvas = document.createElement("canvas");
      canvas.id = "bright-canvas";
      canvas.width = 380; canvas.height = 150;
      wrap.appendChild(canvas);

      const g = canvas.getContext("2d");
      g.fillStyle = "#07080c";
      g.fillRect(0, 0, canvas.width, canvas.height);
      // draw the word extremely faintly
      g.fillStyle = "rgba(120,124,150,0.045)";
      g.font = "700 62px Georgia, serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("scent", canvas.width / 2, canvas.height / 2);

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "1"; slider.max = "14"; slider.value = "1"; slider.step = "0.1";
      slider.addEventListener("input", () => { canvas.style.filter = `brightness(${slider.value})`; });
      wrap.appendChild(slider);
      ctx.el.appendChild(wrap);

      answerBox(ctx.el, { answers: ["scent"], solve: ctx.solve, assist: ctx.assist, placeholder: "the word in the light" });
    },
  },

  /* 13 — drag one object onto another ----------------------- */
  {
    id: "drag",
    title: "bring them together",
    prompt: "Take the small thing in your hand and set it down on the desk.",
    fragment: "I reached out, and then I stopped.",
    hint: "Press and hold the bottle, drag it over the dashed desk, and let go.",
    mount(ctx) {
      const field = document.createElement("div");
      field.className = "dragfield";
      const item = document.createElement("div");
      item.className = "drag-item";
      item.textContent = "🍶";
      const target = document.createElement("div");
      target.className = "drag-target";
      target.textContent = "the desk";
      field.appendChild(target);
      field.appendChild(item);
      ctx.el.appendChild(field);

      let dragging = false, ox = 0, oy = 0;

      function overlaps() {
        const a = item.getBoundingClientRect();
        const b = target.getBoundingClientRect();
        return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
      }
      function start(e) {
        dragging = true;
        const pt = e.touches ? e.touches[0] : e;
        const r = item.getBoundingClientRect();
        ox = pt.clientX - r.left; oy = pt.clientY - r.top;
        e.preventDefault();
      }
      function moveTo(e) {
        if (!dragging) return;
        const pt = e.touches ? e.touches[0] : e;
        const f = field.getBoundingClientRect();
        let x = pt.clientX - f.left - ox;
        let y = pt.clientY - f.top - oy;
        item.style.left = x + "px"; item.style.top = y + "px";
        target.classList.toggle("hot", overlaps());
        e.preventDefault();
      }
      function end() {
        if (!dragging) return;
        dragging = false;
        if (overlaps()) { target.classList.add("hot"); setTimeout(ctx.solve, 350); }
        else target.classList.remove("hot");
      }
      item.addEventListener("mousedown", start);
      item.addEventListener("touchstart", start, { passive: false });
      window.addEventListener("mousemove", moveTo);
      window.addEventListener("touchmove", moveTo, { passive: false });
      window.addEventListener("mouseup", end);
      window.addEventListener("touchend", end);

      function cleanup() {
        window.removeEventListener("mousemove", moveTo);
        window.removeEventListener("touchmove", moveTo);
        window.removeEventListener("mouseup", end);
        window.removeEventListener("touchend", end);
      }
      ctx.el._cleanup = cleanup;
      ctx.assist(() => { cleanup(); setTimeout(ctx.solve, 300); });
    },
  },

  /* 14 — Morse code, with a full reference table ------------ */
  {
    id: "morse",
    title: "spoken in dots",
    prompt: "A word tapped out in dots and dashes. Use the key below to hear what it says.",
    fragment: "Glass does not ask before it lets go.",
    hint: "Split at the spaces: --. is G, .-.. is L, .- is A, ... is S, ... is S → glass.",
    mount(ctx) {
      const plain = "glass";
      const table = {
        a:".-",b:"-...",c:"-.-.",d:"-..",e:".",f:"..-.",g:"--.",h:"....",
        i:"..",j:".---",k:"-.-",l:".-..",m:"--",n:"-.",o:"---",p:".--.",
        q:"--.-",r:".-.",s:"...",t:"-",u:"..-",v:"...-",w:".--",x:"-..-",
        y:"-.--",z:"--..",
      };
      const code = plain.split("").map((c) => table[c]).join(" ");

      const ciph = document.createElement("div");
      ciph.className = "cipher";
      ciph.textContent = code;
      ctx.el.appendChild(ciph);

      // only show the letters we actually need, to keep it calm
      const ref = document.createElement("div");
      ref.className = "reference";
      ref.innerHTML = "<b>morse key</b><br>" +
        [..."abcdefghijklmnopqrstuvwxyz"].map((c) => `${c} ${table[c]}`).join("&nbsp;&nbsp;·&nbsp;&nbsp;");
      ctx.el.appendChild(ref);

      answerBox(ctx.el, { answers: [plain], solve: ctx.solve, assist: ctx.assist, placeholder: "the word" });
    },
  },

  /* 15 — anagram: rearrange scattered letters --------------- */
  {
    id: "anagram",
    title: "out of order",
    prompt: "These five letters fell out of place. Set them right — they spell a word for what is left behind.",
    fragment: "Only a faint trace was left behind.",
    hint: "The letters C · A · E · R · T rearrange into “trace”.",
    mount(ctx) {
      const plain = "trace";
      const scrambled = plain.split("").sort(() => Math.random() - 0.5).join(" ").toUpperCase();
      const ciph = document.createElement("div");
      ciph.className = "cipher";
      ciph.textContent = scrambled;
      ctx.el.appendChild(ciph);
      answerBox(ctx.el, { answers: [plain], solve: ctx.solve, assist: ctx.assist, placeholder: "the word they spell" });
    },
  },

  /* 16 — complete the sentence (choices) -------------------- */
  {
    id: "sentence",
    title: "finish the thought",
    prompt: "Some sentences already know how they end. Choose the word that belongs.",
    fragment: "Some things end before they begin.",
    hint: "Read it aloud: “Some things ____ before they begin.” The quiet one is “end”.",
    mount(ctx) {
      const line = document.createElement("p");
      line.className = "prompt";
      line.innerHTML = `“Some things <b style="color:var(--accent)">_____</b> before they begin.”`;
      ctx.el.appendChild(line);

      const choices = ["bloom", "end", "wait"];
      const box = document.createElement("div");
      box.className = "choices";
      choices.forEach((word) => {
        const b = document.createElement("button");
        b.className = "choice";
        b.textContent = word;
        b.addEventListener("click", () => {
          if (word === "end") { b.style.borderColor = "var(--accent)"; setTimeout(ctx.solve, 300); }
          else { b.classList.add("nudge-wrong"); setTimeout(() => b.classList.remove("nudge-wrong"), 450); }
        });
        box.appendChild(b);
      });
      ctx.el.appendChild(box);
      ctx.assist(() => { setTimeout(ctx.solve, 200); });
    },
  },

  /* 17 — 3x3 slider puzzle (lightly scrambled) -------------- */
  {
    id: "slider",
    title: "back in order",
    prompt: "The tiles have wandered. Slide them until 1 through 8 sit in their places again.",
    fragment: "Not everything survives the waiting.",
    hint: "Click a tile next to the empty space to slide it there. It was only nudged a little out of order.",
    mount(ctx) {
      // solved state: 1..8 then blank(0)
      let tiles = [1,2,3,4,5,6,7,8,0];
      const size = 3;
      const idx = () => tiles.indexOf(0);
      const canMove = (i) => {
        const b = idx();
        const [r1,c1] = [Math.floor(i/size), i%size];
        const [r2,c2] = [Math.floor(b/size), b%size];
        return (Math.abs(r1-r2) + Math.abs(c1-c2)) === 1;
      };
      const swap = (i) => { const b = idx(); [tiles[i], tiles[b]] = [tiles[b], tiles[i]]; };

      // scramble with a handful of *valid* moves so it's always solvable & easy
      const neighbors = (b) => {
        const out = [];
        const [r,c] = [Math.floor(b/size), b%size];
        if (r>0) out.push(b-size); if (r<size-1) out.push(b+size);
        if (c>0) out.push(b-1); if (c<size-1) out.push(b+1);
        return out;
      };
      for (let s = 0; s < 12; s++) {
        const opts = neighbors(idx());
        const pick = opts[Math.floor(Math.random()*opts.length)];
        swap(pick);
      }

      const grid = document.createElement("div");
      grid.className = "slider-grid";
      ctx.el.appendChild(grid);

      function solved() { return tiles.slice(0,8).every((v,i) => v === i+1) && tiles[8] === 0; }
      function render() {
        grid.innerHTML = "";
        tiles.forEach((v, i) => {
          const t = document.createElement("button");
          t.className = "tile" + (v === 0 ? " blank" : "");
          t.textContent = v === 0 ? "" : v;
          if (v !== 0) t.addEventListener("click", () => { if (canMove(i)) { swap(i); render(); if (solved()) setTimeout(ctx.solve, 300); } });
          grid.appendChild(t);
        });
      }
      render();
      ctx.assist(() => { tiles = [1,2,3,4,5,6,7,8,0]; render(); setTimeout(ctx.solve, 300); });
    },
  },

  /* 18 — sequence recognition ------------------------------- */
  {
    id: "sequence",
    title: "what comes next",
    prompt: "A quiet pattern, counting itself. Choose the number that finishes it.",
    fragment: "I am learning to hold the trace, not the thing.",
    hint: "Each number is the one before it, doubled: 2, 4, 8, 16 … then 32.",
    mount(ctx) {
      const ciph = document.createElement("div");
      ciph.className = "cipher";
      ciph.textContent = "2  4  8  16  ?";
      ctx.el.appendChild(ciph);

      const choices = ["24", "32", "20"];
      const box = document.createElement("div");
      box.className = "choices";
      choices.forEach((n) => {
        const b = document.createElement("button");
        b.className = "choice";
        b.textContent = n;
        b.addEventListener("click", () => {
          if (n === "32") { b.style.borderColor = "var(--accent)"; setTimeout(ctx.solve, 300); }
          else { b.classList.add("nudge-wrong"); setTimeout(() => b.classList.remove("nudge-wrong"), 450); }
        });
        box.appendChild(b);
      });
      ctx.el.appendChild(box);
      ctx.assist(() => setTimeout(ctx.solve, 200));
    },
  },

  /* 19 — keyboard sequence (a small final gesture) ---------- */
  {
    id: "keys",
    title: "one last gesture",
    prompt: "Press these four keys, in order. Take your time between them.",
    fragment: "It's alright. It was almost mine.",
    hint: "Use the arrow keys on your keyboard (or tap the arrows): ↑ ↑ ↓ ↓.",
    mount(ctx) {
      const want = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown"];
      const glyph = { ArrowUp: "↑", ArrowDown: "↓" };
      let pos = 0;

      const seq = document.createElement("div");
      seq.className = "keyseq";
      const pips = want.map((k) => {
        const p = document.createElement("div");
        p.className = "keycap";
        p.textContent = glyph[k];
        seq.appendChild(p);
        return p;
      });
      ctx.el.appendChild(seq);

      function step(key) {
        if (key === want[pos]) {
          pips[pos].classList.add("hit");
          pos++;
          if (pos === want.length) { cleanup(); setTimeout(ctx.solve, 350); }
        } else {
          pos = 0;
          pips.forEach((p) => p.classList.remove("hit"));
        }
      }
      function onKey(e) {
        if (want.includes(e.key)) { e.preventDefault(); step(e.key); }
      }
      function cleanup() { window.removeEventListener("keydown", onKey); }
      window.addEventListener("keydown", onKey);
      ctx.el._cleanup = cleanup;

      // tappable arrows for touch devices
      const pad = document.createElement("div");
      pad.className = "row";
      [["↑","ArrowUp"],["↓","ArrowDown"]].forEach(([g,k]) => {
        const b = document.createElement("button");
        b.className = "btn subtle";
        b.textContent = g;
        b.addEventListener("click", () => step(k));
        pad.appendChild(b);
      });
      ctx.el.appendChild(pad);

      ctx.assist(() => { cleanup(); pips.forEach((p) => p.classList.add("hit")); setTimeout(ctx.solve, 300); });
    },
  },

];

// expose to the engine
window.CHALLENGES = CHALLENGES;
