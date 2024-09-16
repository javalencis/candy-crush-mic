const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const btPlay = document.querySelector('.bt-play')
const btPlayMob = document.querySelector('.bt-play-mob')
const overlayInfo = document.querySelector('.overlay-info')
const infoTime = document.querySelector('.info-time')
const timeVar = document.querySelectorAll('.time-var')
const infoScore  = document.querySelectorAll('.score')
canvas.width = 364;
canvas.height = 364;

const rows = 7;
const cols = 7;
const tileSize = 52;
let score = 0;
let board = [];
let animations = [];
let dragging = false;
let dragStart = null;
let dragEnd = null;
let dragOffset = { x: 0, y: 0 };
let currentDragPos = { x: 0, y: 0 };
let dragDirection = null; 
let gameStarted = false;
let countdownTime = 60; 
let countdownInterval = null; 

const images = [];
const imagePaths = [
    './assets/imgs/candy1.png',
    './assets/imgs/candy2.png',
    './assets/imgs/candy3.png',
    './assets/imgs/candy4.png',
    './assets/imgs/candy5.png'
];

// Cargar las imágenes
function loadImages() {
    return Promise.all(
        imagePaths.map((path) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = path;
                img.onload = () => resolve(img);
                img.onerror = reject;
            });
        })
    );
}

function createBoard() {
    for (let r = 0; r < rows; r++) {
        let row = [];
        for (let c = 0; c < cols; c++) {
            row.push(Math.floor(Math.random() * 5)); // Asignar un tipo de dulce
        }
        board.push(row);
    }
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (dragging && dragStart && r === dragStart.r && c === dragStart.c) {
                continue;
            }
            // Verificar que la imagen exista antes de dibujar
            if (images[board[r][c]]) {
                drawTile(r, c, board[r][c]);
            }
        }
    }

    if (dragging && dragStart) {
        const img = images[board[dragStart.r][dragStart.c]];
        // Verificar que la imagen exista antes de dibujar
        if (img) {
            ctx.drawImage(img, currentDragPos.x - dragOffset.x, currentDragPos.y - dragOffset.y, tileSize, tileSize);
        }
    }

    animations.forEach(anim => anim());
}

function drawTile(row, col, type, offsetY = 0) {
    if (type !== null) {
        const img = images[type];
        ctx.drawImage(img, col * tileSize, row * tileSize + offsetY, tileSize-4, tileSize-4);
    }
}

function detectCombinations() {
    let toRemove = [];

    // Detectar combinaciones horizontales
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols - 2; c++) {
            let matchLength = 1;
            while (c + matchLength < cols && board[r][c] === board[r][c + matchLength]) {
                matchLength++;
            }
            if (matchLength >= 3) {
                for (let i = 0; i < matchLength; i++) {
                    toRemove.push({ r, c: c + i });
                }
                c += matchLength - 1;
            }
        }
    }

    // Detectar combinaciones verticales
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows - 2; r++) {
            let matchLength = 1;
            while (r + matchLength < rows && board[r][c] === board[r + matchLength][c]) {
                matchLength++;
            }
            if (matchLength >= 3) {
                for (let i = 0; i < matchLength; i++) {
                    toRemove.push({ r: r + i, c });
                }
                r += matchLength - 1;
            }
        }
    }

    return toRemove;
}

function removeCombinations(toRemove) {
    toRemove.forEach(pos => {
        board[pos.r][pos.c] = null; // Marcar la pieza como eliminada
        score++
        infoScore[0].innerHTML = score
        infoScore[1].innerHTML = score
    });
}
function animateDropTiles(callback) {
    const dropAnimations = [];

    // Recopilar las piezas que deben caer
    for (let c = 0; c < cols; c++) {
        let emptySpaces = 0;
        for (let r = rows - 1; r >= 0; r--) {
            if (board[r][c] === null) {
                emptySpaces++;
            } else if (emptySpaces > 0) {
                const tileType = board[r][c];
                board[r][c] = null; // No actualizar la matriz aún
                dropAnimations.push({
                    start: r * tileSize,
                    end: (r + emptySpaces) * tileSize,
                    col: c,
                    row: r + emptySpaces,
                    type: tileType
                });
            }
        }

        // Rellenar con nuevas piezas en la parte superior
        for (let r = 0; r < emptySpaces; r++) {
            const newTileType = Math.floor(Math.random() * 5);
            dropAnimations.push({
                start: -tileSize * (emptySpaces - r), // Iniciar desde fuera de la pantalla
                end: r * tileSize,
                col: c,
                row: r,
                type: newTileType
            });
        }
    }

    const duration = 500;
    const startTime = performance.now();

    function animate(time) {
        const t = Math.min((time - startTime) / duration, 1);

        ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar el canvas
        drawBoard(); // Dibujar el tablero actual (sin piezas que caen)

        // Dibujar las piezas que están cayendo
        dropAnimations.forEach(anim => {
            const y = anim.start + (anim.end - anim.start) * t;
            drawTile(anim.row, anim.col, anim.type, y - anim.row * tileSize);
        });

        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            // Actualizar la matriz con las piezas en su posición final
            dropAnimations.forEach(anim => {
                board[anim.row][anim.col] = anim.type;
            });

            drawBoard(); // Redibujar el tablero con las piezas en su lugar

            // Ejecutar callback solo cuando las animaciones hayan terminado
            if (callback) callback();
        }
    }

    requestAnimationFrame(animate);
}

