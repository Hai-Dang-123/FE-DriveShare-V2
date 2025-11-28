// --- ENUMS CƠ BẢN ---
export enum Role {
  DRIVER = 'Driver',
  OWNER = 'Owner',
  ADMIN = 'Admin',
  PROVIDER = 'Provider',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

// --- ITEM STATUS ---

export enum ItemStatus {
  PENDING = 'PENDING',
  IN_WAREHOUSE = 'IN_WAREHOUSE',
  PACKAGED = 'PACKAGED',
  IN_USE = 'IN_USE',
}

export enum ImageStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
}

// --- PACKAGE STATUS ---
export enum PackageStatus {
  PENDING = 'PENDING', // Just created, not yet posted for delivery
  OPEN = 'OPEN',       // Posted for delivery, available for drivers
  CLOSED = 'CLOSED',     // A driver has accepted, or the job is finished
  DELETED = 'DELETED',   // Soft delete
}

// --- POST STATUS ---
export enum PostStatus {
  OPEN = 'OPEN',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}




// --- INTERFACES CƠ BẢN ---
export interface User {
  userId: string;
  userName: string;
  email: string;
  phoneNumber: string;
  role: Role;
  userStatus: UserStatus;
  avatarUrl?: string;
}

export interface Provider extends User {
  companyName: string;
  taxCode ?: string;
  bussinessAddress ?: string;
  averageRating ?: number;
}

export interface AuthenticatedUser extends User {
  accessToken: string;
  refreshToken: string;
}
// --- ITEM & PACKAGE INTERFACES ---



export interface ItemImage {
  itemImageId: string;
  itemImageURL: string;
  status: ImageStatus;
}

export interface Item {
  id: string;
  itemName: string;
  description?: string;
  declaredValue?: number;
  currency: string;
  providerId?: string;
  status: ItemStatus;
  images: ItemImage[];
  quantity?: number; // Added: inventory count
  unit?: string; // Added: inventory unit label
}

export interface PackageImage {
  packageImageId: string;
  packageImageURL: string;
  createdAt: string;
  status: ImageStatus;
}

export interface Package {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  unit: string;
  weightKg: number;
  volumeM3: number;
  images: PackageImage[];
  itemId: string;
  status: PackageStatus;
}

export interface ShippingRoute {
  startLocation: string;
  endLocation: string;
  expectedPickupDate: string;
  expectedDeliveryDate: string;
  startTimeToPickup: string;
  endTimeToPickup: string;
  startTimeToDelivery: string;
  endTimeToDelivery: string;
}

// --- VEHICLE ---
export interface VehicleType {
  vehicleTypeId: string;
  vehicleTypeName: string;
  description?: string;
}

export interface VehicleImage {
  vehicleImageId: string;
  imageURL: string;
  caption?: string;
  createdAt?: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  model?: string;
  brand?: string;
  color?: string;
  yearOfManufacture?: number;
  payloadInKg?: number;
  volumeInM3?: number;
  status?: string;
  vehicleType?: VehicleType;
  owner?: { userId: string; fullName?: string; companyName?: string };
  imageUrls?: VehicleImage[];
}

// --- POST PACKAGE ---
export interface FreightPost {
  id: string;
  packageId: string;
  title: string;
  description: string;
  shippingRoute: ShippingRoute;
  status: PostStatus;
  packageDetails: Omit<Package, 'id' | 'itemId' | 'status'>;
  offeredPrice: number;
  providerId?: string;
  shippingRouteId?: string;
}


// models/types.ts (hoặc services/types.ts)

// 🚩 Tóm tắt Hình ảnh (dùng chung)
export interface ImageSummary {
  imageUrl: string;
  // Thêm id nếu cần, dựa trên DTO C# của bạn (ItemImageSummaryDTO)
  itemImageId?: string; 
}

// 🚩 Tóm tắt Item (Hàng hóa)
export interface ItemSummary {
  itemId: string;
  itemName: string;
  description: string;
  declaredValue: number;
  images: string[]; // 🚩 Dựa trên JSON, đây là List<string>
}

// 🚩 Tóm tắt Package (Gói hàng)
export interface PackageSummary {
  packageId: string;
  packageCode: string;
  weight: number;
  volume: number;
  imageUrls: string[]; // 🚩 Thêm hình ảnh package
  items: ItemSummary[]; // 🚩 Chứa danh sách item
}

// 🚩 Tóm tắt Vehicle (Xe)
export interface VehicleSummary {
  vehicleId: string;
  plateNumber: string;
  model: string;
  vehicleTypeName: string;
  imageUrls: string[]; // 🚩 Thêm hình ảnh xe
}

