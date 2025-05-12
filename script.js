document.addEventListener('DOMContentLoaded', () => {
    // Game variables
    let board = Array(9).fill().map(() => Array(9).fill(0));
    let solution = Array(9).fill().map(() => Array(9).fill(0));
    let notes = Array(9).fill().map(() => Array(9).fill().map(() => Array(9).fill(false)));
    let selectedCell = null;
    let timer = null;
    let seconds = 0;
    let difficulty = 'easy';
    let gameActive = false;
    let notesMode = false;
    let soundEnabled = true;
    let darkMode = false;

    // DOM elements
    const gameBoard = document.getElementById('game-board');
    const timerElement = document.getElementById('timer');
    const difficultySelect = document.getElementById('difficulty-select');
    const newGameBtn = document.getElementById('new-game-btn');
    const checkBtn = document.getElementById('check-btn');
    const solveBtn = document.getElementById('solve-btn');
    const messageElement = document.getElementById('message');
    const numberButtons = document.querySelectorAll('.number');
    const notesToggleBtn = document.getElementById('notes-toggle-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    const highScoresList = document.getElementById('high-scores-list');
    const scoreTabs = document.querySelectorAll('.score-tab');

    // Sound elements
    const placeSound = document.getElementById('place-sound');
    const errorSound = document.getElementById('error-sound');
    const winSound = document.getElementById('win-sound');

    // Initialize the game
    function initGame() {
        createBoard();
        loadSettings();
        loadHighScores();

        // Set up event listeners
        difficultySelect.addEventListener('change', (e) => {
            difficulty = e.target.value;
            loadHighScores();
        });

        newGameBtn.addEventListener('click', startNewGame);
        checkBtn.addEventListener('click', checkSolution);
        solveBtn.addEventListener('click', showSolution);

        // Notes toggle
        notesToggleBtn.addEventListener('click', () => {
            notesMode = !notesMode;
            notesToggleBtn.classList.toggle('active', notesMode);
            saveSettings();
        });

        // Theme toggle
        themeToggleBtn.addEventListener('click', toggleDarkMode);

        // Sound toggle
        soundToggleBtn.addEventListener('click', toggleSound);

        // Score tabs
        scoreTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                scoreTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                loadHighScores(tab.getAttribute('data-difficulty'));
            });
        });

        // Number buttons
        numberButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (selectedCell && gameActive && !selectedCell.classList.contains('given')) {
                    const number = button.getAttribute('data-number');
                    const row = parseInt(selectedCell.getAttribute('data-row'));
                    const col = parseInt(selectedCell.getAttribute('data-col'));

                    if (notesMode && number !== '0') {
                        // Toggle note
                        toggleNote(row, col, parseInt(number));
                        renderNotes(row, col);
                        playSound(placeSound);
                    } else {
                        if (number === '0') {
                            // Clear cell
                            selectedCell.textContent = '';
                            board[row][col] = 0;
                            // Clear notes for this cell
                            clearNotes(row, col);
                            renderNotes(row, col);
                            playSound(placeSound);
                        } else {
                            // Place number
                            selectedCell.textContent = number;
                            board[row][col] = parseInt(number);

                            // Clear notes for this cell
                            clearNotes(row, col);

                            // Check if the move is valid
                            if (!isValidMove(row, col, parseInt(number))) {
                                selectedCell.classList.add('error');
                                playSound(errorSound);
                            } else {
                                selectedCell.classList.remove('error');
                                playSound(placeSound);
                            }

                            // Highlight same numbers
                            highlightSameNumbers(number);
                        }

                        // Check if the board is complete
                        if (isBoardFilled()) {
                            if (isBoardValid()) {
                                gameWon();
                            }
                        }
                    }
                }
            });
        });

        // Keyboard support
        document.addEventListener('keydown', handleKeyDown);

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

                // Create notes container
                const notesContainer = document.createElement('div');
                notesContainer.classList.add('notes');

                // Create 9 spans for notes
                for (let i = 1; i <= 9; i++) {
                    const noteSpan = document.createElement('span');
                    noteSpan.setAttribute('data-note', i);
                    notesContainer.appendChild(noteSpan);
                }

                cell.appendChild(notesContainer);

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
                        if (cell.textContent && !notesMode) {
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

        // Apply settings
        applyDarkMode();
        notesToggleBtn.classList.toggle('active', notesMode);
        updateSoundIcon();
    }

    // Reset the board
    function resetBoard() {
        board = Array(9).fill().map(() => Array(9).fill(0));
        solution = Array(9).fill().map(() => Array(9).fill(0));
        notes = Array(9).fill().map(() => Array(9).fill().map(() => Array(9).fill(false)));
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

            // Clear previous content
            cell.classList.remove('given', 'selected', 'error', 'same-number');

            // Add the main number if it exists
            if (board[row][col] !== 0) {
                cell.textContent = board[row][col];
                cell.classList.add('given');
            } else {
                cell.textContent = '';
                // Render notes for empty cells
                renderNotes(row, col);
            }
        });
    }

    // Toggle a note in a cell
    function toggleNote(row, col, num) {
        if (board[row][col] === 0) { // Only allow notes in empty cells
            notes[row][col][num-1] = !notes[row][col][num-1];
        }
    }

    // Clear all notes in a cell
    function clearNotes(row, col) {
        for (let i = 0; i < 9; i++) {
            notes[row][col][i] = false;
        }
    }

    // Render notes for a specific cell
    function renderNotes(row, col) {
        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (!cell) return;

        const notesContainer = cell.querySelector('.notes');
        const noteSpans = notesContainer.querySelectorAll('span');

        noteSpans.forEach((span, index) => {
            const noteNum = index + 1;
            span.textContent = notes[row][col][noteNum-1] ? noteNum : '';
        });
    }

    // Handle keyboard input
    function handleKeyDown(e) {
        if (!gameActive || !selectedCell) return;

        const row = parseInt(selectedCell.getAttribute('data-row'));
        const col = parseInt(selectedCell.getAttribute('data-col'));

        // If the cell is a given cell, only allow navigation
        if (selectedCell.classList.contains('given')) {
            handleNavigation(e.key);
            return;
        }

        if (e.key >= '1' && e.key <= '9') {
            // Number keys
            const num = parseInt(e.key);

            if (notesMode) {
                toggleNote(row, col, num);
                renderNotes(row, col);
                playSound(placeSound);
            } else {
                selectedCell.textContent = e.key;
                board[row][col] = num;

                // Clear notes for this cell
                clearNotes(row, col);

                // Check if the move is valid
                if (!isValidMove(row, col, num)) {
                    selectedCell.classList.add('error');
                    playSound(errorSound);
                } else {
                    selectedCell.classList.remove('error');
                    playSound(placeSound);
                }

                // Highlight same numbers
                highlightSameNumbers(e.key);

                // Check if the board is complete
                if (isBoardFilled() && isBoardValid()) {
                    gameWon();
                }
            }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            // Delete/Backspace keys - clear cell
            selectedCell.textContent = '';
            board[row][col] = 0;
            clearNotes(row, col);
            renderNotes(row, col);
            playSound(placeSound);
        } else if (e.key === 'n') {
            // Toggle notes mode
            notesToggleBtn.click();
        } else {
            // Arrow keys for navigation
            handleNavigation(e.key);
        }
    }

    // Handle arrow key navigation
    function handleNavigation(key) {
        if (!selectedCell) return;

        const row = parseInt(selectedCell.getAttribute('data-row'));
        const col = parseInt(selectedCell.getAttribute('data-col'));
        let newRow = row;
        let newCol = col;

        switch (key) {
            case 'ArrowUp':
                newRow = Math.max(0, row - 1);
                break;
            case 'ArrowDown':
                newRow = Math.min(8, row + 1);
                break;
            case 'ArrowLeft':
                newCol = Math.max(0, col - 1);
                break;
            case 'ArrowRight':
                newCol = Math.min(8, col + 1);
                break;
        }

        if (newRow !== row || newCol !== col) {
            const newCell = document.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);
            if (newCell) {
                selectedCell.classList.remove('selected');
                selectedCell = newCell;
                newCell.classList.add('selected');

                if (newCell.textContent && !notesMode) {
                    highlightSameNumbers(newCell.textContent);
                }
            }
        }
    }

    // Toggle dark mode
    function toggleDarkMode() {
        darkMode = !darkMode;
        applyDarkMode();
        saveSettings();
    }

    // Apply dark mode
    function applyDarkMode() {
        document.body.classList.toggle('dark-mode', darkMode);
        themeToggleBtn.innerHTML = darkMode ?
            '<i class="fas fa-sun"></i>' :
            '<i class="fas fa-moon"></i>';
    }

    // Toggle sound
    function toggleSound() {
        soundEnabled = !soundEnabled;
        updateSoundIcon();
        saveSettings();
    }

    // Update sound icon
    function updateSoundIcon() {
        soundToggleBtn.innerHTML = soundEnabled ?
            '<i class="fas fa-volume-up"></i>' :
            '<i class="fas fa-volume-mute"></i>';
    }

    // Play sound
    function playSound(sound) {
        if (soundEnabled) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log("Error playing sound:", e));
        }
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
                gameWon();
            } else {
                showMessage('So far so good! Keep going!', 'success');
                playSound(placeSound);
            }
        } else {
            showMessage('There are some errors in your solution.', 'error');
            playSound(errorSound);
        }
    }

    // Game won
    function gameWon() {
        showMessage('Congratulations! You solved the puzzle!', 'success');
        playSound(winSound);
        stopTimer();
        gameActive = false;

        // Add to high scores
        addHighScore(difficulty, seconds - 1);

        // Show animation
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            setTimeout(() => {
                cell.classList.add('fade-in');
                cell.style.backgroundColor = getRandomColor();
                setTimeout(() => {
                    cell.style.backgroundColor = '';
                }, 500);
            }, index * 20);
        });
    }

    // Get random color for win animation
    function getRandomColor() {
        const colors = [
            '#4CAF50', '#2196F3', '#FFC107', '#E91E63',
            '#9C27B0', '#00BCD4', '#FF5722', '#795548'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
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

        cells.forEach((cell, index) => {
            setTimeout(() => {
                const row = parseInt(cell.getAttribute('data-row'));
                const col = parseInt(cell.getAttribute('data-col'));

                cell.textContent = solution[row][col];
                cell.classList.remove('error', 'selected');
                cell.classList.add('slide-in');
            }, index * 10);
        });

        showMessage('Here is the solution.', 'success');
        playSound(placeSound);
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
        messageElement.className = 'message fade-in';
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

    // Format time for display
    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Add a high score
    function addHighScore(difficulty, time) {
        // Get existing scores
        let scores = JSON.parse(localStorage.getItem(`sudoku-scores-${difficulty}`)) || [];

        // Add new score
        const newScore = {
            time: time,
            date: new Date().toISOString()
        };

        scores.push(newScore);

        // Sort by time (ascending)
        scores.sort((a, b) => a.time - b.time);

        // Keep only top 10
        scores = scores.slice(0, 10);

        // Save back to localStorage
        localStorage.setItem(`sudoku-scores-${difficulty}`, JSON.stringify(scores));

        // Update display
        loadHighScores(difficulty);
    }

    // Load high scores
    function loadHighScores(difficultyFilter = null) {
        const currentDifficulty = difficultyFilter || difficulty;

        // Get scores for the current difficulty
        const scores = JSON.parse(localStorage.getItem(`sudoku-scores-${currentDifficulty}`)) || [];

        // Update the display
        if (scores.length === 0) {
            highScoresList.innerHTML = '<div class="no-scores">No scores yet. Complete a game to set a record!</div>';
        } else {
            let html = '';
            scores.forEach((score, index) => {
                const date = new Date(score.date).toLocaleDateString();
                html += `
                    <div class="score-item">
                        <span>#${index + 1} - ${formatTime(score.time)}</span>
                        <span>${date}</span>
                    </div>
                `;
            });
            highScoresList.innerHTML = html;
        }
    }

    // Save settings to localStorage
    function saveSettings() {
        const settings = {
            darkMode,
            soundEnabled,
            notesMode
        };
        localStorage.setItem('sudoku-settings', JSON.stringify(settings));
    }

    // Load settings from localStorage
    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('sudoku-settings')) || {
            darkMode: false,
            soundEnabled: true,
            notesMode: false
        };

        darkMode = settings.darkMode;
        soundEnabled = settings.soundEnabled;
        notesMode = settings.notesMode;
    }

    // Initialize the game
    initGame();
});
