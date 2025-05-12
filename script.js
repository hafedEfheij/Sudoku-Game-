document.addEventListener('DOMContentLoaded', () => {
    // Game variables
    let board = Array(9).fill().map(() => Array(9).fill(0));
    let solution = Array(9).fill().map(() => Array(9).fill(0));
    let selectedCell = null;
    let timer = null;
    let seconds = 0;
    let difficulty = 'easy';
    let gameActive = false;

    // DOM elements
    const gameBoard = document.getElementById('game-board');
    const timerElement = document.getElementById('timer');
    const difficultySelect = document.getElementById('difficulty-select');
    const newGameBtn = document.getElementById('new-game-btn');
    const checkBtn = document.getElementById('check-btn');
    const solveBtn = document.getElementById('solve-btn');
    const messageElement = document.getElementById('message');
    const numberButtons = document.querySelectorAll('.number');

    // Initialize the game
    function initGame() {
        createBoard();
        difficultySelect.addEventListener('change', (e) => {
            difficulty = e.target.value;
        });
        
        newGameBtn.addEventListener('click', startNewGame);
        checkBtn.addEventListener('click', checkSolution);
        solveBtn.addEventListener('click', showSolution);
        
        numberButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (selectedCell && gameActive) {
                    const number = button.getAttribute('data-number');
                    if (number === '0') {
                        // Clear cell
                        selectedCell.textContent = '';
                        const row = parseInt(selectedCell.getAttribute('data-row'));
                        const col = parseInt(selectedCell.getAttribute('data-col'));
                        board[row][col] = 0;
                    } else {
                        selectedCell.textContent = number;
                        const row = parseInt(selectedCell.getAttribute('data-row'));
                        const col = parseInt(selectedCell.getAttribute('data-col'));
                        board[row][col] = parseInt(number);
                        
                        // Check if the move is valid
                        if (!isValidMove(row, col, parseInt(number))) {
                            selectedCell.classList.add('error');
                        } else {
                            selectedCell.classList.remove('error');
                        }
                        
                        // Highlight same numbers
                        highlightSameNumbers(number);
                    }
                    
                    // Check if the board is complete
                    if (isBoardFilled()) {
                        if (isBoardValid()) {
                            showMessage('Congratulations! You solved the puzzle!', 'success');
                            stopTimer();
                            gameActive = false;
                        }
                    }
                }
            });
        });
        
        startNewGame();
    }

    // Create the 9x9 grid
    function createBoard() {
        gameBoard.innerHTML = '';
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.setAttribute('data-row', row);
                cell.setAttribute('data-col', col);
                
                cell.addEventListener('click', () => {
                    if (gameActive && !cell.classList.contains('given')) {
                        // Deselect previous cell
                        if (selectedCell) {
                            selectedCell.classList.remove('selected');
                        }
                        
                        // Select new cell
                        selectedCell = cell;
                        cell.classList.add('selected');
                        
                        // Highlight same numbers
                        if (cell.textContent) {
                            highlightSameNumbers(cell.textContent);
                        }
                    }
                });
                
                gameBoard.appendChild(cell);
            }
        }
    }

    // Start a new game
    function startNewGame() {
        resetBoard();
        generatePuzzle();
        renderBoard();
        startTimer();
        gameActive = true;
        messageElement.textContent = '';
        messageElement.className = 'message';
    }

    // Reset the board
    function resetBoard() {
        board = Array(9).fill().map(() => Array(9).fill(0));
        solution = Array(9).fill().map(() => Array(9).fill(0));
        selectedCell = null;
        stopTimer();
        seconds = 0;
        updateTimer();
    }

    // Generate a valid Sudoku puzzle
    function generatePuzzle() {
        // First, generate a solved board
        generateSolvedBoard();
        
        // Copy the solution
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                board[row][col] = solution[row][col];
            }
        }
        
        // Remove numbers based on difficulty
        let cellsToRemove;
        switch (difficulty) {
            case 'easy':
                cellsToRemove = 40; // 41 clues (81-40)
                break;
            case 'medium':
                cellsToRemove = 50; // 31 clues
                break;
            case 'hard':
                cellsToRemove = 60; // 21 clues
                break;
            default:
                cellsToRemove = 40;
        }
        
        // Randomly remove numbers
        let cellsRemoved = 0;
        while (cellsRemoved < cellsToRemove) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            
            if (board[row][col] !== 0) {
                board[row][col] = 0;
                cellsRemoved++;
            }
        }
    }

    // Generate a solved Sudoku board
    function generateSolvedBoard() {
        // Clear the solution board
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                solution[row][col] = 0;
            }
        }
        
        // Fill the board using backtracking
        solveSudoku(solution);
    }

    // Solve the Sudoku using backtracking algorithm
    function solveSudoku(board) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    // Try digits 1-9
                    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                    shuffleArray(numbers); // Randomize for variety
                    
                    for (let num of numbers) {
                        if (isValidPlacement(board, row, col, num)) {
                            board[row][col] = num;
                            
                            if (solveSudoku(board)) {
                                return true;
                            }
                            
                            board[row][col] = 0; // Backtrack
                        }
                    }
                    
                    return false; // No valid number found
                }
            }
        }
        
        return true; // Board is filled
    }

    // Check if a number can be placed at a position
    function isValidPlacement(board, row, col, num) {
        // Check row
        for (let c = 0; c < 9; c++) {
            if (board[row][c] === num) {
                return false;
            }
        }
        
        // Check column
        for (let r = 0; r < 9; r++) {
            if (board[r][col] === num) {
                return false;
            }
        }
        
        // Check 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (board[boxRow + r][boxCol + c] === num) {
                    return false;
                }
            }
        }
        
        return true;
    }

    // Check if a move is valid
    function isValidMove(row, col, num) {
        // Create a temporary board with the current state
        const tempBoard = board.map(row => [...row]);
        
        // Check if the move is valid
        return isValidPlacement(tempBoard, row, col, num);
    }

    // Render the board
    function renderBoard() {
        const cells = document.querySelectorAll('.cell');
        
        cells.forEach(cell => {
            const row = parseInt(cell.getAttribute('data-row'));
            const col = parseInt(cell.getAttribute('data-col'));
            
            cell.textContent = board[row][col] || '';
            cell.classList.remove('given', 'selected', 'error', 'same-number');
            
            if (board[row][col] !== 0) {
                cell.classList.add('given');
            }
        });
    }

    // Highlight cells with the same number
    function highlightSameNumbers(number) {
        const cells = document.querySelectorAll('.cell');
        
        cells.forEach(cell => {
            cell.classList.remove('same-number');
            
            if (cell.textContent === number && number !== '') {
                cell.classList.add('same-number');
            }
        });
    }

    // Check if the current solution is correct
    function checkSolution() {
        if (!gameActive) return;
        
        if (isBoardValid()) {
            if (isBoardFilled()) {
                showMessage('Congratulations! You solved the puzzle!', 'success');
                stopTimer();
                gameActive = false;
            } else {
                showMessage('So far so good! Keep going!', 'success');
            }
        } else {
            showMessage('There are some errors in your solution.', 'error');
        }
    }

    // Check if the board is valid
    function isBoardValid() {
        // Check rows
        for (let row = 0; row < 9; row++) {
            const rowNumbers = new Set();
            for (let col = 0; col < 9; col++) {
                if (board[row][col] !== 0) {
                    if (rowNumbers.has(board[row][col])) {
                        return false;
                    }
                    rowNumbers.add(board[row][col]);
                }
            }
        }
        
        // Check columns
        for (let col = 0; col < 9; col++) {
            const colNumbers = new Set();
            for (let row = 0; row < 9; row++) {
                if (board[row][col] !== 0) {
                    if (colNumbers.has(board[row][col])) {
                        return false;
                    }
                    colNumbers.add(board[row][col]);
                }
            }
        }
        
        // Check 3x3 boxes
        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                const boxNumbers = new Set();
                for (let row = 0; row < 3; row++) {
                    for (let col = 0; col < 3; col++) {
                        const r = boxRow * 3 + row;
                        const c = boxCol * 3 + col;
                        if (board[r][c] !== 0) {
                            if (boxNumbers.has(board[r][c])) {
                                return false;
                            }
                            boxNumbers.add(board[r][c]);
                        }
                    }
                }
            }
        }
        
        return true;
    }

    // Check if the board is completely filled
    function isBoardFilled() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    return false;
                }
            }
        }
        return true;
    }

    // Show the solution
    function showSolution() {
        if (!gameActive) return;
        
        const cells = document.querySelectorAll('.cell');
        
        cells.forEach(cell => {
            const row = parseInt(cell.getAttribute('data-row'));
            const col = parseInt(cell.getAttribute('data-col'));
            
            cell.textContent = solution[row][col];
            cell.classList.remove('error', 'selected');
        });
        
        showMessage('Here is the solution.', 'success');
        stopTimer();
        gameActive = false;
    }

    // Start the timer
    function startTimer() {
        stopTimer();
        seconds = 0;
        updateTimer();
        timer = setInterval(updateTimer, 1000);
    }

    // Stop the timer
    function stopTimer() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }

    // Update the timer display
    function updateTimer() {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        seconds++;
    }

    // Show a message
    function showMessage(text, type) {
        messageElement.textContent = text;
        messageElement.className = 'message';
        if (type) {
            messageElement.classList.add(type);
        }
    }

    // Shuffle an array (Fisher-Yates algorithm)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Initialize the game
    initGame();
});
