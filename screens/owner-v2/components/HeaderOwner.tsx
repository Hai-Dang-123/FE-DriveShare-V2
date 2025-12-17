import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Modal,
  Alert,
} from "react-native";
import {
  MaterialCommunityIcons,
  FontAwesome5,
  Ionicons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNotification } from "@/hooks/useNotification";
import { useAuthStore } from "@/stores/authStore";

interface HeaderProps {
  owner: any | null | undefined;
}

const { width } = Dimensions.get("window");

const HeaderOwner: React.FC<HeaderProps> = ({ owner }) => {
  const router = useRouter();
  const { unreadCount } = useNotification();
  const { logout } = useAuthStore();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const o = owner as any;
  // support payload that may be wrapped in `result`, or attached as `profile`, or be the profile directly
  const profile = o?.profile ?? o?.result ?? o ?? {};

  const name = profile?.fullName || profile?.userName || "Nguyễn Văn An";
  const company = profile?.companyName || profile?.company || "Chưa có dữ liệu";
  const avatar = profile?.avatarUrl || profile?.AvatarUrl || null;
  const email = profile?.email || "Chưa có dữ liệu";
  const phone = profile?.phoneNumber || "Chưa có dữ liệu";
  const taxCode = profile?.taxCode || profile?.tax_number || null;
  const status = (profile?.status || "").toString();

  // Get verification status from profile
  const hasVerifiedCitizenId = profile?.hasVerifiedCitizenId ?? false;

  // Logic lấy chữ cái đầu
  const initials = name
    ? name
        .split(" ")
        .map((s: string) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CX";

  const handleVerifyDocuments = () => {
    router.push("/owner/my-documents");
  };

  const handleLogout = async () => {
    setShowSettingsMenu(false);
    
    try {
      // Gọi authStore.logout() - nó sẽ tự gọi API với token rồi xóa data
      await logout();
      router.replace("/(auth)/login" as any);
    } catch (error) {
      console.error("Logout error:", error);
      // Vẫn redirect về login nếu có lỗi
      router.replace("/(auth)/login" as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Background Image Section */}
      <ImageBackground
        // 👇 SỬA Ở ĐÂY: Dùng require và trỏ đúng đường dẫn tương đối
        source={require("../../../assets/header-bg.png")}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.9 }}
      >
        <View style={styles.topOverlay}>
          {/* Top Icons */}
          <View style={styles.topIconContainer}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/notifications")}
            >
              <MaterialCommunityIcons
                name="bell-outline"
                size={28}
                color="#FFFFFF"
              />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowSettingsMenu(!showSettingsMenu)}
            >
              <Ionicons name="settings-outline" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Settings Dropdown Menu */}
          {showSettingsMenu && (
            <View style={styles.settingsDropdown}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                <Text style={styles.dropdownItemText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ImageBackground>

      {/* 2. Floating Info Card */}
      <View style={styles.floatingCardWrapper}>
        <View style={styles.floatingCard}>
          {/* Avatar nằm đè lên ranh giới */}
          <View style={styles.avatarWrapper}>
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarInitialsContainer}>
                <Text style={styles.avatarInitialsText}>{initials}</Text>
              </View>
            )}
          </View>

          {/* Thông tin User */}
          <View style={styles.infoContent}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{name}</Text>
              {/* status indicator: ACTIVE -> check, otherwise X */}
              {status && status.toUpperCase() === "ACTIVE" ? (
                <View
                  style={[styles.verifiedIcon, { backgroundColor: "#10B981" }]}
                >
                  <Text
                    style={{ color: "white", fontSize: 12, fontWeight: "bold" }}
                  >
                    ✓
                  </Text>
                </View>
              ) : (
                <View
                  style={[styles.verifiedIcon, { backgroundColor: "#EF4444" }]}
                >
                  <Text
                    style={{ color: "white", fontSize: 12, fontWeight: "bold" }}
                  >
                    ✕
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.profileCompany}>{company}</Text>
            {taxCode ? (
              <Text style={styles.profileCompany}>MST: {taxCode}</Text>
            ) : null}
            <Text style={styles.profileContact}>
              {email} • {phone}
            </Text>

            {/* Nút xác minh CCCD */}
            {hasVerifiedCitizenId ? (
              <TouchableOpacity
                style={styles.verifyBadge}
                onPress={handleVerifyDocuments}
              >
                <MaterialCommunityIcons
                  name="shield-check"
                  size={16}
                  color="#047857"
                />
                <Text style={styles.verifyText}>Đã xác minh CCCD</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.unverifiedBadge}
                onPress={handleVerifyDocuments}
              >
                <MaterialCommunityIcons
                  name="shield-alert"
                  size={16}
                  color="#2563EB"
                />
                <Text style={styles.unverifiedText}>Xác minh CCCD</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10, // Tạo khoảng cách để card không bị dính vào phần dưới
  },
  backgroundImage: {
    width: "100%",
    height: 220, // Increase header background height
    justifyContent: "flex-start",
  },
  topOverlay: {
    paddingTop: 44, // Tránh tai thỏ
    paddingHorizontal: 20,
  },
  topIconContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  iconButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.22)", // Nền mờ cho icon
    borderRadius: 22,
  },
  topIcon: {
    // kept for compatibility; icons now use explicit size/color props
    color: "#FFFFFF",
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: "#EF4444", // Đỏ
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },

  // Floating Card Styles
  floatingCardWrapper: {
    alignItems: "center",
    marginTop: -70, // Kéo card lên đè vào ảnh bìa (more overlap)
    paddingHorizontal: 16,
  },
  floatingCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    alignItems: "center",
    paddingTop: 56, // Chừa chỗ cho larger avatar
    paddingBottom: 20,
    paddingHorizontal: 16,
    // Shadow đẹp
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },

  // Avatar Styles
  avatarWrapper: {
    position: "absolute",
    top: -56, // Đẩy avatar lên trên đỉnh card
    alignSelf: "center",
    padding: 6,
    backgroundColor: "#FFFFFF", // Viền trắng bao quanh avatar
    borderRadius: 64,
  },
  avatarImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  avatarInitialsContainer: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  avatarInitialsText: {
    fontSize: 36,
    fontWeight: "800",
    color: "#4F46E5",
  },

  // Info Styles
  infoContent: {
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  verifiedIcon: {
    width: 16,
    height: 16,
    backgroundColor: "#10B981", // Xanh lá
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCompany: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 2,
    textAlign: "center",
  },
  profileContact: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    textAlign: "center",
  },
  verifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    borderWidth: 1,
    borderColor: "#34D399",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    gap: 6,
  },
  verifyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#047857",
  },
  unverifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    gap: 6,
  },
  unverifiedText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  // Settings Dropdown
  settingsDropdown: {
    position: "absolute",
    top: 55,
    right: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 160,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#EF4444",
  },
});

export default HeaderOwner;
