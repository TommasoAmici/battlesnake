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
    console.log("< avoidSelf", possibleMoves, head, body)
    for (const bodyPart of body) {
        isCollision(head, bodyPart, possibleMoves)
    }
    console.log("> avoidSelf", possibleMoves)
}

/** @type {function(import("./types").GameState, Object):void} */
const avoidOthers = (gameState, possibleMoves) => {
    console.log("< avoidOthers", possibleMoves)
    const { head } = gameState.you
    const { snakes } = gameState.board
    for (const snake of snakes) {
        for (const bodyPart of snake.body) {
            isCollision(head, bodyPart, possibleMoves)
        }
    }
    console.log("> avoidOthers", possibleMoves)
}

const avoidWalls = (gameState, possibleMoves) => {
    const boardWidth = gameState.board.width
    const boardHeight = gameState.board.height
    console.log("< avoidWalls", possibleMoves)
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

const targetFood = (gameState, possibleMoves) => {
    const f = getClosestFood(gameState)
    const goodMoves = []
    if (f) {
        console.log("EAT", gameState.you.head, f, possibleMoves)

        if (f.dx < 0 && possibleMoves.left) {
            goodMoves.push("left")
        } else if (f.dy > 0 && possibleMoves.right) {
            goodMoves.push("right")
        }
        if (f.dy < 0 && possibleMoves.down) {
            goodMoves.push("down")
        } else if (f.dy > 0 && possibleMoves.up) {
            goodMoves.push("up")
        }
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

/** @type {function(import("./types").GameState):import("./types").MoveResponse} */
function move(gameState) {
    let possibleMoves = {
        up: true,
        down: true,
        left: true,
        right: true,
    }

    console.log(gameState.board.snakes);

    // Step 0: Don't let your Battlesnake move back on its own neck
    // Step 2 - Don't hit yourself.
    avoidSelf(gameState, possibleMoves)

    // TODO: Step 1 - Don't hit walls.
    // Use information in gameState to prevent your Battlesnake from moving beyond the boundaries of the board.
    avoidWalls(gameState, possibleMoves)

    // TODO: Step 3 - Don't collide with others.
    // Use information in gameState to prevent your Battlesnake from colliding with others.
    avoidOthers(gameState, possibleMoves)

    // Finally, choose a move from the available safe moves.
    // TODO: Step 5 - Select a move to make based on strategy, rather than random.

    // TODO: Step 4 - Find food.
    // Use information in gameState to seek out and find food.
    let goodMoves = targetFood(gameState, possibleMoves)
    console.log("good moves", goodMoves)

    if (!goodMoves.length) {
        // Fall back to any safe move
        console.log("Fallback", possibleMoves)
        goodMoves = Object.keys(possibleMoves).filter(key => possibleMoves[key])
    }

    const response = {
        move: goodMoves[Math.floor(Math.random() * goodMoves.length)],
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
