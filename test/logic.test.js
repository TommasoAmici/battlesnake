import { test } from "uvu";
import * as assert from "uvu/assert";
import { info, moveResponse } from "../src/logic.js";

const createGameState = myBattlesnake => {
  return {
    game: {
      id: "",
      ruleset: { name: "", version: "" },
      timeout: 0,
    },
    turn: 0,
    board: {
      height: 0,
      width: 0,
      food: [],
      snakes: [myBattlesnake],
      hazards: [],
    },
    you: myBattlesnake,
  };
};

const createBattlesnake = (id, bodyCoords) => {
  return {
    id: id,
    name: id,
    health: 0,
    body: bodyCoords,
    latency: "",
    head: bodyCoords[0],
    length: bodyCoords.length,
    shout: "",
    squad: "",
  };
};

test("should be api version 1", () => {
  const result = info();
  assert.is(result.apiversion, "1");
});

test("should never move into its own neck", () => {
  // Arrange
  const me = createBattlesnake("me", [
    { x: 2, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 0 },
  ]);
  const gameState = createGameState(me);

  // Act 1,000x (this isn't a great way to test, but it's okay for starting out)
  for (let i = 0; i < 1000; i++) {
    const response = moveResponse(gameState);
    // In this state, we should NEVER move left.
    const allowedMoves = ["up", "down", "right"];
    assert.ok(allowedMoves.includes(response.move));
  }
});

test.run();
