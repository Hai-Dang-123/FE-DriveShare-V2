# VietMap React Native Examples - Comprehensive Analysis

## Document Overview
This document provides a detailed analysis of all VietMap GL React Native examples and their integration potential into the DriveShare project.

---

## 1. ANIMATIONS CATEGORY

### 1.1 AnimateCircleAlongLine
**Purpose**: Animate a circular marker along a route line with progress tracking

**Key Features**:
- Uses `RouteSimulator` utility to simulate movement along LineString
- Implements `PulseCircleLayer` for animated marker
- Renders progress line showing completed portion
- Uses GeoJSON Feature with properties (distance, nearestIndex)

**Technical Components**:
```typescript
- Animated.ShapeSource with LineString
- RouteSimulator class for position updates
- Progress line rendering with coordinate filtering
- Animated.LineLayer with gradient styling
```

**Integration for DriveShare**:
- ✅ **DriverTripDetailScreen**: Animate driver position along route
- ✅ **TripDetailScreen**: Show real-time vehicle movement
- ✅ Use for simulating trip progress in testing mode
- ✅ Enhance NavigationHUD with progress visualization

**Priority**: HIGH - Directly applicable to navigation tracking

---

### 1.2 AnimatedLine
**Purpose**: Advanced line animation with morphing capabilities

**Key Features**:
- `Animated.RouteCoordinatesArray` for route data
- `Animated.CoordinatesArray` for shape morphing
- `Animated.ExtractCoordinateFromArray` for point extraction
- Timing-based animations with Easing functions
- Support for route morphing (changing number of points)

**Technical Components**:
```typescript
- Animated.Shape with LineString coordinates
- Animated.LineLayer for route rendering
- Animated.CircleLayer for current position marker
- Animation timing with duration/easing control
```

**Integration for DriveShare**:
- ⚠️ **Medium Priority**: Advanced animation features
- Use for route updates when driver deviates
- Animate route changes when rerouting occurs
- Show alternative route transitions

**Priority**: MEDIUM - Useful for advanced route visualization

---

## 2. ANNOTATIONS CATEGORY

### 2.1 CustomCallout
**Purpose**: Display custom callout/popup when user taps map features

**Key Features**:
- `ShapeSource.onPress` event handling
- `MarkerView` for custom React Native components
- Anchor positioning (x: 0.5, y: -1.1 for above marker)
- Feature property access in callbacks

**Technical Components**:
```typescript
- ShapeSource with FeatureCollection
- SymbolLayer for icon display
- MarkerView for custom UI components
- Event handling with feature selection
```

**Integration for DriveShare**:
- ✅ **TripDetailScreen**: Show pickup/dropoff location details
- ✅ **OwnerPostsScreen**: Display vehicle location info
- ✅ Show driver/vehicle info on map tap
- ✅ Display trip waypoint details

**Priority**: HIGH - Essential for interactive map features

---

### 2.2 Heatmap
**Purpose**: Visualize data density using heatmap visualization

**Key Features**:
- `HeatmapLayer` with color interpolation
- Remote GeoJSON URL loading
- Gradient color expressions
- Density-based visualization

