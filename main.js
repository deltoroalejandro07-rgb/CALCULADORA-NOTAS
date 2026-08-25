(function () {
  "use strict";

  var APP = window.__APP__ || { systems: {}, colors: ["#2f7d6b"], storageKey: "notaclara_v1" };

  /* ---------------------------------------------------------------
     Helpers
     --------------------------------------------------------------- */
  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var escHTML = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function round1(n) { return Math.round(n * 10) / 10; }
  function roundTo(n, d) { var f = Math.pow(10, d); return Math.round(n * f) / f; }
  var uidCounter = 0;
  function uid(prefix) { uidCounter++; return prefix + "_" + Date.now().toString(36) + "_" + uidCounter; }

  var ICON_TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>';
  var ICON_PLUS = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  var ICON_PLUS_BIG = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  var ICON_X = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var ICON_TARGET = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/></svg>';
  var ICON_CHECK = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  var ICON_WARN = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4m0 4h.01M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>';
  var WARN_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M12 9v4m0 4h.01M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>';

  /* ---------------------------------------------------------------
     Grade-system conversions (canonical scale is 0-100 "pct")
     --------------------------------------------------------------- */
  function displayToPct(value, sys) { return (value - sys.min) / (sys.max - sys.min) * 100; }
  function pctToDisplay(pct, sys) { return sys.min + (pct / 100) * (sys.max - sys.min); }
  function pctToLetterEntry(pct, sys) {
    var letters = sys.letters || [];
    for (var i = 0; i < letters.length; i++) {
      if (pct >= letters[i].min - 1e-9) return letters[i];
    }
    return letters[letters.length - 1] || { g: "F", val: 0, min: 0 };
  }
  function zoneOf(pct, sys) {
    if (pct == null) return null;
    if (pct < sys.passPct) return "fail";
    var amberEdge = sys.passPct + (100 - sys.passPct) * 0.25;
    return pct < amberEdge ? "warn" : "pass";
  }
  function formatScoreValue(pct, sys) {
    if (pct == null) return "—";
    if (sys.id === "letter") return pctToLetterEntry(pct, sys).g;
    return formatScoreValue.decimalsFor(sys, pct);
  }
  formatScoreValue.decimalsFor = function (sys, pct) {
    return roundTo(pctToDisplay(pct, sys), sys.decimals).toFixed(sys.decimals);
  };
  function formatScoreSuffix(pct, sys) {
    if (sys.id === "10") return "/10";
    if (sys.id === "100") return "/100";
    return pct == null ? "" : Math.round(pct) + "%";
  }
  function formatScoreFull(pct, sys) {
    if (pct == null) return "—";
    if (sys.id === "letter") {
      var e = pctToLetterEntry(pct, sys);
      return e.g + " (" + Math.round(clamp(pct, 0, 100)) + "%)";
    }
    return formatScoreValue(pct, sys) + formatScoreSuffix(pct, sys);
  }

  /* ---------------------------------------------------------------
     State — localStorage
     --------------------------------------------------------------- */
  function loadState() {
    try {
      var raw = localStorage.getItem(APP.storageKey);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.subjects) || !parsed.subjects.length) return null;
      return parsed;
    } catch (e) { return null; }
  }
  function seedDemoState() {
    return {
      system: "10",
      subjects: [{
        id: uid("s"), name: "Matemáticas", color: APP.colors[0],
        goalOpen: false, goalTargetPct: null,
        grades: [
          { id: uid("g"), name: "Examen parcial", scorePct: 72, weightPct: 40, pending: false },
          { id: uid("g"), name: "Trabajo en grupo", scorePct: 85, weightPct: 20, pending: false },
          { id: uid("g"), name: "Examen final", scorePct: null, weightPct: 40, pending: true }
        ]
      }]
    };
  }

  var state = loadState() || seedDemoState();
  if (!state.system || !APP.systems[state.system]) state.system = "10";
  var simState = {}; // { subjectId: { gradeId: simulatedPct } } — runtime only, not persisted

  var saveTimer = null;
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(APP.storageKey, JSON.stringify(state)); } catch (e) {}
    }, 250);
  }

  function findSubject(id) {
    for (var i = 0; i < state.subjects.length; i++) if (state.subjects[i].id === id) return state.subjects[i];
    return null;
  }

  /* ---------------------------------------------------------------
     Calculations
     --------------------------------------------------------------- */
  function computeSubjectStats(sub) {
    var sumSW = 0, evalW = 0, weightSum = 0;
    sub.grades.forEach(function (g) {
      var w = Number(g.weightPct); if (!isFinite(w)) w = 0;
      weightSum += w;
      if (!g.pending && g.scorePct != null && isFinite(g.scorePct)) {
        sumSW += g.scorePct * w;
        evalW += w;
      }
    });
    return {
      weightSum: weightSum,
      evaluatedWeight: evalW,
      contributedPct: sumSW / 100,
      displayPct: evalW > 0 ? sumSW / evalW : null
    };
  }

  function computeGoal(sub, targetPct, contributedPct) {
    var pendingItems = sub.grades.filter(function (g) { return g.pending; });
    var Wp = pendingItems.reduce(function (a, g) { var w = Number(g.weightPct); return a + (isFinite(w) ? w : 0); }, 0);
    var minFinal = contributedPct;
    var maxFinal = contributedPct + Wp;
    var status, neededPct = null;
    if (pendingItems.length === 0) {
      status = contributedPct >= targetPct - 1e-9 ? "guaranteed" : "impossible";
    } else if (targetPct <= minFinal + 1e-9) {
      status = "guaranteed";
    } else if (targetPct > maxFinal + 1e-9) {
      status = "impossible";
    } else {
      status = "ok";
      neededPct = Wp > 0 ? (targetPct - contributedPct) * 100 / Wp : null;
    }
    return { status: status, neededPct: neededPct, minFinal: minFinal, maxFinal: maxFinal, pendingItems: pendingItems, Wp: Wp };
  }

  /* ---------------------------------------------------------------
     Ring (SVG progress circle)
     --------------------------------------------------------------- */
  function ringGeom(size, stroke) { var r = (size - stroke) / 2; return { r: r, c: 2 * Math.PI * r }; }

  function ringHTML(pct, sys, size, stroke, extraAttrs) {
    var g = ringGeom(size, stroke);
    var frac = pct == null ? 0 : clamp(pct, 0, 100) / 100;
    var offset = g.c - frac * g.c;
    var z = pct == null ? null : zoneOf(pct, sys);
    var zclass = z === "fail" ? "is-fail" : z === "warn" ? "is-warn" : "";
    var val = pct == null ? "—" : formatScoreValue(pct, sys);
    var suf = pct == null ? "" : formatScoreSuffix(pct, sys);
    return '<div class="ring ' + zclass + '" style="width:' + size + 'px;height:' + size + 'px" data-circumference="' + g.c + '" data-prev-pct="' + (pct == null ? "" : pct) + '" ' + (extraAttrs || "") + '>' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle class="ring-track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + g.r + '" stroke-width="' + stroke + '"></circle>' +
      '<circle class="ring-value" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + g.r + '" stroke-width="' + stroke + '" stroke-dasharray="' + g.c + '" stroke-dashoffset="' + offset + '"></circle>' +
      '</svg>' +
      '<div class="ring-center"><span class="val">' + escHTML(val) + '</span>' + (suf ? '<span class="max">' + escHTML(suf) + '</span>' : '') + '</div>' +
      '</div>';
  }

  function setRing(el, pct, sys) {
    if (!el) return;
    var circle = el.querySelector(".ring-value");
    var C = parseFloat(el.dataset.circumference);
    var frac = pct == null ? 0 : clamp(pct, 0, 100) / 100;
    var offset = C - frac * C;
    if (circle) circle.style.strokeDashoffset = String(offset);
    el.classList.remove("is-fail", "is-warn");
    if (pct != null) {
      var z = zoneOf(pct, sys);
      if (z === "fail") el.classList.add("is-fail");
      else if (z === "warn") el.classList.add("is-warn");
    }
    var valEl = el.querySelector(".ring-center .val");
    var maxEl = el.querySelector(".ring-center .max");
    if (valEl) valEl.textContent = pct == null ? "—" : formatScoreValue(pct, sys);
    if (maxEl) maxEl.textContent = pct == null ? "" : formatScoreSuffix(pct, sys);
    var prev = el.dataset.prevPct;
    var prevNum = prev === "" || prev == null ? null : parseFloat(prev);
    var changed = (prevNum == null && pct != null) || (prevNum != null && pct == null) ||
      (prevNum != null && pct != null && Math.round(prevNum) !== Math.round(pct));
    if (changed) {
      el.classList.remove("pulse");
      void el.offsetWidth;
      el.classList.add("pulse");
    }
    el.dataset.prevPct = pct == null ? "" : String(pct);
  }

  /* ---------------------------------------------------------------
     Templates — subject card
     --------------------------------------------------------------- */
  function renderNumberScore(g, sys) {
    var v = g.scorePct == null ? "" : roundTo(pctToDisplay(g.scorePct, sys), sys.decimals);
    return '<input class="num-input" data-role="grade-score" type="number" inputmode="decimal" min="' + sys.min + '" max="' + sys.max + '" step="' + sys.step + '" value="' + v + '" placeholder="—"' + (g.pending ? " disabled" : "") + ' aria-label="Nota obtenida">';
  }
  function renderLetterSelect(g, sys) {
    var current = g.scorePct == null ? "" : String(pctToLetterEntry(g.scorePct, sys).val);
    var opts = '<option value=""' + (current === "" ? " selected" : "") + '>—</option>' +
      sys.letters.map(function (l) {
        return '<option value="' + l.val + '"' + (String(l.val) === current ? " selected" : "") + '>' + l.g + "</option>";
      }).join("");
    return '<select class="letter-select" data-role="grade-score-letter"' + (g.pending ? " disabled" : "") + ' aria-label="Nota obtenida">' + opts + "</select>";
  }
  function renderGradeRow(sub, g, sys) {
    var scoreField = sys.id === "letter" ? renderLetterSelect(g, sys) : renderNumberScore(g, sys);
    return '' +
      '<div class="grade-row' + (g.pending ? " is-pending" : "") + '" data-grade="' + g.id + '">' +
      '<input class="grade-name-input" data-role="grade-name" value="' + escHTML(g.name) + '" maxlength="40" aria-label="Nombre de la evaluación">' +
      '<div class="grade-row-controls">' +
      '<div class="grade-field">' + scoreField + "</div>" +
      '<div class="grade-field"><input class="num-input weight-input" data-role="grade-weight" type="number" inputmode="decimal" min="0" max="100" step="0.1" value="' + (g.weightPct == null ? "" : g.weightPct) + '" aria-label="Peso en porcentaje" placeholder="%"><label>%</label></div>' +
      '<label class="pending-toggle' + (g.pending ? " is-on" : "") + '"><input type="checkbox" data-role="grade-pending"' + (g.pending ? " checked" : "") + "> Pendiente</label>" +
      '<div class="row-actions"><button type="button" class="btn-icon row-delete" data-role="delete-grade" aria-label="Eliminar evaluación" title="Eliminar evaluación">' + ICON_X + "</button></div>" +
      "</div>" +
      "</div>";
  }

  function buildShortcutsHTML(sub, sys) {
    return sys.shortcuts.map(function (s) {
      var pct = displayToPct(s.value, sys);
      var active = sub.goalTargetPct != null && Math.abs(pct - sub.goalTargetPct) < 0.05;
      return '<button type="button" class="goal-chip' + (active ? " is-active" : "") + '" data-role="goal-chip" data-pct="' + pct + '">' + escHTML(s.label) + "</button>";
    }).join("");
  }

  function renderGoalLetterSelect(sub, sys, targetPct) {
    var current = targetPct == null ? "" : String(pctToLetterEntry(targetPct, sys).val);
    var opts = sys.letters.map(function (l) {
      return '<option value="' + l.val + '"' + (String(l.val) === current ? " selected" : "") + '>' + l.g + "</option>";
    }).join("");
    return '<select id="goal-custom-' + sub.id + '" class="letter-select" data-role="goal-custom-letter">' + opts + "</select>";
  }

  function renderSimSliders(sub, sys, goal, contributedPct) {
    if (!simState[sub.id]) simState[sub.id] = {};
    var simMap = simState[sub.id];
    var itemsHTML = goal.pendingItems.map(function (g) {
      if (simMap[g.id] == null) {
        var seed = goal.neededPct == null ? (goal.status === "impossible" ? 100 : 0) : goal.neededPct;
        simMap[g.id] = clamp(seed, 0, 100);
      }
      var pctVal = simMap[g.id];
      var dispVal = roundTo(pctToDisplay(pctVal, sys), sys.decimals);
      return '<div class="sim-item"><div class="sim-item-head"><span>' + escHTML(g.name || "Evaluación pendiente") + '</span><span class="sim-value" data-role="sim-value">' + formatScoreFull(pctVal, sys) + '</span></div>' +
        '<input type="range" class="slider" data-role="sim-slider" data-grade="' + g.id + '" min="' + sys.min + '" max="' + sys.max + '" step="' + sys.step + '" value="' + dispVal + '" style="--pct:' + pctVal + '%" aria-label="Simular nota en ' + escHTML(g.name || "esta evaluación") + '"></div>';
    });
    var simFinalPct = contributedPct + goal.pendingItems.reduce(function (a, g) {
      var w = Number(g.weightPct) || 0;
      var sv = simMap[g.id];
      return a + ((sv == null ? 0 : sv) * w / 100);
    }, 0);
    return '<div class="sim-list" data-role="sim-list">' + itemsHTML.join("") + '</div>' +
      '<div class="sim-final" data-role="sim-final">Con estos valores, tu nota final sería <strong data-role="sim-final-value">' + formatScoreFull(clamp(simFinalPct, 0, 100), sys) + "</strong></div>";
  }

  function renderGoalResult(sub, sys, stats, targetPct) {
    var goal = computeGoal(sub, targetPct, stats.contributedPct);
    var stateClass = goal.status === "ok" ? "" : goal.status === "guaranteed" ? "state-guaranteed" : "state-impossible";
    var headline, detail;
    if (goal.status === "guaranteed") {
      headline = ICON_CHECK + " ¡Objetivo garantizado!";
      detail = "Incluso sacando un 0 en lo que te queda, ya llegarías a " + formatScoreFull(clamp(goal.minFinal, 0, 100), sys) + ".";
    } else if (goal.status === "impossible") {
      headline = ICON_WARN + " Objetivo matemáticamente imposible";
      detail = "Aunque saques la nota máxima en lo pendiente, tu mejor resultado posible es " + formatScoreFull(clamp(goal.maxFinal, 0, 100), sys) + ".";
    } else if (goal.pendingItems.length === 1) {
      headline = "Necesitas sacar " + formatScoreFull(clamp(goal.neededPct, 0, 100), sys) + ' en "' + escHTML(goal.pendingItems[0].name || "esa evaluación") + '"';
      detail = "Es la nota mínima exacta en esa evaluación pendiente para llegar a tu objetivo.";
    } else {
      headline = "Necesitas una media de " + formatScoreFull(clamp(goal.neededPct, 0, 100), sys) + " en lo pendiente";
      detail = "Suponiendo una nota parecida en cada una de las " + goal.pendingItems.length + " evaluaciones que te quedan (" + round1(goal.Wp) + "% del total). Mueve los controles de abajo para repartir de otra forma.";
    }
    var simHTML = (goal.status === "ok" && goal.pendingItems.length) ? renderSimSliders(sub, sys, goal, stats.contributedPct) : "";
    return '<div class="goal-result unlocked ' + stateClass + '" data-role="goal-result">' +
      '<div class="goal-result-headline">' + headline + "</div>" +
      '<div class="goal-result-detail">' + detail + "</div>" +
      simHTML +
      "</div>";
  }

  function renderGoalPanel(sub, sys, stats) {
    var open = sub.goalOpen;
    var targetPct = sub.goalTargetPct;
    var customVal = targetPct == null ? "" : roundTo(pctToDisplay(targetPct, sys), sys.decimals);
    var resultHTML = targetPct == null ? "" : renderGoalResult(sub, sys, stats, targetPct);
    return '' +
      '<div class="goal-panel' + (open ? " is-open" : "") + '" data-role="goal-panel">' +
      "<strong>¿Qué nota final quieres conseguir?</strong>" +
      '<div class="goal-shortcuts" data-role="goal-shortcuts">' + buildShortcutsHTML(sub, sys) + "</div>" +
      '<div class="goal-custom">' +
      '<label for="goal-custom-' + sub.id + '">O elige un valor exacto:</label>' +
      (sys.id === "letter"
        ? renderGoalLetterSelect(sub, sys, targetPct)
        : '<input id="goal-custom-' + sub.id + '" class="num-input" data-role="goal-custom" type="number" inputmode="decimal" min="' + sys.min + '" max="' + sys.max + '" step="' + sys.step + '" value="' + customVal + '">'
      ) +
      "</div>" +
      '<div data-role="goal-result-wrap">' + resultHTML + "</div>" +
      "</div>";
  }

  function renderSubjectCard(sub) {
    var sys = APP.systems[state.system];
    var stats = computeSubjectStats(sub);
    var z = stats.displayPct == null ? null : zoneOf(stats.displayPct, sys);
    var badgeClass = z === "fail" ? "badge-fail" : z === "warn" ? "badge-warn" : z === "pass" ? "badge-pass" : "";
    var badgeText = z === "fail" ? "Suspende" : z === "warn" ? "Aprueba justo" : z === "pass" ? "Vas bien" : "Sin datos";
    var weightPctBar = clamp(stats.weightSum, 0, 100);
    var overW = stats.weightSum - 100;
    var warnVisible = Math.abs(overW) > 0.5;
    var warnText = overW > 0
      ? "Los pesos suman " + round1(stats.weightSum) + "% — sobran " + round1(overW) + " puntos porcentuales."
      : "Los pesos suman " + round1(stats.weightSum) + "% — te faltan " + round1(-overW) + " puntos porcentuales para llegar a 100%.";

    var rowsHTML = sub.grades.map(function (g) { return renderGradeRow(sub, g, sys); }).join("");
    var colorsHTML = APP.colors.map(function (c) {
      return '<button type="button" class="color-dot' + (c === sub.color ? " is-active" : "") + '" style="background:' + c + '" data-role="color-dot" data-color="' + c + '" aria-label="Elegir color"></button>';
    }).join("");

    return '' +
      '<article class="card subject-card" data-subject="' + sub.id + '" style="--subject-color:' + sub.color + '">' +
      '<div class="subject-head">' +
      '<input class="subject-name-input" data-role="subject-name" value="' + escHTML(sub.name) + '" aria-label="Nombre de la asignatura" maxlength="60">' +
      '<button type="button" class="btn-icon" data-role="delete-subject" title="Eliminar asignatura" aria-label="Eliminar asignatura">' + ICON_TRASH + "</button>" +
      "</div>" +
      '<div class="color-dots" role="group" aria-label="Color de la asignatura">' + colorsHTML + "</div>" +
      '<div class="subject-body">' +
      '<div class="subject-main">' +
      ringHTML(stats.displayPct, sys, 76, 8, 'data-role="subject-ring"') +
      '<div class="subject-metrics">' +
      '<span class="badge ' + badgeClass + '" data-role="subject-badge">' + badgeText + "</span>" +
      '<div class="weight-meter"><div class="weight-meter-fill" data-role="weight-fill" style="width:' + weightPctBar + '%"></div></div>' +
      '<div class="weight-meter-label" data-role="evaluated-label"><strong>' + round1(stats.evaluatedWeight) + "%</strong> de la nota ya está decidido</div>" +
      "</div>" +
      "</div>" +
      '<div class="weight-warn' + (warnVisible ? " is-visible" : "") + '" data-role="weight-warn">' + WARN_ICON + '<span data-role="weight-warn-text">' + warnText + "</span></div>" +
      '<div class="grades-list" data-role="grades-list">' + rowsHTML + "</div>" +
      '<div class="add-grade-row"><button type="button" class="btn btn-ghost btn-sm" data-role="add-grade">' + ICON_PLUS + " Añadir evaluación</button></div>" +
      '<div class="subject-foot"><button type="button" class="btn btn-outline btn-sm" data-role="goal-toggle">' + ICON_TARGET + (sub.goalOpen ? " Ocultar objetivo" : " ¿Qué nota necesito?") + "</button></div>" +
      renderGoalPanel(sub, sys, stats) +
      "</div>" +
      "</article>";
  }

  var AD_INLINE_HTML = '<div class="ad-slot ad-inline card" aria-hidden="true"><span>ANUNCIO<small>Publicidad</small></span><!-- PEGA AQUÍ TU CÓDIGO DE ADSENSE --></div>';

  /* ---------------------------------------------------------------
     Rendering — structural
     --------------------------------------------------------------- */
  function renderSubjectsGrid() {
    var grid = $("[data-subjects]");
    if (!grid) return;
    var html = state.subjects.map(function (sub, i) {
      var card = renderSubjectCard(sub);
      if (i === 1 && state.subjects.length > 2) card += AD_INLINE_HTML;
      return card;
    }).join("");
    html += '<button type="button" class="add-subject-card" data-role="add-subject">' + ICON_PLUS_BIG + "<span>Añadir asignatura</span></button>";
    grid.innerHTML = html;
  }

  function updateSummary() {
    var wrap = $("[data-summary]");
    if (!wrap) return;
    var sys = APP.systems[state.system];
    var withData = state.subjects.map(function (s) { return { s: s, stats: computeSubjectStats(s) }; })
      .filter(function (x) { return x.stats.displayPct != null; });
    if (!withData.length) {
      wrap.innerHTML = '<div class="summary-empty">Añade tu primera asignatura y una nota para ver aquí tu media general.</div>';
      return;
    }
    var overall = withData.reduce(function (a, x) { return a + x.stats.displayPct; }, 0) / withData.length;
    var passing = withData.filter(function (x) { return zoneOf(x.stats.displayPct, sys) !== "fail"; }).length;
    wrap.innerHTML =
      '<div class="summary-ring-wrap">' +
      ringHTML(overall, sys, 88, 9, "") +
      '<div class="summary-text"><div class="summary-label">Media general</div><div class="summary-value">' + escHTML(formatScoreFull(overall, sys)) + "</div></div>" +
      "</div>" +
      '<div class="summary-stats">' +
      '<div class="summary-stat"><span class="n">' + state.subjects.length + '</span><span class="l">asignatura' + (state.subjects.length === 1 ? "" : "s") + "</span></div>" +
      '<div class="summary-stat"><span class="n">' + passing + "/" + withData.length + '</span><span class="l">en positivo</span></div>' +
      "</div>";
  }

  function renderAll() {
    updateSystemSwitchUI();
    renderSubjectsGrid();
    updateSummary();
  }

  /* ---------------------------------------------------------------
     Targeted updates (preserve focus while typing)
     --------------------------------------------------------------- */
  function recalcSubject(sub) {
    var sys = APP.systems[state.system];
    var root = $('[data-subject="' + sub.id + '"]');
    if (!root) return;
    var stats = computeSubjectStats(sub);

    setRing(root.querySelector('[data-role="subject-ring"]'), stats.displayPct, sys);

    var badge = root.querySelector('[data-role="subject-badge"]');
    if (badge) {
      var z = stats.displayPct == null ? null : zoneOf(stats.displayPct, sys);
      badge.className = "badge " + (z === "fail" ? "badge-fail" : z === "warn" ? "badge-warn" : z === "pass" ? "badge-pass" : "");
      badge.textContent = z === "fail" ? "Suspende" : z === "warn" ? "Aprueba justo" : z === "pass" ? "Vas bien" : "Sin datos";
    }

    var fill = root.querySelector('[data-role="weight-fill"]');
    if (fill) fill.style.width = clamp(stats.weightSum, 0, 100) + "%";

    var evalLabel = root.querySelector('[data-role="evaluated-label"]');
    if (evalLabel) evalLabel.innerHTML = "<strong>" + round1(stats.evaluatedWeight) + "%</strong> de la nota ya está decidido";

    var overW = stats.weightSum - 100;
    var warnEl = root.querySelector('[data-role="weight-warn"]');
    if (warnEl) {
      warnEl.classList.toggle("is-visible", Math.abs(overW) > 0.5);
      var txt = root.querySelector('[data-role="weight-warn-text"]');
      if (txt) txt.textContent = overW > 0
        ? "Los pesos suman " + round1(stats.weightSum) + "% — sobran " + round1(overW) + " puntos porcentuales."
        : "Los pesos suman " + round1(stats.weightSum) + "% — te faltan " + round1(-overW) + " puntos porcentuales para llegar a 100%.";
    }

    if (sub.goalOpen && sub.goalTargetPct != null) refreshGoalPanelPartial(sub, sys);
    updateSummary();
    scheduleSave();
  }

  function refreshGoalPanelPartial(sub, sys) {
    var root = $('[data-subject="' + sub.id + '"]');
    if (!root) return;
    var stats = computeSubjectStats(sub);
    var shortcutsEl = root.querySelector('[data-role="goal-shortcuts"]');
    if (shortcutsEl) shortcutsEl.innerHTML = buildShortcutsHTML(sub, sys);
    var resultWrap = root.querySelector('[data-role="goal-result-wrap"]');
    if (resultWrap) resultWrap.innerHTML = sub.goalTargetPct == null ? "" : renderGoalResult(sub, sys, stats, sub.goalTargetPct);
  }

  function refreshGradesList(sub) {
    var sys = APP.systems[state.system];
    var root = $('[data-subject="' + sub.id + '"]');
    if (!root) return;
    var list = root.querySelector('[data-role="grades-list"]');
    if (list) list.innerHTML = sub.grades.map(function (g) { return renderGradeRow(sub, g, sys); }).join("");
    recalcSubject(sub);
  }

  function updateSimFinal(subId) {
    var sub = findSubject(subId);
    if (!sub) return;
    var root = $('[data-subject="' + subId + '"]');
    if (!root) return;
    var sys = APP.systems[state.system];
    var stats = computeSubjectStats(sub);
    var pending = sub.grades.filter(function (g) { return g.pending; });
    var map = simState[subId] || {};
    var simFinalPct = stats.contributedPct + pending.reduce(function (a, g) {
      var w = Number(g.weightPct) || 0;
      var sv = map[g.id];
      return a + ((sv == null ? 0 : sv) * w / 100);
    }, 0);
    var el = root.querySelector('[data-role="sim-final-value"]');
    if (el) el.textContent = formatScoreFull(clamp(simFinalPct, 0, 100), sys);
  }

  /* ---------------------------------------------------------------
     Actions
     --------------------------------------------------------------- */
  function addSubject() {
    var color = APP.colors[state.subjects.length % APP.colors.length];
    var sub = {
      id: uid("s"), name: "Asignatura " + (state.subjects.length + 1), color: color,
      goalOpen: false, goalTargetPct: null,
      grades: [{ id: uid("g"), name: "Evaluación 1", scorePct: null, weightPct: 100, pending: true }]
    };
    state.subjects.push(sub);
    renderAll();
    scheduleSave();
    var root = $('[data-subject="' + sub.id + '"]');
    var nameInput = root && root.querySelector('[data-role="subject-name"]');
    if (nameInput) { nameInput.focus(); nameInput.select(); }
    root && root.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function onAddGrade(sub) {
    sub.grades.push({ id: uid("g"), name: "Evaluación " + (sub.grades.length + 1), scorePct: null, weightPct: 0, pending: true });
    refreshGradesList(sub);
    scheduleSave();
  }
  function onDeleteGrade(sub, gradeId) {
    sub.grades = sub.grades.filter(function (g) { return g.id !== gradeId; });
    if (simState[sub.id]) delete simState[sub.id][gradeId];
    refreshGradesList(sub);
    scheduleSave();
  }
  function onColorDotClick(dot, sub) {
    sub.color = dot.dataset.color;
    var root = $('[data-subject="' + sub.id + '"]');
    if (!root) return;
    root.style.setProperty("--subject-color", sub.color);
    $$('[data-role="color-dot"]', root).forEach(function (d) { d.classList.toggle("is-active", d.dataset.color === sub.color); });
    scheduleSave();
  }
  function onGoalToggleClick(sub) {
    var sys = APP.systems[state.system];
    sub.goalOpen = !sub.goalOpen;
    var root = $('[data-subject="' + sub.id + '"]');
    if (!root) return;
    var panel = root.querySelector('[data-role="goal-panel"]');
    if (panel) panel.classList.toggle("is-open", sub.goalOpen);
    var btn = root.querySelector('[data-role="goal-toggle"]');
    if (btn) btn.innerHTML = ICON_TARGET + (sub.goalOpen ? " Ocultar objetivo" : " ¿Qué nota necesito?");
    if (sub.goalOpen && sub.goalTargetPct == null) {
      sub.goalTargetPct = displayToPct(sys.shortcuts[0].value, sys);
      refreshGoalPanelPartial(sub, sys);
      var customInput = root.querySelector('[data-role="goal-custom"]');
      if (customInput) customInput.value = roundTo(pctToDisplay(sub.goalTargetPct, sys), sys.decimals);
      var customLetter = root.querySelector('[data-role="goal-custom-letter"]');
      if (customLetter) customLetter.value = String(pctToLetterEntry(sub.goalTargetPct, sys).val);
    }
    scheduleSave();
  }
  function onGoalChipClick(chip, sub, sys) {
    var pct = parseFloat(chip.dataset.pct);
    sub.goalTargetPct = pct;
    simState[sub.id] = {};
    refreshGoalPanelPartial(sub, sys);
    var root = $('[data-subject="' + sub.id + '"]');
    if (!root) return;
    var customInput = root.querySelector('[data-role="goal-custom"]');
    if (customInput) customInput.value = roundTo(pctToDisplay(pct, sys), sys.decimals);
    var customLetter = root.querySelector('[data-role="goal-custom-letter"]');
    if (customLetter) customLetter.value = String(pctToLetterEntry(pct, sys).val);
    scheduleSave();
  }
  function onGoalCustomInput(t, sub, sys) {
    var raw = t.tagName === "SELECT" ? parseFloat(t.value) : parseFloat(t.value);
    if (t.dataset.role === "goal-custom-letter") {
      sub.goalTargetPct = isFinite(raw) ? raw : null;
    } else {
      sub.goalTargetPct = isFinite(raw) ? clamp(displayToPct(raw, sys), 0, 100) : null;
    }
    simState[sub.id] = {};
    refreshGoalPanelPartial(sub, sys);
    scheduleSave();
  }
  function onSimSliderInput(t, sub, sys) {
    var gradeId = t.dataset.grade;
    var raw = parseFloat(t.value);
    var pct = clamp(displayToPct(raw, sys), 0, 100);
    if (!simState[sub.id]) simState[sub.id] = {};
    simState[sub.id][gradeId] = pct;
    t.style.setProperty("--pct", pct + "%");
    var item = t.closest(".sim-item");
    if (item) {
      var valEl = item.querySelector('[data-role="sim-value"]');
      if (valEl) valEl.textContent = formatScoreFull(pct, sys);
    }
    updateSimFinal(sub.id);
  }

  /* ---------------------------------------------------------------
     Event delegation
     --------------------------------------------------------------- */
  function onGridInput(e) {
    var t = e.target;
    var role = t.dataset.role;
    if (!role) return;
    var subEl = t.closest("[data-subject]");
    var sub = subEl && findSubject(subEl.dataset.subject);

    if (role === "subject-name") { if (sub) { sub.name = t.value; scheduleSave(); updateSummary(); } return; }
    if (!sub) return;
    var sys = APP.systems[state.system];

    if (role === "grade-name") {
      var gEl = t.closest("[data-grade]");
      var g = gEl && sub.grades.filter(function (x) { return x.id === gEl.dataset.grade; })[0];
      if (g) { g.name = t.value; scheduleSave(); }
      return;
    }
    if (role === "grade-score") {
      var gEl2 = t.closest("[data-grade]");
      var g2 = gEl2 && sub.grades.filter(function (x) { return x.id === gEl2.dataset.grade; })[0];
      if (g2) {
        var raw = t.value === "" ? null : parseFloat(t.value);
        g2.scorePct = (raw == null || !isFinite(raw)) ? null : displayToPct(clamp(raw, sys.min, sys.max), sys);
        recalcSubject(sub);
      }
      return;
    }
    if (role === "grade-weight") {
      var gEl3 = t.closest("[data-grade]");
      var g3 = gEl3 && sub.grades.filter(function (x) { return x.id === gEl3.dataset.grade; })[0];
      if (g3) {
        var raw3 = t.value === "" ? 0 : parseFloat(t.value);
        g3.weightPct = isFinite(raw3) ? clamp(raw3, 0, 100) : 0;
        recalcSubject(sub);
      }
      return;
    }
    if (role === "goal-custom") { onGoalCustomInput(t, sub, sys); return; }
    if (role === "sim-slider") { onSimSliderInput(t, sub, sys); return; }
  }

  function onGridChange(e) {
    var t = e.target;
    var role = t.dataset.role;
    if (!role) return;
    var subEl = t.closest("[data-subject]");
    var sub = subEl && findSubject(subEl.dataset.subject);
    if (!sub) return;
    var sys = APP.systems[state.system];

    if (role === "grade-pending") {
      var gEl = t.closest("[data-grade]");
      var g = gEl && sub.grades.filter(function (x) { return x.id === gEl.dataset.grade; })[0];
      if (g) {
        g.pending = t.checked;
        var scoreInput = gEl.querySelector('[data-role="grade-score"], [data-role="grade-score-letter"]');
        if (scoreInput) scoreInput.disabled = g.pending;
        gEl.classList.toggle("is-pending", g.pending);
        var label = gEl.querySelector(".pending-toggle");
        if (label) label.classList.toggle("is-on", g.pending);
        recalcSubject(sub);
      }
      return;
    }
    if (role === "grade-score-letter") {
      var gEl2 = t.closest("[data-grade]");
      var g2 = gEl2 && sub.grades.filter(function (x) { return x.id === gEl2.dataset.grade; })[0];
      if (g2) { g2.scorePct = t.value === "" ? null : parseFloat(t.value); recalcSubject(sub); }
      return;
    }
    if (role === "goal-custom-letter") { onGoalCustomInput(t, sub, sys); return; }
  }

  function onGridClick(e) {
    var addSubjectBtn = e.target.closest('[data-role="add-subject"]');
    if (addSubjectBtn) { addSubject(); return; }

    var subEl = e.target.closest("[data-subject]");
    if (!subEl) return;
    var sub = findSubject(subEl.dataset.subject);
    if (!sub) return;
    var sys = APP.systems[state.system];

    if (e.target.closest('[data-role="delete-subject"]')) {
      if (state.subjects.length <= 1) { showToast("Necesitas al menos una asignatura."); return; }
      if (!window.confirm('¿Eliminar "' + sub.name + '" y todas sus notas?')) return;
      state.subjects = state.subjects.filter(function (s) { return s.id !== sub.id; });
      delete simState[sub.id];
      renderAll();
      scheduleSave();
      return;
    }
    var addGradeBtn = e.target.closest('[data-role="add-grade"]');
    if (addGradeBtn) { onAddGrade(sub); return; }

    var delGradeBtn = e.target.closest('[data-role="delete-grade"]');
    if (delGradeBtn) {
      var gEl = delGradeBtn.closest("[data-grade]");
      if (gEl) onDeleteGrade(sub, gEl.dataset.grade);
      return;
    }
    var colorDot = e.target.closest('[data-role="color-dot"]');
    if (colorDot) { onColorDotClick(colorDot, sub); return; }

    var goalToggle = e.target.closest('[data-role="goal-toggle"]');
    if (goalToggle) { onGoalToggleClick(sub); return; }

    var goalChip = e.target.closest('[data-role="goal-chip"]');
    if (goalChip) { onGoalChipClick(goalChip, sub, sys); return; }
  }

  /* ---------------------------------------------------------------
     System switch
     --------------------------------------------------------------- */
  function updateSystemSwitchUI() {
    $$('[data-system-switch] button').forEach(function (b) { b.classList.toggle("is-active", b.dataset.system === state.system); });
  }
  function onSystemChange(sys) {
    if (state.system === sys || !APP.systems[sys]) return;
    state.system = sys;
    simState = {};
    renderAll();
    scheduleSave();
  }
  function initSystemSwitch() {
    var el = $("[data-system-switch]");
    if (!el) return;
    updateSystemSwitchUI();
    el.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-system]");
      if (btn) onSystemChange(btn.dataset.system);
    });
  }

  /* ---------------------------------------------------------------
     Export (PNG canvas + lazy PDF)
     --------------------------------------------------------------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function buildSummaryCanvas() {
    var sys = APP.systems[state.system];
    var W = 1000, padX = 60, rowH = 74, headerH = 190, footerH = 90;
    var H = headerH + Math.max(1, state.subjects.length) * rowH + footerH + 30;
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");

    var grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#f3f7f6"); grad.addColorStop(1, "#e9f2ee");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#182524";
    ctx.font = '700 34px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText("Mis notas", padX, 68);

    ctx.fillStyle = "#5c6e6b";
    ctx.font = "500 15px Arial, sans-serif";
    var now = new Date();
    var dateStr = now.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
    ctx.fillText("NotaClara · " + dateStr, padX, 94);

    var withData = state.subjects.map(function (s) { return { s: s, stats: computeSubjectStats(s) }; }).filter(function (x) { return x.stats.displayPct != null; });
    var overall = withData.length ? withData.reduce(function (a, x) { return a + x.stats.displayPct; }, 0) / withData.length : null;

    ctx.textAlign = "right";
    ctx.fillStyle = "#2f7d6b";
    ctx.font = "800 30px Arial, sans-serif";
    ctx.fillText(overall == null ? "—" : formatScoreFull(overall, sys), W - padX, 76);
    ctx.fillStyle = "#5c6e6b";
    ctx.font = "700 12px Arial, sans-serif";
    ctx.fillText("MEDIA GENERAL", W - padX, 94);
    ctx.textAlign = "left";

    ctx.strokeStyle = "#dde8e4";
    ctx.beginPath(); ctx.moveTo(padX, headerH - 20); ctx.lineTo(W - padX, headerH - 20); ctx.stroke();

    var y = headerH + 10;
    state.subjects.forEach(function (sub) {
      var stats = computeSubjectStats(sub);
      var z = stats.displayPct == null ? null : zoneOf(stats.displayPct, sys);
      var zColor = z === "fail" ? "#cf4635" : z === "warn" ? "#c98a1f" : z === "pass" ? "#2f9e6b" : "#8a9a97";

      ctx.fillStyle = sub.color || "#2f7d6b";
      ctx.beginPath(); ctx.arc(padX + 7, y + 12, 7, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = "#182524";
      ctx.font = "700 19px Arial, sans-serif";
      ctx.fillText(sub.name || "Asignatura", padX + 26, y + 18);

      ctx.fillStyle = "#8a9a97";
      ctx.font = "500 12px Arial, sans-serif";
      ctx.fillText(round1(stats.evaluatedWeight) + "% evaluado", padX + 26, y + 36);

      ctx.textAlign = "right";
      ctx.fillStyle = zColor;
      ctx.font = "800 25px Arial, sans-serif";
      ctx.fillText(stats.displayPct == null ? "—" : formatScoreFull(stats.displayPct, sys), W - padX, y + 24);
      ctx.textAlign = "left";

      var barY = y + 44, barW = W - padX * 2;
      ctx.fillStyle = "#e9f0ee";
      roundRect(ctx, padX, barY, barW, 8, 4); ctx.fill();
      if (stats.displayPct != null) {
        ctx.fillStyle = zColor;
        var w = Math.max(8, clamp(stats.displayPct, 0, 100) / 100 * barW);
        roundRect(ctx, padX, barY, w, 8, 4); ctx.fill();
      }
      y += rowH;
    });

    ctx.strokeStyle = "#dde8e4";
    ctx.beginPath(); ctx.moveTo(padX, H - footerH + 10); ctx.lineTo(W - padX, H - footerH + 10); ctx.stroke();
    ctx.fillStyle = "#8a9a97";
    ctx.font = "500 13px Arial, sans-serif";
    ctx.fillText("Calculado con NotaClara — calculadora de nota media y de la nota que necesitas para aprobar.", padX, H - footerH + 42);

    return canvas;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.jspdf) return resolve();
      var existing = document.querySelector('script[data-lib="' + src + '"]');
      if (existing) {
        existing.addEventListener("load", function () { resolve(); });
        existing.addEventListener("error", function () { reject(new Error("load fail")); });
        return;
      }
      var s = document.createElement("script");
      s.src = src; s.dataset.lib = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("load fail: " + src)); };
      document.head.appendChild(s);
    });
  }

  function exportPNG() {
    try {
      var canvas = buildSummaryCanvas();
      canvas.toBlob(function (blob) {
        if (!blob) { showToast("No se pudo generar la imagen."); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = "mis-notas-notaclara.png";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        showToast("Imagen descargada ✓");
      }, "image/png");
    } catch (e) { showToast("No se pudo generar la imagen."); }
  }

  function exportPDF() {
    showToast("Preparando PDF…");
    loadScript("lib/vendor/jspdf.umd.min.js").then(function () {
      var canvas = buildSummaryCanvas();
      var jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
      if (!jsPDFCtor) throw new Error("jsPDF no disponible");
      var doc = new jsPDFCtor({ orientation: canvas.width >= canvas.height ? "l" : "p", unit: "px", format: [canvas.width, canvas.height] });
      doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
      doc.save("mis-notas-notaclara.pdf");
      showToast("PDF descargado ✓");
    }).catch(function () {
      showToast("No se pudo generar el PDF. Prueba con la imagen.");
    });
  }

  function initExport() {
    var menu = $("[data-export-menu]");
    var toggle = $("[data-export-toggle]");
    var dropdown = $("[data-export-dropdown]");
    if (!menu || !toggle || !dropdown) return;
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      dropdown.classList.toggle("is-open");
    });
    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target)) dropdown.classList.remove("is-open");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") dropdown.classList.remove("is-open");
    });
    var pngBtn = $("[data-export-png]");
    var pdfBtn = $("[data-export-pdf]");
    if (pngBtn) pngBtn.addEventListener("click", function () { dropdown.classList.remove("is-open"); exportPNG(); });
    if (pdfBtn) pdfBtn.addEventListener("click", function () { dropdown.classList.remove("is-open"); exportPDF(); });
  }

  /* ---------------------------------------------------------------
     Ad corner + toast
     --------------------------------------------------------------- */
  function initAdCorner() {
    var el = $("[data-ad-corner]");
    if (!el) return;
    var dismissed = false;
    try { dismissed = sessionStorage.getItem("adCornerDismissed") === "1"; } catch (e) {}
    if (dismissed) return;
    var shown = false;
    window.addEventListener("scroll", function () {
      if (shown) return;
      if (window.scrollY > 500) { shown = true; el.classList.add("is-visible"); }
    }, { passive: true });
    var closeBtn = el.querySelector('[data-role="ad-corner-close"]');
    if (closeBtn) closeBtn.addEventListener("click", function () {
      el.classList.remove("is-visible");
      try { sessionStorage.setItem("adCornerDismissed", "1"); } catch (e) {}
    });
  }

  var toastTimer = null;
  function showToast(msg) {
    var el = $("[data-toast]");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-visible"); }, 2600);
  }

  /* ---------------------------------------------------------------
     Boot
     --------------------------------------------------------------- */
  function initDelegation() {
    var grid = $("[data-subjects]");
    if (!grid) return;
    grid.addEventListener("input", onGridInput);
    grid.addEventListener("change", onGridChange);
    grid.addEventListener("click", onGridClick);
  }

  function boot() {
    safe(renderAll, "renderAll");
    safe(initSystemSwitch, "initSystemSwitch");
    safe(initDelegation, "initDelegation");
    safe(initExport, "initExport");
    safe(initAdCorner, "initAdCorner");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
