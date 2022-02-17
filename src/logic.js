function info() {
    console.log('INFO');
    const response = {
        apiversion: '1',
        author: 'Chris/Tommaso',
        color: '#eac302',
        head: 'fang',
        tail: 'curled',
    };
    return response;
}

function start(gameState) {
    console.log(`${gameState.game.id} START`);
}

function end(gameState) {
    console.log(`${gameState.game.id} END\n`);
}

// Weights for moves
const BEST_MOVE = 1;
const AVOID = 0;
const HAZARD = 0.5;

/** @type {function(import("./types").Coord, import("./types").Coord, PossibleMoves):boolean} */
const isCollision = (head, coord, possibleMoves, weight = 0) => {
    if (coord.y == head.y) {
        if (coord.x === head.x + 1) {
            possibleMoves.right = weight;
        } else if (coord.x === head.x - 1) {
            possibleMoves.left = weight;
        }
    }
    if (coord.x == head.x) {
        if (coord.y === head.y + 1) {
            possibleMoves.up = weight;
        } else if (coord.y === head.y - 1) {
            possibleMoves.down = weight;
        }
    }
};

/** @type {function(import("./types").GameState, PossibleMoves):void} */
const avoidSelf = (gameState, possibleMoves) => {
    const { head, body } = gameState.you;
    for (const bodyPart of body) {
        isCollision(head, bodyPart, possibleMoves);
    }
    console.log('> avoidSelf', possibleMoves);
};

const onlyUnique = (value, index, self) => {
    return self.indexOf(value) === index;
};

/**
 * Some game modes contain hazards that should be avoided.
 * Food can be listed in hazards.
 * @type {function(import("./types").GameState, PossibleMoves):void}
 */
const avoidHazards = (gameState, possibleMoves) => {
    const { head } = gameState.you;
    const { hazards, food } = gameState.board;
    const merged = [...hazards, ...food];
    const nonFood = merged.filter(onlyUnique);

    for (const hazard of nonFood) {
        isCollision(head, hazard, possibleMoves, HAZARD);
    }
};

/** @type {function(import("./types").GameState, PossibleMoves):void} */
const avoidWalls = (gameState, possibleMoves) => {
    const boardWidth = gameState.board.width;
    const boardHeight = gameState.board.height;
    const { head } = gameState.you;
    if (head.x === 0) {
        possibleMoves.left = AVOID;
    } else if (head.x === boardWidth - 1) {
        possibleMoves.right = AVOID;
    }
    if (head.y === 0) {
        possibleMoves.down = AVOID;
    } else if (head.y === boardHeight - 1) {
        possibleMoves.up = AVOID;
    }
    console.log('> avoidWalls', possibleMoves);
};

/** @type {function(import("./types").GameState, PossibleMoves):Array} */
const socialize = (gameState, possibleMoves) => {
    const { head, body } = gameState.you;
    let biggest = 0;

    let closestFood = getClosestFood(gameState, possibleMoves);
    let targetId = closestFood ? 'food' : 'nothing';

    for (const s of gameState.board.snakes) {
        if (gameState.you.id == s.id) {
            continue;
        }
        for (const otherPart of s.body) {
            isCollision(head, otherPart, possibleMoves);
        }
        if (s.body.length < body.length) {
            // Maybe eat
            const f = {
                x: s.head.x,
                y: s.head.y,
            };
            f.dx = f.x - head.x;
            f.dy = f.y - head.y;
            f.d = Math.abs(f.dx) + Math.abs(f.dy);
            if (!closestFood || closestFood.d > f.d) {
                closestFood = f.d;
                targetId = s.id;
            }
        } else {
            // Avoid head
            isCollision(head, s.head, possibleMoves);
        }
    }

    console.log('Try to eat', targetId);

    let goodMoves = [];
    if (closestFood) {
        goodMoves = targetCoord(gameState, possibleMoves, closestFood);
    }

    console.log('good moves', goodMoves);

    return goodMoves;
};