**Technical Components**:
```typescript
- ShapeSource with remote URL
- HeatmapLayer with style expressions
- Color interpolation based on heatmap-density
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: Optional feature
- Show popular pickup/dropoff zones
- Visualize driver availability density
- Display high-demand areas for owners

**Priority**: LOW - Nice-to-have analytics feature

---

### 2.3 MarkerView
**Purpose**: Add React Native component-based markers to map

**Key Features**:
- `MarkerView` vs `PointAnnotation` comparison
- Custom React components as markers
- Full React Native styling support
- Touch event handling on markers

**Technical Components**:
```typescript
- MarkerView with coordinate prop
- PointAnnotation for comparison
- Custom styled components
- TouchableOpacity integration
```

**Integration for DriveShare**:
- ✅ **HIGH PRIORITY**: Replace simple markers with rich UI
- Show driver avatar as marker
- Display vehicle icons at locations
- Custom pickup/dropoff markers with info

**Priority**: HIGH - Better UX than simple icons

---

### 2.4 PointAnnotationAnchors
**Purpose**: Demonstrate anchor positioning for point annotations

**Key Features**:
- Anchor point control (x, y from 0-1)
- Visual demonstration of anchor behavior
- Multiple annotation positioning examples
- Container style customization

**Technical Components**:
```typescript
- PointAnnotation with anchor prop
- View styling for annotation content
- Position alignment strategies
```

**Integration for DriveShare**:
- ✅ **Medium Priority**: Fine-tune marker positioning
- Ensure pickup markers point correctly
- Align vehicle icons properly
- Position info bubbles relative to markers

**Priority**: MEDIUM - Improves visual alignment

---

### 2.5 ShowPointAnnotation
**Purpose**: Interactive point annotation with drag support

**Key Features**:
- Draggable annotations
- Remote image loading in annotations
- Callout component integration
- Event callbacks (onSelected, onDrag, onDragStart, onDragEnd)
- Layer rendering order control (above/below polygon)

**Technical Components**:
```typescript
- PointAnnotation with draggable prop
- Image.onLoad callback for refresh
- Callout component
- FillLayer with aboveLayerID/belowLayerID
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: Drag functionality not needed
- Use callouts for marker info display
- Learn image loading patterns
- Understand layer ordering

**Priority**: LOW - Drag not needed, but callout patterns useful

---

## 3. CAMERA CATEGORY

### 3.1 CompassView
**Purpose**: Display compass control with heading rotation

**Key Features**:
- `compassEnabled` prop
- `compassViewPosition` for placement
- `Camera.heading` for rotation
- Compass UI customization

**Technical Components**:
```typescript
- MapView with compassEnabled
- Camera heading control
- Compass position (0-3 for corners)
```

**Integration for DriveShare**:
- ✅ **Medium Priority**: Useful for navigation
- Show compass during navigation
- Help users orient map
- Combine with heading tracking

**Priority**: MEDIUM - Enhances navigation UX

---

### 3.2 Fit
**Purpose**: Advanced camera positioning with bounds, center, zoom

**Key Features**:
- `Camera.bounds` for region fitting
- `Camera.centerCoordinate` for centering
- `Camera.zoomLevel` control
- `Camera.followUserLocation` toggle
- `Camera.padding` for UI insets
- Imperative camera methods (flyTo, zoomTo)

**Technical Components**:
```typescript
- Camera with declarative props
- camera.flyTo() imperative method
- camera.zoomTo() imperative method
- Padding configuration
- Animation mode/duration control
```

**Integration for DriveShare**:
- ✅ **CRITICAL**: Core camera control patterns
- Fit route bounds in DriverTripDetailScreen
- Center on pickup/dropoff locations
- Zoom to show entire trip route
- Apply padding for NavigationHUD

**Priority**: CRITICAL - Essential for proper map framing

**Already Partially Implemented**:
- ✅ Current project uses followUserLocation
- ✅ Has zoom/pitch settings
- ⚠️ Missing bounds fitting for full route
- ⚠️ Missing padding optimization

---

### 3.3 FlyTo
**Purpose**: Smooth animated camera transitions

**Key Features**:
- `animationMode="flyTo"` for smooth transitions
- `animationDuration` control
- `onFlyToComplete` callback
- Coordinate-based navigation

**Technical Components**:
```typescript
- Camera with animationMode prop
- Duration-based animations
- Completion callbacks
```

**Integration for DriveShare**:
- ✅ **High Priority**: Smooth transitions
- Fly to pickup location when starting trip
- Fly to delivery location when picked up
- Smooth transition between waypoints

**Priority**: HIGH - Improves navigation flow

---

### 3.4 GetCenter & GetZoom
**Purpose**: Retrieve current map center and zoom level

**Key Features**:
- `mapView.getCenter()` async method
- `mapView.getZoom()` async method
- `onRegionDidChange` event for updates
- State management for camera info

