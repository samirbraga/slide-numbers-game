
const checkMatrixEquality = (m1, m2, i, j) => {
    if (m1[i][j] !== m2[i][j]) {
        return false;
    }

    const SIZE = m1.length;

    let playPositions = [
        [-1,  0],
        [ 0,  1],
        [ 1,  0],
        [ 0, -1],
        [-1, -1],
        [ 1, -1],
        [-1,  1],
        [ 1,  1]
    ];

    const someDifferent = playPositions
    .filter(([di, dj]) => {
        let dontOut = !(i + di < 0 || i + di > SIZE - 1 || j + dj < 0 || j + dj > SIZE - 1);
        return dontOut;
    })
    .some(([di, dj]) => m1[i + di][j + dj] !== m2[i + di][j + dj]);

    if (someDifferent) {
        return false;
    }
    
    for (let i = 0; i < m1.length; i++) {
        for (let j = 0; j < m1[0].length; j++) {
            if (m1[i][j] !== m2[i][j]) {
                return false;
            }
        }
    }

    return true;
};

const copyMatrix = m => {
    return m.slice(0).map(r => r.slice(0));
};

const StepNode = function () {
    this.blankPosition = [0, 0];
    this.parentNode = null;
    this.playedPosition = [];
    this.children = [];
    this.matrix = [];
    this.isSolution = false;

    this.getPath = () => {
        let node = this;
        const steps = [];

        while (node) {
            steps.unshift(node.playedPosition);
            node = node.parentNode;
        }

        return steps;
    };

    this.findBlank = () => {
        for (let i = 0; i < this.matrix.length; i++) {
            for (let j = 0; j < this.matrix[0].length; j++) {
                if (this.matrix[i][j] === 0) {
                    return [i, j];
                }
            }
        }
    }

    this.play = (i, j) => {
        const m = copyMatrix(this.matrix);
        const newPositions = [
            [-1, 0],
            [0, -1],
            [1, 0],
            [0, 1]
        ];

        let [ni, nj] = [i, j];

        newPositions.some(([di, dj]) => {
            if (i + di < 0 || i + di > m.length - 1 || j + dj < 0 || j + dj > m.length - 1) {
                return false;
            }

            if (m[i + di][j + dj] === 0) {
                ni = i + di;
                nj = j + dj;

                return true;
            }
        });

        let aux = m[ni][nj];
        m[ni][nj] = m[i][j];
        m[i][j] = aux;

        return m;
    };

    this.checkSolution = () => {
        this.isSolution = checkMatrixEquality(this.matrix, this.initialMatrix, ...this.blankPosition);
    };

    this.getOffsets = size => {
        const [i, j] = this.blankPosition;
        let playPositions = [
            [-1, 0],
            [0, 1],
            [1, 0],
            [0, -1]
        ];

        playPositions = playPositions.filter(([di, dj]) => {
            let dontOut = !(i + di < 0 || i + di > size - 1 || j + dj < 0 || j + dj > size - 1);
            return dontOut;
        });

        return playPositions;
    }

    this.generateChildren = () => {
        if (this.isSolution) {
            return true;
        }

        const [i, j] = this.blankPosition;
        const SIZE = this.matrix.length;
        const playPositions = this.getOffsets(SIZE);

        for (let position of playPositions) {
            let [di, dj] = position;
            const child = new StepNode();
            child.playedPosition = [i + di, j + dj];
            child.blankPosition = [i + di, j + dj];
            child.parentNode = this;

            child.matrix = this.play(...child.playedPosition);
            let hasAlreadyPlayed = false;

            for (let parentNode = child.parentNode; parentNode !== null; parentNode = parentNode.parentNode) {
                hasAlreadyPlayed = checkMatrixEquality(child.matrix, parentNode.matrix, ...child.blankPosition);
                if (hasAlreadyPlayed) {
                    break;
                }
            }

            if (!hasAlreadyPlayed) {
                child.initialMatrix = this.initialMatrix;
                child.checkSolution();
                this.children.push(child);

                if (child.isSolution) {
                    return true;
                }
            }
        }
    };
};

const solve = (m, initialMatrix) => {
    const root = new StepNode();
    root.initialMatrix = initialMatrix;
    root.matrix = copyMatrix(m);
    root.blankPosition = root.findBlank();
    root.checkSolution();

    if (root.isSolution) {
        return [];
    }

    let queue = [root];

    while (queue.length > 0) {
        const node = queue[0];

        const solutionFound = node.generateChildren();
        if (solutionFound) {
            return node.children[node.children.length - 1].getPath();
        }

        queue = queue.concat(node.children);

        queue.shift();
    }

    return [];
};

const randomGame = (times=50) => {
    const game = new StepNode();
    game.initialMatrix = initialMatrix;
    game.matrix = copyMatrix(initialMatrix);
    game.blankPosition = game.findBlank();
    game.checkSolution();
    
    for (let i = 0; i < times; i++) {
        const offsets = game.getOffsets();
        const offset = offsets[Math.round(Math.random() * (offsets.length - 1))];
        const move = [game.blankPosition[0] + offset[0], game.blankPosition[1] + offset[1]];
        game.matrix = game.play(...move);
    }

    return game.matrix;
};


self.addEventListener('message', function (e) {
    const { type, data } = e.data;

    if (type === 'solve') {
        const steps = solve(data.matrix, data.initialMatrix);

        self.postMessage({
            type: 'solved',
            steps
        });
    } else if (type === 'random_game') {
        self.postMessage({
            type: 'random_game_created',
            game: randomGame()
        });
    }
}, false);