// 🚩 Tóm tắt Owner (Chủ xe)
export interface OwnerSummary {
  ownerId: string;
  fullName: string;
  companyName: string;
  phoneNumber: string;
}

// 🚩 Tóm tắt Route (Lộ trình dự kiến)
export interface RouteDetail {
  startAddress: string;
  endAddress: string;
  estimatedDuration: string; // JSON trả về string "30.00:00:00"
}

// 🚩 Tóm tắt TripRoute (Lộ trình thực tế)
export interface TripRouteSummary {
  distanceKm: number;
  durationMinutes: number;
  routeData: string; // Đây là chuỗi JSON GeoJSON
}

// 🚩 Tóm tắt Provider (Nhà cung cấp)
export interface ProviderSummary {
  providerId: string;
  companyName: string;
  taxCode: string;
  averageRating: number;
}

// 🚩 Tóm tắt Driver (Tài xế)
export interface DriverAssignment {
  driverId: string;
  fullName: string;
  type: string;
  assignmentStatus: string;
  paymentStatus: string;
}

// 🚩 Tóm tắt Contact (Liên hệ)
export interface TripContact {
  tripContactId: string;
  type: 'SENDER' | 'RECEIVER';
  fullName: string;
  phoneNumber: string;
  note?: string;
}

// 🚩 Tóm tắt Contract (Hợp đồng)
export interface ContractSummary {
  contractId: string;
  contractCode: string;
  status: string;
  type: string;
  contractValue: number;
  currency: string;
  effectiveDate?: string;
  expirationDate?: string;
  fileURL?: string;
  // Optional terms when backend includes them (e.g., providerContracts)
  terms?: ContractTermInTripDTO[];
  // UI-only (từ code cũ của bạn)
  signed?: boolean;
  signedAt?: string;
  // Signature states from backend
  ownerSigned?: boolean;
  ownerSignAt?: string;
  counterpartySigned?: boolean;
  counterpartySignAt?: string;
}

// === 🚀 DTO CHÍNH CHO MÀN HÌNH CHI TIẾT ===
export interface TripDetailFullDTO {
  tripId: string;
  tripCode: string;
  status: string;
  createAt: string;
  updateAt: string;
  vehicle: VehicleSummary;
  owner: OwnerSummary;
  shippingRoute: RouteDetail;
  tripRoute: TripRouteSummary;
  provider?: ProviderSummary; // Có thể null
  packages: PackageSummary[]; // 🚩 Dùng DTO chi tiết
  drivers: DriverAssignment[];
  contacts: TripContact[];
  driverContracts: ContractSummary[];
  providerContracts: ContractSummary; // 🚩 Chỉ 1
  // (Các trường khác như Records, Compensations, Issues... có thể thêm vào đây)
}

// --- CONTRACT TERMS (Chi tiết điều khoản trong hợp đồng) ---
export interface ContractTermInTripDTO {
  contractTermId: string;
  content: string;
  order: number;
  contractTemplateId: string;
}

// --- DELIVERY RECORD TERMS ---
export interface DeliveryRecordTermInTripDTO {
  deliveryRecordTermId: string;
  content: string;
  displayOrder: number;
}

// --- DELIVERY RECORD ---
export interface TripDeliveryRecordDTO {
  tripDeliveryRecordId: string;
  recordType: string;
  note?: string;
  createAt: string;
  terms: DeliveryRecordTermInTripDTO[];
}

// --- COMPENSATION ---
export interface TripCompensationDTO {
  tripCompensationId: string;
  reason: string;
  amount: number;
}

// --- DELIVERY ISSUE ---
export interface TripDeliveryIssueDTO {
  tripDeliveryIssueId: string;
  issueType: string;
  description: string;
  status: string;
}

// Extend main DTO with additional collections from backend mapping
export interface TripDetailFullDTOExtended extends TripDetailFullDTO {
  deliveryRecords: TripDeliveryRecordDTO[];
  compensations: TripCompensationDTO[];
  issues: TripDeliveryIssueDTO[];
}



// --- RESPONSE DTO CHUNG ---
export interface ResponseDTO<T = any> {
  statusCode: number;
  message?: string;
  isSuccess: boolean;
  result?: T;
}

// === Provider Trip Summary (from GetAllTripsByProviderAsync) ===
export interface ProviderTripSummary {
  tripId: string;
  tripCode: string;
  status: string;
  createAt: string;
  updateAt: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleType: string;
  ownerName: string;
  ownerCompany: string;
  startAddress: string;
  endAddress: string;
  estimatedDuration: string; // TimeSpan serialized
  packageCodes: string[];
  driverNames: string[];
  tripRouteSummary: string;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}