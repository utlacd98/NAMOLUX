"use client"

import { useState } from "react"
import { Volume2, VolumeX } from "lucide-react"

interface NamePronunciationProps {
  name: string
}

export function NamePronunciation({ name }: NamePronunciationProps) {
  const [playing, setPlaying] = useState(false)
  const [supported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window)

  if (!supported) return null

  function speak() {
    if (playing) {
      window.speechSynthesis.cancel()
      setPlaying(false)
      return
    }

    const utt = new SpeechSynthesisUtterance(name)
    utt.rate = 0.85
    utt.pitch = 1
    utt.lang = "en-US"

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(
      (v) => v.lang === "en-US" && (v.name.includes("Samantha") || v.name.includes("Google") || v.name.includes("Natural"))
    )
    if (preferred) utt.voice = preferred

    utt.onstart = () => setPlaying(true)
    utt.onend = () => setPlaying(false)
    utt.onerror = () => setPlaying(false)

    window.speechSynthesis.speak(utt)
  }

  return (
    <button
      onClick={speak}
      title={playing ? "Stop" : `Hear how "${name}" sounds`}
      className="flex h-7 w-7 items-center justify-center rounded-lg transition-all hover:-translate-y-0.5"
      style={{
        background: playing ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.06)",
        color: playing ? "#60a5fa" : "rgba(255,255,255,0.4)",
        border: playing ? "1px solid rgba(96,165,250,0.25)" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {playing ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
    </button>
  )
}
