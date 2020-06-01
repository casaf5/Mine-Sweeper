'use strict';

const MINE = `💣`
// const MINE = `<img style="width:51px;height:30px;" src="img/MINE.png"/>`
const FLAG = `⛳`
const NORMAL_STATE = `😀`
const LOSE_STATE = `🤯`
const WIN_STATE = `😎`
const NONE = ' '
const MINE_EXPLODE = new Audio('/sound/MINE_EXPLODE.mp3')


var gBoard
var gFirstClick
var gHintMode = false
var gCustomMode = false
var gCustomMinesCounter = 0


var gTimeStart
var gTimeInterval
var gMovesSaver = []
var gMinesLocation = []
var gSafeCells = []
var gResultsCount = localStorage.getItem('counter')


var gLevel = {
    size: 8,
    mines: 12
}
var gGame = {
    isOn: false,
    shownCount: 0,
    markedCount: 0,
    secsPassed: 0,
    lives: 3,
    safeClicks: 3,
    hints: 3

}
function setGameSettings(size, mines) {  //Resets all the variables and counters of the game. 
    gCustomMinesCounter = 0
    gLevel.size = size
    gLevel.mines = mines
    gGame.isOn = true
    gFirstClick = true
    gHintMode = false
    gGame = { isOn: false, shownCount: 0, markedCount: 0, secsPassed: 0, lives: 3, safeClicks: 3, hints: 3 }
    gGame.lives = size > 4 ? 3 : 1
    gMovesSaver = []
    gMinesLocation = []
    clearInterval(gTimeInterval)
    initGame()
}
function initGame() {
    gBoard = buildBoard(gGame.size)
    renderBoard(gBoard)
    resetCounters()
    updateState(NORMAL_STATE)
    loadResults()
    gGame.isOn = true
    gFirstClick = true
}

function buildBoard(size) {
    var board = [];
    for (var i = 0; i < gLevel.size; i++) {
        board[i] = [];
        for (var j = 0; j < gLevel.size; j++) {
            board[i][j] = {
                minesAroundCount: NONE,
                isShown: false,
                isMine: false,
                isMarked: false
            }
        }
    }
    return board;
}

function renderBoard(board) {
    var strHtml = '';
    for (var i = 0; i < board.length; i++) {
        var row = board[i];
        strHtml += '<tr>';
        for (var j = 0; j < row.length; j++) {
            var tdId = `cell-${i}-${j}`;
            strHtml += `<td id="${tdId}" class="hidden" onclick="cellClicked(this,${i},${j})" 
                        oncontextmenu="cellMarked(this,${i},${j}); return false;"> </td>`
        }
        strHtml += '</tr>';
    }
    var elMat = document.querySelector('.board');
    elMat.innerHTML = strHtml;

    //I Added this part for the table head row to always be in eh right size.
    var elTableHead = document.querySelector('thead tr')
    var size = Math.floor(gLevel.size / 3)
    var middle = size === 2 ? 4 : size
    if (size === 1) middle = 2
    strHtml = `<th colspan="${size}" class="minesmarked">${gLevel.mines}</th>                  
               <th colspan="${middle}" style="font-size:40px";
               class="state" onclick="setGameSettings(gLevel.size,gLevel.mines)">😀</th>
               <th colspan="${size}" class="time">00:00</th>`
    elTableHead.innerHTML = strHtml
}
function cellClicked(elCell, i, j) {       //main game event checks for all kind of situations
    if (gCustomMode) {                      //chekcs if Custom build mode is on. 
        elCell.innerHTML = MINE
        gBoard[i][j].isMine = true
        gMinesLocation.push({ i: i, j: j })
        gCustomMinesCounter++
        return
    }
    if (gFirstClick) {                  //checks for the first click then generate the board
        firstClick(i, j)
        getRandomMines(gBoard)
        setMinesNegsCount(gBoard)
        gFirstClick = false
        timer()
    }

    var currCell = gBoard[i][j]   //a variable to help the syntex
    if (currCell.isShown || !gGame.isOn) return
    if (gHintMode) {        //checks if we are in a Hint Mode Situatuon and pulls random square 
        showHint(i, j)
        gHintMode = false
        return
    }
    if (currCell.isMine) {                  //clicking on a MINE| 2 times it will glow red and pass , next -its GAMEOVER
        if (gGame.lives > 1) {
            elCell.classList.add('clickedmine')
            setTimeout(function () {
                elCell.classList.remove('clickedmine')
            }, 1000)
            updateLives()
            return
        }
        MINE_EXPLODE.play()
        updateLives()
        updateState(LOSE_STATE)
    }

    if (!currCell.isMine && currCell.minesAroundCount === NONE) {
        gMovesSaver.push([{ i: i, j: j }])
        gMovesSaver.push(expendShown(gBoard, elCell, i, j))         //full expand of the squares 
    } else {
        openCell(elCell, i, j)
        gMovesSaver.push([{ i: i, j: j }])
    }
    checkGameOver()
}

