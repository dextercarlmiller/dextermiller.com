(function () {
  'use strict';

  // ── Board Definition ──────────────────────────────────────────────────────────
  const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAYS     = Array.from({length: 31}, (_, i) => String(i + 1));
  const WEEKDAYS = ['Sun','Mon','Tues','Wed','Thur','Fri','Sat'];

  const BOARD_CELLS = {};
  const LABEL_TO_RC = {};

  (function buildBoard() {
    function add(r, c, lbl) {
      BOARD_CELLS[`${r},${c}`] = lbl;
      LABEL_TO_RC[lbl] = `${r},${c}`;
    }
    MONTHS.slice(0, 6).forEach((m, i) => add(0, i, m));
    MONTHS.slice(6).forEach((m, i)    => add(1, i, m));
    let d = 0;
    for (let r = 2; r <= 5; r++) for (let c = 0; c < 7; c++) add(r, c, DAYS[d++]);
    [DAYS[28], DAYS[29], DAYS[30], 'Sun', 'Mon', 'Tues', 'Wed'].forEach((lbl, c) => add(6, c, lbl));
    ['Thur', 'Fri', 'Sat'].forEach((lbl, i) => add(7, i + 4, lbl));
  }());

  const ALL_VALID    = new Set(Object.keys(BOARD_CELLS));
  const PERM_BLOCKED = new Set(['0,6', '1,6', '7,0', '7,1', '7,2', '7,3']);

  // ── Piece Definitions ─────────────────────────────────────────────────────────
  const PIECE_DEFS = [
    { id: 0, color: '#e74c3c', squares: [[0,0],[0,1],[1,0],[2,0]]           },
    { id: 1, color: '#e67e22', squares: [[0,1],[1,1],[2,0],[2,1],[2,2]]     },
    { id: 2, color: '#d4ac0d', squares: [[0,0],[0,1],[1,1],[1,2]]           },
    { id: 3, color: '#27ae60', squares: [[0,0],[1,0],[2,0],[3,0],[3,1]]     },
    { id: 4, color: '#1abc9c', squares: [[0,0],[0,1],[0,2],[1,0],[1,2]]     },
    { id: 5, color: '#3498db', squares: [[0,1],[0,2],[1,0],[1,1]]           },
    { id: 6, color: '#9b59b6', squares: [[0,1],[1,0],[1,1],[2,0],[3,0]]     },
    { id: 7, color: '#e91e63', squares: [[0,0],[1,0],[2,0],[3,0]]           },
    { id: 8, color: '#00bcd4', squares: [[0,0],[1,0],[2,0],[2,1],[2,2]]     },
    { id: 9, color: '#ff9800', squares: [[0,0],[0,1],[1,1],[2,1],[2,2]]     },
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

  // ── Solver (backtracking) ─────────────────────────────────────────────────────
  function solve(targetMonth, targetDay, targetWeekday, maxSols) {
    const targetRCs = new Set(
      [LABEL_TO_RC[targetMonth], LABEL_TO_RC[targetDay], LABEL_TO_RC[targetWeekday]].filter(Boolean)
    );

    const toFill = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 7; c++) {
        const k = `${r},${c}`;
        if (ALL_VALID.has(k) && !PERM_BLOCKED.has(k) && !targetRCs.has(k)) toFill.push(k);
      }
    }

    const solutions = [];
    const board     = {};
    const used      = new Array(10).fill(false);
    const remaining = new Set(toFill);

    function bt() {
      if (remaining.size === 0) {
        solutions.push({ ...board });
        return solutions.length >= maxSols;
      }
      const [first] = remaining;
      const [fr, fc] = first.split(',').map(Number);
      for (let pid = 0; pid < 10; pid++) {
        if (used[pid]) continue;
        for (const orient of PIECE_ORIENTATIONS[pid]) {
          for (const [pr, pc] of orient) {
            const dr = fr - pr, dc = fc - pc;
            const placed = orient.map(([rr, cc]) => `${rr + dr},${cc + dc}`);
            if (placed.every(k => remaining.has(k))) {
              placed.forEach(k => { board[k] = pid; remaining.delete(k); });
              used[pid] = true;
              if (bt()) return true;
              used[pid] = false;
              placed.forEach(k => { delete board[k]; remaining.add(k); });
            }
          }
        }
      }
      return false;
    }
    bt();
    return solutions;
  }

  // ── State ─────────────────────────────────────────────────────────────────────
  function getTodayLabels() {
    const now = new Date();
    return {
      month:   MONTHS[now.getMonth()],
      day:     String(now.getDate()),
      weekday: WEEKDAYS[now.getDay()],
    };
  }

  const today    = getTodayLabels();
  let selMonth   = today.month;
  let selDay     = today.day;
  let selWeekday = today.weekday;
  let mode          = 'play';   // 'play' | 'solution'
  let placedPieces  = {};       // pieceId (number key) -> [{r, c}]
  let selectedPiece = null;
  let orientIdxs    = Array(10).fill(0);
  let solutions     = [];
  let solIdx        = 0;
  let hoverCell     = null;

  // ── DOM references ────────────────────────────────────────────────────────────
  const boardEl     = document.getElementById('calBoard');
  const winBanner   = document.getElementById('calWinBanner');
  const noSolsEl    = document.getElementById('calNoSolutions');
  const solveBtn    = document.getElementById('calSolve');
  const playModeBtn = document.getElementById('calPlayMode');
  const resetBtn    = document.getElementById('calReset');
  const solNav      = document.getElementById('calSolutionNav');
  const prevSolBtn  = document.getElementById('calPrevSol');
  const nextSolBtn  = document.getElementById('calNextSol');
  const solCount    = document.getElementById('calSolCount');
  const pieceTray   = document.getElementById('calPieceTray');
  const piecesGrid  = document.getElementById('calPiecesGrid');
  const monthSel    = document.getElementById('calMonth');
  const daySel      = document.getElementById('calDay');
  const weekdaySel  = document.getElementById('calWeekday');

  // ── Populate selects ──────────────────────────────────────────────────────────
  function populateSelect(el, options, selected) {
    options.forEach(o => {
      const opt     = document.createElement('option');
      opt.value     = o;
      opt.textContent = o;
      if (o === selected) opt.selected = true;
      el.appendChild(opt);
    });
  }
  populateSelect(monthSel,   MONTHS,   selMonth);
  populateSelect(daySel,     DAYS,     selDay);
  populateSelect(weekdaySel, WEEKDAYS, selWeekday);

  // ── Derived helpers ───────────────────────────────────────────────────────────
  function getTargetRCs() {
    return new Set(
      [LABEL_TO_RC[selMonth], LABEL_TO_RC[selDay], LABEL_TO_RC[selWeekday]].filter(Boolean)
    );
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
    const targetRCs     = getTargetRCs();
    const displayBoard  = getDisplayBoard();
    const placedCellMap = getPlacedCellMap();
    const usedIds       = new Set(Object.keys(placedPieces).map(Number));
    const isWin         = mode === 'play' && usedIds.size === 10;

    // Compute preview cells
    const validPreview   = new Set();
    const invalidPreview = new Set();
    if (mode === 'play' && selectedPiece !== null && hoverCell) {
      const [hr, hc] = hoverCell;
      const orient   = PIECE_ORIENTATIONS[selectedPiece][orientIdxs[selectedPiece]];
      const placed   = orient.map(([pr, pc]) => ({ r: hr + pr, c: hc + pc }));
      const ok       = placed.every(({ r, c }) => {
        const pk = `${r},${c}`;
        return ALL_VALID.has(pk) && !PERM_BLOCKED.has(pk) && !targetRCs.has(pk) && placedCellMap[pk] === undefined;
      });
      if (ok) {
        placed.forEach(({ r, c }) => validPreview.add(`${r},${c}`));
      } else {
        placed.forEach(({ r, c }) => {
          if (r >= 0 && r < 8 && c >= 0 && c < 7 && ALL_VALID.has(`${r},${c}`)) {
            invalidPreview.add(`${r},${c}`);
          }
        });
      }
    }

    // Update each cell element
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 7; c++) {
        const k    = `${r},${c}`;
        const cell = document.getElementById(`cal-${r}-${c}`);
        if (!cell) continue;

        const labelEl   = cell.querySelector('.cal-cell-label');
        const isBlocked = !ALL_VALID.has(k) || PERM_BLOCKED.has(k);

        cell.className     = 'cal-cell';
        cell.style.background = '';
        cell.style.cursor  = '';

        if (isBlocked) {
          cell.classList.add('cal-cell--blocked');
          labelEl.textContent = '';
          continue;
        }

        const isTarget  = targetRCs.has(k);
        const inValid   = validPreview.has(k);
        const inInvalid = invalidPreview.has(k);
        const pid       = displayBoard[k];
        const lbl       = BOARD_CELLS[k] || '';

        if (isTarget) {
          cell.classList.add('cal-cell--target');
          labelEl.textContent = lbl;
        } else if (inValid) {
          cell.classList.add('cal-cell--preview-valid');
          labelEl.textContent = '';
        } else if (inInvalid) {
          cell.classList.add('cal-cell--preview-invalid');
          labelEl.textContent = '';
        } else if (pid !== undefined) {
          cell.classList.add('cal-cell--placed');
          cell.style.background = PIECE_DEFS[pid].color;
          labelEl.textContent   = '';
          if (mode === 'play') cell.style.cursor = 'pointer';
        } else {
          cell.classList.add('cal-cell--empty');
          labelEl.textContent = lbl;
          if (mode === 'play' && selectedPiece !== null) cell.style.cursor = 'crosshair';
        }
      }
    }

    // Banners
    winBanner.hidden = !isWin;
    noSolsEl.hidden  = !(mode === 'solution' && solutions.length === 0);

    // Play mode button state
    playModeBtn.classList.toggle('btn-primary', mode === 'play');
    playModeBtn.classList.toggle('btn-outline',  mode !== 'play');

    // Solution navigator
    if (mode === 'solution' && solutions.length > 0) {
      solNav.hidden = false;
      const more    = solutions.length >= 50 ? ' (50+ exist)' : '';
      solCount.textContent  = `Solution ${solIdx + 1} of ${solutions.length}${more}`;
      prevSolBtn.disabled   = solIdx === 0;
      nextSolBtn.disabled   = solIdx === solutions.length - 1;
    } else {
      solNav.hidden = true;
    }

    // Show/hide piece tray
    pieceTray.hidden = mode !== 'play';
  }

  // ── Build board DOM (once) ────────────────────────────────────────────────────
  function buildBoardDOM() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 7; c++) {
        const k    = `${r},${c}`;
        const cell = document.createElement('div');
        cell.id        = `cal-${r}-${c}`;
        cell.className = 'cal-cell';
        cell.setAttribute('role', 'gridcell');

        const labelEl       = document.createElement('span');
        labelEl.className   = 'cal-cell-label';
        cell.appendChild(labelEl);

        const isBlocked = !ALL_VALID.has(k) || PERM_BLOCKED.has(k);
        if (!isBlocked) {
          cell.addEventListener('click',      () => handleCellClick(r, c));
          cell.addEventListener('mouseenter', () => { hoverCell = [r, c]; renderBoard(); });
          cell.addEventListener('mouseleave', () => { hoverCell = null;   renderBoard(); });
        }
        boardEl.appendChild(cell);
      }
    }
  }

  // ── Piece tray rendering ──────────────────────────────────────────────────────
  function renderPieceTray() {
    piecesGrid.innerHTML = '';
    const usedIds = new Set(Object.keys(placedPieces).map(Number));

    PIECE_DEFS.forEach(p => {
      const isUsed = usedIds.has(p.id);
      const isSel  = selectedPiece === p.id;
      const orient = PIECE_ORIENTATIONS[p.id][orientIdxs[p.id]];
      const maxR   = Math.max(...orient.map(([r]) => r));
      const maxC   = Math.max(...orient.map(([, c]) => c));
      const SQ     = 14;

      const wrapper       = document.createElement('div');
      wrapper.className   = 'cal-piece-wrapper' + (isUsed ? ' cal-piece--used' : '');

      const canvas        = document.createElement('div');
      canvas.className    = 'cal-piece-canvas';
      canvas.style.cssText = [
        'position: relative',
        `width: ${(maxC + 1) * SQ + 4}px`,
        `height: ${(maxR + 1) * SQ + 4}px`,
        'min-width: 32px',
        'min-height: 32px',
        `outline: 2px solid ${isSel ? p.color : 'transparent'}`,
        'border-radius: 4px',
        'padding: 2px',
        `cursor: ${isUsed ? 'default' : 'pointer'}`,
        'transition: outline-color 0.15s',
      ].join(';');

      orient.forEach(([pr, pc]) => {
        const sq          = document.createElement('div');
        sq.className      = 'cal-piece-sq';
        sq.style.cssText  = [
          'position: absolute',
          `left: ${pc * SQ + 2}px`,
          `top: ${pr * SQ + 2}px`,
          `width: ${SQ - 1}px`,
          `height: ${SQ - 1}px`,
          `background: ${p.color}`,
          'border-radius: 2px',
        ].join(';');
        canvas.appendChild(sq);
      });

      if (!isUsed) {
        canvas.addEventListener('click', () => {
          selectedPiece = (selectedPiece === p.id) ? null : p.id;
          renderPieceTray();
          renderBoard();
        });
      }

      const rotBtn          = document.createElement('button');
      rotBtn.className      = 'cal-rotate-btn';
      rotBtn.textContent    = '↻ rotate';
      rotBtn.disabled       = isUsed;
      rotBtn.setAttribute('aria-label', `Rotate piece ${p.id + 1}`);
      rotBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (isUsed) return;
        orientIdxs[p.id] = (orientIdxs[p.id] + 1) % PIECE_ORIENTATIONS[p.id].length;
        renderPieceTray();
        renderBoard();
      });

      wrapper.appendChild(canvas);
      wrapper.appendChild(rotBtn);
      piecesGrid.appendChild(wrapper);
    });
  }

  // ── Cell click handler ────────────────────────────────────────────────────────
  function handleCellClick(r, c) {
    if (mode !== 'play') return;
    const k         = `${r},${c}`;
    const targetRCs = getTargetRCs();
    if (PERM_BLOCKED.has(k) || !ALL_VALID.has(k) || targetRCs.has(k)) return;

    const placedCellMap = getPlacedCellMap();

    // Remove piece if the cell is already occupied
    if (placedCellMap[k] !== undefined) {
      const pid = placedCellMap[k];
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
      return ALL_VALID.has(pk) && !PERM_BLOCKED.has(pk) && !targetRCs.has(pk) && placedCellMap[pk] === undefined;
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
    placedPieces  = {};
    selectedPiece = null;
    solutions     = [];
    solIdx        = 0;
    mode          = 'play';
    orientIdxs    = Array(10).fill(0);
    renderPieceTray();
    renderBoard();
  }

  // ── Event listeners ───────────────────────────────────────────────────────────
  monthSel.addEventListener('change',   e => { selMonth   = e.target.value; resetAll(); });
  daySel.addEventListener('change',     e => { selDay     = e.target.value; resetAll(); });
  weekdaySel.addEventListener('change', e => { selWeekday = e.target.value; resetAll(); });

  solveBtn.addEventListener('click', () => {
    solveBtn.textContent = 'Solving…';
    solveBtn.disabled    = true;
    setTimeout(() => {
      solutions = solve(selMonth, selDay, selWeekday, 50);
      solIdx    = 0;
      mode      = 'solution';
      solveBtn.textContent = 'Show Solutions';
      solveBtn.disabled    = false;
      renderBoard();
    }, 50);
  });

  playModeBtn.addEventListener('click', () => {
    mode = 'play';
    renderBoard();
    renderPieceTray();
  });

  resetBtn.addEventListener('click', resetAll);

  prevSolBtn.addEventListener('click', () => {
    if (solIdx > 0) { solIdx--; renderBoard(); }
  });

  nextSolBtn.addEventListener('click', () => {
    if (solIdx < solutions.length - 1) { solIdx++; renderBoard(); }
  });

  // ── Init ──────────────────────────────────────────────────────────────────────
  buildBoardDOM();
  renderPieceTray();
  renderBoard();

}());
