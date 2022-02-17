function info() {
    console.log("INFO")
    const response = {
        apiversion: "1",
        author: "",
        color: "#888888",
        head: "default",
        tail: "default",
    }
    return response
}

function start(gameState) {
    console.log(`${gameState.game.id} START`)
}

function end(gameState) {
    console.log(`${gameState.game.id} END\n`)
}

/** @type {function(import("./types").Coord, import("./types").Coord, Object):boolean} */
const isCollision = (head, coord, possibleMoves) => {
    if (coord.x === head.x + 1) {
        possibleMoves.right = false
    } else if (coord.x === head.x - 1) {
        possibleMoves.left = false
    } else if (coord.y === head.y + 1) {
        possibleMoves.up = false
    } else if (coord.y === head.y - 1) {
        possibleMoves.down = false
    }
}

/** @type {function(import("./types").GameState, Object):void} */
const avoidSelf = (gameState, possibleMoves) => {
    const { head, body } = gameState.you
    for (const bodyPart of body) {
        isCollision(head, bodyPart, possibleMoves)
    }
}

/** @type {function(import("./types").GameState, Object):void} */
const avoidOthers = (gameState, possibleMoves) => {
    const { head } = gameState.you
    const { snakes } = gameState.board
    for (const snake of snakes) {
        for (const bodyPart of snake.body) {
            isCollision(head, bodyPart, possibleMoves)
        }
    }
}

/** @type {function(import("./types").GameState):import("./types").MoveResponse} */
function move(gameState) {
    let possibleMoves = {
        up: true,
        down: true,
        left: true,
        right: true,
    }

    // Step 0: Don't let your Battlesnake move back on its own neck
    // Step 2 - Don't hit yourself.
    avoidSelf(gameState, possibleMoves)

    console.log(gameState, gameState.you.body);

    // TODO: Step 1 - Don't hit walls.
    // Use information in gameState to prevent your Battlesnake from moving beyond the boundaries of the board.
    const boardWidth = gameState.board.width
    const boardHeight = gameState.board.height

    if (myHead.x === 0) {
      possibleMoves.left = false
    } else if (myHead.x === boardWidth - 1) {
      possibleMoves.right = false
    }
    if (myHead.y === 0) {
      possibleMoves.down = false
    } else if (myHead.y === boardHeight - 1) {
      possibleMoves.up = false
    }

    // TODO: Step 3 - Don't collide with others.
    // Use information in gameState to prevent your Battlesnake from colliding with others.
    avoidOthers(gameState, possibleMoves)

    // TODO: Step 4 - Find food.
    // Use information in gameState to seek out and find food.

    // Finally, choose a move from the available safe moves.
    // TODO: Step 5 - Select a move to make based on strategy, rather than random.
    const safeMoves = Object.keys(possibleMoves).filter(key => possibleMoves[key])
    const response = {
        move: safeMoves[Math.floor(Math.random() * safeMoves.length)],
    }

    console.log(`${gameState.game.id} MOVE ${gameState.turn}: ${response.move}`)
    return response
}

module.exports = {
    info: info,
    start: start,
    move: move,
    end: end,
}
