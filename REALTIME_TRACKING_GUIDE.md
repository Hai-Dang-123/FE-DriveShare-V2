# REAL-TIME TRACKING IMPLEMENTATION GUIDE

## ✅ COMPLETED
1. ✅ SignalR Service (`services/signalRTrackingService.ts`)
2. ✅ Route Simulator (`utils/SimpleRouteSimulator.ts`)
3. ✅ SignalR Hook (`hooks/useSignalRLocation.ts`)
4. ✅ Driver Screen with Simulation + Real GPS modes

## 📋 INTEGRATION GUIDE FOR OWNER & PROVIDER SCREENS

### Step 1: Add Hook to Owner TripDetailScreen

```typescript
// File: screens/owner-v2/TripDetailScreen.tsx

import { useSignalRLocation } from '@/hooks/useSignalRLocation';

// Inside component:
const { location, connected, error } = useSignalRLocation({
  tripId: tripId,
  enabled: trip?.status === 'IN_PROGRESS' // Only track when trip is active
});

// Use location to update map marker:
useEffect(() => {
  if (location) {
    console.log('[Owner] Driver location:', location);
    // TODO: Update map marker position
    // setDriverMarker({ lat: location.latitude, lng: location.longitude, bearing: location.bearing });
  }
}, [location]);
```

### Step 2: Add Hook to Provider TripDetailScreen

```typescript
// File: screens/provider-v2/ProviderTripDetail.tsx

import { useSignalRLocation } from '@/hooks/useSignalRLocation';

// Inside component:
const { location, connected, error } = useSignalRLocation({
  tripId: tripId,
  enabled: trip?.status === 'IN_PROGRESS'
});

// Use location to update map marker:
useEffect(() => {
  if (location) {
    console.log('[Provider] Driver location:', location);
    // TODO: Update VehicleMarker component with new coordinates
  }
}, [location]);
```

### Step 3: Add Connection Status Indicator (Optional)

```tsx
{/* Connection Status Badge */}
{connected && (
  <View style={styles.signalRBadge}>
    <View style={styles.signalRDot} />
    <Text style={styles.signalRText}>Live</Text>
  </View>
)}
```

```typescript
// Styles:
signalRBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: 10,
  paddingVertical: 6,
  backgroundColor: '#DCFCE7',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#10B981',
},
signalRDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#10B981',
},
signalRText: {
  fontSize: 11,
  fontWeight: '700',
  color: '#065F46',
},
```

## 🚗 DRIVER SCREEN USAGE

### Toggle Between Modes

1. **Simulation Mode** (Purple button "SIM"):
   - Uses RouteSimulator to fake GPS
   - Good for demo/testing without moving
   - Speed: 40 km/h, updates every 3s
   - Can pause/resume

2. **Real GPS Mode** (Green button "GPS"):
   - Uses expo-location (actual phone GPS)
   - Requires location permissions
   - Sends location every 1s
   - For production use

### Start Navigation

1. Driver taps "Bắt đầu" button
2. System checks:
   - Eligibility (driving hours)
   - Route availability
   - Mode selection (SIM/GPS)
3. If Simulation:
   - Initializes RouteSimulator
   - Starts sending fake locations
4. If Real:
   - Requests location permission
   - Starts watchPositionAsync
   - Sends real GPS data

### Pause/Resume

- Both modes support pause/resume
- Simulator saves current index
- Resume snaps back to route

## 🔧 TESTING CHECKLIST

### Driver Side (Publisher)
- [ ] Toggle SIM/GPS button works
- [ ] Simulation mode sends locations
- [ ] Real GPS mode sends locations
- [ ] Pause/resume works in both modes
- [ ] Stop navigation cleans up properly

### Owner/Provider Side (Subscriber)
- [ ] Hook initializes SignalR
- [ ] Receives location updates
- [ ] Map marker moves smoothly
- [ ] Connection status shows correctly
- [ ] Cleanup on unmount

## 🐛 TROUBLESHOOTING

### Connection Issues
- Check `EXPO_PUBLIC_API_BASE_URL` in `.env`
- Verify SignalR Hub is running: `/hubs/tracking`
- Check CORS settings on backend
- Look for 401/403 auth errors

### No Location Updates
- Check Driver mode (SIM vs GPS)
- Verify tripId is correct
- Check SignalR connection status
- Look for rate limiting (429)

### Simulation Not Moving
- Check routeCoords has data
- Verify simulator started successfully
- Check console for errors
- Try stopping and restarting

## 📱 ANDROID BACKGROUND TRACKING (Future)

For production real GPS tracking in background, you'll need:

```json
// app.json
{
  "android": {
    "permissions": [
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION"
    ]
  }
}
```

And use `expo-task-manager`:

```typescript
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    const location = locations[0];
    // Send to SignalR
    await signalRTrackingService.sendLocationUpdate(
      tripId,
      location.coords.latitude,
      location.coords.longitude,
      location.coords.heading || 0,
      location.coords.speed || 0
    );
  }
});

// Start background tracking
await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 5000,
  distanceInterval: 10,
  foregroundService: {
    notificationTitle: 'Đang chia sẻ hành trình',
    notificationBody: 'DriveShare đang theo dõi vị trí của bạn',
  },
});
```

## 🎯 NEXT STEPS

1. Test both modes on Driver screen
2. Integrate hook into Owner screen
3. Integrate hook into Provider screen
4. Add visual indicators (Live badge, moving marker)
5. Test end-to-end flow
6. (Optional) Implement background tracking for Android production

---

**Note**: Current implementation works for foreground tracking. For production, add background location support.
