import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export const metadata = {
  title: 'About - PEIT Map Creator',
  description: 'Learn how PEIT Map Creator generates interactive environmental maps without requiring ArcGIS Pro.',
}

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

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" asChild className="mb-6">
            <Link href="/?reset=1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">About PEIT Map Creator</h1>
            <p className="text-muted-foreground">
              Interactive environmental mapping — no ArcGIS Pro license required
            </p>
          </div>

          <div className="space-y-8">
            {/* What is PEIT Map Creator? */}
            <section>
              <h2 className="text-xl font-semibold mb-3 pb-2 border-b">What is PEIT Map Creator?</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                PEIT Map Creator (Permitting and Environmental Information Tool) generates interactive
                web maps showing environmental features that intersect with your project area. It queries
                130+ federal and state environmental databases hosted on ArcGIS FeatureServers and
                produces a self-contained HTML map along with PDF and Excel reports.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The tool replicates the functionality of NTIA&apos;s{' '}
                <a
                  href="https://www.ntia.gov/category/appeit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  APPEIT
                </a>{' '}
                without requiring an ArcGIS Pro license, making environmental permitting research
                accessible to anyone with a web browser.
              </p>
            </section>

            {/* How It Works */}
            <section>
              <h2 className="text-xl font-semibold mb-3 pb-2 border-b">How It Works</h2>
              <div className="space-y-8">
                {steps.map(({ step, title, description, file, alt }) => (
                  <div key={step}>
                    <h3 className="font-medium mb-2">
                      Step {step}: {title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-3">{description}</p>
                    <div className="rounded-lg border bg-muted/30 overflow-hidden">
                      {/* GIF placeholder — add file to public/images/about/{file} */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/images/about/${file}`}
                        alt={alt}
                        className="w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Key Features */}
            <section>
              <h2 className="text-xl font-semibold mb-3 pb-2 border-b">Key Features</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
                <li>130+ environmental layers (EPA, USFWS, FEMA, BIA, NPS, USACE, and more)</li>
                <li>Supports GeoJSON, Shapefile, KML/KMZ, GeoPackage, and FileGDB formats</li>
                <li>Draw polygons, lines, or points directly on the map</li>
                <li>Automatic buffering for point and line geometries</li>
                <li>Smart polygon query strategy for accurate intersection results</li>
                <li>Automatic pagination for layers exceeding server feature limits</li>
                <li>PDF and Excel report generation with resource area references</li>
                <li>Download results as GeoJSON, Shapefile, KMZ, or GeoPackage</li>
                <li>Shareable map links with 7-day retention</li>
                <li>Map History dashboard for signed-in users</li>
                <li>Dark mode support</li>
              </ul>
            </section>

            {/* Open Source & Attribution */}
            <section>
              <h2 className="text-xl font-semibold mb-3 pb-2 border-b">Open Source &amp; Attribution</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                PEIT Map Creator is open source. View the code, report issues, or contribute on{' '}
                <a
                  href="https://github.com/lukaskucinski/peit_map_creator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  GitHub
                </a>
                .
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Environmental data is sourced from publicly available U.S. government ArcGIS
                FeatureServers maintained by agencies including the EPA, USFWS, FEMA, BIA, NPS,
                and USACE. This tool does not store or redistribute any government data — it queries
                these services in real time on your behalf.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
