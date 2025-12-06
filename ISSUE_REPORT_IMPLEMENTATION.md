# Chức Năng Báo Cáo Sự Cố Hàng Hóa (Issue Report)

## Tổng Quan

Đã triển khai chức năng báo cáo sự cố hàng hóa cho tài xế khi thực hiện **biên bản giao hàng PICKUP**. Tài xế có thể báo cáo các vấn đề như hàng hư hỏng, thiếu hàng, sai hàng, hoặc giao trễ với ảnh minh chứng.

## API Backend

### Endpoint: `POST /api/TripDeliveryIssue/create`

**DTO (Data Transfer Object):**
```csharp
public class TripDeliveryIssueCreateDTO
{
    public Guid TripId { get; set; }
    public Guid? DeliveryRecordId { get; set; }
    public DeliveryIssueType IssueType { get; set; }
    public string Description { get; set; }
    public List<string> ImageUrls { get; set; }
}

public enum DeliveryIssueType
{
    DAMAGED,    // Hàng hư hỏng
    LOST,       // Thiếu hàng
    LATE,       // Giao trễ
    WRONG_ITEM  // Sai hàng
}
```

**Response:**
```json
{
  "statusCode": 201,
  "message": "Báo cáo sự cố thành công.",
  "isSuccess": true,
  "result": {
    "IssueId": "guid-here"
  }
}
```

## Frontend Implementation

### 1. Service Layer (`services/tripDeliveryIssueService.ts`)

**Exports:**
- `DeliveryIssueType` enum (DAMAGED, LOST, LATE, WRONG_ITEM)
- `TripDeliveryIssueCreateDTO` interface
- `tripDeliveryIssueService` object với 2 methods:
  - `reportIssue(dto)`: Gửi báo cáo sự cố
  - `uploadIssueImage(imageUri)`: Upload ảnh minh chứng

**Key Features:**
- Sử dụng FormData để gửi multipart/form-data
- Hỗ trợ multiple image URLs
- Error handling với console.error

### 2. UI Components (Driver Screen)

#### State Management

```typescript
// Issue Report Modal State
const [showIssueReportModal, setShowIssueReportModal] = useState(false);
const [issueType, setIssueType] = useState<DeliveryIssueType>(DeliveryIssueType.DAMAGED);
const [issueDescription, setIssueDescription] = useState("");
const [issueImages, setIssueImages] = useState<string[]>([]);
const [submittingIssue, setSubmittingIssue] = useState(false);
```

#### Handler Functions

1. **handleOpenIssueReport()**: Mở modal và reset form
2. **handlePickIssueImage()**: Chọn ảnh từ thư viện (sử dụng `expo-image-picker`)
3. **handleRemoveIssueImage(index)**: Xóa ảnh đã chọn
4. **handleSubmitIssueReport()**: 
   - Validate description
   - Upload tất cả ảnh lên server
   - Gọi API tạo issue report
   - Hiển thị thông báo thành công/lỗi

#### UI Elements

**1. Report Issue Button (trong Delivery Record Modal Footer):**
```tsx
{/* Chỉ hiển thị cho PICKUP records */}
{(activeDeliveryRecord.recordType === "PICKUP" || 
  activeDeliveryRecord.type === "PICKUP") && (
  <TouchableOpacity
    style={styles.reportIssueButton}
    onPress={handleOpenIssueReport}
  >
    <MaterialIcons name="report-problem" size={20} color="#DC2626" />
    <Text style={styles.reportIssueButtonText}>Báo cáo sự cố</Text>
  </TouchableOpacity>
)}
```

**2. Issue Report Modal:**
- **Header**: Tiêu đề + nút đóng
- **Content**:
  - **Issue Type Selection**: 4 loại sự cố với icon và label
  - **Description Input**: TextInput multiline (bắt buộc)
  - **Image Upload**: Nút thêm ảnh + preview grid
- **Footer**: Nút "Hủy" và "Gửi báo cáo"

### 3. Styling

#### Button Styles
```typescript
reportIssueButton: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#FEF2F2",  // Light red
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#FCA5A5",      // Red border
  gap: 6,
}
```

#### Modal Styles
- **issueReportModal**: 90% width, 80% max height, rounded corners
- **issueTypeButton**: Grid layout, 48% min width, active state với red theme
- **imagePreview**: 80x80 với remove button overlay

## User Flow

