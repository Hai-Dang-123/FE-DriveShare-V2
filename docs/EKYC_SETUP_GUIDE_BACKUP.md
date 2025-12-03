# 🎉 Hướng Dẫn Sử Dụng Xác Minh CCCD - ĐƠN GIẢN

## ✅ **KHÔNG CẦN CÀI ĐẶT GÌ THÊM!**

Backend đã xử lý toàn bộ VNPT eKYC API, Frontend chỉ việc:
1. Chụp 3 ảnh (mặt trước, mặt sau, chân dung)
2. Upload lên API `/api/UserDocument/upload-identity`
3. Nhận kết quả xác thực

---

## 📱 Cách Sử Dụng

### Cho User:

1. **Vào trang Profile** → Click nút **"Xác minh CCCD"**
2. **Đọc hướng dẫn** → Click **"Bắt đầu xác minh"**
3. **Chụp 3 ảnh**:
   - 📄 Mặt trước CCCD (đủ 4 góc, không lóa)
   - 📄 Mặt sau CCCD (rõ nét)
   - 👤 Ảnh chân dung (nhìn thẳng, không đeo kính)
4. **Xem lại ảnh** → Click **"Xác nhận"**
5. **Đợi xử lý** (3-5 giây)
6. **Nhận kết quả**:
   - ✅ **Thành công** → Badge "Đã xác minh" xuất hiện
   - ❌ **Thất bại** → Thử lại với ảnh rõ hơn

---

## 🛠️ Cho Developer

### Backend đã làm gì?

```csharp
// Backend tự động xử lý:
✅ Lấy token VNPT từ VNPTTokenService
✅ Upload 3 ảnh lên VNPT → Nhận hash
✅ Check giấy tờ thật/giả (Card Liveness)
✅ Bóc tách thông tin (OCR)
✅ So khớp khuôn mặt (Face Compare)
✅ Tự động duyệt nếu:
   - Giấy tờ thật (isRealCard = true)
   - Khớp mặt ≥ 85%
   - Không bị can thiệp (tampering.isLegal = "yes")
✅ Lưu database với status: ACTIVE/INACTIVE
```

### Frontend làm gì?

```typescript
// Frontend chỉ cần:
1. Chụp ảnh bằng ImagePicker
2. Upload FormData với 3 files:
   - front: IFormFile
   - back: IFormFile
   - selfie: IFormFile
3. Nhận response từ API
4. Hiển thị kết quả cho user
```

---

## 📋 API Endpoint

### Upload & Verify CCCD

```http
POST /api/UserDocument/upload-identity
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
- front: File (image/jpeg)
- back: File (image/jpeg)
- selfie: File (image/jpeg)
```

### Response Success (Auto Approved):
```json
{
  "statusCode": 200,
  "message": "Xác thực danh tính thành công.",
  "isSuccess": true,
  "result": {
    "documentId": "guid",
    "fullName": "NGUYỄN VĂN A",
    "identityNumber": "001234567890",
    "status": "APPROVED"
  }
}
```

### Response Failed (Rejected):
```json
{
  "statusCode": 400,
  "message": "Xác thực thất bại. Vui lòng kiểm tra lại giấy tờ và thử lại.",
  "isSuccess": false,
  "result": {
    "reason": "Tự động từ chối. Điểm khớp mặt: 78%, Giấy thật: true, Hợp lệ: no",
    "status": "REJECTED"
  }
}
```

### Check CCCD Status:
```http
GET /api/UserDocument/check-cccd-status
Authorization: Bearer {token}

Response:
{
  "statusCode": 200,
  "isSuccess": true,
  "result": true  // true = đã xác minh, false = chưa
}
```

---

## 🎯 Testing

### Test Flow:

1. **Login** với 1 trong 3 role (Driver/Owner/Provider)
2. **Vào Dashboard** → Click nút **"Xác minh CCCD"**
3. **Chụp CCCD thật** (không dùng ảnh screenshot)
4. **Chụp selfie** với khuôn mặt rõ ràng
5. **Submit** và đợi kết quả

### Test Cases:

| Case | Front | Back | Selfie | Expected Result |
|------|-------|------|--------|-----------------|
| ✅ Hợp lệ | CCCD rõ | CCCD rõ | Khớp mặt | APPROVED |
| ❌ Ảnh mờ | Mờ | Rõ | Khớp | REJECTED (ảnh không đủ chất lượng) |
| ❌ Không khớp | Rõ | Rõ | Người khác | REJECTED (face match < 85%) |
| ❌ Giả mạo | CCCD giả | CCCD giả | Khớp | REJECTED (isRealCard = false) |

---

## 🔒 Security

✅ **Backend xử lý token** → Frontend KHÔNG cần config VNPT token  
✅ **URI validation** → Chỉ chấp nhận local file từ ImagePicker  
✅ **FormData upload** → Bảo mật multipart/form-data  
✅ **JWT Authorization** → Chỉ user đã login mới upload được  
✅ **Auto approval rules** → Nghiêm ngặt: giấy thật + khớp mặt ≥ 85%

---

## ❓ Troubleshooting

### 1. "Xác thực thất bại" với lý do "Điểm khớp mặt thấp"
**Nguyên nhân**: Ảnh selfie không giống ảnh trên CCCD  
**Giải pháp**:
- Chụp selfie ở nơi sáng
- Nhìn thẳng vào camera
- Không đeo kính/mũ
- Không makeup quá đậm

### 2. "Xác thực thất bại" với lý do "Giấy tờ không hợp lệ"
**Nguyên nhân**: CCCD bị lóa, mờ, hoặc thiếu góc  
**Giải pháp**:
- Đặt CCCD trên nền tối
- Đảm bảo đủ 4 góc trong khung hình
- Không bị lóa đèn flash

### 3. "Lỗi hệ thống"
**Nguyên nhân**: Backend không kết nối được VNPT API  
**Giải pháp**: Kiểm tra token VNPT trong backend

---

## 📊 Flow Chart

```
User Click "Xác minh CCCD"
         ↓
Instruction Screen (Đọc hướng dẫn)
         ↓
Capture Screen (Chụp 3 ảnh)
         ↓
Review Screen (Xem lại)
         ↓
Upload to Backend API
         ↓
Backend Process:
  1. Upload VNPT → Get Hash
  2. Check Liveness → isRealCard
  3. OCR → Extract info
  4. Face Compare → Match score
  5. Auto Approve/Reject
         ↓
Response to Frontend
         ↓
✅ Success → Navigate back + Show badge
❌ Failed → Show error + Retry button
```

---

## ✅ Checklist

- [x] Backend xử lý VNPT API
- [x] Frontend chụp ảnh và upload
- [x] Auto approval logic
- [x] Error handling
- [x] Security validation
- [x] UI/UX professional
- [x] Documentation complete

---

## 🎉 Summary

**ĐƠN GIẢN HÓA HOÀN TOÀN!**

- ❌ **KHÔNG** cần cài VNPT SDK trên Frontend
- ❌ **KHÔNG** cần config token trên Frontend
- ❌ **KHÔNG** cần Native Module Android
- ❌ **KHÔNG** cần Web SDK scripts

✅ **CHỈ CẦN**: Chụp ảnh → Upload → Nhận kết quả!

Backend đã lo hết! 🚀
