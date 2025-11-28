# 🚀 Quick Fix: Add Debug Panel to Screens

## Để debug map integration, add MapDebugPanel vào 2 screens:

### 1. OwnerTripDetailScreen

**Add import:**
```tsx
// After line 24
import MapDebugPanel from '@/components/debug/MapDebugPanel'
```

**Add debug panel before closing View:**
```tsx
// Tìm dòng cuối của return statement (trước </SafeAreaView>)
// Thêm:

{__DEV__ && (
  <MapDebugPanel
    info={{
      routeCoords: routeCoords?.length || 0,
      startPoint: startPoint,
      endPoint: endPoint,
      tripId: tripId
    }}
  />
)}
```

**Full example:**
```tsx
return (
  <SafeAreaView style={styles.container}>
    {/* ... existing code ... */}
    
    {/* ADD THIS AT THE END */}
    {__DEV__ && (
      <MapDebugPanel
        info={{
          routeCoords: routeCoords?.length || 0,
          startPoint: startPoint,
          endPoint: endPoint,
          tripId: tripId
        }}
      />
    )}
  </SafeAreaView>
)
```

---

### 2. DriverTripDetailScreen

**Add import:**
```tsx
// After line 15
import MapDebugPanel from '@/components/debug/MapDebugPanel'
```

**Add debug panel:**
```tsx
// Tìm dòng cuối của return statement (trước </SafeAreaView>)
// Thêm:

{__DEV__ && (
  <MapDebugPanel
    info={{
      routeCoords: routeCoords?.length || 0,
      startPoint: startPoint,
      endPoint: endPoint,
      tripId: tripId,
      navActive: navActive,
      currentPos: currentPos,
      speed: currentSpeed,
      eta: eta,
      remaining: remaining
    }}
  />
)}
```

---

## 🎯 How to Use Debug Panel

1. **Build and run app** (dev mode)
2. **Navigate to trip detail screen**
3. **Look for floating "🐛 Debug" button** (bottom right)
4. **Tap to open debug panel**
5. **Check all values:**
   - ✅ Route Points > 0?
   - ✅ Start Point set?
   - ✅ End Point set?
   - ✅ Trip ID present?

---

## 📊 What to Check

### ❌ If Route Points = 0:
**Problem:** Polyline không decode được hoặc trip data chưa load

**Fix:**
1. Check `trip.tripRoute.routeData` có value không
2. Check console for decode errors
3. Verify `decodePolyline()` function works

### ❌ If Start/End Point = "Not set":
**Problem:** Coordinates không được extract đúng

**Fix:**
1. Check decode logic trong `fetchTrip()`
2. Verify array có elements: `decoded.coordinates.length > 0`

### ❌ If Trip ID = "Not set":
**Problem:** Route params không pass đúng

**Fix:**
1. Check navigation params
2. Verify `useLocalSearchParams()` gets tripId

---

## 🔍 Debug Output Examples

### ✅ GOOD (Everything working):
```
Route Data:
  ✅ Route Points: 150
  ✅ Start Point: 105.8342, 21.0285
  ✅ End Point: 105.8512, 21.0395

Trip Info:
  ✅ Trip ID: abc-123-def
```

### ❌ BAD (Map not showing):
```
Route Data:
  ❌ Route Points: 0
  ⚠️ Start Point: Not set
  ⚠️ End Point: Not set

Trip Info:
  ❌ Trip ID: Not set
```

---

## 🛠️ Alternative: Console Logging

If you don't want UI debug panel, add console logs:

```tsx
// In fetchTrip() after decode:
console.log('=== MAP DEBUG ===')
console.log('Route coords:', routeCoords?.length)
console.log('Start:', startPoint)
console.log('End:', endPoint)
console.log('Trip ID:', tripId)
console.log('================')
```

**Then check React Native debugger or terminal for logs.**

---

## 🎯 Quick Verification Commands

```bash
# Check if debug component exists
ls -la components/debug/MapDebugPanel.tsx

# Search for RouteMap usage
grep -n "RouteMap" screens/owner-v2/TripDetailScreen.tsx
grep -n "RouteMap" screens/driver-v2/DriverTripDetailScreen.tsx

# Check decode function
grep -n "decodePolyline" screens/owner-v2/TripDetailScreen.tsx
grep -n "decodePolyline" screens/driver-v2/DriverTripDetailScreen.tsx
```

---

## ✅ Success Criteria

After adding debug panel, you should see:

**OwnerTripDetailScreen:**
- ✅ Route Points: > 0 (e.g., 150)
- ✅ Start Point: Valid coordinates
- ✅ End Point: Valid coordinates
- ✅ Trip ID: Valid UUID

**DriverTripDetailScreen (before navigation):**
- ✅ Same as Owner screen

**DriverTripDetailScreen (during navigation):**
- ✅ Nav Active: Yes
- ✅ Current Position: GPS coordinates updating
- ✅ Speed: km/h value
- ✅ ETA: Time value
- ✅ Remaining: Distance in meters

---

## 📞 Next Steps

1. **Add debug panel** using code above
2. **Run app** in dev mode
3. **Open trip detail**
4. **Tap debug button**
5. **Screenshot the debug info**
6. **Share with me** if issues persist

This will help identify exactly where the integration is breaking!
