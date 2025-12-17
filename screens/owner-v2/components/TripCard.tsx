// import React from 'react'
// import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
// import { useRouter } from 'expo-router'
// import { MapPinIcon, CalendarDaysIcon, ArrowLongRightIcon, EyeIcon } from '@/screens/provider-v2/icons/ActionIcons'

// // 🚩 Bỏ DTO vì nó không khớp với JSON API bạn cung cấp
// // import { TripDetailFullDTO } from '@/models/types'

// interface Props {
//   // 🚩 Dùng 'any' vì data JSON không khớp với DTO cũ
//   trip: any
//   onView?: (tripId: string) => void
// }

// // 🚩 [LÀM ĐẸP] Helper để format chữ status cho đẹp
// const formatStatus = (status: string) => {
//   if (!status) return { text: 'N/A', style: styles.statusWrapDefault }

//   switch (status.toUpperCase()) {
//     case 'CREATED':
//       return { text: 'Mới tạo', style: styles.statusWrapInfo }
//     case 'IN_PROGRESS':
//       return { text: 'Đang chạy', style: styles.statusWrapWarning }
//     case 'COMPLETED':
//       return { text: 'Hoàn thành', style: styles.statusWrapSuccess }
//     case 'CANCELLED':
//       return { text: 'Đã hủy', style: styles.statusWrapError }
//     default:
//       return { text: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(), style: styles.statusWrapDefault }
//   }
// }

// const TripCard: React.FC<Props> = ({ trip, onView }) => {
//   const router = useRouter()

//   const handleView = (id?: string) => {
//     if (!id) return
//     try {
//       router.push(`/(owner)/trip/${id}`)
//     } catch (e) {
//       onView?.(id)
//     }
//   }

//   // 🚩 [LÀM ĐẸP] Lấy thông tin status đã format
//   const statusInfo = formatStatus(trip.status)

//   // 🚩 [SỬA LỖI] Lấy danh sách codes/names từ mảng string, không phải mảng object
//   const packageList = Array.isArray(trip.packageCodes) && trip.packageCodes.length > 0
//     ? trip.packageCodes.join(', ')
//     : 'Chưa gán'

//   const driverList = Array.isArray(trip.driverNames) && trip.driverNames.length > 0
//     ? trip.driverNames.join(', ')
//     : 'Chưa gán'

//   return (
//     <View style={styles.card}>
// <View style={styles.rowTop}>
// <View style={{ flex: 1 }}>
// <Text style={styles.title}>{trip.tripCode ?? 'Mã: -'}</Text>
// <Text style={styles.sub}>
//             {/* 🚩 [SỬA LỖI] Lấy data phẳng, không phải data lồng nhau */}
//             {trip.vehicleModel ?? trip.vehicleType ?? 'N/A'} • {trip.vehiclePlate ?? 'N/A'}
//           </Text>
// </View>
//         {/* 🚩 [LÀM ĐẸP] Dùng style động cho status */}
//         <View style={[styles.statusWrapBase, statusInfo.style]}>
// <Text style={styles.statusText}>{statusInfo.text}</Text>
// </View>
// </View>
// <View style={styles.infoRow}>
// <MapPinIcon style={styles.icon} />
//         {/* 🚩 [SỬA LỖI] Lấy data phẳng từ trip.startAddress */}
//         <Text style={styles.infoText} numberOfLines={1}>{trip.startAddress ?? 'N/A'}</Text>
// </View>
// <View style={styles.infoRow}>
// <ArrowLongRightIcon style={styles.icon} />
//         {/* 🚩 [SỬA LỖI] Lấy data phẳng từ trip.endAddress */}
//         <Text style={styles.infoText} numberOfLines={1}>{trip.endAddress ?? 'N/A'}</Text>
// </View>
// <View style={styles.infoRow}>
// <CalendarDaysIcon style={styles.icon} />
//         {/* 🚩 [SỬA LỖI] Dùng tripRouteSummary vì nó có sẵn & logic cũ của bạn sai.
//           🚩 [SỬA LỖI] Bỏ các khoảng trắng/xuống dòng thừa để tránh lỗi "Unexpected text node"
//         */}
//         <Text style={styles.infoText}>{trip.tripRouteSummary ?? 'Chưa có thông tin tuyến'}</Text>
// </View>
// <View style={styles.metaRow}>
// <Text style={styles.metaLabel}>Gói hàng:</Text>
//         {/* 🚩 [SỬA LỖI] Hiển thị packageList đã xử lý */}
//         <Text style={styles.metaValue} numberOfLines={1}>{packageList}</Text>
// </View>
// <View style={styles.metaRow}>
// <Text style={styles.metaLabel}>Tài xế:</Text>
//         {/* 🚩 [SỬA LỖI] Hiển thị driverList đã xử lý */}
//         <Text style={styles.metaValue} numberOfLines={1}>{driverList}</Text>
// </View>
// <View style={styles.actions}>
// <TouchableOpacity onPress={() => handleView(trip?.tripId)} style={styles.actionBtn} accessibilityLabel="Xem chi tiết">
// <EyeIcon style={{ width: 18, height: 18, color: '#4F46E5' }} />
// </TouchableOpacity>
// </View>
// </View>
//   )
// }