function cellMarked(elCell, i, j) {                 //right clicking the mouse sets a FLAG 
    if (!gBoard[i][j].isMarked && !gBoard[i][j].isShown) {
        if (gGame.markedCount === gLevel.mines) return
        elCell.innerText = FLAG
        gBoard[i][j].isMarked = true
        gGame.markedCount++


    } else {
        elCell.innerText = NONE
        gBoard[i][j].isMarked = false
        gGame.markedCount--
    }
    updateMarkedCounter()
    setTimeout(checkGameOver, 1000)
}

function setMinesNegsCount(board) {
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            if (board[i][j].isMine) continue;
            var minesCount = countCellMines(i, j)
            board[i][j].minesAroundCount = minesCount ? minesCount : NONE
        }
    }
}

function countCellMines(cellI, cellJ) {         //counting all MINES around a single cell
    var minesCount = 0;
    for (var i = cellI - 1; i <= cellI + 1; i++) {
        if (i < 0 || i >= gBoard.length) continue;
        for (var j = cellJ - 1; j <= cellJ + 1; j++) {
            if (j < 0 || j >= gBoard[0].length) continue;
            if (i === cellI && j === cellJ) continue;
            if (gBoard[i][j].isMine) minesCount++;
        }
    }
    return minesCount;
}

function expendShown(board, elCell, cellI, cellJ) {
    openCell(elCell, cellI, cellJ)
    var moves = []
    moves.push({ i: cellI, j: cellJ })
    for (var i = cellI - 1; i <= cellI + 1; i++) {
        if (i < 0 || i >= board.length) continue;
        for (var j = cellJ - 1; j <= cellJ + 1; j++) {
            if (j < 0 || j >= board[0].length) continue;
            if (i === cellI && j === cellJ || board[i][j].isShown) continue;
            elCell = getCellElement(i, j)
            if (board[i][j].minesAroundCount === NONE) {
                moves.push(...expendShown(board, elCell, i, j))
            }
            openCell(elCell, i, j)
            moves.push({ i: i, j: j })
        }
    }
    return moves
}
function clickedOnAMine() {

}

function openCell(elCell, cellI, cellJ) {      ///This function updates the DOM AND MODEL
    if (gBoard[cellI][cellJ].isShown) return
    var colorClass = getColor(cellI, cellJ)
    elCell.classList.remove('hidden', 'safeClick')
    elCell.classList.add('clicked', `${colorClass}`)

    //DOM
    elCell.innerHTML = gBoard[cellI][cellJ].isMine ? MINE : gBoard[cellI][cellJ].minesAroundCount
    //MODEL
    if (gBoard[cellI][cellJ].isMarked) {  //if the user clicked on a flagged cell
        gBoard[cellI][cellJ].isMarked = false
        gGame.markedCount--
        updateMarkedCounter()
    }

    gBoard[cellI][cellJ].isShown = true
    gGame.shownCount++
}

