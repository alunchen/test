// 游戏常量
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    '#FF00FF', // 品红色 - T
    '#00FFFF', // 青色 - I
    '#FFFF00', // 黄色 - O
    '#00FF00', // 绿色 - S
    '#FF0000', // 红色 - Z
    '#0000FF', // 蓝色 - J
    '#FF7F00'  // 橙色 - L
];

// 方块形状定义
const SHAPES = [
    null,
    // T
    [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    // I
    [
        [0, 0, 0, 0],
        [2, 2, 2, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    // O
    [
        [3, 3],
        [3, 3]
    ],
    // S
    [
        [0, 4, 4],
        [4, 4, 0],
        [0, 0, 0]
    ],
    // Z
    [
        [5, 5, 0],
        [0, 5, 5],
        [0, 0, 0]
    ],
    // J
    [
        [6, 0, 0],
        [6, 6, 6],
        [0, 0, 0]
    ],
    // L
    [
        [0, 0, 7],
        [7, 7, 7],
        [0, 0, 0]
    ]
];

// 游戏状态
const GAME_STATES = {
    MENU: 0,
    PLAYING: 1,
    PAUSED: 2,
    GAME_OVER: 3
};

// 音效
let dropSound, clearSound, gameOverSound;

// 游戏变量
let canvas, ctx;
let nextPieceCanvas, nextPieceCtx;
let gameState;
let board;
let piece;
let nextPiece;
let dropCounter;
let dropInterval;
let lastTime;
let score;
let level;
let lines;
let animationId;
let isPaused = false;

// DOM 元素
let startButton, pauseButton, resetButton, restartButton, resumeButton;
let scoreElement, levelElement, linesElement, finalScoreElement;
let gameOverModal, pauseModal;

// 初始化游戏
function init() {
    // 获取DOM元素
    startButton = document.getElementById('start-button');
    pauseButton = document.getElementById('pause-button');
    resetButton = document.getElementById('reset-button');
    restartButton = document.getElementById('restart-button');
    resumeButton = document.getElementById('resume-button');
    scoreElement = document.getElementById('score');
    levelElement = document.getElementById('level');
    linesElement = document.getElementById('lines');
    finalScoreElement = document.getElementById('final-score');
    gameOverModal = document.getElementById('game-over-modal');
    pauseModal = document.getElementById('pause-modal');
    
    canvas = document.getElementById('tetris');
    ctx = canvas.getContext('2d');
    
    nextPieceCanvas = document.getElementById('nextPiece');
    nextPieceCtx = nextPieceCanvas.getContext('2d');
    
    // 设置画布缩放以避免模糊
    ctx.scale(1, 1);
    nextPieceCtx.scale(1, 1);
    
    // 初始化游戏状态
    gameState = GAME_STATES.MENU;
    
    // 添加事件监听器
    document.addEventListener('keydown', handleKeyPress);
    startButton.addEventListener('click', startGame);
    pauseButton.addEventListener('click', togglePause);
    resetButton.addEventListener('click', resetGame);
    restartButton.addEventListener('click', () => {
        hideModal(gameOverModal);
        resetGame();
        startGame();
    });
    resumeButton.addEventListener('click', () => {
        hideModal(pauseModal);
        togglePause();
    });
    
    // 初始化游戏
    resetGame();
    
    // 绘制初始界面
    drawMenu();
    
    console.log('游戏初始化完成');
}

// 重置游戏
function resetGame() {
    // 创建空游戏板
    board = createMatrix(COLS, ROWS);
    
    // 重置游戏变量
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000; // 初始下落速度 (ms)
    lastTime = 0;
    dropCounter = 0;
    
    // 更新UI
    updateScore();
    
    // 创建新方块
    piece = null;
    nextPiece = createPiece(Math.floor(Math.random() * 7) + 1);
    
    // 取消任何正在进行的动画
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // 重置游戏状态
    gameState = GAME_STATES.MENU;
    isPaused = false;
    
    // 更新按钮状态
    startButton.disabled = false;
    pauseButton.disabled = true;
    
    // 隐藏模态框
    hideModal(gameOverModal);
    hideModal(pauseModal);
    
    // 绘制游戏板
    draw();
}

// 开始游戏
function startGame() {
    console.log('开始游戏', gameState);
    if (gameState === GAME_STATES.MENU || gameState === GAME_STATES.GAME_OVER) {
        gameState = GAME_STATES.PLAYING;
        
        // 如果没有当前方块，创建一个
        if (!piece) {
            piece = createPiece(Math.floor(Math.random() * 7) + 1);
            resetPiece();
            nextPiece = createPiece(Math.floor(Math.random() * 7) + 1);
            console.log('创建新方块', piece);
        }
        
        // 更新按钮状态
        startButton.disabled = true;
        pauseButton.disabled = false;
        
        // 开始游戏循环
        lastTime = 0;
        update();
        console.log('游戏循环已启动');
    }
}

// 暂停/继续游戏
function togglePause() {
    if (gameState === GAME_STATES.PLAYING) {
        gameState = GAME_STATES.PAUSED;
        isPaused = true;
        pauseButton.textContent = '继续';
        showModal(pauseModal);
        
        // 暂停游戏循环
        cancelAnimationFrame(animationId);
    } else if (gameState === GAME_STATES.PAUSED) {
        gameState = GAME_STATES.PLAYING;
        isPaused = false;
        pauseButton.textContent = '暂停';
        hideModal(pauseModal);
        
        // 继续游戏循环
        lastTime = 0;
        update();
    }
}

// 游戏结束
function gameOver() {
    gameState = GAME_STATES.GAME_OVER;
    
    // 更新按钮状态
    startButton.disabled = false;
    pauseButton.disabled = true;
    
    // 显示游戏结束模态框
    finalScoreElement.textContent = score;
    showModal(gameOverModal);
    
    // 停止游戏循环
    cancelAnimationFrame(animationId);
}

// 创建矩阵
function createMatrix(width, height) {
    const matrix = [];
    for (let i = 0; i < height; i++) {
        matrix.push(new Array(width).fill(0));
    }
    return matrix;
}

// 创建方块
function createPiece(type) {
    return {
        type: type,
        matrix: SHAPES[type],
        pos: {x: 0, y: 0}
    };
}

// 重置方块位置
function resetPiece() {
    console.log('重置方块位置');
    
    if (!piece) {
        console.error('piece不存在，无法重置位置');
        return;
    }
    
    piece.pos.y = 0;
    piece.pos.x = Math.floor(COLS / 2) - Math.floor(piece.matrix[0].length / 2);
    
    console.log('方块新位置:', piece.pos);
    
    // 检查游戏是否结束
    if (checkCollision(piece)) {
        console.log('游戏结束检测：碰撞发生');
        gameOver();
    } else {
        console.log('游戏继续：无碰撞');
    }
}

// 旋转方块
function rotatePiece(piece, dir) {
    // 创建方块矩阵的副本
    const matrix = piece.matrix;
    const n = matrix.length;
    
    // 创建新矩阵
    const rotated = createMatrix(n, n);
    
    // 执行旋转
    if (dir > 0) { // 顺时针
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                rotated[x][n - 1 - y] = matrix[y][x];
            }
        }
    } else { // 逆时针
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                rotated[n - 1 - x][y] = matrix[y][x];
            }
        }
    }
    
    // 保存旧矩阵
    const oldMatrix = piece.matrix;
    
    // 应用新矩阵
    piece.matrix = rotated;
    
    // 检查碰撞，如果碰撞则恢复旧矩阵
    if (checkCollision()) {
        piece.matrix = oldMatrix;
    }
}

