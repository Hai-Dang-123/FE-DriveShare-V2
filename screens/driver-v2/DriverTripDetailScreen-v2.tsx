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
  ToastAndroid,
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
import tripDriverContractService from "@/services/tripDriverContractService";
import tripDeliveryIssueService, { DeliveryIssueType } from "@/services/tripDeliveryIssueService";
import assignmentService from "@/services/assignmentService";
import { useAuth } from "@/hooks/useAuth";
import * as ImagePicker from 'expo-image-picker';

// Document Components
import { ContractDocument } from "@/components/documents/ContractDocument";
import { DeliveryRecordDocument } from "@/components/documents/DeliveryRecordDocument";
import { HandoverRecordDocument } from "@/components/documents/HandoverRecordDocument";
import IssueImagePicker from "@/components/shared/IssueImagePicker";
import HandoverChecklistEditor, { HandoverChecklistFormData } from "@/components/shared/HandoverChecklistEditor";

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

// --- VehicleIssueType Helper ---
type VehicleIssueType = 
  | 'SCRATCH' | 'DENT' | 'CRACK' | 'PAINT_PEELING'
  | 'DIRTY' | 'ODOR'
  | 'MECHANICAL' | 'ELECTRICAL' | 'TIRE'
  | 'MISSING_ITEM'
  | 'OTHER';

const getIssueTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    SCRATCH: 'Trầy xước',
    DENT: 'Móp méo',
    CRACK: 'Nứt/Vỡ',
    PAINT_PEELING: 'Tróc sơn',
    DIRTY: 'Dơ bẩn',
    ODOR: 'Có mùi hôi',
    MECHANICAL: 'Lỗi động cơ',
    ELECTRICAL: 'Lỗi điện',
    TIRE: 'Lỗi lốp xe',
    MISSING_ITEM: 'Mất phụ kiện',
    OTHER: 'Khác',
  };
  return labels[type] || type;
};

// --- Alert Helper (Web & Mobile compatible) ---
const showAlertCrossPlatform = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, onOk ? [{ text: "OK", onPress: onOk }] : undefined);
  }
};

const showConfirmCrossPlatform = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText: string = "Xác nhận",
  cancelText: string = "Hủy"
): Promise<boolean> => {
  return new Promise((resolve) => {
    if (Platform.OS === "web") {
      const result = window.confirm(`${title}\n\n${message}`);
      if (result) {
        if (onConfirm) onConfirm();
        resolve(true);
      } else {
        if (onCancel) onCancel();
        resolve(false);
      }
    } else {
      Alert.alert(
        title,
        message,
        [
          {
            text: cancelText,
            style: "cancel",
            onPress: () => {
              if (onCancel) onCancel();
              resolve(false);
            },
          },
          {
            text: confirmText,
            onPress: () => {
              if (onConfirm) onConfirm();
              resolve(true);
            },
          },
        ],
        { cancelable: true }
      );
    }
  });
};

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
  vehiclePickupAddress: string;
  vehiclePickupLat: number;
  vehiclePickupLng: number;
  vehicleDropoffAddress: string;
  vehicleDropoffLat: number;
  vehicleDropoffLng: number;
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
  tripVehicleHandoverRecordId?: string | null;
  tripVehicleReturnRecordId?: string | null;
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
  phoneNumber?: string;
  baseAmount: number;
  depositAmount: number;
  depositStatus: string;
  startAddress?: string;
  startLat?: number;
  startLng?: number;
  endAddress?: string;
  endLat?: number;
  endLng?: number;
  isOnBoard: boolean;
  onBoardTime: string | null;
  onBoardLocation: string | null;
  onBoardImage: string | null;
  checkInNote: string | null;
  isFinished: boolean;
  offBoardTime: string | null;
  offBoardLocation: string | null;
  offBoardImage: string | null;
  checkOutNote: string | null;
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
  recordType?: "PICKUP" | "DROPOFF"; // Optional for backward compatibility
  type?: "PICKUP" | "DROPOFF"; // API returns "type" field
  note: string;
  createAt: string;
  terms: DeliveryTermInfo[];
  driverSigned?: boolean;
  contactSigned?: boolean;
  issues?: Array<{
    tripDeliveryIssueId: string;
    issueType: string;
    description: string;
    status: string;
    createdAt: string;
    imageUrls?: string[];
  }>;
}
interface DeliveryTermInfo {
  deliveryRecordTermId: string;
  content: string;
  displayOrder: number;
}
interface VehicleHandoverRecordInfo {
  tripVehicleHandoverRecordId: string;
  type: "HANDOVER" | "RETURN";
  status: string;
  createAt: string;
  handoverSignatureUrl?: string;
  receiverSignatureUrl?: string;
  terms: VehicleHandoverTermInfo[];
}
interface VehicleHandoverTermInfo {
  content: string;
  isChecked: boolean;
  deviation?: string;
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
  const [refreshing, setRefreshing] = useState(false);
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

  // Detect current driver role (PRIMARY or SECONDARY)
  const currentDriver = useMemo(() => {
    if (!trip || !user) return null;
    return (
      trip.drivers?.find(
        (d) => String(d.driverId) === String(user.userId)
      ) || null
    );
  }, [trip, user]);

  const isMainDriver = currentDriver?.type === "PRIMARY";
  
  // Check if secondary driver has checked out and trip not completed yet
  const isSecondaryDriverCheckedOut = useMemo(() => {
    if (!currentDriver || !trip) return false;
    const isSecondary = currentDriver.type === "SECONDARY";
    const hasCheckedOut = currentDriver.isFinished === true || !!currentDriver.offBoardTime;
    const tripNotCompleted = trip.status !== "COMPLETED";
    return isSecondary && hasCheckedOut && tripNotCompleted;
  }, [currentDriver, trip]);

  // Current session info (ai đang lái xe)
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(false);

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

  // Vehicle handover/return modal state
  const [showVehicleHandoverModal, setShowVehicleHandoverModal] =
    useState(false);
  const [activeVehicleHandoverRecord, setActiveVehicleHandoverRecord] =
    useState<any>(null);
  const [loadingVehicleHandoverRecord, setLoadingVehicleHandoverRecord] =
    useState(false);

  const handleSendContractOtp = async () => {
    if (!myDriverContract?.contractId)
      return showAlertCrossPlatform("Lỗi", "Không có hợp đồng để ký");
    // Step 1: Show contract modal
    setShowContractModal(true);
  };

  const handleSignContractFromModal = () => {
    // Step 2: Show digital signature terms
    setShowDigitalSignatureTerms(true);
  };

