/**
 * File validation utilities for PEIT web upload
 */

import JSZip from 'jszip'

// Allowed file extensions for geospatial files
export const ALLOWED_EXTENSIONS = [
  '.geojson',
  '.json',
  '.gpkg',
  '.kml',
  '.kmz',
  '.zip', // For shapefiles
] as const

// Maximum file size in bytes (5MB)
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
export const MAX_FILE_SIZE_MB = 5

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Get the file extension from a filename (lowercase)
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot).toLowerCase()
}

/**
 * Check if a file extension is allowed
 */
export function isAllowedExtension(filename: string): boolean {
  const ext = getFileExtension(filename)
  return ALLOWED_EXTENSIONS.includes(ext as typeof ALLOWED_EXTENSIONS[number])
}

/**
 * Validate a file for upload
 * Returns { valid: true } if valid, or { valid: false, error: string } if invalid
 */
export function validateFile(file: File): ValidationResult {
  // Check file extension
  if (!isAllowedExtension(file.name)) {
    const ext = getFileExtension(file.name) || '(none)'
    return {
      valid: false,
      error: `Unsupported file type "${ext}". Please upload a GeoJSON, GeoPackage, KML, or Shapefile (ZIP).`,
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `File too large (${sizeMB}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB.`,
    }
  }

  return { valid: true }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
}

/**
 * Validate that a ZIP file contains shapefile components (.shp)
 * Returns { valid: true } if ZIP contains a .shp file, or an error otherwise.
 */
export async function validateZipContents(file: File): Promise<ValidationResult> {
  try {
    const buffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buffer)
    const filenames = Object.keys(zip.files).map((name) => name.toLowerCase())

    const hasShp = filenames.some((name) => name.endsWith('.shp'))
    const hasShx = filenames.some((name) => name.endsWith('.shx'))
    const hasDbf = filenames.some((name) => name.endsWith('.dbf'))

    if (!hasShp && !hasShx && !hasDbf) {
      return {
        valid: false,
        error: 'ZIP file does not contain a shapefile. Only zipped shapefiles are supported.',
      }
    }

    const missing: string[] = []
    if (!hasShp) missing.push('.shp')
    if (!hasShx) missing.push('.shx')
    if (!hasDbf) missing.push('.dbf')

    if (missing.length > 0) {
      return {
        valid: false,
        error: `Shapefile is incomplete — missing required component${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. A valid shapefile ZIP must contain .shp, .shx, and .dbf files.`,
      }
    }

    return { valid: true }
  } catch {
    return {
      valid: false,
      error: 'Unable to read ZIP file. The file may be corrupted.',
    }
  }
}

/**
 * Get a human-readable description of allowed file types
 */
export function getAllowedTypesDescription(): string {
  return 'GeoJSON, GeoPackage (.gpkg), KML, KMZ, or Shapefile (.zip)'
}
