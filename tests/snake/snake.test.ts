import { describe, expect, it } from "vitest"
import {
  createInitialSnakeState,
  pauseSnake,
  setNextDirection,
  spawnFood,
  startSnake,
  stepSnake,
  type SnakeState,
} from "@/lib/snake"

describe("snake game logic", () => {
  it("creates an initial state with food off the snake", () => {
    const state = createInitialSnakeState({ boardSize: 8, random: () => 0 })

    expect(state.status).toBe("idle")
    expect(state.snake).toHaveLength(3)
    expect(state.food).not.toBeNull()
    expect(state.snake.some((segment) => segment.x === state.food?.x && segment.y === state.food?.y)).toBe(false)
  })

  it("queues one legal direction change and blocks reverse turns", () => {
    const runningState = startSnake(createInitialSnakeState({ boardSize: 8, random: () => 0 }))

    const turnedUp = setNextDirection(runningState, "up")
    const blockedSecondTurn = setNextDirection(turnedUp, "left")
    const blockedReverseTurn = setNextDirection(runningState, "left")

    expect(turnedUp.queuedDirection).toBe("up")
    expect(blockedSecondTurn.queuedDirection).toBe("up")
    expect(blockedReverseTurn.queuedDirection).toBeNull()
  })

  it("moves the snake one cell on each tick", () => {
    const state: SnakeState = {
      boardSize: 6,
      snake: [
        { x: 2, y: 2 },
        { x: 1, y: 2 },
        { x: 0, y: 2 },
      ],
      direction: "right",
      queuedDirection: null,
      food: { x: 5, y: 5 },
      score: 0,
      status: "running",
    }

    expect(stepSnake(state)).toEqual({
      ...state,
      snake: [
        { x: 3, y: 2 },
        { x: 2, y: 2 },
        { x: 1, y: 2 },
      ],
    })
  })

  it("grows and increments score when the snake eats food", () => {
    const state: SnakeState = {
      boardSize: 4,
      snake: [
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      direction: "right",
      queuedDirection: null,
      food: { x: 2, y: 1 },
      score: 0,
      status: "running",
    }

    expect(stepSnake(state, () => 0)).toEqual({
      ...state,
      snake: [
        { x: 2, y: 1 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      food: { x: 0, y: 0 },
      score: 1,
    })
  })

  it("ends the game on wall collision", () => {
    const state: SnakeState = {
      boardSize: 4,
      snake: [{ x: 3, y: 1 }],
      direction: "right",
      queuedDirection: null,
      food: { x: 0, y: 0 },
      score: 4,
      status: "running",
    }

    expect(stepSnake(state).status).toBe("game-over")
  })

  it("ends the game on self collision but allows moving into the vacated tail cell", () => {
    const selfCollisionState: SnakeState = {
      boardSize: 5,
      snake: [
        { x: 2, y: 2 },
        { x: 2, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ],
      direction: "left",
      queuedDirection: null,
      food: { x: 4, y: 4 },
      score: 3,
      status: "running",
    }

    const tailVacateState: SnakeState = {
      boardSize: 5,
      snake: [
        { x: 2, y: 2 },
        { x: 2, y: 1 },
        { x: 1, y: 1 },
      ],
      direction: "left",
      queuedDirection: null,
      food: { x: 4, y: 4 },
      score: 2,
      status: "running",
    }

    expect(stepSnake(selfCollisionState).status).toBe("game-over")
    expect(stepSnake(tailVacateState).status).toBe("running")
    expect(stepSnake(tailVacateState).snake[0]).toEqual({ x: 1, y: 2 })
  })

  it("returns null when there is no free cell left for food", () => {
    expect(
      spawnFood(2, [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ]),
    ).toBeNull()
  })

  it("pauses and resumes without mutating other state", () => {
    const runningState = startSnake(createInitialSnakeState({ boardSize: 8, random: () => 0 }))
    const pausedState = pauseSnake(runningState)

    expect(pausedState.status).toBe("paused")
    expect(startSnake(pausedState).status).toBe("running")
  })
})
