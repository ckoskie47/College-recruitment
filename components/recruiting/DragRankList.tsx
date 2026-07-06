'use client'

import { useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'

/**
 * Touch-and-mouse drag-to-reorder list, driven by Pointer Events (not HTML5
 * drag-and-drop, which mobile Safari/Chrome handle poorly). List position
 * IS the rank — dragging an item to position 3 makes it rank 3. This makes
 * duplicate/invalid ranks structurally impossible, unlike a numeric input
 * per row.
 */
export function DragRankList<T>({ items, getKey, renderLabel, onReorder }: {
  items: T[]
  getKey: (item: T) => string
  renderLabel: (item: T, rank: number) => ReactNode
  onReorder: (newItems: T[]) => void
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  function handlePointerDown(index: number, e: ReactPointerEvent<HTMLButtonElement>) {
    setDragIndex(index)
    setOverIndex(index)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (dragIndex === null) return
    const y = e.clientY
    for (let i = 0; i < rowRefs.current.length; i++) {
      const el = rowRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (y >= rect.top && y <= rect.bottom) {
        setOverIndex(prev => (prev === i ? prev : i))
        break
      }
    }
  }

  function handlePointerUp() {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const newItems = items.slice()
      const [moved] = newItems.splice(dragIndex, 1)
      newItems.splice(overIndex, 0, moved)
      onReorder(newItems)
    }
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => {
        const isDragging = dragIndex === i
        const isOver = overIndex === i && dragIndex !== i
        return (
          <div
            key={getKey(item)}
            ref={el => { rowRefs.current[i] = el }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: isDragging ? 'var(--cream-deep)' : 'var(--white)',
              border: `1px solid ${isOver ? 'var(--gold)' : 'var(--line)'}`,
              padding: '12px 16px',
              borderRadius: 4,
              opacity: isDragging ? 0.6 : 1,
              transition: 'border-color 120ms ease',
            }}
          >
            <button
              type="button"
              onPointerDown={(e) => handlePointerDown(i, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="Drag to reorder"
              style={{
                cursor: 'grab',
                background: 'var(--cream-deep)',
                border: '1px solid var(--line)',
                width: 40,
                height: 40,
                minWidth: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                touchAction: 'none',
                flexShrink: 0,
                fontSize: 18,
                color: 'var(--slate-soft)',
              }}
            >
              ⠿
            </button>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--gold)', fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: 'center' }}>
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>{renderLabel(item, i + 1)}</div>
          </div>
        )
      })}
    </div>
  )
}
