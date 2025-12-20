# SignalR Auto-Reconnect Implementation

## Tổng quan

Đã cải thiện cơ chế kết nối lại tự động cho SignalR tracking service để đảm bảo kết nối real-time ổn định và tự phục hồi khi mất kết nối.

## Các cải tiến chính

### 1. **Automatic Reconnect với Exponential Backoff**
- Tăng số lần retry từ 3 lên **vô hạn** (999 attempts)
- Chiến lược delay thông minh:
  - Lần 1-3: 2s, 4s, 8s (nhanh)
  - Lần 4-6: 15s (trung bình)
  - Lần 7+: 30s (chậm, tiết kiệm tài nguyên)

```typescript
.withAutomaticReconnect({
  nextRetryDelayInMilliseconds: (retryContext) => {
    if (retryContext.previousRetryCount < 3) {
      return 2000 * Math.pow(2, retryContext.previousRetryCount); // 2s, 4s, 8s
    } else if (retryContext.previousRetryCount < 6) {
      return 15000; // 15s
    } else {
      return 30000; // 30s
    }
  },
})
```

### 2. **Backup Manual Reconnect Timer**
- Khi automatic reconnect thất bại hoàn toàn, service tự động bật timer backup
- Timer thử reconnect mỗi 30s ở background
- Tự động tắt khi kết nối thành công

```typescript
private startManualReconnect(): void {
  this.manualReconnectTimer = setInterval(async () => {
    if (!this.isConnected()) {
      await this.reconnect();
    } else {
      this.stopManualReconnect();
    }
  }, 30000); // 30s interval
}
```

### 3. **Auto-rejoin Trip Group**
- Service track `currentTripId` khi join trip group
- Sau khi reconnect thành công, tự động rejoin trip group
- Đảm bảo tiếp tục nhận location updates

```typescript
this.connection.onreconnected(async (connectionId) => {
  // Tự động rejoin trip group
  if (this.currentTripId) {
    await this.joinTripGroup(this.currentTripId);
  }
});
```

### 4. **Manual Reconnect Button trên UI**
- Thêm nút "Kết nối lại" khi status = Offline
- User có thể trigger reconnect thủ công bất cứ lúc nào
- UI hiển thị:
  - 🟢 "Live" - Đang kết nối
  - 🔴 "Offline" + nút "Kết nối lại" - Mất kết nối

```tsx
{!connected && signalREnabled && (
  <TouchableOpacity onPress={reconnect} style={styles.reconnectBtn}>
    <Ionicons name="refresh" size={16} color="#EF4444" />
    <Text style={styles.reconnectText}>Kết nối lại</Text>
  </TouchableOpacity>
)}
```

## Flow hoạt động

```
1. SignalR Connected
   ↓
2. Mất kết nối (network issue)
   ↓
3. Automatic Reconnect (2s, 4s, 8s, 15s, 30s...)
   ↓
4. Nếu automatic thất bại → Bật Manual Timer (mỗi 30s)
   ↓
5. Khi reconnect thành công:
   - Auto-rejoin trip group
   - Tắt manual timer
   - Update UI status
   ↓
6. Tiếp tục nhận location updates
```

## Testing

### Test Case 1: Network Disconnection
1. Mở trip detail screen với status MOVING_TO_PICKUP
2. Kiểm tra badge "Live" màu xanh
3. Tắt WiFi/Data
4. Quan sát: Badge chuyển "Offline", xuất hiện nút "Kết nối lại"
5. Bật WiFi/Data lại
6. Quan sát: Tự động reconnect sau 2-4s, badge chuyển "Live"

### Test Case 2: Manual Reconnect
1. Khi offline, bấm nút "Kết nối lại"
2. Quan sát console logs: `[SignalR] Manual reconnect attempt...`
3. Kết nối thành công → Badge "Live", nút biến mất

### Test Case 3: Long-term Disconnection
1. Tắt mạng > 5 phút
2. Quan sát console: Timer thử reconnect mỗi 30s
3. Bật mạng lại
4. Quan sát: Reconnect ngay lập tức trong lần thử kế tiếp

## Console Logs

```
[SignalR] Connection closed: ...
[SignalR] Starting manual reconnect timer (30s interval)
[SignalR] Reconnecting...
[SignalR] Reconnected. ConnectionId: xxx
[SignalR] Auto-rejoined trip: 70ffcd20-f816-4c31-beb4-e5789197d8bf
[SignalR] Stopped manual reconnect timer
```

## Files Changed

1. **services/signalRTrackingService.ts**
   - Thêm `maxReconnectAttempts = 999`
   - Thêm `manualReconnectTimer` và `currentTripId`
   - Cải thiện automatic reconnect logic
   - Thêm `startManualReconnect()` và `stopManualReconnect()`
   - Auto-rejoin trip trong `onreconnected`

2. **hooks/useSignalRLocation.ts**
   - Thêm `reconnect` vào return type
   - Export `reconnect()` callback cho UI

3. **screens/owner-v2/TripDetailScreen.tsx**
   - Lấy `reconnect` từ hook
   - Thêm nút "Kết nối lại" khi offline
   - Thêm styles cho reconnect button

## Best Practices

✅ **Tự động phục hồi**: Service tự reconnect không cần user can thiệp  
✅ **User control**: User có thể trigger reconnect thủ công  
✅ **Tiết kiệm tài nguyên**: Delay tăng dần, không spam requests  
✅ **Transparent**: Console logs rõ ràng cho debugging  
✅ **Resilient**: Xử lý network issues gracefully

## Lưu ý

- Timer sẽ tự động tắt khi kết nối thành công
- Không cần restart app khi mất kết nối
- Hoạt động cả foreground và background
- Không ảnh hưởng đến hiệu năng app

---

**Kết quả**: SignalR giờ đây có khả năng tự phục hồi hoàn toàn, không bao giờ "off hoài luôn" như trước! 🚀
