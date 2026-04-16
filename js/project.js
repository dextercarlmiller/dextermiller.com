(function () {

  var board = [];
  const player1 = 'X';
  const player2 = 'O';
  var turnValue = 1;
  var iterations = 0;
  const cells = document.querySelectorAll('.celltictac');

  startTicTacToe();

  /* Wire up game control buttons */
  document.getElementById('tttRestart').addEventListener('click', startTicTacToe);
  document.getElementById('tttAI').addEventListener('click', CompTurn);

  /* Keyboard handler — Enter or Space plays the focused cell */
  function handleTTTKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      playerturn({ target: { id: e.target.id } });
    }
  }

  /* Constructor — resets the board and starts a new game */
  function startTicTacToe() {
    turnValue = 1;
    board = [];
    for (var i = 0; i < 9; i++) {
      board.push(i);
    }
    for (var i = 0; i < 9; i++) {
      cells[i].innerText = '';
      cells[i].dataset.mark = '';
      cells[i].style.removeProperty('background-color');
      cells[i].setAttribute('tabindex', '0');
      cells[i].setAttribute('role', 'button');
      cells[i].setAttribute('aria-label', 'Cell ' + (i + 1) + ', empty');
      cells[i].addEventListener('click', playerturn, true);
      cells[i].addEventListener('keydown', handleTTTKeydown, true);
    }
    document.getElementById('AlertWinner').innerText = 'Player Turn: X';
  }

  /* Removes all event listeners when the game ends */
  function endGame() {
    for (var i = 0; i < 9; i++) {
      cells[i].removeEventListener('click', playerturn, true);
      cells[i].removeEventListener('keydown', handleTTTKeydown, true);
      cells[i].removeAttribute('tabindex');
    }
  }

  /* Handles a player's turn */
  function playerturn(box) {
    if (turnValue == 1) {
      try {
        turn(box.target.id, player1);
      } catch (err) {
        turn(box, player1);
      }
      if (AlertWinner(board)) {
        document.getElementById('AlertWinner').innerText = (player1 + ' is the Winner!');
        endGame();
      }
      if (AlertCat(board)) {
        document.getElementById('AlertWinner').innerText = ("It's a Draw!");
        endGame();
      }
    } else {
      try {
        turn(box.target.id, player2);
      } catch (err) {
        turn(box, player2);
      }
      if (AlertWinner(board)) {
        document.getElementById('AlertWinner').innerText = (player2 + ' is the Winner!');
        endGame();
      }
      if (AlertCat(board)) {
        document.getElementById('AlertWinner').innerText = ("It's a Draw!");
        endGame();
      }
    }
  }

  /* Applies a single move and updates the cell display */
  function turn(boxId, player) {
    board[boxId] = player;
    var cell = document.getElementById(boxId);
    cell.innerText = player;
    cell.dataset.mark = player;
    cell.setAttribute('aria-label', 'Cell ' + (parseInt(boxId) + 1) + ', ' + player);
    cell.removeEventListener('click', playerturn, true);
    cell.removeEventListener('keydown', handleTTTKeydown, true);
    cell.removeAttribute('tabindex');
    SwitchPlayer(player);
    if (turnValue == 1) {
      player = player1;
    } else {
      player = player2;
    }
    document.getElementById('AlertWinner').innerText = ('Player Turn: ' + player);
  }

  /* Toggles the active player */
  function SwitchPlayer(player) {
    if (player == player1) {
      turnValue = 2;
    } else {
      turnValue = 1;
    }
  }

  /* Returns true if all 9 cells are filled */
  function BoardFull(board) {
    var j = 0;
    for (var i = 0; i < board.length; i++) {
      if (board[i] == 'X' || board[i] == 'O') j++;
    }
    return j == 9;
  }

  /* Returns true if the given player has won */
  function checkWin(board, player) {
    var Win = false;
    for (var i = 0; i < 8; i = i + 3) {
      if (board[i] == board[i + 1] && board[i] == board[i + 2]) {
        if (board[i] == player) { Win = true; return Win; }
      }
    }
    for (var i = 0; i < 3; i++) {
      if (board[i] == board[i + 3] && board[i] == board[i + 6]) {
        if (board[i] == player) { Win = true; return Win; }
      }
    }
    if (board[0] == board[4] && board[4] == board[8]) {
      if (board[0] == player) { Win = true; return Win; }
    }
    if (board[2] == board[4] && board[4] == board[6]) {
      if (board[2] == player) { Win = true; return Win; }
    }
    return Win;
  }

  /* Returns true if the game is a draw */
  function AlertCat(board) {
    return BoardFull(board) && !AlertWinner(board);
  }

  /* Returns true if any three-in-a-row exists (either player) */
  function AlertWinner(board) {
    var Win = false;
    for (var i = 0; i < 8; i = i + 3) {
      if (board[i] == board[i + 1] && board[i] == board[i + 2]) { Win = true; return Win; }
    }
    for (var i = 0; i < 3; i++) {
      if (board[i] == board[i + 3] && board[i] == board[i + 6]) { Win = true; return Win; }
    }
    if (board[0] == board[4] && board[4] == board[8]) { Win = true; return Win; }
    if (board[2] == board[4] && board[4] == board[6]) { Win = true; return Win; }
    return Win;
  }

  /* Triggers the AI to calculate and play the best move */
  function CompTurn() {
    var compBoard = board;
    if (turnValue == 1) {
      var player = 'X';
    } else {
      var player = 'O';
    }
    iterations = 0;
    var bestmove = minimax(compBoard, true, player, 0, -Infinity, Infinity)[1];
    if (!AlertWinner(compBoard)) {
      if (turnValue == 1) {
        playerturn(bestmove, player1);
      } else {
        playerturn(bestmove, player2);
      }
    }
  }

  /* Returns +10 / -10 score for terminal board states */
  function evaluate(compBoard, max, min) {
    if (checkWin(compBoard, max)) {
      return 10;
    } else if (checkWin(compBoard, min)) {
      return -10;
    }
  }

  /* Recursive MinMax with Alpha-Beta pruning */
  function minimax(minimaxBoard, isMax, MaxValue, depth, alpha, beta) {
    iterations += 1;
    if (MaxValue == 'X') {
      var MinValue = 'O';
    } else {
      var MinValue = 'X';
    }
    var availableSpots = [];
    for (var i = 0; i < minimaxBoard.length; i++) {
      if (Number.isInteger(minimaxBoard[i])) availableSpots.push(minimaxBoard[i]);
    }
    var score = evaluate(minimaxBoard, MaxValue, MinValue);
    if (score == 10) return [(score - depth), null];
    if (score == -10) return [(score + depth), null];
    if (availableSpots.length == 0) return [0, null];

    if (isMax) {
      var best = -Infinity;
      var bestmove;
      for (var i = 0; i < availableSpots.length; i++) {
        minimaxBoard[availableSpots[i]] = MaxValue;
        var moveValue = Math.max(best, minimax(minimaxBoard, false, MaxValue, depth + 1, alpha, beta)[0]);
        minimaxBoard[availableSpots[i]] = availableSpots[i];
        if (moveValue > best) { best = moveValue; bestmove = availableSpots[i]; }
        alpha = Math.max(alpha, best);
        if (alpha >= beta) break;
      }
      return [best, bestmove];
    } else {
      var best = Infinity;
      var bestmove;
      for (var i = 0; i < availableSpots.length; i++) {
        minimaxBoard[availableSpots[i]] = MinValue;
        var moveValue = Math.min(best, minimax(minimaxBoard, true, MaxValue, depth + 1, alpha, beta)[0]);
        minimaxBoard[availableSpots[i]] = availableSpots[i];
        if (moveValue < best) { best = moveValue; bestmove = availableSpots[i]; }
        beta = Math.min(beta, best);
        if (alpha >= beta) break;
      }
      return [best, bestmove];
    }
  }

}());