// 检查碰撞
function checkCollision(pieceToCheck) {
    // 如果没有提供方块参数，则使用全局的piece变量
    const currentPiece = pieceToCheck || piece;
    const matrix = currentPiece.matrix;
    const pos = currentPiece.pos;
    
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (matrix[y][x] !== 0 &&
                (board[y + pos.y] === undefined ||
                 board[y + pos.y][x + pos.x] === undefined ||
                 board[y + pos.y][x + pos.x] !== 0)) {
                return true;
            }
        }
    }
    
    return false;
}

// 合并方块到游戏板
function merge() {
    const matrix = piece.matrix;
    const pos = piece.pos;
    
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (matrix[y][x] !== 0) {
                board[y + pos.y][x + pos.x] = matrix[y][x];
            }
        }
    }
}

// 移动方块
function movePiece(dir) {
    piece.pos.x += dir;
    if (checkCollision()) {
        piece.pos.x -= dir;
    }
}

// 下落方块
function dropPiece() {
    piece.pos.y++;
    if (checkCollision()) {
        piece.pos.y--;
        merge();
        
        // 检查并清除完整的行
        clearLines();
        
        // 创建新方块
        piece = nextPiece;
        resetPiece();
        nextPiece = createPiece(Math.floor(Math.random() * 7) + 1);
        
        // 绘制下一个方块
        drawNextPiece();
    }
    
    // 重置下落计数器
    dropCounter = 0;
}

