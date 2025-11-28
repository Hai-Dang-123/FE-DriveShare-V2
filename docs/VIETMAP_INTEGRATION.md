# VietMap Integration - DriveShare v1

## Tổng Quan

Dự án đã tích hợp đầy đủ các tính năng từ VietMap React Native và VietMap React Native Expo bao gồm:

- **RouteSimulator**: Mô phỏng di chuyển dọc tuyến đường
- **PulseCircleLayer**: Hiệu ứng pulse animation cho marker
- **NavigationHUD**: Giao diện hiển thị thông tin điều hướng
- **Navigation Mode**: Chế độ điều hướng với camera follow user
- **Progress Line**: Hiển thị tiến độ di chuyển trên route

## Cấu Trúc Thư Mục

```
components/map/
├── VietMapGLWrapper.tsx      # Wrapper cho VietMap GL native module
├── RouteMap.tsx              # Platform-agnostic route map component
├── NativeRouteMap.tsx        # Native implementation với navigation
├── WebRouteMap.web.tsx       # Web implementation với MapLibre GL
├── RouteLayer.tsx            # Layer hiển thị route và progress
├── PulseCircleLayer.tsx      # Animation pulse cho marker
├── NavigationHUD.tsx         # HUD hiển thị thông tin navigation
└── index.ts                  # Exports

utils/
├── RouteSimulator.ts         # Class mô phỏng di chuyển dọc route
├── polyline.ts               # Decode polyline encoding
├── map.ts                    # Map utilities (bounds, center, padding)
└── navigation.ts             # Navigation helpers
```

## Cài Đặt Dependencies

Đã cài đặt:
- `@turf/along` - Tính điểm tại khoảng cách trên LineString
- `@turf/distance` - Tính khoảng cách giữa 2 điểm
- `@turf/helpers` - Helper functions cho GeoJSON

## Sử Dụng

### 1. Basic Route Display

```tsx
import { RouteMap } from '@/components/map'

<RouteMap
  routeData={encodedPolyline}
  coordinates={[[lng, lat], ...]} // Hoặc dùng coordinates thay polyline
  showUserLocation={true}
  style={{ height: 400 }}
/>
```

### 2. Navigation Mode với Progress

```tsx
import { RouteMap } from '@/components/map'
import { RouteSimulator } from '@/utils/RouteSimulator'
import { toGeoJSONLineFeature } from '@/utils/polyline'

const [navigationActive, setNavigationActive] = useState(false)
const [progressFeature, setProgressFeature] = useState(null)
const [currentPoint, setCurrentPoint] = useState(null)

useEffect(() => {
  if (!navigationActive || !routeCoords) return
  
  const routeFeature = toGeoJSONLineFeature(routeCoords)
  const simulator = new RouteSimulator(routeFeature, 0.04)
  
  simulator.addListener((point) => {
    setCurrentPoint(point)
    
    // Tạo progress line từ điểm đầu đến điểm hiện tại
    const { nearestIndex } = point.properties
    const progressCoords = routeCoords
      .filter((_, i) => i <= nearestIndex)
      .concat([point.geometry.coordinates])
    
    if (progressCoords.length >= 2) {
      setProgressFeature(toGeoJSONLineFeature(progressCoords))
    }
  })
  
  simulator.start()
  return () => simulator.stop()
}, [navigationActive, routeCoords])

<RouteMap
  coordinates={routeCoords}
  navigationActive={navigationActive}
  followUserLocation={navigationActive}
  progressFeature={progressFeature}
  pulseMarker={currentPoint?.geometry.coordinates}
  onUserTrackingModeChange={(following) => {
    if (!following) setNavigationActive(false)
  }}
  style={{ height: 400 }}
/>
```

### 3. Navigation HUD

```tsx
import { NavigationHUD } from '@/components/map'

<View>
  <NavigationHUD
    eta="10:45 AM"
    remainingDistance="3.2 km"
    currentSpeed="45 km/h"
    nextInstruction="Rẽ phải tại ngã tư tiếp theo"
    distanceToNextInstruction="200m"
    visible={navigationActive}
  />
  <RouteMap {...props} />
</View>
```

### 4. Custom Pulse Marker

```tsx
import { PulseCircleLayer } from '@/components/map'
import VietMapGLWrapper from '@/components/map/VietMapGLWrapper'

const { MapView, Camera } = VietMapGLWrapper

<MapView style={{ flex: 1 }}>
  <Camera ... />
  <PulseCircleLayer
    shape={{ type: 'Point', coordinates: [lng, lat] }}
    radius={8}
    pulseRadius={24}
    duration={1200}
    aboveLayerID="routeLine"
  />
</MapView>
```

## Props Reference

