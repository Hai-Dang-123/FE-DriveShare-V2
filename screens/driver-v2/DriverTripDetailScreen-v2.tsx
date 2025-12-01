import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Dimensions,
  Image,
  StatusBar,
  Modal,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
// import * as Speech from 'expo-speech'
// import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'
import * as Speech from "expo-speech";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";

// Services & Utils
import tripService from "@/services/tripService";
import vietmapService from "@/services/vietmapService";
import tripProviderContractService from "@/services/tripProviderContractService";
import { useAuth } from "@/hooks/useAuth";

import VietMapUniversal from "@/components/map/VietMapUniversal";
import NavigationHUD from "@/components/map/NavigationHUD";
import driverWorkSessionService from "@/services/driverWorkSessionService";
import {
  extractRouteWithSteps,
  nearestCoordIndex,
  remainingDistanceFrom,
  haversine,
  formatMeters,
} from "@/utils/navigation";
import {
  smoothSpeed,
  formatSpeed,
  calculateArrivalTime,
} from "@/utils/navigation-metrics";

// --- Types ---
// (Giữ nguyên các interface cũ để đảm bảo tính tương thích)
interface TripDetailAPIResponse {
  statusCode: number;
  message: string;
  isSuccess: boolean;
  result: TripDetailData;
}
interface ContractTermInfo {
  contractTermId: string;
  content: string;
  order: number;
  contractTemplateId?: string;
}
interface DriverContractInfo {
  contractId: string;
  contractCode: string;
  status: string;
  type: string;
  contractValue: number;
  currency: string;
  effectiveDate?: string | null;
  expirationDate?: string | null;
  fileURL?: string | null;
  terms: ContractTermInfo[];
  ownerSigned?: boolean;
  ownerSignAt?: string | null;
  counterpartySigned?: boolean;
  counterpartySignAt?: string | null;
  counterpartyId?: string;
}
interface TripDetailData {
  tripId: string;
  tripCode: string;
  status: string;
  createAt: string;
  updateAt: string;
  vehicle: VehicleInfo;
  owner: OwnerInfo;
  shippingRoute: ShippingRouteInfo;
  tripRoute: TripRouteInfo;
  provider: ProviderInfo;
  packages: PackageInfo[];
  drivers: DriverInfo[];
  contacts: ContactInfo[];
  deliveryRecords: DeliveryRecordInfo[];
  compensations: any[];
  issues: any[];
  driverContracts?: DriverContractInfo[];
}
interface VehicleInfo {
  vehicleId: string;
  plateNumber: string;
  model: string;
  vehicleTypeName: string;
  imageUrls: string[];
}
interface OwnerInfo {
  ownerId: string;
  fullName: string;
  companyName: string;
  phoneNumber: string;
}
interface ShippingRouteInfo {
  startAddress: string;
  endAddress: string;
  estimatedDuration: string;
}
interface TripRouteInfo {
  distanceKm: number;
  durationMinutes: number;
  routeData: string;
}
interface ProviderInfo {
  providerId: string;
  companyName: string;
  taxCode: string;
  averageRating: number;
}
interface PackageInfo {
  packageId: string;
  packageCode: string;
  weight: number;
  volume: number;
  imageUrls: string[];
  items: ItemInfo[];
}
interface ItemInfo {
  itemId: string;
  itemName: string;
  description: string;
  declaredValue: number;
  images: string[];
}
interface DriverInfo {
  driverId: string;
  fullName: string;
  type: "PRIMARY" | "SECONDARY";
  assignmentStatus: string;
  paymentStatus: string;
}
interface ContactInfo {
  tripContactId: string;
  type: "SENDER" | "RECEIVER";
  fullName: string;
  phoneNumber: string;
  note?: string;
}
interface DeliveryRecordInfo {
  tripDeliveryRecordId: string;
  recordType: "PICKUP" | "DROPOFF";
  note: string;
  createAt: string;
  terms: DeliveryTermInfo[];
  driverSigned?: boolean;
  contactSigned?: boolean;
}
interface DeliveryTermInfo {
  deliveryRecordTermId: string;
  content: string;
  displayOrder: number;
}
type JourneyPhase = "TO_PICKUP" | "TO_DELIVERY" | "COMPLETED";
type Position = [number, number];

// --- Helper Components ---

