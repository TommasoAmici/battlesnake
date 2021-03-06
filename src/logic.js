export const info = () => {
  const response = {
    apiversion: "1",
    author: "Chris/Tommaso",
    color: "#eac302",
    head: "fang",
    tail: "curled",
  };
  return response;
};

export const start = () => {
  console.info("Battle start");
};

export const end = () => {
  console.info("Battle end");
};

// Weights for moves
const BEST_MOVE = 1;
const AVOID = 0;
const HAZARD = 0.5;
const HEAD_THREAT = 0.25;
const ESCAPE_PATH = 0.7;
const MAX_LOOKAHEAD_LEVEL = 5;

// Minimum weight for a strategic move
const MIN_STRAT_WEIGHT = ESCAPE_PATH;

/** @type {function(import("./types").Coord, import("./types").Coord, PossibleMoves):boolean} */
const isCollision = (head, coord, possibleMoves, weight = 0) => {
  if (coord.y == head.y) {
    if (coord.x === head.x + 1) {
      possibleMoves.right *= weight;
    } else if (coord.x === head.x - 1) {
      possibleMoves.left *= weight;
    }
  }
  if (coord.x == head.x) {
    if (coord.y === head.y + 1) {
      possibleMoves.up *= weight;
    } else if (coord.y === head.y - 1) {
      possibleMoves.down *= weight;
    }
  }
};

/** @type {function(import("./types").GameState, PossibleMoves):void} */
const avoidSelf = (gameState, possibleMoves) => {
  const { head, body } = gameState.you;
  for (const bodyPart of body) {
    isCollision(head, bodyPart, possibleMoves);
  }
};

/**
 * Some game modes contain hazards that should be avoided.
 * Food can be listed in hazards.
 * @type {function(import("./types").GameState, PossibleMoves):void}
 */
const avoidHazards = (gameState, possibleMoves) => {
  const { head } = gameState.you;
  const { hazards } = gameState.board;
  for (const hazard of hazards) {
    isCollision(head, hazard, possibleMoves, HAZARD);
  }
};

/** @type {function(import("./types").GameState, PossibleMoves):void} */
const avoidWalls = (gameState, possibleMoves) => {
  const { head } = gameState.you;
  const bottomWall = 0;
  const leftWall = 0;
  const rightWall = gameState.board.width;
  const topWall = gameState.board.height;
  if (head.x === leftWall) {
    possibleMoves.left = AVOID;
  } else if (head.x === rightWall - 1) {
    possibleMoves.right = AVOID;
  }
  if (head.y === bottomWall) {
    possibleMoves.down = AVOID;
  } else if (head.y === topWall - 1) {
    possibleMoves.up = AVOID;
  }

  if (head.x === leftWall + 1) {
    possibleMoves.left *= ESCAPE_PATH;
  } else if (head.x === rightWall - 2) {
    possibleMoves.right *= ESCAPE_PATH;
  }
  if (head.y === bottomWall + 1) {
    possibleMoves.down *= ESCAPE_PATH;
  } else if (head.y === topWall - 2) {
    possibleMoves.up *= ESCAPE_PATH;
  }
};

/** @type {function(import("./types").GameState, PossibleMoves):Array} */
const strategize = (gameState, possibleMoves) => {
  const { head, body } = gameState.you;
  let biggest = 0;

  let closestFood = getClosestFood(gameState, possibleMoves);
  let closestSnake = null;

  for (const s of gameState.board.snakes) {
    if (gameState.you.id == s.id) {
      continue;
    }
    if (s.body.length > biggest) {
      biggest = s.body.length;
    }
    // Iterate through the body, including the head but excluding the tail tip
    for (let i = 0; i < s.length - 1; i++) {
      const otherPart = s.body[i];
      if (otherPart !== undefined) {
        isCollision(head, otherPart, possibleMoves);
      }
    }
    if (s.body.length < body.length) {
      // Maybe eat
      const f = {
        id: s.id,
        x: s.head.x,
        y: s.head.y,
      };
      f.dx = f.x - head.x;
      f.dy = f.y - head.y;
      f.d = Math.abs(f.dx) + Math.abs(f.dy);
      if (!closestSnake || closestSnake.d > f.d) {
        closestSnake = f;
      }
    } else {
      // Soft avoid possible next head locations
      const l = { x: s.head.x - 1, y: s.head.y };
      isCollision(head, l, possibleMoves, HEAD_THREAT);
      const r = { x: s.head.x + 1, y: s.head.y };
      isCollision(head, r, possibleMoves, HEAD_THREAT);
      const u = { x: s.head.x, y: s.head.y + 1 };
      isCollision(head, u, possibleMoves, HEAD_THREAT);
      const d = { x: s.head.x, y: s.head.y - 1 };
      isCollision(head, d, possibleMoves, HEAD_THREAT);
    }
  }

  let target = closestFood;

  if (body.length - biggest > 1 && closestSnake) {
    // Big enough, go for enemy
    target = closestSnake;
  }

  let goodMoves = [];
  if (target) {
    goodMoves = targetCoord(gameState, possibleMoves, target);
  }

  return goodMoves;
};