**Technical Components**:
```typescript
- MapViewRef with async methods
- Region change callbacks
- useState for tracking values
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: Mostly for debugging
- Log camera state for analytics
- Debug navigation issues
- Track user map interactions

**Priority**: LOW - Useful for debugging only

---

### 3.5 RestrictMapBounds
**Purpose**: Limit map panning to specific geographic bounds

**Key Features**:
- `Camera.maxBounds` prop
- Visual bounds indicator with polygon
- Prevents panning outside region

**Technical Components**:
```typescript
- Camera with maxBounds
- ShapeSource + FillLayer for visual bounds
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: Not needed for trip navigation
- Could restrict to Vietnam region
- Prevent accidental panning during navigation

**Priority**: LOW - Not essential for use case

---

### 3.6 SetHeading & SetPitch
**Purpose**: Control camera heading (rotation) and pitch (tilt)

**Key Features**:
- `Camera.heading` for compass bearing (0-360°)
- `Camera.followPitch` for tilt angle (0-60°)
- Dynamic updates with state management
- TabBar UI for testing values

**Technical Components**:
```typescript
- Camera heading/pitch props
- LocationManager for tracking
- UserLocation component integration
```

**Integration for DriveShare**:
- ✅ **ALREADY IMPLEMENTED**: Current project uses:
  - `followPitch={65}` in DriverTripDetailScreen
  - Heading from userBearing state
- ✅ Values optimized in recent fixes

**Priority**: IMPLEMENTED - Already using optimal values

---

### 3.7 TakeSnapshot & TakeSnapshotWithMap
**Purpose**: Capture map as static image

**Key Features**:
- `SnapshotManager.takeSnap()` for full-screen capture
- `mapView.takeSnap()` for specific map view
- Configuration options (center, zoom, pitch, heading)
- Write to disk capability

**Technical Components**:
```typescript
- SnapshotManager for standalone snapshots
- MapView.takeSnap() for in-app capture
- Dimensions API for sizing
- Image component for display
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: Optional feature
- Capture trip route for sharing
- Save trip completion screenshot
- Generate preview images for posts

**Priority**: LOW - Nice-to-have social feature

---

### 3.8 YoYo
**Purpose**: Demonstrate continuous camera zoom animation

**Key Features**:
- Loop animation with requestAnimationFrame
- State-based zoom level toggling
- Timeout-based animation scheduling

**Technical Components**:
```typescript
- useEffect for animation loop
- setState for zoom updates
- setTimeout for timing
```

**Integration for DriveShare**:
- ❌ **Not Applicable**: No use case for continuous zoom
- Pattern useful for other animations

**Priority**: NOT APPLICABLE

---

## 4. FILL RASTER LAYER CATEGORY

### 4.1 CustomVectorSource
**Purpose**: Load vector tiles from custom tile server

**Key Features**:
- `VectorSource` with URL endpoint
- `FillLayer` with sourceLayerID
- Feature querying with `vectorSource.features()`
- Click event handling

**Technical Components**:
```typescript
- VectorSource with tile URL
- FillLayer for polygon rendering
- Ref-based feature querying
- Event handling
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: VietMap provides vector tiles
- Could add administrative boundaries
- Display traffic zones
- Show restricted areas

**Priority**: LOW - VietMap already provides base layers

---

### 4.2 GeoJSONSource
**Purpose**: Render GeoJSON features (local or remote)

**Key Features**:
- `ShapeSource` with GeoJSON FeatureCollection
- `FillLayer` for polygon rendering
- `BackgroundLayer` with pattern
- Local JSON import support

**Technical Components**:
```typescript
- ShapeSource with shape prop
- FillLayer styling
- BackgroundLayer for textures
- Local asset imports
```

**Integration for DriveShare**:
- ✅ **ALREADY USING**: Current project has:
  - Route rendering with LineString
  - Progress line with coordinate filtering
- ✅ Could add:
  - Service area polygons
  - Delivery zones
  - Restricted areas