const StatusPill = ({ value }: { value: string }) => {
  const config = useMemo(() => {
    const map: Record<string, any> = {
      CREATED: { color: "#3B82F6", bg: "#EFF6FF", label: "Mới tạo" },
      PENDING: { color: "#F59E0B", bg: "#FFFBEB", label: "Đang xử lý" },
      IN_PROGRESS: { color: "#8B5CF6", bg: "#F5F3FF", label: "Đang chạy" },
      COMPLETED: { color: "#10B981", bg: "#ECFDF5", label: "Hoàn thành" },
      CANCELLED: { color: "#EF4444", bg: "#FEF2F2", label: "Đã hủy" },
      READY_FOR_VEHICLE_HANDOVER: {
        color: "#0EA5E9",
        bg: "#E0F2FE",
        label: "Chờ nhận xe",
      },
      AWAITING_OWNER_CONTRACT: {
        color: "#D97706",
        bg: "#FEF3C7",
        label: "Chờ ký hợp đồng",
      },
    };
    return map[value] || { color: "#6B7280", bg: "#F3F4F6", label: value };
  }, [value]);
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: config.bg, borderColor: config.color },
      ]}
    >
      <Text style={[styles.pillText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

const SectionHeader = ({ icon, title }: { icon: any; title: string }) => (
  <View style={styles.sectionHeaderContainer}>
    <View style={styles.sectionIconBox}>{icon}</View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const KeyValue = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <View style={styles.kvRow}>
    <Text style={styles.kvLabel}>{label}</Text>
    <Text style={styles.kvValue}>{value}</Text>
  </View>
);

const DriverTripDetailScreenV2: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams() as { tripId?: string };
  const tripId = params.tripId;

  // --- State ---
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<TripDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const myDriverContract = useMemo(() => {
    if (!trip || !user) return null;
    return (
      (trip.driverContracts || []).find(
        (c: DriverContractInfo) =>
          String(c.counterpartyId) === String(user.userId)
      ) || null
    );
  }, [trip, user]);

  // Contract signing UI state
  const [showContractModal, setShowContractModal] = useState(false);
  const [showDigitalSignatureTerms, setShowDigitalSignatureTerms] =
    useState(false);
  const [showContractOtpModal, setShowContractOtpModal] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const otpInputsRef = useRef<Array<TextInput | null>>([]);
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [signingContract, setSigningContract] = useState(false);
  // Delivery record signing flow state
  const [showDeliverySignFlowModal, setShowDeliverySignFlowModal] =
    useState(false);
  const [showDeliveryOtpModal, setShowDeliveryOtpModal] = useState(false);
  const [deliveryOtpDigits, setDeliveryOtpDigits] = useState<string[]>(
    Array(6).fill("")
  );
  const deliveryOtpInputsRef = useRef<Array<TextInput | null>>([]);
  const [deliveryOtpSentTo, setDeliveryOtpSentTo] = useState<string | null>(
    null
  );
  const [deliverySigningInProgress, setDeliverySigningInProgress] =
    useState(false);

  const handleSendContractOtp = async () => {
    if (!myDriverContract?.contractId)
      return Alert.alert("Lỗi", "Không có hợp đồng để ký");
    // Hiển thị modal điều khoản chữ ký số trước
    setShowDigitalSignatureTerms(true);
  };

  const handleAcceptDigitalSignatureTerms = async () => {
    if (!myDriverContract?.contractId) return;
    setShowDigitalSignatureTerms(false);
    setSigningContract(true);
    try {
      const res: any = await tripProviderContractService.sendSignOtp(
        myDriverContract.contractId
      );
      const ok = res?.isSuccess ?? res?.statusCode === 200;
      if (!ok) {
        Alert.alert("Lỗi", res?.message || "Không thể gửi mã xác nhận");
        return;
      }
      const sentTo =
        res?.result?.sentTo || res?.result?.email || res?.message || null;
      setOtpSentTo(sentTo);
      setOtpDigits(Array(6).fill(""));
      setShowContractOtpModal(true);
      setTimeout(() => otpInputsRef.current?.[0]?.focus?.(), 200);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể gửi mã xác nhận");
    } finally {
      setSigningContract(false);
    }
  };

  /**
   * Start navigation when trip is already MOVING_TO_PICKUP and we should
   * navigate to the shippingRoute.startAddress (a textual address).
   * This will geocode the startAddress and plan route from current pos -> that address,
   * store it in `pickupRouteCoords` and start navigation using the pickup route.
   */
  const startNavigationToPickupAddress = async () => {
    if (startingNav || !trip) return;
    setStartingNav(true);
    // Ensure eligibility is fresh
    if (!eligibility) await loadEligibilityAndSession();
    if (eligibility && !eligibility.canDrive) {
      setStartingNav(false);
      return Alert.alert(
        "Không đủ điều kiện",
        eligibility.message || "Bạn không đủ điều kiện lái xe hiện tại"
      );
    }
    const contHours = continuousSeconds / 3600;
    if (contHours >= 4) {
      setStartingNav(false);
      return Alert.alert(
        "Ngừng",
        "Bạn đã lái quá 4 giờ liên tục, hãy nghỉ trước khi tiếp tục"
      );
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted")
        throw new Error("Cần quyền vị trí để dẫn đường.");

      const now = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const currentPosition: Position = [
        now.coords.longitude,
        now.coords.latitude,
      ];
      setCurrentPos(currentPosition);

      const addr = trip.shippingRoute?.startAddress;
      if (!addr) throw new Error("Không tìm thấy địa chỉ điểm lấy hàng");

      // Try to geocode the start address
      let geocoded: Position | null = null;
      try {
        const results = await vietmapService.searchAddress(
          addr,
          currentPosition
        );
        if (results && results.length)
          geocoded = results[0].coordinates as Position;
      } catch (e) {
        console.warn("Geocode failed", e);
      }

      const pickupPoint =
        geocoded ||
        (routeCoords && routeCoords.length
          ? (routeCoords[0] as Position)
          : undefined);
      if (!pickupPoint)
        throw new Error("Không thể xác định toạ độ điểm lấy hàng");

      try {
        const planned = await vietmapService.planBetweenPoints(
          currentPosition,
          pickupPoint,
          "car"
        );
        console.debug(
          "[DriverTripDetail] startNavigationToPickupAddress planned pts=",
          planned?.coordinates?.length
        );
        if (planned.coordinates?.length) {
          const coerced = planned.coordinates.map((c: any) => [
            Number(c[0]),
            Number(c[1]),
          ]) as [number, number][];
          // store both as pickupRouteCoords (for toggling) and as routeCoords (so fullscreen navigation uses it)
          setPickupRouteCoords(coerced);
          setRouteCoords(coerced);
          console.debug(
            "[DriverTripDetail] startNavigationToPickupAddress applied routeCoords len=",
            coerced.length
          );
          setVisibleRoute("toPickup");
          if (planned.instructions) setRouteInstructions(planned.instructions);

          // Call backend to start driver work session. If it fails, don't start navigation.
          try {
            const resp: any = await driverWorkSessionService.start({
              TripId: trip.tripId,
            });
            if (!(resp?.isSuccess ?? resp?.statusCode === 200)) {
              Alert.alert(
                "Lỗi",
                resp?.message || "Không thể bắt đầu phiên làm việc"
              );
              setPickupRouteCoords(null);
              return;
            }
            // backend returns created DriverWorkSessionId in resp.result
            const sid =
              resp?.result?.DriverWorkSessionId ?? resp?.result ?? null;
            if (sid) setDriverSessionId(String(sid));
            // Start local continuous timer behavior: start counting from zero.
            setActiveSessionStart(new Date());
            setContinuousSeconds(0);
            setStoppedSeconds(0);
            setIsSessionRunning(true);
            setSessionPaused(false);
            // refresh eligibility/totals
            loadEligibilityAndSession();
          } catch (e: any) {
            console.warn("[DriverTripDetail] start session failed", e);
            Alert.alert(
              "Lỗi",
              e?.message || "Không thể bắt đầu phiên làm việc"
            );
            setPickupRouteCoords(null);
            return;
          }
        }
      } catch (e) {
        console.warn("Plan to pickup (address) failed", e);
      }

      setNavActive(true);
      setCanConfirmPickup(true);
      setJourneyPhase("TO_PICKUP");
      setStartModalOpen(false);
      startLocationWatcher();
      try {
        Speech.speak("Bắt đầu dẫn đường đến điểm lấy hàng", {
          language: "vi-VN",
        });
      } catch {}
    } catch (error: any) {
      Alert.alert("Lỗi", error?.message || "Không thể bắt đầu dẫn đường");
    } finally {
      setStartingNav(false);
    }
  };

  const startNavigationToDeliveryAddress = async () => {
    if (startingNav || !trip) return;
    setStartingNav(true);
    // Ensure eligibility is fresh
    if (!eligibility) await loadEligibilityAndSession();
    if (eligibility && !eligibility.canDrive) {
      setStartingNav(false);
      return Alert.alert(
        "Không đủ điều kiện",
        eligibility.message || "Bạn không đủ điều kiện lái xe hiện tại"
      );
    }
    const contHours = continuousSeconds / 3600;
    if (contHours >= 4) {
      setStartingNav(false);
      return Alert.alert(
        "Ngừng",
        "Bạn đã lái quá 4 giờ liên tục, hãy nghỉ trước khi tiếp tục"
      );
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted")
        throw new Error("Cần quyền vị trí để dẫn đường.");

      const now = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const currentPosition: Position = [
        now.coords.longitude,
        now.coords.latitude,
      ];
      setCurrentPos(currentPosition);

      const addr = trip.shippingRoute?.endAddress;
      // fallback to route end point if address geocode fails
      let geocoded: Position | null = null;
      try {
        if (addr) {
          const results = await vietmapService.searchAddress(
            addr,
            currentPosition
          );
          if (results && results.length)
            geocoded = results[0].coordinates as Position;
        }
      } catch (e) {
        console.warn("Geocode delivery failed", e);
      }

      const deliveryPoint =
        geocoded ||
        endPoint ||
        (routeCoords && routeCoords.length
          ? (routeCoords[routeCoords.length - 1] as Position)
          : undefined);
      if (!deliveryPoint)
        throw new Error("Không thể xác định toạ độ điểm giao hàng");

      try {
        const planned = await vietmapService.planBetweenPoints(
          currentPosition,
          deliveryPoint,
          "car"
        );
        console.debug(
          "[DriverTripDetail] startNavigationToDeliveryAddress planned pts=",
          planned?.coordinates?.length
        );
        if (planned.coordinates?.length) {
          const coerced = planned.coordinates.map((c: any) => [
            Number(c[0]),
            Number(c[1]),
          ]) as [number, number][];
          setDeliveryRouteCoords(coerced);
          setRouteCoords(coerced);
          console.debug(
            "[DriverTripDetail] startNavigationToDeliveryAddress applied routeCoords len=",
            coerced.length
          );
          setVisibleRoute("toDelivery");
          if (planned.instructions) setRouteInstructions(planned.instructions);

          // Call backend to start driver work session. If it fails, don't start navigation.
          try {
            const resp: any = await driverWorkSessionService.start({
              TripId: trip.tripId,
            });
            if (!(resp?.isSuccess ?? resp?.statusCode === 200)) {
              Alert.alert(
                "Lỗi",
                resp?.message || "Không thể bắt đầu phiên làm việc"
              );
              setDeliveryRouteCoords(null);
              return;
            }
            const sid =
              resp?.result?.DriverWorkSessionId ?? resp?.result ?? null;
            if (sid) setDriverSessionId(String(sid));
            setActiveSessionStart(new Date());
            setContinuousSeconds(0);
            setStoppedSeconds(0);
            setIsSessionRunning(true);
            setSessionPaused(false);
            loadEligibilityAndSession();
          } catch (e: any) {
            console.warn("[DriverTripDetail] start session failed", e);
            Alert.alert(
              "Lỗi",
              e?.message || "Không thể bắt đầu phiên làm việc"
            );
            setDeliveryRouteCoords(null);
            return;
          }
        }
      } catch (e) {
        console.warn("Plan to delivery (address) failed", e);
      }

      setNavActive(true);
      setCanConfirmDelivery(true);
      setJourneyPhase("TO_DELIVERY");
      setStartModalOpen(false);
      startLocationWatcher();
      try {
        Speech.speak("Bắt đầu dẫn đường đến điểm giao hàng", {
          language: "vi-VN",
        });
      } catch {}
    } catch (error: any) {
      Alert.alert("Lỗi", error?.message || "Không thể bắt đầu dẫn đường");
    } finally {
      setStartingNav(false);
    }
  };

  const handleOtpChange = (index: number, text: string) => {
    if (!/^[0-9]*$/.test(text)) return;
    const val = text.slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
    if (val && index < 5) {
      otpInputsRef.current[index + 1]?.focus?.();
    }
  };

  const handleOtpKeyPress = (index: number, e: any) => {
    if (e.nativeEvent.key === "Backspace") {
      if (otpDigits[index] === "" && index > 0) {
        otpInputsRef.current[index - 1]?.focus?.();
        setOtpDigits((prev) => {
          const next = [...prev];
          next[index - 1] = "";
          return next;
        });
      } else {
        setOtpDigits((prev) => {
          const next = [...prev];
          next[index] = "";
          return next;
        });
      }
    }
  };

  const handleDeliveryOtpChange = (index: number, text: string) => {
    if (!/^[0-9]*$/.test(text)) return;
    const val = text.slice(-1);
    setDeliveryOtpDigits((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
    if (val && index < 5) deliveryOtpInputsRef.current[index + 1]?.focus?.();
  };

  const handleDeliveryOtpKeyPress = (index: number, e: any) => {
    if (e.nativeEvent.key === "Backspace") {
      if (deliveryOtpDigits[index] === "" && index > 0) {
        deliveryOtpInputsRef.current[index - 1]?.focus?.();
        setDeliveryOtpDigits((prev) => {
          const next = [...prev];
          next[index - 1] = "";
          return next;
        });
      } else {
        setDeliveryOtpDigits((prev) => {
          const next = [...prev];
          next[index] = "";
          return next;
        });
      }
    }
  };

  const submitContractOtp = async () => {
    const otp = otpDigits.join("");
    if (otp.length < 6) return Alert.alert("OTP", "Vui lòng nhập đủ 6 chữ số");
    if (!myDriverContract?.contractId) return;
    setSigningContract(true);
    try {
      const dto = { ContractId: myDriverContract.contractId, Otp: otp };
      const res: any = await tripProviderContractService.signContract(dto);
      const ok = res?.isSuccess ?? res?.statusCode === 200;
      if (!ok) {
        Alert.alert("Ký thất bại", res?.message || "Mã OTP không hợp lệ");
        return;
      }
      Alert.alert("Thành công", "Ký hợp đồng thành công");
      setShowContractOtpModal(false);
      setShowContractModal(false);
      fetchTripData();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Có lỗi khi xác thực OTP");
    } finally {
      setSigningContract(false);
    }
  };

  const resendContractOtp = async () => {
    if (!myDriverContract?.contractId) return;
    try {
      const res: any = await tripProviderContractService.sendSignOtp(
        myDriverContract.contractId
      );
      const ok = res?.isSuccess ?? res?.statusCode === 200;
      if (ok) {
        const sentTo = res?.result?.sentTo || res?.message || null;
        setOtpSentTo(sentTo);
        Alert.alert("Đã gửi", "Mã xác nhận đã được gửi lại");
        setOtpDigits(Array(6).fill(""));
        setTimeout(() => otpInputsRef.current?.[0]?.focus?.(), 200);
      } else {
        Alert.alert("Lỗi", res?.message || "Không thể gửi lại mã");
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể gửi lại mã");
    }
  };

  // Delivery signing: send OTP for delivery record
  const sendDeliverySignOtp = async () => {
    if (!activeDeliveryRecord)
      return Alert.alert("Lỗi", "Không có biên bản để ký");
    setDeliverySigningInProgress(true);
    try {
      const res: any = await tripService.sendSignOtp(
        activeDeliveryRecord.tripDeliveryRecordId
      );
      const ok = res?.isSuccess ?? res?.statusCode === 200;
      if (!ok) {
        Alert.alert("Lỗi", res?.message || "Không thể gửi mã xác nhận");
        return;
      }
      const sentTo = res?.result?.sentTo || res?.message || null;
      setDeliveryOtpSentTo(sentTo);
      setDeliveryOtpDigits(Array(6).fill(""));
      setShowDeliverySignFlowModal(false);
      setShowDeliveryOtpModal(true);
      setTimeout(() => deliveryOtpInputsRef.current?.[0]?.focus?.(), 200);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể gửi mã xác nhận");
    } finally {
      setDeliverySigningInProgress(false);
    }
  };

  const resendDeliveryOtp = async () => {
    if (!activeDeliveryRecord) return;
    try {
      const res: any = await tripService.sendSignOtp(
        activeDeliveryRecord.tripDeliveryRecordId
      );
      const ok = res?.isSuccess ?? res?.statusCode === 200;
      if (ok) {
        const sentTo = res?.result?.sentTo || res?.message || null;
        setDeliveryOtpSentTo(sentTo);
        Alert.alert("Đã gửi", "Mã xác nhận đã được gửi lại");
        setDeliveryOtpDigits(Array(6).fill(""));
        setTimeout(() => deliveryOtpInputsRef.current?.[0]?.focus?.(), 200);
      } else {
        Alert.alert("Lỗi", res?.message || "Không thể gửi lại mã");
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể gửi lại mã");
    }
  };

  const submitDeliveryOtp = async () => {
    const otp = deliveryOtpDigits.join("");
    if (otp.length < 6) return Alert.alert("OTP", "Vui lòng nhập đủ 6 chữ số");
    if (!activeDeliveryRecord) return;
    setDeliverySigningInProgress(true);
    try {
      const dto = {
        DeliveryRecordId: activeDeliveryRecord.tripDeliveryRecordId,
        Otp: otp,
      };
      const res: any = await tripService.signDeliveryRecord(dto);
      const ok = res?.isSuccess ?? res?.statusCode === 200;
      if (!ok) {
        Alert.alert("Ký thất bại", res?.message || "Mã OTP không hợp lệ");
        return;
      }
      showToast("Ký biên bản thành công");
      setShowDeliveryOtpModal(false);
      // refresh record and trip
      const fresh = await tripService.getDeliveryRecordForDriver(
        activeDeliveryRecord.tripDeliveryRecordId
      );
      if (fresh?.isSuccess) {
        setActiveDeliveryRecord(fresh.result);
        // If both parties signed or record status completed, close the delivery modal and refresh trip
        const bothSigned = !!(
          fresh.result.driverSigned && fresh.result.contactSigned
        );
        const completedStatus =
          fresh.result.status &&
          String(fresh.result.status).toUpperCase() === "COMPLETED";
        if (bothSigned || completedStatus) {
          showToast("Biên bản đã hoàn tất");
          setDeliveryModalOpen(false);
        }
      }
      await fetchTripData();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Có lỗi khi xác thực OTP");
    } finally {
      setDeliverySigningInProgress(false);
    }
  };

  // Navigation UI State
  const [navActive, setNavActive] = useState(false);
  const [navMinimized, setNavMinimized] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [startingNav, setStartingNav] = useState(false);

  // Delivery Record Modal State
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [activeDeliveryRecord, setActiveDeliveryRecord] = useState<any | null>(
    null
  );
  const [loadingDeliveryRecord, setLoadingDeliveryRecord] = useState(false);
  const [signatureInProgress, setSignatureInProgress] = useState(false);
  const [pickupMarked, setPickupMarked] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const PICKUP_MARK_KEY = (id?: string) => `trip:${id}:pickupMarked`;

  // --- Persist Logic ---
  const markPickup = async (val: boolean) => {
    try {
      setPickupMarked(val);
      if (tripId)
        await AsyncStorage.setItem(PICKUP_MARK_KEY(tripId), val ? "1" : "0");
    } catch (e) {
      console.warn("persist pickupMarked failed", e);
    }
  };

  const loadPickupMarked = async () => {
    try {
      if (!tripId) return;
      const v = await AsyncStorage.getItem(PICKUP_MARK_KEY(tripId));
      setPickupMarked(!!v && v === "1");
    } catch (e) {
      console.warn("load pickupMarked failed", e);
    }
  };

  // --- Route & GPS State ---
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [pickupRouteCoords, setPickupRouteCoords] = useState<
    [number, number][] | null
  >(null);
  const [deliveryRouteCoords, setDeliveryRouteCoords] = useState<
    [number, number][] | null
  >(null);
  const [startPoint, setStartPoint] = useState<[number, number] | undefined>();
  const [endPoint, setEndPoint] = useState<[number, number] | undefined>();
  const [routeInstructions, setRouteInstructions] = useState<any[]>([]);
  const [journeyPhase, setJourneyPhase] = useState<JourneyPhase>("TO_PICKUP");
  const [canConfirmPickup, setCanConfirmPickup] = useState(false);
  const [canConfirmDelivery, setCanConfirmDelivery] = useState(false);
  const [currentPos, setCurrentPos] = useState<Position | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);
  const [nearestIdx, setNearestIdx] = useState<number>(0);
  const [remaining, setRemaining] = useState<number>(0);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [eta, setEta] = useState<string>("--:--");
  const [visibleRoute, setVisibleRoute] = useState<
    "overview" | "toPickup" | "toDelivery"
  >("overview");
  const [driverSessionId, setDriverSessionId] = useState<string | null>(null);
  const [sessionPaused, setSessionPaused] = useState<boolean>(false);
  const [eligibility, setEligibility] = useState<{
    canDrive: boolean;
    message?: string;
    hoursToday?: number;
    hoursWeek?: number;
  } | null>(null);
  const [activeSessionStart, setActiveSessionStart] = useState<Date | null>(
    null
  );
  const [continuousSeconds, setContinuousSeconds] = useState<number>(0);
  const [isSessionRunning, setIsSessionRunning] = useState<boolean>(false);
  const eligibilityTimerRef = useRef<any | null>(null);
  const [baseHoursToday, setBaseHoursToday] = useState<number>(0);
  const [baseHoursWeek, setBaseHoursWeek] = useState<number>(0);
  const continuousTimerRef = useRef<any | null>(null);
  const stoppedTimerRef = useRef<any | null>(null);
  const [stoppedSeconds, setStoppedSeconds] = useState<number>(0);

  const watchSubRef = useRef<any | null>(null);
  const previousSpeedRef = useRef<number>(0);

  // --- Effects ---
  useEffect(() => {
    if (!tripId) {
      setError("Trip không hợp lệ");
      setLoading(false);
      return;
    }
    fetchTripData();
    loadPickupMarked();
    // load initial eligibility (day/week totals)
    loadEligibilityAndSession();
    // start polling every 60s to refresh eligibility
    eligibilityTimerRef.current = setInterval(() => {
      loadEligibilityAndSession();
    }, 60 * 1000);
    return () => {
      if (eligibilityTimerRef.current)
        clearInterval(eligibilityTimerRef.current);
    };
  }, [tripId]);

  const loadEligibilityAndSession = async () => {
    try {
      const resp: any = await driverWorkSessionService.checkEligibility();
      const data = resp?.result ?? resp;
      const can = data?.CanDrive ?? data?.canDrive ?? true;
      const hoursToday =
        Number(
          data?.HoursDrivenToday ??
            data?.hoursDrivenToday ??
            data?.HoursDrivenThisDay ??
            0
        ) || 0;
      const hoursWeek =
        Number(data?.HoursDrivenThisWeek ?? data?.hoursDrivenThisWeek ?? 0) ||
        0;
      setEligibility({
        canDrive: !!can,
        message: data?.Message ?? data?.message,
        hoursToday,
        hoursWeek,
      });
    } catch (e) {
      console.warn("[DriverTripDetail] load eligibility failed", e);
    }

    // We do not auto-detect active session from history anymore.
    // The continuous timer is driven only by Start/End API calls (isSessionRunning).
    // Update base hours from eligibility so UI totals = base + running session time.
    if (eligibility) {
      setBaseHoursToday(eligibility.hoursToday ?? 0);
      setBaseHoursWeek(eligibility.hoursWeek ?? 0);
    }
  };

  // Tick continuous seconds every second while there's an active session and it's not paused
  useEffect(() => {
    if (continuousTimerRef.current) {
      clearInterval(continuousTimerRef.current);
      continuousTimerRef.current = null;
    }
    if (isSessionRunning && !sessionPaused) {
      continuousTimerRef.current = setInterval(() => {
        setContinuousSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (continuousTimerRef.current) {
        clearInterval(continuousTimerRef.current);
        continuousTimerRef.current = null;
      }
    };
  }, [activeSessionStart, sessionPaused]);

  // Count stopped/paused seconds while session is paused
  useEffect(() => {
    if (stoppedTimerRef.current) {
      clearInterval(stoppedTimerRef.current);
      stoppedTimerRef.current = null;
    }
    if (sessionPaused && navActive) {
      stoppedTimerRef.current = setInterval(() => {
        setStoppedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (stoppedTimerRef.current) {
        clearInterval(stoppedTimerRef.current);
        stoppedTimerRef.current = null;
      }
    };
  }, [sessionPaused, navActive]);
  const fetchTripData = async () => {
    try {
      const res = (await tripService.getById(tripId!)) as TripDetailAPIResponse;
      if (!res?.isSuccess || res?.statusCode !== 200)
        throw new Error(res?.message || "Lỗi tải chuyến");

      const data = res.result;
      setTrip(data);

      if (data?.tripRoute?.routeData) {
        const { coords } = extractRouteWithSteps(data.tripRoute.routeData);
        setRouteCoords(coords as [number, number][]);
        if (coords.length > 0) {
          setStartPoint(coords[0] as [number, number]);
          setEndPoint(coords[coords.length - 1] as [number, number]);
        }
      }
    } catch (e: any) {
      setError(e?.message || "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  // --- Navigation Logic ---
  const startNavigation = async () => {
    if (startingNav || !trip) return;
    if (trip.status !== "READY_FOR_VEHICLE_HANDOVER") {
      if (trip.status === "PENDING_DRIVER_ASSIGNMENT") {
        Alert.alert(
          "Chưa sẵn sàng",
          "Đang chờ chủ đơn xác nhận hoàn thành chuyến."
        );
      } else {
        Alert.alert(
          "Chưa sẵn sàng",
          "Trạng thái chuyến chưa cho phép bắt đầu dẫn đường."
        );
      }
      return;
    }
    // check eligibility before starting
    if (!eligibility) await loadEligibilityAndSession();
    if (eligibility && !eligibility.canDrive) {
      return Alert.alert(
        "Không đủ điều kiện",
        eligibility.message || "Bạn không đủ điều kiện lái xe hiện tại"
      );
    }
    const contHours = continuousSeconds / 3600;
    if (contHours >= 4) {
      return Alert.alert(
        "Ngừng",
        "Bạn đã lái quá 4 giờ liên tục, hãy nghỉ trước khi tiếp tục"
      );
    }

    setStartingNav(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted")
        throw new Error("Cần quyền vị trí để dẫn đường.");

      const now = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const currentPosition: Position = [
        now.coords.longitude,
        now.coords.latitude,
      ];
      setCurrentPos(currentPosition);

      // Determine which route user is focusing on. If 'toPickup' or 'toDelivery' and we already have the planned route, use it.
      const routeToUse =
        visibleRoute === "toPickup" &&
        pickupRouteCoords &&
        pickupRouteCoords.length > 1
          ? pickupRouteCoords
          : visibleRoute === "toDelivery" &&
            deliveryRouteCoords &&
            deliveryRouteCoords.length > 1
          ? deliveryRouteCoords
          : routeCoords;

      // If user is focusing on pickup but we don't have its planned route yet, plan from current position -> pickup point
      if (
        visibleRoute === "toPickup" &&
        (!pickupRouteCoords || pickupRouteCoords.length < 2)
      ) {
        const pickupPoint =
          routeCoords && routeCoords.length
            ? (routeCoords[0] as [number, number])
            : undefined;
        if (pickupPoint) {
          try {
            const planned = await vietmapService.planBetweenPoints(
              currentPosition,
              pickupPoint,
              "car"
            );
            if (planned.coordinates?.length) {
              const coerced = planned.coordinates.map((c: any) => [
                Number(c[0]),
                Number(c[1]),
              ]) as [number, number][];
              setPickupRouteCoords(coerced);
              if (planned.instructions)
                setRouteInstructions(planned.instructions);
            }
          } catch (e) {
            console.warn("Plan to pickup failed", e);
          }
        }
      }

      // If focusing on delivery and we don't have a planned delivery route yet, plan it from current pos -> delivery point
      if (
        visibleRoute === "toDelivery" &&
        (!deliveryRouteCoords || deliveryRouteCoords.length < 2)
      ) {
        const deliveryPoint =
          endPoint ||
          (routeCoords && routeCoords.length
            ? (routeCoords[routeCoords.length - 1] as [number, number])
            : undefined);
        if (deliveryPoint) {
          try {
            const planned = await vietmapService.planBetweenPoints(
              currentPosition,
              deliveryPoint,
              "car"
            );
            if (planned.coordinates?.length) {
              const coerced = planned.coordinates.map((c: any) => [
                Number(c[0]),
                Number(c[1]),
              ]) as [number, number][];
              setDeliveryRouteCoords(coerced);
              if (planned.instructions)
                setRouteInstructions(planned.instructions);
            }
          } catch (e) {
            console.warn("Plan to delivery failed", e);
          }
        }
      }

      // Start navigation using the selected route (if available). We copy it into routeCoords so navigation uses it.
      const effectiveRoute =
        visibleRoute === "toPickup" &&
        pickupRouteCoords &&
        pickupRouteCoords.length > 1
          ? pickupRouteCoords
          : visibleRoute === "toDelivery" &&
            deliveryRouteCoords &&
            deliveryRouteCoords.length > 1
          ? deliveryRouteCoords
          : routeCoords;
      if (effectiveRoute && effectiveRoute.length > 1) {
        setRouteCoords(effectiveRoute);
      }

      // (route planning for the selected route has already been handled above)

      setNavActive(true);
      // Set journey phase and confirm button depending on which route user started
      if (visibleRoute === "toDelivery") {
        setCanConfirmDelivery(true);
        setJourneyPhase("TO_DELIVERY");
      } else {
        setCanConfirmPickup(true); // For demo/testing simplicity
        setJourneyPhase("TO_PICKUP");
      }
      setStartModalOpen(false);
      startLocationWatcher();
      try {
        if (visibleRoute === "toDelivery")
          Speech.speak("Bắt đầu dẫn đường đến điểm giao hàng", {
            language: "vi-VN",
          });
        else
          Speech.speak("Bắt đầu dẫn đường đến điểm lấy hàng", {
            language: "vi-VN",
          });
      } catch {}
    } catch (error: any) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setStartingNav(false);
    }
  };

  const handleShowOverview = () => {
    setVisibleRoute("overview");
  };

  const handleShowPickup = async () => {
    // If pickup route already planned, just show it
    if (pickupRouteCoords && pickupRouteCoords.length > 1) {
      setVisibleRoute("toPickup");
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted")
        throw new Error("Cần quyền vị trí để tính tuyến đến điểm lấy hàng.");
      const now = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const currentPosition: Position = [
        now.coords.longitude,
        now.coords.latitude,
      ];

      const pickupPoint =
        routeCoords && routeCoords.length ? (routeCoords[0] as Position) : null;
      if (!pickupPoint)
        return Alert.alert("Lỗi", "Không thể xác định toạ độ điểm lấy hàng");

      const planned = await vietmapService.planBetweenPoints(
        currentPosition,
        pickupPoint,
        "car"
      );
      if (planned?.coordinates?.length) {
        const coerced = planned.coordinates.map((c: any) => [
          Number(c[0]),
          Number(c[1]),
        ]) as [number, number][];
        setPickupRouteCoords(coerced);
        if (planned.instructions) setRouteInstructions(planned.instructions);
        setVisibleRoute("toPickup");
      }
    } catch (e: any) {
      console.warn("[DriverTripDetail] handleShowPickup failed", e);
      Alert.alert(
        "Lỗi",
        e?.message || "Không thể tính tuyến đến điểm lấy hàng"
      );
    }
  };

  const handleShowDelivery = async () => {
    // If delivery route already planned, just show it
    if (deliveryRouteCoords && deliveryRouteCoords.length > 1) {
      setVisibleRoute("toDelivery");
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted")
        throw new Error("Cần quyền vị trí để tính tuyến đến điểm giao hàng.");
      const now = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const currentPosition: Position = [
        now.coords.longitude,
        now.coords.latitude,
      ];

      const deliveryPoint =
        endPoint ||
        (routeCoords && routeCoords.length
          ? (routeCoords[routeCoords.length - 1] as Position)
          : null);
      if (!deliveryPoint)
        return Alert.alert("Lỗi", "Không thể xác định toạ độ điểm giao hàng");

      const planned = await vietmapService.planBetweenPoints(
        currentPosition,
        deliveryPoint,
        "car"
      );
      if (planned?.coordinates?.length) {
        const coerced = planned.coordinates.map((c: any) => [
          Number(c[0]),
          Number(c[1]),
        ]) as [number, number][];
        setDeliveryRouteCoords(coerced);
        if (planned.instructions) setRouteInstructions(planned.instructions);
        setVisibleRoute("toDelivery");
      }
    } catch (e: any) {
      console.warn("[DriverTripDetail] handleShowDelivery failed", e);
      Alert.alert(
        "Lỗi",
        e?.message || "Không thể tính tuyến đến điểm giao hàng"
      );
    }
  };

  const startLocationWatcher = async () => {
    if (watchSubRef.current) {
      try {
        const s: any = watchSubRef.current;
        if (typeof s.remove === "function") s.remove();
      } catch (e) {}
      watchSubRef.current = null;
    }

    interface LocationObjectCoords {
      longitude: number;
      latitude: number;
      heading?: number;
      speed?: number;
    }

    interface LocationObject {
      coords: LocationObjectCoords;
    }

    type WatchPositionCallback = (loc: LocationObject) => void;

    watchSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 1000,
      },
      (loc: any) => {
        const pos: Position = [loc.coords.longitude, loc.coords.latitude];
        setCurrentPos(pos);
        if (loc.coords.heading) setCurrentHeading(loc.coords.heading);

        // Calculate progress
        if (routeCoords.length) {
          const nearest = nearestCoordIndex(pos, routeCoords);
          const idx = (nearest && (nearest.index ?? nearest)) as number;
          setNearestIdx(idx);
          const rem = remainingDistanceFrom(idx, routeCoords, pos);
          setRemaining(rem);
          setEta(calculateArrivalTime(rem));

          const speed = loc.coords.speed ?? previousSpeedRef.current ?? 0;
          const smooth = smoothSpeed(speed, previousSpeedRef.current);
          previousSpeedRef.current = speed;
          setCurrentSpeed(smooth);

          // Proximity checks
          const dest =
            journeyPhase === "TO_PICKUP"
              ? routeCoords[0]
              : routeCoords[routeCoords.length - 1];
          if (haversine(pos, dest) <= 50) {
            if (journeyPhase === "TO_PICKUP") setCanConfirmPickup(true);
            else setCanConfirmDelivery(true);
          }
        }
      }
    );
  };

  const stopNavigation = async () => {
    if (watchSubRef.current) {
      try {
        const s: any = watchSubRef.current;
        if (typeof s.remove === "function") s.remove();
      } catch (e) {}
      watchSubRef.current = null;
    }
    setNavActive(false);
    setNavMinimized(false);
    setNavHidden(false);
    try {
      Speech.speak("Đã dừng dẫn đường", { language: "vi-VN" });
    } catch {}
  };

  // Call backend to end current driver work session (but keep navigation UI active)
  const handlePauseSession = async () => {
    if (!driverSessionId) {
      Alert.alert("Lỗi", "Phiên làm việc không tồn tại");
      return;
    }
    try {
      const resp: any = await driverWorkSessionService.end({
        DriverWorkSessionId: driverSessionId,
      });
      if (!(resp?.isSuccess ?? resp?.statusCode === 200)) {
        Alert.alert(
          "Lỗi",
          resp?.message || "Không thể kết thúc phiên làm việc"
        );
        return;
      }
      showToast("Đã tạm dừng phiên làm việc");
      // keep navigation UI active, but clear local session id to indicate ended locally
      setDriverSessionId(null);
      setSessionPaused(true);
      // stop continuous timer but keep recorded value in case you want to show it
      setIsSessionRunning(false);
      setActiveSessionStart(null);
      setContinuousSeconds(0);
      // refresh eligibility/totals
      loadEligibilityAndSession();
    } catch (e: any) {
      console.warn("[DriverTripDetail] pause session failed", e);
      Alert.alert("Lỗi", e?.message || "Kết thúc phiên thất bại");
    }
  };

  // End session and exit navigation UI
  const handleEndAndExit = async () => {
    if (!driverSessionId) {
      // Nothing to end server-side, just stop navigation
      stopNavigation();
      return;
    }
    try {
      const resp: any = await driverWorkSessionService.end({
        DriverWorkSessionId: driverSessionId,
      });
      if (!(resp?.isSuccess ?? resp?.statusCode === 200)) {
        Alert.alert(
          "Lỗi",
          resp?.message || "Không thể kết thúc phiên làm việc"
        );
        return;
      }
      setDriverSessionId(null);
      setSessionPaused(false);
      // stop and reset continuous timer
      setIsSessionRunning(false);
      setActiveSessionStart(null);
      setContinuousSeconds(0);
      setStoppedSeconds(0);
      loadEligibilityAndSession();
    } catch (e: any) {
      console.warn("[DriverTripDetail] end session failed", e);
      Alert.alert("Lỗi", e?.message || "Kết thúc phiên thất bại");
      return;
    }
    stopNavigation();
  };

  // Resume a previously-paused work session by calling Start again
  const handleResumeSession = async () => {
    if (startingNav || !trip) return;
    // check eligibility before resuming
    if (!eligibility) await loadEligibilityAndSession();
    if (eligibility && !eligibility.canDrive)
      return Alert.alert(
        "Không đủ điều kiện",
        eligibility.message || "Bạn không đủ điều kiện lái xe hiện tại"
      );
    const contHours = continuousSeconds / 3600;
    if (contHours >= 4)
      return Alert.alert(
        "Ngừng",
        "Bạn đã lái quá 4 giờ liên tục, hãy nghỉ trước khi tiếp tục"
      );

    try {
      const resp: any = await driverWorkSessionService.start({
        TripId: trip.tripId,
      });
      if (!(resp?.isSuccess ?? resp?.statusCode === 200)) {
        Alert.alert(
          "Lỗi",
          resp?.message || "Không thể tiếp tục phiên làm việc"
        );
        return;
      }
      const sid = resp?.result?.DriverWorkSessionId ?? resp?.result ?? null;
      if (sid) setDriverSessionId(String(sid));
      // start local continuous timer
      setActiveSessionStart(new Date());
      setContinuousSeconds(0);
      setStoppedSeconds(0);
      setIsSessionRunning(true);
      setSessionPaused(false);
      showToast("Đã tiếp tục phiên làm việc");
      // refresh eligibility/totals
      loadEligibilityAndSession();
      stopNavigation();
    } catch (e: any) {
      console.warn("[DriverTripDetail] resume session failed", e);
      Alert.alert("Lỗi", e?.message || "Không thể tiếp tục phiên làm việc");
    }
  };

  const confirmPickup = async () => {
    await markPickup(true);
    setCanConfirmPickup(false);
    // Update trip status to LOADING on the backend
    let statusUpdated = false;
    try {
      const res: any = await tripService.changeStatus({
        TripId: trip!.tripId,
        NewStatus: "LOADING",
      });
      const ok = res?.isSuccess ?? res?.statusCode === 200;
      if (ok) {
        showToast("Đã cập nhật trạng thái: Đang lấy hàng");
        setTrip((prev) =>
          prev ? ({ ...prev, status: "LOADING" } as TripDetailData) : prev
        );
        statusUpdated = true;
      } else {
        console.warn("[DriverTripDetail] changeStatus failed", res);
        Alert.alert(
          "Cảnh báo",
          res?.message || "Không thể cập nhật trạng thái chuyến"
        );
      }
    } catch (e: any) {
      console.warn("[DriverTripDetail] changeStatus error", e);
      Alert.alert("Lỗi", e?.message || "Không thể cập nhật trạng thái chuyến");
    }

    // Also end the current driver work session on the backend (keep nav UI active)
    if (driverSessionId) {
      try {
        const endResp: any = await driverWorkSessionService.end({
          DriverWorkSessionId: driverSessionId,
        });
        const ok = endResp?.isSuccess ?? endResp?.statusCode === 200;
        if (ok) {
          showToast("Đã ghi nhận thời gian nghỉ");
          // clear local session id and stop continuous timer
          setDriverSessionId(null);
          setIsSessionRunning(false);
          setActiveSessionStart(null);
          // Keep nav active but mark paused so UI shows resume option
          setSessionPaused(true);
        } else {
          console.warn("[DriverTripDetail] end session failed", endResp);
        }
      } catch (e: any) {
        console.warn("[DriverTripDetail] end session error", e);
      } finally {
        // Refresh eligibility/totals regardless
        loadEligibilityAndSession();
      }
    } else if (statusUpdated) {
      // If we've updated status but no session id, still refresh eligibility
      loadEligibilityAndSession();
    }
    // try { Speech.speak('Đã tới điểm lấy hàng. Đang tính tuyến giao hàng.', { language: 'vi-VN' }) } catch {}

    // // Plan Pickup -> Delivery
    // const from = currentPos || routeCoords[0]
    // const to = endPoint || routeCoords[routeCoords.length - 1]
    // if (from && to) {
    //     try {
    //         const planned = await vietmapService.planBetweenPoints(from, to, 'car')
    //         if (planned.coordinates?.length) {
    //             setRouteCoords(planned.coordinates as [number, number][])
    //             if (planned.instructions) setRouteInstructions(planned.instructions)
    //         }
    //     } catch (e) { console.warn('Plan delivery failed', e) }
    // }

    // Open Pickup Record for signing
    const pickupRecord = trip?.deliveryRecords?.find(
      (r) => r.recordType === "PICKUP"
    );
    if (pickupRecord) {
      setLoadingDeliveryRecord(true);
      const res = await tripService.getDeliveryRecordForDriver(
        pickupRecord.tripDeliveryRecordId
      );
      setLoadingDeliveryRecord(false);
      if (res?.isSuccess) {
        setActiveDeliveryRecord(res.result);
        // exit navigation UI before opening the record
        stopNavigation();
        setDeliveryModalOpen(true);
      } else {
        // If failed or no record, start nav anyway
        beginDeliveryNavigation();
      }
    } else {
      beginDeliveryNavigation();
    }
  };

  const beginDeliveryNavigation = async () => {
    setJourneyPhase("TO_DELIVERY");
    setCanConfirmDelivery(false);
    try {
      Speech.speak("Bắt đầu dẫn đường đến điểm giao hàng", {
        language: "vi-VN",
      });
    } catch {}
  };

  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [confirmingReturn, setConfirmingReturn] = useState(false);
  const [confirmingHandover, setConfirmingHandover] = useState(false);

  // Helper to show alerts with web fallback
  const showAlert = (title: string, message?: string) => {
    try {
      if (Platform.OS === "web") {
        window.alert((title || "") + (message ? "\n" + message : ""));
      } else {
        Alert.alert(title, message);
      }
    } catch (e) {
      try {
        Alert.alert(title, message);
      } catch {}
    }
  };

  const confirmDelivery = async () => {
    // On web Alert.alert button dialogs don't exist — use window.confirm fallback
    try {
      let confirmed = true;
      if (Platform.OS === "web") {
        confirmed = window.confirm("Bạn đã giao hàng thành công?");
      } else {
        // Use Alert with buttons for native platforms
        confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Xác nhận",
            "Bạn đã giao hàng thành công?",
            [
              { text: "Hủy", style: "cancel", onPress: () => resolve(false) },
              { text: "Đã giao", onPress: () => resolve(true) },
            ],
            { cancelable: true }
          );
        });
      }

      if (!confirmed) return;
      if (confirmingDelivery || !trip) return;
      setConfirmingDelivery(true);
      setCanConfirmDelivery(false);

      try {
        // Update trip status to UNLOADING
        const res: any = await tripService.changeStatus({
          TripId: trip.tripId,
          NewStatus: "UNLOADING",
        });
        const ok = res?.isSuccess ?? res?.statusCode === 200;
        if (ok) {
          showToast("Đã cập nhật trạng thái: Đang giao hàng");
          setTrip((prev) =>
            prev ? ({ ...prev, status: "UNLOADING" } as TripDetailData) : prev
          );
        } else {
          showAlert(
            "Lỗi",
            res?.message || "Không thể cập nhật trạng thái chuyến"
          );
        }

        // End current driver work session if exists (keep behavior consistent with pickup)
        if (driverSessionId) {
          try {
            const endResp: any = await driverWorkSessionService.end({
              DriverWorkSessionId: driverSessionId,
            });
            const ok2 = endResp?.isSuccess ?? endResp?.statusCode === 200;
            if (ok2) {
              showToast("Đã ghi nhận thời gian nghỉ");
              setDriverSessionId(null);
              setIsSessionRunning(false);
              setActiveSessionStart(null);
              setSessionPaused(true);
            }
          } catch (e: any) {
            console.warn("[DriverTripDetail] end session failed", e);
          } finally {
            loadEligibilityAndSession();
          }
        }

        // Exit navigation UI
        stopNavigation();

        // Open corresponding delivery record (DROPOFF)
        const dropRecord = trip.deliveryRecords?.find(
          (r: any) => r.recordType === "DROPOFF" || r.recordType === "DELIVERY"
        );
        if (dropRecord) {
          setLoadingDeliveryRecord(true);
          const fres = await tripService.getDeliveryRecordForDriver(
            dropRecord.tripDeliveryRecordId
          );
          setLoadingDeliveryRecord(false);
          if (fres?.isSuccess) {
            setActiveDeliveryRecord(fres.result);
            setDeliveryModalOpen(true);
          }
        }

        setJourneyPhase("COMPLETED");
        try {
          Speech.speak("Đã hoàn thành đơn hàng", { language: "vi-VN" });
        } catch {}
        await fetchTripData();
      } catch (e: any) {
        showAlert("Lỗi", e?.message || "Có lỗi khi xác nhận giao hàng");
      } finally {
        setConfirmingDelivery(false);
      }
    } catch (e: any) {
      console.warn("[DriverTripDetail] confirmDelivery error", e);
    }
  };

  const confirmVehicleHandover = async () => {
    try {
      let confirmed = true;
      if (Platform.OS === "web") {
        confirmed = window.confirm("Xác nhận đã nhận xe?");
      } else {
        confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Xác nhận",
            "Bạn đã nhận xe chưa?",
            [
              { text: "Hủy", style: "cancel", onPress: () => resolve(false) },
              { text: "Đã nhận", onPress: () => resolve(true) },
            ],
            { cancelable: true }
          );
        });
      }
      if (!confirmed) return;
      if (confirmingHandover || !trip) return;
      setConfirmingHandover(true);
      try {
        const res: any = await tripService.changeStatus({
          TripId: trip.tripId,
          NewStatus: "VEHICLE_HANDOVER",
        });
        const ok = res?.isSuccess ?? res?.statusCode === 200;
        if (ok) {
          showToast("Đã xác nhận nhận xe");
          setTrip((prev) =>
            prev
              ? ({ ...prev, status: "VEHICLE_HANDOVER" } as TripDetailData)
              : prev
          );
          await fetchTripData();
        } else {
          showAlert(
            "Lỗi",
            res?.message || "Không thể cập nhật trạng thái nhận xe"
          );
        }
      } catch (e: any) {
        showAlert("Lỗi", e?.message || "Có lỗi khi xác nhận nhận xe");
      } finally {
        setConfirmingHandover(false);
      }
    } catch (e: any) {
      console.warn("[DriverTripDetail] confirmVehicleHandover error", e);
    }
  };

  const confirmVehicleReturn = async () => {
    try {
      let confirmed = true;
      if (Platform.OS === "web") {
        confirmed = window.confirm("Xác nhận đã trả xe?");
      } else {
        confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Xác nhận",
            "Bạn đã trả xe chưa?",
            [
              { text: "Hủy", style: "cancel", onPress: () => resolve(false) },
              { text: "Đã trả", onPress: () => resolve(true) },
            ],
            { cancelable: true }
          );
        });
      }
      if (!confirmed) return;
      if (confirmingReturn || !trip) return;
      setConfirmingReturn(true);
      try {
        const res: any = await tripService.changeStatus({
          TripId: trip.tripId,
          NewStatus: "VEHICLE_RETURNED",
        });
        const ok = res?.isSuccess ?? res?.statusCode === 200;
        if (ok) {
          showToast("Đã xác nhận trả xe");
          setTrip((prev) =>
            prev
              ? ({ ...prev, status: "VEHICLE_RETURNED" } as TripDetailData)
              : prev
          );
          // stop any navigation if active
          stopNavigation();
          await fetchTripData();
        } else {
          showAlert(
            "Lỗi",
            res?.message || "Không thể cập nhật trạng thái trả xe"
          );
        }
      } catch (e: any) {
        showAlert("Lỗi", e?.message || "Có lỗi khi xác nhận trả xe");
      } finally {
        setConfirmingReturn(false);
      }
    } catch (e: any) {
      console.warn("[DriverTripDetail] confirmVehicleReturn error", e);
    }
  };

  // --- Toast Helper ---
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const pad = (n: number) => String(n).padStart(2, "0");
  const formatSeconds = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  };

  // Signing rules
  const isPickupSignAllowed = trip?.status === "LOADING";
  const isDropoffSignAllowed = trip?.status === "UNLOADING";
  const recordTerms =
    (activeDeliveryRecord &&
      (activeDeliveryRecord.terms ||
        activeDeliveryRecord.deliveryRecordTemplate?.deliveryRecordTerms ||
        [])) ||
    [];

  // Map display helpers: show only the selected route (overview / toPickup / toDelivery)
  const mapCoordinates = (() => {
    if (visibleRoute === "toPickup")
      return pickupRouteCoords && pickupRouteCoords.length > 0
        ? pickupRouteCoords
        : routeCoords;
    if (visibleRoute === "toDelivery")
      return deliveryRouteCoords && deliveryRouteCoords.length > 0
        ? deliveryRouteCoords
        : routeCoords;
    return routeCoords;
  })();

  const routeColor = (() => {
    if (visibleRoute === "toPickup") return "#8B5CF6"; // purple for pickup
    if (visibleRoute === "toDelivery") return "#DC2626"; // red for delivery
    return "#3B82F6"; // blue for overview/main route
  })();

  // Effective confirm flags: allow confirmation when nav is active and journey phase matches
  const effectiveCanConfirmPickup =
    canConfirmPickup || (navActive && journeyPhase === "TO_PICKUP");
  const effectiveCanConfirmDelivery =
    canConfirmDelivery || (navActive && journeyPhase === "TO_DELIVERY");

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  if (!trip)
    return (
      <View style={styles.centered}>
        <Text>Không tìm thấy chuyến đi</Text>
      </View>
    );

  const primaryDriver = trip.drivers?.find((d) => d.type === "PRIMARY");

  // helper: are we approaching the 4-hour continuous limit (15 minutes margin)?
  const approachingContinuousLimit = continuousSeconds >= 4 * 3600 - 15 * 60;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Chi tiết chuyến đi</Text>
          <Text style={styles.subTitle}>{trip.tripCode}</Text>
        </View>
        <StatusPill value={trip.status} />
      </View>

      {/* Debug panel (DEV only) */}
      {/* {__DEV__ && (
        <View style={styles.debugBox} pointerEvents="box-none">
          <Text style={styles.debugText}>visibleRoute: {visibleRoute}</Text>
          <Text style={styles.debugText}>journeyPhase: {journeyPhase}</Text>
          <Text style={styles.debugText}>navActive: {String(navActive)}</Text>
          <Text style={styles.debugText}>canConfirmDelivery: {String(canConfirmDelivery)}</Text>
          <Text style={styles.debugText}>effectiveCanConfirmDelivery: {String(effectiveCanConfirmDelivery)}</Text>
          <Text style={styles.debugText}>driverSessionId: {driverSessionId ?? 'null'}</Text>
        </View>
      )} */}

      {/* Toast */}
      {toastMsg && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Map Section */}
        <View style={styles.cardNoPadding}>
          <View style={styles.mapContainer}>
            <VietMapUniversal
              coordinates={mapCoordinates}
              style={{ height: 320 }}
              showUserLocation={true}
              navigationActive={false}
              externalLocation={currentPos}
              userMarkerBearing={currentHeading ?? undefined}
              // show only the active route as primary; hide the other planned routes
              primaryRouteColor={routeColor}
              secondaryRouteColor={undefined}
            />

            {/* Map Overlay Controls */}
            <View style={styles.mapControls}>
              {/* Driving hours widget */}
              {eligibility && (
                <View style={styles.hoursWidget}>
                  <Text style={styles.hoursTitle}>⏱ Giờ lái</Text>
                  <Text style={styles.timerText}>
                    {formatSeconds(continuousSeconds)}
                  </Text>
                  <View style={{ flexDirection: "row", marginTop: 6 }}>
                    <View style={{ marginRight: 10 }}>
                      <Text style={styles.smallStatLabel}>Hôm nay</Text>
                      <Text style={styles.smallStatValue}>
                        {(eligibility.hoursToday ?? 0).toFixed(1)}h
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.smallStatLabel}>Tuần</Text>
                      <Text style={styles.smallStatValue}>
                        {(eligibility.hoursWeek ?? 0).toFixed(1)}h
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              <View style={styles.routeToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.smallToggle,
                    visibleRoute === "overview" && styles.smallToggleActive,
                  ]}
                  onPress={handleShowOverview}
                >
                  <Text
                    style={[
                      styles.smallToggleText,
                      visibleRoute === "overview" &&
                        styles.smallToggleTextActive,
                    ]}
                  >
                    Tổng quan
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.smallToggle,
                    visibleRoute === "toPickup" && styles.smallToggleActive,
                    { marginLeft: 8 },
                  ]}
                  onPress={handleShowPickup}
                >
                  <Text
                    style={[
                      styles.smallToggleText,
                      visibleRoute === "toPickup" &&
                        styles.smallToggleTextActive,
                    ]}
                  >
                    Đến lấy hàng
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.smallToggle,
                    visibleRoute === "toDelivery" && styles.smallToggleActive,
                    { marginLeft: 8 },
                  ]}
                  onPress={handleShowDelivery}
                >
                  <Text
                    style={[
                      styles.smallToggleText,
                      visibleRoute === "toDelivery" &&
                        styles.smallToggleTextActive,
                    ]}
                  >
                    Đến giao hàng
                  </Text>
                </TouchableOpacity>
              </View>

              {visibleRoute !== "overview" && (
                <TouchableOpacity
                  style={[
                    styles.mapFab,
                    (navActive ||
                      (eligibility && !eligibility.canDrive) ||
                      continuousSeconds / 3600 >= 4) &&
                      styles.mapFabDisabled,
                  ]}
                  onPress={
                    visibleRoute === "toPickup"
                      ? startNavigationToPickupAddress
                      : visibleRoute === "toDelivery"
                      ? startNavigationToDeliveryAddress
                      : startNavigation
                  }
                  disabled={
                    navActive ||
                    (eligibility && !eligibility.canDrive) ||
                    continuousSeconds / 3600 >= 4
                  }
                >
                  <Ionicons name="navigate" size={20} color="#FFF" />
                  <Text style={styles.mapFabText}>
                    {navActive
                      ? "Đang dẫn đường"
                      : visibleRoute === "toPickup"
                      ? "Bắt đầu đi đến điểm lấy hàng"
                      : visibleRoute === "toDelivery"
                      ? "Bắt đầu đi đến điểm giao hàng"
                      : "Bắt đầu đi"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Dev test button removed */}
              <Text style={styles.statLabel}>Thời gian</Text>
              <Text style={styles.statValue}>
                {(trip.tripRoute?.durationMinutes / 60).toFixed(1) || 0} giờ
              </Text>
            </View>
          </View>
        </View>

        {/* Summary Card */}
        <View style={styles.card}>
          <SectionHeader
            icon={
              <MaterialCommunityIcons
                name="clipboard-list-outline"
                size={20}
                color="#4F46E5"
              />
            }
            title="Tóm tắt chuyến"
          />
          <KeyValue label="Điểm lấy" value={trip.shippingRoute.startAddress} />
          <KeyValue label="Điểm giao" value={trip.shippingRoute.endAddress} />
          <KeyValue
            label="Xe"
            value={`${trip.vehicle.plateNumber} • ${
              trip.vehicle.vehicleTypeName ?? ""
            }`}
          />
          <KeyValue
            label="Tài xế"
            value={primaryDriver ? primaryDriver.fullName : "Chưa có"}
          />
          <KeyValue
            label="Số kiện hàng"
            value={`${trip.packages?.length ?? 0}`}
          />
        </View>

        {/* Driver Contract (Updated to Match Owner Style) */}
        {myDriverContract && (
          <View style={styles.card}>
            <View style={styles.sectionHeaderContainer}>
              <View style={styles.sectionIconBox}>
                <FontAwesome5 name="file-contract" size={18} color="#D97706" />
              </View>
              <Text style={styles.sectionTitle}>Hợp đồng vận chuyển</Text>
              <View style={{ marginLeft: "auto" }}>
                <StatusPill value={myDriverContract.status || "PENDING"} />
              </View>
            </View>

            <View style={styles.moneyBox}>
              <Text style={styles.moneyLabel}>Giá trị hợp đồng</Text>
              <Text style={styles.moneyValue}>
                {(myDriverContract.contractValue ?? 0).toLocaleString("vi-VN")}{" "}
                {myDriverContract.currency || "VND"}
              </Text>
            </View>

            <View style={styles.contractActions}>
              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() => setShowContractModal(true)}
              >
                <Text style={styles.actionBtnTextSec}>Xem chi tiết</Text>
              </TouchableOpacity>

              {!myDriverContract.counterpartySigned && (
                <TouchableOpacity
                  style={styles.actionBtnPrimary}
                  onPress={handleSendContractOtp}
                  disabled={signingContract}
                >
                  <FontAwesome5
                    name="pen"
                    size={14}
                    color="#FFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.actionBtnTextPri}>Ký ngay</Text>
                </TouchableOpacity>
              )}

              {myDriverContract.counterpartySigned && (
                <View style={styles.completedSign}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#059669"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={{ color: "#059669", fontWeight: "700" }}>
                    Đã hoàn tất
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Packages Card */}
        <View style={styles.card}>
          <SectionHeader
            icon={
              <MaterialCommunityIcons
                name="package-variant-closed"
                size={20}
                color="#D97706"
              />
            }
            title="Hàng hóa"
          />
          {trip.packages?.map((pkg: any, index: number) => (
            <View key={pkg.packageId} style={styles.packageCard}>
              <View style={styles.packageHeader}>
                <Text style={styles.packageTitle}>
                  📦 Kiện #{index + 1}: {pkg.packageCode}
                </Text>
              </View>
              <View style={styles.packageBody}>
                <Text style={styles.packageInfo}>
                  {pkg.weight} kg • {pkg.volume} m³
                </Text>
              </View>
              {pkg.items?.map((item: any) => (
                <View key={item.itemId} style={styles.itemRow}>
                  {item.images?.[0] && (
                    <Image
                      source={{ uri: item.images[0] }}
                      style={styles.itemThumb}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.itemName}</Text>
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  </View>
                  <Text style={styles.itemValue}>
                    {item.declaredValue?.toLocaleString()} đ
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Delivery Records */}
        {trip.deliveryRecords?.length > 0 && (
          <View style={styles.card}>
            <SectionHeader
              icon={<Ionicons name="document-text" size={20} color="#64748B" />}
              title="Biên bản giao nhận"
            />
            {trip.deliveryRecords.map((record) => (
              <TouchableOpacity
                key={record.tripDeliveryRecordId}
                style={styles.recordItem}
                onPress={async () => {
                  setLoadingDeliveryRecord(true);
                  const res = await tripService.getDeliveryRecordForDriver(
                    record.tripDeliveryRecordId
                  );
                  setLoadingDeliveryRecord(false);
                  if (res?.isSuccess) {
                    setActiveDeliveryRecord(res.result);
                    setDeliveryModalOpen(true);
                  } else {
                    Alert.alert("Lỗi", "Không thể tải biên bản");
                  }
                }}
              >
                <View style={styles.recordIcon}>
                  <MaterialCommunityIcons
                    name={
                      record.recordType === "PICKUP"
                        ? "package-up"
                        : "package-down"
                    }
                    size={22}
                    color="#059669"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordType}>
                    {record.recordType === "PICKUP"
                      ? "Biên bản Lấy hàng"
                      : "Biên bản Giao hàng"}
                  </Text>
                  <Text style={styles.recordDate}>
                    {new Date(record.createAt).toLocaleString("vi-VN")}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  {record.driverSigned && record.contactSigned ? (
                    <Text
                      style={{
                        color: "#059669",
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      Hoàn tất
                    </Text>
                  ) : (
                    <Text
                      style={{
                        color: "#D97706",
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      Chờ ký
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      {/* --- FULLSCREEN NAVIGATION MODE --- */}
      {navActive && !navMinimized && (
        <View style={styles.navFullscreen}>
          {/* Driving hours overlay in fullscreen nav (top-left) */}
          {eligibility && (
            <View style={[styles.navTimerContainer, { top: 84 }]}>
              {/* moved slightly down */}
              <View style={styles.navTimerPanel}>
                <View style={styles.timerCol}>
                  <Text style={styles.timerTitle}>Thời gian lái</Text>
                  <Text
                    style={[
                      styles.timerBig,
                      approachingContinuousLimit && styles.timerBigWarn,
                    ]}
                  >
                    {formatSeconds(continuousSeconds)}
                  </Text>
                </View>
                <View style={styles.timerCol}>
                  <Text style={styles.timerTitle}>Thời gian dừng đỗ</Text>
                  <Text
                    style={[
                      styles.timerBig,
                      approachingContinuousLimit && styles.timerBigWarn,
                    ]}
                  >
                    {formatSeconds(stoppedSeconds)}{" "}
                    <Text style={styles.limitNote}>(4h limi)</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.navTimerStats}>
                <View style={styles.navStatItem}>
                  <Text style={styles.navStatLabel}>Hôm nay</Text>
                  <Text style={styles.navStatValue}>
                    {(baseHoursToday + continuousSeconds / 3600).toFixed(1)}h
                  </Text>
                </View>
                <View style={styles.navStatItem}>
                  <Text style={styles.navStatLabel}>Tuần</Text>
                  <Text style={styles.navStatValue}>
                    {(baseHoursWeek + continuousSeconds / 3600).toFixed(1)}h
                  </Text>
                </View>
              </View>
            </View>
          )}
          <VietMapUniversal
            coordinates={routeCoords}
            style={{ flex: 1, backgroundColor: "#000" }}
            showUserLocation={true}
            navigationActive={true}
            externalLocation={currentPos}
            userMarkerBearing={currentHeading ?? undefined}
            useWebNavigation={true}
            instructions={routeInstructions.map((i) => i.text || i.road)}
            primaryRouteColor={routeColor}
          />
          <NavigationHUD
            nextInstruction={
              journeyPhase === "TO_PICKUP"
                ? "Đến điểm lấy hàng"
                : "Đến điểm giao hàng"
            }
            distanceToNextInstruction={formatMeters(remaining)}
            remainingDistance={formatMeters(remaining)}
            eta={eta}
            currentSpeed={formatSpeed(currentSpeed)}
            visible={true}
          />
          <View style={[styles.navActionBar, styles.navActionBarAbove]}>
            <TouchableOpacity
              style={styles.minBtn}
              onPress={() => setNavMinimized(true)}
            >
              <Ionicons name="chevron-down" size={24} color="#FFF" />
            </TouchableOpacity>
            {journeyPhase === "TO_PICKUP" && (
              <TouchableOpacity
                style={[
                  styles.navMainBtn,
                  !effectiveCanConfirmPickup && styles.btnDisabled,
                ]}
                onPress={() => {
                  console.debug("navBtn press: PICKUP", {
                    journeyPhase,
                    effectiveCanConfirmPickup,
                    navActive,
                  });
                  confirmPickup();
                }}
                onPressIn={() => console.debug("navBtn pressIn: PICKUP")}
                disabled={!effectiveCanConfirmPickup}
              >
                <Text style={styles.navMainBtnText}>📦 Đã tới lấy hàng</Text>
              </TouchableOpacity>
            )}
            {journeyPhase === "TO_DELIVERY" && (
              <TouchableOpacity
                style={[
                  styles.navMainBtn,
                  styles.btnGreen,
                  (!effectiveCanConfirmDelivery || confirmingDelivery) &&
                    styles.btnDisabled,
                ]}
                onPress={() => {
                  console.debug("navBtn press: DELIVERY", {
                    journeyPhase,
                    effectiveCanConfirmDelivery,
                    navActive,
                    confirmingDelivery,
                  });
                  confirmDelivery();
                }}
                onPressIn={() => console.debug("navBtn pressIn: DELIVERY")}
                disabled={!effectiveCanConfirmDelivery || confirmingDelivery}
              >
                {confirmingDelivery ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.navMainBtnText}>✅ Đã giao hàng</Text>
                )}
              </TouchableOpacity>
            )}
            {sessionPaused ? (
              <TouchableOpacity
                style={[
                  styles.resumeBtn,
                  (eligibility && !eligibility.canDrive) ||
                  continuousSeconds / 3600 >= 4
                    ? styles.btnDisabled
                    : {},
                  { marginRight: 6 },
                ]}
                onPress={handleResumeSession}
                disabled={
                  (eligibility && !eligibility.canDrive) ||
                  continuousSeconds / 3600 >= 4
                }
              >
                <Text style={styles.resumeBtnText}>Bắt đầu đi tiếp</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.pauseBtn, { marginRight: 6 }]}
                onPress={handlePauseSession}
              >
                <Text style={styles.pauseBtnText}>Nghỉ</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.stopBtn} onPress={handleEndAndExit}>
              <Text style={styles.stopBtnText}>Kết thúc</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* --- MINIMIZED NAV BAR --- */}
      {navActive && navMinimized && !navHidden && (
        <View style={styles.miniBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.miniTitle}>
              {journeyPhase === "TO_PICKUP"
                ? "Đang đến lấy hàng"
                : "Đang đi giao hàng"}
            </Text>
            <Text style={styles.miniSub}>
              {formatMeters(remaining)} • {eta}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.miniAction}
            onPress={() => setNavMinimized(false)}
          >
            <Text style={styles.miniActionText}>Mở</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* --- MODAL HỢP ĐỒNG (A4 STYLE) --- */}
      <Modal
        visible={showContractModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContractModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paperModal}>
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowContractModal(false)}
            >
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>

            <ScrollView
              contentContainerStyle={styles.paperScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.a4Paper}>
                {/* Header Quốc Hiệu */}
                <View style={styles.docHeader}>
                  <View style={styles.docHeaderLeft}>
                    <Image
                      source={{
                        uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
                      }}
                      style={styles.docLogo}
                      resizeMode="contain"
                    />
                    <Text style={styles.companyName}>
                      CÔNG TY CỔ PHẦN{"\n"}DRIVESHARE LOGISTICS
                    </Text>
                  </View>
                  <View style={styles.docHeaderRight}>
                    <Text style={styles.govText}>
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </Text>
                    <Text style={styles.govMotto}>
                      Độc lập - Tự do - Hạnh phúc
                    </Text>
                    <View style={styles.docLine} />
                  </View>
                </View>
                {/* Title */}
                <View style={styles.docTitleWrap}>
                  <Text style={styles.docMainTitle}>HỢP ĐỒNG VẬN CHUYỂN</Text>
                  <Text style={styles.docRef}>
                    Số: {myDriverContract?.contractCode || "......."}/HĐVC
                  </Text>
                  <Text style={styles.docDate}>
                    Ngày lập: {new Date().toLocaleDateString("vi-VN")}
                  </Text>
                </View>
                {/* Parties */}
                <View style={styles.formSection}>
                  <View style={styles.formHeaderBar}>
                    <Text style={styles.formHeaderText}>
                      I. CÁC BÊN THAM GIA
                    </Text>
                  </View>
                  <View style={styles.partiesRow}>
                    <View style={styles.partyCol}>
                      <Text style={styles.partyLabel}>BÊN A (Chủ Hàng):</Text>
                      <Text style={styles.partyValue}>
                        {trip?.owner?.companyName || trip?.owner?.fullName}
                      </Text>
                    </View>
                    <View style={styles.partyDivider} />
                    <View style={styles.partyCol}>
                      <Text style={styles.partyLabel}>BÊN B (Tài xế):</Text>
                      <Text style={styles.partyValue}>
                        {user?.userName || "..."}
                      </Text>
                    </View>
                  </View>
                </View>
                {/* Terms */}
                <View style={styles.formSection}>
                  <View style={styles.formHeaderBar}>
                    <Text style={styles.formHeaderText}>
                      II. ĐIỀU KHOẢN HỢP ĐỒNG
                    </Text>
                  </View>
                  <View style={styles.termsList}>
                    {(myDriverContract?.terms || [])
                      .slice()
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((t, i) => (
                        <View key={i} style={styles.termItem}>
                          <Text style={styles.termIndex}>{i + 1}.</Text>
                          <Text style={styles.termContent}>{t.content}</Text>
                        </View>
                      ))}
                  </View>
                </View>
                {/* Signatures */}
                <View style={styles.signatureSection}>
                  <View style={styles.signBox}>
                    <Text style={styles.signTitle}>ĐẠI DIỆN BÊN A</Text>
                    <View style={styles.signArea}>
                      {myDriverContract?.ownerSigned ? (
                        <View style={styles.stampBox}>
                          <Text style={styles.stampText}>ĐÃ KÝ</Text>
                        </View>
                      ) : (
                        <Text style={styles.unsignedText}>Chưa ký</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.signBox}>
                    <Text style={styles.signTitle}>ĐẠI DIỆN BÊN B</Text>
                    <View style={styles.signArea}>
                      {myDriverContract?.counterpartySigned ? (
                        <View
                          style={[styles.stampBox, { borderColor: "#DC2626" }]}
                        >
                          <Text
                            style={[styles.stampText, { color: "#DC2626" }]}
                          >
                            ĐÃ KÝ
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.unsignedText}>Chưa ký</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              {myDriverContract?.fileURL && (
                <TouchableOpacity
                  style={styles.pdfButton}
                  onPress={() => Linking.openURL(myDriverContract.fileURL!)}
                >
                  <MaterialCommunityIcons
                    name="file-pdf-box"
                    size={20}
                    color="#374151"
                  />
                  <Text style={styles.pdfButtonText}>Tải PDF</Text>
                </TouchableOpacity>
              )}
              {!myDriverContract?.counterpartySigned && (
                <TouchableOpacity
                  style={styles.signButton}
                  onPress={handleSendContractOtp}
                >
                  <Text style={styles.signButtonText}>Ký Hợp Đồng</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Digital Signature Terms Modal */}
      <Modal
        visible={showDigitalSignatureTerms}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDigitalSignatureTerms(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { maxWidth: 500, width: "95%", maxHeight: "85%" },
            ]}
          >
            <ScrollView
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={true}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: "#1F2937",
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                Điều khoản Chữ ký số
              </Text>

              {/* Section 1 */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: "#111827",
                    marginBottom: 8,
                  }}
                >
                  1. Chấp thuận sử dụng chữ ký số
                </Text>
                <Text
                  style={{ fontSize: 14, color: "#374151", lineHeight: 22 }}
                >
                  Hai Bên đồng ý sử dụng chữ ký số/ chữ ký điện tử để ký kết,
                  xác nhận các tài liệu, hợp đồng, phụ lục hoặc trao đổi trong
                  suốt quá trình thực hiện hợp đồng này.
                </Text>
              </View>

              {/* Section 2 */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: "#111827",
                    marginBottom: 8,
                  }}
                >
                  2. Giá trị pháp lý
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#374151",
                    lineHeight: 22,
                    marginBottom: 6,
                  }}
                >
                  Chữ ký số của mỗi Bên được tạo lập từ chứng thư số hợp lệ và
                  được xem là:
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#374151",
                    lineHeight: 22,
                    paddingLeft: 12,
                  }}
                >
                  • Có giá trị pháp lý tương đương chữ ký tay theo quy định của
                  Luật Giao dịch điện tử Việt Nam;
                  {"\n"}• Là bằng chứng xác thực về việc Bên ký đã đồng ý toàn
                  bộ nội dung tài liệu được ký.
                </Text>
              </View>

              {/* Section 3 */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: "#111827",
                    marginBottom: 8,
                  }}
                >
                  3. Trách nhiệm bảo mật
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#374151",
                    lineHeight: 22,
                    marginBottom: 6,
                  }}
                >
                  Mỗi Bên tự chịu trách nhiệm về:
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#374151",
                    lineHeight: 22,
                    paddingLeft: 12,
                  }}
                >
                  • Bảo mật thiết bị ký số và mã PIN/mật khẩu;
                  {"\n"}• Các giao dịch phát sinh từ chữ ký số của mình;
                  {"\n"}• Mọi hậu quả phát sinh nếu để lộ thiết bị, mật khẩu
                  hoặc để người khác ký thay.
                </Text>
              </View>

              {/* Section 4 */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: "#111827",
                    marginBottom: 8,
                  }}
                >
                  4. Hiệu lực tài liệu ký số
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#374151",
                    lineHeight: 22,
                    marginBottom: 6,
                  }}
                >
                  Bất kỳ tài liệu, hợp đồng hoặc phụ lục nào được ký bằng chữ ký
                  số hợp lệ của các Bên sẽ:
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#374151",
                    lineHeight: 22,
                    paddingLeft: 12,
                  }}
                >
                  • Được xem là bản chính thức;
                  {"\n"}• Có hiệu lực kể từ thời điểm chữ ký số được gắn vào tài
                  liệu;
                  {"\n"}• Được chấp nhận khi gửi qua email, hệ thống phần mềm,
                  nền tảng ký điện tử hoặc bất kỳ hình thức điện tử hợp pháp
                  nào.
                </Text>
              </View>

              {/* Section 5 */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: "#111827",
                    marginBottom: 8,
                  }}
                >
                  5. Trường hợp hệ thống gặp sự cố
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#374151",
                    lineHeight: 22,
                    marginBottom: 6,
                  }}
                >
                  Trong trường hợp hệ thống ký số gặp lỗi kỹ thuật khiến việc ký
                  không thực hiện được, các Bên có thể tạm thời:
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#374151",
                    lineHeight: 22,
                    paddingLeft: 12,
                  }}
                >
                  • Ký tay trên bản giấy; hoặc
                  {"\n"}• Ký bằng phương thức điện tử khác mà hai Bên thống nhất
                  bằng văn bản/email.
                </Text>
              </View>

              {/* Section 6 */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: "#111827",
                    marginBottom: 8,
                  }}
                >
                  6. Lưu trữ và kiểm tra
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#374151",
                    lineHeight: 22,
                    paddingLeft: 12,
                  }}
                >
                  • Các Bên có trách nhiệm lưu trữ tài liệu đã ký số;
                  {"\n"}• Tài liệu được xác minh qua chứng thư số hợp lệ được
                  xem là bằng chứng hợp lệ nếu phát sinh tranh chấp.
                </Text>
              </View>

              {/* Warning Box */}
              <View
                style={{
                  backgroundColor: "#FEF3C7",
                  padding: 12,
                  borderRadius: 8,
                  borderLeftWidth: 4,
                  borderLeftColor: "#F59E0B",
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: "#92400E",
                    fontWeight: "600",
                    lineHeight: 20,
                  }}
                >
                  ⚠️ Lưu ý: Bằng việc nhấn "Tôi đồng ý", bạn xác nhận đã đọc,
                  hiểu rõ và chấp thuận toàn bộ các điều khoản trên về việc sử
                  dụng chữ ký số.
                </Text>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View
              style={{
                flexDirection: "row",
                padding: 16,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: "#E5E7EB",
                gap: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setShowDigitalSignatureTerms(false);
                  // Quay lại modal hợp đồng nếu đang mở
                  // setShowContractModal(true);
                }}
                style={[styles.actionBtnSecondary, { flex: 1 }]}
              >
                <Text style={styles.actionBtnTextSec}>Không đồng ý</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAcceptDigitalSignatureTerms}
                style={[styles.actionBtnPrimary, { flex: 1 }]}
                disabled={signingContract}
              >
                {signingContract ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.actionBtnTextPri}>Tôi đồng ý</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delivery Signing - Step 1: Confirm and Send OTP */}
      <Modal
        visible={showDeliverySignFlowModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeliverySignFlowModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { maxWidth: 420, width: "92%", padding: 18 },
            ]}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 8 }}>
              Ký biên bản
            </Text>
            <Text style={{ color: "#6B7280", marginBottom: 12 }}>
              Bạn sẽ gửi mã OTP tới email để xác thực trước khi ký biên bản.
            </Text>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontWeight: "700" }}>
                {activeDeliveryRecord?.tripDeliveryRecordId
                  ? `Biên bản: ${activeDeliveryRecord.tripDeliveryRecordId
                      .substring(0, 8)
                      .toUpperCase()}`
                  : ""}
              </Text>
              <Text style={{ color: "#6B7280", marginTop: 6 }}>
                {activeDeliveryRecord?.note || ""}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => setShowDeliverySignFlowModal(false)}
                style={[styles.actionBtnSecondary, { flex: 0.48 }]}
              >
                <Text style={styles.actionBtnTextSec}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={sendDeliverySignOtp}
                style={[styles.actionBtnPrimary, { flex: 0.48 }]}
                disabled={deliverySigningInProgress}
              >
                {deliverySigningInProgress ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.actionBtnTextPri}>Gửi OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delivery OTP Modal (Step 2) */}
      <Modal
        visible={showDeliveryOtpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeliveryOtpModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { maxWidth: 420, width: "92%", padding: 18 },
            ]}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 8 }}>
              Nhập mã xác nhận
            </Text>
            <Text style={{ color: "#6B7280", marginBottom: 12 }}>
              {deliveryOtpSentTo
                ? `Mã đã được gửi tới ${deliveryOtpSentTo}`
                : "Mã xác nhận đã được gửi vào email của bạn."}
            </Text>
            <View style={styles.otpRow}>
              {deliveryOtpDigits.map((d, i) => (
                <View key={i} style={styles.otpBox}>
                  <TextInput
                    ref={(r) => {
                      deliveryOtpInputsRef.current[i] = r;
                    }}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={d}
                    onChangeText={(t) => handleDeliveryOtpChange(i, t)}
                    onKeyPress={(e) => handleDeliveryOtpKeyPress(i, e)}
                    style={styles.otpInput}
                    textAlign="center"
                    autoFocus={i === 0}
                  />
                </View>
              ))}
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 16,
              }}
            >
              <TouchableOpacity
                onPress={resendDeliveryOtp}
                style={[styles.actionBtnSecondary, { flex: 0.48 }]}
              >
                <Text style={styles.actionBtnTextSec}>Gửi lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitDeliveryOtp}
                style={[styles.actionBtnPrimary, { flex: 0.48 }]}
                disabled={deliverySigningInProgress}
              >
                {deliverySigningInProgress ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.actionBtnTextPri}>Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* OTP Modal */}
      <Modal
        visible={showContractOtpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContractOtpModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { maxWidth: 420, width: "92%", padding: 18 },
            ]}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 8 }}>
              Nhập mã xác nhận
            </Text>
            <Text style={{ color: "#6B7280", marginBottom: 12 }}>
              {otpSentTo
                ? `Mã đã được gửi tới ${otpSentTo}`
                : "Mã xác nhận đã được gửi vào email của bạn."}
            </Text>
            <View style={styles.otpRow}>
              {otpDigits.map((d, i) => (
                <View key={i} style={styles.otpBox}>
                  <TextInput
                    ref={(r) => {
                      otpInputsRef.current[i] = r;
                    }}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={d}
                    onChangeText={(t) => handleOtpChange(i, t)}
                    onKeyPress={(e) => handleOtpKeyPress(i, e)}
                    style={styles.otpInput}
                    textAlign="center"
                    autoFocus={i === 0}
                  />
                </View>
              ))}
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 16,
              }}
            >
              <TouchableOpacity
                onPress={resendContractOtp}
                style={[styles.actionBtnSecondary, { flex: 0.48 }]}
              >
                <Text style={styles.actionBtnTextSec}>Gửi lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitContractOtp}
                style={[styles.actionBtnPrimary, { flex: 0.48 }]}
                disabled={signingContract}
              >
                {signingContract ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.actionBtnTextPri}>Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- DELIVERY RECORD MODAL (A4 STYLE) --- */}
      {deliveryModalOpen && activeDeliveryRecord && (
        <View style={styles.modalOverlay}>
          <View style={styles.paperModal}>
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setDeliveryModalOpen(false)}
            >
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>

            <ScrollView
              contentContainerStyle={styles.paperScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.a4Paper}>
                <View style={styles.docHeader}>
                  <View style={styles.docHeaderLeft}>
                    <Image
                      source={{
                        uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
                      }}
                      style={styles.docLogo}
                      resizeMode="contain"
                    />
                    <Text style={styles.companyName}>
                      CÔNG TY CỔ PHẦN{"\n"}DRIVESHARE LOGISTICS
                    </Text>
                  </View>
                  <View style={styles.docHeaderRight}>
                    <Text style={styles.govText}>
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </Text>
                    <Text style={styles.govMotto}>
                      Độc lập - Tự do - Hạnh phúc
                    </Text>
                    <View style={styles.docLine} />
                  </View>
                </View>
                <View style={styles.docTitleWrap}>
                  <Text style={styles.docMainTitle}>
                    BIÊN BẢN GIAO NHẬN HÀNG HÓA
                  </Text>
                  <Text style={styles.docRef}>
                    Số:{" "}
                    {activeDeliveryRecord.tripDeliveryRecordId
                      .substring(0, 8)
                      .toUpperCase()}
                    /BBGN
                  </Text>
                  <Text style={styles.docDate}>
                    Ngày:{" "}
                    {new Date(activeDeliveryRecord.createAt).toLocaleDateString(
                      "vi-VN"
                    )}
                  </Text>
                </View>
                <View style={styles.formSection}>
                  <View style={styles.formHeaderBar}>
                    <Text style={styles.formHeaderText}>
                      I. THÔNG TIN CÁC BÊN
                    </Text>
                  </View>
                  <View style={styles.partiesRow}>
                    <View style={styles.partyCol}>
                      <Text style={styles.partyLabel}>BÊN GIAO (Tài xế):</Text>
                      <Text style={styles.partyValue}>
                        {activeDeliveryRecord.driverPrimary?.fullName || "..."}
                      </Text>
                      <Text style={styles.partySub}>
                        SĐT: {activeDeliveryRecord.driverPrimary?.phoneNumber}
                      </Text>
                    </View>
                    <View style={styles.partyDivider} />
                    <View style={styles.partyCol}>
                      <Text style={styles.partyLabel}>
                        BÊN NHẬN (Khách hàng):
                      </Text>
                      <Text style={styles.partyValue}>
                        {activeDeliveryRecord.tripContact?.fullName || "..."}
                      </Text>
                      <Text style={styles.partySub}>
                        SĐT: {activeDeliveryRecord.tripContact?.phoneNumber}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.formSection}>
                  <View style={styles.formHeaderBar}>
                    <Text style={styles.formHeaderText}>
                      II. CHI TIẾT HÀNG HÓA
                    </Text>
                  </View>
                  <View style={styles.tableContainer}>
                    <View style={styles.tableHead}>
                      <Text style={[styles.th, { width: 40 }]}>STT</Text>
                      <Text style={[styles.th, { flex: 1 }]}>Tên hàng</Text>
                      <Text style={[styles.th, { width: 60 }]}>ĐVT</Text>
                      <Text style={[styles.th, { width: 50 }]}>SL</Text>
                    </View>
                    {(activeDeliveryRecord.tripDetail?.packages || []).map(
                      (p: any, i: number) => (
                        <View key={i} style={styles.tableRow}>
                          <Text
                            style={[
                              styles.td,
                              { width: 40, textAlign: "center" },
                            ]}
                          >
                            {i + 1}
                          </Text>
                          <Text style={[styles.td, { flex: 1 }]}>
                            <Text style={{ fontWeight: "bold" }}>
                              {p.item?.name || p.packageCode}
                            </Text>
                            {p.description ? `\n(${p.description})` : ""}
                          </Text>
                          <Text
                            style={[
                              styles.td,
                              { width: 60, textAlign: "center" },
                            ]}
                          >
                            {p.unit || "Kiện"}
                          </Text>
                          <Text
                            style={[
                              styles.td,
                              {
                                width: 50,
                                textAlign: "center",
                                fontWeight: "bold",
                              },
                            ]}
                          >
                            {p.quantity || 1}
                          </Text>
                        </View>
                      )
                    )}
                    <View style={styles.tableRow}>
                      <Text
                        style={[
                          styles.td,
                          { flex: 1, textAlign: "right", fontWeight: "bold" },
                        ]}
                      >
                        TỔNG CỘNG:
                      </Text>
                      <Text
                        style={[
                          styles.td,
                          {
                            width: 110,
                            textAlign: "center",
                            fontWeight: "bold",
                          },
                        ]}
                      >
                        {(
                          activeDeliveryRecord.tripDetail?.packages || []
                        ).reduce(
                          (sum: number, item: any) =>
                            sum + (item.quantity || 1),
                          0
                        )}{" "}
                        Kiện
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.signatureSection}>
                  <View style={styles.signBox}>
                    <Text style={styles.signTitle}>ĐẠI DIỆN BÊN GIAO</Text>
                    <View style={styles.signArea}>
                      {activeDeliveryRecord.driverSigned ? (
                        <View style={styles.stampBox}>
                          <Text style={styles.stampText}>ĐÃ KÝ</Text>
                        </View>
                      ) : (
                        <Text style={styles.unsignedText}>Chưa ký</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.signBox}>
                    <Text style={styles.signTitle}>ĐẠI DIỆN BÊN NHẬN</Text>
                    <View style={styles.signArea}>
                      {activeDeliveryRecord.contactSigned ? (
                        <View
                          style={[styles.stampBox, { borderColor: "#DC2626" }]}
                        >
                          <Text
                            style={[styles.stampText, { color: "#DC2626" }]}
                          >
                            ĐÃ KÝ
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.unsignedText}>Chưa ký</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.pdfButton}
                onPress={() => {
                  tripService
                    .getDeliveryRecordPdfLink(
                      activeDeliveryRecord.tripDeliveryRecordId
                    )
                    .then((r) =>
                      r?.result
                        ? Linking.openURL(r.result)
                        : Alert.alert("Thông báo", "Chưa có file PDF")
                    )
                    .catch(() => Alert.alert("Lỗi", "Không tải được PDF"));
                }}
              >
                <MaterialCommunityIcons
                  name="file-pdf-box"
                  size={20}
                  color="#374151"
                />
                <Text style={styles.pdfButtonText}>Xem PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.signButton,
                  (activeDeliveryRecord.driverSigned ||
                    signatureInProgress ||
                    !((activeDeliveryRecord.recordType ??
                      activeDeliveryRecord.type) === "PICKUP"
                      ? isPickupSignAllowed
                      : (activeDeliveryRecord.recordType ??
                          activeDeliveryRecord.type) === "DROPOFF"
                      ? isDropoffSignAllowed
                      : false)) &&
                    styles.btnDisabled,
                ]}
                disabled={
                  activeDeliveryRecord.driverSigned ||
                  signatureInProgress ||
                  !((activeDeliveryRecord.recordType ??
                    activeDeliveryRecord.type) === "PICKUP"
                    ? isPickupSignAllowed
                    : (activeDeliveryRecord.recordType ??
                        activeDeliveryRecord.type) === "DROPOFF"
                    ? isDropoffSignAllowed
                    : false)
                }
                onPress={async () => {
                  // Start multi-step signing flow: show confirmation -> send OTP -> enter OTP
                  setShowDeliverySignFlowModal(true);
                }}
              >
                {signatureInProgress ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.signButtonText}>
                    {activeDeliveryRecord.driverSigned
                      ? "Đã Ký Tên"
                      : "Ký Xác Nhận"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Confirm vehicle handover bar */}
      {trip.status === "READY_FOR_VEHICLE_HANDOVER" && (
        <View style={styles.returnVehicleBar} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.returnBtn, confirmingHandover && styles.btnDisabled]}
            onPress={confirmVehicleHandover}
            disabled={confirmingHandover}
          >
            {confirmingHandover ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.returnBtnText}>Xác nhận đã nhận xe</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Confirm vehicle returned bar */}
      {trip.status === "RETURNING_VEHICLE" && (
        <View style={styles.returnVehicleBar} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.returnBtn, confirmingReturn && styles.btnDisabled]}
            onPress={confirmVehicleReturn}
            disabled={confirmingReturn}
          >
            {confirmingReturn ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.returnBtnText}>Xác nhận đã trả xe</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 16 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  subTitle: { fontSize: 12, color: "#6B7280" },
  pill: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillText: { fontSize: 11, fontWeight: "700" },

  // Cards
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardNoPadding: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mapContainer: { position: "relative" },
  mapControls: { position: "absolute", bottom: 12, right: 12 },
  routeToggleRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  smallToggle: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  smallToggleActive: { backgroundColor: "#2563EB" },
  smallToggleText: { fontSize: 12, color: "#111827", fontWeight: "700" },
  smallToggleTextActive: { color: "#FFF" },
  mapFab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    elevation: 5,
  },
  mapFabDisabled: { backgroundColor: "#9CA3AF", opacity: 0.7 },
  mapFabText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  testBtn: {
    backgroundColor: "#111827",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  testBtnText: { color: "#FFF", fontWeight: "700" },
  startStatusBar: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    maxWidth: 220,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    elevation: 3,
  },
  startStatusText: { fontSize: 12, color: "#374151", textAlign: "center" },

  // Trip Route Stats
  tripRouteStats: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  statItem: { flex: 1, alignItems: "center" },
  verticalLine: {
    width: 1,
    backgroundColor: "#E5E7EB",
    height: "80%",
    alignSelf: "center",
  },
  statLabel: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "700", color: "#111827" },

  // Sections
  sectionHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },

  // KeyValue Row
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  kvLabel: { fontSize: 14, color: "#6B7280" },
  kvValue: { fontSize: 14, fontWeight: "600", color: "#111827" },

  // Package Cards
  packageCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  packageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  packageTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  packageBody: { marginBottom: 8 },
  packageInfo: { fontSize: 13, color: "#6B7280" },
  itemRow: {
    flexDirection: "row",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  itemThumb: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: "#FFF",
  },
  itemName: { fontSize: 13, fontWeight: "600", color: "#374151" },
  itemDesc: { fontSize: 11, color: "#6B7280" },
  itemValue: { fontSize: 12, fontWeight: "700", color: "#059669" },

  // Contacts
  contactRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  contactIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contactType: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  contactName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  contactPhone: { fontSize: 13, color: "#4B5563" },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },

  // Records
  recordItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  recordType: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  recordDate: { fontSize: 12, color: "#6B7280" },

  // Navigation Fullscreen & Mini Bar (Same as before)
  navFullscreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
    zIndex: 1000,
  },
  navActionBar: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  navActionBarAbove: { zIndex: 2500 },
  pauseBtn: {
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  pauseBtnText: { color: "#FFF", fontWeight: "700" },
  resumeBtn: {
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  resumeBtnText: { color: "#FFF", fontWeight: "700" },
  minBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  navMainBtn: {
    flex: 1,
    height: 48,
    backgroundColor: "#2563EB",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnGreen: { backgroundColor: "#10B981" },
  navMainBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.5, backgroundColor: "#9CA3AF" },
  stopBtn: {
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtnText: { color: "#FFF", fontWeight: "600" },
  miniBar: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#1F2937",
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    elevation: 10,
  },
  miniTitle: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  miniSub: { color: "#9CA3AF", fontSize: 12 },
  miniAction: {
    backgroundColor: "#374151",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  miniActionText: { color: "#FFF", fontWeight: "600", fontSize: 12 },

  // fullscreen nav timer overlay
  navTimerContainer: {
    position: "absolute",
    top: 20,
    left: 12,
    zIndex: 1100,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 40,
  },
  navTimerPanel: { flexDirection: "row", gap: 12, alignItems: "center" },
  timerCol: { minWidth: 160, padding: 8 },
  timerTitle: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  timerBig: { color: "#FFF", fontSize: 20, fontWeight: "900", marginTop: 6 },
  timerBigWarn: { color: "#F59E0B" },
  limitNote: { color: "#9CA3AF", fontSize: 11, fontWeight: "600" },
  navTimerStats: {
    flexDirection: "row",
    marginTop: 8,
    gap: 12,
    justifyContent: "space-between",
  },
  navStatItem: { alignItems: "center", paddingHorizontal: 6 },
  navStatLabel: { color: "#94A3B8", fontSize: 11 },
  navStatValue: { color: "#FFF", fontSize: 13, fontWeight: "800" },

  // Modal & Paper A4 Style
  modalOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  paperModal: {
    width: "95%",
    height: "90%",
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  paperHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  paperTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  closeModalBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: "#000",
    borderRadius: 20,
    padding: 6,
    opacity: 0.7,
  },
  paperScrollContent: { padding: 12, paddingBottom: 0 },
  a4Paper: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  docHeaderLeft: { width: "40%", alignItems: "center" },
  docLogo: { width: 40, height: 40, marginBottom: 4 },
  companyName: {
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
    color: "#1F2937",
  },
  docHeaderRight: { width: "58%", alignItems: "center" },
  govText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "center",
  },
  govMotto: {
    fontSize: 10,
    fontWeight: "bold",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 2,
  },
  docLine: { height: 1, width: 60, backgroundColor: "#000", marginTop: 2 },
  docTitleWrap: { alignItems: "center", marginBottom: 20 },
  docMainTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    textTransform: "uppercase",
    marginBottom: 4,
    textAlign: "center",
  },
  docRef: { fontSize: 11, color: "#6B7280", fontStyle: "italic" },
  docDate: { fontSize: 11, color: "#6B7280", fontStyle: "italic" },
  formSection: { marginBottom: 16, borderWidth: 1, borderColor: "#D1D5DB" },
  formHeaderBar: {
    backgroundColor: "#9CA3AF",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  formHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFF",
    textTransform: "uppercase",
  },
  partiesRow: { flexDirection: "row", padding: 10 },
  partyCol: { flex: 1 },
  partyDivider: { width: 1, backgroundColor: "#E5E7EB", marginHorizontal: 10 },
  partyLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
  },
  partyValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  partySub: { fontSize: 11, color: "#374151" },
  tableContainer: { width: "100%" },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#F3F4F6",
  },
  th: {
    fontSize: 11,
    fontWeight: "800",
    padding: 6,
    color: "#1F2937",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  td: {
    fontSize: 11,
    padding: 6,
    color: "#374151",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  noteBox: { padding: 8 },
  noteText: {
    fontSize: 11,
    color: "#4B5563",
    fontStyle: "italic",
    lineHeight: 16,
  },
  termsList: { padding: 12 },
  termItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  termIndex: { width: 20, fontSize: 12, fontWeight: "800", color: "#374151" },
  termContent: { flex: 1, fontSize: 12, color: "#374151", lineHeight: 18 },
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  signBox: { width: "45%", alignItems: "center" },
  signTitle: { fontSize: 11, fontWeight: "800", marginBottom: 2 },
  signSub: {
    fontSize: 10,
    color: "#6B7280",
    fontStyle: "italic",
    marginBottom: 8,
  },
  signArea: {
    width: "100%",
    height: 80,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  signerName: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    textAlign: "center",
  },
  stampBox: {
    borderWidth: 2,
    borderColor: "#059669",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    transform: [{ rotate: "-10deg" }],
    alignItems: "center",
  },
  stampText: {
    color: "#059669",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
  },
  stampDate: { color: "#059669", fontSize: 8 },
  unsignedText: { color: "#9CA3AF", fontSize: 10 },
  modalFooter: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  pdfButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    gap: 6,
  },
  pdfButtonText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  signButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    gap: 6,
  },
  signButtonText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  actionBtnSecondary: {
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnTextSec: { color: "#374151", fontWeight: "600" },
  actionBtnPrimary: {
    backgroundColor: "#2563EB",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnTextPri: { color: "#FFF", fontWeight: "600" },
  // btnDisabled: { backgroundColor: '#9CA3AF', opacity: 0.7 },

  // OTP
  otpRow: { flexDirection: "row", justifyContent: "space-between" },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  otpInput: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    padding: 0,
    height: 52,
    width: "100%",
  },

  // Toast
  toastContainer: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 3000,
  },
  toastText: { color: "#FFF", fontSize: 13, fontWeight: "600" },
  // Driving hours widget
  hoursWidget: {
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  hoursTitle: { fontSize: 12, fontWeight: "700", color: "#374151" },
  timerText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginTop: 4,
  },
  smallStatLabel: { fontSize: 11, color: "#6B7280" },
  smallStatValue: { fontSize: 13, fontWeight: "800", color: "#111827" },

  // Debug box
  debugBox: {
    position: "absolute",
    top: 74,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 8,
    zIndex: 4000,
  },
  debugText: { color: "#FFF", fontSize: 11, lineHeight: 16 },

  // Contract
  // Return vehicle bar
  returnVehicleBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    zIndex: 5000,
    alignItems: "center",
  },
  returnBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#0EA5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  returnBtnText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  moneyBox: {
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    marginBottom: 12,
  },
  moneyLabel: { fontSize: 12, color: "#166534" },
  moneyValue: { fontSize: 20, fontWeight: "800", color: "#15803D" },
  contractActions: { flexDirection: "row", gap: 10 },
  completedSign: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    padding: 10,
    borderRadius: 8,
  },
});

export default DriverTripDetailScreenV2;
