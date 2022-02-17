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
    console.log(`${gameState.game.id} START`)
}

function end(gameState) {
    console.log(`${gameState.game.id} END\n`)
}

/** @type {function(import("./types").Coord, import("./types").Coord, Object):boolean} */
const isCollision = (head, coord, possibleMoves) => {
    if (coord.y == head.y) {
        if (coord.x === head.x + 1) {
            possibleMoves.right = false
        } else if (coord.x === head.x - 1) {
            possibleMoves.left = false
        }
    }
    if (coord.x == head.x) {
        if (coord.y === head.y + 1) {
            possibleMoves.up = false
        } else if (coord.y === head.y - 1) {
            possibleMoves.down = false
        }
    }
}

/** @type {function(import("./types").GameState, Object):void} */
const avoidSelf = (gameState, possibleMoves) => {
    const { head, body } = gameState.you
    for (const bodyPart of body) {
        isCollision(head, bodyPart, possibleMoves)
    }
    console.log("> avoidSelf", possibleMoves)
}

const avoidWalls = (gameState, possibleMoves) => {
    const boardWidth = gameState.board.width
    const boardHeight = gameState.board.height
    const { head } = gameState.you
    if (head.x === 0) {
        possibleMoves.left = false
    } else if (head.x === boardWidth - 1) {
        possibleMoves.right = false
    }
    if (head.y === 0) {
        possibleMoves.down = false
    } else if (head.y === boardHeight - 1) {
        possibleMoves.up = false
    }
    console.log("> avoidWalls", possibleMoves)
}

const socialize = (gameState, possibleMoves) => {
    const { head, body } = gameState.you
    let biggest = 0

    let closestFood = getClosestFood(gameState, possibleMoves)
    let targetId = closestFood ? "food" : "nothing"

    for (const s of gameState.board.snakes) {
        if (gameState.you.id == s.id) {
            continue
        }
        const otherSize = s.body.length
        for (const otherPart of s.body) {
            isCollision(head, otherPart, possibleMoves)
        }
        if (s.body.length < body.length) {
            // Maybe eat
            const f = {
                x: s.head.x,
                y: s.head.y,
            }
            f.dx = f.x - head.x
            f.dy = f.y - head.y
            f.d = Math.abs(f.dx) + Math.abs(f.dy)
            if (!closestFood || closestFood.d > f.d) {
                closestFood = f.d
                targetId = s.id
            }
        } else {
            // Avoid head
            isCollision(head, s.head, possibleMoves)
        }
    }

    console.log("Try to eat", targetId)

    let goodMoves = []
    if (closestFood) {
        goodMoves = targetCoord(gameState, possibleMoves, closestFood)
    }

    console.log("good moves", goodMoves)

    return goodMoves
}

const targetCoord = (gameState, possibleMoves, t) => {
    // const f = getClosestFood(gameState);
    const goodMoves = []
    console.log("TARGET", gameState.you.head, t, possibleMoves)

    if (t.dx < 0 && possibleMoves.left) {
        goodMoves.push("left")
    } else if (t.dy > 0 && possibleMoves.right) {
        goodMoves.push("right")
    }
    if (t.dy < 0 && possibleMoves.down) {
        goodMoves.push("down")
    } else if (t.dy > 0 && possibleMoves.up) {
        goodMoves.push("up")
    }
    return goodMoves
}

const getClosestFood = gameState => {
    const { head } = gameState.you
    let closest = null
    for (const f of gameState.board.food) {
        f.dx = f.x - head.x
        f.dy = f.y - head.y
        f.d = Math.abs(f.dx) + Math.abs(f.dy)
        if (!closest || closest.d > f.d) {
            closest = f
        }
    }
    return closest
}

/**
 * Look ahead to find better moves. Returns false if move should be avoided
 * @type {function(import("./types").GameState, import("./types").Move, number): boolean}
 */
const lookAhead = (gameState, nextMove, level = 1) => {
    // calculate game state after nextMove
    const { you } = gameState
    const { head, body } = you
    const newHead = head
    if (nextMove === "right") {
        newHead.x += 1
    } else if (nextMove === "left") {
        newHead.x -= 1
    } else if (nextMove === "up") {
        newHead.y += 1
    } else if (nextMove === "down") {
        newHead.y -= 1
    }
    // the tail moves up by one position, the head is now newHead
    const newBody = [newHead, ...body.splice(-1)]
    const newGameState = { ...gameState, you: { ...you, head: newHead, body: newBody } }

    // calculate possible moves in next round
    const { possibleMoves } = move(newGameState, level)

    if (!possibleMoves.up && !possibleMoves.down && !possibleMoves.left && !possibleMoves.right) {
        // this move leads to snake's death
        return false
    }
    return true
}

/** @type {function(import("./types").GameState):import("./types").MoveResponse} */
function move(gameState, lookAheadLevel = 0) {
    let possibleMoves = {
        up: true,
        down: true,
        left: true,
        right: true,
    }

    // Step 0: Don't let your Battlesnake move back on its own neck
    // Step 2 - Don't hit yourself.
    avoidSelf(gameState, possibleMoves)

    // TODO: Step 1 - Don't hit walls.
    // Use information in gameState to prevent your Battlesnake from moving beyond the boundaries of the board.
    avoidWalls(gameState, possibleMoves)

    // TODO: Step 3 - Don't collide with others.
    // TODO: Step 4 - Find food.
    // Use information in gameState to prevent your Battlesnake from colliding with others.

    // Understand whether it's better to get food or eat smaller snakes
    let goodMoves = socialize(gameState, possibleMoves)

    // Finally, choose a move from the available safe moves.
    // TODO: Step 5 - Select a move to make based on strategy, rather than random.

    if (!goodMoves.length) {
        // Fall back to any safe move
        console.log("Fallback", possibleMoves)
        goodMoves = Object.keys(possibleMoves).filter(key => possibleMoves[key])
    }
    while (goodMoves.length > 0) {
        const nextMoveIndex = Math.floor(Math.random() * goodMoves.length)
        const nextMove = goodMoves[nextMoveIndex]
        // remove nextMove from goodMoves
        goodMoves = goodMoves.splice(nextMoveIndex, 1)
        if (lookAheadLevel === 0 && lookAhead(gameState)) {
            return {
                possibleMoves,
                nextMove,
            }
        } else {
            return {
                possibleMoves,
                nextMove,
            }
        }
    }
}

/**
 * Returns body of response for /move endpoint
 * @type {function(import("./types").GameState):import("./types").MoveResponse}
 * */
const moveResponse = gameState => {
    const { nextMove } = move(gameState)
    const response = {
        move: nextMove,
    }

    console.log(`${gameState.game.id} MOVE ${gameState.turn}: ${response.move}`)
    return response
}

module.exports = {
    info: info,
    start: start,
    move: moveResponse,
    end: end,
}