**Priority**: MEDIUM - Extend current usage

---

### 4.3 ImageOverlay
**Purpose**: Display animated raster images on map

**Key Features**:
- `ImageSource` with corner coordinates
- Frame-based animation
- `RasterLayer` for image rendering
- Opacity control

**Technical Components**:
```typescript
- ImageSource with coordinates array
- RasterLayer styling
- useEffect animation loop
- Image URL updates
```

**Integration for DriveShare**:
- ❌ **Not Applicable**: No weather/radar data needed
- Could show traffic heatmap overlays
- Display service coverage areas

**Priority**: NOT APPLICABLE

---

### 4.4 IndoorBuilding
**Purpose**: 3D building visualization with extrusion

**Key Features**:
- `FillExtrusionLayer` for 3D rendering
- `Light` component for lighting control
- Height/base properties from GeoJSON
- Color transitions

**Technical Components**:
```typescript
- FillExtrusionLayer with height expressions
- Light with position control
- GeoJSON properties (height, base_height, color)
- Color transitions
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: 3D visualization
- Show 3D buildings during navigation
- Enhance visual context
- Premium visual feature

**Priority**: LOW - Nice visual enhancement

---

### 4.5 OpenStreetMapRasterTiles
**Purpose**: Load OSM raster tiles as fallback

**Key Features**:
- `RasterSource` with tile URL template
- `RasterLayer` with opacity control
- TabBar for opacity testing

**Technical Components**:
```typescript
- RasterSource with tileUrlTemplates
- RasterLayer with rasterOpacity
- Tile attribution
```

**Integration for DriveShare**:
- ⚠️ **Already Handled**: VietMap has OSM fallback
- Current fix set proper API key to prevent fallback
- Keep as emergency backup

**Priority**: LOW - Backup only

---

### 4.6 QueryAtPoint & QueryWithRect
**Purpose**: Query rendered map features at location or in rectangle

**Key Features**:
- `mapView.queryRenderedFeaturesAtPoint()` for single point
- `mapView.queryRenderedFeaturesInRect()` for area
- Filter by layer IDs
- Feature highlighting

**Technical Components**:
```typescript
- MapView onPress event
- queryRenderedFeaturesAtPoint() method
- queryRenderedFeaturesInRect() method
- Layer ID filtering
- Feature state management
```

**Integration for DriveShare**:
- ✅ **Medium Priority**: Interactive features
- Tap pickup location on map to confirm
- Query delivery addresses
- Select from multiple nearby locations

**Priority**: MEDIUM - Enhances location selection

---

## 5. LINE LAYER CATEGORY

### 5.1 GradientLine
**Purpose**: Render line with gradient color

**Key Features**:
- `ShapeSource.lineMetrics` enabled
- `LineLayer` with lineGradient expression
- Interpolate expression for color stops
- line-progress for gradient positioning

**Technical Components**:
```typescript
- ShapeSource with lineMetrics={true}
- LineLayer with lineGradient
- Interpolate expression
- Color stop array
```

**Integration for DriveShare**:
- ✅ **High Priority**: Visual route enhancement
- Show route progress with gradient
- Different colors for completed/remaining
- Indicate speed zones or traffic

**Priority**: HIGH - Better than solid progress line

---

## 6. MAP CATEGORY

### 6.1 ChangeLayerColor
**Purpose**: Dynamically update layer colors

**Key Features**:
- `BackgroundLayer` with dynamic backgroundColor
- State-based style updates
- Press to change demo

**Technical Components**:
```typescript
- BackgroundLayer with style prop
- setState for color updates
- Conditional rendering
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: Theme switching
- Day/night mode for navigation
- Color-code trip status

**Priority**: LOW - Theme feature

---

### 6.2 CreateOfflineRegion
**Purpose**: Download map tiles for offline use

**Key Features**:
- `OfflineManager.createPack()` for downloading
- `OfflinePack` status tracking
- Resume/pause/delete operations
- Progress callbacks

**Technical Components**:
```typescript
- OfflineManager API
- Pack creation with bounds/zoom
- Status monitoring
- Progress events
```