// 快速下落
function hardDrop() {
    while (!checkCollision()) {
        piece.pos.y++;
    }
    piece.pos.y--;
    merge();
    
    // 检查并清除完整的行
    clearLines();
    
    // 创建新方块
    piece = nextPiece;
    resetPiece();
    nextPiece = createPiece(Math.floor(Math.random() * 7) + 1);
    
    // 绘制下一个方块
    drawNextPiece();
    
    // 重置下落计数器
    dropCounter = 0;
}

// 清除完整的行
function clearLines() {
    let linesCleared = 0;
    
    outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        
        // 移除完整的行
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        y++; // 检查同一行（现在是新行）
        
        linesCleared++;
    }
    
    if (linesCleared > 0) {
        // 更新分数
        updateScore(linesCleared);
        
        // 添加行清除动画效果
        // 这里可以添加闪烁或其他视觉效果
    }
}

// 更新分数
function updateScore(linesCleared = 0) {
    if (linesCleared > 0) {
        // 根据清除的行数计算得分
        // 使用经典俄罗斯方块的得分系统
        const linePoints = [0, 100, 300, 500, 800]; // 0, 1, 2, 3, 4 行
        score += linePoints[linesCleared] * level;
        
        // 更新已清除的行数
        lines += linesCleared;
        
        // 每清除10行升一级
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            // 提高下落速度
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        }
    }
    
    // 更新UI
    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;
}

// 绘制方块
function drawPiece(piece, ctx, offsetX = 0, offsetY = 0, ghostMode = false) {
    const matrix = piece.matrix;
    const pos = piece.pos;
    
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (matrix[y][x] !== 0) {
                const color = COLORS[matrix[y][x]];
                
                // 绘制方块
                ctx.fillStyle = ghostMode ? 'rgba(255, 255, 255, 0.2)' : color;
                ctx.fillRect(
                    (pos.x + x + offsetX) * BLOCK_SIZE,
                    (pos.y + y + offsetY) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
                
                // 绘制方块边框
                ctx.strokeStyle = ghostMode ? 'rgba(255, 255, 255, 0.5)' : '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    (pos.x + x + offsetX) * BLOCK_SIZE,
                    (pos.y + y + offsetY) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
                
                // 绘制方块内部高光
                if (!ghostMode) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fillRect(
                        (pos.x + x + offsetX) * BLOCK_SIZE + 3,
                        (pos.y + y + offsetY) * BLOCK_SIZE + 3,
                        BLOCK_SIZE - 6,
                        BLOCK_SIZE - 6
                    );
                }
            }
        }
    }
}

