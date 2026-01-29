'use client'

import { ReactNode, useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface LightboxImage {
  src: string
  alt: string
  caption?: string
}

interface ImageLightboxProps {
  images: LightboxImage[]
  children: (openImage: (index: number) => void) => ReactNode
}

export function ImageLightbox({ images, children }: ImageLightboxProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const close = useCallback(() => setOpenIndex(null), [])
  const prev = useCallback(() => {
    setOpenIndex((i) => (i === null ? null : i === 0 ? images.length - 1 : i - 1))
  }, [images.length])
  const next = useCallback(() => {
    setOpenIndex((i) => (i === null ? null : i === images.length - 1 ? 0 : i + 1))
  }, [images.length])

  useEffect(() => {
    if (openIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [openIndex, close, prev, next])

  return (
    <>
      {children((index: number) => setOpenIndex(index))}

      {/* Lightbox overlay */}
      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={close}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10"
            onClick={close}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          <button
            className="absolute left-4 text-white/80 hover:text-white p-2 z-10"
            onClick={(e) => { e.stopPropagation(); prev() }}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>

          <div
            className="flex flex-col items-center max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[openIndex].src}
              alt={images[openIndex].alt}
              className="max-h-[85vh] max-w-[90vw] object-contain"
            />
            {images[openIndex].caption && (
              <p className="text-white/80 text-sm mt-3">{images[openIndex].caption}</p>
            )}
            <p className="text-white/50 text-xs mt-1">
              {openIndex + 1} / {images.length}
            </p>
          </div>

          <button
            className="absolute right-4 text-white/80 hover:text-white p-2 z-10"
            onClick={(e) => { e.stopPropagation(); next() }}
            aria-label="Next image"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </div>
      )}
    </>
  )
}
