"use client"

import { useEffect, useEffectEvent, useState } from "react"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useIsMobile } from "@/components/ui/use-mobile"
import { cn } from "@/lib/utils"
import {
  createInitialSnakeState,
  pauseSnake,
  pointsEqual,
  setNextDirection,
  startSnake,
  stepSnake,
  type SnakeDirection,
  type SnakeState,
} from "@/lib/snake"

const BOARD_SIZE = 14
const TICK_MS = 160

const DIRECTION_BUTTONS: Array<{ direction: SnakeDirection; label: string; icon: typeof ArrowUp }> = [
  { direction: "up", label: "Up", icon: ArrowUp },
  { direction: "left", label: "Left", icon: ArrowLeft },
  { direction: "down", label: "Down", icon: ArrowDown },
  { direction: "right", label: "Right", icon: ArrowRight },
]

function createGame(): SnakeState {
  return createInitialSnakeState({ boardSize: BOARD_SIZE })
}

function getCellKey(x: number, y: number): string {
  return `${x},${y}`
}

function getStatusText(game: SnakeState): string {
  if (game.status === "idle") {
    return "Press an arrow key or WASD to start."
  }

  if (game.status === "paused") {
    return "Paused. Resume when you are ready."
  }

  if (game.status === "game-over") {
    return "Game over. Restart to play again."
  }

  return "Running. Space or P pauses the game."
}

