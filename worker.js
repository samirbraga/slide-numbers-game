
const checkMatrixEquality = (m1, m2) => {
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
    const newM = [...Array(m.length).fill(0).map(() => Array(m.length).fill(0))];
    for (let i = 0; i < m.length; i++) {
        for (let j = 0; j < m.length; j++) {
            newM[i][j] = m[i][j];
        }
    }
    return newM;
};

const StepNode = function () {
    this.blankPosition = [0, 0];
    this.parentNode = null;
    this.playedPosition = [];
    this.children = [];
    this.matrix = [];
    this.isSolution = false;

    this.getPath = () => {
        if (this.parentNode) {
            const [pi, pj] = this.playedPosition;
            let parentPath = this.parentNode.getPath();
            return [...parentPath, [pi, pj, this.parentNode.matrix[pi][pj] - 1]];
        } else {
            return [];
        }
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

            if (m[i + di][dj + j] === 0) {
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
        const isSolution = checkMatrixEquality(this.matrix, this.initialMatrix);
        this.isSolution = isSolution;
    };

    this.generateChildren = () => {
        if (this.isSolution) {
            return true;
        }

        let playPositions = [
            [-1, 0],
            [0, 1],
            [1, 0],
            [0, -1]
        ];

        const [i, j] = this.blankPosition;
        const SIZE = this.matrix.length;

        playPositions = playPositions.filter(([di, dj]) => {
            let dontOut = !(i + di < 0 || i + di > SIZE - 1 || j + dj < 0 || j + dj > SIZE - 1);

            return dontOut;
        });

        this.children = [];

        const solutionFound = playPositions.some(([di, dj]) => {
            const child = new StepNode();
            child.playedPosition = [i + di, j + dj];
            child.matrix = this.play(...child.playedPosition);
            let hasAlreadyPlayed = false;

            for (let parentNode = child.parentNode; parentNode !== null; parentNode = parentNode.parentNode) {
                hasAlreadyPlayed = checkMatrixEquality(child.matrix, parentNode.matrix);
                if (hasAlreadyPlayed) {
                    break;
                }
            }

            if (!hasAlreadyPlayed) {
                child.blankPosition = [i + di, j + dj];
                child.initialMatrix = this.initialMatrix;
                child.parentNode = this;
                child.checkSolution();
                this.children.push(child);
            }

            return child.isSolution;
        });

        return solutionFound;
    };
};

const solve = (m, initialMatrix) => {
    const root = new StepNode();
    root.initialMatrix = initialMatrix;
    root.matrix = copyMatrix(m);
    root.blankPosition = root.findBlank();

    const findSolution = nodes => {
        let children = [];

        for (let node of nodes) {
            const solutionFound = node.generateChildren();
            if (solutionFound) {
                return node.children[node.children.length - 1].getPath();
            }
            children = children.concat(node.children);
        };

        return findSolution(children);
    };

    return findSolution([root]);
};


self.addEventListener('message', function (e) {
    const { type, data } = e.data;

    if (type === 'solve') {
        self.postMessage({
            type: 'solved',
            steps: solve(data.matrix, data.initialMatrix)
        });
    }
}, false);