**Integration for DriveShare**:
- ⚠️ **Medium Priority**: Offline capability
- Pre-download route area
- Work in poor connectivity
- Save data during trips

**Priority**: MEDIUM - Useful for reliability

---

### 6.3 LocalStyleJSON
**Purpose**: Use local style JSON instead of remote

**Key Features**:
- Import local JSON style files
- Switch between styles dynamically
- No network dependency for style

**Technical Components**:
```typescript
- Local JSON imports
- MapView mapStyle prop
- Dynamic style switching
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: Custom styling
- Branded map style
- Offline style availability
- Custom theme

**Priority**: LOW - VietMap styles sufficient

---

### 6.4 PointInMapView
**Purpose**: Convert geographic coordinates to screen pixels

**Key Features**:
- `mapView.getPointInView()` method
- Coordinate to pixel conversion
- Useful for custom overlays

**Technical Components**:
```typescript
- MapView.getPointInView() async method
- Coordinate input
- Pixel [x, y] output
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: Advanced UI positioning
- Position custom UI relative to markers
- Calculate screen distances
- Advanced overlay positioning

**Priority**: LOW - Advanced use case

---

### 6.5 ShowAndHideLayer
**Purpose**: Toggle layer visibility

**Key Features**:
- Layer style `visibility: 'visible' | 'none'`
- Dynamic layer toggling
- Existing layer modification

**Technical Components**:
```typescript
- Layer style visibility property
- State-based conditional rendering
```

**Integration for DriveShare**:
- ✅ **Medium Priority**: Layer control
- Toggle traffic layer
- Show/hide alternative routes
- Display points of interest

**Priority**: MEDIUM - Useful for complex maps

---

### 6.6 ShowClick & ShowRegionDidChange
**Purpose**: Handle map interaction events

**Key Features**:
- `MapView.onPress` for tap events
- `onRegionDidChange/WillChange/IsChanging` for camera
- Event properties (coordinates, screen points)
- Region bounds tracking

**Technical Components**:
```typescript
- onPress event handler
- Region change callbacks
- Event payload access
- Geometry extraction
```

**Integration for DriveShare**:
- ✅ **ALREADY PARTIALLY IMPLEMENTED**
- Enhance with region tracking
- Log user interactions
- Debug camera behavior

**Priority**: MEDIUM - Enhance existing

---

### 6.7 ShowMap
**Purpose**: Basic map display with VietMap style

**Key Features**:
- Minimal MapView setup
- VietMap style URL
- Essential configuration

**Technical Components**:
```typescript
- MapView with mapStyle
- vietmapStyle URL
```

**Integration for DriveShare**:
- ✅ **ALREADY IMPLEMENTED**: Base pattern in use

**Priority**: IMPLEMENTED

---

### 6.8 SourceLayerVisibility
**Purpose**: Toggle visibility of specific source layers

**Key Features**:
- `mapView.setSourceVisibility()` method
- Control source layer rendering
- Dynamic layer toggling

**Technical Components**:
```typescript
- MapView.setSourceVisibility()
- Source ID and layer ID parameters
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: Advanced layer control
- Filter POI categories
- Show/hide building layers
- Customize map density

**Priority**: LOW - Advanced customization

---

### 6.9 SetTintColor
**Purpose**: Change map UI element colors

**Key Features**:
- `MapView.tintColor` prop
- Affects user location marker
- Dynamic color updates

**Technical Components**:
```typescript
- tintColor prop
- Color string values
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: Theme matching
- Match brand colors
- Status-based coloring

**Priority**: LOW - Minor visual customization

---

### 6.10 TwoMapViews
**Purpose**: Multiple map instances in one screen

**Key Features**:
- Multiple MapView components
- Independent styles
- Layout management

**Technical Components**:
```typescript
- Multiple MapView instances
- Flex layout
- Independent configurations
```

**Integration for DriveShare**:
- ❌ **Not Applicable**: Single map sufficient