  const handleAcceptDigitalSignatureTerms = async () => {
    if (!myDriverContract?.contractId) return;
    setShowDigitalSignatureTerms(false);
    setSigningContract(true);
    try {
      // Step 3: Send OTP using TripProviderContract API
      const res: any = await tripProviderContractService.sendSignOtp(
        myDriverContract.contractId
      );
      const ok = res?.isSuccess ?? res?.statusCode === 200;
      if (!ok) {
        showAlertCrossPlatform("Lỗi", res?.message || "Không thể gửi mã xác nhận");
        return;
      }
      const sentTo =
        res?.result?.sentTo || res?.result?.email || res?.message || null;
      setOtpSentTo(sentTo);
      setOtpDigits(Array(6).fill(""));
      setShowContractOtpModal(true);
      setTimeout(() => otpInputsRef.current?.[0]?.focus?.(), 200);
    } catch (e: any) {
      showAlertCrossPlatform("Lỗi", e?.message || "Không thể gửi mã xác nhận");
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
      return showAlertCrossPlatform(
        "Không đủ điều kiện",
        eligibility.message || "Bạn không đủ điều kiện lái xe hiện tại"
      );
    }
    const contHours = continuousSeconds / 3600;
    if (contHours >= 4) {
      setStartingNav(false);
      return showAlertCrossPlatform(
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
            console.log('[startNavigationToPickupAddress] Start session response:', JSON.stringify(resp, null, 2));
            if (!(resp?.isSuccess ?? resp?.statusCode === 200)) {
              showAlertCrossPlatform(
                "Lỗi",
                resp?.message || "Không thể bắt đầu phiên làm việc"
              );
              setPickupRouteCoords(null);
              return;
            }
            // backend returns sessionId in resp.result.sessionId
            const sid = resp?.result?.sessionId ?? resp?.result?.SessionId ?? null;
            console.log('[startNavigationToPickupAddress] Extracted session ID:', sid, 'type:', typeof sid);
            if (!sid || typeof sid !== 'string') {
              console.error('[startNavigationToPickupAddress] Invalid session ID:', sid);
              showAlertCrossPlatform('Lỗi', 'Không nhận được ID phiên làm việc hợp lệ');
              setPickupRouteCoords(null);
              return;
            }
            setDriverSessionId(sid);
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
            showAlertCrossPlatform(
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
      } catch { }
    } catch (error: any) {
      showAlertCrossPlatform("Lỗi", error?.message || "Không thể bắt đầu dẫn đường");
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
      return showAlertCrossPlatform(
        "Không đủ điều kiện",
        eligibility.message || "Bạn không đủ điều kiện lái xe hiện tại"
      );
    }
    const contHours = continuousSeconds / 3600;
    if (contHours >= 4) {
      setStartingNav(false);
      return showAlertCrossPlatform(
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
            console.log('[startNavigationToDeliveryAddress] Start session response:', JSON.stringify(resp, null, 2));
            if (!(resp?.isSuccess ?? resp?.statusCode === 200)) {
              showAlertCrossPlatform(
                "Lỗi",
                resp?.message || "Không thể bắt đầu phiên làm việc"
              );
              setDeliveryRouteCoords(null);
              return;
            }
            // backend returns sessionId in resp.result.sessionId
            const sid = resp?.result?.sessionId ?? resp?.result?.SessionId ?? null;
            console.log('[startNavigationToDeliveryAddress] Extracted session ID:', sid, 'type:', typeof sid);
            if (!sid || typeof sid !== 'string') {
              console.error('[startNavigationToDeliveryAddress] Invalid session ID:', sid);
              showAlertCrossPlatform('Lỗi', 'Không nhận được ID phiên làm việc hợp lệ');
              setDeliveryRouteCoords(null);
              return;
            }
            setDriverSessionId(sid);
            setActiveSessionStart(new Date());
            setContinuousSeconds(0);
            setStoppedSeconds(0);
            setIsSessionRunning(true);
            setSessionPaused(false);
            loadEligibilityAndSession();
          } catch (e: any) {
            console.warn("[DriverTripDetail] start session failed", e);
            showAlertCrossPlatform(
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
      } catch { }
    } catch (error: any) {
      showAlertCrossPlatform("Lỗi", error?.message || "Không thể bắt đầng dẫn đường");
    } finally {
      setStartingNav(false);
    }
  };

  const startNavigationToReturnPoint = async () => {
    if (startingNav || !trip) return;
    setStartingNav(true);
    
    // Check eligibility
    if (!eligibility) await loadEligibilityAndSession();
    if (eligibility && !eligibility.canDrive) {
      setStartingNav(false);
      return showAlertCrossPlatform(
        "Không đủ điều kiện",
        eligibility.message || "Bạn không đủ điều kiện lái xe hiện tại"
      );
    }
    
    const contHours = continuousSeconds / 3600;
    if (contHours >= 4) {
      setStartingNav(false);
      return showAlertCrossPlatform(
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

      // Get vehicle dropoff coordinates (return point)
      const returnPoint: Position = [
        trip.vehicleDropoffLng,
        trip.vehicleDropoffLat,
      ];

      if (!returnPoint[0] || !returnPoint[1]) {
        throw new Error("Không tìm thấy toạ độ điểm trả xe");
      }

      // Plan route to return point
      try {
        const planned = await vietmapService.planBetweenPoints(
          currentPosition,
          returnPoint,
          "car"
        );
        
        if (planned.coordinates?.length) {
          const coerced = planned.coordinates.map((c: any) => [
            Number(c[0]),
            Number(c[1]),
          ]) as [number, number][];
          
          setRouteCoords(coerced);
          setVisibleRoute("overview");
          if (planned.instructions) setRouteInstructions(planned.instructions);

          // Start driver work session
          try {
            const resp: any = await driverWorkSessionService.start({
              TripId: trip.tripId,
            });
            
            if (!(resp?.isSuccess ?? resp?.statusCode === 200)) {
              showAlertCrossPlatform(
                "Lỗi",
                resp?.message || "Không thể bắt đầu phiên làm việc"
              );
              return;
            }

            let sid = resp?.result?.sessionId ?? resp?.result?.driverWorkSessionId ?? resp?.result?.DriverWorkSessionId ?? null;
            if (sid && typeof sid === 'object') {
              sid = (sid as any).sessionId ?? (sid as any).DriverWorkSessionId ?? (sid as any).driverWorkSessionId ?? null;
            }
            
            if (!sid || typeof sid !== 'string') {
              console.error('[startNavigationToReturnPoint] Invalid session ID:', sid, 'Response:', resp);
              showAlertCrossPlatform('Lỗi', 'Không nhận được ID phiên làm việc hợp lệ');
              return;
            }

            setDriverSessionId(sid);
            setIsSessionRunning(true);
            setActiveSessionStart(new Date());
            setSessionPaused(false);
            await loadEligibilityAndSession();
          } catch (sessionErr: any) {
            showAlertCrossPlatform(
              "Lỗi",
              sessionErr?.message || "Không thể bắt đầu phiên làm việc"
            );
            return;
          }

          // Start navigation
          setNavActive(true);
          setNavMinimized(false);
          setNavHidden(false);
          setJourneyPhase("TO_DELIVERY"); // Reuse delivery phase for return journey
          setStartModalOpen(false);
          startLocationWatcher();
          
          try {
            Speech.speak("Bắt đầu dẫn đường đến điểm trả xe", {
              language: "vi-VN",
            });
          } catch { }
        } else {
          throw new Error("Không thể lập tuyến đường");
        }
      } catch (planErr: any) {
        throw new Error(planErr?.message || "Không thể lập tuyến đường");
      }
    } catch (error: any) {
      showAlertCrossPlatform("Lỗi", error?.message || "Không thể bắt đầu dẫn đường");
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
    if (otp.length < 6) return showAlertCrossPlatform("OTP", "Vui lòng nhập đủ 6 chữ số");
    if (!myDriverContract?.contractId) return;
    setSigningContract(true);
    try {
      // Step 4: Sign contract using TripDriverContract API
      const dto = { ContractId: myDriverContract.contractId, Otp: otp };
      const res: any = await tripDriverContractService.signContract(dto);
      const ok = res?.isSuccess ?? res?.statusCode === 200;
      if (!ok) {
        showAlertCrossPlatform("Ký thất bại", res?.message || "Mã OTP không hợp lệ");
        return;
      }
      showAlertCrossPlatform("Thành công", "Ký hợp đồng thành công! ✅");
      setShowContractOtpModal(false);
      setShowContractModal(false);
      await fetchTripData();
    } catch (e: any) {
      showAlertCrossPlatform("Lỗi", e?.message || "Có lỗi khi xác thực OTP");
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
        showAlertCrossPlatform("Đã gửi", "Mã xác nhận đã được gửi lại");
        setOtpDigits(Array(6).fill(""));
        setTimeout(() => otpInputsRef.current?.[0]?.focus?.(), 200);
      } else {
        showAlertCrossPlatform("Lỗi", res?.message || "Không thể gửi lại mã");
      }
    } catch (e: any) {
      showAlertCrossPlatform("Lỗi", e?.message || "Không thể gửi lại mã");
    }
  };

  // Delivery signing: send OTP for delivery record
  const sendDeliverySignOtp = async () => {
    if (!activeDeliveryRecord)
      return showAlertCrossPlatform("Lỗi", "Không có biên bản để ký");
    setDeliverySigningInProgress(true);
    try {
      const res: any = await tripService.sendSignOtp(
        activeDeliveryRecord.tripDeliveryRecordId
      );
      const ok = res?.isSuccess ?? res?.statusCode === 200;
      if (!ok) {
        showAlertCrossPlatform("Lỗi", res?.message || "Không thể gửi mã xác nhận");
        return;
      }
      const sentTo = res?.result?.sentTo || res?.message || null;
      setDeliveryOtpSentTo(sentTo);
      setDeliveryOtpDigits(Array(6).fill(""));
      setShowDeliverySignFlowModal(false);
      setShowDeliveryOtpModal(true);
      setTimeout(() => deliveryOtpInputsRef.current?.[0]?.focus?.(), 200);
    } catch (e: any) {
      showAlertCrossPlatform("Lỗi", e?.message || "Không thể gửi mã xác nhận");
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
        showAlertCrossPlatform("Đã gửi", "Mã xác nhận đã được gửi lại");
        setDeliveryOtpDigits(Array(6).fill(""));
        setTimeout(() => deliveryOtpInputsRef.current?.[0]?.focus?.(), 200);
      } else {
        showAlertCrossPlatform("Lỗi", res?.message || "Không thể gửi lại mã");
      }
    } catch (e: any) {
      showAlertCrossPlatform("Lỗi", e?.message || "Không thể gửi lại mã");
    }
  };

  const submitDeliveryOtp = async () => {
    const otp = deliveryOtpDigits.join("");
    if (otp.length < 6) return showAlertCrossPlatform("OTP", "Vui lòng nhập đủ 6 chữ số");
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
        showAlertCrossPlatform("Ký thất bại", res?.message || "Mã OTP không hợp lệ");
        return;
      }
      showToast("Ký biên bản thành công");
      setShowDeliveryOtpModal(false);
      // refresh record and trip
      const fresh = await tripService.getDeliveryRecordForDriver(
        activeDeliveryRecord.tripDeliveryRecordId
      );
      if (fresh?.isSuccess) {
        const rec = fresh.result;
        // Map deliveryRecordTerms to terms format for component
        if (rec.deliveryRecordTemplate?.deliveryRecordTerms && Array.isArray(rec.deliveryRecordTemplate.deliveryRecordTerms)) {
          rec.terms = rec.deliveryRecordTemplate.deliveryRecordTerms.map((term: any) => ({
            deliveryRecordTermId: term.deliveryRecordTermId,
            content: term.content || "",
            displayOrder: term.displayOrder || 0,
          }));
        } else {
          rec.terms = [];
        }
        setActiveDeliveryRecord(rec);
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
      showAlertCrossPlatform("Lỗi", e?.message || "Có lỗi khi xác thực OTP");
    } finally {
      setDeliverySigningInProgress(false);
    }
  };

  // ========== ISSUE REPORT HANDLERS (FOR PICKUP) ==========
  const handleOpenIssueReport = () => {
    if (!activeDeliveryRecord) return;
    setIssueType(DeliveryIssueType.DAMAGED);
    setIssueDescription("");
    setIssueImages([]);
    setShowIssueReportModal(true);
  };

  const handleSubmitIssueReport = async () => {
    console.log("🔘 Button pressed!");
    console.log("📋 Check conditions:", {
      activeDeliveryRecord: !!activeDeliveryRecord,
      tripId: tripId,
      description: issueDescription,
      descriptionTrimmed: issueDescription.trim(),
    });
    
    if (!activeDeliveryRecord || !tripId) {
      console.log("❌ Missing activeDeliveryRecord or tripId");
      return;
    }
    
    if (!issueDescription.trim()) {
      console.log("❌ Description is empty");
      showAlertCrossPlatform("Lỗi", "Vui lòng nhập mô tả sự cố");
      return;
    }

    try {
      setSubmittingIssue(true);
      console.log("✅ Starting submission...");

      // Create DTO
      const dto = {
        TripId: tripId,
        DeliveryRecordId: activeDeliveryRecord.tripDeliveryRecordId,
        IssueType: issueType,
        Description: issueDescription.trim(),
      };

      console.log("📝 Submitting issue report with", issueImages.length, "images");
      console.log("📦 DTO:", dto);
      
      // Send DTO + images in one request
      const response = await tripDeliveryIssueService.reportIssue(dto, issueImages);
      console.log("📥 Response:", response);
      
      if (response.isSuccess) {
        showAlertCrossPlatform(
          "Thành công", 
          issueImages.length > 0 
            ? `Đã báo cáo sự cố với ${issueImages.length} ảnh minh chứng`
            : "Đã báo cáo sự cố thành công"
        );
        
        // Close modal and reset form
        setShowIssueReportModal(false);
        setIssueDescription("");
        setIssueImages([]);
        
        // Refresh delivery record to get updated issues
        console.log("🔄 Refreshing delivery record...");
        try {
          const refreshRes = await tripService.getDeliveryRecordForDriver(
            activeDeliveryRecord.tripDeliveryRecordId
          );
          if (refreshRes?.isSuccess) {
            const rec = refreshRes.result;
            // Map terms
            if (rec.deliveryRecordTemplate?.deliveryRecordTerms && Array.isArray(rec.deliveryRecordTemplate.deliveryRecordTerms)) {
              rec.terms = rec.deliveryRecordTemplate.deliveryRecordTerms.map((term: any) => ({
                deliveryRecordTermId: term.deliveryRecordTermId,
                content: term.content || "",
                displayOrder: term.displayOrder || 0,
              }));
            }
            setActiveDeliveryRecord(rec);
            console.log("✅ Delivery record refreshed with issues:", rec.issues?.length || 0);
          }
        } catch (err) {
          console.error("❌ Failed to refresh delivery record:", err);
        }
      } else {
        showAlertCrossPlatform("Lỗi", response.message || "Không thể báo cáo sự cố");
      }
    } catch (error: any) {
      console.error("Error submitting issue:", error);
      showAlertCrossPlatform("Lỗi", error?.message || "Có lỗi khi báo cáo sự cố");
    } finally {
      setSubmittingIssue(false);
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
  
  // Issue Report Modal State (for PICKUP)
  const [showIssueReportModal, setShowIssueReportModal] = useState(false);
  const [issueType, setIssueType] = useState<DeliveryIssueType>(DeliveryIssueType.DAMAGED);
  const [issueDescription, setIssueDescription] = useState("");
  const [issueImages, setIssueImages] = useState<(string | File)[]>([]);
  const [submittingIssue, setSubmittingIssue] = useState(false);
  
  // Check-in Modal States
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInImage, setCheckInImage] = useState<any>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInRouteCoordinates, setCheckInRouteCoordinates] = useState<Position[]>([]);
  const [overlayMapReady, setOverlayMapReady] = useState(false);
  
  // Check-out Modal States
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [checkOutImage, setCheckOutImage] = useState<any>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  // Cache blob URLs for check-in/check-out images to prevent memory leaks
  const checkInImageUrl = useMemo(() => {
    if (!checkInImage) return '';
    if (checkInImage instanceof File) return URL.createObjectURL(checkInImage);
    return checkInImage.uri || '';
  }, [checkInImage]);

  const checkOutImageUrl = useMemo(() => {
    if (!checkOutImage) return '';
    if (checkOutImage instanceof File) return URL.createObjectURL(checkOutImage);
    return checkOutImage.uri || '';
  }, [checkOutImage]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (checkInImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(checkInImageUrl);
      }
      if (checkOutImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(checkOutImageUrl);
      }
    };
  }, [checkInImageUrl, checkOutImageUrl]);
  
  // Vehicle handover states
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [activeHandoverRecord, setActiveHandoverRecord] = useState<any | null>(
    null
  );
  const [loadingHandoverRecord, setLoadingHandoverRecord] = useState(false);
  // Edit checklist states - using new HandoverChecklistEditor component
  const [showHandoverEditor, setShowHandoverEditor] = useState(false);
  // OTP signing states for vehicle handover
  const [showHandoverOtpModal, setShowHandoverOtpModal] = useState(false);
  const [handoverOtpDigits, setHandoverOtpDigits] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [handoverOtpLoading, setHandoverOtpLoading] = useState(false);
  const [sendingHandoverOtp, setSendingHandoverOtp] = useState(false);
  const handoverOtpInputRefs = useRef<Array<TextInput | null>>([]);

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
    "overview" | "toPickup" | "toDelivery" | "toReturn"
  >("overview");
  const [driverSessionId, setDriverSessionId] = useState<string | null>(null);
  const [sessionPaused, setSessionPaused] = useState<boolean>(false);
  const [isResuming, setIsResuming] = useState<boolean>(false); // Guard for resume button
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
  const [showApproachingAlert, setShowApproachingAlert] = useState<boolean>(false);
  const [approachAlertShown, setApproachAlertShown] = useState<boolean>(false);
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

  // Polling: Auto-refresh session info khi có nhiều tài xế
  useEffect(() => {
    if (!trip || !tripId) return;

    const hasMultipleDrivers = (trip.drivers?.length || 0) > 1;
    const isActiveTrip = ['IN_PROGRESS', 'READY_FOR_VEHICLE_HANDOVER', 'VEHICLE_HANDOVERED'].includes(trip.status);

    if (hasMultipleDrivers && isActiveTrip) {
      console.log('[DriverTripDetail] Starting session polling (15s interval)');
      const interval = setInterval(() => {
        fetchCurrentSession();
      }, 15000); // 15 seconds

      return () => {
        console.log('[DriverTripDetail] Stopping session polling');
        clearInterval(interval);
      };
    }
  }, [trip, tripId]);

  const loadEligibilityAndSession = async () => {
    try {
      const resp: any = await driverWorkSessionService.checkEligibility();
      const data = resp?.result ?? resp;
      
      // Handle rate limiting
      if (resp?.statusCode === 429) {
        console.warn("[DriverTripDetail] Rate limited - eligibility check");
        // Set default eligibility to allow continued operation
        setEligibility({
          canDrive: true,
          message: "Tạm thời không thể kiểm tra điều kiện lái xe",
          hoursToday: 0,
          hoursWeek: 0,
        });
        return;
      }
      
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
    } catch (e: any) {
      console.warn("[DriverTripDetail] load eligibility failed", e);
      // On network error, set permissive defaults to not block user
      setEligibility({
        canDrive: true,
        message: e?.message?.includes("CORS") || e?.message?.includes("Network") 
          ? "Không thể kết nối server. Vui lòng kiểm tra kết nối mạng." 
          : "Tạm thời không thể kiểm tra điều kiện lái xe",
        hoursToday: 0,
        hoursWeek: 0,
      });
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

  // Fetch check-in route when map is ready and driver not checked in
  useEffect(() => {
    const fetchCheckInRoute = async () => {
      if (!trip || !currentDriver) {
        console.log('[CheckInRoute] No trip or currentDriver');
        return;
      }
      
      const needsCheckIn = !currentDriver.isOnBoard;
      
      console.log('[CheckInRoute] needsCheckIn:', needsCheckIn, 'isOnBoard:', currentDriver.isOnBoard, 'mapReady:', overlayMapReady);
      
      // Reset map ready state when needsCheckIn changes
      if (!needsCheckIn && overlayMapReady) {
        setOverlayMapReady(false);
        console.log('[CheckInRoute] Reset map ready state');
        return;
      }
      
      if (!needsCheckIn || !overlayMapReady) return;
      
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('[CheckInRoute] Location permission denied');
          return;
        }
        
        const now = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const myLat = now.coords.latitude;
        const myLng = now.coords.longitude;
        
        // Lấy điểm xuất phát của driver (startAddress) từ API
        const driverStartLat = currentDriver?.startLat;
        const driverStartLng = currentDriver?.startLng;
        
        console.log('[CheckInRoute] My current location:', myLat, myLng);
        console.log('[CheckInRoute] Driver start location (from API):', driverStartLat, driverStartLng);
        
        if (!driverStartLat || !driverStartLng) {
          console.log('[CheckInRoute] No driver start location in API response');
          return;
        }
        
        // Fetch route from current location to driver's start address using planBetweenPoints
        console.log('[CheckInRoute] Fetching route to driver start address...');
        const routeRes = await vietmapService.planBetweenPoints(
          [myLng, myLat],
          [driverStartLng, driverStartLat]
        );
        
        console.log('[CheckInRoute] Route result:', routeRes?.coordinates?.length || 0, 'points');
        
        if (routeRes && routeRes.coordinates && routeRes.coordinates.length > 0) {
          setCheckInRouteCoordinates(routeRes.coordinates as Position[]);
          console.log('[CheckInRoute] ✓ Route set successfully');
        } else {
          // Fallback to just two points
          const fallbackRoute = [
            [myLng, myLat] as Position,
            [driverStartLng, driverStartLat] as Position
          ];
          setCheckInRouteCoordinates(fallbackRoute);
          console.log('[CheckInRoute] ⚠ Using fallback route (2 points)');
        }
      } catch (err) {
        console.error('[CheckInRoute] Error:', err);
      }
    };
    
    fetchCheckInRoute();
  }, [trip, currentDriver, overlayMapReady]);

  // Set overlay map ready after a short delay when driver not checked in
  useEffect(() => {
    if (!trip || !currentDriver) return;
    
    const needsCheckIn = !currentDriver.isOnBoard;
    
    if (needsCheckIn && !overlayMapReady) {
      // Wait for map to render before setting ready
      const timer = setTimeout(() => {
        console.log('[CheckInRoute] ✓ Overlay map ready (delayed)');
        setOverlayMapReady(true);
      }, 1500); // 1.5 second delay to ensure map is fully loaded
      
      return () => clearTimeout(timer);
    } else if (!needsCheckIn && overlayMapReady) {
      setOverlayMapReady(false);
      console.log('[CheckInRoute] Reset map ready state');
    }
  }, [currentDriver?.isOnBoard, overlayMapReady]);

  const fetchCurrentSession = async () => {
    if (!tripId) return;
    try {
      setLoadingSession(true);
      const res = await driverWorkSessionService.getCurrentSessionInTrip(tripId);
      console.log('[DriverTripDetail] Current session:', res);
      if (res?.isSuccess && res?.result) {
        setCurrentSession(res.result);
      } else {
        setCurrentSession(null); // Không có ai đang lái
      }
    } catch (e: any) {
      console.warn('[DriverTripDetail] Failed to fetch current session:', e);
      setCurrentSession(null);
    } finally {
      setLoadingSession(false);
    }
  };

  const fetchTripData = async () => {
    try {
      const res = (await tripService.getById(tripId!)) as TripDetailAPIResponse;
      if (!res?.isSuccess || res?.statusCode !== 200) {
        // Handle rate limiting
        if (res?.statusCode === 429) {
          throw new Error("Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.");
        }
        throw new Error(res?.message || "Lỗi tải chuyến");
      }

      const data = res.result;

      // Extract handover record IDs from handoverReadDTOs array
      if (
        (data as any).handoverReadDTOs &&
        Array.isArray((data as any).handoverReadDTOs)
      ) {
        const handoverRecord = (data as any).handoverReadDTOs.find(
          (r: any) => r && r.type === "HANDOVER"
        );
        const returnRecord = (data as any).handoverReadDTOs.find(
          (r: any) => r && r.type === "RETURN"
        );

        (data as any).tripVehicleHandoverRecordId =
          handoverRecord?.tripVehicleHandoverRecordId || null;
        (data as any).tripVehicleReturnRecordId =
          returnRecord?.tripVehicleHandoverRecordId || null;
      }

      setTrip(data);

      if (data?.tripRoute?.routeData) {
        const { coords } = extractRouteWithSteps(data.tripRoute.routeData);
        setRouteCoords(coords as [number, number][]);
        if (coords.length > 0) {
          setStartPoint(coords[0] as [number, number]);
          setEndPoint(coords[coords.length - 1] as [number, number]);
        }
      }

      // Fetch current session sau khi load trip
      await fetchCurrentSession();
    } catch (e: any) {
      console.error("[DriverTripDetail] fetchTripData error:", e);
      
      // Provide user-friendly error messages
      let errorMsg = "Lỗi không xác định";
      
      if (e?.code === "ERR_NETWORK" || e?.message?.includes("Network Error")) {
        errorMsg = "Không thể kết nối đến server. Vui lòng kiểm tra:\n• Kết nối mạng\n• VPN (nếu có)\n• Cấu hình CORS của backend";
      } else if (e?.response?.status === 429 || e?.message?.includes("429")) {
        errorMsg = "Quá nhiều yêu cầu. Vui lòng đợi ít phút rồi thử lại.";
      } else if (e?.message?.includes("CORS")) {
        errorMsg = "Lỗi CORS: Backend chưa cho phép truy cập từ nguồn này.\nVui lòng liên hệ admin để cấu hình CORS.";
      } else {
        errorMsg = e?.message || "Lỗi không xác định";
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing || !tripId) return;
    setRefreshing(true);
    try {
      await fetchTripData();
    } finally {
      setRefreshing(false);
    }
  };

  // --- Navigation Logic ---
  const startNavigation = async () => {
    if (startingNav || !trip) return;
    if (trip.status !== "READY_FOR_VEHICLE_HANDOVER") {
      if (trip.status === "PENDING_DRIVER_ASSIGNMENT") {
        showAlertCrossPlatform(
          "Chưa sẵn sàng",
          "Đang chờ chủ đơn xác nhận hoàn thành chuyến."
        );
      } else {
        showAlertCrossPlatform(
          "Chưa sẵn sàng",
          "Trạng thái chuyến chưa cho phép bắt đầu dẫn đường."
        );
      }
      return;
    }
    // check eligibility before starting
    if (!eligibility) await loadEligibilityAndSession();
    if (eligibility && !eligibility.canDrive) {
      return showAlertCrossPlatform(
        "Không đủ điều kiện",
        eligibility.message || "Bạn không đủ điều kiện lái xe hiện tại"
      );
    }
    const contHours = continuousSeconds / 3600;
    if (contHours >= 4) {
      return showAlertCrossPlatform(
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
      } catch { }
    } catch (error: any) {
      showAlertCrossPlatform("Lỗi", error.message);
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
        return showAlertCrossPlatform("Lỗi", "Không thể xác định toạ độ điểm lấy hàng");

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
      showAlertCrossPlatform(
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
        return showAlertCrossPlatform("Lỗi", "Không thể xác định toạ độ điểm giao hàng");

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
      showAlertCrossPlatform(
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
      } catch (e) { }
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
      } catch (e) { }
      watchSubRef.current = null;
    }
    setNavActive(false);
    setNavMinimized(false);
    setNavHidden(false);
    try {
      Speech.speak("Đã dừng dẫn đường", { language: "vi-VN" });
    } catch { }
  };

  // Call backend to end current driver work session (but keep navigation UI active)
  // Call backend to end current driver work session (but keep navigation UI active)
  const handlePauseSession = async () => {
    if (!driverSessionId) {
      showAlertCrossPlatform("Lỗi", "Phiên làm việc không tồn tại");
      return;
    }
    try {
      const resp: any = await driverWorkSessionService.end({
        DriverWorkSessionId: driverSessionId,
      });
      if (!(resp?.isSuccess ?? resp?.statusCode === 200)) {
        showAlertCrossPlatform(
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
      showAlertCrossPlatform("Lỗi", e?.message || "Kết thúc phiên thất bại");
    }
  };

  // End session and exit navigation UI
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
        showAlertCrossPlatform(
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
      showAlertCrossPlatform("Lỗi", e?.message || "Kết thúc phiên thất bại");
      return;
    }
    stopNavigation();
  };


  // Resume a previously-paused work session by calling Start again
  const handleResumeSession = async () => {
    // Guard against double-tap: if already starting or session already running, return
    if (startingNav || !trip || isSessionRunning || isResuming) return;
    setIsResuming(true);
    try {
      // check eligibility before resuming
      if (!eligibility) await loadEligibilityAndSession();
      if (eligibility && !eligibility.canDrive) {
        showAlertCrossPlatform(
          "Không đủ điều kiện",
          eligibility.message || "Bạn không đủ điều kiện lái xe hiện tại"
        );
        return;
      }
      const contHours = continuousSeconds / 3600;
      if (contHours >= 4) {
        showAlertCrossPlatform(
          "Ngừng",
          "Bạn đã lái quá 4 giờ liên tục, hãy nghỉ trước khi tiếp tục"
        );
        return;
      }

      const resp: any = await driverWorkSessionService.start({
        TripId: trip.tripId,
      });
      console.log('[handleResumeSession] Start session response:', JSON.stringify(resp, null, 2));
      if (!(resp?.isSuccess ?? resp?.statusCode === 200)) {
        showAlertCrossPlatform(
          "Lỗi",
          resp?.message || "Không thể tiếp tục phiên làm việc"
        );
        return;
      }
      // backend returns sessionId in resp.result.sessionId
      const sid = resp?.result?.sessionId ?? resp?.result?.SessionId ?? null;
      console.log('[handleResumeSession] Extracted session ID:', sid, 'type:', typeof sid);
      if (!sid || typeof sid !== 'string') {
        console.error('[handleResumeSession] Invalid session ID:', sid);
        showAlertCrossPlatform('Lỗi', 'Không nhận được ID phiên làm việc hợp lệ');
        return;
      }
      setDriverSessionId(sid);
      // start local continuous timer
      setActiveSessionStart(new Date());
      setContinuousSeconds(0);
      setStoppedSeconds(0);
      setIsSessionRunning(true);
      setSessionPaused(false);
      showToast("Đã tiếp tục phiên làm việc");
      // refresh eligibility/totals
      loadEligibilityAndSession();
      // DON'T call stopNavigation() - we want to keep navigation UI active when resuming
    } catch (e: any) {
      console.warn("[DriverTripDetail] resume session failed", e);
      showAlertCrossPlatform("Lỗi", e?.message || "Không thể tiếp tục phiên làm việc");
    } finally {
      setIsResuming(false);
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
        showAlertCrossPlatform(
          "Cảnh báo",
          res?.message || "Không thể cập nhật trạng thái chuyến"
        );
      }
    } catch (e: any) {
      console.warn("[DriverTripDetail] changeStatus error", e);
      showAlertCrossPlatform("Lỗi", e?.message || "Không thể cập nhật trạng thái chuyến");
    }

    // Also end the current driver work session on the backend (keep nav UI active)
    if (driverSessionId) {
      try {
        // Extract string GUID - driverSessionId might be object like {sessionId: "guid"}
        let sessionIdToSend = driverSessionId;
        if (sessionIdToSend && typeof sessionIdToSend === 'object') {
          sessionIdToSend = (sessionIdToSend as any).sessionId ?? (sessionIdToSend as any).DriverWorkSessionId ?? (sessionIdToSend as any).driverWorkSessionId ?? null;
        }
        console.log('[confirmPickup] extracted sessionIdToSend:', sessionIdToSend, 'type:', typeof sessionIdToSend);
        if (!sessionIdToSend || typeof sessionIdToSend !== 'string') {
          console.error('[confirmPickup] Invalid session ID, skipping end call');
        } else {
          const endResp: any = await driverWorkSessionService.end({
            DriverWorkSessionId: sessionIdToSend,
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

    // Start delivery navigation directly (removed auto-open delivery record)
    beginDeliveryNavigation();
  };

  const beginDeliveryNavigation = async () => {
    setJourneyPhase("TO_DELIVERY");
    setCanConfirmDelivery(false);
    try {
      Speech.speak("Bắt đầu dẫn đường đến điểm giao hàng", {
        language: "vi-VN",
      });
    } catch { }
  };

  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [confirmingReturn, setConfirmingReturn] = useState(false);
  const [confirmingHandover, setConfirmingHandover] = useState(false);
  const [confirmingVehicleReturning, setConfirmingVehicleReturning] = useState(false);

  // Helper to show alerts with web fallback
  const showAlert = (title: string, message?: string) => {
    try {
      if (Platform.OS === "web") {
        window.alert((title || "") + (message ? "\n" + message : ""));
      } else {
        showAlertCrossPlatform(title, message || "");
      }
    } catch (e) {
      try {
        showAlertCrossPlatform(title, message || "");
      } catch { }
    }
  };

  const confirmDelivery = async () => {
    try {
      const confirmed = await showConfirmCrossPlatform(
        "Xác nhận",
        "Bạn đã giao hàng thành công?",
        () => {},
        () => {},
        "Đã giao",
        "Hủy"
      );

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
            // Extract string GUID - driverSessionId might be object like {sessionId: "guid"}
            let sessionIdToSend = driverSessionId;
            if (sessionIdToSend && typeof sessionIdToSend === 'object') {
              sessionIdToSend = (sessionIdToSend as any).sessionId ?? (sessionIdToSend as any).DriverWorkSessionId ?? (sessionIdToSend as any).driverWorkSessionId ?? null;
            }
            console.log('[confirmDelivery] extracted sessionIdToSend:', sessionIdToSend, 'type:', typeof sessionIdToSend);
            if (!sessionIdToSend || typeof sessionIdToSend !== 'string') {
              console.error('[confirmDelivery] Invalid session ID, skipping end call');
            } else {
              const endResp: any = await driverWorkSessionService.end({
                DriverWorkSessionId: sessionIdToSend,
              });
              const ok2 = endResp?.isSuccess ?? endResp?.statusCode === 200;
              if (ok2) {
                showToast("Đã ghi nhận thời gian nghỉ");
                setDriverSessionId(null);
                setIsSessionRunning(false);
                setActiveSessionStart(null);
                setSessionPaused(true);
              }
            }
          } catch (e: any) {
            console.warn("[DriverTripDetail] end session failed", e);
          } finally {
            loadEligibilityAndSession();
          }
        }

        // Exit navigation UI
        stopNavigation();

        // Journey completed (removed auto-open delivery record)
        setJourneyPhase("COMPLETED");
        try {
          Speech.speak("Đã hoàn thành đơn hàng", { language: "vi-VN" });
        } catch { }
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

  const openVehicleHandoverModal = async (recordId?: string) => {
    if (!recordId) return showAlertCrossPlatform("Thông báo", "Không có biên bản");
    setLoadingHandoverRecord(true);
    try {
      const res: any = await tripService.getVehicleHandoverRecord(recordId);
      if (res?.isSuccess) {
        const record = res.result;
        console.log("📄 Driver loaded handover record FULL:", record);
        console.log("📄 Driver signature fields:", {
          type: record.type,
          handoverSigned: record.handoverSigned,
          handoverSignedAt: record.handoverSignedAt,
          receiverSigned: record.receiverSigned,
          receiverSignedAt: record.receiverSignedAt,
          status: record.status,
        });

        // Map termResults to terms format with IDs (for editing UI)
        const mappedRecord = {
          ...record,
          terms: (record.termResults || []).map((t: any) => ({
            tripVehicleHandoverTermResultId: t.tripVehicleHandoverTermResultId,
            content: t.termContent,
            isChecked: t.isPassed,
            deviation: t.note || "",
          })),
          // Map for document display - add isOk and termContent
          termResults: (record.termResults || []).map((t: any) => ({
            termResultId: t.tripVehicleHandoverTermResultId,
            termContent: t.termContent || "",
            isOk: t.isPassed || false,
            note: t.note || null,
            evidenceImageUrl: t.evidenceImageUrl || null,
          })),
          // Map issues to ensure correct field names
          issues: (record.issues || []).map((issue: any) => ({
            vehicleHandoverIssueId: issue.tripVehicleHandoverIssueId || issue.vehicleHandoverIssueId,
            tripVehicleHandoverIssueId: issue.tripVehicleHandoverIssueId || issue.vehicleHandoverIssueId,
            issueType: issue.issueType || 'OTHER',
            description: issue.description || '',
            status: issue.status || 'REPORTED',
            estimatedCompensationAmount: issue.estimatedCompensationAmount || null,
            imageUrls: issue.imageUrls || [],
            surcharges: issue.surcharges || [],
          })),
          // Map surcharges from root level
          surcharges: (record.surcharges || []).map((surcharge: any) => ({
            tripSurchargeId: surcharge.tripSurchargeId,
            type: surcharge.type || 'OTHER',
            amount: surcharge.amount || 0,
            description: surcharge.description || '',
            status: surcharge.status || 'PENDING',
          })),
        };
        console.log("📸 Mapped termResults with images:", mappedRecord.termResults);
        console.log("🛠️ Mapped issues:", mappedRecord.issues);
        console.log("💰 Mapped surcharges:", mappedRecord.surcharges);
        setActiveHandoverRecord(mappedRecord);
        setShowHandoverModal(true);
      } else {
        showAlertCrossPlatform("Lỗi", res?.message || "Không thể tải biên bản");
      }
    } catch (e: any) {
      console.error("openVehicleHandoverModal failed", e);
      showAlertCrossPlatform("Lỗi", e?.message || "Không thể tải biên bản");
    } finally {
      setLoadingHandoverRecord(false);
    }
  };

  // Handover Editor handlers
  const handleOpenHandoverEditor = () => {
    setShowHandoverEditor(true);
  };

  const handleSaveHandoverChecklist = async (formData: any) => {
    try {
      const res: any = await tripService.updateVehicleHandoverChecklist({
        RecordId: formData.recordId,
        CurrentOdometer: formData.currentOdometer,
        FuelLevel: formData.fuelLevel,
        IsEngineLightOn: formData.isEngineLightOn,
        Notes: formData.notes,
        ChecklistItems: formData.checklistItems.map((item: any) => ({
          TripVehicleHandoverTermResultId: item.tripVehicleHandoverTermResultId,
          IsPassed: item.isPassed,
          Note: item.note || "",
          EvidenceImage: item.evidenceImage,
        }))
      });
      
      if (res?.isSuccess) {
        showAlertCrossPlatform("Thành công", "Đã cập nhật biên bản giao nhận xe");
        setShowHandoverEditor(false);
        await fetchTripData(); // Refresh trip data
        
        // Reload the handover record to show updated data
        if (formData.recordId) {
          try {
            const recordRes: any = await tripService.getVehicleHandoverRecord(formData.recordId);
            if (recordRes?.isSuccess) {
              const record = recordRes.result;
              const mappedRecord = {
                ...record,
                terms: (record.termResults || []).map((t: any) => ({
                  tripVehicleHandoverTermResultId: t.tripVehicleHandoverTermResultId,
                  content: t.termContent,
                  isChecked: t.isPassed,
                  deviation: t.note || "",
                })),
                termResults: (record.termResults || []).map((t: any) => ({
                  ...t,
                  termResultId: t.tripVehicleHandoverTermResultId,
                  isOk: t.isPassed,
                  termContent: t.termContent,
                  evidenceImageUrl: t.evidenceImageUrl || null,
                })),
                issues: (record.issues || []).map((issue: any) => ({
                  vehicleHandoverIssueId: issue.tripVehicleHandoverIssueId || issue.vehicleHandoverIssueId,
                  tripVehicleHandoverIssueId: issue.tripVehicleHandoverIssueId || issue.vehicleHandoverIssueId,
                  issueType: issue.issueType || 'OTHER',
                  description: issue.description || '',
                  status: issue.status || 'REPORTED',
                  estimatedCompensationAmount: issue.estimatedCompensationAmount || null,
                  imageUrls: issue.imageUrls || [],
                  surcharges: issue.surcharges || [],
                })),
                surcharges: (record.surcharges || []).map((surcharge: any) => ({
                  tripSurchargeId: surcharge.tripSurchargeId,
                  type: surcharge.type || 'OTHER',
                  amount: surcharge.amount || 0,
                  description: surcharge.description || '',
                  status: surcharge.status || 'PENDING',
                })),
              };
              setActiveHandoverRecord(mappedRecord);
            }
          } catch (err) {
            console.error("Error reloading handover record:", err);
          }
        }
      } else {
        showAlertCrossPlatform("Lỗi", res?.message || "Không thể cập nhật biên bản");
      }
    } catch (e: any) {
      console.error("Save handover checklist error:", e);
      showAlertCrossPlatform("Lỗi", "Có lỗi xảy ra khi cập nhật biên bản");
      throw e;
    }
  };

  const openVehicleHandoverPdf = async (recordId?: string) => {
    if (!recordId) return;
    try {
      const res: any = await tripService.getVehicleHandoverPdfLink(recordId);
      if (res?.isSuccess && res.result) {
        Linking.openURL(res.result);
      } else {
        showAlertCrossPlatform("Thông báo", "Chưa có file PDF");
      }
    } catch (e: any) {
      showAlertCrossPlatform("Lỗi", "Không tải được PDF");
    }
  };

  // OTP signing functions
  const sendOtpForSigning = async () => {
    console.log("🔵 Driver sendOtpForSigning called", {
      recordId: activeHandoverRecord?.tripVehicleHandoverRecordId,
      record: activeHandoverRecord,
    });

    if (!activeHandoverRecord?.tripVehicleHandoverRecordId) {
      console.log("❌ No activeHandoverRecord.tripVehicleHandoverRecordId");
      showAlertCrossPlatform("Lỗi", "Không tìm thấy ID biên bản");
      return;
    }

    setSendingHandoverOtp(true);
    try {
      console.log(
        "📤 Sending OTP for record:",
        activeHandoverRecord.tripVehicleHandoverRecordId
      );
      const res: any = await tripService.sendVehicleHandoverOtp(
        activeHandoverRecord.tripVehicleHandoverRecordId
      );
      console.log("📥 OTP Response:", res);
      if (res?.isSuccess) {
        setShowHandoverOtpModal(true);
        showAlertCrossPlatform(
          "Thành công",
          res?.message || "Mã OTP đã được gửi đến email của bạn"
        );
      } else {
        showAlertCrossPlatform("Lỗi", res?.message || "Không thể gửi OTP");
      }
    } catch (e: any) {
      showAlertCrossPlatform("Lỗi", e?.message || "Có lỗi khi gửi OTP");
    } finally {
      setSendingHandoverOtp(false);
    }
  };

  const submitOtpSignature = async () => {
    const otpCode = handoverOtpDigits.join("");
    console.log("🔐 Driver submitting OTP:", {
      otpCode,
      recordId: activeHandoverRecord?.tripVehicleHandoverRecordId,
    });

    if (otpCode.length !== 6) {
      showAlertCrossPlatform("Lỗi", "Vui lòng nhập đủ 6 số OTP");
      return;
    }
    if (!activeHandoverRecord?.tripVehicleHandoverRecordId) return;

    setHandoverOtpLoading(true);
    try {
      const dto = {
        RecordId: activeHandoverRecord.tripVehicleHandoverRecordId,
        Otp: otpCode,
      };
      console.log("📤 Driver sending sign request:", dto);

      const res: any = await tripService.signVehicleHandoverRecord(dto);
      console.log("✍️ Driver sign response:", JSON.stringify(res, null, 2));

      if (res?.isSuccess) {
        showAlertCrossPlatform("Thành công", "Ký biên bản thành công!");
        setShowHandoverOtpModal(false);
        setHandoverOtpDigits(["", "", "", "", "", ""]);
        // Reload record to show updated signature
        await openVehicleHandoverModal(
          activeHandoverRecord.tripVehicleHandoverRecordId
        );
        // Reload trip to get updated status
        fetchTripData();
      } else {
        showAlertCrossPlatform("Lỗi", res?.message || "Không thể ký biên bản");
      }
    } catch (e: any) {
      showAlertCrossPlatform("Lỗi", e?.message || "Có lỗi khi ký biên bản");
    } finally {
      setHandoverOtpLoading(false);
    }
  };

  const handleHandoverOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...handoverOtpDigits];
    newDigits[index] = value;
    setHandoverOtpDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      handoverOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleHandoverOtpKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !handoverOtpDigits[index] && index > 0) {
      handoverOtpInputRefs.current[index - 1]?.focus();
    }
  };

  const confirmVehicleHandover = async () => {
    try {
      const confirmed = await showConfirmCrossPlatform(
        "Xác nhận",
        "Bạn đã nhận xe chưa?",
        () => {},
        () => {},
        "Đã nhận",
        "Hủy"
      );
      if (!confirmed) return;
      if (confirmingHandover || !trip) return;
      setConfirmingHandover(true);
      try {
        const res: any = await tripService.changeStatus({
          TripId: trip.tripId,
          NewStatus: "VEHICLE_HANDOVERED",
        });
        const ok = res?.isSuccess ?? res?.statusCode === 200;
        if (ok) {
          showToast("Đã xác nhận nhận xe");
          setTrip((prev) =>
            prev
              ? ({ ...prev, status: "VEHICLE_HANDOVERED" } as TripDetailData)
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

  const confirmReadyToReturnVehicle = async () => {
    try {
      const confirmed = await showConfirmCrossPlatform(
        "Xác nhận",
        "Bạn đã sẵn sàng trả xe?",
        () => {},
        () => {},
        "Đã sẵn sàng",
        "Hủy"
      );
      if (!confirmed) return;
      if (confirmingVehicleReturning || !trip) return;
      setConfirmingVehicleReturning(true);
      try {
        const res: any = await tripService.changeStatus({
          TripId: trip.tripId,
          NewStatus: "VEHICLE_RETURNING",
        });
        const ok = res?.isSuccess ?? res?.statusCode === 200;
        if (ok) {
          showToast("Đã xác nhận sẵn sàng trả xe");
          setTrip((prev) =>
            prev
              ? ({ ...prev, status: "VEHICLE_RETURNING" } as TripDetailData)
              : prev
          );
          await fetchTripData();
        } else {
          showAlert(
            "Lỗi",
            res?.message || "Không thể cập nhật trạng thái"
          );
        }
      } catch (e: any) {
        showAlert("Lỗi", e?.message || "Có lỗi khi xác nhận");
      } finally {
        setConfirmingVehicleReturning(false);
      }
    } catch (e: any) {
      console.warn("[DriverTripDetail] confirmReadyToReturnVehicle error", e);
    }
  };

  const confirmVehicleReturn = async () => {
    try {
      const confirmed = await showConfirmCrossPlatform(
        "Xác nhận",
        "Bạn đã trả xe chưa?",
        () => {},
        () => {},
        "Đã trả",
        "Hủy"
      );
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

  // --- Check-in Handler for Main Driver (change status + check-in) ---
  const handleMainDriverCheckIn = async () => {
    if (!trip || !checkInImage) {
      showAlert('Lỗi', 'Vui lòng chụp ảnh minh chứng');
      return;
    }
    setCheckingIn(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Cần quyền vị trí để check-in.');
      }
      const now = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const latitude = now.coords.latitude;
      const longitude = now.coords.longitude;
      
      // Get current address (use coordinates as fallback)
      let currentAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      try {
        const results = await vietmapService.searchAddress('', [longitude, latitude]);
        if (results && results.length > 0) {
          currentAddress = results[0].address || currentAddress;
        }
      } catch (e) {
        console.warn('Get address failed', e);
      }
      
      // Step 1: Change trip status to VEHICLE_HANDOVERED (only main driver)
      try {
        const statusRes: any = await tripService.changeStatus({
          TripId: trip.tripId,
          NewStatus: 'VEHICLE_HANDOVERED'
        });
        if (!statusRes?.isSuccess && statusRes?.statusCode !== 200) {
          showAlert('Lỗi', statusRes?.message || 'Không thể thay đổi trạng thái chuyến đi');
          return;
        }
      } catch (statusErr: any) {
        showAlert('Lỗi', statusErr?.message || 'Không thể thay đổi trạng thái chuyến đi');
        return;
      }
      
      // Step 2: Check-in
      const res: any = await assignmentService.driverCheckIn(
        trip.tripId,
        latitude,
        longitude,
        currentAddress,
        checkInImage
      );
      
      if (res?.isSuccess || res?.statusCode === 200) {
        const warning = res?.result?.warning || '';
        showToast('Xác nhận lấy xe & check-in thành công! Bắt đầu chuyến đi.' + warning);
        setIsCheckedIn(true);
        setShowCheckInModal(false);
        await fetchTripData();
      } else {
        showAlert('Lỗi', res?.message || 'Không thể check-in');
      }
    } catch (e: any) {
      showAlert('Lỗi', e?.message || 'Có lỗi khi check-in');
    } finally {
      setCheckingIn(false);
    }
  };

  // --- Check-in Handler for Secondary Driver (check-in only) ---
  const handleCheckIn = async () => {
    if (!trip || !checkInImage) {
      showAlert('Lỗi', 'Vui lòng chụp ảnh minh chứng');
      return;
    }
    setCheckingIn(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Cần quyền vị trí để check-in.');
      }
      const now = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const latitude = now.coords.latitude;
      const longitude = now.coords.longitude;
      
      // Get current address (use coordinates as fallback)
      let currentAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      try {
        const results = await vietmapService.searchAddress('', [longitude, latitude]);
        if (results && results.length > 0) {
          currentAddress = results[0].address || currentAddress;
        }
      } catch (e) {
        console.warn('Get address failed', e);
      }
      
      // Call check-in API only
      const res: any = await assignmentService.driverCheckIn(
        trip.tripId,
        latitude,
        longitude,
        currentAddress,
        checkInImage
      );
      
      if (res?.isSuccess || res?.statusCode === 200) {
        const warning = res?.result?.warning || '';
        showToast('Check-in thành công!' + warning);
        setIsCheckedIn(true);
        setShowCheckInModal(false);
        await fetchTripData();
      } else {
        showAlert('Lỗi', res?.message || 'Không thể check-in');
      }
    } catch (e: any) {
      showAlert('Lỗi', e?.message || 'Có lỗi khi check-in');
    } finally {
      setCheckingIn(false);
    }
  };

  // --- Check-out Handler for Secondary Driver ---
  const handleCheckOut = async () => {
    if (!trip || !checkOutImage) {
      showAlert('Lỗi', 'Vui lòng chụp ảnh minh chứng');
      return;
    }
    setCheckingOut(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Cần quyền vị trí để check-out.');
      }
      const now = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const latitude = now.coords.latitude;
      const longitude = now.coords.longitude;
      
      // Get current address (use coordinates as fallback)
      let currentAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      try {
        const results = await vietmapService.searchAddress('', [longitude, latitude]);
        if (results && results.length > 0) {
          currentAddress = results[0].address || currentAddress;
        }
      } catch (e) {
        console.warn('Get address failed', e);
      }
      
      // Call check-out API
      const res: any = await assignmentService.driverCheckOut(
        trip.tripId,
        latitude,
        longitude,
        currentAddress,
        checkOutImage
      );
      
      if (res?.isSuccess || res?.statusCode === 200) {
        const warning = res?.result?.warning || '';
        showToast('Check-out thành công! Cảm ơn bạn!' + warning);
        setShowCheckOutModal(false);
        await fetchTripData();
      } else {
        showAlert('Lỗi', res?.message || 'Không thể check-out');
      }
    } catch (e: any) {
      showAlert('Lỗi', e?.message || 'Có lỗi khi check-out');
    } finally {
      setCheckingOut(false);
    }
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
  // DROPOFF: Driver phải đợi contact ký trước
  const isDropoffSignAllowed = 
    trip?.status === "UNLOADING" && 
    activeDeliveryRecord?.contactSigned === true;
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
    if (visibleRoute === "toReturn")
      return routeCoords; // Use main routeCoords for return journey
    return routeCoords;
  })();

  const routeColor = (() => {
    if (visibleRoute === "toPickup") return "#8B5CF6"; // purple for pickup
    if (visibleRoute === "toDelivery") return "#DC2626"; // red for delivery
    if (visibleRoute === "toReturn") return "#F59E0B"; // orange for return
    return "#3B82F6"; // blue for overview/main route
  })();

  // Effective confirm flags: allow confirmation when nav is active and journey phase matches
  const effectiveCanConfirmPickup =
    canConfirmPickup || (navActive && journeyPhase === "TO_PICKUP");
  const effectiveCanConfirmDelivery =
    canConfirmDelivery || (navActive && journeyPhase === "TO_DELIVERY");

  // Note: do not early-return here to keep hook call order stable.
  // We'll handle loading / missing-trip UI right before the main return
  // so that all hooks are declared consistently on every render.

  const primaryDriver = trip?.drivers?.find((d) => d && d.type === "PRIMARY");

  // helper: are we approaching the 4-hour continuous limit (TEST: 30 seconds for demo, production: 15 minutes)
  // const approachingContinuousLimit = continuousSeconds >= 4 * 3600 - 15 * 60; // PRODUCTION
  const approachingContinuousLimit = continuousSeconds >= 30; // TEST: Cảnh báo sau 30 giây
  
  // Show an in-app banner and platform-specific toast/alert when approaching limit
  useEffect(() => {
    if (approachingContinuousLimit && !approachAlertShown) {
      const message = 'Bạn sắp đạt giới hạn lái liên tục. Vui lòng nghỉ ngơi sớm để đảm bảo an toàn.';
      setShowApproachingAlert(true);
      setApproachAlertShown(true);

      try {
        if (Platform.OS === 'android' && ToastAndroid && ToastAndroid.show) {
          ToastAndroid.show(message, ToastAndroid.LONG);
        } else if (Platform.OS === 'web') {
          // Fallback for web: use window.alert if no global toast available
          if (typeof window !== 'undefined' && (window as any).toast) {
            (window as any).toast(message);
          } else if (typeof window !== 'undefined') {
            // Keep non-blocking: use setTimeout to avoid blocking render
            setTimeout(() => window.alert(message), 50);
          }
        } else {
          Alert.alert('Cảnh báo', message, [{ text: 'OK' }]);
        }
      } catch (e) {
        console.warn('[DriverTripDetail] notify approaching limit failed', e);
      }

      // auto-hide banner after 8 seconds
      const t = setTimeout(() => setShowApproachingAlert(false), 8000);
      return () => clearTimeout(t);
    }
  }, [approachingContinuousLimit, approachAlertShown]);
  
  // Check-in flow logic
  const hasSignedContract = myDriverContract?.counterpartySigned === true;
  
  // QUAN TRỌNG: Nếu không có hợp đồng giữa driver và owner (myDriverContract === null)
  // thì bỏ qua bước 1 (ký hợp đồng) và chuyển thẳng sang bước 2 (check-in)
  const hasDriverOwnerContract = myDriverContract !== null;
  
  // Overlay: show khi:
  // 1. Driver chưa ký hợp đồng (bất kể status) => hiện bước 1 (CHỈ KHI CÓ HỢP ĐỒNG)
  // 2. Đã ký hợp đồng HOẶC KHÔNG CÓ HỢP ĐỒNG nhưng chưa check in (isOnBoard = false) => hiện bước 2
  const showOverlay = !isCheckedIn && currentDriver && (
    hasDriverOwnerContract 
      ? (!hasSignedContract || !currentDriver.isOnBoard)  // Có hợp đồng: yêu cầu ký + check-in
      : !currentDriver.isOnBoard                          // Không có hợp đồng: chỉ yêu cầu check-in
  );
  
  // Contract sign state: chỉ để hiện UI ký hợp đồng trong overlay (CHỈ KHI CÓ HỢP ĐỒNG)
  const needsContractSign = hasDriverOwnerContract && !hasSignedContract;
  
  // Check-in button logic:
  // - TÀI CHÍNH (PRIMARY): Chỉ khi status = READY_FOR_VEHICLE_HANDOVER và đã ký hợp đồng
  // - TÀI PHỤ (SECONDARY): Khi status KHÔNG phải PENDING_DRIVER_ASSIGNMENT hoặc DONE_ASSIGNING_DRIVER, và đã ký hợp đồng
  const canShowCheckInButton = hasSignedContract && (
    isMainDriver 
      ? trip?.status === 'READY_FOR_VEHICLE_HANDOVER'
      : (trip?.status !== 'PENDING_DRIVER_ASSIGNMENT' && trip?.status !== 'DONE_ASSIGNING_DRIVER')
  );
  
  // Helper: pick image for check-in
  const pickCheckInImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      showAlert('Lỗi', 'Cần quyền truy cập thư viện ảnh');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      // WEB: Convert to File object
      if (Platform.OS === 'web') {
        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const file = new File([blob], asset.fileName || ('checkin-' + Date.now() + '.jpg'), {
            type: asset.mimeType || 'image/jpeg'
          });
          setCheckInImage(file);
        } catch (err) {
          console.error('Failed to convert image to File:', err);
          showAlert('Lỗi', 'Không thể xử lý ảnh');
        }
      } else {
        // MOBILE: React Native format
        setCheckInImage({
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || ('checkin-' + Date.now() + '.jpg')
        } as any);
      }
    }
  };

  // Helper: pick image for check-out
  const pickCheckOutImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      showAlert('Lỗi', 'Cần quyền truy cập thư viện ảnh');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      // WEB: Convert to File object
      if (Platform.OS === 'web') {
        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const file = new File([blob], asset.fileName || ('checkout-' + Date.now() + '.jpg'), {
            type: asset.mimeType || 'image/jpeg'
          });
          setCheckOutImage(file);
        } catch (err) {
          console.error('Failed to convert image to File:', err);
          showAlert('Lỗi', 'Không thể xử lý ảnh');
        }
      } else {
        // MOBILE: React Native format
        setCheckOutImage({
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || ('checkout-' + Date.now() + '.jpg')
        } as any);
      }
    }
  };

  // Fallback UIs (after all hooks) to avoid changing hook order between renders
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.centered}>
          <Text>Không tìm thấy chuyến đi</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Chi tiết chuyến đi</Text>
          <Text style={styles.subTitle}>{trip.tripCode}</Text>
        </View>
        <TouchableOpacity 
          onPress={handleRefresh} 
          style={{ padding: 4, marginRight: 8 }}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Ionicons name="refresh" size={22} color="#2563EB" />
          )}
        </TouchableOpacity>
        <StatusPill value={trip.status} />
      </View>
      
      {/* Overlay for Secondary Driver who has checked out */}
      {isSecondaryDriverCheckedOut && (
        <View style={styles.checkoutOverlay}>
          <View style={styles.checkoutOverlayContent}>
            <View style={styles.checkoutIconCircle}>
              <MaterialCommunityIcons name="check-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.checkoutOverlayTitle}>Đã Check-out Thành Công</Text>
            <Text style={styles.checkoutOverlayMessage}>
              Bạn đã hoàn thành phần công việc của mình.{"\n"}
              Vui lòng chờ khi chuyến đi hoàn thành.
            </Text>
            <View style={styles.checkoutInfoBox}>
              <MaterialCommunityIcons name="clock-check-outline" size={20} color="#6B7280" />
              <Text style={styles.checkoutInfoText}>
                Thời gian check-out: {currentDriver?.offBoardTime ? new Date(currentDriver.offBoardTime).toLocaleString('vi-VN') : 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      )}

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


        {/* Warning Banner for VEHICLE_HANDOVERED status - PRIMARY DRIVER ONLY */}
        {isMainDriver && trip.status === 'VEHICLE_HANDOVERED' && (() => {
          // Check if driver has signed the handover record
          const handoverRecord = (trip as any).handoverReadDTOs?.find(
            (r: any) => r && r.type === "HANDOVER"
          );
          const driverHasSigned = handoverRecord?.receiverSigned;
          const ownerHasSigned = handoverRecord?.handoverSigned;

          if (driverHasSigned && !ownerHasSigned) {
            // Driver already signed, waiting for owner
            return (
              <View style={[styles.warningBanner, { backgroundColor: '#DBEAFE', borderLeftColor: '#3B82F6' }]}>
                <View style={styles.warningIconContainer}>
                  <Text style={styles.warningIcon}>⏳</Text>
                </View>
                <View style={styles.warningContent}>
                  <Text style={[styles.warningTitle, { color: '#1E40AF' }]}>Đã ký biên bản giao xe</Text>
                  <Text style={[styles.warningText, { color: '#1E3A8A' }]}>
                    Bạn đã ký xác nhận biên bản giao xe. Đang đợi chủ xe xác nhận để bắt đầu chuyến đi.
                  </Text>
                </View>
              </View>
            );
          } else if (!driverHasSigned) {
            // Driver hasn't signed yet
            return (
              <View style={styles.warningBanner}>
                <View style={styles.warningIconContainer}>
                  <Text style={styles.warningIcon}>📝</Text>
                </View>
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Ghi nhận tình trạng xe</Text>
                  <Text style={styles.warningText}>
                    Vui lòng kiểm tra và ghi nhận tình trạng xe, sau đó ký biên bản giao xe để bắt đầu chuyến đi
                  </Text>
                </View>
              </View>
            );
          }
          return null; // Both signed - no banner needed
        })()}

        {/* Badges Row - Driver Role & Session Status */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginHorizontal: 16,
          marginTop: 16,
          marginBottom: 8,
          gap: 12,
        }}>
          {/* Badge hiển thị ROLE của user hiện tại */}
          {currentDriver && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isMainDriver ? '#3B82F6' : '#6B7280',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              elevation: 4,
            }}>
              <MaterialCommunityIcons
                name={isMainDriver ? "account-star" : "account"}
                size={18}
                color="#FFFFFF"
              />
              <Text style={{
                marginLeft: 6,
                fontSize: 13,
                fontWeight: '700',
                color: '#FFFFFF',
              }}>
                {isMainDriver ? "Tài xế chính" : "Tài xế phụ"}
              </Text>
            </View>
          )}

          {/* Badge hiển thị AI ĐANG LÁI */}
          {!loadingSession && (
            <View style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              backgroundColor: currentSession
                ? (currentSession.isSelf ? '#10B981' : '#F59E0B')
                : '#94A3B8',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              elevation: 4,
            }}>
              <MaterialCommunityIcons
                name={currentSession ? "steering" : "sleep"}
                size={16}
                color="#FFFFFF"
              />
              <View style={{ marginLeft: 6, flex: 1 }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#FFFFFF',
                }} numberOfLines={1}>
                  {currentSession
                    ? (currentSession.isSelf ? 'Bạn đang lái' : `${currentSession.role || 'Tài xế'} đang lái`)
                    : 'Chưa bắt đầu'
                  }
                </Text>
                {currentSession && (
                  <>
                    {!currentSession.isSelf && (
                      <Text style={{
                        fontSize: 10,
                        color: '#FFFFFF',
                        marginTop: 1,
                        opacity: 0.9,
                      }} numberOfLines={1}>
                        {currentSession.driverName}
                      </Text>
                    )}
                    {currentSession.startTime && (
                      <Text style={{
                        fontSize: 9,
                        color: '#FFFFFF',
                        marginTop: 1,
                        opacity: 0.8,
                      }} numberOfLines={1}>
                        Bắt đầu: {new Date(currentSession.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </>
                )}
              </View>
            </View>
          )}
        </View>

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
                {['MOVING_TO_PICKUP', 'MOVING_TO_DROPOFF', 'LOADING', 'UNLOADING'].includes(trip.status) && (
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
                )}

                {['MOVING_TO_DROPOFF', 'LOADING', 'UNLOADING'].includes(trip.status) && (
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
                )}

                {trip.status === 'READY_FOR_VEHICLE_RETURN' && (
                <TouchableOpacity
                  style={[
                    styles.smallToggle,
                    visibleRoute === "toReturn" && styles.smallToggleActive,
                    { marginLeft: 8 },
                  ]}
                  onPress={() => setVisibleRoute("toReturn")}
                >
                  <Text
                    style={[
                      styles.smallToggleText,
                      visibleRoute === "toReturn" &&
                      styles.smallToggleTextActive,
                    ]}
                  >
                    Đến trả xe
                  </Text>
                </TouchableOpacity>
                )}
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
                        : visibleRoute === "toReturn"
                          ? startNavigationToReturnPoint
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
              {/* <Text style={styles.statLabel}>Thời gian</Text>
              <Text style={styles.statValue}>
                {(trip.tripRoute?.durationMinutes / 60).toFixed(1) || 0} giờ
              </Text> */}
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
          <KeyValue label="Điểm lấy hàng" value={trip.shippingRoute.startAddress} />
          <KeyValue label="Điểm giao hàng" value={trip.shippingRoute.endAddress} />
          <KeyValue label="Điểm lấy xe" value={trip.vehiclePickupAddress} />
          <KeyValue label="Điểm trả xe" value={trip.vehicleDropoffAddress} />
          <KeyValue
            label="Xe"
            value={`${trip.vehicle.plateNumber} • ${trip.vehicle.vehicleTypeName ?? ""
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
        

        {/* CARD: Vehicle Handover Records - PRIMARY DRIVER ONLY */}
        {isMainDriver && (
          <View style={styles.card}>
            <SectionHeader
              icon={
                <MaterialCommunityIcons
                  name="car-key"
                  size={20}
                  color="#059669"
                />
              }
              title="Biên bản giao nhận xe"
            />
            {!trip.tripVehicleHandoverRecordId &&
              !trip.tripVehicleReturnRecordId ? (
              <Text style={styles.emptyText}>Chưa có biên bản giao nhận xe</Text>
            ) : (
              <View>
                {/* Biên bản giao xe (HANDOVER) */}
                {trip.tripVehicleHandoverRecordId && (
                  <TouchableOpacity
                    style={styles.recordCard}
                    onPress={() =>
                      openVehicleHandoverModal(
                        trip.tripVehicleHandoverRecordId || undefined
                      )
                    }
                  >
                    <View style={styles.recordIcon}>
                      <MaterialCommunityIcons
                        name="car-arrow-right"
                        size={22}
                        color="#0EA5E9"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordType}>Biên bản giao xe</Text>
                      <Text style={styles.recordSubtext}>Chủ xe → Tài xế</Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                )}

                {/* Biên bản nhận xe (RETURN) */}
                {trip.tripVehicleReturnRecordId && (
                  <TouchableOpacity
                    style={styles.recordCard}
                    onPress={() =>
                      openVehicleHandoverModal(
                        trip.tripVehicleReturnRecordId || undefined
                      )
                    }
                  >
                    <View style={styles.recordIcon}>
                      <MaterialCommunityIcons
                        name="car-arrow-left"
                        size={22}
                        color="#10B981"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordType}>Biên bản nhận xe</Text>
                      <Text style={styles.recordSubtext}>Tài xế → Chủ xe</Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

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

            {/* Driver Role Badge */}
            {currentDriver && (
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: isMainDriver ? "#EBF5FF" : "#F3F4F6",
                borderRadius: 8,
                borderLeftWidth: 3,
                borderLeftColor: isMainDriver ? "#3B82F6" : "#6B7280",
              }}>
                <MaterialCommunityIcons
                  name={isMainDriver ? "account-star" : "account"}
                  size={20}
                  color={isMainDriver ? "#3B82F6" : "#6B7280"}
                />
                <Text style={{
                  marginLeft: 8,
                  fontSize: 14,
                  fontWeight: "600",
                  color: isMainDriver ? "#1E40AF" : "#374151",
                }}>
                  {isMainDriver ? "Tài xế chính" : "Tài xế phụ"}
                </Text>
                {!isMainDriver && (
                  <Text style={{
                    marginLeft: 8,
                    fontSize: 12,
                    color: "#6B7280",
                  }}>
                    (Chỉ xem hợp đồng của bạn)
                  </Text>
                )}
              </View>
            )}

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

       

        {/* Delivery Records - PRIMARY DRIVER ONLY */}
        {isMainDriver && trip.deliveryRecords?.length > 0 && (
          <View style={styles.card}>
            <SectionHeader
              icon={<Ionicons name="document-text" size={20} color="#64748B" />}
              title="Biên bản giao nhận hàng hóa"
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
                    const rec = res.result;
                    console.log("📋 Delivery Record Data:", JSON.stringify(rec, null, 2));
                    console.log("🔍 Record type field:", rec.type);
                    console.log("🔍 Record recordType field:", rec.recordType);
                    // Map deliveryRecordTerms to terms format for component
                    if (rec.deliveryRecordTemplate?.deliveryRecordTerms && Array.isArray(rec.deliveryRecordTemplate.deliveryRecordTerms)) {
                      rec.terms = rec.deliveryRecordTemplate.deliveryRecordTerms.map((term: any) => ({
                        deliveryRecordTermId: term.deliveryRecordTermId,
                        content: term.content || "",
                        displayOrder: term.displayOrder || 0,
                      }));
                    } else {
                      rec.terms = [];
                    }
                    setActiveDeliveryRecord(rec);
                    setDeliveryModalOpen(true);
                  } else {
                    showAlertCrossPlatform("Lỗi", "Không thể tải biên bản");
                  }
                }}
              >
                <View style={styles.recordIcon}>
                  <MaterialCommunityIcons
                    name={
                      (record.recordType || record.type) === "PICKUP"
                        ? "package-up"
                        : "package-down"
                    }
                    size={22}
                    color="#059669"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordType}>
                    {(record.recordType || record.type) === "PICKUP"
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
          {/* Approaching continuous-drive limit banner (visible on both web & mobile) */}
          {showApproachingAlert && (
            <View style={styles.approachAlertContainer} pointerEvents="box-none">
              <View style={styles.approachAlert}>
                <MaterialCommunityIcons name="alert" size={18} color="#92400E" />
                <Text style={styles.approachAlertText} numberOfLines={2}>
                  Bạn sắp đạt giới hạn lái liên tục. Vui lòng nghỉ ngơi sớm để đảm bảo an toàn.
                </Text>
              </View>
            </View>
          )}
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
            {journeyPhase === "TO_DELIVERY" && 
             trip.status !== "RETURNING_VEHICLE" && 
             trip.status !== "READY_FOR_VEHICLE_RETURN" && (
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
            {trip.status === "READY_FOR_VEHICLE_RETURN" && (
              <TouchableOpacity
                style={[
                  styles.navMainBtn,
                  styles.btnOrange,
                  confirmingVehicleReturning && styles.btnDisabled,
                ]}
                onPress={() => {
                  console.debug("navBtn press: READY TO RETURN VEHICLE", {
                    status: trip.status,
                    confirmingVehicleReturning,
                  });
                  confirmReadyToReturnVehicle();
                }}
                disabled={confirmingVehicleReturning}
              >
                {confirmingVehicleReturning ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.navMainBtnText}>🚗 Đã đến nơi trả xe</Text>
                )}
              </TouchableOpacity>
            )}
            {trip.status === "RETURNING_VEHICLE" && (
              <TouchableOpacity
                style={[
                  styles.navMainBtn,
                  styles.btnOrange,
                  confirmingReturn && styles.btnDisabled,
                ]}
                onPress={() => {
                  console.debug("navBtn press: RETURN VEHICLE", {
                    status: trip.status,
                    confirmingReturn,
                  });
                  confirmVehicleReturn();
                }}
                disabled={confirmingReturn}
              >
                {confirmingReturn ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.navMainBtnText}>🚗 Xác nhận đã trả xe</Text>
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
              {myDriverContract ? (
                <ContractDocument
                  contractCode={myDriverContract.contractCode}
                  contractType="DRIVER_CONTRACT"
                  contractValue={myDriverContract.contractValue}
                  currency={myDriverContract.currency}
                  effectiveDate={myDriverContract.effectiveDate || new Date().toISOString()}
                  terms={(myDriverContract.terms || [])
                    .slice()
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((t) => ({
                      contractTermId: t.contractTermId,
                      order: t.order || 0,
                      content: t.content
                    }))}
                  ownerName={trip?.owner?.companyName || trip?.owner?.fullName || "---"}
                  counterpartyName={user?.userName || "---"}
                  ownerSigned={myDriverContract.ownerSigned || false}
                  ownerSignAt={myDriverContract.ownerSignAt || null}
                  counterpartySigned={myDriverContract.counterpartySigned || false}
                  counterpartySignAt={myDriverContract.counterpartySignAt || null}
                />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                  <ActivityIndicator size="large" color="#2563EB" />
                  <Text style={{ marginTop: 10, color: '#6B7280' }}>Đang tải hợp đồng...</Text>
                </View>
              )}
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
                  onPress={handleSignContractFromModal}
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
              <DeliveryRecordDocument data={activeDeliveryRecord} />
            </ScrollView>
            <View style={styles.modalFooter}>
              {/* Report Issue Button - Only for PICKUP records */}
              {(() => {
                const recordType = activeDeliveryRecord.recordType || activeDeliveryRecord.type;
                const isPickup = recordType === "PICKUP";
                console.log("🔔 Report Issue Button Check:", {
                  recordType: activeDeliveryRecord.recordType,
                  type: activeDeliveryRecord.type,
                  finalType: recordType,
                  isPickup: isPickup
                });
                
                if (isPickup) {
                  return (
                    <TouchableOpacity
                      style={styles.reportIssueButton}
                      onPress={handleOpenIssueReport}
                    >
                      <MaterialIcons name="report-problem" size={20} color="#DC2626" />
                      <Text style={styles.reportIssueButtonText}>Báo cáo sự cố</Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })()}
              
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
                        : showAlertCrossPlatform("Thông báo", "Chưa có file PDF")
                    )
                    .catch(() => showAlertCrossPlatform("Lỗi", "Không tải được PDF"));
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
                  // Check if DROPOFF and contact hasn't signed yet
                  const recordType = activeDeliveryRecord.recordType ?? activeDeliveryRecord.type;
                  if (recordType === "DROPOFF" && !activeDeliveryRecord.contactSigned) {
                    showAlertCrossPlatform(
                      "Chưa thể ký",
                      "Vui lòng đợi khách hàng ký xác nhận trước khi bạn có thể ký biên bản DROPOFF."
                    );
                    return;
                  }
                  
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
                      : (activeDeliveryRecord.recordType ?? activeDeliveryRecord.type) === "DROPOFF" && !activeDeliveryRecord.contactSigned
                        ? "Đợi khách hàng ký..."
                        : "Ký Xác Nhận"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Confirm vehicle handover bar - PRIMARY DRIVER ONLY */}
      {isMainDriver && trip.status === "READY_FOR_VEHICLE_HANDOVER" && (
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

      {/* Confirm ready to return vehicle bar - PRIMARY DRIVER ONLY */}
      {/* Hidden when fullscreen navigation is active (navActive && !navMinimized) */}
      {isMainDriver && trip.status === "READY_FOR_VEHICLE_RETURN" && !(navActive && !navMinimized) && (
        <View style={styles.returnVehicleBar} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.returnBtn, confirmingVehicleReturning && styles.btnDisabled]}
            onPress={confirmReadyToReturnVehicle}
            disabled={confirmingVehicleReturning}
          >
            {confirmingVehicleReturning ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.returnBtnText}>Xác nhận đã trả xe</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Confirm vehicle returned bar - PRIMARY DRIVER ONLY */}
      {/* Hidden when fullscreen navigation is active (navActive && !navMinimized) */}
      {isMainDriver && trip.status === "RETURNING_VEHICLE" && !(navActive && !navMinimized) && (
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

      {/* Check-out button - SECONDARY DRIVER ONLY */}
      {/* Hidden when fullscreen navigation is active (navActive && !navMinimized) */}
      {!isMainDriver && currentDriver?.isOnBoard && !currentDriver.isFinished && !(navActive && !navMinimized) && (
        <View style={styles.returnVehicleBar} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.returnBtn, { backgroundColor: '#10B981' }]}
            onPress={() => setShowCheckOutModal(true)}
          >
            <Text style={styles.returnBtnText}>CHECK-OUT</Text>
            <Ionicons name="log-out" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* --- VEHICLE HANDOVER RECORD MODAL (A4 STYLE) --- */}
      {showHandoverModal && activeHandoverRecord && (
        <View style={styles.modalOverlay}>
          <View style={styles.paperModal}>
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => {
                setShowHandoverModal(false);
                setActiveHandoverRecord(null);
              }}
            >
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>

            <ScrollView
              contentContainerStyle={styles.paperScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <HandoverRecordDocument
                type={activeHandoverRecord.type}
                status={activeHandoverRecord.status}
                handoverUserName={
                  activeHandoverRecord.type === "HANDOVER"
                    ? trip?.owner?.fullName || "---"
                    : trip?.drivers?.[0]?.fullName || "---"
                }
                receiverUserName={
                  activeHandoverRecord.type === "HANDOVER"
                    ? trip?.drivers?.[0]?.fullName || "---"
                    : trip?.owner?.fullName || "---"
                }
                vehiclePlate={trip?.vehicle?.plateNumber || "---"}
                currentOdometer={activeHandoverRecord.currentOdometer || 0}
                fuelLevel={activeHandoverRecord.fuelLevel || 0}
                isEngineLightOn={activeHandoverRecord.isEngineLightOn || false}
                notes={activeHandoverRecord.notes || ""}
                handoverSigned={activeHandoverRecord.handoverSigned}
                handoverSignedAt={activeHandoverRecord.handoverSignedAt}
                receiverSigned={activeHandoverRecord.receiverSigned}
                receiverSignedAt={activeHandoverRecord.receiverSignedAt}
                tripCode={trip?.tripCode}
                ownerCompany={trip?.owner?.fullName}
                termResults={activeHandoverRecord.termResults || []}
              />
              
              {/* Issues & Surcharges Section - Only for RETURN type */}
              {activeHandoverRecord.type === 'RETURN' && activeHandoverRecord.issues && activeHandoverRecord.issues.length > 0 && (
                <View style={styles.issuesSection}>
                  <View style={styles.issuesSectionHeader}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#DC2626" />
                    <Text style={styles.issuesSectionTitle}>Sự cố & Bồi thường ({activeHandoverRecord.issues.length})</Text>
                  </View>
                  
                  {activeHandoverRecord.issues.map((issue: any, idx: number) => (
                    <View key={issue.vehicleHandoverIssueId || idx} style={styles.issueCard}>
                      <View style={styles.issueCardHeader}>
                        <View style={styles.issueTypeTag}>
                          <Text style={styles.issueTypeText}>
                            {getIssueTypeLabel(issue.issueType)}
                          </Text>
                        </View>
                        <View style={[styles.issueStatusBadge, { backgroundColor: issue.status === 'RESOLVED' ? '#DCFCE7' : '#FEF3C7' }]}>
                          <Text style={[styles.issueStatusText, { color: issue.status === 'RESOLVED' ? '#059669' : '#F59E0B' }]}>
                            {issue.status === 'RESOLVED' ? 'Đã giải quyết' : 'Đã báo cáo'}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={styles.issueDescription}>{issue.description}</Text>
                      
                      {issue.imageUrls && issue.imageUrls.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.issueImagesScroll}>
                          {issue.imageUrls.map((url: string, imgIdx: number) => (
                            <Image key={imgIdx} source={{ uri: url }} style={styles.issueImage} />
                          ))}
                        </ScrollView>
                      )}
                      
                      {issue.estimatedCompensationAmount && (
                        <View style={styles.compensationBox}>
                          <MaterialCommunityIcons name="cash-multiple" size={16} color="#F59E0B" />
                          <Text style={styles.compensationText}>
                            Bồi thường dự kiến: <Text style={styles.compensationAmount}>{issue.estimatedCompensationAmount.toLocaleString('vi-VN')} đ</Text>
                          </Text>
                        </View>
                      )}
                      
                      {issue.surcharges && issue.surcharges.length > 0 && (
                        <View style={styles.surchargesBox}>
                          <Text style={styles.surchargesTitle}>Phiếu thu đã tạo:</Text>
                          {issue.surcharges.map((surcharge: any, sIdx: number) => (
                            <View key={sIdx} style={styles.surchargeItem}>
                              <Text style={styles.surchargeAmount}>{surcharge.amount.toLocaleString('vi-VN')} đ</Text>
                              <View style={[styles.surchargeStatusBadge, { backgroundColor: surcharge.status === 'PAID' ? '#DCFCE7' : '#FEF3C7' }]}>
                                <Text style={[styles.surchargeStatusText, { color: surcharge.status === 'PAID' ? '#059669' : '#F59E0B' }]}>
                                  {surcharge.status === 'PAID' ? '✅ Đã trả' : '⏳ Chờ thanh toán'}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
              
              {/* All Surcharges Summary Section - Only for RETURN type */}
              {activeHandoverRecord?.type === 'RETURN' && activeHandoverRecord?.surcharges && activeHandoverRecord.surcharges.length > 0 && (
                <View style={styles.allSurchargesSection}>
                  <View style={styles.issuesSectionHeader}>
                    <MaterialCommunityIcons name="cash-multiple" size={24} color="#F59E0B" />
                    <Text style={styles.issuesSectionTitle}>Tổng hợp phiếu thu bồi thường</Text>
                  </View>
                  
                  {activeHandoverRecord.surcharges.map((surcharge: any, idx: number) => (
                    <View key={surcharge.tripSurchargeId || idx} style={styles.surchargeCard}>
                      <View style={styles.surchargeCardHeader}>
                        <View style={styles.issueTypeTag}>
                          <Text style={styles.issueTypeText}>
                            {getIssueTypeLabel(surcharge.type)}
                          </Text>
                        </View>
                        <View style={[styles.surchargeStatusBadge, { backgroundColor: surcharge.status === 'PAID' ? '#DCFCE7' : '#FEF3C7' }]}>
                          <Text style={[styles.surchargeStatusText, { color: surcharge.status === 'PAID' ? '#059669' : '#F59E0B' }]}>
                            {surcharge.status === 'PAID' ? '✅ Đã trả' : '⏳ Chờ thanh toán'}
                          </Text>
                        </View>
                      </View>
                      
                      {surcharge.description && (
                        <Text style={styles.surchargeDesc}>{surcharge.description}</Text>
                      )}
                      
                      <View style={styles.surchargeAmountBox}>
                        <MaterialCommunityIcons name="currency-usd" size={18} color="#059669" />
                        <Text style={styles.surchargeAmountLabel}>Số tiền:</Text>
                        <Text style={styles.surchargeAmountValue}>{surcharge.amount.toLocaleString('vi-VN')} đ</Text>
                      </View>
                    </View>
                  ))}
                  
                  {/* Total Summary */}
                  <View style={styles.totalSurchargeBox}>
                    <Text style={styles.totalSurchargeLabel}>Tổng cộng:</Text>
                    <Text style={styles.totalSurchargeAmount}>
                      {activeHandoverRecord.surcharges.reduce((sum: number, s: any) => sum + (s.amount || 0), 0).toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
            <View style={styles.paperFooter}>
                <View style={{ flexDirection: "row", gap: 8, width: "100%" }}>
                  {/* Edit Button - Show if not signed yet AND trip status is VEHICLE_HANDOVERED for HANDOVER type */}
                  {activeHandoverRecord && !activeHandoverRecord.handoverSigned && !activeHandoverRecord.receiverSigned && (
                    activeHandoverRecord.type === "RETURN" || 
                    (activeHandoverRecord.type === "HANDOVER" && trip?.status === "VEHICLE_HANDOVERED")
                  ) && (
                    <TouchableOpacity
                      style={[styles.actionBtnSecondary, { flex: 1 }]}
                      onPress={handleOpenHandoverEditor}
                    >
                      <MaterialCommunityIcons
                        name="pencil"
                        size={18}
                        color="#374151"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.actionBtnTextSec}>Sửa</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtnSecondary, { flex: 1 }]}
                    onPress={() =>
                      openVehicleHandoverPdf(
                        activeHandoverRecord?.tripVehicleHandoverRecordId
                      )
                    }
                  >
                    <MaterialCommunityIcons
                      name="file-pdf-box"
                      size={18}
                      color="#374151"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.actionBtnTextSec}>PDF</Text>
                  </TouchableOpacity>

                  {/* Check if current user (driver) hasn't signed yet */}
                  {activeHandoverRecord &&
                    (() => {
                      // For HANDOVER: Driver signs as receiver (getting vehicle from owner)
                      // For RETURN: Driver signs as receiver (getting vehicle back from owner after trip)
                      // Driver must wait for owner to sign first (handoverSigned = true)
                      
                      const isHandoverType = activeHandoverRecord.type === "HANDOVER";
                      const isReturnType = activeHandoverRecord.type === "RETURN";
                      const driverHasNotSigned = !activeHandoverRecord.receiverSigned;
                      const ownerHasSigned = activeHandoverRecord.handoverSigned;
                      
                      // For HANDOVER: Only allow when trip status is VEHICLE_HANDOVERED and owner signed
                      const canSignHandover = isHandoverType && 
                        trip?.status === "VEHICLE_HANDOVERED" && 
                       
                        driverHasNotSigned;
                      
                      // For RETURN: Only allow after owner has signed first
                      const canSignReturn = isReturnType && 
                        ownerHasSigned && 
                        driverHasNotSigned;

                      if (canSignHandover || canSignReturn) {
                        return (
                          <TouchableOpacity
                            style={[styles.actionBtnPrimary, { flex: 1 }]}
                            onPress={sendOtpForSigning}
                            disabled={sendingHandoverOtp}
                          >
                            {sendingHandoverOtp ? (
                              <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                              <Text style={styles.actionBtnTextPri}>
                                Ký biên bản
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      }
                      
                      // Show waiting message if owner hasn't signed yet
                      if ((isHandoverType || isReturnType) && !ownerHasSigned && driverHasNotSigned) {
                        return (
                          <View style={[styles.actionBtnSecondary, { flex: 1, opacity: 0.6 }]}>
                            <Text style={[styles.actionBtnTextSec, { fontSize: 13 }]}>
                              Đợi chủ xe ký xác nhận
                            </Text>
                          </View>
                        );
                      }
                      
                      return null;
                    })()}
                </View>
            </View>
          </View>
        </View>
      )}

      {/* Handover Checklist Editor Modal */}
      <Modal visible={showHandoverEditor && !!activeHandoverRecord} transparent animationType="slide" onRequestClose={() => setShowHandoverEditor(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalFullscreen}>
            {activeHandoverRecord && (
              <HandoverChecklistEditor
                initialData={{
                  recordId: activeHandoverRecord.tripVehicleHandoverRecordId,
                  currentOdometer: activeHandoverRecord.currentOdometer || 0,
                  fuelLevel: activeHandoverRecord.fuelLevel || 0,
                  isEngineLightOn: activeHandoverRecord.isEngineLightOn || false,
                  notes: activeHandoverRecord.notes || '',
                  checklistItems: (activeHandoverRecord.terms || []).map((term: any) => ({
                    tripVehicleHandoverTermResultId: term.tripVehicleHandoverTermResultId,
                    content: term.content,
                    isPassed: term.isChecked,
                    note: term.deviation || '',
                    evidenceImageUrl: term.evidenceImageUrl,
                  })),
                }}
                onSave={handleSaveHandoverChecklist}
                onCancel={() => setShowHandoverEditor(false)}
                saving={false}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* OTP Modal for Vehicle Handover Signing */}
      <Modal visible={showHandoverOtpModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.otpModalContainer}>
            <Text style={styles.otpModalTitle}>Nhập mã OTP</Text>
            <Text style={styles.otpModalSubtitle}>
              Mã OTP đã được gửi đến email của bạn
            </Text>

            <View style={styles.otpInputContainer}>
              {handoverOtpDigits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    if (ref) handoverOtpInputRefs.current[index] = ref;
                  }}
                  style={styles.otpInput}
                  value={digit}
                  onChangeText={(value) =>
                    handleHandoverOtpChange(index, value)
                  }
                  onKeyPress={({ nativeEvent }) =>
                    handleHandoverOtpKeyPress(index, nativeEvent.key)
                  }
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <View style={styles.otpModalButtons}>
              <TouchableOpacity
                style={[styles.actionBtnSecondary, { flex: 1 }]}
                onPress={() => {
                  setShowHandoverOtpModal(false);
                  setHandoverOtpDigits(["", "", "", "", "", ""]);
                }}
                disabled={handoverOtpLoading}
              >
                <Text style={styles.actionBtnTextSec}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtnPrimary, { flex: 1 }]}
                onPress={submitOtpSignature}
                disabled={
                  handoverOtpLoading || handoverOtpDigits.join("").length !== 6
                }
              >
                {handoverOtpLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.actionBtnTextPri}>Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- ISSUE REPORT MODAL (FOR PICKUP) --- */}
      <Modal
        visible={showIssueReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIssueReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.issueReportModal}>
            <View style={styles.issueReportHeader}>
              <Text style={styles.issueReportTitle}>Báo cáo sự cố hàng hóa</Text>
              <TouchableOpacity onPress={() => setShowIssueReportModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.issueReportContent}>
              {/* Issue Type Selection */}
              <Text style={styles.issueLabel}>Loại sự cố:</Text>
              <View style={styles.issueTypeContainer}>
                {[
                  { type: DeliveryIssueType.DAMAGED, label: "Hàng hư hỏng", icon: "broken-image" },
                  { type: DeliveryIssueType.LOST, label: "Thiếu hàng", icon: "inventory-2" },
                  { type: DeliveryIssueType.WRONG_ITEM, label: "Sai hàng", icon: "error-outline" },
                  { type: DeliveryIssueType.LATE, label: "Giao trễ", icon: "schedule" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.type}
                    style={[
                      styles.issueTypeButton,
                      issueType === item.type && styles.issueTypeButtonActive,
                    ]}
                    onPress={() => setIssueType(item.type)}
                  >
                    <MaterialIcons
                      name={item.icon as any}
                      size={24}
                      color={issueType === item.type ? "#DC2626" : "#6B7280"}
                    />
                    <Text
                      style={[
                        styles.issueTypeText,
                        issueType === item.type && styles.issueTypeTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Description Input */}
              <Text style={styles.issueLabel}>Mô tả chi tiết:</Text>
              <TextInput
                style={styles.issueDescriptionInput}
                placeholder="Nhập mô tả sự cố (bắt buộc)"
                placeholderTextColor="#9CA3AF"
                value={issueDescription}
                onChangeText={setIssueDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Image Upload */}
              <Text style={styles.issueLabel}>Ảnh minh chứng (tùy chọn):</Text>
              <IssueImagePicker
                images={issueImages}
                onImagesChange={setIssueImages}
                maxImages={5}
              />
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.issueReportFooter}>
              <TouchableOpacity
                style={[styles.actionBtnSecondary, { flex: 1 }]}
                onPress={() => setShowIssueReportModal(false)}
                disabled={submittingIssue}
              >
                <Text style={styles.actionBtnTextSec}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtnPrimary,
                  { flex: 1 },
                  (!issueDescription.trim() || submittingIssue) && styles.btnDisabled,
                ]}
                onPress={handleSubmitIssueReport}
                disabled={!issueDescription.trim() || submittingIssue}
              >
                {submittingIssue ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.actionBtnTextPri}>Gửi báo cáo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* OVERLAY - STATE 1: Chưa ký hợp đồng */}
      {!isCheckedIn && needsContractSign && !showContractModal && !showDigitalSignatureTerms && !showContractOtpModal && (
        <Modal visible={true} transparent animationType="none">
          <View style={styles.overlayContainer} pointerEvents="box-none">
            {/* Map visible - 60-70% */}
            <View style={styles.overlayMapSection} pointerEvents="none">
              <VietMapUniversal 
                coordinates={checkInRouteCoordinates.length > 0 ? checkInRouteCoordinates : (currentDriver?.startLat && currentDriver?.startLng ? [[currentDriver.startLng, currentDriver.startLat] as Position] : [])}
                style={{ flex: 1 }}
                navigationActive={false}
              />
              <View style={styles.checkInMapDescOverlay}>
                <View style={styles.checkInMapDescBox}>
                  <Ionicons name="navigate" size={16} color="#2563EB" />
                  <Text style={styles.checkInMapDescText}>Đoạn đường đến điểm xuất phát</Text>
                </View>
              </View>
              
              {/* Back button */}
              <TouchableOpacity 
                style={styles.overlayBackButton}
                onPress={() => router.push('/(driver)/home')}
              >
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            {/* Bottom Sheet - 30-40% */}
            <View style={styles.overlayBottomSheet} pointerEvents="box-none">
              <View style={styles.sheetHandle} />
              <View style={styles.sheetContent} pointerEvents="box-none">
                <View style={styles.sheetHeader}>
                  <MaterialCommunityIcons name="file-document-edit" size={48} color="#2563EB" />
                  <Text style={styles.sheetTitle}>BƯỚC 1: KÝ HỢP ĐỒNG</Text>
                  <Text style={styles.sheetSubtitle}>
                    Vui lòng ký hợp đồng điện tử để nhận nhiệm vụ và xem chi tiết khách hàng.
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.sheetPrimaryButton}
                  onPress={() => {
                    console.log('[ContractSign] TouchableOpacity pressed');
                    handleSendContractOtp();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sheetButtonText}>XEM & KÝ NGAY</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      
      {/* OVERLAY - STATE 2: Đã ký hợp đồng, chưa check-in */}
      {showOverlay && !needsContractSign && !showContractModal && !showDigitalSignatureTerms && !showContractOtpModal && !showCheckInModal && (
        <Modal visible={true} transparent animationType="none">
          <View style={styles.overlayContainer} pointerEvents="box-none">
            {/* Map visible - 60-70% */}
            <View style={styles.overlayMapSection} pointerEvents="none">
              <VietMapUniversal 
                coordinates={checkInRouteCoordinates.length > 0 ? checkInRouteCoordinates : (currentDriver?.startLat && currentDriver?.startLng ? [[currentDriver.startLng, currentDriver.startLat] as Position] : [])}
                style={{ flex: 1 }}
                navigationActive={false}
              />
              <View style={styles.checkInMapDescOverlay}>
                <View style={styles.checkInMapDescBox}>
                  <Ionicons name="navigate" size={16} color="#2563EB" />
                  <Text style={styles.checkInMapDescText}>Đoạn đường đến điểm xuất phát</Text>
                </View>
              </View>
              
              {/* Back button */}
              <TouchableOpacity 
                style={styles.overlayBackButton}
                onPress={() => router.push('/(driver)/home')}
              >
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            {/* Bottom Sheet - 30-40% */}
            <View style={styles.overlayBottomSheet} pointerEvents="auto">
              <View style={styles.sheetHandle} />
              <View style={styles.sheetContent}>
                <View style={styles.sheetHeader}>
                  <MaterialCommunityIcons name="car-key" size={48} color="#F59E0B" />
                  <Text style={styles.sheetTitle}>BƯỚC 2: NHẬN XE</Text>
                  
                  {!canShowCheckInButton ? (
                    <View style={styles.waitingBox}>
                      <ActivityIndicator color="#F59E0B" />
                      <Text style={styles.waitingText}>
                        Đang chờ Owner điều phối xe...
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.sheetSubtitle}>
                      Xe đã sẵn sàng! Vui lòng đến bãi xe và xác nhận lấy xe.
                    </Text>
                  )}
                </View>
                
                {canShowCheckInButton && (
                  <TouchableOpacity 
                    style={[styles.sheetPrimaryButton, { backgroundColor: '#F59E0B' }]}
                    onPress={() => setShowCheckInModal(true)}
                  >
                    <Text style={styles.sheetButtonText}>
                      {isMainDriver ? 'XÁC NHẬN ĐÃ LẤY XE & CHECK-IN' : 'CHECK-IN'}
                    </Text>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* CHECK-IN DETAIL MODAL */}
      <Modal 
        visible={showCheckInModal} 
        transparent 
        animationType="slide"
        onRequestClose={() => setShowCheckInModal(false)}
      >
        <View style={styles.checkInModalBackdrop}>
          <View style={styles.checkInModalCard}>
            <View style={styles.checkInModalHeader}>
              <Text style={styles.checkInModalTitle}>Xác nhận Check-in</Text>
              <TouchableOpacity onPress={() => setShowCheckInModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.checkInModalContent}>
              <View style={styles.checkInInfoBox}>
                <Ionicons name="information-circle" size={20} color="#2563EB" />
                <Text style={styles.checkInInfoText}>
                  {isMainDriver 
                    ? 'Vui lòng chụp ảnh minh chứng tại bãi xe để xác nhận bạn đã lấy xe và check-in. Hệ thống sẽ tự động chuyển trạng thái chuyến đi.'
                    : 'Vui lòng chụp ảnh minh chứng tại bãi xe để xác nhận bạn đã đến và check-in.'}
                </Text>
              </View>
              
              <Text style={styles.checkInLabel}>Ảnh minh chứng (*)</Text>
              
              {checkInImage ? (
                <View style={styles.checkInImagePreview}>
                  <Image 
                    source={{ uri: checkInImageUrl }} 
                    style={styles.checkInImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={styles.checkInImageRemove}
                    onPress={() => setCheckInImage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.checkInImagePicker}
                  onPress={pickCheckInImage}
                >
                  <Ionicons name="camera" size={48} color="#9CA3AF" />
                  <Text style={styles.checkInImagePickerText}>Chụp ảnh</Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.checkInWarningBox}>
                <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                <Text style={styles.checkInWarningText}>
                  Hệ thống sẽ tự động kiểm tra vị trí của bạn so với bãi xe. 
                  Nếu cách quá xa (&gt;5km) sẽ có cảnh báo.
                </Text>
              </View>
            </ScrollView>
            
            <View style={styles.checkInModalFooter}>
              <TouchableOpacity 
                style={styles.btnSecondary}
                onPress={() => setShowCheckInModal(false)}
                disabled={checkingIn}
              >
                <Text style={styles.btnSecondaryText}>Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.btnPrimary, (!checkInImage || checkingIn) && styles.btnDisabled]}
                onPress={isMainDriver ? handleMainDriverCheckIn : handleCheckIn}
                disabled={!checkInImage || checkingIn}
              >
                {checkingIn ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>
                    {isMainDriver ? 'Xác nhận lấy xe & Check-in' : 'Xác nhận Check-in'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CHECK-OUT DETAIL MODAL */}
      <Modal 
        visible={showCheckOutModal} 
        transparent 
        animationType="slide"
        onRequestClose={() => setShowCheckOutModal(false)}
      >
        <View style={styles.checkInModalBackdrop}>
          <View style={styles.checkInModalCard}>
            <View style={styles.checkInModalHeader}>
              <Text style={styles.checkInModalTitle}>Xác nhận Check-out</Text>
              <TouchableOpacity onPress={() => setShowCheckOutModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.checkInModalContent}>
              <View style={styles.checkInInfoBox}>
                <Ionicons name="information-circle" size={20} color="#10B981" />
                <Text style={styles.checkInInfoText}>
                  Vui lòng chụp ảnh minh chứng để xác nhận bạn đã hoàn thành nhiệm vụ và check-out khỏi chuyến đi.
                </Text>
              </View>
              
              <Text style={styles.checkInLabel}>Ảnh minh chứng (*)</Text>
              
              {checkOutImage ? (
                <View style={styles.checkInImagePreview}>
                  <Image 
                    source={{ uri: checkOutImageUrl }} 
                    style={styles.checkInImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={styles.checkInImageRemove}
                    onPress={() => setCheckOutImage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.checkInImagePicker}
                  onPress={pickCheckOutImage}
                >
                  <Ionicons name="camera" size={48} color="#9CA3AF" />
                  <Text style={styles.checkInImagePickerText}>Chụp ảnh</Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.checkInWarningBox}>
                <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                <Text style={styles.checkInWarningText}>
                  Hệ thống sẽ tự động kiểm tra vị trí của bạn so với điểm trả xe. 
                  Nếu cách quá xa (&gt;5km) sẽ có cảnh báo.
                </Text>
              </View>
            </ScrollView>
            
            <View style={styles.checkInModalFooter}>
              <TouchableOpacity 
                style={styles.btnSecondary}
                onPress={() => setShowCheckOutModal(false)}
                disabled={checkingOut}
              >
                <Text style={styles.btnSecondaryText}>Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.btnPrimary, { backgroundColor: '#10B981' }, (!checkOutImage || checkingOut) && styles.btnDisabled]}
                onPress={handleCheckOut}
                disabled={!checkOutImage || checkingOut}
              >
                {checkingOut ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Xác nhận Check-out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 16, paddingBottom: 120 },
  
  // Checkout Overlay Styles
  checkoutOverlay: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  checkoutOverlayContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  checkoutIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkoutOverlayTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  checkoutOverlayMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  checkoutInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  checkoutInfoText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    flex: 1,
  },

  // Warning Banner
  warningBanner: {
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  warningIconContainer: {
    marginRight: 12,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  warningIcon: {
    fontSize: 24,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: "#78350F",
    lineHeight: 20,
  },

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
  recordSubtext: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  emptyText: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic" },

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
    bottom: 50,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingBottom: 8,
    flexWrap: "wrap",
  },
  navActionBarAbove: { zIndex: 2500 },
  approachAlertContainer: {
    position: 'absolute',
    top: 16,
    left: 20,
    right: 20,
    zIndex: 4000,
    alignItems: 'center',
  },
  approachAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 6,
  },
  approachAlertText: {
    color: '#92400E',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  pauseBtn: {
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  pauseBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  resumeBtn: {
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  resumeBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  minBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  navMainBtn: {
    flex: 1,
    minWidth: 150,
    height: 44,
    backgroundColor: "#2563EB",
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  btnGreen: { backgroundColor: "#10B981" },
  btnOrange: { backgroundColor: "#F97316" },
  navMainBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.5, backgroundColor: "#9CA3AF" },
  stopBtn: {
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  stopBtnText: { color: "#FFF", fontWeight: "600", fontSize: 14 },
  miniBar: {
    position: "absolute",
    bottom: 40,
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
    top: 50,
    left: 12,
    right: 12,
    zIndex: 1100,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
  modalFullscreen: { 
    width: "100%", 
    height: "95%", 
    backgroundColor: "#FFFFFF", 
    borderRadius: 12, 
    overflow: "hidden", 
    marginTop: 20 
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
  paperFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F9FAFB",
  },
  
  // Issues & Surcharges Section
  issuesSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: "#FEE2E2",
    backgroundColor: "#FFFBEB",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  issuesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  issuesSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
  },
  issueCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  issueCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  issueTypeTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  issueTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  issueStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  issueStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  issueDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 10,
  },
  issueImagesScroll: {
    marginVertical: 10,
  },
  issueImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  compensationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  compensationText: {
    fontSize: 13,
    color: '#78350F',
    fontWeight: '500',
  },
  compensationAmount: {
    fontWeight: '800',
    color: '#F59E0B',
  },
  surchargesBox: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  surchargesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  surchargeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  surchargeAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  surchargeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  surchargeStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  
  // All Surcharges Summary Section
  allSurchargesSection: {
    marginTop: 16,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#FEE2E2',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  surchargeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  surchargeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  surchargeDesc: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 10,
  },
  surchargeAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  surchargeAmountLabel: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '600',
  },
  surchargeAmountValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
    marginLeft: 'auto',
  },
  totalSurchargeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  totalSurchargeLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
  },
  totalSurchargeAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F59E0B',
  },
  
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
  // Vehicle Handover Modal Styles
  recordCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  docCompany: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1F2937",
  },
  docTitle: {
    alignItems: "center",
    marginVertical: 12,
  },
  docTitleText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    textTransform: "uppercase",
    textAlign: "center",
  },
  docDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },
  docNumber: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151",
  },
  partiesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  partyBox: {
    flex: 1,
    paddingHorizontal: 8,
  },
  partyName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  partyInfo: {
    fontSize: 12,
    color: "#6B7280",
  },
  verticalDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  section: {
    marginVertical: 8,
  },
  sectionHeaderBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    textTransform: "uppercase",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  termRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  termCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#FFF",
  },
  termCheckboxChecked: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  termDeviation: {
    fontSize: 12,
    color: "#DC2626",
    fontStyle: "italic",
    marginTop: 4,
  },
  termNoteInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
    fontSize: 12,
    color: "#374151",
    backgroundColor: "#FFF",
    minHeight: 40,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    gap: 4,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#10B981",
    borderWidth: 0,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  signaturesContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  signatureImage: {
    width: "100%",
    height: 80,
  },

  // OTP Modal styles
  otpModalContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  otpModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  otpModalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  otpInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  otpModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  otpModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  otpCancelButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  otpCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  otpSubmitButton: {
    backgroundColor: "#3B82F6",
  },
  otpSubmitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },

  // Issue Report Modal Styles
  reportIssueButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    gap: 6,
  },
  reportIssueButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
  },
  issueReportModal: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    width: "90%",
    maxHeight: "80%",
    overflow: "hidden",
  },
  issueReportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  issueReportTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  issueReportContent: {
    padding: 16,
  },
  issueLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 12,
  },
  issueTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  issueTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    gap: 8,
    minWidth: "48%",
  },
  issueTypeButtonActive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#DC2626",
  },
  // issueTypeText: {
  //   fontSize: 14,
  //   color: "#6B7280",
  //   fontWeight: "500",
  // },
  issueTypeTextActive: {
    color: "#DC2626",
    fontWeight: "600",
  },
  issueDescriptionInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFF",
    minHeight: 100,
  },
  issueReportFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  
  // Overlay Styles
  overlayContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlayMapSection: {
    flex: 0.65, // 65% for map
  },
  checkInMapDescOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  checkInMapDescBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  checkInMapDescText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  overlayBackButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  overlayBottomSheet: {
    flex: 0.35, // 35% for bottom sheet
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sheetContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  sheetHeader: {
    alignItems: 'center',
    gap: 12,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  sheetPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sheetButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  waitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginTop: 12,
  },
  waitingText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
    flex: 1,
  },
  
  // Check-in Modal Styles
  checkInModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  checkInModalCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  checkInModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  checkInModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  checkInModalContent: {
    padding: 20,
  },
  checkInInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  checkInInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  checkInLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  checkInImagePicker: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  checkInImagePickerText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    fontWeight: '500',
  },
  checkInImagePreview: {
    position: 'relative',
    marginBottom: 16,
  },
  checkInImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  checkInImageRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  checkInWarningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  checkInWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  checkInModalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontWeight: '600',
    color: '#374151',
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontWeight: '600',
    color: '#FFF',
  },
});

export default DriverTripDetailScreenV2;
