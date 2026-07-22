/* =============================================================
   debug/debug.js  —  LOCAL DEBUG TOOL, NOT SHIPPED TO GITHUB
   ---------------------------------------------------------------
   Activated only when the page is opened with ?debug in the URL,
   e.g.  index.html?debug  (see the debug bridge in script.js).

   It reads window.__ROOM__ (exposed by script.js in debug mode)
   and adds a floating panel so you can jump anywhere without
   solving every puzzle first — most usefully, straight to the
   real ending that renders markdown/ending.md.
   ============================================================= */
(function () {
  "use strict";

  function start() {
    const ROOM = window.__ROOM__;
    if (!ROOM) {
      console.warn("[debug] window.__ROOM__ missing — open the page with ?debug.");
      return;
    }
    console.log("%c[debug] panel loaded", "color:#7fd1c0;font-weight:bold;");

    /* ---------- styles ---------- */
    const style = document.createElement("style");
    style.textContent = `
      #debug-panel{position:fixed;top:10px;right:10px;z-index:99999;
        max-height:90vh;overflow:auto;width:230px;font:12px/1.4 monospace;
        background:rgba(12,12,16,.92);color:#d8d8d8;border:1px solid #444;
        border-radius:8px;padding:10px;box-shadow:0 6px 24px rgba(0,0,0,.5)}
      #debug-panel h4{margin:0 0 6px;font-size:12px;color:#7fd1c0;
        letter-spacing:.5px;display:flex;justify-content:space-between;align-items:center}
      #debug-panel h4 button{all:unset;cursor:pointer;color:#888;font-size:14px;padding:0 4px}
      #debug-panel .grp{margin:8px 0;border-top:1px solid #333;padding-top:8px}
      #debug-panel .grp:first-of-type{border-top:0;padding-top:0}
      #debug-panel button.d{display:block;width:100%;text-align:left;
        margin:3px 0;padding:5px 7px;background:#1d1d24;color:#ddd;border:1px solid #3a3a45;
        border-radius:5px;cursor:pointer;font:11px/1.2 monospace}
      #debug-panel button.d:hover{background:#2a2a34;border-color:#7fd1c0}
      #debug-panel button.d.primary{background:#204840;border-color:#7fd1c0;color:#bfeee2}
      #debug-panel .lst{max-height:260px;overflow:auto}
      #debug-panel.min .grp,#debug-panel.min .lst{display:none}
    `;
    document.head.appendChild(style);

    /* ---------- panel shell ---------- */
    const panel = document.createElement("div");
    panel.id = "debug-panel";
    document.body.appendChild(panel);

    const title = document.createElement("h4");
    title.innerHTML = "<span>DEBUG</span>";
    const minBtn = document.createElement("button");
    minBtn.textContent = "–";
    minBtn.title = "minimise";
    minBtn.onclick = () => panel.classList.toggle("min");
    title.appendChild(minBtn);
    panel.appendChild(title);

    const mkBtn = (label, fn, primary) => {
      const b = document.createElement("button");
      b.className = "d" + (primary ? " primary" : "");
      b.textContent = label;
      b.onclick = fn;
      return b;
    };
    const grp = () => {
      const d = document.createElement("div");
      d.className = "grp";
      panel.appendChild(d);
      return d;
    };

    /* ---------- shortcuts ---------- */
    const g1 = grp();
    g1.appendChild(mkBtn("▶ Show real ending (ending.md)", () => ROOM.showRealEnding(), true));
    g1.appendChild(mkBtn("Show fake ending", () => ROOM.showFakeEnding()));
    g1.appendChild(mkBtn("Solve ALL puzzles", () => {
      ROOM.challenges.forEach((c) => ROOM.markSolved(c.id, c.fragment));
      ROOM.updateProgress();
      ROOM.refreshJournal();
      console.log("[debug] all puzzles marked solved.");
    }));
    g1.appendChild(mkBtn("Preview ending.md in console", async () => {
      const md = await ROOM.loadEndingMarkdown();
      console.log("%c[debug] markdown/ending.md:\n" + md, "color:#c79a5a;");
    }));

    /* ---------- jump to any challenge ---------- */
    const g2 = grp();
    const lbl = document.createElement("div");
    lbl.textContent = "Jump to challenge:";
    lbl.style.margin = "0 0 4px";
    lbl.style.color = "#888";
    g2.appendChild(lbl);
    const lst = document.createElement("div");
    lst.className = "lst";
    g2.appendChild(lst);
    ROOM.challenges.forEach((c, i) => {
      lst.appendChild(mkBtn(`${String(i + 1).padStart(2, "0")}  ${c.title}`,
        () => ROOM.showChallenge(i)));
    });

    console.log("[debug] tip: current state is available as window.__ROOM__.state");
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
