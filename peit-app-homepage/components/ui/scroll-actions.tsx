'use client'

import { useState, useEffect } from 'react'
import { ArrowUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ScrollActionsProps {
  /** Show the floating "+ New Map" button (default: true) */
  showNewMapButton?: boolean
}

/**
 * Floating action buttons that appear when the user scrolls down:
 * - "Back to top" arrow (appears when scrolled past ~200px)
 * - "+ New Map" button (optional, appears when original button scrolls out of view)
 *
 * Used on Dashboard, About, Terms, and Privacy pages.
 */
export function ScrollActions({ showNewMapButton = true }: ScrollActionsProps) {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showNewMap, setShowNewMap] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      setShowScrollTop(scrollTop > 200)

      if (showNewMapButton) {
        const originalButton = document.querySelector('[data-new-map-button]')
        if (originalButton) {
          const rect = originalButton.getBoundingClientRect()
          const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
          setShowNewMap(!isVisible && scrollTop > 100)
        }
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [showNewMapButton])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {/* Back to Top Button */}
      <Button
        onClick={scrollToTop}
        size="lg"
        variant="default"
        className={`
          h-12 px-4
          shadow-lg hover:shadow-xl
          transition-all duration-300
          ${showScrollTop
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
          }
        `}
        aria-label="Back to top"
      >
        <ArrowUp className="h-4 w-4 mr-2" />
        <span className="font-medium">Back to top</span>
      </Button>

      {/* Floating New Map Button */}
      {showNewMapButton && (
        <Button
          asChild
          size="lg"
          className={`
            h-12 px-4
            shadow-lg hover:shadow-xl
            transition-all duration-300
            ${showNewMap
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 pointer-events-none'
            }
          `}
        >
          <Link href="/?reset=1" aria-label="Create new map">
            <Plus className="h-4 w-4 mr-2" />
            <span className="font-medium">New Map</span>
          </Link>
        </Button>
      )}
    </div>
  )
}