**Priority**: NOT APPLICABLE

---

## 7. SYMBOL CIRCLE LAYER CATEGORY

### 7.1 CustomIcon
**Purpose**: Add custom icons at tap locations

**Key Features**:
- Local image assets for icons
- SymbolLayer with iconImage
- Dynamic feature collection updates
- Tap to add markers

**Technical Components**:
```typescript
- Image imports (require())
- SymbolLayer style with iconImage
- ShapeSource with dynamic shape
- FeatureCollection state management
```

**Integration for DriveShare**:
- ✅ **High Priority**: Custom markers
- Vehicle type icons
- Pickup/dropoff icons
- Driver avatar markers
- Package type indicators

**Priority**: HIGH - Better than default markers

---

### 7.2 DataDrivenCircleColors
**Purpose**: Style circles based on feature properties

**Key Features**:
- Data-driven styling with expressions
- Match expressions for categorical data
- Interpolate for continuous values
- Property-based colors

**Technical Components**:
```typescript
- CircleLayer with match expressions
- Property getters ['get', 'property']
- Color arrays for categories
- VectorSource for data
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: Advanced visualization
- Color-code vehicles by type
- Show trip status with colors
- Visualize package priorities

**Priority**: LOW - Simple icons sufficient

---

### 7.3 Earthquakes (Clustering)
**Purpose**: Cluster large numbers of point features

**Key Features**:
- `ShapeSource.cluster` enabled
- `clusterRadius` configuration
- `clusterProperties` for aggregation
- Cluster expansion with `getClusterLeaves()`
- Count display with SymbolLayer

**Technical Components**:
```typescript
- ShapeSource with cluster props
- clusterProperties for aggregation
- CircleLayer for clusters
- SymbolLayer for count text
- getClusterLeaves() for expansion
```

**Integration for DriveShare**:
- ✅ **Medium Priority**: Handle many markers
- Cluster available vehicles
- Group nearby packages
- Aggregate delivery locations

**Priority**: MEDIUM - Useful for dense data

---

### 7.4 ShapeSourceIcon
**Purpose**: Use Images component for icon management

**Key Features**:
- `Images` component for registration
- `onImageMissing` callback for lazy loading
- Property-based icon selection
- Dynamic icon registration

**Technical Components**:
```typescript
- Images component with images object
- onImageMissing callback
- SymbolLayer with iconImage expression
- Dynamic image loading
```

**Integration for DriveShare**:
- ✅ **High Priority**: Efficient icon management
- Register vehicle type icons
- Load driver avatars dynamically
- Cache marker images

**Priority**: HIGH - Better performance

---

## 8. USER LOCATION CATEGORY

### 8.1 FollowUserLocationRenderMode
**Purpose**: Different rendering modes for user location

**Key Features**:
- `UserLocation` component
- `renderMode`: normal | native
- `androidRenderMode`: normal | compass | gps
- `showsUserHeadingIndicator`
- Custom children (CircleLayer)
- Camera follow modes

**Technical Components**:
```typescript
- UserLocation component
- UserLocationRenderMode enum
- Custom CircleLayer children
- Camera.followUserLocation
- Camera.followUserMode
```

**Integration for DriveShare**:
- ✅ **ALREADY IMPLEMENTED**: Using native mode
- ✅ Current: renderMode="native", androidRenderMode="compass"
- Consider: Custom CircleLayer for branded marker

**Priority**: IMPLEMENTED - Consider custom children

---

### 8.2 FollowUserLocationAlignment
**Purpose**: Position user location with content insets

**Key Features**:
- `MapView.contentInset` for UI padding
- Alignment presets (top, center, bottom)
- Camera follows with offset

**Technical Components**:
```typescript
- contentInset array [top, right, bottom, left]
- Camera.followUserLocation
- Dynamic inset updates
```

**Integration for DriveShare**:
- ✅ **ALREADY IMPLEMENTED**: Using [150, 0, 120, 0]
- ✅ Recent fix optimized insets for NavigationHUD

**Priority**: IMPLEMENTED - Already optimized

---

### 8.3 UserLocationForNavigation
**Purpose**: Navigation-specific user location setup

**Key Features**:
- Navigation mode toggle
- Content inset when active
- Custom navigation icon
- Pitch control
- SymbolLayer for vehicle icon

**Technical Components**:
```typescript
- Navigation state toggle
- contentInset for navigation
- SymbolLayer with iconPitchAlignment="map"
- UserLocation with custom children
- Camera pitch/zoom for navigation
```

**Integration for DriveShare**:
- ✅ **HIGHLY RELEVANT**: Similar to current implementation
- ✅ Current setup uses navigation patterns
- Could add: Vehicle icon instead of default marker
- Could add: Toggle navigation mode

**Priority**: HIGH - Enhance current navigation

---

### 8.4 SetAndroidPreferredFramesPerSecond
**Purpose**: Control Android location animation FPS

**Key Features**:
- `UserLocation.androidPreferredFramesPerSecond`
- FPS options: 5, 10, 15, etc.
- Affects animation smoothness
- Battery/performance tradeoff

**Technical Components**:
```typescript
- androidPreferredFramesPerSecond prop
- LocationManager integration
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: Performance tuning
- Default likely sufficient
- Optimize battery for long trips

