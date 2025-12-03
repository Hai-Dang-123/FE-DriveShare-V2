# Hệ thống Xác thực CCCD & GPLX - Hoàn chỉnh

## 📋 Tổng quan
Đã triển khai đầy đủ hệ thống xác thực giấy tờ tùy thân (CCCD và GPLX) cho 3 vai trò: **Owner**, **Driver**, và **Provider**.

---

## 🎯 Tính năng chính

### 1. **Check trạng thái xác thực tự động**
- API: `GET /api/UserDocument/check-verified-status`
- Logic:
  - **Driver**: Cần cả CCCD + GPLX đều ACTIVE
  - **Owner/Provider**: Chỉ cần CCCD ACTIVE
- Hiển thị badge động trong Header của 3 role

### 2. **Xem chi tiết giấy tờ**
- API: `GET /api/UserDocument/my-documents`
- Screen: `MyDocumentsScreen.tsx`
- Hiển thị:
  - ✅ Trạng thái: ACTIVE / INACTIVE / REJECTED
  - 🖼️ Ảnh giấy tờ (mặt trước, mặt sau, chân dung)
  - 📄 Thông tin OCR (tên, số CCCD/GPLX, ngày sinh, hạng bằng...)
  - ⚠️ Lý do từ chối (nếu bị reject)
  - 🔄 Nút "Tải lên lại" (nếu chưa duyệt hoặc bị từ chối)

### 3. **Upload & Verify CCCD**
- API: `POST /api/UserDocument/verify-cccd`
- Form: `Front`, `Back`, `Selfie` (bắt buộc cả 3)
- Tích hợp VNPT eKYC SDK (web) + Manual capture (mobile)
- Auto-approve logic:
  - ✅ Giấy tờ thật (`IsRealCard = true`)
  - ✅ Khớp khuôn mặt >= 85%
  - ✅ Không bị chỉnh sửa (`Tampering.IsLegal = yes`)
  - ✅ Không có warning (mờ, nhòe, góc chụp...)

### 4. **Upload & Verify GPLX**
- API: `POST /api/UserDocument/verify-license`
- Form: `Front`, `Selfie` (không cần `Back`)
- Screen: `VerifyLicenseScreen.tsx`
- Chỉ cần mặt trước GPLX + ảnh chân dung
- OCR hạng bằng (`LicenseClass`) tự động

---

## 📁 Cấu trúc file

### **Services**
```
services/
└── ekycService.ts
    ├── checkVerifiedStatus()      // Check trạng thái đã verify chưa
    ├── getMyDocuments()            // Lấy chi tiết giấy tờ
    ├── verifyCccd()                // Upload CCCD (3 ảnh)
    └── verifyLicense()             // Upload GPLX (2 ảnh)
```

### **Screens**
```
screens/shared/
├── MyDocumentsScreen.tsx           // Hiển thị danh sách giấy tờ
├── VerifyCccdScreen.tsx            // Upload CCCD (đã có sẵn)
└── VerifyLicenseScreen.tsx         // Upload GPLX (mới tạo)
```

### **Components**
```
screens/owner-v2/components/
└── HeaderOwner.tsx                 // Hiển thị badge "Đã xác minh" / "Xác minh tài khoản"

screens/driver-v2/components/
└── HeaderDriver.tsx                // Hiển thị "Đã xác minh đầy đủ" / "Xác minh CCCD & GPLX"

screens/provider-v2/components/
└── HeaderProvider.tsx              // Hiển thị badge "Đã xác minh" / "Xác minh tài khoản"
```

### **Routes**
```
app/(auth)/
├── my-documents.tsx                // Route hiển thị giấy tờ
├── verify-cccd.tsx                 // Route upload CCCD (đã có)
└── verify-license.tsx              // Route upload GPLX (mới)
```

---

## 🔄 Luồng hoạt động

### **A. Người dùng chưa xác thực**
```
1. Vào app → Header hiển thị badge đỏ "Xác minh tài khoản"
2. Nhấn badge → Navigate to MyDocumentsScreen
3. Hiển thị card trống:
   - "Chưa có thông tin"
   - Nút "Tải lên ngay"
4. Nhấn "Tải lên ngay" → Navigate to VerifyCccdScreen hoặc VerifyLicenseScreen
5. Chụp ảnh → Xem lại → Xác nhận
6. Backend xử lý OCR + Auto-approve
7. Quay lại MyDocumentsScreen → Hiện trạng thái
```

