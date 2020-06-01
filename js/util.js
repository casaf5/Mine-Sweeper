function createMat(ROWS, COLS) {
    var mat = []
    for (var i = 0; i < ROWS; i++) {
        var row = []
        for (var j = 0; j < COLS; j++) {
            row.push('')
        }
        mat.push(row)
    }
    return mat
}

function getRandomInteger(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min
}

function renderCell(location, value) {
    var elCell = document.querySelector(`.cell${location.i}-${location.j}`);
    elCell.innerHTML = value;
}

function getCellElement(i, j) {
    var selcetor = `#cell-${i}-${j}`
    var elCell = document.querySelector(selcetor)
    return elCell;
}

function getCellsWithoutMines() {     //FOR 2 PURPOSSES : A.TO FIND FREE SPACE FOR MINES
    var freeCells = []                                 // B.AFTER SETTINGS THE MINES , TO FIND FREE PLACE FOR A SAFE CLICK
    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard[0].length; j++) {
            if (gBoard[i][j].isMine) continue
            if (!gBoard[i][j].isShown && gBoard[i][j].minesAroundCount !== -1)
                freeCells.push({ i: i, j: j });
        }
    }
    return freeCells
}

function getColor(i, j) {               
    if (gBoard[i][j].isMine) return 'mine'
    var cell = gBoard[i][j].minesAroundCount
    if (cell === NONE) return 'empty'
    if (cell === 1) return 'blue'
    if (cell === 2) return 'green'
    return 'red'

}