**Priority**: LOW - Default sufficient

---

### 8.5 UserLocationDisplacement
**Purpose**: Minimum movement threshold for location updates

**Key Features**:
- `UserLocation.minDisplacement` (meters)
- Reduces GPS jitter
- Saves battery
- Options: 0, 5, 10 meters

**Technical Components**:
```typescript
- minDisplacement prop
- LocationManager configuration
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: Fine-tuning
- Default (0) for smooth navigation
- Higher value for stationary tracking

**Priority**: LOW - Default appropriate

---

### 8.6 UserLocationUpdate
**Purpose**: Handle location update callbacks

**Key Features**:
- `UserLocation.onUpdate` callback
- Location object with coords
- Timestamp, accuracy, speed, heading
- Real-time position tracking

**Technical Components**:
```typescript
- onUpdate callback
- Location type with properties
- Coordinate extraction
```

**Integration for DriveShare**:
- ✅ **ALREADY IMPLEMENTED**: Using onUserLocationUpdate
- ✅ Current: Updates userLocation state
- ✅ Tracks bearing for camera heading

**Priority**: IMPLEMENTED - Core functionality

---

## 9. MISC CATEGORY

### 9.1 CacheManagement
**Purpose**: Manage offline tile cache

**Key Features**:
- `OfflineManager.invalidateAmbientCache()`
- `OfflineManager.clearAmbientCache()`
- `OfflineManager.setMaximumAmbientCacheSize()`
- `OfflineManager.resetDatabase()`

**Technical Components**:
```typescript
- OfflineManager API methods
- Cache size configuration
- Database reset
```

**Integration for DriveShare**:
- ⚠️ **Low Priority**: Maintenance feature
- Clear cache in settings
- Manage storage usage

**Priority**: LOW - Admin feature

---

## 10. UTILITIES & PATTERNS

### 10.1 RouteSimulator
**Purpose**: Simulate movement along route for testing

**Key Features**:
- Polyline class for route management
- Distance-based position calculation
- Speed control
- Animated value interpolation
- Listener pattern for updates

**Technical Components**:
```typescript
- Turf.js integration (along, distance)
- Animated.Value for smooth interpolation
- Event listener pattern
- requestAnimationFrame loop
```

**Integration for DriveShare**:
- ✅ **High Priority**: Testing tool
- Simulate trips without GPS
- Test navigation UI
- Demo mode for presentations

**Priority**: HIGH - Essential for testing

---

### 10.2 PulseCircleLayer
**Purpose**: Animated pulsing circle marker

**Key Features**:
- Animated circle with pulse effect
- Multiple circle layers (inner/outer)
- Opacity/radius animations
- Customizable colors/duration

**Technical Components**:
```typescript
- Animated.ShapeSource
- Animated.CircleLayer
- Animated.Value for interpolation
- Animation loop with useEffect
```

**Integration for DriveShare**:
- ✅ **ALREADY IN PROJECT**: components/PulseCircleLayer.tsx
- ✅ Use for: Pickup location indicator
- ✅ Use for: Driver current position
- ✅ Use for: Destination marker

**Priority**: IMPLEMENTED - Already available

---

## INTEGRATION PRIORITY SUMMARY

### CRITICAL (Already Implemented)
1. ✅ Camera followUserLocation with compassCourse
2. ✅ User location tracking with onUpdate
3. ✅ Zoom/Pitch settings for navigation
4. ✅ Content insets for UI
5. ✅ VietMap style configuration

### HIGH PRIORITY (Should Implement)
1. **RouteSimulator** - Testing/simulation
2. **CustomIcon/ShapeSourceIcon** - Better markers
3. **GradientLine** - Progress visualization
4. **CustomCallout** - Interactive info display
5. **MarkerView** - Rich marker UI
6. **FlyTo** - Smooth camera transitions
7. **AnimateCircleAlongLine** - Route progress animation

### MEDIUM PRIORITY (Consider Implementing)
1. **Fit (bounds)** - Show full route
2. **QueryAtPoint** - Interactive location selection
3. **Earthquakes (clustering)** - Handle many markers
4. **GeoJSONSource** - Zones/boundaries
5. **CompassView** - Navigation orientation
6. **ShowAndHideLayer** - Layer toggling
7. **CreateOfflineRegion** - Offline capability

### LOW PRIORITY (Optional)
1. Heatmap - Analytics visualization
2. IndoorBuilding - 3D buildings
3. TakeSnapshot - Sharing features
4. CacheManagement - Settings page
5. Theme/styling features

---

## RECOMMENDED INTEGRATION PLAN FOR DRIVERSHARE

### Phase 1: Core Navigation Enhancement (Week 1)
1. Implement RouteSimulator for testing
2. Add GradientLine for route progress
3. Integrate CustomIcon for vehicle/location markers
4. Add FlyTo for smooth transitions

### Phase 2: Interactive Features (Week 2)
1. Add CustomCallout for location info
2. Implement QueryAtPoint for location selection
3. Add MarkerView for rich markers
4. Integrate clustering for multiple vehicles

### Phase 3: Polish & Advanced (Week 3)
1. Add bounds fitting for full route view
2. Implement offline region support
3. Add layer visibility controls
4. Performance optimizations

---

## FILES TO CREATE/MODIFY

### New Utility Files
```
utils/
  RouteSimulator.ts (from example)
  mapHelpers.ts (bounds calculation, etc.)
  