function checkGameOver() {
    if (gGame.lives === 0) {                ///LOSE SITUATION
        revealMines()
        gGame.isOn = false
        clearInterval(gTimeInterval)
        gTimeInterval = null
    }
    else if (gGame.markedCount + gGame.shownCount == gLevel.size ** 2) {  //WIN SITUATION
        updateState(WIN_STATE)
        saveResult()
        gGame.isOn = false
        clearInterval(gTimeInterval)
        gTimeInterval = null
    }
}
function firstClick(cellI, cellJ) {             //BASICLLY SPECIFING WHERE NOT TO PUT MINES. SO FIRST CLICK BE NO MINE
    for (var i = cellI - 1; i <= cellI + 1; i++) {
        if (i < 0 || i >= gBoard.length) continue;
        for (var j = cellJ - 1; j <= cellJ + 1; j++) {
            if (j < 0 || j >= gBoard[0].length) continue;
            gBoard[i][j].minesAroundCount = -1     //SOMTHING TO SPECIFY WHERE -NOT- TO PUT MINES.
        }
    }
}
function getRandomMines(board) {            //SPREADING MINES RANDOMALY (ACCORDING TO FIRST CLICK)
    var freeCells = getCellsWithoutMines()
    for (var i = 0; i < gLevel.mines; i++) {
        var index = Math.abs(getRandomInteger(0, freeCells.length) - getRandomInteger(0, freeCells.length)) //some kind of shuffle
        var cell = freeCells[index]
        board[cell.i][cell.j].isMine = true
        gMinesLocation.push({ i: cell.i, j: cell.j })
        freeCells.splice(index, 1)
    }
}

function revealMines() {            //IN GAME LOSE REVEALS ALL THE MINES
    for (var i = 0; i < gMinesLocation.length; i++) {
        var mine = gMinesLocation[i]
        var elCell = getCellElement(mine.i, mine.j)
        openCell(elCell, mine.i, mine.j)
    }
}

function updateLives() {
    gGame.lives--
    var elLifeCounter = document.querySelector('h2 span')
    elLifeCounter.innerText = gGame.lives
}

function updateState(state) {       //UPDATING THE SMILE 
    var elState = document.querySelector('.state')
    elState.innerText = state
}

function randSafeClick() {          // RANDOM SAFE SQUARE THE USER CAN CLICK
    if (gGame.safeClicks === 0 || !gGame.isOn) return
    gGame.safeClicks--
    gSafeCells = getCellsWithoutMines()
    var index = Math.abs(getRandomInteger(0, gSafeCells.length) - getRandomInteger(0, gSafeCells.length)) //some kind of shuffle
    var cell = gSafeCells[index]

    var elCell = getCellElement(cell.i, cell.j)
    elCell.classList.add('safeClick')
    setTimeout(function () {
        elCell.classList.remove('safeClick')
    }, 5000)

    var elSafeCounter = document.querySelector('.safe-counter')   //update the counter
    elSafeCounter.innerText = gGame.safeClicks


}

function resetCounters() {          //A FUNCION TO RESET ALL COUNTERS 
    var elLife = document.querySelector('h2 span')   //life counter
    elLife.innerText = gGame.lives
    var elSafeCounter = document.querySelector('.safe-counter') //safe-button counter
    elSafeCounter.innerText = gGame.safeClicks
    var elTimer = document.querySelector('.time')
    elTimer.innerText = '00:00'
    var elHints = document.querySelectorAll('.hint button') // hint button counter 
    for (var i = 0; i < elHints.length; i++) {
        var img = '/img/HINT_OFF.jpeg'
        elHints[i].style.backgroundImage = 'url(' + img + ')'
    }

}

function turnOnHintMode(elHintPic) {        //MOVING THE STATE OF THE GAME TO HINT MODE
    if (gGame.hints === 0 || gFirstClick || !gGame.isOn) return
    gHintMode = true
    var img = 'img/HINT_ON.png'
    elHintPic.style.backgroundImage = 'url(' + img + ')'
    var elHint = document.querySelector('.hint h4')
    elHint.style.display = 'block'

}