// 绘制幽灵方块（显示方块将落在哪里）
function drawGhostPiece() {
    // 创建当前方块的副本
    const ghostPiece = {
        matrix: piece.matrix,
        pos: {x: piece.pos.x, y: piece.pos.y}
    };
    
    // 将幽灵方块下移直到碰撞
    while (!checkCollision(ghostPiece)) {
        ghostPiece.pos.y++;
    }
    ghostPiece.pos.y--; // 回退一步，避免碰撞
    
    // 绘制幽灵方块
    drawPiece(ghostPiece, ctx, 0, 0, true);
}

// 绘制下一个方块
function drawNextPiece() {
    // 清除画布
    nextPieceCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    
    // 计算居中偏移
    const offsetX = (nextPieceCanvas.width / BLOCK_SIZE - nextPiece.matrix[0].length) / 2;
    const offsetY = (nextPieceCanvas.height / BLOCK_SIZE - nextPiece.matrix.length) / 2;
    
    // 绘制下一个方块
    drawPiece(nextPiece, nextPieceCtx, offsetX, offsetY);
}

// 绘制游戏板
function drawBoard() {
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x] !== 0) {
                const color = COLORS[board[y][x]];
                
                // 绘制方块
                ctx.fillStyle = color;
                ctx.fillRect(
                    x * BLOCK_SIZE,
                    y * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
                
                // 绘制方块边框
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    x * BLOCK_SIZE,
                    y * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
                
                // 绘制方块内部高光
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(
                    x * BLOCK_SIZE + 3,
                    y * BLOCK_SIZE + 3,
                    BLOCK_SIZE - 6,
                    BLOCK_SIZE - 6
                );
            }
        }
    }
}

// 绘制菜单
function drawMenu() {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制标题
    ctx.fillStyle = '#ff00ff';
    ctx.font = '30px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText('赛博朋克', canvas.width / 2, canvas.height / 2 - 50);
    ctx.fillText('俄罗斯方块', canvas.width / 2, canvas.height / 2);
    
    // 绘制提示
    ctx.fillStyle = '#00ffff';
    ctx.font = '16px Orbitron';
    ctx.fillText('点击开始游戏按钮开始', canvas.width / 2, canvas.height / 2 + 50);
    
    // 绘制下一个方块预览
    drawNextPiece();
}

// 绘制游戏
function draw() {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制游戏板
    drawBoard();
    
    // 如果游戏正在进行，绘制当前方块和幽灵方块
    if (gameState === GAME_STATES.PLAYING) {
        if (piece) {
            try {
                drawGhostPiece();
                drawPiece(piece, ctx);
            } catch (error) {
                console.error('绘制方块时出错:', error);
                console.log('当前方块:', piece);
            }
        } else {
            console.warn('游戏正在进行，但piece不存在');
        }
    }
}

// 显示模态框
function showModal(modal) {
    modal.style.display = 'flex';
}

// 隐藏模态框
function hideModal(modal) {
    modal.style.display = 'none';
}

// 处理键盘输入
function handleKeyPress(e) {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    switch (e.keyCode) {
        case 37: // 左箭头
            movePiece(-1);
            break;
        case 39: // 右箭头
            movePiece(1);
            break;
        case 40: // 下箭头
            dropPiece();
            break;
        case 38: // 上箭头
            rotatePiece(piece, 1);
            break;
        case 32: // 空格
            hardDrop();
            break;
        case 80: // P键
            togglePause();
            break;
    }
}

// 更新游戏状态
function update(time = 0) {
    if (gameState !== GAME_STATES.PLAYING) {
        console.log('游戏未处于PLAYING状态，当前状态:', gameState);
        return;
    }
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    // 更新下落计数器
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        dropPiece();
    }
    
    // 绘制游戏
    draw();
    
    // 请求下一帧
    animationId = requestAnimationFrame(update);
    
    // 每10帧输出一次游戏状态
    if (Math.random() < 0.01) {
        console.log('游戏状态:', {
            gameState,
            piece: piece ? { type: piece.type, pos: { ...piece.pos } } : null,
            score,
            level,
            lines
        });
    }
}

// 添加赛博朋克视觉效果
function addCyberpunkEffects() {
    // 这里可以添加更多视觉效果，如闪烁、故障等
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', init); 