export function SnakeGame() {
  const isMobile = useIsMobile()
  const [game, setGame] = useState<SnakeState>(createGame)

  const queueDirection = useEffectEvent((direction: SnakeDirection) => {
    setGame((previousGame) => startSnake(setNextDirection(previousGame, direction)))
  })

  const togglePause = useEffectEvent(() => {
    setGame((previousGame) => (previousGame.status === "running" ? pauseSnake(previousGame) : startSnake(previousGame)))
  })

  const restartGame = useEffectEvent(() => {
    setGame(createGame())
  })

  const tick = useEffectEvent(() => {
    setGame((previousGame) => stepSnake(previousGame))
  })

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.repeat) {
      return
    }

    const key = event.key.toLowerCase()

    if (key === "arrowup" || key === "w") {
      event.preventDefault()
      queueDirection("up")
      return
    }

    if (key === "arrowleft" || key === "a") {
      event.preventDefault()
      queueDirection("left")
      return
    }

    if (key === "arrowdown" || key === "s") {
      event.preventDefault()
      queueDirection("down")
      return
    }

    if (key === "arrowright" || key === "d") {
      event.preventDefault()
      queueDirection("right")
      return
    }

    if (event.code === "Space" || key === "p") {
      event.preventDefault()
      togglePause()
      return
    }

    if (key === "r") {
      event.preventDefault()
      restartGame()
    }
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event)
    window.addEventListener("keydown", listener)

    return () => {
      window.removeEventListener("keydown", listener)
    }
  }, [handleKeyDown])

  useEffect(() => {
    if (game.status !== "running") {
      return
    }

    const intervalId = window.setInterval(() => {
      tick()
    }, TICK_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [game.status, tick])

  const snakeCells = new Set(game.snake.map((segment) => getCellKey(segment.x, segment.y)))
  const head = game.snake[0]
  const statusText = getStatusText(game)
  const primaryActionLabel = game.status === "game-over" ? "Play Again" : game.status === "idle" ? "Start" : game.status === "paused" ? "Resume" : "Pause"

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="border-primary/10 bg-card/95">
        <CardHeader className="gap-3 border-b border-border/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Snake</CardTitle>
              <CardDescription>{statusText}</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full border border-primary/20 px-3 py-1">{game.status}</span>
              <span className="rounded-full border border-primary/20 px-3 py-1 tabular-nums">Score {game.score}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[min(88vw,34rem)]">
            <div
              className="grid aspect-square rounded-2xl border border-primary/10 bg-[#090a0d] p-2 shadow-[inset_0_0_0_1px_rgba(214,178,124,0.05)]"
              style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
              role="img"
              aria-label={`Snake board. Score ${game.score}. Status ${game.status}.`}
            >
              {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
                const x = index % BOARD_SIZE
                const y = Math.floor(index / BOARD_SIZE)
                const cellKey = getCellKey(x, y)
                const isHead = head.x === x && head.y === y
                const isSnake = snakeCells.has(cellKey)
                const isFood = pointsEqual(game.food, { x, y })

                return (
                  <div
                    key={cellKey}
                    className={cn(
                      "aspect-square rounded-[4px] border border-white/4 bg-white/[0.03]",
                      isSnake && "bg-primary/75 border-primary/35",
                      isHead && "bg-primary border-primary/60",
                      isFood && "bg-red-500 border-red-400",
                    )}
                  />
                )
              })}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 border-t border-border/70 sm:flex-row sm:justify-between">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-primary/10 bg-background/60 px-3 py-2">
              <div className="text-muted-foreground">Length</div>
              <div className="font-medium tabular-nums">{game.snake.length}</div>
            </div>
            <div className="rounded-lg border border-primary/10 bg-background/60 px-3 py-2">
              <div className="text-muted-foreground">Board</div>
              <div className="font-medium tabular-nums">{BOARD_SIZE}x{BOARD_SIZE}</div>
            </div>
            <div className="rounded-lg border border-primary/10 bg-background/60 px-3 py-2">
              <div className="text-muted-foreground">Speed</div>
              <div className="font-medium tabular-nums">{TICK_MS}ms</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => (game.status === "running" ? togglePause() : game.status === "game-over" ? restartGame() : togglePause())}>
              {game.status === "running" ? <Pause /> : game.status === "game-over" ? <RotateCcw /> : <Play />}
              {primaryActionLabel}
            </Button>
            <Button variant="outline" onClick={() => restartGame()}>
              <RotateCcw />
              Restart
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className="grid gap-6">
        <Card className="border-primary/10 bg-card/95">
          <CardHeader className="gap-2 border-b border-border/70">
            <CardTitle>Controls</CardTitle>
            <CardDescription>Classic movement only: arrow keys or WASD.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-primary/10 bg-background/60 px-3 py-2">
              <div className="font-medium text-foreground">Move</div>
              <div>Arrow keys or WASD</div>
            </div>
            <div className="rounded-lg border border-primary/10 bg-background/60 px-3 py-2">
              <div className="font-medium text-foreground">Pause</div>
              <div>Press <span className="font-mono text-foreground">Space</span> or <span className="font-mono text-foreground">P</span></div>
            </div>
            <div className="rounded-lg border border-primary/10 bg-background/60 px-3 py-2">
              <div className="font-medium text-foreground">Restart</div>
              <div>Press <span className="font-mono text-foreground">R</span> or use the button below</div>
            </div>
          </CardContent>
        </Card>

        {isMobile ? (
          <Card className="border-primary/10 bg-card/95">
            <CardHeader className="gap-2 border-b border-border/70">
              <CardTitle>Touch Controls</CardTitle>
              <CardDescription>Shown on small screens so the game is playable on mobile.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <Button size="icon" variant="outline" aria-label="Move up" onClick={() => queueDirection("up")}>
                <ArrowUp />
              </Button>
              <div className="flex items-center gap-3">
                {DIRECTION_BUTTONS.filter((button) => button.direction !== "up" && button.direction !== "down").map((button) => {
                  const Icon = button.icon
                  return (
                    <Button
                      key={button.direction}
                      size="icon"
                      variant="outline"
                      aria-label={`Move ${button.label.toLowerCase()}`}
                      onClick={() => queueDirection(button.direction)}
                    >
                      <Icon />
                    </Button>
                  )
                })}
              </div>
              <Button size="icon" variant="outline" aria-label="Move down" onClick={() => queueDirection("down")}>
                <ArrowDown />
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
