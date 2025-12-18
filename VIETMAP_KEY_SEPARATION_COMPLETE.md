# ✅ VietMap Key Separation - Hoàn Thành

## 📋 Tổng Quan

Đã phân tách **2 loại API Key** riêng biệt cho VietMap theo đúng best practice:

### 🗺️ **Tilemap Key** (Map Rendering)
```
c3e53caf753884406eec941d83e209f1ca00c908ca4d404a
```
**Mục đích**: Render map tiles (vector/raster)
**Sử dụng cho**: Hiển thị bản đồ, tiles, styles

### 🛣️ **Services Key** (API Services)  
```
bec96ec200a6dd15926c19125a5d297b423fab530540644d
```
**Mục đích**: API services (routing, geocoding, search)
**Sử dụng cho**: Tìm đường, tìm kiếm địa chỉ, autocomplete

---

## 📁 Files Đã Update

### 1. **Environment Configuration** ✅
**File**: `.env`
```dotenv
# VietMap Tilemap Key - for map tiles rendering
EXPO_PUBLIC_VIETMAP_TILEMAP_KEY=c3e53caf753884406eec941d83e209f1ca00c908ca4d404a

# VietMap Services Key - for routing, geocoding, search APIs
EXPO_PUBLIC_VIETMAP_SERVICES_KEY=bec96ec200a6dd15926c19125a5d297b423fab530540644d
```

### 2. **Core Configuration** ✅
**File**: `config/vietmap.ts`

**Exports mới**:
- `vietmapTilemapKey` - Tilemap Key
- `vietmapServicesKey` - Services Key  
- `vietmapAPIKey` - Backward compatibility (maps to Tilemap Key)
- `vietmapStyleUrl()` - Dùng Tilemap Key

**File**: `vietmap_config.ts`
- Export cả 3 keys ra ngoài

---

## 🗺️ Map Components (Dùng Tilemap Key)

### ✅ Updated Files:
1. **`components/map/VietMapWebSDK.tsx`**
   - Dùng `vietmapStyleUrl()` (auto sử dụng Tilemap Key)

2. **`components/map/VietMapWebWrapper.tsx`**
   - Đọc `EXPO_PUBLIC_VIETMAP_TILEMAP_KEY`
   - Fallback: `c3e53caf753884406eec941d83e209f1ca00c908ca4d404a`

3. **`components/map/SafeVietMapComponent.tsx`**
   - Đọc `EXPO_PUBLIC_VIETMAP_TILEMAP_KEY`
   - Fallback: `c3e53caf753884406eec941d83e209f1ca00c908ca4d404a`

4. **`components/map/NativeRouteMap.tsx`**
   - `setAccessToken()` dùng Tilemap Key
   - `styleURL` dùng Tilemap Key

5. **`components/debug/VietMapWebSDK.tsx`**
   - Dùng `EXPO_PUBLIC_VIETMAP_TILEMAP_KEY`

6. **`components/debug/RealVietMapTest.tsx`**
   - Dùng `EXPO_PUBLIC_VIETMAP_TILEMAP_KEY`

7. **`services/mapTileCacheService.ts`**
   - Hardcoded Tilemap Key: `c3e53caf753884406eec941d83e209f1ca00c908ca4d404a`

---

## 🛣️ Service Components (Dùng Services Key)

### ✅ Updated Files:

1. **`services/vietmapService.ts`**
   - Import: `vietmapServicesKey`
   - Functions updated:
     - `planCurrentToTrip()` - Routing API
     - `getRoute()` - Routing API  
     - `reverseGeocode()` - Geocoding API
     - `searchAddress()` - Search API

2. **`services/postPackageService.ts`**
   - Import: `vietmapServicesKey`
   - Functions updated:
     - `searchAddress()` - Search API v3
     - `getPlaceDetail()` - Place API v3

3. **`services/vietmapAutocompleteService.ts`**
   - Import: `vietmapServicesKey`
   - Function: `autocompleteAddress()` - Autocomplete API