const targetCoord = (gameState, possibleMoves, t) => {
    // const f = getClosestFood(gameState);
    const goodMoves = [];
    console.log('TARGET', gameState.you.head, t, possibleMoves);

    if (t.dx < 0 && possibleMoves.left) {
        goodMoves.push('left');
    } else if (t.dy > 0 && possibleMoves.right) {
        goodMoves.push('right');
    }
    if (t.dy < 0 && possibleMoves.down) {
        goodMoves.push('down');
    } else if (t.dy > 0 && possibleMoves.up) {
        goodMoves.push('up');
    }
    return goodMoves;
};

const getClosestFood = gameState => {
    const { head } = gameState.you;
    let closest = null;
    for (const f of gameState.board.food) {
        f.dx = f.x - head.x;
        f.dy = f.y - head.y;
        f.d = Math.abs(f.dx) + Math.abs(f.dy);
        if (!closest || closest.d > f.d) {
            closest = f;
        }
    }
    return closest;
};

/**
 * Look ahead to find better moves. Returns false if move should be avoided
 * @type {function(import("./types").GameState, import("./types").Move, number): boolean}
 */
const lookAhead = (gameState, nextMove, level = 1) => {
    // calculate game state after nextMove
    const { you } = gameState;
    const { head, body } = you;
    const newHead = head;
    if (nextMove === 'right') {
        newHead.x += 1;
    } else if (nextMove === 'left') {
        newHead.x -= 1;
    } else if (nextMove === 'up') {
        newHead.y += 1;
    } else if (nextMove === 'down') {
        newHead.y -= 1;
    }
    // the tail moves up by one position, the head is now newHead
    const newBody = [newHead, ...body.splice(-1)];
    const newGameState = { ...gameState, you: { ...you, head: newHead, body: newBody } };

    // calculate possible moves in next round
    const { possibleMoves } = move(newGameState, level);

    if (!possibleMoves.up && !possibleMoves.down && !possibleMoves.left && !possibleMoves.right) {
        // this move leads to snake's death
        return false;
    }
    return true;
};

/** @type {function(import("./types").GameState):import("./types").MoveResponse} */
function move(gameState, lookAheadLevel = 0) {
    let possibleMoves = {
        up: BEST_MOVE,
        down: BEST_MOVE,
        left: BEST_MOVE,
        right: BEST_MOVE,
    };

    // Step 0: Don't let your Battlesnake move back on its own neck
    // Step 2 - Don't hit yourself.
    avoidSelf(gameState, possibleMoves);

    // TODO: Step 1 - Don't hit walls.
    // Use information in gameState to prevent your Battlesnake from moving beyond the boundaries of the board.
    avoidWalls(gameState, possibleMoves);
    avoidHazards(gameState, possibleMoves);

    // TODO: Step 3 - Don't collide with others.
    // TODO: Step 4 - Find food.
    // Use information in gameState to prevent your Battlesnake from colliding with others.

    // Understand whether it's better to get food or eat smaller snakes
    let goodMoves = socialize(gameState, possibleMoves);

    // Finally, choose a move from the available safe moves.
    // TODO: Step 5 - Select a move to make based on strategy, rather than random.

    if (!goodMoves.length) {
        // Fall back to any safe move
        console.log('Fallback', possibleMoves);
        goodMoves = Object.keys(possibleMoves).filter(key => possibleMoves[key] > AVOID);
    }
    // sort moves in ascending order of preference
    // worst move to best move
    goodMoves.sort((a, b) => {
        return possibleMoves[a] - possibleMoves[b];
    });
    while (goodMoves.length > 0) {
        const bestMove = goodMoves.pop();
        if (lookAheadLevel === 0 && lookAhead(gameState)) {
            return {
                possibleMoves,
                bestMove,
            };
        } else {
            return {
                possibleMoves,
                bestMove,
            };
        }
    }
}

/**
 * Returns body of response for /move endpoint
 * @type {function(import("./types").GameState):import("./types").MoveResponse}
 * */
const moveResponse = gameState => {
    const { bestMove } = move(gameState);
    const response = {
        move: bestMove,
    };

    console.log(`${gameState.game.id} MOVE ${gameState.turn}: ${response.move}`);
    return response;
};

module.exports = {
    info: info,
    start: start,
    move: moveResponse,
    end: end,
};
