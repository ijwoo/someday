import exifr from 'exifr'

export async function extractGPS(file: File): Promise<{ lat: number; lng: number } | null> {
  try {
    const gps = await exifr.gps(file)
    return gps ? { lat: gps.latitude, lng: gps.longitude } : null
  } catch {
    return null
  }
}