---

## 🧪 Test Screen Updated

**File**: `app/vietmap-test.tsx` ✅
- Check **cả 2 keys** khi load
- Test Tilemap Key với style URL
- Display status: "✅ Both keys loaded (Tilemap + Services)"

---

## 🎯 Cách Sử Dụng

### **Import trong code mới:**

#### Map Rendering (Tilemap):
```typescript
import { vietmapTilemapKey, vietmapStyleUrl } from '@/config/vietmap'

// Option 1: Dùng function helper (recommended)
const styleUrl = vietmapStyleUrl('light', 'vector')

// Option 2: Manual
const styleUrl = `https://maps.vietmap.vn/maps/styles/lm/style.json?apikey=${vietmapTilemapKey}`
```

#### API Services (Routing, Geocoding, Search):
```typescript
import { vietmapServicesKey } from '@/config/vietmap'

// Routing
const routeUrl = `https://maps.vietmap.vn/api/route?apikey=${vietmapServicesKey}&...`

// Search
const searchUrl = `https://maps.vietmap.vn/api/search/v3?apikey=${vietmapServicesKey}&...`
```

#### Backward Compatibility:
```typescript
import { vietmapAPIKey } from '@/config/vietmap'
// vietmapAPIKey = vietmapTilemapKey (for old code)
```

---

## ✅ Verification Checklist

- [x] Environment variables updated (`.env`)
- [x] Config exports both keys (`config/vietmap.ts`)
- [x] All map components use **Tilemap Key**
- [x] All service APIs use **Services Key**
- [x] Backward compatibility maintained (`vietmapAPIKey`)
- [x] Test screen checks both keys
- [x] Fallback values configured for all components

---

## 🚀 Next Steps

1. **Restart Expo server** để load environment variables mới:
   ```bash
   npx expo start --tunnel
   ```

2. **Test map rendering**:
   - Navigate to `/vietmap-test` screen
   - Should see: "✅ Both keys loaded (Tilemap + Services)"
   - Map tiles should load successfully

3. **Test routing**:
   - Trigger any routing function
   - Check that Services Key is used in API calls

---

## 🔍 Troubleshooting

### Problem: Map không hiển thị
**Solution**: Check Tilemap Key
```typescript
console.log(process.env.EXPO_PUBLIC_VIETMAP_TILEMAP_KEY)
```

### Problem: Routing API fails
**Solution**: Check Services Key
```typescript
console.log(process.env.EXPO_PUBLIC_VIETMAP_SERVICES_KEY)
```

### Problem: Environment variables undefined
**Solution**: 
1. Restart Expo: `Ctrl+C` → `npx expo start --tunnel`
2. Clear cache: `npx expo start --tunnel --clear`

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────┐
│           VietMap Integration               │
├─────────────────────────────────────────────┤
│                                             │
│  🗺️ TILEMAP KEY                            │
│  c3e53caf753884406eec941d83e209f1ca00c908  │
│  │                                          │
│  ├─→ Map Tiles (.pbf)                      │
│  ├─→ Style JSON                            │
│  ├─→ Vector/Raster tiles                   │
│  └─→ All Map Components                    │
│                                             │
│  🛣️ SERVICES KEY                           │
│  bec96ec200a6dd15926c19125a5d297b423fab53  │
│  │                                          │
│  ├─→ Routing API                           │
│  ├─→ Geocoding API                         │
│  ├─→ Search API                            │
│  ├─→ Autocomplete API                      │
│  └─→ Place Detail API                      │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 📝 Notes

- **Tilemap Key** có domain restrictions → Chỉ hoạt động với whitelisted domains
- **Services Key** không có domain restrictions → Có thể dùng từ mọi nơi
- Tunnel mode vẫn cần thiết nếu test web trên localhost
- Mobile app không bị ảnh hưởng bởi CORS

---

**Date**: December 18, 2025  
**Status**: ✅ HOÀN THÀNH  
**Tested**: Pending user verification
