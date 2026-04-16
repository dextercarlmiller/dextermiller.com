(function () {

  var gridboard = [];
  var difficulty = GetDifficulty();
  var player = 1;
  var iterations = 0;

  startconnect();

  /* Wire up game control buttons */
  document.getElementById('c4Restart').addEventListener('click', startconnect);
  document.getElementById('c4AI').addEventListener('click', ConnectComp);

  /* Count occurrences of a value in an array (replaces Array.prototype extension) */
  function countValues(arr, value) {
    var count = 0;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === value) count++;
    }
    return count;
  }

  /* Constructor — resets the board and starts a new game */
  function startconnect() {
    player = 1;
    gridboard = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0]
    ];
    for (var row = 0; row < 6; row++) {
      for (var col = 0; col < 7; col++) {
        var cell = document.getElementById('' + row + col);
        cell.addEventListener('click', selectColumn, true);
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('role', 'button');
        cell.setAttribute('aria-label', 'Drop in column ' + (col + 1));
        cell.addEventListener('keydown', handleConnectKeydown, true);
      }
    }
    document.getElementById('AlertConnectWinner').innerText = 'Player Turn: Yellow';
    refreshgridboard(gridboard);
  }

  /* Keyboard handler — Enter or Space drops a piece in that column */
  function handleConnectKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      var col = parseInt(e.target.id) % 10;
      selectColumn(col);
    }
  }

  /* Drops player move in the corresponding column and updates the next player */
  function selectColumn(box) {
    var column;
    try {
      column = box.target.id % 10;
    } catch (err) {
      column = box;
    }
    if (column == null) {
      document.getElementById('AlertConnectWinner').innerText = 'Game Over!';
    }
    if (!columnFull(gridboard, column)) {
      gridboard = drop(column, player, gridboard);
      if (player == 1) {
        player = 2;
        document.getElementById('AlertConnectWinner').innerText = 'Player Turn: Red';
      } else {
        player = 1;
        document.getElementById('AlertConnectWinner').innerText = 'Player Turn: Yellow';
      }
      refreshgridboard(gridboard);
    }
    AlertConnectWinner(gridboard, player);
  }

  /* Updates the board display with the correct cell colors */
  function refreshgridboard(gridboard) {
    for (var row = 0; row < 6; row++) {
      for (var col = 0; col < 7; col++) {
        var cell = document.getElementById('' + row + col);
        if (gridboard[row][col] == 0) {
          cell.style.setProperty('background-color', '#dbeafe');
        } else if (gridboard[row][col] == 1) {
          cell.style.setProperty('background-color', '#fbbf24');
        } else if (gridboard[row][col] == 2) {
          cell.style.setProperty('background-color', '#ef4444');
        }
      }
    }
  }

  /* Returns true if the given column is full */
  function columnFull(gridboard, columnselect) {
    return gridboard[0][columnselect] == 1 || gridboard[0][columnselect] == 2;
  }

  /* Drops a piece down the column and returns the updated board */
  function drop(col, player, connectboard) {
    var tempboard = connectboard.map(function (inner) { return inner.slice(); });
    for (var row = 5; row >= 0; row--) {
      if (tempboard[row][col] == 0) {
        tempboard[row][col] = player;
        return tempboard;
      }
    }
  }

  /* Returns true if the board is completely full */
  function checkConnectFull(gridboard) {
    for (var col = 0; col < 7; col++) {
      if (gridboard[0][col] == 0) return false;
    }
    return true;
  }

  /* Returns true if any four-in-a-row exists on the board */
  function checkConnectWin(gridboard) {
    var row, col;
    for (row = 0; row < 6; row++) {
      for (col = 0; col < 4; col++) {
        if (gridboard[row][col] == gridboard[row][col + 1] &&
            gridboard[row][col + 1] == gridboard[row][col + 2] &&
            gridboard[row][col + 2] == gridboard[row][col + 3]) {
          if (gridboard[row][col] == 1 || gridboard[row][col] == 2) return true;
        }
      }
    }
    for (row = 0; row < 3; row++) {
      for (col = 0; col < 7; col++) {
        if (gridboard[row][col] == gridboard[row + 1][col] &&
            gridboard[row + 1][col] == gridboard[row + 2][col] &&
            gridboard[row + 2][col] == gridboard[row + 3][col]) {
          if (gridboard[row][col] == 1 || gridboard[row][col] == 2) return true;
        }
      }
    }
    for (row = 0; row < 3; row++) {
      for (col = 0; col < 4; col++) {
        if (gridboard[row][col] == gridboard[row + 1][col + 1] &&
            gridboard[row + 1][col + 1] == gridboard[row + 2][col + 2] &&
            gridboard[row + 2][col + 2] == gridboard[row + 3][col + 3]) {
          if (gridboard[row][col] == 1 || gridboard[row][col] == 2) return true;
        }
      }
    }
    for (row = 0; row < 3; row++) {
      for (col = 3; col < 7; col++) {
        if (gridboard[row][col] == gridboard[row + 1][col - 1] &&
            gridboard[row + 1][col - 1] == gridboard[row + 2][col - 2] &&
            gridboard[row + 2][col - 2] == gridboard[row + 3][col - 3]) {
          if (gridboard[row][col] == 1 || gridboard[row][col] == 2) return true;
        }
      }
    }
    return false;
  }

  /* Returns true if the specified player has four in a row */
  function checkConnectWinner(gridboard, theplayer) {
    var row, col;
    for (row = 0; row < 6; row++) {
      for (col = 0; col < 4; col++) {
        if (gridboard[row][col] == theplayer &&
            gridboard[row][col + 1] == theplayer &&
            gridboard[row][col + 2] == theplayer &&
            gridboard[row][col + 3] == theplayer) return true;
      }
    }
    for (row = 0; row < 3; row++) {
      for (col = 0; col < 7; col++) {
        if (gridboard[row][col] == theplayer &&
            gridboard[row + 1][col] == theplayer &&
            gridboard[row + 2][col] == theplayer &&
            gridboard[row + 3][col] == theplayer) return true;
      }
    }
    for (row = 0; row < 3; row++) {
      for (col = 0; col < 4; col++) {
        if (gridboard[row][col] == theplayer &&
            gridboard[row + 1][col + 1] == theplayer &&
            gridboard[row + 2][col + 2] == theplayer &&
            gridboard[row + 3][col + 3] == theplayer) return true;
      }
    }
    for (row = 0; row < 3; row++) {
      for (col = 3; col < 7; col++) {
        if (gridboard[row][col] == theplayer &&
            gridboard[row + 1][col - 1] == theplayer &&
            gridboard[row + 2][col - 2] == theplayer &&
            gridboard[row + 3][col - 3] == theplayer) return true;
      }
    }
    return false;
  }

  /* Returns true if the game is a draw */
  function checkConnectDraw(Connectboard) {
    return !checkConnectWin(Connectboard) && checkConnectFull(Connectboard);
  }

  /* Updates the status bar and ends the game if there is a winner or draw */
  function AlertConnectWinner(ConnectBoard, player) {
    var ConnectWinner = player == 1 ? 'Red' : 'Yellow';
    if (checkConnectWin(ConnectBoard)) {
      document.getElementById('AlertConnectWinner').innerText = ConnectWinner + ' is the winner!';
      endconnect();
    }
    if (checkConnectDraw(ConnectBoard)) {
      document.getElementById('AlertConnectWinner').innerText = 'There is a Draw!';
      endconnect();
    }
  }

  /* Removes all event listeners from board cells when the game ends */
  function endconnect() {
    for (var row = 0; row < 6; row++) {
      for (var col = 0; col < 7; col++) {
        var cell = document.getElementById('' + row + col);
        cell.removeEventListener('click', selectColumn, true);
        cell.removeEventListener('keydown', handleConnectKeydown, true);
        cell.removeAttribute('tabindex');
      }
    }
  }

  /* Triggers the AI to make its move */
  function ConnectComp() {
    if (!checkConnectWin(gridboard) || !checkConnectFull(gridboard)) {
      var maximizer, minimizer;
      if (player == 1) {
        maximizer = 1;
        minimizer = 2;
      } else {
        maximizer = 2;
        minimizer = 1;
      }
      iterations = 0;
      difficulty = GetDifficulty();
      var Temp_values = alphabeta(gridboard, difficulty, maximizer, minimizer, true, -Infinity, Infinity);
      var best_column = Temp_values[1];
      selectColumn(best_column);
    }
  }

  function GetDifficulty() {
    var radio = document.querySelector('input[name="c4difficulty"]:checked');
    return (radio && radio.value === 'easy') ? 4 : 6;
  }

  function isterminal_node(theboard, maximizer, minimizer) {
    return checkConnectWinner(theboard, maximizer) || checkConnectWinner(theboard, minimizer);
  }

  /* Alpha-Beta pruning algorithm */
  function alphabeta(theboard, depth, maximizer, minimizer, maximizingplayer, alpha, beta) {
    iterations += 1;
    var tempboard = theboard.map(function (inner) { return inner.slice(); });
    var valid_locations = [];
    for (var i = 0; i < 7; i++) {
      if (!columnFull(tempboard, i)) valid_locations.push(i);
    }
    if (depth == 0 || isterminal_node(theboard, maximizer, minimizer)) {
      if (isterminal_node(theboard, maximizer, minimizer)) {
        if (checkConnectWinner(theboard, maximizer)) return [1000, null];
        else if (checkConnectWinner(theboard, minimizer)) return [-1000, null];
        else return [0, null];
      } else {
        if (difficulty % 2 == 0) return [score(tempboard, maximizer), null];
        else return [score(tempboard, minimizer), null];
      }
    }
    var i, value, bests, Temp_value, b_copy, c_copy;
    if (maximizingplayer) {
      value = -Infinity;
      bests = [];
      for (i = 0; i < valid_locations.length; i++) {
        b_copy = tempboard.map(function (inner) { return inner.slice(); });
        b_copy = drop(valid_locations[i], maximizer, b_copy);
        Temp_value = alphabeta(b_copy, depth - 1, maximizer, minimizer, false, alpha, beta)[0];
        if (Temp_value > value) {
          value = Temp_value;
          bests.push(valid_locations[i]);
        }
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return [value, bests[bests.length - 1]];
    } else {
      value = Infinity;
      bests = [];
      for (i = 0; i < valid_locations.length; i++) {
        c_copy = tempboard.map(function (inner) { return inner.slice(); });
        c_copy = drop(valid_locations[i], minimizer, c_copy);
        Temp_value = alphabeta(c_copy, depth - 1, maximizer, minimizer, true, alpha, beta)[0];
        if (Temp_value < value) {
          value = Temp_value;
          bests.push(valid_locations[i]);
        }
        beta = Math.min(beta, value);
        if (alpha >= beta) break;
      }
      return [value, bests[bests.length - 1]];
    }
  }

  /* Heuristic board evaluation for Alpha-Beta */
  function score(board, player) {
    var opponent = player == 1 ? 2 : 1;
    var score_position = 0;
    var row, col, window_array;

    /* Center column bonus */
    var center_array = [];
    for (row = 0; row < 6; row++) center_array.push(board[row][3]);
    score_position += countValues(center_array, player) * 3;

    /* Horizontal windows */
    for (row = 0; row < 6; row++) {
      for (col = 0; col < 4; col++) {
        window_array = [board[row][col], board[row][col+1], board[row][col+2], board[row][col+3]];
        if (!window_array.includes(0) && window_array.includes(player) !== window_array.includes(opponent)) score_position += 100;
        if (countValues(window_array, player) == 3 && countValues(window_array, 0) == 1) score_position += 5;
        if (countValues(window_array, player) == 2 && countValues(window_array, 0) == 2) score_position += 2;
        if (countValues(window_array, opponent) == 3 && countValues(window_array, 0) == 1) score_position -= 5;
      }
    }

    /* Vertical windows */
    for (row = 0; row < 3; row++) {
      for (col = 0; col < 7; col++) {
        window_array = [board[row][col], board[row+1][col], board[row+2][col], board[row+3][col]];
        if (!window_array.includes(0) && window_array.includes(player) !== window_array.includes(opponent)) score_position += 100;
        if (countValues(window_array, player) == 3 && countValues(window_array, 0) == 1) score_position += 5;
        if (countValues(window_array, player) == 2 && countValues(window_array, 0) == 2) score_position += 2;
        if (countValues(window_array, opponent) == 3 && countValues(window_array, 0) == 1) score_position -= 5;
      }
    }

    /* Diagonal \ windows */
    for (row = 0; row < 3; row++) {
      for (col = 0; col < 4; col++) {
        window_array = [board[row][col], board[row+1][col+1], board[row+2][col+2], board[row+3][col+3]];
        if (!window_array.includes(0) && window_array.includes(player) !== window_array.includes(opponent)) score_position += 100;
        if (countValues(window_array, player) == 3 && countValues(window_array, 0) == 1) score_position += 5;
        if (countValues(window_array, player) == 2 && countValues(window_array, 0) == 2) score_position += 2;
        if (countValues(window_array, opponent) == 3 && countValues(window_array, 0) == 1) score_position -= 5;
      }
    }

    /* Diagonal / windows */
    for (row = 0; row < 3; row++) {
      for (col = 3; col < 7; col++) {
        window_array = [board[row][col], board[row+1][col-1], board[row+2][col-2], board[row+3][col-3]];
        if (!window_array.includes(0) && window_array.includes(player) !== window_array.includes(opponent)) score_position += 100;
        if (countValues(window_array, player) == 3 && countValues(window_array, 0) == 1) score_position += 5;
        if (countValues(window_array, player) == 2 && countValues(window_array, 0) == 2) score_position += 2;
        if (countValues(window_array, opponent) == 3 && countValues(window_array, 0) == 1) score_position -= 5;
      }
    }

    return score_position;
  }

}());