function showHint(cellI, cellJ) {       //REVEALING ALL SQUARES AROUND CLICKED CELL
    var hintCells = [];
    for (var i = cellI - 1; i <= cellI + 1; i++) {
        if (i < 0 || i >= gBoard.length) continue;
        for (var j = cellJ - 1; j <= cellJ + 1; j++) {
            if (j < 0 || j >= gBoard[0].length) continue;
            if (gBoard[i][j].isShown) continue
            var colorClass = getColor(i, j)
            var elCell = getCellElement(i, j)
            hintCells.push({ elCell: elCell, color: colorClass })
            elCell.classList.remove('hidden')
            elCell.classList.add('clicked', `${colorClass}`)
            elCell.innerHTML = gBoard[i][j].isMine ? MINE : gBoard[i][j].minesAroundCount

        }
    }
    setTimeout(function () {            //HIDING THE HINT AFTER 1 SECOND
        for (var i = 0; i < hintCells.length; i++) {
            var cell = hintCells[i].elCell
            var color = hintCells[i].color
            cell.classList.remove('clicked', `${color}`)
            cell.classList.add('hidden')
            cell.innerHTML = NONE
        }
    }, 1000)
}

function timer() {          //A FUNCTION TO UPDATE THE TIMER OF THE GAME
    var elTimer = document.querySelector('.time')
    gTimeStart = Date.now()
    gTimeInterval = setInterval(function () {

        var timeToShow = (Date.now() - gTimeStart) / 1000;
        elTimer.innerText = timeToShow < 10 ? '0' + timeToShow.toFixed(2) : timeToShow.toFixed(2)
    }, 1)
}

function updateMarkedCounter() {
    var count = gLevel.mines - gGame.markedCount
    var elMark = document.querySelector('.minesmarked')
    elMark.innerText = count < 10 ? '0' + count : count
}

function undoMove() {       //BRINGS THE USER 1 STEP BACKWARDS ANY CLICK
    if (!gGame.isOn) return
    var moves = gMovesSaver.pop()
    for (var i = 0; i < moves.length; i++) {
        var cell = moves[i]
        if (!gBoard[cell.i][cell.j].isShown) continue
        var elCell = getCellElement(cell.i, cell.j)
        elCell.classList.remove('clicked', 'red', 'blue', 'green', 'empty', 'mine')
        elCell.classList.add('hidden')
        elCell.innerText = NONE
        gBoard[cell.i][cell.j].isShown = false;
        gGame.shownCount--
        // if (gBoard[cell.i][cell.j].isMine) {        //OPTIMAL- IF IT WAS A MINE THE USER CAN GET 1 LIFE BACK. 
        //     gGame.lives += 2                         //I CHOOCED NOT TO PUT IT. 
        //     updateLives()
        // }
    }
}

function createCustomBoard(elButton) {   //PUTTING THE GAME IN CUSTOM MADE BOARD MODE
    if (!gCustomMode) {
        gCustomMode = true
        elButton.innerText = 'Place Mines And Click To Start'
        elButton.style.backgroundColor = 'green'
        gCustomMinesCounter = 0
        initGame()
        return
    }
    elButton.innerText = 'Create Custom Board'
    elButton.style.backgroundColor = 'orange'
    gLevel.mines = gCustomMinesCounter
    setMinesNegsCount(gBoard)
    renderBoard(gBoard)
    updateMarkedCounter()
    gCustomMode = false
    gFirstClick = false
    timer()
}

function saveResult() {     //IF THE USER WINS AND ITS BETTER SCORE THEN BEFORE , SAVES IT LOCALE   
    var elTimer = document.querySelector('.time')
    var time = elTimer.innerText
    var diffclity = ''
    switch (gLevel.size) {
        case 4:
            diffclity = 'EASY'
            break;
        case 8:
            diffclity = 'NORMAL'
            break;
        case 12:
            diffclity = 'HARD'
            break;
    }
    var currScore = localStorage.getItem(diffclity)
    if (+currScore.split(':')[0] > +time.split(':')[0]) localStorage.setItem(diffclity, time)
}

function loadResults() {        //LOADING THE RESULTS EVERY TIME THE GAME IS OPEN.

    var results = ['EASY', 'NORMAL', 'HARD']
    var strHtml = ''
    var elScores = document.querySelector('.scores tbody')
    results.forEach(diffclity => {
        var result = !localStorage.getItem(diffclity) ? 'NONE' : localStorage.getItem(diffclity)
        strHtml += `<tr><td>${diffclity}:</td></tr>
                    <tr"><td>-${result}-</td></tr>`
    });
    elScores.innerHTML = strHtml
}

function clearScores() {            //RESETTING THE SCORES
    localStorage.clear()
    location.reload()

}




