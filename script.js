/* =============================================================
   script.js — the engine
   ---------------------------------------------------------------
   Responsibilities:
     • persistence (LocalStorage): which challenges are solved
     • ambient particle field
     • typewriter effect
     • mounting challenges one at a time, and the fragment reveal
     • the progress indicator + slowly shifting atmosphere
     • the fake ending, then the real ending (markdown viewer)

   No frameworks. No network. Fully offline.
   ============================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "quiet-room-progress-v1";
  const challenges = window.CHALLENGES || [];
  const TOTAL = challenges.length;

  /* ---------- DOM handles ---------- */
  const stage = document.getElementById("stage");
  const fill = document.getElementById("progress-fill");
  const label = document.getElementById("progress-label");
  const journalList = document.getElementById("journal-list");
  const ambient = document.getElementById("ambient");

  /* ---------- persistence ---------- */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage may be blocked; degrade gracefully */ }
    return { solved: [], fragments: {}, finished: false };
  }
  function saveState(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  }
  let state = loadState();

  function isSolved(id) { return state.solved.includes(id); }
  function markSolved(id, fragment) {
    if (!isSolved(id)) state.solved.push(id);
    state.fragments[id] = fragment;
    saveState(state);
  }

  /* ---------- atmosphere: progress drives a CSS variable ---------- */
  function updateProgress() {
    const done = state.solved.length;
    const ratio = TOTAL ? done / TOTAL : 0;
    document.body.style.setProperty("--p", ratio.toFixed(3));
    document.body.setAttribute("data-stage", String(done));
    fill.style.width = (ratio * 100).toFixed(1) + "%";
    label.textContent = done + " / " + TOTAL;
    window.STORY_PROGRESS = ratio; // read by the particle field
  }

  function refreshJournal() {
    journalList.innerHTML = "";
    challenges.forEach((c) => {
      if (state.fragments[c.id]) {
        const li = document.createElement("li");
        li.textContent = state.fragments[c.id];
        journalList.appendChild(li);
      }
    });
  }

  /* ---------- typewriter ---------- */
  // Types `text` into `node`. Returns a promise that resolves when done.
  // Clicking anywhere finishes it instantly (never make people wait).
  function typewrite(node, text, speed = 34) {
    return new Promise((resolve) => {
      node.textContent = "";
      node.classList.add("caret");
      let i = 0, done = false;
      function finish() {
        if (done) return;
        done = true;
        node.textContent = text;
        node.classList.remove("caret");
        window.removeEventListener("pointerdown", finish);
        resolve();
      }
      window.addEventListener("pointerdown", finish);
      (function tick() {
        if (done) return;
        if (i >= text.length) { finish(); return; }
        node.textContent += text.charAt(i++);
        setTimeout(tick, speed);
      })();
    });
  }

  /* ---------- scene transitions ---------- */
  function clearStage() {
    // give any active challenge a chance to remove global listeners
    const bodies = stage.querySelectorAll("[data-cleanup]");
    bodies.forEach((b) => { if (typeof b._cleanup === "function") b._cleanup(); });
    stage.innerHTML = "";
  }

  function buildScene() {
    const scene = document.createElement("div");
    scene.className = "scene";
    stage.appendChild(scene);
    return scene;
  }

  /* ---------- the current challenge ---------- */
  let assistFn = null; // registered per challenge by ctx.assist()

  async function showChallenge(index) {
    clearStage();
    const c = challenges[index];
    if (!c) { return; }
    assistFn = null;

    const scene = buildScene();

    const h = document.createElement("h2");
    scene.appendChild(h);

    const prompt = document.createElement("p");
    prompt.className = "prompt";
    scene.appendChild(prompt);

    const puzzle = document.createElement("div");
    puzzle.className = "puzzle";
    scene.appendChild(puzzle);

    // hint / "I'm stuck" area — the safety net so nothing frustrates
    const hintArea = document.createElement("div");
    hintArea.id = "hint-area";
    const stuckBtn = document.createElement("button");
    stuckBtn.className = "ghost-btn";
    stuckBtn.textContent = "i'm stuck";
    const hintText = document.createElement("div");
    hintText.className = "hint-text";
    hintText.style.display = "none";
    let stuckStage = 0;
    stuckBtn.addEventListener("click", () => {
      if (stuckStage === 0) {
        hintText.textContent = c.hint || "look gently — the clue is close.";
        hintText.style.display = "block";
        stuckBtn.textContent = "show me";
        stuckStage = 1;
      } else {
        if (typeof assistFn === "function") assistFn();
        stuckBtn.textContent = "…";
      }
    });
    hintArea.appendChild(stuckBtn);
    hintArea.appendChild(hintText);
    scene.appendChild(hintArea);

    // typewrite the title, then the prompt, then let the puzzle appear
    await typewrite(h, c.title, 30);
    await typewrite(prompt, c.prompt, 22);

    // mark the puzzle container so cleanup can find it
    puzzle.setAttribute("data-cleanup", "");

    let solvedOnce = false;
    const ctx = {
      el: puzzle,
      solve: () => { if (!solvedOnce) { solvedOnce = true; onSolved(index, c); } },
      assist: (fn) => { assistFn = fn; },
    };
    // challenges that add global listeners attach a puzzle._cleanup function;
    // clearStage() finds it via the [data-cleanup] marker set above.
    c.mount(ctx);
  }

  /* ---------- when a challenge is solved ---------- */
  async function onSolved(index, c) {
    markSolved(c.id, c.fragment);
    updateProgress();
    refreshJournal();

    // fade the current scene out
    const scene = stage.querySelector(".scene");
    if (scene) scene.classList.add("leaving");
    await wait(650);
    clearStage();

    // reveal the fragment on its own quiet screen
    const rscene = buildScene();
    const cap = document.createElement("span");
    cap.className = "fragment-cap";
    cap.textContent = "you found";
    const frag = document.createElement("p");
    frag.className = "fragment";
    rscene.appendChild(cap);
    rscene.appendChild(frag);

    await typewrite(frag, c.fragment, 42);
    await wait(500);

    const next = index + 1;
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.style.marginTop = "1.6rem";
    btn.textContent = next < TOTAL ? "go on" : "…";
    btn.style.opacity = "0";
    btn.style.transition = "opacity 1.2s ease";
    rscene.appendChild(btn);
    requestAnimationFrame(() => { btn.style.opacity = "1"; });

    btn.addEventListener("click", async () => {
      rscene.classList.add("leaving");
      await wait(600);
      if (next < TOTAL) showChallenge(next);
      else showFakeEnding();
    }, { once: true });
  }

  /* ---------- the fake ending ---------- */
  function showFakeEnding() {
    clearStage();
    const scene = buildScene();
    scene.classList.add("fake-end");

    const big = document.createElement("p");
    big.className = "big";
    scene.appendChild(big);

    const sub = document.createElement("p");
    sub.className = "prompt";
    scene.appendChild(sub);

    // an obvious-looking "end" button that isn't really the end
    const restBtn = document.createElement("button");
    restBtn.className = "btn subtle";
    restBtn.style.marginTop = "1.4rem";
    restBtn.textContent = "close your eyes";

    // the true continuation — barely visible, warms on hover, then glows
    const linger = document.createElement("span");
    linger.className = "linger";
    linger.textContent = "…but something still lingers in the air.";

    typewrite(big, "— the end —", 60).then(() =>
      typewrite(sub, "Thank you for staying this long. You can rest now.", 24)
    ).then(() => {
      scene.appendChild(document.createElement("br"));
      scene.appendChild(restBtn);
      scene.appendChild(document.createElement("br"));
      scene.appendChild(linger);
      // kindness: after a moment, the true path reveals itself
      setTimeout(() => linger.classList.add("nudge"), 6000);
    });

    // clicking "the end" gently admits it isn't
    restBtn.addEventListener("click", () => {
      sub.textContent = "…and yet the room does not feel finished.";
      linger.classList.add("nudge");
    });

    linger.addEventListener("click", async () => {
      scene.classList.add("leaving");
      await wait(700);
      showRealEnding();
    });
  }

  /* ---------- the real ending: fade to black + markdown ---------- */

  // The finale markdown — rendered EXACTLY as written, untouched.
  const ENDING_MD = [
    "--------------------------------",
    "",
    "# *It's a Story About Pantat Botol*",
    "",
    "In a few days, there will be a small celebration.",
    "",
    "I wanted to show up as the best version of myself. Wearing neatly pressed clothes, then spraying on the sweet fragrance I had saved for moments worth remembering.",
    "",
    "But when my eyes fell upon the perfume bottle resting on my desk, I froze.",
    "",
    "It had already shattered.",
    "",
    "Before I ever had the chance to touch it.",
    "",
    "Somehow, it felt as though life was trying to tell me something.",
    "",
    "Some things break before we ever get to call them ours.",
    "",
    "Some hopes fall apart before they ever have the chance to become real.",
    "",
    "All that remains is a faint trace of its fragrance just enough to remind me that there was once something I had hoped to carry into a beautiful day.",
    "",
    "--------------------------------",
  ].join("\n");

  // A tiny, faithful markdown renderer: #, *italic*, --- rules, paragraphs.
  function renderMarkdown(md) {
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const inline = (s) => esc(s).replace(/\*([^*]+)\*/g, "<em>$1</em>");
    const lines = md.split("\n");
    const out = [];
    let para = [];
    const flush = () => {
      if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; }
    };
    for (const line of lines) {
      const t = line.trim();
      if (t === "") { flush(); }
      else if (/^-{3,}$/.test(t)) { flush(); out.push("<hr>"); }
      else if (t.startsWith("# ")) { flush(); out.push("<h1>" + inline(t.slice(2)) + "</h1>"); }
      else { para.push(t); }
    }
    flush();
    return out.join("\n");
  }

  function showRealEnding() {
    state.finished = true;
    saveState(state);
    clearStage();

    // fade the whole world to black
    document.body.classList.add("blackout");

    const veil = document.createElement("div");
    veil.className = "final-veil";
    document.body.appendChild(veil);

    const md = document.createElement("div");
    md.className = "md";
    md.innerHTML = renderMarkdown(ENDING_MD);
    veil.appendChild(md);

    // only one button: Restart Journey
    const restart = document.createElement("button");
    restart.className = "btn restart-final";
    restart.textContent = "restart journey";
    restart.addEventListener("click", restartJourney);
    md.appendChild(restart);
  }

  function restartJourney() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    // reset in-memory state and reload to challenge one
    state = { solved: [], fragments: {}, finished: false };
    location.reload();
  }

  /* ---------- small utilities ---------- */
  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  /* ---------- ambient particle field ---------- */
  function initParticles() {
    const canvas = document.getElementById("particles");
    const g = canvas.getContext("2d");
    let w, h, particles;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.min(70, Math.floor((w * h) / 26000));
      particles = Array.from({ length: count }, () => spawn());
    }
    function spawn() {
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.6 + 0.4,
        vy: -(Math.random() * 0.25 + 0.05),
        vx: (Math.random() - 0.5) * 0.15,
        a: Math.random() * 0.5 + 0.1,
        tw: Math.random() * Math.PI * 2, // twinkle phase
      };
    }
    function frame() {
      g.clearRect(0, 0, w, h);
      const p = window.STORY_PROGRESS || 0;
      // as the story deepens, particles dim and slow — the room grows heavier
      const dim = 1 - p * 0.6;
      for (const s of particles) {
        s.y += s.vy * (1 - p * 0.4);
        s.x += s.vx;
        s.tw += 0.02;
        if (s.y < -5) { s.y = h + 5; s.x = Math.random() * w; }
        if (s.x < -5) s.x = w + 5;
        if (s.x > w + 5) s.x = -5;
        const twinkle = 0.6 + Math.sin(s.tw) * 0.4;
        const alpha = s.a * twinkle * dim;
        // colour cools with progress (warm amber -> pale ash)
        const hue = 40 - p * 30;
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        g.fillStyle = `hsla(${hue}, ${50 - p * 40}%, ${80}%, ${alpha})`;
        g.fill();
      }
      requestAnimationFrame(frame);
    }
    window.addEventListener("resize", resize);
    resize();
    frame();
  }

  /* ---------- controls: audio + restart + journal ---------- */
  function initControls() {
    const audioBtn = document.getElementById("audio-toggle");
    let playing = false;
    audioBtn.addEventListener("click", () => {
      if (!ambient) return;
      if (playing) { ambient.pause(); audioBtn.textContent = "♪ off"; playing = false; }
      else {
        // will silently do nothing if no assets/ambient.mp3 is present
        const pr = ambient.play();
        if (pr && pr.catch) pr.catch(() => {});
        audioBtn.textContent = "♪ on"; playing = true;
      }
    });

    document.getElementById("restart-top").addEventListener("click", () => {
      if (confirm("Start the journey over from the beginning?")) restartJourney();
    });

    const journal = document.getElementById("journal");
    document.getElementById("journal-toggle").addEventListener("click", () => {
      journal.classList.toggle("open");
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    // always begin from the very start on every visit —
    // wipe any saved progress so no session ever resumes mid-story.
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    state = { solved: [], fragments: {}, finished: false };

    initParticles();
    initControls();
    updateProgress();
    refreshJournal();

    // always open on the first challenge
    showChallenge(0);
  }

  document.addEventListener("DOMContentLoaded", boot);

  /* a small easter egg for the curious console-opener */
  try {
    console.log("%cthe bottle was full, once.", "color:#c79a5a;font-style:italic;font-size:13px;");
    console.log("%cyou don't need to be in here to find the way. only patient.", "color:#666;");
  } catch (e) {}
})();
