var board = [];
const player1 = "X";
const player2 = "O";
var turnValue = 1;
var iterations = 0;
const cells = document.querySelectorAll(".celltictac");
startTicTacToe();

//constructor
function startTicTacToe() {
    /*  Construct the board to be empty, start with player 1, 
    the buttons are listening for click and switches turn after
    each click. 
    */
    turnValue = 1;
    //board
    board = Array();
    for (var i = 0; i < 9; i++) {
        temp = board.push(i);
    }
    //buttons
    for (var i = 0; i < 9; i++) {
        cells[i].innerText = '';
        cells[i].dataset.mark = '';
        cells[i].style.removeProperty('background-color');
        cells[i].addEventListener('click', playerturn, true);
    }
    document.getElementById("AlertWinner").innerText = "Player Turn: X";
}
//destructor and removes event listener
function endGame() {
    for (var i = 0; i < 9; i++) {
        cells[i].removeEventListener('click', playerturn, true);
    }
}
//player turn function
function playerturn(box) {
    if (turnValue == 1) {
        try{
            turn(box.target.id, player1);
        } catch (err) {
            turn(box, player1);
        }
        if(AlertWinner(board)){
            document.getElementById("AlertWinner").innerText = (player1 +" is the Winner!");        
            endGame();
        }
        if(AlertCat(board)){
            document.getElementById("AlertWinner").innerText = ("It's a Draw!");
            endGame();
        }
    } else {
        try{
            turn(box.target.id, player2);
        } catch (err) {
            turn(box, player2);
        }
        if(AlertWinner(board)){
            document.getElementById("AlertWinner").innerText = (player2 +" is the Winner!");        
            endGame();
        }
        if(AlertCat(board)){
            document.getElementById("AlertWinner").innerText = ("It's a Draw!");
            endGame();
        }
    }
}
//basic turn function for each player
function turn(boxId, player) {
    board[boxId] = player;
    document.getElementById(boxId).innerText = player;
    document.getElementById(boxId).dataset.mark = player;
    document.getElementById(boxId).removeEventListener('click', playerturn, true)
    SwitchPlayer(player);
    if(turnValue == 1){
        player = player1;
    } else {
        player = player2;
    }
    document.getElementById("AlertWinner").innerText = ("Player Turn: " + player);
}
//Switches player turn value
function SwitchPlayer(player) {
    if (player == player1) {
        turnValue = 2;
    } else {
        turnValue = 1;
    }
}
//Returns true if the board is full (for cat game)
function BoardFull(board) {
    var j = 0;
    var isfull = false;
    for (var i = 0; i < board.length; i++) {
        if (board[i] == "X" || board[i] == "O") {
            j++;
        }
    }
    if (j == 9) {
        isfull = true;
    }
    return isfull;
}
//Returns true if there is a win
function checkWin(board, player) {
    Win = false;
    //horizontal
    for (var i = 0; i < 8; i = i + 3) {
        if (board[i] == board[i + 1] && board[i] == board[i + 2]) {
            if (board[i] == player) {
                Win = true;
                return Win;
            }
        }
    }
    //vertical
    for (var i = 0; i < 3; i++) {
        if (board[i] == board[i + 3] && board[i] == board[i + 6]) {
            if (board[i] == player) {
                Win = true;
                return Win;
            }
        }
    }
    //diagonal
    if (board[0] == board[4] && board[4] == board[8]) {
        if (board[0] == player) {
            Win = true;
            return Win;
        }
    }
    if (board[2] == board[4] && board[4] == board[6]) {
        if (board[2] == player) {
            Win = true;
            return Win;
        }
    }
    return Win;
}
//Returns true if there is a cats game
function AlertCat(board) {
    if (BoardFull(board) && !AlertWinner(board)) {
        return true;
    } else {
        return false;
    }
}
//Returns true if a Win
function AlertWinner(board) {
    Win = false;
    //horizontal
    for (var i = 0; i < 8; i = i + 3) {
        if (board[i] == board[i + 1] && board[i] == board[i + 2]) {
                Win = true;
                return Win;
        }
    }
    //vertical
    for (var i = 0; i < 3; i++) {
        if (board[i] == board[i + 3] && board[i] == board[i + 6]) {
                Win = true;
                return Win;
            }
        }
    //diagonal
    if (board[0] == board[4] && board[4] == board[8]) {
            Win = true;
            return Win;
        }
    if (board[2] == board[4] && board[4] == board[6]) {
            Win = true;
            return Win;
        }
    return Win;
}
//Computer Turn
function CompTurn() {
    let compBoard = board;
    if (turnValue == 1) {
        var player = "X";
    } else {
        var player = "O";
    }
    iterations = 0;
    var bestmove = minimax(compBoard,true,player,0,-Infinity,Infinity)[1];
    if(!AlertWinner(compBoard)){
        if (turnValue == 1) {
            playerturn(bestmove, player1);
        } else {
            playerturn(bestmove, player2);
        }
    }
}
//scores the board 
function evaluate(compBoard, max, min) {
    if (checkWin(compBoard, max)) {
        return 10;
    } else if (checkWin(compBoard, min)) {
        return -10;
    }
}
//recursive function minimax
function minimax(minimaxBoard, isMax, MaxValue, depth,alpha,beta) {
    iterations += 1;
    if (MaxValue == "X") {
        var MinValue = "O";
    } else {
        var MinValue = "X";
    }
    //This fills the availableSpots array with empty spaces
    let availableSpots = [];
    for (var i = 0; i < minimaxBoard.length; i++) {
        if (Number.isInteger(minimaxBoard[i])) {
            availableSpots.push(minimaxBoard[i]);
        }
    }
    //Returns the score if maximizer won or minimizer
    let score = evaluate(minimaxBoard, MaxValue, MinValue);
    if (score == 10) {
        return [(score - depth),null];
    }
    if (score == -10) {
        return [(score + depth),null];
    }
    if (availableSpots.length == 0) {
        return [0,null];
    }
    //If it's maximizer's move
    if (isMax) {
        var best = -Infinity;
        for (var i = 0; i < availableSpots.length; i++) {
            minimaxBoard[availableSpots[i]] = MaxValue;
            var moveValue = Math.max(best,minimax(minimaxBoard, false, MaxValue, depth + 1)[0]);
            minimaxBoard[availableSpots[i]] = availableSpots[i];
            if (moveValue > best) {
                best = moveValue;
                var bestmove = availableSpots[i];
                }
            alpha = Math.max(alpha,best);
            if(alpha>=beta){
                break;
            }
        }
    return [best,bestmove];
    }
    //If it's minimizers move 
    else {
        var best = Infinity;
        for (var i = 0; i < availableSpots.length; i++) {
            minimaxBoard[availableSpots[i]] = MinValue;
            var moveValue = Math.min(best,minimax(minimaxBoard, true, MaxValue, depth + 1)[0]);
            minimaxBoard[availableSpots[i]] = availableSpots[i];
            if (moveValue < best) {
                best = moveValue;
                var bestmove = availableSpots[i];
            }
            beta = Math.min(beta,best);
            if(alpha>=beta){
                break;
            }
        }
        return [best,bestmove];
    }
}