components/map/
  GradientRouteLayer.tsx
  VehicleMarker.tsx
  LocationCallout.tsx
  ClusteredMarkers.tsx
```

### Modify Existing Files
```
screens/driver-v2/DriverTripDetailScreen.tsx
  - Add RouteSimulator integration
  - Add gradient progress line
  - Add smooth camera transitions
  - Add bounds fitting

screens/owner-v2/TripDetailScreen.tsx  
  - Add custom markers
  - Add location callouts
  - Add clustering if needed

components/map/NativeRouteMap.tsx
  - Add gradient line support
  - Add animation helpers
  
components/map/RouteLayer.tsx
  - Enhance with gradient
  - Add progress tracking
```

---

## CONCLUSION

The VietMap examples provide extensive patterns for:
- ✅ Navigation (mostly implemented)
- ✅ Custom markers (high priority)
- ✅ Route visualization (high priority)
- ✅ Interactive features (medium priority)
- ✅ Offline support (medium priority)

Current implementation is solid foundation. Priority should be:
1. **Testing tools** (RouteSimulator)
2. **Visual enhancements** (gradient lines, custom markers)
3. **Interactive features** (callouts, clustering)
4. **Offline capability** (reliability)

The project already follows best practices from examples. Key improvements are incremental enhancements rather than major refactors.
