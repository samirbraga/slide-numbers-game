const solverWorker = new Worker('solver-worker.js');

const searchParams = new URLSearchParams(window.location.search);
const SIZE = parseInt(searchParams.get('size') || 3);

const getRandomColor = () => {
    const randomHue = Math.round(Math.random() * 360);
    return `hsl(${randomHue}, 70%, 60%)`;
};

const animate = (node, animationName, callback) => {
    node.classList.add('animated', animationName);

    const handleAnimationEnd = () => {
        node.classList.remove('animated', animationName);
        node.removeEventListener('animationend', handleAnimationEnd);

        if (callback) callback();
    }

    node.addEventListener('animationend', handleAnimationEnd);
};

class Game {
    constructor(size=3) {
        this.size = size;
        this.initialMatrix = [];
        this.deltas = Array((size * size) - 1).fill(1).map(() => [0, 0]);
        this.actionTimeline = [];
        this.currentTimeIndex = 0;

        this.initializeMatrix();

        this.currentMatrix = JSON.parse(JSON.stringify(this.initialMatrix));
    }

    initializeMatrix = () => {
        this.initialMatrix = [];
        for (let i = 0; i < this.size; i++) {
            this.initialMatrix.push(Array(this.size).fill(0));
            for (let j = 0; j < this.size; j++) {
                const k = i * this.size + j;
                if (k === (this.size * this.size) - 1) {
                    this.initialMatrix[i][j] = 0;
                } else {
                    this.initialMatrix[i][j] = k + 1;
                }
            }
        }
    }

    restart = () => {
        this.actionTimeline = [];
        this.currentTimeIndex = 0;
    }

    undo = () => {
        if (this.currentTimeIndex > 0) {
            const [i, j] = this.actionTimeline[--this.currentTimeIndex];
            this.play(i, j);
        }
    }

    play = (i, j, callback) => {
        const index = this.currentMatrix[i][j] - 1;
        if (index >= 0) {
            const newPositions = [
                [-1, 0],
                [0, -1],
                [1, 0],
                [0, 1]      
            ];

            let [ni, nj] = [i, j];

            newPositions.some(([di, dj]) => {
                if (i + di < 0 || i + di > this.size - 1 || j + dj < 0 || j + dj > this.size - 1) {
                    return false;
                }

                if (this.currentMatrix[i + di][dj + j] === 0) {
                    ni = i + di;
                    nj = j + dj;

                    this.deltas[index][0] += dj;
                    this.deltas[index][1] += di;

                    return true;
                }
            });

            let aux = this.currentMatrix[ni][nj];
            this.currentMatrix[ni][nj] = this.currentMatrix[i][j];
            this.currentMatrix[i][j] = aux;

            callback && callback(ni, nj);

            if (ni !== i || nj !== j) {
                this.actionTimeline = this.actionTimeline.slice(0, this.currentTimeIndex);
                this.actionTimeline.push([ni, nj]);
                this.currentTimeIndex = this.actionTimeline.length;
            }
        }
    }
};

class GameDOM {
    constructor(game, gameContainer) {
        this.game = game;
        this.size = game.size;
        this.gameBoxes = Array(this.size * this.size).fill(1);
        this.gameContainer = gameContainer;

        this.renderBoxes(game.initialMatrix);
    }

    setBoxesPositions = (gameBox, delta) => {
        gameBox.style.transform = `translate(${delta[0] * 100}%, ${delta[1] * 100}%)`;
    };

    play = (i, j) => {
        this.game.play(i, j, (ni, nj) => {
            const q = this.game.currentMatrix[ni][nj] - 1;
    
            this.setBoxesPositions(this.gameBoxes[q], this.game.deltas[q]);
    
            if (ni !== i || nj !== j) {
                document.body.style.color = getRandomColor();
            } else {
                animate(this.gameBoxes[q].children[0], 'shake');
            }
        });
    };

    renderBoxes = (gameMatrix) => {
        const fragment = document.createDocumentFragment();
        this.game.restart();
        this.gameBoxes = Array(this.size * this.size - 1).fill(1);

        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                const k = gameMatrix[i][j];
                if (k > 0) {
                    const gameBox = document.createElement("div");
                    const gameBoxNumber = document.createElement("div");
                    const gameBoxNumberText = document.createElement("span");

                    gameBoxNumberText.innerHTML = k;

                    gameBox.classList.add("game-box");
                    gameBoxNumber.classList.add("game-box-number");

                    gameBoxNumber.appendChild(gameBoxNumberText);
                    gameBox.appendChild(gameBoxNumber);

                    gameBox.style.flexBasis = `${100 / SIZE}%`;
                    gameBox.style.maxWidth = `${100 / SIZE}%`;
                    gameBox.style.fontSize = `${(100 / SIZE) * 1.2}px`;

                    gameBox.addEventListener('click', () => {
                        this.play(i, j);
                    });

                    fragment.appendChild(gameBox);
                    this.gameBoxes[k - 1] = gameBox;

                    setTimeout(() => {
                        animate(gameBox, 'bounceIn', () => gameBox.style.opacity = 1);
                    }, 50 * (i * SIZE + j));
                }
            }
        }

        this.gameContainer.innerHTML = '';
        this.gameContainer.appendChild(fragment);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.querySelector(".game-wrapper");
    const gameInfo = document.querySelector(".game-info");
    const undoButton = document.querySelector("button.undo");
    const redoButton = document.querySelector("button.redo");
    const solveBFSButton = document.querySelector("button.solve-bfs");
    const solveAStarButton = document.querySelector("button.solve-a-star");
    const randomGameButton = document.querySelector("button.random");
    const themeButton = document.querySelector("button.toggle-theme");

    document.body.style.color = getRandomColor();

    const game = new Game(SIZE);
    const gameDOM = new GameDOM(game, gameContainer);

    themeButton.addEventListener('click', e => {
        if (document.body.classList.contains('dark-theme')) {
            e.target.innerHTML = 'DARK';
        } else {
            e.target.innerHTML = 'LIGHT'
        };

        document.body.classList.toggle('dark-theme');
    });

    undoButton.addEventListener('click', () => {
        game.undo();
    });

    redoButton.addEventListener('click', () => {
        game.redo();
    });

    randomGameButton.addEventListener('click', () => {
        solverWorker.postMessage({
            type: 'random_game',
            data: {
                initialMatrix: game.initialMatrix
            }
        });
    });

    solveBFSButton.addEventListener('click', () => {
        gameContainer.classList.add('loading');
        solverWorker.postMessage({
            type: 'solve_bfs',
            data: {
                matrix: game.currentMatrix,
                initialMatrix: game.initialMatrix
            }
        });
    });

    solveAStarButton.addEventListener('click', () => {
        gameContainer.classList.add('loading');
        solverWorker.postMessage({
            type: 'solve_a_star',
            data: {
                matrix: game.currentMatrix,
                initialMatrix: game.initialMatrix
            }
        });
    });

    solverWorker.addEventListener('message', e => {
        if (e.data.type === 'solved') {
            gameContainer.classList.remove('loading');

            const solvingSteps = e.data.steps;
            solvingSteps.forEach(([i, j], index) => {
                setTimeout(() => gameDOM.play(i, j), index * 200);
            });
        } else if (e.data.type === 'random_game_created') {
            gameDOM.renderBoxes(e.data.game);
        } else if (e.data.type === 'tree_height_incresead') {
            gameInfo.innerHTML = `Game tree height: ${e.data.treeHeight}`;
        }
    }, false);
});
