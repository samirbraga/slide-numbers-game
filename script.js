const SIZE = 3;

const initialMatrix = [];

const fillMatrix = m => {
    for (let i = 0; i < SIZE; i++) {
        m.push(Array(SIZE).fill(0));
        for (let j = 0; j < SIZE; j++) {
            const k = i * SIZE + j;
            if (k === (SIZE * SIZE) - 1) {
                m[i][j] = 0;
            } else {
                m[i][j] = k + 1;
            }
        }
    }
}

const solverWorker = new Worker('solver-worker.js');

document.addEventListener('DOMContentLoaded', () => {
    const animate = (node, animationName, callback) => {
        node.classList.add('animated', animationName);

        const handleAnimationEnd = () => {
            node.classList.remove('animated', animationName);
            node.removeEventListener('animationend', handleAnimationEnd);

            if (callback) callback();
        }

        node.addEventListener('animationend', handleAnimationEnd);
    };

    const getRandomColor = () => {
        const randomHue = Math.round(Math.random() * 360);
        return `hsl(${randomHue}, 70%, 60%)`;
    };

    const deltas = Array((SIZE * SIZE) - 1).fill(1).map(() => [0, 0]);

    const gameContainer = document.querySelector(".game-wrapper");
    const gameInfo = document.querySelector(".game-info");
    const gameBoxes = [];
    const undoButton = document.querySelector("button.undo");
    // const redoButton = document.querySelector("button.redo");
    const solveBFSButton = document.querySelector("button.solve-bfs");
    const solveAStarButton = document.querySelector("button.solve-a-star");
    const randomGameButton = document.querySelector("button.random");
    const themeButton = document.querySelector("button.toggle-theme");

    themeButton.addEventListener('click', e => {
        if (document.body.classList.contains('dark-theme')) {
            e.target.innerHTML = 'DARK';
        } else {
            e.target.innerHTML = 'LIGHT'
        };

        document.body.classList.toggle('dark-theme');
    });

    const renderBoxes = (initialMatrix) => {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                const k = initialMatrix[i][j];
                if (k > 0) {
                    const gameBox = document.createElement("div");
                    const gameBoxNumber = document.createElement("div");
                    const gameBoxNumberText = document.createElement("span");

                    gameBoxNumberText.innerHTML = k;

                    gameBox.classList.add("game-box");
                    gameBoxNumber.classList.add("game-box-number");

                    gameBoxNumber.appendChild(gameBoxNumberText);
                    gameBox.appendChild(gameBoxNumber);

                    gameBox.setAttribute('data-pos-x', i);
                    gameBox.setAttribute('data-pos-y', j);

                    gameBox.style.flexBasis = `${100 / SIZE}%`;
                    gameBox.style.maxWidth = `${100 / SIZE}%`;
                    gameBox.style.fontSize = `${(100 / SIZE) * 1.2}px`;

                    fragment.appendChild(gameBox);
                    gameBoxes.push(gameBox);

                    setTimeout(() => {
                        animate(gameBox, 'bounceIn', () => gameBox.style.opacity = 1);
                    }, 50 * k);
                }
            }
        }
        gameContainer.appendChild(fragment);
    }

    const setBoxesPositions = (gameBoxes, deltas, k) => {
        gameBoxes[k].style.transform = `translate(${deltas[k][0] * 100}%, ${deltas[k][1] * 100}%)`;
    }

    const play = (m, i, j) => {
        const index = m[i][j] - 1;
        const newPositions = [
            [-1, 0],
            [0, -1],
            [1, 0],
            [0, 1]
        ];

        let [ni, nj] = [i, j];

        newPositions.some(([di, dj]) => {
            if (i + di < 0 || i + di > SIZE - 1 || j + dj < 0 || j + dj > SIZE - 1) {
                return false;
            }

            if (m[i + di][dj + j] === 0) {
                ni = i + di;
                nj = j + dj;

                deltas[index][0] += dj;
                deltas[index][1] += di;

                return true;
            }
        });

        let aux = m[ni][nj];
        m[ni][nj] = m[i][j];
        m[i][j] = aux;

        gameBoxes[index].setAttribute('data-pos-x', ni);
        gameBoxes[index].setAttribute('data-pos-y', nj);

        setBoxesPositions(gameBoxes, deltas, index);
    }

    fillMatrix(initialMatrix);
    renderBoxes(initialMatrix);
    document.body.style.color = getRandomColor();

    const matrix = JSON.parse(JSON.stringify(initialMatrix));

    let actionTimeline = [];
    let currentTimeIndex = 0;

    gameBoxes.forEach((box, index) => {
        box.addEventListener('click', () => {
            let i = parseInt(box.getAttribute('data-pos-x'));
            let j = parseInt(box.getAttribute('data-pos-y'));

            play(matrix, i, j);

            let ni = parseInt(box.getAttribute('data-pos-x'));
            let nj = parseInt(box.getAttribute('data-pos-y'));

            if (ni !== i || nj !== j) {
                actionTimeline = actionTimeline.slice(0, currentTimeIndex);
                actionTimeline.push([ni, nj]);

                document.body.style.color = getRandomColor();

                currentTimeIndex = actionTimeline.length;
            } else {
                animate(box.children[0], 'shake');
            }
        });
    });

    undoButton.addEventListener('click', () => {
        if (currentTimeIndex > 0) {
            const [i, j] = actionTimeline[--currentTimeIndex];
            play(matrix, i, j);
        }
    });

    // redoButton.addEventListener('click', () => {
    //     if (currentTimeIndex < actionTimeline.length) {
    //         const [i, j] = actionTimeline[currentTimeIndex++];
    //         play(matrix, i, j);
    //     }
    // });

    // randomGameButton.addEventListener('click', () => {
    //     solverWorker.postMessage({
    //         type: 'random_game',
    //         data: {
    //             initialMatrix
    //         }
    //     });
    // });

    solveBFSButton.addEventListener('click', () => {
        gameContainer.classList.add('loading');
        solverWorker.postMessage({
            type: 'solve_bfs',
            data: {
                matrix,
                initialMatrix
            }
        });
    });

    solveAStarButton.addEventListener('click', () => {
        gameContainer.classList.add('loading');
        solverWorker.postMessage({
            type: 'solve_a_star',
            data: {
                matrix,
                initialMatrix
            }
        });
    });

    solverWorker.addEventListener('message', e => {
        if (e.data.type === 'solved') {
            gameContainer.classList.remove('loading');

            const solvingSteps = e.data.steps;
            solvingSteps.forEach(([i, j], index) => {
                setTimeout(() => {
                    play(matrix, i, j);
                }, index * 200);
            });
        } else if (e.data.type === 'random_game_created') {
            renderBoxes(e.data.game);
        } else if (e.data.type === 'tree_height_incresead') {
            gameInfo.innerHTML = `Game tree height: ${e.data.treeHeight}`;
        }
    }, false);
});