function swapTiles(tile1, tile2) {
    animateSwap(tile1, tile2, () => {
        const temp = board[tile1.r][tile1.c];
        board[tile1.r][tile1.c] = board[tile2.r][tile2.c];
        board[tile2.r][tile2.c] = temp;

        let toRemove = detectCombinations();

        if (toRemove.length > 0) {
            removeCombinations(toRemove);
            animateDropTiles(() => {
                // Aquí se detectan combinaciones después de la primera caída
                processAfterDrop();
            });
        } else {
            // Si no hay combinaciones, revertir el intercambio con animación
            animateSwap(tile2, tile1, () => {
                const temp = board[tile1.r][tile1.c];
                board[tile1.r][tile1.c] = board[tile2.r][tile2.c];
                board[tile2.r][tile2.c] = temp;
                drawBoard();
            });
        }
    });
}

function processAfterDrop() {
    let moreToRemove = detectCombinations();
    if (moreToRemove.length > 0) {
        removeCombinations(moreToRemove);
        animateDropTiles(() => {
            processAfterDrop(); // Procesar nuevas combinaciones si aparecen
        });
    } else {
        drawBoard(); // Si no hay más combinaciones, dibujar el tablero final
    }
}


function animateSwap(tile1, tile2, callback) {
    const [x1, y1] = [tile1.c * tileSize, tile1.r * tileSize];
    const [x2, y2] = [tile2.c * tileSize, tile2.r * tileSize];
    const duration = 300;
    const startTime = performance.now();

    function animate(time) {
        const t = Math.min((time - startTime) / duration, 1);
        ctx.clearRect(x1, y1, tileSize, tileSize);
        ctx.clearRect(x2, y2, tileSize, tileSize);

        const currX1 = x1 + t * (x2 - x1);
        const currY1 = y1 + t * (y2 - y1);
        const currX2 = x2 + t * (x1 - x2);
        const currY2 = y2 + t * (y1 - y2);

        // Dibujar las piezas que están en movimiento
        ctx.drawImage(images[board[tile2.r][tile2.c]], currX2, currY2, tileSize, tileSize);
        ctx.drawImage(images[board[tile1.r][tile1.c]], currX1, currY1, tileSize, tileSize);

        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            callback();
        }
    }

    requestAnimationFrame(animate);
}

// function swapTiles(tile1, tile2) {
//     animateSwap(tile1, tile2, () => {
//         const temp = board[tile1.r][tile1.c];
//         board[tile1.r][tile1.c] = board[tile2.r][tile2.c];
//         board[tile2.r][tile2.c] = temp;

//         let toRemove = detectCombinations();

//         if (toRemove.length > 0) {
//             removeCombinations(toRemove);
//             animateDropTiles(() => {
//                 let moreToRemove = detectCombinations();
//                 while (moreToRemove.length > 0) {
//                     removeCombinations(moreToRemove);
//                     animateDropTiles();
//                     moreToRemove = detectCombinations();
//                 }
//             });
//         } else {
//             animateSwap(tile2, tile1, () => {
//                 const temp = board[tile1.r][tile1.c];
//                 board[tile1.r][tile1.c] = board[tile2.r][tile2.c];
//                 board[tile2.r][tile2.c] = temp;
//                 drawBoard();
//             });
//         }
//     });
// }
function startCountdown() {
    countdownInterval = setInterval(() => {
        countdownTime--;
        
        timeVar[0].innerHTML = countdownTime
        timeVar[1].innerHTML = countdownTime
        if (countdownTime <= 0) {
            clearInterval(countdownInterval);
            endGame(); // Llamar a una función que finalice el juego
        }
    }, 1000); // Actualizar cada segundo
}
function endGame() {
    gameStarted = false; // Detener el juego
}
function playGame(){

    if(gameStarted) return
    
    gameStarted = true;
    let toRemove = detectCombinations();
    removeCombinations(toRemove)
    animateDropTiles(() => {
        // Aquí se detectan combinaciones después de la primera caída
        processAfterDrop();
    });
    countdownTime = 60
    startCountdown()
}

