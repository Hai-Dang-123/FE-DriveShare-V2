import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { Package, PackageStatus } from "../../../models/types";

interface PackageCardProps {
  pkg: Package;
  onEdit: () => void;
  onDelete: () => void;
  onPost: () => void;
  getStatusColor?: (status: string) => string;
}

// Default status colors (fallback if not provided)
const defaultGetStatusColor = (status: string) => {
  switch (status) {
    case PackageStatus.OPEN:
      return "#10B981"; // Xanh lá
    case PackageStatus.CLOSED:
      return "#6B7280"; // Xám
    case PackageStatus.DELETED:
      return "#EF4444"; // Đỏ
    default:
      return "#F59E0B"; // Cam (Pending)
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "PENDING":
      return "Chờ xử lý";
    case "IN_TRANSIT":
      return "Đang vận chuyển";
    case "DELIVERED":
      return "Đã giao";
    case "COMPLETED":
      return "Hoàn thành";
    case PackageStatus.OPEN:
      return "Đang mở";
    case PackageStatus.CLOSED:
      return "Đã đóng";
    case PackageStatus.DELETED:
      return "Đã xóa";
    default:
      return "Chờ duyệt";
  }
};

const PackageCard: React.FC<PackageCardProps> = ({
  pkg,
  onEdit,
  onDelete,
  onPost,
  getStatusColor,
}) => {
  const {
    title,
    description,
    quantity,
    unit,
    weightKg,
    volumeM3,
    images = [],
    status,
  } = pkg;

  // Chỉ cho phép edit/delete khi status KHÔNG phải PENDING
  const canEditOrDelete = status !== PackageStatus.PENDING;

  // Resolve image URL defensively: packageImages may contain objects with different keys or plain strings
  let imageUrl = "https://via.placeholder.com/400";
  if (images && images.length > 0) {
    const first = images[0];
    if (typeof first === "string") imageUrl = first;
    else if (first) {
      const f: any = first;
      imageUrl =
        f.packageImageURL ??
        f.imageUrl ??
        f.url ??
        f.uri ??
        f.packageImageUrl ??
        imageUrl;
    }
  }

  // Use provided getStatusColor or fallback to default
  const statusColorFn = getStatusColor || defaultGetStatusColor;
  const statusColor = statusColorFn(status);
  const statusLabel = getStatusText(status);

  return (
    <View
      style={[
        styles.card,
        {
          borderColor:
            status === PackageStatus.PENDING ? "#3B82F6" : "transparent",
          borderWidth: status === PackageStatus.PENDING ? 1 : 0,
        },
      ]}
    >
      {/* IMAGE HEADER */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            // eslint-disable-next-line no-console
            console.warn(
              "Package image failed to load, showing placeholder",
              e.nativeEvent?.error
            );
          }}
        />
        {/* Ribbon Status */}
        <View style={[styles.badge, { backgroundColor: statusColor }]}>
          <Text style={styles.badgeText}>{statusLabel}</Text>
        </View>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.desc} numberOfLines={2}>
          {description || "Chưa có mô tả"}
        </Text>

        {/* STATS GRID */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="cube-outline"
              size={16}
              color="#6B7280"
            />
            <Text style={styles.statValue}>
              {quantity} {unit}
            </Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="weight-kilogram"
              size={16}
              color="#6B7280"
            />
            <Text style={styles.statValue}>{weightKg} kg</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="arrow-expand-all"
              size={16}
              color="#6B7280"
            />
            <Text style={styles.statValue}>{volumeM3} m³</Text>
          </View>
        </View>

        {/* FOOTER ACTIONS */}
        <View style={styles.footer}>
          <View style={styles.actionGroup}>
            <TouchableOpacity 
              onPress={onEdit} 
              style={[styles.iconBtn, !canEditOrDelete && styles.iconBtnDisabled]}
              disabled={!canEditOrDelete}
            >
              <Feather name="edit-2" size={16} color={canEditOrDelete ? "#4B5563" : "#D1D5DB"} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onDelete} 
              style={[styles.iconBtn, !canEditOrDelete && styles.iconBtnDisabled]}
              disabled={!canEditOrDelete}
            >
              <Feather name="trash-2" size={16} color={canEditOrDelete ? "#EF4444" : "#D1D5DB"} />
            </TouchableOpacity>
          </View>

          {/* Nút Đăng Tin (chỉ hiện khi Pending) */}
          {/* {status === PackageStatus.PENDING && (
            <TouchableOpacity onPress={onPost} style={styles.postBtn}>
              <Text style={styles.postBtnText}>Đăng tin</Text>
              <Feather name="send" size={12} color="#fff" />
            </TouchableOpacity>
          )} */}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    marginHorizontal: 6,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  imageContainer: {
    height: 120,
    position: "relative",
    backgroundColor: "#F3F4F6",
  },
  image: { width: "100%", height: "100%" },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  content: { padding: 12 },
  title: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 4 },
  desc: { fontSize: 12, color: "#6B7280", marginBottom: 12, height: 32 },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { fontSize: 11, fontWeight: "600", color: "#374151" },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  actionGroup: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDisabled: {
    backgroundColor: "#F9FAFB",
    opacity: 0.5,
  },

  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0284C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  postBtnText: { color: "#fff", fontSize: 11, fontWeight: "600" },
});

export default PackageCard;