### RouteMap

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `routeData` | `string` | - | Encoded polyline string |
| `coordinates` | `[number, number][]` | - | Route coordinates [lng, lat] |
| `navigationActive` | `boolean` | `false` | Bật chế độ navigation |
| `followUserLocation` | `boolean` | `false` | Camera theo user location |
| `followZoomLevel` | `number` | `17` / `19` (nav) | Zoom level khi follow |
| `followPitch` | `number` | `55` / `60` (nav) | Camera pitch (3D tilt) |
| `followBearing` | `number` | - | Camera bearing (rotation) |
| `progressFeature` | `Feature<LineString>` | - | Progress line feature |
| `pulseMarker` | `[number, number]` | - | Vị trí pulse marker |
| `showUserLocation` | `boolean` | `false` | Hiển thị user location |
| `userMarkerPosition` | `[number, number]` | - | Custom user marker |
| `userMarkerBearing` | `number` | - | Bearing của user marker |
| `startMarker` | `[number, number]` | - | Marker điểm đầu |
| `endMarker` | `[number, number]` | - | Marker điểm cuối |
| `showOverviewMarkers` | `boolean` | `false` | Hiện markers A/B |
| `onUserTrackingModeChange` | `(following: boolean) => void` | - | Callback khi user tắt follow |

### NavigationHUD

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `eta` | `string` | `'--:--'` | Thời gian đến dự kiến |
| `remainingDistance` | `string` | `'-- km'` | Khoảng cách còn lại |
| `currentSpeed` | `string` | - | Tốc độ hiện tại |
| `nextInstruction` | `string` | - | Hướng dẫn bước tiếp theo |
| `distanceToNextInstruction` | `string` | - | Khoảng cách đến bước tiếp |
| `visible` | `boolean` | `true` | Hiển thị HUD |

### RouteSimulator

```typescript
const simulator = new RouteSimulator(
  lineStringFeature: Feature<LineString>,
  speed?: number = 0.04 // km per tick
)

simulator.addListener((point: Feature<Point>) => {
  // point.properties.distance: khoảng cách đã đi (km)
  // point.properties.nearestIndex: index gần nhất trên route
  // point.geometry.coordinates: [lng, lat]
})

simulator.start()   // Bắt đầu simulation
simulator.stop()    // Dừng
simulator.reset()   // Reset về đầu
```

## Advanced Usage

### Snap GPS Location to Route

Để snap vị trí GPS thực vào route (chưa implement trong core):

```typescript
import nearestPointOnLine from '@turf/nearest-point-on-line'

const snapToRoute = (
  userLocation: [number, number],
  routeFeature: Feature<LineString>
) => {
  const point = { type: 'Point', coordinates: userLocation }
  const snapped = nearestPointOnLine(routeFeature, point)
  
  return {
    location: snapped.geometry.coordinates,
    distance: snapped.properties.location // Distance along line
  }
}
```

### Calculate ETA

```typescript
const calculateETA = (
  remainingDistance: number, // km
  currentSpeed: number // km/h
) => {
  if (!currentSpeed || currentSpeed < 1) return null
  
  const hours = remainingDistance / currentSpeed
  const now = new Date()
  const eta = new Date(now.getTime() + hours * 3600000)
  
  return eta.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
```

### Off-Route Detection

```typescript
import distance from '@turf/distance'

const isOffRoute = (
  userLocation: [number, number],
  snappedLocation: [number, number],
  threshold: number = 0.1 // km
) => {
  const dist = distance(userLocation, snappedLocation, { units: 'kilometers' })
  return dist > threshold
}
```

## Migration từ Code Cũ

### Thay thế Static Map Component

**Trước (Map.tsx - ĐÃ XÓA):**
```tsx
import Map from '@/components/Map'
<Map showRoute={true} />
```

**Sau:**
```tsx
import { RouteMap } from '@/components/map'
<RouteMap routeData={polylineData} />
```

### VietMapWrapper

Component `VietMapWrapper` được giữ lại cho việc tích hợp navigation controller trong tương lai. Hiện tại chưa cần dùng trong app.

## Performance Tips

1. **RouteSimulator Speed**: Điều chỉnh `speed` parameter phù hợp:
   - `0.02` - chậm (demo, testing)
   - `0.04` - vừa phải (default)
   - `0.08` - nhanh (replay nhanh)

2. **Progress Line**: Chỉ cập nhật khi `nearestIndex` thay đổi để tránh re-render không cần thiết

3. **Pulse Animation**: Giảm `duration` hoặc tắt pulse khi không cần để tiết kiệm battery

4. **Web MapLibre**: Tự động fallback sang OSM nếu VietMap API key không hợp lệ

## Troubleshooting

### "VietMap native SDK không khả dụng trong Expo Go"

- Chạy với Expo Dev Client hoặc build native
- Web sẽ tự động dùng MapLibre GL JS

### Route không hiển thị

- Kiểm tra `routeData` hoặc `coordinates` có đúng format
- Verify API key VietMap trong config
- Check console logs

### Camera không follow user

- Đảm bảo `followUserLocation={true}`
- Request location permissions
- Set `navigationActive={true}` cho navigation mode

## Security

✅ Tất cả các file mới đã pass Snyk Code scan:
- `RouteSimulator.ts`
- `PulseCircleLayer.tsx`
- `NavigationHUD.tsx`
- `RouteLayer.tsx`
- `NativeRouteMap.tsx`

## License & Credits

- VietMap GL React Native: https://github.com/vietmap-company/vietmap-gl-react-native
- Turf.js: https://turfjs.org
- MapLibre GL JS: https://maplibre.org
