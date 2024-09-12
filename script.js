const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

const rows = 8;
const cols = 8;
const tileSize = 64;
let score = 0;
let board = [];
let animations = [];
let dragging = false;
let dragStart = null;
let dragEnd = null;
let dragOffset = { x: 0, y: 0 };
let currentDragPos = { x: 0, y: 0 };
let dragDirection = null; 

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
            drawTile(r, c, board[r][c]);
        }
    }

    if (dragging && dragStart) {
        const img = images[board[dragStart.r][dragStart.c]];
        ctx.drawImage(img, currentDragPos.x - dragOffset.x, currentDragPos.y - dragOffset.y, tileSize, tileSize);
    }

    animations.forEach(anim => anim());
}

function drawTile(row, col, type, offsetY = 0) {
    if (type !== null) {
        const img = images[type];
        ctx.drawImage(img, col * tileSize, row * tileSize + offsetY, tileSize, tileSize);
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
        score += 10; // Aumentar la puntuación
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

// Eventos para manejar el arrastre
canvas.addEventListener('mousedown', (e) => {
    const x = Math.floor(e.offsetX / tileSize);
    const y = Math.floor(e.offsetY / tileSize);
    dragStart = { r: y, c: x };
    dragOffset = { x: e.offsetX % tileSize, y: e.offsetY % tileSize };
    currentDragPos = { x: e.offsetX, y: e.offsetY };
    dragging = true;
});

canvas.addEventListener('mousemove', (e) => {
    if (dragging) {
        currentDragPos = { x: e.offsetX, y: e.offsetY };
        drawBoard(); // Redibujar el tablero
    }
});

canvas.addEventListener('mouseup', (e) => {
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
