(function () {
  'use strict';

  // ── Board Definition ──────────────────────────────────────────────────────────
  const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAYS     = Array.from({length: 31}, (_, i) => String(i + 1));
  const WEEKDAYS = ['Sun','Mon','Tues','Wed','Thur','Fri','Sat'];

  const BOARD_CELLS = {};
  const LABEL_TO_RC = {};

  (function buildBoard() {
    function add(r, c, lbl) { BOARD_CELLS[`${r},${c}`] = lbl; LABEL_TO_RC[lbl] = `${r},${c}`; }
    MONTHS.slice(0, 6).forEach((m, i) => add(0, i, m));
    MONTHS.slice(6).forEach((m, i)    => add(1, i, m));
    let d = 0;
    for (let r = 2; r <= 5; r++) for (let c = 0; c < 7; c++) add(r, c, DAYS[d++]);
    [DAYS[28], DAYS[29], DAYS[30], 'Sun', 'Mon', 'Tues', 'Wed'].forEach((lbl, c) => add(6, c, lbl));
    ['Thur', 'Fri', 'Sat'].forEach((lbl, i) => add(7, i + 4, lbl));
  }());

  const ALL_VALID    = new Set(Object.keys(BOARD_CELLS));
  const PERM_BLOCKED = new Set(['0,6','1,6','7,0','7,1','7,2','7,3']);

  // ── Piece Definitions ─────────────────────────────────────────────────────────
  // 10 pieces totalling 47 squares = 50 valid board cells − 3 date targets
  const PIECE_DEFS = [
    { id:0, color:'#e74c3c', squares:[[0,0],[0,1],[1,0],[2,0]]         },  // L-tetromino
    { id:1, color:'#e67e22', squares:[[0,1],[1,1],[2,0],[2,1],[2,2]]   },  // T-pentomino
    { id:2, color:'#d4ac0d', squares:[[0,0],[0,1],[1,1],[1,2]]         },  // S-tetromino
    { id:3, color:'#27ae60', squares:[[0,0],[1,0],[2,0],[3,0],[3,1]]   },  // L-pentomino
    { id:4, color:'#1abc9c', squares:[[0,0],[0,1],[0,2],[1,0],[1,2]]   },  // U-pentomino
    { id:5, color:'#3498db', squares:[[0,0],[0,1],[1,0],[1,1],[2,0]]   },  // P-pentomino (2×2 box + extra)
    { id:6, color:'#9b59b6', squares:[[0,1],[1,0],[1,1],[2,0],[3,0]]   },  // skew-pentomino
    { id:7, color:'#e91e63', squares:[[0,0],[1,0],[2,0],[3,0]]         },  // I-tetromino
    { id:8, color:'#00bcd4', squares:[[0,0],[1,0],[2,0],[2,1],[2,2]]   },  // J-pentomino
    { id:9, color:'#ff9800', squares:[[0,0],[0,1],[1,1],[2,1],[2,2]]   },  // S-pentomino
  ];

  // ── Orientation helpers ───────────────────────────────────────────────────────
  function normalize(sqs) {
    const minR = Math.min(...sqs.map(([r]) => r));
    const minC = Math.min(...sqs.map(([, c]) => c));
    return sqs.map(([r, c]) => [r - minR, c - minC]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }
  function rot90(sqs) { return normalize(sqs.map(([r, c]) => [c, -r])); }
  function flipH(sqs) {
    const mx = Math.max(...sqs.map(([, c]) => c));
    return normalize(sqs.map(([r, c]) => [r, mx - c]));
  }
  function sqKey(sqs) { return normalize(sqs).map(s => s.join(',')).join('|'); }
  function getAllOrientations(sqs) {
    const seen = new Set(), res = [];
    let cur = sqs;
    for (let f = 0; f < 2; f++) {
      for (let r = 0; r < 4; r++) {
        const n = normalize(cur), k = sqKey(n);
        if (!seen.has(k)) { seen.add(k); res.push(n); }
        cur = rot90(cur);
      }
      cur = flipH(cur);
    }
    return res;
  }
  const PIECE_ORIENTATIONS = PIECE_DEFS.map(p => getAllOrientations(p.squares));

  // ── State ─────────────────────────────────────────────────────────────────────
  function toInputDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function labelsFromDate(d) {
    return { month: MONTHS[d.getMonth()], day: String(d.getDate()), weekday: WEEKDAYS[d.getDay()] };
  }
  function parseInputDate(val) {
    if (!val) return null;
    const [y, m, d] = val.split('-').map(Number);
    return new Date(y, m - 1, d);  // local time — no UTC shift
  }
  function formatDisplayDate(d) {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  const now       = new Date();
  let currentDate = now;
  let { month: selMonth, day: selDay, weekday: selWeekday } = labelsFromDate(now);

  let mode         = 'play';   // 'play' | 'solution'
  let placedPieces = {};       // pieceId (number) -> [{r, c}]
  let selectedPiece = null;
  let orientIdxs   = Array(10).fill(0);
  let solutions    = [];
  let solIdx       = 0;
  let hoverCell    = null;     // [baseR, baseC] where orient[0,0] lands for preview

  // ── Web Worker ────────────────────────────────────────────────────────────────
  let solverWorker  = null;
  let solverTimeout = null;

  function abortSolver() {
    if (solverTimeout) { clearTimeout(solverTimeout); solverTimeout = null; }
    if (solverWorker)  { solverWorker.terminate(); solverWorker = null; }
  }

  function runSolver() {
    abortSolver();
    solveBtn.textContent = 'Solving…';
    solveBtn.disabled    = true;

    solverWorker = new Worker('js/calendar-worker.js');
    solverWorker.onmessage = function (e) {
      abortSolver();
      solutions = e.data.ok ? e.data.solutions : [];
      solIdx    = 0;
      mode      = 'solution';
      solveBtn.textContent = 'Show Solutions';
      solveBtn.disabled    = false;
      renderBoard();
    };
    solverWorker.onerror = function () {
      abortSolver();
      solutions = [];
      solIdx    = 0;
      mode      = 'solution';
      solveBtn.textContent = 'Show Solutions';
      solveBtn.disabled    = false;
      renderBoard();
    };
    // Safety timeout
    solverTimeout = setTimeout(function () {
      abortSolver();
      solutions = [];
      solIdx    = 0;
      mode      = 'solution';
      solveBtn.textContent = 'Show Solutions';
      solveBtn.disabled    = false;
      renderBoard();
    }, 30000);

    solverWorker.postMessage({ month: selMonth, day: selDay, weekday: selWeekday, maxSols: 50 });
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────────
  const drag = {
    active:   false,
    pieceId:  null,
    anchorR:  0,     // which square of the piece's orient is "under the cursor"
    anchorC:  0,
    ghostEl:  null,
  };

  function getCellSize() {
    return parseInt(getComputedStyle(boardEl).getPropertyValue('--cal-cell'), 10) || 50;
  }

  function findClosestSquare(orient, pr, pc) {
    let best = orient[0], bestDist = Infinity;
    orient.forEach(([r, c]) => {
      const d = (r - pr) ** 2 + (c - pc) ** 2;
      if (d < bestDist) { bestDist = d; best = [r, c]; }
    });
    return best;
  }

  function createGhost(pieceId) {
    const CS     = getCellSize();
    const orient = PIECE_ORIENTATIONS[pieceId][orientIdxs[pieceId]];
    const maxR   = Math.max(...orient.map(([r]) => r));
    const maxC   = Math.max(...orient.map(([, c]) => c));
    const el     = document.createElement('div');
    el.style.cssText = [
      'position:fixed',
      'pointer-events:none',
      'z-index:9999',
      `width:${(maxC + 1) * CS}px`,
      `height:${(maxR + 1) * CS}px`,
      'opacity:0.82',
      'top:0',
      'left:0',
    ].join(';');
    orient.forEach(([r, c]) => {
      const sq = document.createElement('div');
      sq.style.cssText = [
        'position:absolute',
        `left:${c * CS + 1}px`,
        `top:${r * CS + 1}px`,
        `width:${CS - 3}px`,
        `height:${CS - 3}px`,
        `background:${PIECE_DEFS[pieceId].color}`,
        'border-radius:5px',
        'border:1px solid rgba(255,255,255,0.3)',
      ].join(';');
      el.appendChild(sq);
    });
    document.body.appendChild(el);
    return el;
  }

  function moveGhost(clientX, clientY) {
    if (!drag.ghostEl) return;
    const CS = getCellSize();
    drag.ghostEl.style.left = `${clientX - drag.anchorC * CS - CS / 2}px`;
    drag.ghostEl.style.top  = `${clientY - drag.anchorR * CS - CS / 2}px`;
  }

  function getBoardCellAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const cell = (el.id && /^cal-\d+-\d+$/.test(el.id)) ? el : el.parentElement;
    if (!cell || !cell.id) return null;
    const m = cell.id.match(/^cal-(\d+)-(\d+)$/);
    return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
  }

  function startDrag(pieceId, anchorR, anchorC, clientX, clientY) {
    if (mode !== 'play') return;
    // Pick up from board if already placed
    if (placedPieces[pieceId]) {
      delete placedPieces[pieceId];
      renderBoard();
      renderPieceTray();
    }
    selectedPiece  = null;
    drag.active    = true;
    drag.pieceId   = pieceId;
    drag.anchorR   = anchorR;
    drag.anchorC   = anchorC;
    drag.ghostEl   = createGhost(pieceId);
    document.body.style.userSelect = 'none';
    moveGhost(clientX, clientY);
  }

  function endDrag(clientX, clientY) {
    if (!drag.active) return;
    if (clientX !== undefined && clientY !== undefined) {
      const cell = getBoardCellAt(clientX, clientY);
      if (cell) {
        const baseR     = cell[0] - drag.anchorR;
        const baseC     = cell[1] - drag.anchorC;
        const targetRCs = getTargetRCs();
        const placedMap = getPlacedCellMap();
        const orient    = PIECE_ORIENTATIONS[drag.pieceId][orientIdxs[drag.pieceId]];
        const placed    = orient.map(([pr, pc]) => ({ r: baseR + pr, c: baseC + pc }));
        const isValid   = placed.every(({ r, c }) => {
          const pk = `${r},${c}`;
          return ALL_VALID.has(pk) && !PERM_BLOCKED.has(pk) && !targetRCs.has(pk) && placedMap[pk] === undefined;
        });
        if (isValid) {
          placedPieces[drag.pieceId] = placed;
        }
      }
    }
    if (drag.ghostEl) { drag.ghostEl.remove(); drag.ghostEl = null; }
    drag.active   = false;
    drag.pieceId  = null;
    document.body.style.userSelect = '';
    hoverCell = null;
    renderBoard();
    renderPieceTray();
  }

  // Mouse drag events
  document.addEventListener('mousemove', e => {
    if (!drag.active) return;
    moveGhost(e.clientX, e.clientY);
    const cell = getBoardCellAt(e.clientX, e.clientY);
    hoverCell = cell ? [cell[0] - drag.anchorR, cell[1] - drag.anchorC] : null;
    renderBoard();
  });

  document.addEventListener('mouseup', e => {
    if (drag.active) endDrag(e.clientX, e.clientY);
  });

  // Touch drag events
  document.addEventListener('touchmove', e => {
    if (!drag.active) return;
    e.preventDefault();
    const t = e.touches[0];
    moveGhost(t.clientX, t.clientY);
    const cell = getBoardCellAt(t.clientX, t.clientY);
    hoverCell = cell ? [cell[0] - drag.anchorR, cell[1] - drag.anchorC] : null;
    renderBoard();
  }, { passive: false });

  document.addEventListener('touchend', e => {
    if (!drag.active) return;
    const t = e.changedTouches[0];
    endDrag(t.clientX, t.clientY);
  });

  // Escape cancels drag or deselects
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (drag.active) { endDrag(); }
      else { selectedPiece = null; renderBoard(); renderPieceTray(); }
    }
  });

  // ── DOM references ────────────────────────────────────────────────────────────
  const boardEl       = document.getElementById('calBoard');
  const winBanner     = document.getElementById('calWinBanner');
  const noSolsEl      = document.getElementById('calNoSolutions');
  const solveBtn      = document.getElementById('calSolve');
  const resetBtn      = document.getElementById('calReset');
  const solNav        = document.getElementById('calSolutionNav');
  const prevSolBtn    = document.getElementById('calPrevSol');
  const nextSolBtn    = document.getElementById('calNextSol');
  const solCount      = document.getElementById('calSolCount');
  const backToPlayBtn = document.getElementById('calBackToPlay');
  const pieceTray     = document.getElementById('calPieceTray');
  const piecesGrid    = document.getElementById('calPiecesGrid');
  const dateInput     = document.getElementById('calDateInput');
  const dateDisplay   = document.getElementById('calDateDisplay');

  // ── Date input init ───────────────────────────────────────────────────────────
  dateInput.value = toInputDate(now);
  dateDisplay.textContent = formatDisplayDate(now);

  dateInput.addEventListener('change', () => {
    const d = parseInputDate(dateInput.value);
    if (!d || isNaN(d.getTime())) return;
    currentDate = d;
    const labels = labelsFromDate(d);
    selMonth   = labels.month;
    selDay     = labels.day;
    selWeekday = labels.weekday;
    dateDisplay.textContent = formatDisplayDate(d);
    resetAll();
  });

  // ── Derived helpers ───────────────────────────────────────────────────────────
  function getTargetRCs() {
    return new Set([LABEL_TO_RC[selMonth], LABEL_TO_RC[selDay], LABEL_TO_RC[selWeekday]].filter(Boolean));
  }

  function getPlacedCellMap() {
    const map = {};
    Object.entries(placedPieces).forEach(([pid, sqs]) => {
      sqs.forEach(({ r, c }) => { map[`${r},${c}`] = Number(pid); });
    });
    return map;
  }

  function getDisplayBoard() {
    if (mode === 'solution' && solutions.length > 0) return solutions[solIdx];
    return getPlacedCellMap();
  }

  // ── Board rendering ───────────────────────────────────────────────────────────
  function renderBoard() {
    const targetRCs    = getTargetRCs();
    const displayBoard = getDisplayBoard();
    const placedMap    = getPlacedCellMap();
    const usedIds      = new Set(Object.keys(placedPieces).map(Number));
    const isWin        = mode === 'play' && usedIds.size === 10;

    // Placement preview (works for both click-select and drag)
    const validPrev   = new Set();
    const invalidPrev = new Set();
    const previewPid  = drag.active ? drag.pieceId : selectedPiece;
    if (mode === 'play' && previewPid !== null && hoverCell) {
      const [hr, hc] = hoverCell;
      const orient   = PIECE_ORIENTATIONS[previewPid][orientIdxs[previewPid]];
      const placed   = orient.map(([pr, pc]) => ({ r: hr + pr, c: hc + pc }));
      const ok       = placed.every(({ r, c }) => {
        const pk = `${r},${c}`;
        return ALL_VALID.has(pk) && !PERM_BLOCKED.has(pk) && !targetRCs.has(pk) && placedMap[pk] === undefined;
      });
      if (ok) {
        placed.forEach(({ r, c }) => validPrev.add(`${r},${c}`));
      } else {
        placed.forEach(({ r, c }) => {
          if (r >= 0 && r < 8 && c >= 0 && c < 7 && ALL_VALID.has(`${r},${c}`)) invalidPrev.add(`${r},${c}`);
        });
      }
    }

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 7; c++) {
        const k      = `${r},${c}`;
        const cell   = document.getElementById(`cal-${r}-${c}`);
        if (!cell) continue;
        const lbl    = cell.querySelector('.cal-cell-label');
        const isBlocked = !ALL_VALID.has(k) || PERM_BLOCKED.has(k);

        cell.className        = 'cal-cell';
        cell.style.background = '';
        cell.style.cursor     = '';

        if (isBlocked) { cell.classList.add('cal-cell--blocked'); lbl.textContent = ''; continue; }

        const isTarget  = targetRCs.has(k);
        const inValid   = validPrev.has(k);
        const inInvalid = invalidPrev.has(k);
        const pid       = displayBoard[k];
        const label     = BOARD_CELLS[k] || '';

        if (isTarget) {
          cell.classList.add('cal-cell--target');
          lbl.textContent = label;
        } else if (inValid) {
          cell.classList.add('cal-cell--preview-valid');
          lbl.textContent = '';
        } else if (inInvalid) {
          cell.classList.add('cal-cell--preview-invalid');
          lbl.textContent = '';
        } else if (pid !== undefined) {
          cell.classList.add('cal-cell--placed');
          cell.style.background = PIECE_DEFS[pid].color;
          lbl.textContent = '';
          if (mode === 'play') cell.style.cursor = 'grab';
        } else {
          cell.classList.add('cal-cell--empty');
          lbl.textContent = label;
          if (mode === 'play' && (selectedPiece !== null || drag.active)) cell.style.cursor = 'crosshair';
        }
      }
    }

    winBanner.hidden = !isWin;
    noSolsEl.hidden  = !(mode === 'solution' && solutions.length === 0);

    if (mode === 'solution' && solutions.length > 0) {
      solNav.hidden = false;
      const more    = solutions.length >= 50 ? ' (50+ exist)' : '';
      solCount.textContent = `Solution ${solIdx + 1} of ${solutions.length}${more}`;
      prevSolBtn.disabled  = solIdx === 0;
      nextSolBtn.disabled  = solIdx === solutions.length - 1;
    } else {
      solNav.hidden = true;
    }

    pieceTray.hidden = mode !== 'play';
  }

  // ── Build board DOM (once on load) ────────────────────────────────────────────
  function buildBoardDOM() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 7; c++) {
        const k    = `${r},${c}`;
        const cell = document.createElement('div');
        cell.id        = `cal-${r}-${c}`;
        cell.className = 'cal-cell';
        cell.setAttribute('role', 'gridcell');

        const lbl     = document.createElement('span');
        lbl.className = 'cal-cell-label';
        cell.appendChild(lbl);

        const isBlocked = !ALL_VALID.has(k) || PERM_BLOCKED.has(k);
        if (!isBlocked) {
          cell.addEventListener('mouseenter', () => {
            if (drag.active) return; // drag handles its own hover
            hoverCell = selectedPiece !== null ? [r, c] : null;
            renderBoard();
          });
          cell.addEventListener('mouseleave', () => {
            if (drag.active) return;
            hoverCell = null;
            renderBoard();
          });
          cell.addEventListener('click', () => handleCellClick(r, c));
          // Board pieces can be dragged off the board
          cell.addEventListener('mousedown', e => {
            if (mode !== 'play') return;
            const pid = getPlacedCellMap()[`${r},${c}`];
            if (pid === undefined) return;
            e.preventDefault();
            // Compute anchor: which square of the orient is at (r,c)?
            const orient = PIECE_ORIENTATIONS[pid][orientIdxs[pid]];
            const base0  = placedPieces[pid][0];
            const baseR  = base0.r - orient[0][0];
            const baseC  = base0.c - orient[0][1];
            startDrag(pid, r - baseR, c - baseC, e.clientX, e.clientY);
          });
          cell.addEventListener('touchstart', e => {
            if (mode !== 'play') return;
            const pid = getPlacedCellMap()[`${r},${c}`];
            if (pid === undefined) return;
            e.preventDefault();
            const t      = e.touches[0];
            const orient = PIECE_ORIENTATIONS[pid][orientIdxs[pid]];
            const base0  = placedPieces[pid][0];
            const baseR  = base0.r - orient[0][0];
            const baseC  = base0.c - orient[0][1];
            startDrag(pid, r - baseR, c - baseC, t.clientX, t.clientY);
          }, { passive: false });
        }
        boardEl.appendChild(cell);
      }
    }
  }

  // ── Piece tray ────────────────────────────────────────────────────────────────
  function renderPieceTray() {
    piecesGrid.innerHTML = '';
    const usedIds = new Set(Object.keys(placedPieces).map(Number));
    const SQ      = 18; // mini-square size in tray (px)

    PIECE_DEFS.forEach(p => {
      const isUsed = usedIds.has(p.id);
      const isSel  = selectedPiece === p.id;
      const orient = PIECE_ORIENTATIONS[p.id][orientIdxs[p.id]];
      const maxR   = Math.max(...orient.map(([r]) => r));
      const maxC   = Math.max(...orient.map(([, c]) => c));

      const wrapper     = document.createElement('div');
      wrapper.className = 'cal-piece-wrapper' + (isUsed ? ' cal-piece--used' : '');

      const canvas         = document.createElement('div');
      canvas.className     = 'cal-piece-canvas';
      canvas.style.cssText = [
        'position:relative',
        `width:${(maxC + 1) * SQ + 4}px`,
        `height:${(maxR + 1) * SQ + 4}px`,
        'min-width:36px',
        'min-height:36px',
        `outline:2px solid ${isSel ? p.color : 'transparent'}`,
        'border-radius:5px',
        'padding:2px',
        `cursor:${isUsed ? 'default' : 'grab'}`,
        'transition:outline-color 0.15s,transform 0.1s',
        isSel ? 'transform:scale(1.08)' : '',
      ].join(';');

      orient.forEach(([pr, pc]) => {
        const sq         = document.createElement('div');
        sq.style.cssText = [
          'position:absolute',
          `left:${pc * SQ + 2}px`,
          `top:${pr * SQ + 2}px`,
          `width:${SQ - 2}px`,
          `height:${SQ - 2}px`,
          `background:${p.color}`,
          'border-radius:3px',
        ].join(';');
        canvas.appendChild(sq);
      });

      // Click to select (alternative to drag)
      if (!isUsed) {
        canvas.addEventListener('click', e => {
          if (drag.active) return;
          selectedPiece = (selectedPiece === p.id) ? null : p.id;
          renderPieceTray();
          renderBoard();
        });

        // Drag from tray
        canvas.addEventListener('mousedown', e => {
          if (mode !== 'play') return;
          e.preventDefault();
          const rect = canvas.getBoundingClientRect();
          const mx   = e.clientX - rect.left - 2;
          const my   = e.clientY - rect.top  - 2;
          const anchorSq = findClosestSquare(orient, Math.floor(my / SQ), Math.floor(mx / SQ));
          startDrag(p.id, anchorSq[0], anchorSq[1], e.clientX, e.clientY);
        });

        canvas.addEventListener('touchstart', e => {
          if (mode !== 'play') return;
          e.preventDefault();
          const t    = e.touches[0];
          const rect = canvas.getBoundingClientRect();
          const mx   = t.clientX - rect.left - 2;
          const my   = t.clientY - rect.top  - 2;
          const anchorSq = findClosestSquare(orient, Math.floor(my / SQ), Math.floor(mx / SQ));
          startDrag(p.id, anchorSq[0], anchorSq[1], t.clientX, t.clientY);
        }, { passive: false });
      }

      const rotBtn       = document.createElement('button');
      rotBtn.className   = 'cal-rotate-btn';
      rotBtn.textContent = '↻';
      rotBtn.title       = 'Rotate';
      rotBtn.disabled    = isUsed;
      rotBtn.setAttribute('aria-label', `Rotate piece ${p.id + 1}`);
      rotBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (isUsed || drag.active) return;
        orientIdxs[p.id] = (orientIdxs[p.id] + 1) % PIECE_ORIENTATIONS[p.id].length;
        // Rebuild ghost if currently dragging this piece
        renderPieceTray();
        renderBoard();
      });

      wrapper.appendChild(canvas);
      wrapper.appendChild(rotBtn);
      piecesGrid.appendChild(wrapper);
    });
  }

  // ── Click-to-place handler ────────────────────────────────────────────────────
  function handleCellClick(r, c) {
    if (mode !== 'play' || drag.active) return;
    const k         = `${r},${c}`;
    const targetRCs = getTargetRCs();
    if (PERM_BLOCKED.has(k) || !ALL_VALID.has(k) || targetRCs.has(k)) return;

    const placedMap = getPlacedCellMap();

    if (placedMap[k] !== undefined) {
      // Remove and re-select the piece
      const pid = placedMap[k];
      delete placedPieces[pid];
      if (selectedPiece === null) selectedPiece = pid;
      renderBoard();
      renderPieceTray();
      return;
    }

    if (selectedPiece === null) return;

    const orient  = PIECE_ORIENTATIONS[selectedPiece][orientIdxs[selectedPiece]];
    const placed  = orient.map(([pr, pc]) => ({ r: r + pr, c: c + pc }));
    const isValid = placed.every(({ r: pr, c: pc }) => {
      const pk = `${pr},${pc}`;
      return ALL_VALID.has(pk) && !PERM_BLOCKED.has(pk) && !targetRCs.has(pk) && placedMap[pk] === undefined;
    });

    if (isValid) {
      placedPieces[selectedPiece] = placed;
      selectedPiece = null;
      renderBoard();
      renderPieceTray();
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────
  function resetAll() {
    abortSolver();
    if (drag.active) endDrag();
    placedPieces         = {};
    selectedPiece        = null;
    solutions            = [];
    solIdx               = 0;
    mode                 = 'play';
    orientIdxs           = Array(10).fill(0);
    hoverCell            = null;
    solveBtn.textContent = 'Show Solutions';
    solveBtn.disabled    = false;
    renderPieceTray();
    renderBoard();
  }

  // ── Event listeners ───────────────────────────────────────────────────────────
  solveBtn.addEventListener('click', runSolver);
  resetBtn.addEventListener('click', resetAll);

  prevSolBtn.addEventListener('click', () => {
    if (solIdx > 0) { solIdx--; renderBoard(); }
  });
  nextSolBtn.addEventListener('click', () => {
    if (solIdx < solutions.length - 1) { solIdx++; renderBoard(); }
  });
  backToPlayBtn.addEventListener('click', () => {
    mode = 'play';
    renderBoard();
    renderPieceTray();
  });

  // ── Init ──────────────────────────────────────────────────────────────────────
  buildBoardDOM();
  renderPieceTray();
  renderBoard();

}());