### **B. Người dùng đã xác thực**
```
1. Vào app → Header hiển thị badge xanh "Đã xác minh" (Owner/Provider) hoặc "Đã xác minh đầy đủ" (Driver)
2. Nhấn badge → Navigate to MyDocumentsScreen
3. Hiển thị card với:
   - Badge xanh "Đã xác thực"
   - Gallery ảnh (front, back, selfie)
   - Thông tin OCR (tên, số CCCD/GPLX, ngày sinh...)
```

### **C. Giấy tờ bị từ chối**
```
1. MyDocumentsScreen hiển thị:
   - Badge đỏ "Bị từ chối"
   - Box lý do từ chối (background đỏ)
   - Nút "Tải lên lại"
2. Nhấn "Tải lên lại" → Navigate to upload screen
3. Chụp lại → Submit → Tạo record mới trong DB
```

---

## 🎨 Giao diện

### **Header Badge**
```tsx
// Owner/Provider
✅ Đã xác minh (màu xanh) - Clickable
❌ Xác minh tài khoản (màu xanh dương) - Clickable

// Driver
✅ Đã xác minh đầy đủ (màu xanh) - Clickable
❌ Xác minh CCCD & GPLX (màu đỏ) - Clickable
```

### **MyDocumentsScreen**
```
┌─────────────────────────────────┐
│ Header: "Giấy tờ của tôi"       │
│ [<]          [Refresh Icon]      │
├─────────────────────────────────┤
│                                  │
│ ┌─ CCCD Card ──────────────────┐│
│ │ 🆔 Căn cước công dân          ││
│ │ [✅ Đã xác thực]              ││
│ │                               ││
│ │ Gallery: [Front] [Back] [Face]││
│ │                               ││
│ │ Họ và tên: Nguyễn Văn A       ││
│ │ Số CCCD: 001234567890         ││
│ │ Ngày sinh: 01/01/1990         ││
│ │ Ngày hết hạn: 01/01/2040      ││
│ └───────────────────────────────┘│
│                                  │
│ ┌─ GPLX Card (Driver only) ────┐│
│ │ 🚗 Giấy phép lái xe           ││
│ │ [⚠️ Chờ duyệt]                ││
│ │                               ││
│ │ Gallery: [Front] [Face]       ││
│ │                               ││
│ │ Họ và tên: Nguyễn Văn A       ││
│ │ Số GPLX: 12345678             ││
│ │ Hạng bằng: B2                 ││
│ │                               ││
│ │ [🔄 Tải lên lại]              ││
│ └───────────────────────────────┘│
└─────────────────────────────────┘
```

---

## 🔧 Backend API Summary

### **1. Check Verified Status**
```http
GET /api/UserDocument/check-verified-status
Response:
{
  "statusCode": 200,
  "message": "Đã xác thực đầy đủ (CCCD & GPLX)",
  "isSuccess": true,
  "result": {
    "isVerified": true,
    "message": "Tài xế đã xác thực đầy đủ (CCCD & GPLX)."
  }
}
```

### **2. Get My Documents**
```http
GET /api/UserDocument/my-documents
Response:
{
  "statusCode": 200,
  "message": "Lấy thông tin giấy tờ thành công.",
  "isSuccess": true,
  "result": {
    "isDriver": true,
    "cccd": {
      "userDocumentId": "...",
      "documentType": "CCCD",
      "frontImageUrl": "https://...",
      "backImageUrl": "https://...",
      "portraitImageUrl": "https://...",
      "identityNumber": "001234567890",
      "fullName": "Nguyễn Văn A",
      "dateOfBirth": "1990-01-01",
      "status": "ACTIVE",
      "verifiedAt": "2025-12-01T10:00:00Z"
    },
    "driverDocuments": {
      "drivingLicense": {
        "userDocumentId": "...",
        "documentType": "DRIVER_LINCENSE",
        "frontImageUrl": "https://...",
        "portraitImageUrl": "https://...",
        "identityNumber": "12345678",
        "licenseClass": "B2",
        "status": "INACTIVE",
        "rejectionReason": "Ảnh bị mờ, vui lòng chụp lại"
      }
    }
  }
}
```

### **3. Verify CCCD**
```http
POST /api/UserDocument/verify-cccd
Content-Type: multipart/form-data

Front: [file]
Back: [file]
Selfie: [file]

Response (Success):
{
  "statusCode": 200,
  "message": "Xác thực CCCD thành công.",
  "isSuccess": true,
  "result": { /* DocumentDetailDTO */ }
}

Response (Rejected):
{
  "statusCode": 400,
  "message": "Xác thực thất bại",
  "isSuccess": false,
  "result": {
    "rejectionReason": "Giấy tờ có dấu hiệu giả mạo; Khuôn mặt không khớp (72.3% < 85%)"
  }
}
```