// const styles = StyleSheet.create({
//   card: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 16, // Tăng padding cho đẹp hơn
//     borderWidth: 1,
//     borderColor: '#E5E7EB', // Đổi màu border
//     marginBottom: 12,
//     shadowColor: "#000", // Thêm shadow
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   rowTop: {
//     flexDirection: 'row',
//     alignItems: 'flex-start', // Đổi thành flex-start
//     marginBottom: 12, // Tăng margin
//   },
//   title: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: '#111827',
//     marginBottom: 2, // Thêm margin
//   },
//   sub: {
//     color: '#6B7280',
//     fontSize: 13
//   },
//   // 🚩 [LÀM ĐẸP] Tách style nền và chữ
//   statusWrapBase: {
//     marginLeft: 12,
//     paddingHorizontal: 10, // Tăng padding
//     paddingVertical: 4,
//     borderRadius: 99,
//   },
//   statusText: {
//     fontWeight: '600',
//     color: '#fff', // Đổi màu chữ thành trắng
//     fontSize: 12
//   },
//   // 🚩 [LÀM ĐẸP] Thêm các style cho status
//   statusWrapInfo: { // CREATED
//     backgroundColor: '#3B82F6', // Blue
//   },
//   statusWrapSuccess: { // COMPLETED
//     backgroundColor: '#10B981', // Green
//   },
//   statusWrapWarning: { // IN_PROGRESS
//     backgroundColor: '#F59E0B', // Amber
//   },
//   statusWrapError: { // CANCELLED
//     backgroundColor: '#EF4444', // Red
//   },
//   statusWrapDefault: { // N/A
//     backgroundColor: '#6B7280', // Gray
//   },
//   // ---
//   infoRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10, // Tăng gap
//     marginTop: 8, // Tăng margin
//   },
//   icon: {
//     width: 16,
//     height: 16,
//     color: '#6B7280',
//     flexShrink: 0, // Không cho icon bị co lại
//   },
//   infoText: {
//     color: '#374151',
//     flex: 1,
//     fontSize: 13
//   },
//   metaRow: {
//     flexDirection: 'row',
//     marginTop: 10, // Tăng margin
//     borderTopWidth: 1,
//     borderColor: '#F3F4F6',
//     paddingTop: 10,
//   },
//   metaLabel: {
//     fontWeight: '600',
//     marginRight: 6,
//     color: '#374151',
//     fontSize: 13
//   },
//   metaValue: {
//     color: '#6B7280',
//     flex: 1,
//     fontSize: 13,
//     textAlign: 'right', // Cho value căn phải
//   },
//   actions: {
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//     marginTop: 12,
//     borderTopWidth: 1,
//     borderColor: '#F3F4F6',
//     paddingTop: 12,
//   },
//   actionBtn: {
//     padding: 8,
//     borderRadius: 8,
//     backgroundColor: '#EEF2FF'
//   },
// })

// // 🚩 [SỬA LỖI] Bỏ dấu chấm '.'
// export default TripCard

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface Props {
  trip: any;
  onView?: (tripId: string) => void;
  onCancel?: (tripId: string, tripCode: string) => void;
  cancelling?: boolean;
}

// Helper format status
const getStatusStyle = (status: string) => {
  if (!status)
    return { text: "N/A", color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB" };

  const s = status.toUpperCase();
  switch (s) {
    case "CREATED":
    case "AWAITING_PROVIDER_CONTRACT":
    case "AWAITING_PROVIDER_PAYMENT":
      return {
        text: "Đang chờ",
        color: "#D97706",
        bg: "#FFFBEB",
        border: "#F59E0B",
      }; // Cam
    case "IN_PROGRESS":
    case "VEHICLE_HANDOVER":
    case "LOADING":
    case "DELIVERED":
      return {
        text: "Đang chạy",
        color: "#059669",
        bg: "#ECFDF5",
        border: "#10B981",
      }; // Xanh lá
    case "COMPLETED":
      return {
        text: "Hoàn thành",
        color: "#1E3A8A",
        bg: "#EFF6FF",
        border: "#3B82F6",
      }; // Xanh dương
    case "CANCELLED":
      return {
        text: "Đã hủy",
        color: "#DC2626",
        bg: "#FEF2F2",
        border: "#EF4444",
      }; // Đỏ
    default:
      return {
        text: status,
        color: "#374151",
        bg: "#F3F4F6",
        border: "#9CA3AF",
      };
  }
};

const TripCard: React.FC<Props> = ({ trip, onView, onCancel, cancelling }) => {
  const router = useRouter();

  const handleView = () => {
    if (onView) {
      onView(trip.tripId);
    } else {
      try {
        router.push(`/(owner)/trip/${trip.tripId}`);
      } catch (e) {
        console.warn("Nav error", e);
      }
    }
  };

  const handleCancel = (e: any) => {
    e.stopPropagation();
    console.log("🚫 Cancel button clicked!");
    console.log("Trip ID:", trip.tripId);
    console.log("Trip Code:", trip.tripCode);
    console.log("onCancel exists?", !!onCancel);
    console.log("cancelling?", cancelling);

    if (onCancel && !cancelling) {
      console.log("✅ Calling onCancel...");
      onCancel(trip.tripId, trip.tripCode);
    } else {
      console.log(
        "❌ onCancel not called. Reason:",
        !onCancel ? "onCancel undefined" : "already cancelling"
      );
    }
  };

  const statusInfo = getStatusStyle(trip.status);

  // Check if trip can be cancelled
  const canCancel = [
    "AWAITING_PROVIDER_CONTRACT",
    "AWAITING_PROVIDER_PAYMENT",
    "PENDING_DRIVER_ASSIGNMENT",
  ].includes(trip.status?.toUpperCase());

  // Format danh sách gói hàng / tài xế
  const packageText =
    Array.isArray(trip.packageCodes) && trip.packageCodes.length > 0
      ? `${trip.packageCodes.length} gói hàng`
      : "Chưa có gói";

  const driverText =
    Array.isArray(trip.driverNames) && trip.driverNames.length > 0
      ? trip.driverNames.join(", ")
      : "Chưa gán tài xế";

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: statusInfo.border }]}
      onPress={handleView}
      activeOpacity={0.9}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tripCode}>{trip.tripCode || "TRIP-###"}</Text>
          <View style={styles.vehicleRow}>
            <MaterialCommunityIcons
              name="truck-outline"
              size={14}
              color="#6B7280"
            />
            <Text style={styles.vehicleText}>
              {trip.vehiclePlate
                ? `${trip.vehiclePlate} • ${trip.vehicleType || ""}`
                : "Chưa gán xe"}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* ROUTE */}
      <View style={styles.routeContainer}>
        <View style={styles.routeRow}>
          <MaterialCommunityIcons
            name="circle-slice-8"
            size={16}
            color="#0284C7"
          />
          <Text style={styles.routeText} numberOfLines={1}>
            {trip.startAddress || "Điểm đi"}
          </Text>
        </View>
        <View style={styles.connector}>
          <View style={styles.dashedLine} />
        </View>
        <View style={styles.routeRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color="#EF4444" />
          <Text style={styles.routeText} numberOfLines={1}>
            {trip.endAddress || "Điểm đến"}
          </Text>
        </View>
      </View>

      {/* SUMMARY */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>
          {trip.tripRouteSummary || "Đang cập nhật lộ trình..."}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* FOOTER INFO */}
      <View style={styles.footer}>
        <View style={styles.metaItem}>
          <Feather name="package" size={14} color="#6B7280" />
          <Text style={styles.metaText}>{packageText}</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="user" size={14} color="#6B7280" />
          <Text style={[styles.metaText, { maxWidth: 100 }]} numberOfLines={1}>
            {driverText}
          </Text>
        </View>

        {/* Cancel Button - chỉ hiện khi có thể hủy */}
        {canCancel && onCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={cancelling}
          >
            <Feather
              name="x-circle"
              size={14}
              color={cancelling ? "#9CA3AF" : "#EF4444"}
            />
            <Text
              style={[styles.cancelText, cancelling && { color: "#9CA3AF" }]}
            >
              {cancelling ? "Đang hủy..." : "Hủy"}
            </Text>
          </TouchableOpacity>
        )}

        {/* View Button */}
        <TouchableOpacity style={styles.viewBtn} onPress={handleView}>
          <Feather name="chevron-right" size={18} color="#0284C7" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4, // Màu trạng thái bên trái
    borderColor: "transparent", // Reset các cạnh khác
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tripCode: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  vehicleRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  vehicleText: { fontSize: 12, color: "#6B7280" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },

  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 },

  routeContainer: { gap: 0 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeText: { fontSize: 14, color: "#374151", flex: 1, fontWeight: "500" },
  connector: {
    marginLeft: 7,
    height: 14,
    borderLeftWidth: 1,
    borderLeftColor: "#E5E7EB",
    borderStyle: "dashed",
    marginVertical: 2,
  },
  dashedLine: { width: 1, height: "100%" },

  summaryBox: {
    marginTop: 8,
    backgroundColor: "#F9FAFB",
    padding: 8,
    borderRadius: 6,
  },
  summaryText: { fontSize: 12, color: "#6B7280", fontStyle: "italic" },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, color: "#6B7280" },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
  },
  cancelText: { fontSize: 12, fontWeight: "600", color: "#EF4444" },
  viewBtn: {
    marginLeft: "auto",
    padding: 4,
    backgroundColor: "#F0F9FF",
    borderRadius: 20,
  },
});

export default TripCard;
