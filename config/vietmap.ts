// Centralized VietMap configuration for styles and API keys
// Reads Expo public env var: EXPO_PUBLIC_VIETMAP_API_KEY

export const vietmapAPIKey: string =
  (typeof process !== 'undefined' && (process as any)?.env?.EXPO_PUBLIC_VIETMAP_API_KEY) || 
  'd6a44263b00bd2ec885ca6378f374da800df69a83efae44c' // Default VietMap API key

type VietmapTheme = 'default' | 'light' | 'dark'
type VietmapStyleType = 'vector' | 'raster'

const themeToCode = (theme: VietmapTheme): 'tm' | 'lm' | 'dm' => {
  switch (theme) {
    case 'default':
      return 'tm'
    case 'dark':
      return 'dm'
    case 'light':
    default:
      return 'lm'
  }
}

// Official Vietmap style endpoints (SDK v6+):
// Vector Default: https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=...
// Vector Light:   https://maps.vietmap.vn/maps/styles/lm/style.json?apikey=...
// Vector Dark:    https://maps.vietmap.vn/maps/styles/dm/style.json?apikey=...
// Raster Default: https://maps.vietmap.vn/maps/styles/tm/tiles.json?apikey=...
// Raster Light:   https://maps.vietmap.vn/maps/styles/lm/tiles.json?apikey=...
// Raster Dark:    https://maps.vietmap.vn/maps/styles/dm/tiles.json?apikey=...
export const vietmapStyleUrl = (theme: VietmapTheme = 'light', type: VietmapStyleType = 'vector') => {
  const code = themeToCode(theme)
  const suffix = type === 'vector' ? 'style.json' : 'tiles.json'
  const base = `https://maps.vietmap.vn/maps/styles/${code}/${suffix}`
  return vietmapAPIKey ? `${base}?apikey=${encodeURIComponent(vietmapAPIKey)}` : base
}