const targetCoord = (gameState, possibleMoves, t) => {
  const goodMoves = [];

  if (t.dx < 0 && possibleMoves.left >= MIN_STRAT_WEIGHT) {
    goodMoves.push("left");
  } else if (t.dx > 0 && possibleMoves.right >= MIN_STRAT_WEIGHT) {
    goodMoves.push("right");
  }
  if (t.dy < 0 && possibleMoves.down >= MIN_STRAT_WEIGHT) {
    goodMoves.push("down");
  } else if (t.dy > 0 && possibleMoves.up >= MIN_STRAT_WEIGHT) {
    goodMoves.push("up");
  }
  return goodMoves;
};

const getClosestFood = gameState => {
  const { head } = gameState.you;
  let closest = null;
  for (const f of gameState.board.food) {
    f.id = "food";
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
 * @type {function(import("./types").PossibleMoves, import("./types").Move[]): import("./types").Move[]}
 */
const findBestMoves = (possible, strategic) => {
  let moves = strategic;
  if (!strategic.length) {
    // Fall back to any safe move
    moves = Object.keys(possible).filter(key => possible[key] > AVOID);
  }
  // sort moves in ascending order of preference, worst move to best move
  moves.sort((a, b) => {
    return possible[a] - possible[b];
  });
  return moves;
};

/**
 * @type {function(import("./types").Battlesnake, import("./types").Move): import("./types").Battlesnake}
 */
const moveSnake = (snake, nextMove) => {
  const { head, body } = snake;
  const newHead = head;
  if (nextMove === "right") {
    newHead.x += 1;
  } else if (nextMove === "left") {
    newHead.x -= 1;
  } else if (nextMove === "up") {
    newHead.y += 1;
  } else if (nextMove === "down") {
    newHead.y -= 1;
  }
  // the tail moves up by one position, the head is now newHead
  const newBody = [newHead, ...body.splice(-1)];
  return { ...snake, head: newHead, body: newBody };
};

/**
 * Move other snakes to predict next mvoes
 * @type {function(import("./types").GameState, import("./types").Battlesnake): import("./types").Battlesnake}
 */
const moveOtherSnake = (gameState, snake) => {
  let possibleMoves = {
    up: BEST_MOVE,
    down: BEST_MOVE,
    left: BEST_MOVE,
    right: BEST_MOVE,
  };
  avoidSelf(gameState, possibleMoves);
  avoidWalls(gameState, possibleMoves);
  avoidHazards(gameState, possibleMoves);
  const strategicMoves = strategize(gameState, possibleMoves);
  const moves = findBestMoves(possibleMoves, strategicMoves);
  const bestMove = moves.pop();
  return moveSnake(snake, bestMove);
};

/**
 * Look ahead to find better moves. Returns false if move should be avoided
 * @type {function(import("./types").GameState, import("./types").Move, number): boolean}
 */
const lookAhead = (gameState, nextMove, lookAheadLevel) => {
  // calculate game state after nextMove
  const { you, board } = gameState;
  const newYou = moveSnake(you, nextMove);

  // move other snakes
  const otherSnakes = board.snakes
    .filter(snake => snake.id !== you.id)
    .map(snake => moveOtherSnake(gameState, snake));

  const newGameState = {
    ...gameState,
    you: newYou,
    board: { ...board, snakes: [newYou, ...otherSnakes] },
  };

  // calculate possible moves in next round
  const { possibleMoves, strategicMoves } = move(newGameState, lookAheadLevel);

  if (
    possibleMoves.up === 0 &&
    possibleMoves.down === 0 &&
    possibleMoves.left === 0 &&
    possibleMoves.right === 0
  ) {
    // this move leads to snake's death
    return false;
  }
  const moves = findBestMoves(possibleMoves, strategicMoves);
  const bestMove = moves.pop();
  if (lookAheadLevel < MAX_LOOKAHEAD_LEVEL) {
    return lookAhead(gameState, bestMove, lookAheadLevel + 1);
  }
  return true;
};

/** @type {function(import("./types").GameState):import("./types").MoveResponse} */
function move(gameState, lookAheadLevel) {
  let possibleMoves = {
    up: BEST_MOVE,
    down: BEST_MOVE,
    left: BEST_MOVE,
    right: BEST_MOVE,
  };

  avoidSelf(gameState, possibleMoves);
  avoidWalls(gameState, possibleMoves);
  avoidHazards(gameState, possibleMoves);

  // Understand whether it's better to get food or eat smaller snakes
  const strategicMoves = strategize(gameState, possibleMoves);
  const moves = findBestMoves(possibleMoves, strategicMoves);
  while (moves.length > 0) {
    const bestMove = moves.pop();
    if (
      lookAheadLevel < MAX_LOOKAHEAD_LEVEL &&
      lookAhead(gameState, bestMove, lookAheadLevel + 1)
    ) {
      return {
        strategicMoves,
        possibleMoves,
        bestMove,
      };
    } else {
      return {
        strategicMoves,
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
export const moveResponse = gameState => {
  const { bestMove } = move(gameState, 0);
  const response = {
    move: bestMove,
  };

  return response;
};
