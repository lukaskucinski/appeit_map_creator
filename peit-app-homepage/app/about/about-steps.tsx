'use client'

import { ImageLightbox } from '@/components/image-lightbox'

const steps = [
  {
    step: 1,
    title: 'Upload Your File',
    description: 'Drag and drop a geospatial file (GeoJSON, Shapefile, KML/KMZ, GeoPackage, or FileGDB) onto the upload area.',
    file: 'upload.gif',
    alt: 'Demonstration of uploading a geospatial file',
  },
  {
    step: 2,
    title: 'Draw Your Own Geometry',
    description: 'No file? Draw polygons, lines, or points directly on an interactive map using the built-in drawing tools.',
    file: 'draw.gif',
    alt: 'Drawing custom geometry on the interactive map',
  },
  {
    step: 3,
    title: 'Configure and Process',
    description: 'Set your project name, buffer distance, and clip radius, then hit Run to start querying 130+ environmental layers.',
    file: 'processing.gif',
    alt: 'Processing progress screen with layer-by-layer updates',
  },
  {
    step: 4,
    title: 'Results Ready',
    description: 'When processing completes, view your live map, download a ZIP package, or grab the PDF and Excel reports directly.',
    file: 'complete.gif',
    alt: 'Completion card with download and share options',
  },
  {
    step: 5,
    title: 'Explore Your Map',
    description: 'Interactive Leaflet map with grouped layer controls, searchable legend, popups with resource area links, and multiple basemaps.',
    file: 'map.gif',
    alt: 'Interactive map showing environmental layers and controls',
  },
  {
    step: 6,
    title: 'Navigate and Analyze',
    description: 'Toggle layers, search by name, measure distances, download individual layers in multiple formats, and right-click to copy coordinates.',
    file: 'navigation.gif',
    alt: 'Map navigation including layer toggling and measurement tools',
  },
  {
    step: 7,
    title: 'Map History',
    description: 'Sign in to save your maps. The Map History dashboard shows your recent runs with quick access to maps, reports, and downloads.',
    file: 'history.gif',
    alt: 'Map History dashboard showing recent map runs',
  },
]

export function AboutSteps() {
  return (
    <ImageLightbox
      images={steps.map(({ file, alt, step, title }) => ({
        src: `/images/about/${file}`,
        alt,
        caption: `Step ${step}: ${title}`,
      }))}
    >
      {(openImage) =>
        steps.map(({ step, title, description, file, alt }, i) => (
          <div key={step}>
            <h3 className="font-medium mb-2">
              Step {step}: {title}
            </h3>
            <p className="text-muted-foreground text-sm mb-3">{description}</p>
            <div
              className="rounded-lg border bg-muted/30 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-shadow"
              onClick={() => openImage(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openImage(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/images/about/${file}`}
                alt={alt}
                className="w-full object-contain"
                loading="lazy"
              />
            </div>
          </div>
        ))
      }
    </ImageLightbox>
  )
}
