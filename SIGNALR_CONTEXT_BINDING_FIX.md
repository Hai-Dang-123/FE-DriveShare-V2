# SignalR Context Binding & Reconnect Flow Fix ✅

## Issue 1: Context Binding Error
```
Uncaught (in promise) TypeError: this.stopManualReconnect is not a function
```

## Issue 2: Manual Reconnect Error
```
[Driver SignalR] Manual reconnect failed: Error: [SignalR] Not connected
```

## Root Causes

### Issue 1: Lost Context
Methods `startManualReconnect()` and `stopManualReconnect()` were declared as regular class methods, which lose their `this` context when called from event handlers.

### Issue 2: Duplicate Trip Group Join
- Service `reconnect()` already joins trip group automatically
- Driver/Owner screens tried to join again manually
- If reconnect failed, connection not ready → join fails with "Not connected"

## Solutions

### 1. Convert Methods to Arrow Functions
Changed from regular methods to arrow function properties:

**Before**:
```typescript
private startManualReconnect(): void {
  this.stopManualReconnect(); // 'this' may be undefined
  // ...
}
```

**After**:
```typescript
private startManualReconnect = (): void => {
  this.stopManualReconnect(); // 'this' is always bound correctly
  // ...
}
```

### 2. Improve Service Reconnect Flow

**Before**:
```typescript
public async reconnect(): Promise<void> {
  try {
    if (this.connection) {
      await this.connection.start();
      if (this.currentTripId) {
        await this.joinTripGroup(this.currentTripId); // May fail
      }
    }
  } catch (error) {
    console.error('[SignalR] Reconnect failed:', error);
    // Error silently swallowed
  }
}
```

**After**:
```typescript
public async reconnect(): Promise<void> {
  try {
    if (!this.connection) {
      throw new Error('[SignalR] No connection to reconnect');
    }
    
    await this.connection.start();
    
    // Try to rejoin trip - don't fail if this fails
    if (this.currentTripId) {
      try {
        await this.joinTripGroup(this.currentTripId);
      } catch (joinErr) {
        console.error('[SignalR] Failed to rejoin trip:', joinErr);
        // Don't throw - connection is established
      }
    }
  } catch (error: any) {
    console.error('[SignalR] Reconnect failed:', error);
    throw error; // Re-throw so caller knows
  }
}
```

### 3. Simplify Screen Reconnect Handlers

**Driver Screen - Before**:
```typescript
const reconnectSignalR = useCallback(async () => {
  await signalRTrackingService.reconnect();
  
  // Manual join - causes duplicate join error
  if (tripId) {
    await signalRTrackingService.joinTripGroup(tripId); // ❌ Error here
  }
}, [tripId]);
```

**Driver Screen - After**:
```typescript
const reconnectSignalR = useCallback(async () => {
  try {
    // Service handles connection + auto-rejoin
    await signalRTrackingService.reconnect(); // ✅ No manual join needed
    console.log('[Driver SignalR] ✅ Manually reconnected');
  } catch (err: any) {
    setSignalRError(err?.message || 'Không thể kết nối lại');
  }
}, [tripId]);
```

**Owner Screen - Same Fix**:
```typescript
const reconnectSignalR = useCallback(async () => {
  try {
    await reconnect(); // ✅ Hook handles everything
    console.log('[Owner SignalR] ✅ Manually reconnected');
  } catch (err: any) {
    console.error('[Owner SignalR] Manual reconnect failed:', err);
  }
}, [reconnect]);
```

## Why Arrow Functions Fix This

### Regular Method
```typescript
class MyClass {
  private myMethod(): void {
    console.log(this); // 'this' depends on how it's called
  }
}

const obj = new MyClass();
const handler = obj.myMethod;
handler(); // Error: 'this' is undefined
```

### Arrow Function Property
```typescript
class MyClass {
  private myMethod = (): void => {
    console.log(this); // 'this' is ALWAYS the class instance
  }
}

const obj = new MyClass();
const handler = obj.myMethod;
handler(); // Works! 'this' is bound correctly
```

## Files Modified

### `services/signalRTrackingService.ts`
- ✅ Converted `startManualReconnect` to arrow function
- ✅ Converted `stopManualReconnect` to arrow function
- ✅ Improved `init()` duplicate prevention logic
- ✅ Enhanced `reconnect()` to throw error on failure
- ✅ `reconnect()` auto-rejoins trip group with error handling

### `screens/driver-v2/DriverTripDetailScreen-v2.tsx`
- ✅ Removed manual `joinTripGroup()` call (service handles it)
- ✅ Simplified `reconnectSignalR()` callback
- ✅ Better error handling

### `screens/owner-v2/TripDetailScreen.tsx`
- ✅ Simplified `reconnectSignalR()` callback
- ✅ Service/hook handles trip group rejoin

## Verification

All files compile without errors:
- ✅ `services/signalRTrackingService.ts`
- ✅ `screens/driver-v2/DriverTripDetailScreen-v2.tsx`
- ✅ `screens/owner-v2/TripDetailScreen.tsx`

## Reconnect Flow (Fixed)

```
User clicks "Kết nối lại" button
    ↓
Driver/Owner: reconnectSignalR() called
    ↓
Service: reconnect() method
    ↓
    1. Check if already connected → return
    2. Check if already reconnecting → return
    3. Start connection: connection.start()
    4. Auto-rejoin trip group (with error handling)
       - Try joinTripGroup()
       - If fails: log error but don't throw
       - Connection still valid even if rejoin fails
    5. Notify callbacks: onConnectionChange(true)
    6. If any step 1-3 fails: throw error to caller
    ↓
Driver/Owner: Handle success/error
    - Success: Clear error state, show ✅
    - Error: Set error state, stay disconnected
```

## Testing

1. **Normal Connection**:
   - Open driver/owner screen
   - SignalR connects successfully
   - ✅ No errors in console

2. **Automatic Reconnection**:
   - Disconnect network
   - SignalR triggers `onclose` → calls `this.startManualReconnect()`
   - ✅ No "not a function" error
   - Timer starts (30s interval)

3. **Manual Reconnect (Success)**:
   - Click "Kết nối lại" button
   - SignalR reconnects successfully
   - Auto-rejoins trip group
   - ✅ No "Not connected" error
   - Badge shows 🟢 "Live"

4. **Manual Reconnect (Rejoin Fails)**:
   - Click "Kết nối lại"
   - Connection succeeds
   - Trip group rejoin fails (e.g., trip ended)
   - ✅ Connection still active
   - ✅ Error logged but not thrown
   - Badge shows 🟢 "Live"

5. **Manual Reconnect (Connection Fails)**:
   - Click "Kết nối lại" (no network)
   - Connection fails
   - ✅ Error properly caught
   - Badge stays 🔴 "Offline"
   - Error message shown to user

## Key Takeaways

### 1. Arrow Functions for Context
**Always use arrow functions for class methods that:**
- Are passed as callbacks
- Are called from event handlers
- Need to preserve `this` context

### 2. Single Responsibility
**Service should handle:**
- Connection establishment
- Automatic trip group rejoin
- Error propagation

**Screens should NOT:**
- Manually join trip groups
- Duplicate service logic
- Swallow errors

### 3. Graceful Degradation
**If rejoin fails but connection succeeds:**
- Log the error
- Keep connection active
- User can still use basic features
- Don't block the entire reconnect flow

### 4. Error Propagation
**Service should throw errors when:**
- Connection establishment fails
- Critical operations fail

**Service should NOT throw when:**
- Secondary operations fail (like rejoin)
- Error can be handled gracefully
