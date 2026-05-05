export type SnakeDirection = "up" | "down" | "left" | "right"
export type SnakeStatus = "idle" | "running" | "paused" | "game-over"

export interface SnakePoint {
  x: number
  y: number
}

export interface SnakeState {
  boardSize: number
  snake: SnakePoint[]
  direction: SnakeDirection
  queuedDirection: SnakeDirection | null
  food: SnakePoint | null
  score: number
  status: SnakeStatus
}

interface CreateSnakeStateOptions {
  boardSize?: number
  random?: () => number
}

const DIRECTION_OFFSETS: Record<SnakeDirection, SnakePoint> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const OPPOSITE_DIRECTIONS: Record<SnakeDirection, SnakeDirection> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
}

export function createInitialSnakeState({
  boardSize = 14,
  random = Math.random,
}: CreateSnakeStateOptions = {}): SnakeState {
  const center = Math.floor(boardSize / 2)
  const snake = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ]

  return {
    boardSize,
    snake,
    direction: "right",
    queuedDirection: null,
    food: spawnFood(boardSize, snake, random),
    score: 0,
    status: "idle",
  }
}

export function startSnake(state: SnakeState): SnakeState {
  if (state.status === "idle" || state.status === "paused") {
    return { ...state, status: "running" }
  }

  return state
}

export function pauseSnake(state: SnakeState): SnakeState {
  if (state.status === "running") {
    return { ...state, status: "paused" }
  }

  return state
}

export function setNextDirection(state: SnakeState, direction: SnakeDirection): SnakeState {
  if (state.status === "game-over" || state.queuedDirection || direction === state.direction) {
    return state
  }

  if (OPPOSITE_DIRECTIONS[state.direction] === direction) {
    return state
  }

  return {
    ...state,
    queuedDirection: direction,
  }
}

export function stepSnake(state: SnakeState, random: () => number = Math.random): SnakeState {
  if (state.status !== "running") {
    return state
  }

  const direction = state.queuedDirection ?? state.direction
  const nextHead = movePoint(state.snake[0], direction)
  const grows = state.food != null && pointsEqual(nextHead, state.food)
  const collisionBody = grows ? state.snake : state.snake.slice(0, -1)

  if (isOutsideBoard(nextHead, state.boardSize) || collisionBody.some((segment) => pointsEqual(segment, nextHead))) {
    return {
      ...state,
      direction,
      queuedDirection: null,
      status: "game-over",
    }
  }

  const nextSnake = grows ? [nextHead, ...state.snake] : [nextHead, ...state.snake.slice(0, -1)]
  const nextFood = grows ? spawnFood(state.boardSize, nextSnake, random) : state.food

  return {
    ...state,
    snake: nextSnake,
    direction,
    queuedDirection: null,
    food: nextFood,
    score: grows ? state.score + 1 : state.score,
    status: nextFood ? "running" : "game-over",
  }
}

export function spawnFood(
  boardSize: number,
  snake: SnakePoint[],
  random: () => number = Math.random,
): SnakePoint | null {
  const emptyCells: SnakePoint[] = []

  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      if (!snake.some((segment) => segment.x === x && segment.y === y)) {
        emptyCells.push({ x, y })
      }
    }
  }

  if (emptyCells.length === 0) {
    return null
  }

  const index = Math.min(emptyCells.length - 1, Math.floor(random() * emptyCells.length))
  return emptyCells[index]
}

export function pointsEqual(a: SnakePoint | null, b: SnakePoint | null): boolean {
  if (!a || !b) {
    return false
  }

  return a.x === b.x && a.y === b.y
}

function movePoint(point: SnakePoint, direction: SnakeDirection): SnakePoint {
  const offset = DIRECTION_OFFSETS[direction]

  return {
    x: point.x + offset.x,
    y: point.y + offset.y,
  }
}

function isOutsideBoard(point: SnakePoint, boardSize: number): boolean {
  return point.x < 0 || point.y < 0 || point.x >= boardSize || point.y >= boardSize
}
