'use client'

import { useState, useEffect } from 'react'
import { ArrowUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

/**
 * Floating action buttons for Map History page:
 * - "Back to top" arrow (appears when scrolled down past header)
 * - "+ New Map" button (appears when original button not visible)
 *
 * Buttons stack vertically in bottom-right corner with smooth animations.
 * Theme-aware styling for light/dark mode.
 */
export function ScrollActions() {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showNewMap, setShowNewMap] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show "Back to top" when scrolled down enough that header is not visible
      // Threshold: 200px (roughly when page header goes out of view)
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      setShowScrollTop(scrollTop > 200)

      // Show floating "+ New Map" when original button is not visible
      // Check if the original button is in viewport
      const originalButton = document.querySelector('[data-new-map-button]')
      if (originalButton) {
        const rect = originalButton.getBoundingClientRect()
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
        setShowNewMap(!isVisible && scrollTop > 100)
      }
    }

    // Initial check
    handleScroll()

    // Add scroll listener with passive flag for performance
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Cleanup
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
    </div>
  )
}
