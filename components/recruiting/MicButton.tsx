'use client'

import { useEffect, useRef, useState } from 'react'

interface SpeechRecognitionResultLike {
  0: { transcript: string }
  isFinal: boolean
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Dictation button for athletes who'd rather talk than type. Appends the
 * transcript to whatever the caller's text field currently holds.
 */
export function MicButton({ onTranscript, label = 'Record voice answer' }: {
  onTranscript: (text: string) => void
  label?: string
}) {
  const [listening, setListening] = useState(false)
  const [supported] = useState(() => getSpeechRecognitionCtor() !== null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return
    const recognition = new Ctor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      const parts: string[] = []
      for (let i = 0; i < event.results.length; i++) {
        parts.push(event.results[i][0].transcript)
      }
      onTranscript(parts.join(' ').trim())
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    return () => { recognition.stop() }
  }, [onTranscript])

  if (!supported) return null

  function toggle() {
    const recognition = recognitionRef.current
    if (!recognition) return
    if (listening) {
      recognition.stop()
      setListening(false)
    } else {
      recognition.start()
      setListening(true)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={listening ? 'Stop recording' : label}
      title={listening ? 'Stop recording' : label}
      style={{
        background: listening ? 'var(--red)' : 'var(--navy)',
        color: 'var(--cream)',
        border: 'none',
        cursor: 'pointer',
        borderRadius: '50%',
        width: 40,
        height: 40,
        minWidth: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: 16,
      }}
    >
      {listening ? '■' : '🎤'}
    </button>
  )
}
