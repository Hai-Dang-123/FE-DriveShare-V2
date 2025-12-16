# VNPT SDK - Chỉ Lấy Ảnh, Không Upload

## ⚠️ QUAN TRỌNG

SDK VNPT được config để **CHỈ lấy ảnh**, **KHÔNG tự động upload** lên server của VNPT.

---

## 📱 Web Configuration

**File:** `components/ekyc/WebCccdScanner.tsx`

```typescript
const dataConfig = {
  CALL_BACK_END_FLOW: (result: any) => {
    console.log('✅ VNPT SDK Result:', result);
    onResult(result); // Trả về base64
  },
  HAS_BACKGROUND_IMAGE: false,
  MAX_SIZE_IMAGE: 1,
  LIST_TYPE_DOCUMENT: [-1, 4, 5, 6, 7],
  
  // ⭐ QUAN TRỌNG: Tắt auto upload
  IS_UPLOAD_IMAGE: false,   // ❌ Không upload lên VNPT server
  IS_SAVE_IMAGE: false,     // ❌ Không lưu file
  RETURN_BASE64: true,      // ✅ CHỈ trả về base64
};
```

---

## 🤖 Android Configuration

**File:** `components/ekyc/VnptSdkModal.tsx`

```typescript
const initializeAndroidSdk = async () => {
  const sdkConfig = {
    ...config,
    IS_UPLOAD_IMAGE: false,  // ❌ Không upload
    IS_SAVE_IMAGE: false,    // ❌ Không lưu file
    RETURN_BASE64: true,     // ✅ CHỉ trả về base64
  };
  
  await NativeModules.VnptCccdModule.initializeSdk(sdkConfig);
};
```

**Native Module Methods:**
- `scanCccdFront()` → Returns `{ base64: "..." }`
- `scanCccdBack()` → Returns `{ base64: "..." }`
- `captureSelfie()` → Returns `{ base64: "..." }`

---

## 🔄 Luồng Hoạt Động Đúng

```
┌─────────────────────────────────────────┐
│  User click "Quét với AI"              │
└──────────────┬──────────────────────────┘
               │
        ┌──────▼──────┐
        │  SDK Modal  │
        │   Mở lên    │
        └──────┬──────┘
               │
    ┌──────────┴──────────┐
    │                     │
  WEB                 ANDROID
    │                     │
WebCccdScanner    VnptCccdModule
    │                     │
    ├─ Camera overlay     ├─ Camera overlay
    ├─ Auto detect CCCD   ├─ Auto detect CCCD
    ├─ ❌ NO upload       ├─ ❌ NO upload
    └─ ✅ Return base64   └─ ✅ Return base64
    │                     │
    └─────────┬───────────┘
              │
       ┌──────▼──────┐
       │  onResult() │
       │  callback   │
       └──────┬──────┘
              │
       ┌──────▼──────────────┐
       │  Convert base64     │
       │  to URI/File        │
       └──────┬──────────────┘
              │
       ┌──────▼──────────────┐
       │  setState(images)   │
       │  Show Review Screen │
       └──────┬──────────────┘
              │
       ┌──────▼──────────────┐
       │  User confirm       │
       └──────┬──────────────┘
              │
       ┌──────▼─────────────────────┐
       │  Call API                  │
       │  verifyCccd()              │
       │  verifyLicense()           │
       │  verifyHealthCheck()       │
       │                            │
       │  Upload to OUR backend     │
       └────────────────────────────┘
```

---

## ✅ Kết Quả Mong Đợi

### Web:
```javascript
// SDK callback trả về:
{
  front_image: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  back_image: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  face_image: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

### Android:
```javascript
// Native Module trả về:
{
  base64: "/9j/4AAQSkZJRg..."
}
```

---

## ❌ Không Được Có

1. **Không có request đến VNPT server:**
   - ❌ `http://vnpt.vn/upload`
   - ❌ `http://vnpt.vn/addFile`
   - ❌ `http://vnpt.vn/file-service`

2. **Không có lỗi 404:**
   - ❌ `404 Not Found /file-service/v1/addFile`

3. **Không có auto upload:**
   - SDK CHỈ chụp ảnh và trả về base64
   - Upload phải thông qua API của chúng ta

---

## 🧪 Test Checklist

- [ ] Web: Click "Quét với AI" → SDK mở camera
- [ ] Web: Quét CCCD → Trả về base64 (không có request 404)
- [ ] Web: Console log `✅ VNPT SDK Result:` có 3 ảnh base64
- [ ] Android: Click "Quét với AI" → Modal mở
- [ ] Android: SDK quét → Trả về base64
- [ ] Review screen: Hiển thị đúng 3 ảnh
- [ ] Click "Xác nhận" → Gọi API `/api/UserDocument/verify-cccd`
- [ ] Backend nhận được formData với 3 ảnh

---

## 📝 Notes

- SDK là **công cụ hỗ trợ lấy ảnh chất lượng cao**
- SDK **KHÔNG** liên quan đến logic upload/verify
- Upload/Verify là trách nhiệm của **backend API của chúng ta**
- Luồng giống hệt khi chụp thủ công, chỉ khác cách lấy ảnh

---

## 🔧 Nếu Vẫn Có Lỗi Upload

**Check lại config trong:**
1. `WebCccdScanner.tsx` → `IS_UPLOAD_IMAGE: false`
2. `VnptSdkModal.tsx` → `IS_UPLOAD_IMAGE: false`
3. Android Native Module → Pass config correctly
4. Console log để verify config được apply đúng