### **4. Verify License**
```http
POST /api/UserDocument/verify-license
Content-Type: multipart/form-data

Front: [file]
Selfie: [file]

Response: (tương tự verify-cccd)
```

---

## ✅ Checklist triển khai

### **Frontend**
- [x] Tạo `ekycService` với 4 API methods
- [x] Tạo `MyDocumentsScreen.tsx` (hiển thị giấy tờ)
- [x] Tạo `VerifyLicenseScreen.tsx` (upload GPLX)
- [x] Update `VerifyCccdScreen.tsx` (dùng API mới)
- [x] Update `HeaderOwner.tsx` (check status, navigate)
- [x] Update `HeaderDriver.tsx` (check status, navigate)
- [x] Update `HeaderProvider.tsx` (check status, navigate)
- [x] Tạo route `app/(auth)/my-documents.tsx`
- [x] Tạo route `app/(auth)/verify-license.tsx`
- [x] TypeScript compilation: ✅ Pass

### **Backend (Đã có sẵn)**
- [x] API: `check-verified-status`
- [x] API: `my-documents`
- [x] API: `verify-cccd`
- [x] API: `verify-license`
- [x] Auto-approve logic trong `CreateAndVerifyDocumentAsync`
- [x] VNPT eKYC integration

---

## 🚀 Hướng dẫn test

### **Test Case 1: Owner chưa xác thực**
1. Login as Owner
2. Header hiển thị badge "Xác minh tài khoản"
3. Click badge → Navigate to MyDocumentsScreen
4. Card CCCD hiển thị "Chưa có thông tin"
5. Click "Tải lên ngay" → Navigate to VerifyCccdScreen
6. Chụp 3 ảnh (front, back, selfie)
7. Submit → Backend xử lý → Trạng thái ACTIVE hoặc INACTIVE
8. Back to MyDocumentsScreen → Refresh → Hiện kết quả

### **Test Case 2: Driver chưa xác thực GPLX**
1. Login as Driver (đã có CCCD ACTIVE)
2. Header hiển thị badge "Xác minh CCCD & GPLX" (màu đỏ)
3. Click badge → MyDocumentsScreen
4. Card CCCD: ✅ Đã xác thực
5. Card GPLX: "Chưa có thông tin"
6. Click "Tải lên ngay" (trong card GPLX) → VerifyLicenseScreen
7. Chụp 2 ảnh (front GPLX, selfie)
8. Submit → Backend xử lý → Trạng thái ACTIVE
9. Back → Header badge đổi thành "Đã xác minh đầy đủ" (màu xanh)

### **Test Case 3: Giấy tờ bị từ chối**
1. Login as User có giấy tờ INACTIVE/REJECTED
2. MyDocumentsScreen hiển thị:
   - Badge đỏ "Bị từ chối"
   - Box lý do từ chối (background đỏ)
3. Click "Tải lên lại" → Upload screen
4. Chụp lại → Submit → Tạo record mới

---

## 📝 Lưu ý

### **1. Validation**
- CCCD: Bắt buộc 3 ảnh (Front, Back, Selfie)
- GPLX: Chỉ cần 2 ảnh (Front, Selfie)
- Backend sẽ reject nếu thiếu ảnh

### **2. Status Logic**
- `ACTIVE`: Đã duyệt, hiển thị badge xanh
- `INACTIVE`: Chờ duyệt hoặc từ chối, hiển thị badge vàng/đỏ
- `REJECTED`: (không dùng, backend dùng INACTIVE + rejectionReason)

### **3. Driver đặc biệt**
- Cần cả 2: CCCD ACTIVE + GPLX ACTIVE
- Nếu thiếu 1 trong 2 → Badge "Xác minh CCCD & GPLX" (màu đỏ)
- Header hiển thị "Đã xác minh đầy đủ" khi cả 2 ACTIVE

### **4. Auto-approve**
- Backend tự động duyệt nếu:
  - Giấy tờ thật
  - Khớp khuôn mặt >= 85%
  - Không có warning từ VNPT
- Nếu không pass → Status = INACTIVE, có rejectionReason

### **5. Re-upload**
- Cho phép upload lại nếu status != ACTIVE
- Mỗi lần upload tạo record mới (CreatedAt khác nhau)
- Backend lấy record mới nhất (OrderByDescending CreatedAt)

---

## 🎉 Kết quả
✅ Hệ thống xác thực CCCD & GPLX hoàn chỉnh cho 3 role
✅ Auto-approve logic thông minh
✅ UI/UX đẹp, responsive
✅ TypeScript type-safe
✅ Error handling chi tiết
✅ Ready for production!