### Tài Xế (Driver)

1. **Xem Biên Bản PICKUP**:
   - Vào màn hình Trip Detail
   - Chọn biên bản giao hàng PICKUP
   - Modal hiển thị với nút "Báo cáo sự cố"

2. **Báo Cáo Sự Cố**:
   - Nhấn "Báo cáo sự cố"
   - Chọn loại sự cố (Hàng hư hỏng, Thiếu hàng, Sai hàng, Giao trễ)
   - Nhập mô tả chi tiết (bắt buộc)
   - Thêm ảnh minh chứng (tùy chọn)
   - Nhấn "Gửi báo cáo"

3. **Kết Quả**:
   - Success: Alert "Đã báo cáo sự cố thành công"
   - Error: Alert với message lỗi
   - Modal tự động đóng sau khi thành công

## Technical Details

### Dependencies Added
```typescript
import tripDeliveryIssueService, { DeliveryIssueType } from "@/services/tripDeliveryIssueService";
import * as ImagePicker from "expo-image-picker";
```

### Permissions
- `expo-image-picker` yêu cầu quyền truy cập thư viện ảnh
- Xử lý trong `handlePickIssueImage()` với `requestMediaLibraryPermissionsAsync()`

### Validation
- **Mô tả**: Bắt buộc, kiểm tra `.trim()` không rỗng
- **Ảnh**: Tùy chọn, tối đa không giới hạn (nhưng nên thêm limit trong production)
- **Loại sự cố**: Required (default là DAMAGED)

### Error Handling
- Network errors: Hiển thị Alert với error message
- Image upload failure: Log error nhưng không block toàn bộ submission
- Validation errors: Alert trước khi gọi API

## Security

### Snyk Scan Results
- ✅ **tripDeliveryIssueService.ts**: 0 vulnerabilities
- ✅ TypeScript compilation: 0 errors

### Data Security
- Sử dụng FormData cho multipart uploads
- Image URLs được validate trước khi upload
- API endpoint yêu cầu authentication (`[Authorize]`)

## Files Modified

1. **Created**: `services/tripDeliveryIssueService.ts` (75 lines)
2. **Modified**: `screens/driver-v2/DriverTripDetailScreen-v2.tsx`
   - Added imports (lines 35-37)
   - Added state (lines 887-891)
   - Added handlers (lines 874-966)
   - Added UI button (lines 3868-3877)
   - Added modal (lines 4239-4343)
   - Added styles (lines 5348-5472)

## Testing Checklist

- [ ] Hiển thị nút "Báo cáo sự cố" chỉ cho PICKUP records
- [ ] Chọn được các loại sự cố khác nhau
- [ ] Nhập mô tả và validate bắt buộc
- [ ] Thêm nhiều ảnh từ thư viện
- [ ] Xóa ảnh đã chọn
- [ ] Submit thành công và nhận response
- [ ] Error handling khi network fail
- [ ] Permissions handling cho image picker
- [ ] Modal đóng sau khi submit thành công
- [ ] UI responsive trên các screen sizes

## Future Enhancements

1. **Image Compression**: Nén ảnh trước khi upload để tối ưu bandwidth
2. **Image Limit**: Giới hạn số lượng ảnh (ví dụ: tối đa 5 ảnh)
3. **Image Validation**: Kiểm tra kích thước và định dạng file
4. **Take Photo**: Thêm tùy chọn chụp ảnh trực tiếp (ngoài chọn từ thư viện)
5. **Offline Support**: Lưu draft báo cáo khi offline
6. **Issue History**: Xem lịch sử báo cáo sự cố của trip
7. **Issue Status Tracking**: Theo dõi trạng thái xử lý sự cố (REPORTED, RESOLVED, etc.)
8. **Notification**: Thông báo cho owner/contact khi có sự cố mới

## Notes

- Chức năng này chỉ dành cho **PICKUP records**, không áp dụng cho DROPOFF
- Tài xế có thể báo cáo sự cố **bất cứ lúc nào** khi xem biên bản PICKUP
- Ảnh minh chứng là **optional** nhưng nên khuyến khích tài xế chụp ảnh
- Backend cần implement endpoint upload image riêng (`/api/upload/image`)

## Completion Status

✅ Service layer created  
✅ UI components integrated  
✅ Styling completed  
✅ TypeScript compilation passed  
✅ Security scan passed  
✅ Documentation created
