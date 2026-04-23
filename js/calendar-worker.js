'use strict';

// ── Board Definition ──────────────────────────────────────────────────────────
var MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var DAYS     = (function() { var a=[]; for(var i=1;i<=31;i++) a.push(String(i)); return a; }());
var WEEKDAYS = ['Sun','Mon','Tues','Wed','Thur','Fri','Sat'];

var BOARD_CELLS = {};
var LABEL_TO_RC = {};

(function buildBoard() {
  function add(r, c, lbl) {
    BOARD_CELLS[r + ',' + c] = lbl;
    LABEL_TO_RC[lbl] = r + ',' + c;
  }
  MONTHS.slice(0, 6).forEach(function(m, i) { add(0, i, m); });
  MONTHS.slice(6).forEach(function(m, i)    { add(1, i, m); });
  var d = 0;
  for (var r = 2; r <= 5; r++) {
    for (var c = 0; c < 7; c++) { add(r, c, DAYS[d++]); }
  }
  [DAYS[28], DAYS[29], DAYS[30], 'Sun', 'Mon', 'Tues', 'Wed'].forEach(function(lbl, c) { add(6, c, lbl); });
  ['Thur', 'Fri', 'Sat'].forEach(function(lbl, i) { add(7, i + 4, lbl); });
}());

var ALL_VALID    = (function() { var s = new Set(); Object.keys(BOARD_CELLS).forEach(function(k){ s.add(k); }); return s; }());
var PERM_BLOCKED = new Set(['0,6','1,6','7,0','7,1','7,2','7,3']);

// ── Piece Squares ─────────────────────────────────────────────────────────────
var PIECE_SQUARES = [
  [[0,0],[0,1],[1,0],[2,0]],           // 0: L-tetromino
  [[0,1],[1,1],[2,0],[2,1],[2,2]],     // 1: T-pentomino
  [[0,0],[0,1],[1,1],[1,2]],           // 2: S-tetromino
  [[0,0],[1,0],[2,0],[3,0],[3,1]],     // 3: L-pentomino
  [[0,0],[0,1],[0,2],[1,0],[1,2]],     // 4: U-pentomino
  [[0,0],[0,1],[1,0],[1,1],[2,0]],     // 5: P-pentomino
  [[0,1],[1,0],[1,1],[2,0],[3,0]],     // 6: skew-pentomino
  [[0,0],[1,0],[2,0],[3,0]],           // 7: I-tetromino
  [[0,0],[1,0],[2,0],[2,1],[2,2]],     // 8: J-pentomino
  [[0,0],[0,1],[1,1],[2,1],[2,2]],     // 9: S-pentomino
];

// ── Orientation helpers ───────────────────────────────────────────────────────
function normalize(sqs) {
  var minR = Infinity, minC = Infinity;
  for (var i = 0; i < sqs.length; i++) { if (sqs[i][0] < minR) minR = sqs[i][0]; if (sqs[i][1] < minC) minC = sqs[i][1]; }
  return sqs.map(function(s) { return [s[0] - minR, s[1] - minC]; })
            .sort(function(a, b) { return a[0] - b[0] || a[1] - b[1]; });
}
function rot90(sqs)  { return normalize(sqs.map(function(s) { return [s[1], -s[0]]; })); }
function flipH(sqs)  { var mx = 0; sqs.forEach(function(s){ if(s[1]>mx) mx=s[1]; }); return normalize(sqs.map(function(s){ return [s[0], mx-s[1]]; })); }
function sqKey(sqs)  { return normalize(sqs).map(function(s){ return s.join(','); }).join('|'); }
function getAllOrientations(sqs) {
  var seen = new Set(), res = [], cur = sqs;
  for (var f = 0; f < 2; f++) {
    for (var r = 0; r < 4; r++) {
      var n = normalize(cur), k = sqKey(n);
      if (!seen.has(k)) { seen.add(k); res.push(n); }
      cur = rot90(cur);
    }
    cur = flipH(cur);
  }
  return res;
}
var PIECE_ORIENTATIONS = PIECE_SQUARES.map(getAllOrientations);

// ── Solver ────────────────────────────────────────────────────────────────────
function solve(targetMonth, targetDay, targetWeekday, maxSols, onSolution) {
  var targetRCs = new Set();
  [LABEL_TO_RC[targetMonth], LABEL_TO_RC[targetDay], LABEL_TO_RC[targetWeekday]].forEach(function(v) { if (v) targetRCs.add(v); });

  var toFill = [];
  for (var r = 0; r < 8; r++) {
    for (var c = 0; c < 7; c++) {
      var k = r + ',' + c;
      if (ALL_VALID.has(k) && !PERM_BLOCKED.has(k) && !targetRCs.has(k)) toFill.push(k);
    }
  }

  var count     = 0;
  var board     = {};
  var used      = [false,false,false,false,false,false,false,false,false,false];
  var remaining = new Set(toFill);

  function bt() {
    if (remaining.size === 0) {
      onSolution(Object.assign({}, board));
      count++;
      return count >= maxSols;
    }

    var first = remaining.values().next().value;
    var parts = first.split(',');
    var fr = parseInt(parts[0], 10), fc = parseInt(parts[1], 10);

    for (var pid = 0; pid < 10; pid++) {
      if (used[pid]) continue;
      var orients = PIECE_ORIENTATIONS[pid];
      for (var oi = 0; oi < orients.length; oi++) {
        var orient = orients[oi];
        for (var si = 0; si < orient.length; si++) {
          var dr = fr - orient[si][0], dc = fc - orient[si][1];
          var placed = [];
          var ok = true;
          for (var pi = 0; pi < orient.length; pi++) {
            var pk = (orient[pi][0] + dr) + ',' + (orient[pi][1] + dc);
            if (!remaining.has(pk)) { ok = false; break; }
            placed.push(pk);
          }
          if (!ok) continue;
          for (var i = 0; i < placed.length; i++) { board[placed[i]] = pid; remaining.delete(placed[i]); }
          used[pid] = true;
          if (bt()) return true;
          used[pid] = false;
          for (var j = 0; j < placed.length; j++) { delete board[placed[j]]; remaining.add(placed[j]); }
        }
      }
    }
    return false;
  }

  bt();
  return count;
}

// ── Message handler ───────────────────────────────────────────────────────────
self.onmessage = function(e) {
  var d = e.data;
  var maxSols = d.maxSols || 100;
  try {
    var count = solve(d.month, d.day, d.weekday, maxSols, function(sol) {
      // Stream each solution to the main thread as found
      self.postMessage({ type: 'solution', solution: sol });
    });
    self.postMessage({ type: 'done', count: count });
  } catch (err) {
    self.postMessage({ type: 'error', error: String(err) });
  }
};