function playGameMob(){
    if(overlayInfo){
        overlayInfo.style.display = 'none'

    }

    playGame()
}


// Funciones para manejar eventos de dispositivos móviles
function handleTouchStart(e) {
    if (!gameStarted) return; 
    e.preventDefault();
    const touch = e.touches[0]; 
    const rect = canvas.getBoundingClientRect(); // Obtener las posiciones correctas del canvas
    const x = Math.floor((touch.clientX - rect.left) / tileSize);
    const y = Math.floor((touch.clientY - rect.top) / tileSize);
    dragStart = { r: y, c: x };
    dragOffset = { x: (touch.clientX - rect.left) % tileSize, y: (touch.clientY - rect.top) % tileSize };
    currentDragPos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    dragging = true;
}

function handleTouchMove(e) {
    if (!gameStarted) return; 
    e.preventDefault();
    if (dragging) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect(); // Obtener la posición correcta
        currentDragPos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        drawBoard(); // Redibujar el tablero
    }
}

function handleTouchEnd(e) {
    if (!gameStarted) return; 
    e.preventDefault();
    if (dragging) {
        const touch = e.changedTouches[0];
        const rect = canvas.getBoundingClientRect(); // Obtener la posición correcta
        const x = Math.floor((touch.clientX - rect.left) / tileSize);
        const y = Math.floor((touch.clientY - rect.top) / tileSize);
        dragEnd = { r: y, c: x };
        dragging = false;

        // Verificar si es un movimiento válido (adyacente)
        // if (Math.abs(dragStart.r - dragEnd.r) + Math.abs(dragStart.c - dragEnd.c) <=2) {
        //     swapTiles(dragStart, dragEnd);
        // }
        if (dragStart && dragEnd) {
            const rowDiff = dragEnd.r - dragStart.r;
            const colDiff = dragEnd.c - dragStart.c;

            // Verificar si el movimiento es principalmente vertical u horizontal
            if (Math.abs(rowDiff) > Math.abs(colDiff)) {
                // Movimiento vertical: Forzar intercambio con el dulce adyacente en la fila
                dragEnd.r = dragStart.r + Math.sign(rowDiff); // Limitar a la fila adyacente
                dragEnd.c = dragStart.c; // Mantener la columna igual
            } else {
                // Movimiento horizontal: Forzar intercambio con el dulce adyacente en la columna
                dragEnd.c = dragStart.c + Math.sign(colDiff); // Limitar a la columna adyacente
                dragEnd.r = dragStart.r; // Mantener la fila igual
            }

            // Realizar el intercambio solo con el dulce adyacente inmediato
            swapTiles(dragStart, dragEnd);
        }
    }
}


// Eventos para manejar el arrastre en computadoras de escritorio
canvas.addEventListener('mousedown', (e) => {
    if (!gameStarted) return; 
    const x = Math.floor(e.offsetX / tileSize);
    const y = Math.floor(e.offsetY / tileSize);
    dragStart = { r: y, c: x };
    dragOffset = { x: e.offsetX % tileSize, y: e.offsetY % tileSize };
    currentDragPos = { x: e.offsetX, y: e.offsetY };
    dragging = true;
});

canvas.addEventListener('mousemove', (e) => {
    if (!gameStarted) return; 
    if (dragging) {
        currentDragPos = { x: e.offsetX, y: e.offsetY };
        drawBoard(); // Redibujar el tablero
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (!gameStarted) return; 
    if (dragging) {
        const x = Math.floor(e.offsetX / tileSize);
        const y = Math.floor(e.offsetY / tileSize);
        dragEnd = { r: y, c: x };
        dragging = false;

        // Verificar si es un movimiento válido (adyacente)
        if (Math.abs(dragStart.r - dragEnd.r) + Math.abs(dragStart.c - dragEnd.c) === 1) {
            swapTiles(dragStart, dragEnd);
        }
    }
});

// Agregar los eventos táctiles
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchmove', handleTouchMove);
canvas.addEventListener('touchend', handleTouchEnd);
btPlay.addEventListener('click',playGame)
btPlayMob.addEventListener('click',playGameMob)

// Función para inicializar el juego
function initGame() {
    loadImages().then((loadedImages) => {
        images.push(...loadedImages); // Guardar las imágenes cargadas
        createBoard();
        gameLoop();
    }).catch((error) => {
        console.error("Error cargando imágenes:", error);
    });
}

function gameLoop() {
    drawBoard();
    requestAnimationFrame(gameLoop); // Continuar el bucle de juego
}




// Inicializar el juego
initGame();
