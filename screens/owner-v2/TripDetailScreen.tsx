import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Image,
  Linking,
  Modal,
  TextInput,
  StatusBar,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import type { Feature, LineString } from "geojson";

// --- ICONS ---
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
  Entypo
} from "@expo/vector-icons";

// --- SERVICES & MODELS ---
import tripService from "@/services/tripService";
import tripProviderContractService from "@/services/tripProviderContractService";
import { TripDetailFullDTOExtended } from "@/models/types";
import { useAuth } from "@/hooks/useAuth";

// --- UTILS ---
import { decodePolyline, toGeoJSONLineFeature } from "@/utils/polyline";

// --- CUSTOM COMPONENTS ---
import VietMapWebSDK from "../../components/map/VietMapWebSDK";
import { AnimatedRouteProgress } from "@/components/map/AnimatedRouteProgress";
import DriverAssignModal from "./components/DriverAssignModal";
import CreatePostTripModal from "./components/CreatePostTripModal";
import RouteProgressBar from "../../components/map/RouteProgressBar";
import { ContractDocument } from "@/components/documents/ContractDocument";
import { DeliveryRecordDocument } from "@/components/documents/DeliveryRecordDocument";
import { HandoverRecordDocument } from "@/components/documents/HandoverRecordDocument";

const SCREEN_WIDTH = Dimensions.get('window').width;

// --- COMPONENT: STEPPER TIẾN TRÌNH ---
const TripStepper = ({ status }: { status: string }) => {
  let currentStep = 1;
  if (['CREATED', 'PENDING', 'AWAITING_OWNER_CONTRACT'].includes(status)) currentStep = 1;
  else if (['AWAITING_DRIVER','PENDING_DRIVER_ASSIGNMENT', 'DONE_ASSIGNING_DRIVER'].includes(status)) currentStep = 2;
  else if (['READY_FOR_VEHICLE_HANDOVER', 'VEHICLE_HANDOVERED', 'MOVING_TO_PICKUP', 'VEHICLE_RETURNED'].includes(status)) currentStep = 3;
  else if (['COMPLETED', 'CANCELLED'].includes(status)) currentStep = 4;

  const steps = [
    { label: "Khởi tạo", step: 1 },
    { label: "Điều phối", step: 2 },
    { label: "Vận hành", step: 3 },
    { label: "Hoàn tất", step: 4 },
  ];

  return (
    <View style={styles.stepperContainer}>
      {steps.map((item, index) => {
        const isActive = currentStep >= item.step;
        const isCurrent = currentStep === item.step;
        const isLast = index === steps.length - 1;
        return (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', flex: isLast ? 0 : 1 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={[styles.stepCircle, isActive && styles.stepCircleActive, isCurrent && styles.stepCircleCurrent]}>
                {isActive ? <Ionicons name="checkmark" size={14} color="#FFF" /> : <Text style={styles.stepNumber}>{item.step}</Text>}
              </View>
              <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{item.label}</Text>
            </View>
            {!isLast && <View style={[styles.stepLine, isActive && styles.stepLineActive]} />}
          </View>
        );
      })}
    </View>
  );
};

// --- COMPONENT: CAROUSEL ẢNH NHỎ ---
const SmallImageCarousel = ({ images }: { images?: string[] }) => {
  if (!images || images.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginBottom: 8 }}>
      {images.map((uri, index) => (
        <Image key={index} source={{ uri }} style={{ width: 70, height: 70, borderRadius: 8, marginRight: 8, backgroundColor: "#E5E7EB" }} />
      ))}
    </ScrollView>
  );
};

// --- COMPONENT: STATUS BADGE ---
const StatusBadge = ({ status }: { status: string }) => {
  const config: any = {
    CREATED: { color: "#3B82F6", bg: "#EFF6FF", label: "Mới tạo" },
    PENDING: { color: "#F59E0B", bg: "#FFFBEB", label: "Đang xử lý" },
    AWAITING_OWNER_CONTRACT: { color: "#D97706", bg: "#FEF3C7", label: "Chờ ký HĐ" },
    AWAITING_DRIVER: { color: "#8B5CF6", bg: "#F5F3FF", label: "Tìm tài xế" },
    IN_PROGRESS: { color: "#10B981", bg: "#ECFDF5", label: "Đang chạy" },
    COMPLETED: { color: "#059669", bg: "#D1FAE5", label: "Hoàn thành" },
    CANCELLED: { color: "#EF4444", bg: "#FEF2F2", label: "Đã hủy" },
  };
  const s = config[status] || { color: "#6B7280", bg: "#F3F4F6", label: status };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
};

// ================= MAIN SCREEN =================
const TripDetailScreen: React.FC = () => {
  const router = useRouter();
  const params: any = useLocalSearchParams();
  const tripId = params.tripId as string;
  const { user } = useAuth();

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<TripDetailFullDTOExtended | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [routeFeature, setRouteFeature] = useState<Feature<LineString> | null>(null);
  const [driverAnalysis, setDriverAnalysis] = useState<any | null>(null);

  // Simulation
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulatedProgressIndex, setSimulatedProgressIndex] = useState(0);

  // Modals
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);

  // Contract Modal
  const [showContractModal, setShowContractModal] = useState(false);
  const [signing, setSigning] = useState(false);

  // Driver Contract Modal
  const [showDriverContractModal, setShowDriverContractModal] = useState(false);
  const [activeDriverContract, setActiveDriverContract] = useState<any | null>(null);
  const [loadingDriverContract, setLoadingDriverContract] = useState(false);

  // Delivery & Handover Modals
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [activeDeliveryRecord, setActiveDeliveryRecord] = useState<any | null>(null);
  const [loadingDeliveryRecord, setLoadingDeliveryRecord] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [activeHandoverRecord, setActiveHandoverRecord] = useState<any | null>(null);
  const [loadingHandoverRecord, setLoadingHandoverRecord] = useState(false);

  // Edit Checklist
  const [isEditingChecklist, setIsEditingChecklist] = useState(false);
  const [editedTerms, setEditedTerms] = useState<any[]>([]);
  const [savingChecklist, setSavingChecklist] = useState(false);

  // OTP
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const otpInputsRef = useRef<Array<TextInput | null>>([]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showHandoverOtpModal, setShowHandoverOtpModal] = useState(false);
  const [handoverOtpDigits, setHandoverOtpDigits] = useState<string[]>(Array(6).fill(""));
  const handoverOtpInputsRef = useRef<Array<TextInput | null>>([]);
  const [handoverOtpLoading, setHandoverOtpLoading] = useState(false);
  const [sendingHandoverOtp, setSendingHandoverOtp] = useState(false);

  // Actions
  const [confirmingDrivers, setConfirmingDrivers] = useState(false);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const [confirmingTripCompletion, setConfirmingTripCompletion] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (tripId) fetchTrip(tripId);
    }, [tripId])
  );

  const fetchTrip = async (id: string) => {
    setLoading(true);
    try {
      const [tripRes, analysisRes] = await Promise.all([
        tripService.getById(id),
        tripService.analyzeDrivers(id).catch(err => null)
      ]);

      if (tripRes.isSuccess && tripRes.result) {
        const data = tripRes.result;
        if (data.handoverReadDTOs && Array.isArray(data.handoverReadDTOs)) {
          const handoverRecord = data.handoverReadDTOs.find((r: any) => r && r.type === "HANDOVER");
          const returnRecord = data.handoverReadDTOs.find((r: any) => r && r.type === "RETURN");
          data.tripVehicleHandoverRecordId = handoverRecord?.tripVehicleHandoverRecordId;
          data.tripVehicleReturnRecordId = returnRecord?.tripVehicleHandoverRecordId;
        }
        setTrip(data);

        if (data.tripRoute?.routeData) {
          const decoded = decodePolyline(data.tripRoute.routeData);
          setRouteCoords(decoded.coordinates as [number, number][]);
          setRouteFeature(toGeoJSONLineFeature(decoded.coordinates as [number, number][]) as Feature<LineString>);
        }
      }

      if (analysisRes?.isSuccess && analysisRes?.result) {
        setDriverAnalysis(analysisRes.result);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải dữ liệu chuyến đi");
    } finally {
      setLoading(false);
    }
  };

  // --- Helper Functions ---
  const openDriverContractModal = async (contractId?: string) => {
    if (!tripId || !contractId) return Alert.alert("Thông báo", "Không có hợp đồng để xem");
    setLoadingDriverContract(true);
    try {
      const res: any = await tripService.getById(tripId);
      if (res?.isSuccess && res.result) {
        const found = (res.result.driverContracts || []).find((c: any) => String(c.contractId) === String(contractId));
        if (!found) return Alert.alert("Thông báo", "Không tìm thấy hợp đồng");
        setActiveDriverContract(found);
        setShowDriverContractModal(true);
      }
    } catch (e: any) { Alert.alert("Lỗi", e?.message || "Không thể tải hợp đồng"); } finally { setLoadingDriverContract(false); }
  };

  const openDeliveryRecordModal = async (recordId?: string) => {
    if (!recordId) return Alert.alert("Thông báo", "Không có biên bản");
    setLoadingDeliveryRecord(true);
    try {
      const res: any = await tripService.getDeliveryRecordForDriver(recordId);
      if (res?.isSuccess) {
        const record = res.result;
        // Map deliveryRecordTerms to terms format for component
        if (record.deliveryRecordTemplate?.deliveryRecordTerms && Array.isArray(record.deliveryRecordTemplate.deliveryRecordTerms)) {
          record.terms = record.deliveryRecordTemplate.deliveryRecordTerms.map((term: any) => ({
            deliveryRecordTermId: term.deliveryRecordTermId,
            content: term.content || "",
            displayOrder: term.displayOrder || 0,
          }));
        } else {
          record.terms = [];
        }
        setActiveDeliveryRecord(record);
        setShowDeliveryModal(true);
      } else Alert.alert("Lỗi", res?.message || "Không thể tải biên bản");
    } catch (e: any) { Alert.alert("Lỗi", e?.message || "Không thể tải biên bản"); } finally { setLoadingDeliveryRecord(false); }
  };

  const openVehicleHandoverModal = async (recordId?: string) => {
    if (!recordId) return Alert.alert("Thông báo", "Không có biên bản giao xe");
    setLoadingHandoverRecord(true);
    try {
      const res: any = await tripService.getVehicleHandoverRecord(recordId);
      if (res?.isSuccess && res?.result) {
        const record = res.result;
        if (record.termResults && Array.isArray(record.termResults)) {
          // Map for editing UI
          record.terms = record.termResults.map((term: any, index: number) => ({
            tripVehicleHandoverTermResultId: term.tripVehicleHandoverTermResultId,
            vehicleHandoverTermId: term.tripVehicleHandoverTermResultId || term.termId || `term-${index}`,
            content: term.termContent || "",
            isChecked: term.isPassed || false,
            deviation: term.note || "",
            displayOrder: index,
          }));
          // Map for document display - add isOk and termContent
          record.termResults = record.termResults.map((term: any) => ({
            termResultId: term.tripVehicleHandoverTermResultId,
            termContent: term.termContent || "",
            isOk: term.isPassed || false,
            note: term.note || null,
          }));
        } else { record.terms = []; }
        setActiveHandoverRecord(record);
        setEditedTerms(record.terms);
        setShowHandoverModal(true);
      } else { Alert.alert("Lỗi", res?.message || "Không thể tải biên bản"); }
    } catch (e: any) { Alert.alert("Lỗi", e?.message || "Không thể tải biên bản"); } finally { setLoadingHandoverRecord(false); }
  };

  const handleConfirmDrivers = async () => {
    if (!trip) return;
    if (Platform.OS === "web") {
      const ok = window.confirm("Xác nhận rằng chuyến này đã có đủ tài xế?");
      if (!ok) return;
      setConfirmingDrivers(true);
      try {
        const res: any = await tripService.changeStatus({ TripId: trip.tripId, NewStatus: "READY_FOR_VEHICLE_HANDOVER" });
        if (!res?.isSuccess) throw new Error(res?.message);
        Alert.alert("Thành công", "Đã xác nhận đủ tài xế.");
        await fetchTrip(tripId);
      } catch (e: any) { Alert.alert("Lỗi", e?.message); } finally { setConfirmingDrivers(false); }
      return;
    }
    Alert.alert("Xác nhận", "Xác nhận rằng chuyến này đã có đủ tài xế?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận", onPress: async () => {
          setConfirmingDrivers(true);
          try {
            const res: any = await tripService.changeStatus({ TripId: trip.tripId, NewStatus: "READY_FOR_VEHICLE_HANDOVER" });
            if (!res?.isSuccess) throw new Error(res?.message);
            Alert.alert("Thành công", "Đã xác nhận đủ tài xế.");
            await fetchTrip(tripId);
          } catch (e: any) { Alert.alert("Lỗi", e?.message); } finally { setConfirmingDrivers(false); }
        }
      },
    ]);
  };

  const handleCompleteTrip = async () => {
    if (!trip) return;
    if (Platform.OS === "web") {
      const ok = window.confirm("Xác nhận đã trả xe và hoàn tất chuyến đi?");
      if (!ok) return;
      setConfirmingCompletion(true);
      try {
        const res: any = await tripService.changeStatus({ TripId: trip.tripId, NewStatus: "COMPLETED" });
        if (!res?.isSuccess) throw new Error(res?.message);
        Alert.alert("Thành công", "Chuyến đi đã được hoàn tất");
        await fetchTrip(tripId);
      } catch (e: any) { Alert.alert("Lỗi", e?.message); } finally { setConfirmingCompletion(false); }
      return;
    }
    Alert.alert("Xác nhận", "Xác nhận đã trả xe và hoàn tất chuyến đi?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận", onPress: async () => {
          setConfirmingCompletion(true);
          try {
            const res: any = await tripService.changeStatus({ TripId: trip.tripId, NewStatus: "COMPLETED" });
            if (!res?.isSuccess) throw new Error(res?.message);
            Alert.alert("Thành công", "Chuyến đi đã được hoàn tất");
            await fetchTrip(tripId);
          } catch (e: any) { Alert.alert("Lỗi", e?.message); } finally { setConfirmingCompletion(false); }
        }
      },
    ]);
  };

  const handleConfirmTripCompletion = async () => {
    if (!trip) return;
    if (Platform.OS === "web") {
      const ok = window.confirm("Xác nhận hoàn tất hành trình?");
      if (!ok) return;
      setConfirmingTripCompletion(true);
      try {
        const res: any = await tripService.changeStatus({ TripId: trip.tripId, NewStatus: "COMPLETED" });
        if (!res?.isSuccess) throw new Error(res?.message);
        Alert.alert("Thành công", "Hành trình đã được hoàn tất");
        await fetchTrip(tripId);
      } catch (e: any) { Alert.alert("Lỗi", e?.message); } finally { setConfirmingTripCompletion(false); }
      return;
    }
    Alert.alert("Xác nhận", "Xác nhận hoàn tất hành trình?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận", onPress: async () => {
          setConfirmingTripCompletion(true);
          try {
            const res: any = await tripService.changeStatus({ TripId: trip.tripId, NewStatus: "COMPLETED" });
            if (!res?.isSuccess) throw new Error(res?.message);
            Alert.alert("Thành công", "Hành trình đã được hoàn tất");
            await fetchTrip(tripId);
          } catch (e: any) { Alert.alert("Lỗi", e?.message); } finally { setConfirmingTripCompletion(false); }
        }
      },
    ]);
  };

  const handleSignContract = async () => {
    if (!trip?.providerContracts?.contractId) return;
    setSigning(true);
    try {
      const res: any = await tripProviderContractService.sendSignOtp(trip.providerContracts.contractId);
      if (res?.isSuccess) {
        setOtpDigits(Array(6).fill(""));
        setShowOtpModal(true);
        setTimeout(() => otpInputsRef.current?.[0]?.focus?.(), 200);
      } else { Alert.alert("Lỗi", res?.message); }
    } catch (e: any) { Alert.alert("Lỗi", e?.message); } finally { setSigning(false); }
  };

  const submitOtp = async () => {
    const otp = otpDigits.join("");
    if (otp.length < 6) return Alert.alert("OTP", "Vui lòng nhập đủ 6 số");
    setOtpLoading(true);
    try {
      const res: any = await tripProviderContractService.signContract({ ContractId: trip!.providerContracts!.contractId, Otp: otp });
      if (res?.isSuccess) {
        Alert.alert("Thành công", "Ký hợp đồng thành công");
        setShowOtpModal(false); setShowContractModal(false); fetchTrip(tripId);
      } else { Alert.alert("Lỗi", res?.message); }
    } catch (e: any) { Alert.alert("Lỗi", e?.message); } finally { setOtpLoading(false); }
  };

  const resendOtp = async () => {
    if (!trip?.providerContracts?.contractId) return;
    try {
      const res: any = await tripProviderContractService.sendSignOtp(trip.providerContracts.contractId);
      if (res?.isSuccess) { Alert.alert("Đã gửi", "OTP đã được gửi lại"); }
    } catch (e) { }
  };

  const openDriverContractPdf = async (contractId: any) => {
    if (!contractId) return;
    try { const res: any = await tripService.getDriverContractPdfLink(contractId); if (res?.result) Linking.openURL(res.result); } catch (e) { Alert.alert("Lỗi", "Không mở được PDF"); }
  };
  const openDeliveryRecordPdf = async (recordId: any) => {
    if (!recordId) return;
    try { const res: any = await tripService.getDeliveryRecordPdfLink(recordId); if (res?.result) Linking.openURL(res.result); } catch (e) { Alert.alert("Lỗi", "Không mở được PDF"); }
  };
  const openVehicleHandoverPdf = async (recordId: any) => {
    if (!recordId) return;
    try { const res: any = await tripService.getVehicleHandoverPdfLink(recordId); if (res?.result) Linking.openURL(res.result); } catch (e) { Alert.alert("Lỗi", "Không mở được PDF"); }
  };

  const toggleEditChecklist = () => {
    if (isEditingChecklist) setEditedTerms(activeHandoverRecord?.terms || []);
    setIsEditingChecklist(!isEditingChecklist);
  };
  const saveChecklist = async () => {
    setSavingChecklist(true);
    try {
      const res: any = await tripService.updateVehicleHandoverChecklist({
        RecordId: activeHandoverRecord.tripVehicleHandoverRecordId,
        ChecklistItems: editedTerms.map((t: any) => ({ TripVehicleHandoverTermResultId: t.tripVehicleHandoverTermResultId, IsPassed: t.isChecked, Note: t.deviation || "" }))
      });
      if (res?.isSuccess) { setActiveHandoverRecord({ ...activeHandoverRecord, terms: editedTerms }); setIsEditingChecklist(false); fetchTrip(tripId); }
      else Alert.alert("Lỗi", res?.message);
    } catch (e) { } finally { setSavingChecklist(false); }
  };
  const updateTermChecked = (i: number, c: boolean) => { const n = [...editedTerms]; n[i].isChecked = c; setEditedTerms(n); };
  const updateTermNote = (i: number, t: string) => { const n = [...editedTerms]; n[i].deviation = t; setEditedTerms(n); };

  const sendOtpForSigning = async () => {
    setSendingHandoverOtp(true);
    try {
      const res: any = await tripService.sendVehicleHandoverOtp(activeHandoverRecord.tripVehicleHandoverRecordId);
      if (res?.isSuccess) { setShowHandoverOtpModal(true); } else Alert.alert("Lỗi", res?.message);
    } catch (e) { } finally { setSendingHandoverOtp(false); }
  };

  const submitOtpSignature = async () => {
    setHandoverOtpLoading(true);
    try {
      const res: any = await tripService.signVehicleHandoverRecord({ RecordId: activeHandoverRecord.tripVehicleHandoverRecordId, Otp: handoverOtpDigits.join("") });
      if (res?.isSuccess) { Alert.alert("Thành công", "Đã ký"); setShowHandoverOtpModal(false); openVehicleHandoverModal(activeHandoverRecord.tripVehicleHandoverRecordId); fetchTrip(tripId); }
      else Alert.alert("Lỗi", res?.message);
    } catch (e) { } finally { setHandoverOtpLoading(false); }
  };

  const handleSimulationUpdate = (feature: any) => {
    if (feature.properties && typeof feature.properties.nearestIndex === "number" && routeCoords) {
      setSimulatedProgressIndex(feature.properties.nearestIndex);
    }
  };
  const toggleSimulation = () => {
    setSimulationActive(!simulationActive);
    if (!simulationActive) Alert.alert("Demo Mode", "Đã bật chế độ mô phỏng.");
  };
  const currentDistance = useMemo(() => {
    if (!trip?.tripRoute?.distanceKm || !routeCoords) return 0;
    const total = routeCoords.length;
    if (total === 0) return 0;
    return (simulatedProgressIndex / total) * trip.tripRoute.distanceKm;
  }, [simulatedProgressIndex, trip?.tripRoute?.distanceKm, routeCoords]);

  const handleOtpChange = (index: number, text: string) => {
    if (!/^[0-9]*$/.test(text)) return;
    const val = text.slice(-1);
    setOtpDigits(p => { const n = [...p]; n[index] = val; return n; });
    if (val && index < 5) otpInputsRef.current[index + 1]?.focus?.();
  };
  const handleHandoverOtpChange = (index: number, text: string) => {
    if (!/^[0-9]*$/.test(text)) return;
    const val = text.slice(-1);
    setHandoverOtpDigits(p => { const n = [...p]; n[index] = val; return n; });
    if (val && index < 5) handoverOtpInputsRef.current[index + 1]?.focus?.();
  };
  const handleHandoverOtpKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !handoverOtpDigits[index] && index > 0) {
      handoverOtpInputsRef.current[index - 1]?.focus();
    }
  };
  const handleOtpKeyPress = (index: number, e: any) => {
    if (e.nativeEvent.key === "Backspace") {
      if (otpDigits[index] === "" && index > 0) {
        otpInputsRef.current[index - 1]?.focus?.();
        setOtpDigits((prev) => { const next = [...prev]; next[index - 1] = ""; return next; });
      } else {
        setOtpDigits((prev) => { const next = [...prev]; next[index] = ""; return next; });
      }
    }
  };

  // ================= RENDER =================
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>;
  if (!trip) return <View style={styles.center}><Text>Không tìm thấy chuyến đi</Text></View>;

  const hasMainDriver = trip.drivers?.some((d) => d && d.type === "MAIN");
  const packages = trip.packages || [];
  const canSign = !trip.providerContracts?.ownerSigned;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Chi Tiết Chuyến Đi</Text>
          <Text style={styles.headerSubTitle}>{trip.tripCode}</Text>
        </View>
        <TouchableOpacity onPress={toggleSimulation} style={{ padding: 4 }}>
          <Text style={{ fontSize: 20 }}>{simulationActive ? "⏸️" : "▶️"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* WARNING BANNERS */}
        {trip.status === 'AWAITING_OWNER_CONTRACT' && (
          <View style={styles.warningBanner}>
            <View style={styles.warningIconContainer}><Text style={styles.warningIcon}>⚠️</Text></View>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Chờ ký hợp đồng</Text>
              <Text style={styles.warningText}>Bạn cần ký hợp đồng với Provider trước khi gán tài xế hoặc đăng bài tìm tài xế</Text>
            </View>
          </View>
        )}

        {trip.status === 'VEHICLE_HANDOVERED' && (() => {
          if (!trip.handoverReadDTOs) return null;
          const handoverRecord = trip.handoverReadDTOs.find((r: any) => r && r.type === 'HANDOVER');
          const isAwaitingOwnerSignature = handoverRecord?.status === 'AWAITING_DELIVERY_RECORD_SIGNATURE';
          if (isAwaitingOwnerSignature) {
            return (
              <View style={styles.warningBanner}>
                <View style={styles.warningIconContainer}><Text style={styles.warningIcon}>✅</Text></View>
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Tài xế đã xác nhận</Text>
                  <Text style={styles.warningText}>Tài xế đã kiểm tra và xác nhận tình trạng xe. Vui lòng mở biên bản giao xe để xem chi tiết và ký</Text>
                </View>
              </View>
            );
          }
          return (
            <View style={styles.warningBanner}>
              <View style={styles.warningIconContainer}><Text style={styles.warningIcon}>⏳</Text></View>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Đợi tài xế xác nhận</Text>
                <Text style={styles.warningText}>Đang chờ tài xế kiểm tra, ghi nhận tình trạng xe và ký biên bản giao xe</Text>
              </View>
            </View>
          );
        })()}

        {/* 1. THANH TIẾN TRÌNH (STEPPER) */}
        <TripStepper status={trip.status} />

        {/* 2. BẢN ĐỒ & LỘ TRÌNH */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.tripCode}>Trip Code: #{trip.tripCode}</Text>
              <View style={styles.routeTextRow}>
                <View style={[styles.dot, { backgroundColor: "#3B82F6" }]} />
                <Text style={styles.routeAddress} numberOfLines={1}>{trip.shippingRoute?.startAddress?.split(',')[0]}</Text>
                <Text style={styles.arrow}>→</Text>
                <View style={[styles.dot, { backgroundColor: "#EF4444" }]} />
                <Text style={styles.routeAddress} numberOfLines={1}>{trip.shippingRoute?.endAddress?.split(',')[0]}</Text>
              </View>
            </View>
            <StatusBadge status={trip.status} />
          </View>
          <View style={styles.mapContainer}>
            <VietMapWebSDK routeData={trip.tripRoute?.routeData} showOverviewMarkers={true} />
            {simulationActive && routeFeature && (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <AnimatedRouteProgress route={routeFeature} isSimulating={simulationActive} speed={80} onPositionUpdate={handleSimulationUpdate} />
              </View>
            )}
            <View style={styles.floatingProgress}>
              <RouteProgressBar currentDistance={currentDistance} totalDistance={trip.tripRoute?.distanceKm || 100} durationMinutes={trip.tripRoute?.durationMinutes || 60} />
            </View>
          </View>
        </View>

        {/* 3. MÔ HÌNH VẬN HÀNH (Horizontal Cards) */}
        {driverAnalysis && (
          <View style={styles.analysisSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📊 Mô hình vận hành</Text>
            </View>

            {/* Driver Assignment Status Summary */}
            <View style={styles.assignmentStatusBox}>
              <View style={styles.assignmentRow}>
                <View style={styles.assignmentItem}>
                  <Text style={styles.assignmentLabel}>Đã gán</Text>
                  <Text style={styles.assignmentValue}>{driverAnalysis.totalAssigned || 0}</Text>
                </View>
                <View style={styles.assignmentItem}>
                  <Text style={styles.assignmentLabel}>Tài chính</Text>
                  <Text style={[styles.assignmentValue, { color: driverAnalysis.hasMainDriver ? '#059669' : '#DC2626' }]}>
                    {driverAnalysis.hasMainDriver ? '✓' : '✗'}
                  </Text>
                </View>
                <View style={styles.assignmentItem}>
                  <Text style={styles.assignmentLabel}>Tài phụ</Text>
                  <Text style={styles.assignmentValue}>{driverAnalysis.assistantCount || 0}</Text>
                </View>
                <View style={styles.assignmentItem}>
                  <Text style={styles.assignmentLabel}>Còn thiếu</Text>
                  <Text style={[styles.assignmentValue, { color: driverAnalysis.remainingSlots === 0 ? '#059669' : '#F59E0B' }]}>
                    {driverAnalysis.remainingSlots || 0}
                  </Text>
                </View>
              </View>
              {driverAnalysis.recommendation && (
                <View style={styles.recommendationBanner}>
                  <Ionicons name="information-circle" size={16} color="#2563EB" />
                  <Text style={styles.recommendationText}>{driverAnalysis.recommendation}</Text>
                </View>
              )}
            </View>

            {['AWAITING_OWNER_CONTRACT', 'PENDING_DRIVER_ASSIGNMENT', 'DONE_ASSIGNING_DRIVER'].includes(trip.status) && (
              <>
                {/* AI Recommendation */}
                {driverAnalysis.suggestion?.systemRecommendation && (
                  <View style={styles.aiRecommendBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <MaterialCommunityIcons name="robot-outline" size={20} color="#D97706" style={{ marginRight: 6 }} />
                      <Text style={styles.aiTitle}>Đề xuất từ AI System</Text>
                    </View>
                    <Text style={styles.aiText}>{driverAnalysis.suggestion.systemRecommendation}</Text>
                  </View>
                )}
                {/* ScrollView Kịch Bản */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
                  {/* Solo */}
                  <View style={[styles.scenarioCard, driverAnalysis.suggestion?.soloScenario?.isPossible ? styles.cardPossible : styles.cardImpossible]}>
                    <View style={styles.scenarioHeader}>
                      <FontAwesome5 name="user" size={16} color={driverAnalysis.suggestion?.soloScenario?.isPossible ? "#059669" : "#9CA3AF"} />
                      <Text style={styles.scenarioTitle}>Vận hành Đơn</Text>
                    </View>
                    <Text style={styles.scenarioSub}>1 Tài xế (Solo)</Text>
                    <View style={styles.divider} />
                    <Text style={styles.metricText}>⏱ {driverAnalysis.suggestion?.soloScenario?.totalHoursNeeded?.toFixed(1) || 0}h tổng</Text>
                    <Text style={styles.metricText}>👤 {driverAnalysis.suggestion?.soloScenario?.workHoursPerDriver?.toFixed(1) || 0}h/tài</Text>
                    {driverAnalysis.suggestion?.soloScenario?.message && (
                      <Text style={styles.scenarioMessage}>{driverAnalysis.suggestion.soloScenario.message}</Text>
                    )}
                    {driverAnalysis.suggestion?.soloScenario?.note && (
                      <Text style={styles.scenarioNote}>💡 {driverAnalysis.suggestion.soloScenario.note}</Text>
                    )}
                    {!driverAnalysis.suggestion?.soloScenario?.isPossible && <Text style={styles.impossibleTag}>Không khả thi</Text>}
                  </View>
                  {/* Team */}
                  <View style={[styles.scenarioCard, driverAnalysis.suggestion?.teamScenario?.isPossible ? styles.cardPossible : styles.cardImpossible]}>
                    <View style={styles.scenarioHeader}>
                      <FontAwesome5 name="user-friends" size={16} color={driverAnalysis.suggestion?.teamScenario?.isPossible ? "#2563EB" : "#9CA3AF"} />
                      <Text style={styles.scenarioTitle}>Vận hành Đội</Text>
                    </View>
                    <Text style={styles.scenarioSub}>2 Tài xế (Team)</Text>
                    <View style={styles.divider} />
                    <Text style={styles.metricText}>⏱ {driverAnalysis.suggestion?.teamScenario?.totalHoursNeeded?.toFixed(1) || 0}h tổng</Text>
                    <Text style={styles.metricText}>👤 {driverAnalysis.suggestion?.teamScenario?.workHoursPerDriver?.toFixed(1) || 0}h/tài</Text>
                    {driverAnalysis.suggestion?.teamScenario?.message && (
                      <Text style={styles.scenarioMessage}>{driverAnalysis.suggestion.teamScenario.message}</Text>
                    )}
                    {driverAnalysis.suggestion?.teamScenario?.note && (
                      <Text style={styles.scenarioNote}>💡 {driverAnalysis.suggestion.teamScenario.note}</Text>
                    )}
                    {driverAnalysis.suggestion?.teamScenario?.isPossible && (
                      <View style={styles.recommendTag}><Text style={styles.recommendText}>Khuyên dùng</Text></View>
                    )}
                  </View>
                  {/* Express */}
                  <View style={[styles.scenarioCard, driverAnalysis.suggestion?.expressScenario?.isPossible ? styles.cardPossible : styles.cardImpossible]}>
                    <View style={styles.scenarioHeader}>
                      <MaterialCommunityIcons name="lightning-bolt" size={20} color={driverAnalysis.suggestion?.expressScenario?.isPossible ? "#DC2626" : "#9CA3AF"} />
                      <Text style={styles.scenarioTitle}>Hỏa tốc</Text>
                    </View>
                    <Text style={styles.scenarioSub}>3 Tài xế (Express)</Text>
                    <View style={styles.divider} />
                    <Text style={styles.metricText}>⏱ {driverAnalysis.suggestion?.expressScenario?.totalHoursNeeded?.toFixed(1) || 0}h tổng</Text>
                    <Text style={styles.metricText}>👤 {driverAnalysis.suggestion?.expressScenario?.workHoursPerDriver?.toFixed(1) || 0}h/tài</Text>
                    {driverAnalysis.suggestion?.expressScenario?.message && (
                      <Text style={styles.scenarioMessage}>{driverAnalysis.suggestion.expressScenario.message}</Text>
                    )}
                    {driverAnalysis.suggestion?.expressScenario?.note && (
                      <Text style={styles.scenarioNote}>💡 {driverAnalysis.suggestion.expressScenario.note}</Text>
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        )}
         

        {/* 4. PHƯƠNG TIỆN & TÀI XẾ (Fixed: Nút Gán tài xế đã hiển thị lại) */}
        <View style={styles.rowContainer}>
          {/* Vehicle Card */}
          <View style={[styles.card, { flex: 1, marginRight: 6 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🚛 Phương tiện</Text>
            </View>
            {trip.vehicle ? (
              <View>
                <Image source={{ uri: trip.vehicle.imageUrls?.[0] || "https://via.placeholder.com/150" }} style={styles.vehicleImage} />
                <Text style={styles.plateNumberBig}>{trip.vehicle.plateNumber}</Text>
                <Text style={styles.vehicleDetail}>{trip.vehicle.model}</Text>
              </View>
            ) : <Text style={styles.emptyText}>Chưa gán xe</Text>}
          </View>

          {/* Drivers Card */}
          <View style={[styles.card, { flex: 1, marginLeft: 6 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>👮 Tài xế</Text>
              {trip.status !== 'AWAITING_OWNER_CONTRACT' && (
                <TouchableOpacity onPress={() => setShowDriverModal(true)}>
                  <Text style={styles.linkText}>+ Gán</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flex: 1, justifyContent: trip.drivers?.length ? 'flex-start' : 'center' }}>
              {trip.drivers && trip.drivers.length > 0 ? (
                <>
                  {trip.drivers.map((d, idx) => (
                    <View key={idx} style={styles.driverRow}>
                      <View style={styles.driverAvatar}><Text style={styles.driverAvatarText}>{d.fullName.charAt(0)}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.driverName} numberOfLines={1}>{d.fullName}</Text>
                        <Text style={styles.driverRole}>{d.type === "MAIN" ? "Chính" : "Phụ"}</Text>
                      </View>
                    </View>
                  ))}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={() => setShowDriverModal(true)} disabled={trip.status === 'AWAITING_OWNER_CONTRACT'}><Text style={styles.outlineBtnText}>Gán thêm</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={() => setShowCreatePostModal(true)} disabled={trip.status === 'AWAITING_OWNER_CONTRACT'}><Text style={styles.outlineBtnText}>Đăng tin</Text></TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={{ alignItems: 'center', width: '100%', gap: 8 }}>
                  <TouchableOpacity style={[styles.dashedBtn, { width: '100%' }]} onPress={() => setShowDriverModal(true)} disabled={trip.status === 'AWAITING_OWNER_CONTRACT'}>
                    <Text style={{ fontSize: 12, color: '#3B82F6', fontWeight: '600' }}>Gán tài xế</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.dashedBtn, { width: '100%' }]} onPress={() => setShowCreatePostModal(true)} disabled={trip.status === 'AWAITING_OWNER_CONTRACT'}>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Đăng tìm tài xế</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 5. HÀNG HÓA */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📦 Hàng hóa ({packages.length} gói)</Text>
          </View>
          {packages.map((pkg, index) => (
            <View key={index} style={styles.packageRow}>
              <View style={styles.packageIcon}><Feather name="package" size={20} color="#4B5563" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pkgCode}>{pkg.packageCode}</Text>
                <Text style={styles.pkgDetail}>{pkg.weight}kg • {pkg.volume}m³</Text>
                <SmallImageCarousel images={pkg.imageUrls} />
              </View>
            </View>
          ))}
        </View>

        {/* 6. HỒ SƠ PHÁP LÝ (Gom nhóm) */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📂 Hồ sơ pháp lý & Biên bản</Text>
          </View>



          {/* CONTRACT  */}
          {(trip.providerContracts || trip.driverContracts) && (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: '#F3F4F6' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8 }}>HỢP ĐỒNG</Text>
              
              {/* Hợp đồng Provider */}
              {trip.providerContracts && (
                <TouchableOpacity style={styles.docRowItem} onPress={() => setShowContractModal(true)}>
                  <View style={[styles.docIcon, { backgroundColor: '#EFF6FF' }]}><FontAwesome5 name="file-contract" size={18} color="#2563EB" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>Hợp đồng vận chuyển</Text>
                    <Text style={[styles.docStatus, { color: trip.providerContracts?.status === 'SIGNED' ? '#059669' : '#D97706' }]}>
                      {trip.providerContracts?.status === 'COMPLETED' ? 'Đã ký kết' : 'Chờ xử lý'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}

              {/* Hợp đồng tài xế */}
              {trip.driverContracts && trip.driverContracts.length > 0 && (
                <TouchableOpacity style={styles.docRowItem} onPress={() => openDriverContractModal(trip.driverContracts?.[0]?.contractId)}>
                  <View style={[styles.docIcon, { backgroundColor: '#F3F4F6' }]}><FontAwesome5 name="user-tie" size={18} color="#4B5563" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>Hợp đồng tài xế ({trip.driverContracts?.length || 0})</Text>
                    <Text style={styles.docStatus}>Nhấn để xem chi tiết</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          )}



          {/* HANDOVER Records */}
          {(trip.deliveryRecords || []).length > 0 && (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: '#F3F4F6' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8 }}>BIÊN BẢN GIAO / TRẢ XE ({trip.deliveryRecords.length})</Text>
              {/* Biên bản giao xe */}
              <TouchableOpacity style={styles.docRowItem} onPress={() => trip.tripVehicleHandoverRecordId && openVehicleHandoverModal(trip.tripVehicleHandoverRecordId)}>
                <View style={[styles.docIcon, { backgroundColor: '#F0FDF4' }]}><MaterialCommunityIcons name="truck-check" size={20} color="#166534" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>Biên bản giao xe</Text>
                  <Text style={styles.docStatus}>{trip.tripVehicleHandoverRecordId ? 'Sẵn sàng' : 'Chưa có'}</Text>
                </View>
                {trip.tripVehicleHandoverRecordId && <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />}
              </TouchableOpacity>

              {/* Biên bản trả xe */}
              <TouchableOpacity style={styles.docRowItem} onPress={() => trip.tripVehicleReturnRecordId && openVehicleHandoverModal(trip.tripVehicleReturnRecordId)}>
                <View style={[styles.docIcon, { backgroundColor: '#FEF2F2' }]}><MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#991B1B" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>Biên bản trả xe</Text>
                  <Text style={styles.docStatus}>{trip.tripVehicleReturnRecordId ? 'Sẵn sàng' : 'Chưa có'}</Text>
                </View>
                {trip.tripVehicleReturnRecordId && <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />}
              </TouchableOpacity>
            </View>
          )}

          {/* Delivery Records */}
          {(trip.deliveryRecords || []).length > 0 && (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: '#F3F4F6' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8 }}>BIÊN BẢN GIAO HÀNG ({trip.deliveryRecords.length})</Text>
              {trip.deliveryRecords.map((r: any, i: number) => (
                <TouchableOpacity key={i} style={styles.docRowItem} onPress={() => openDeliveryRecordModal(r.tripDeliveryRecordId)}>
                  <View style={[styles.docIcon, { backgroundColor: '#FDF2F8' }]}><MaterialCommunityIcons name="package-variant-closed" size={20} color="#BE185D" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{r.recordType === 'PICKUP' ? 'Lấy hàng' : 'Giao hàng'}</Text>
                    <Text style={styles.docStatus}>{new Date(r.createAt).toLocaleDateString('vi-VN')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating Bottom Actions */}
      {trip.status === "DONE_ASSIGNING_DRIVER" && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmDrivers} disabled={confirmingDrivers}>
            {confirmingDrivers ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Xác nhận đủ tài xế</Text>}
          </TouchableOpacity>
        </View>
      )}
      {trip.status === "VEHICLE_RETURNED" && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleCompleteTrip} disabled={confirmingCompletion}>
            {confirmingCompletion ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Hoàn tất chuyến đi</Text>}
          </TouchableOpacity>
        </View>
      )}
      {trip.status === "DONE_TRIP_AND_WATING_FOR_PAYOUT" && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmTripCompletion} disabled={confirmingTripCompletion}>
            {confirmingTripCompletion ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Xác nhận xong hành trình</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* --- MODALS --- */}

      {/* 1. Modal Hợp đồng A4 (Fixed: Display full content logic) */}
      <Modal visible={showContractModal} transparent animationType="slide" onRequestClose={() => setShowContractModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPaper}>
            <TouchableOpacity style={styles.paperCloseBtn} onPress={() => setShowContractModal(false)}><Text style={styles.paperCloseText}>×</Text></TouchableOpacity>
            <ScrollView style={styles.paperScroll}>
              {trip.providerContracts && (
                <ContractDocument
                  contractCode={trip.providerContracts.contractCode}
                  contractType="PROVIDER_CONTRACT"
                  contractValue={trip.providerContracts.contractValue}
                  currency={trip.providerContracts.currency}
                  effectiveDate={trip.providerContracts.effectiveDate || ""}
                  terms={trip.providerContracts.terms || []}
                  ownerName={trip.owner?.fullName || ''}
                  ownerCompany={trip.owner?.companyName}
                  ownerTaxCode={trip.provider?.taxCode}
                  counterpartyName={trip.provider?.companyName || ''}
                  ownerSigned={trip.providerContracts.ownerSigned ?? false}
                  ownerSignAt={trip.providerContracts.ownerSignAt ?? null}
                  counterpartySigned={trip.providerContracts.counterpartySigned ?? false}
                  counterpartySignAt={trip.providerContracts.counterpartySignAt ?? null}
                  tripCode={trip.tripCode}
                  vehiclePlate={trip.vehicle?.plateNumber}
                  startAddress={trip.shippingRoute?.startAddress}
                  endAddress={trip.shippingRoute?.endAddress}
                />
              )}
            </ScrollView>
            <View style={styles.paperFooter}>
              <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => Linking.openURL(trip.providerContracts?.fileURL || '')}><Text style={styles.actionBtnTextSec}>Tải PDF</Text></TouchableOpacity>
              {canSign && <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleSignContract}><Text style={styles.actionBtnTextPri}>Ký xác nhận</Text></TouchableOpacity>}
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Modal Driver Assign */}
      <DriverAssignModal visible={showDriverModal} onClose={() => setShowDriverModal(false)} trip={trip} tripId={trip.tripId} mainDriverExists={hasMainDriver} onAssigned={(u) => { setTrip(u); fetchTrip(tripId); }} driverAnalysis={driverAnalysis} />

      {/* 3. Modal Create Post */}
      <CreatePostTripModal visible={showCreatePostModal} onClose={() => setShowCreatePostModal(false)} tripId={trip.tripId} onCreated={() => { Alert.alert("Thành công", "Đã tạo bài đăng"); fetchTrip(tripId); }} driverAnalysis={driverAnalysis} />

      {/* 4. Modal OTP */}
      <Modal visible={showOtpModal} transparent animationType="fade" onRequestClose={() => setShowOtpModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { width: '90%' }]}>
            <Text style={styles.otpModalTitle}>Nhập mã OTP</Text>
            <View style={styles.otpRow}>{otpDigits.map((d, i) => <TextInput key={i} ref={r => { otpInputsRef.current[i] = r; }} style={styles.otpInput} value={d} onChangeText={t => handleOtpChange(i, t)} keyboardType="numeric" maxLength={1} />)}</View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity onPress={resendOtp}><Text style={{ color: '#6B7280' }}>Gửi lại?</Text></TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnPrimary} onPress={submitOtp} disabled={otpLoading}><Text style={styles.actionBtnTextPri}>Xác nhận</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. Modal Driver Contract PDF */}
      <Modal visible={showDriverContractModal} transparent animationType="slide" onRequestClose={() => setShowDriverContractModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPaper}>
            <TouchableOpacity style={styles.paperCloseBtn} onPress={() => setShowDriverContractModal(false)}><Text style={styles.paperCloseText}>×</Text></TouchableOpacity>
            <ScrollView style={styles.paperScroll}>
              {activeDriverContract && (
                <ContractDocument
                  contractCode={activeDriverContract.contractCode}
                  contractType="DRIVER_CONTRACT"
                  contractValue={activeDriverContract.contractValue}
                  currency={activeDriverContract.currency}
                  effectiveDate={activeDriverContract.effectiveDate}
                  terms={activeDriverContract.terms || []}
                  ownerName={trip.owner?.fullName || ''}
                  ownerCompany={trip.owner?.companyName}
                  counterpartyName={trip.drivers?.find(d => d.driverId === activeDriverContract.counterpartyId)?.fullName || 'Tài xế'}
                  ownerSigned={activeDriverContract.ownerSigned}
                  ownerSignAt={activeDriverContract.ownerSignAt}
                  counterpartySigned={activeDriverContract.counterpartySigned}
                  counterpartySignAt={activeDriverContract.counterpartySignAt}
                  tripCode={trip.tripCode}
                  vehiclePlate={trip.vehicle?.plateNumber}
                  startAddress={trip.shippingRoute?.startAddress}
                  endAddress={trip.shippingRoute?.endAddress}
                />
              )}
            </ScrollView>
            <View style={styles.paperFooter}>
              <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => openDriverContractPdf(activeDriverContract?.contractId)}><Text style={styles.actionBtnTextSec}>Xem PDF</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 6. Modal Delivery Record */}
      <Modal visible={showDeliveryModal} transparent animationType="slide" onRequestClose={() => setShowDeliveryModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPaper}>
            <TouchableOpacity style={styles.paperCloseBtn} onPress={() => setShowDeliveryModal(false)}><Text style={styles.paperCloseText}>×</Text></TouchableOpacity>
            <ScrollView style={styles.paperScroll}>
              {activeDeliveryRecord && (
                <DeliveryRecordDocument
                  recordType={activeDeliveryRecord.recordType}
                  note={activeDeliveryRecord.note || ""}
                  createAt={activeDeliveryRecord.createAt}
                  terms={activeDeliveryRecord.terms || []}
                  driver={{
                    driverId: activeDeliveryRecord.driverPrimary?.driverId || trip.drivers?.find(d => d.driverId === activeDeliveryRecord.driverId)?.driverId || '',
                    fullName: activeDeliveryRecord.driverPrimary?.fullName || trip.drivers?.find(d => d.driverId === activeDeliveryRecord.driverId)?.fullName || 'Tài xế',
                    type: activeDeliveryRecord.driverPrimary?.type || trip.drivers?.find(d => d.driverId === activeDeliveryRecord.driverId)?.type || "PRIMARY"
                  }}
                  contact={{
                    tripContactId: activeDeliveryRecord.tripContact?.tripContactId || trip.contacts?.find(c => c.tripContactId === activeDeliveryRecord.tripContactId)?.tripContactId || '',
                    type: activeDeliveryRecord.recordType === "PICKUP" ? 'SENDER' : 'RECEIVER',
                    fullName: activeDeliveryRecord.tripContact?.fullName || trip.contacts?.find(c => c.tripContactId === activeDeliveryRecord.tripContactId)?.fullName || 'Khách hàng',
                    phoneNumber: activeDeliveryRecord.tripContact?.phoneNumber || trip.contacts?.find(c => c.tripContactId === activeDeliveryRecord.tripContactId)?.phoneNumber || '',
                    note: activeDeliveryRecord.tripContact?.note ?? trip.contacts?.find(c => c.tripContactId === activeDeliveryRecord.tripContactId)?.note ?? null
                  }}
                  driverSigned={activeDeliveryRecord.driverSigned}
                  driverSignedAt={activeDeliveryRecord.driverSignedAt}
                  contactSigned={activeDeliveryRecord.contactSigned}
                  contactSignedAt={activeDeliveryRecord.contactSignedAt}
                  status={activeDeliveryRecord.status}
                  tripCode={trip.tripCode}
                  vehiclePlate={trip.vehicle?.plateNumber}
                  ownerCompany={trip.owner?.companyName}
                  packages={activeDeliveryRecord.tripDetail?.packages?.map((p: any) => ({ packageCode: p.packageCode || p.item?.name, weight: p.weight, volume: p.volume })) || trip.packages?.map(p => ({ packageCode: p.packageCode, weight: p.weight, volume: p.volume }))}
                />
              )}
            </ScrollView>
            <View style={styles.paperFooter}>
              <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => openDeliveryRecordPdf(activeDeliveryRecord?.tripDeliveryRecordId)}><Text style={styles.actionBtnTextSec}>Xem PDF</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 7. Modal Vehicle Handover */}
      <Modal visible={showHandoverModal && !!activeHandoverRecord} transparent animationType="slide" onRequestClose={() => setShowHandoverModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPaper}>
            <TouchableOpacity style={styles.paperCloseBtn} onPress={() => setShowHandoverModal(false)}><Text style={styles.paperCloseText}>×</Text></TouchableOpacity>
            <ScrollView style={styles.paperScroll}>
              {isEditingChecklist ? (
                <View style={styles.paperContent}>
                  <View style={styles.docTitleSection}><Text style={styles.docTitleMain}>SỬA TÌNH TRẠNG PHƯƠNG TIỆN</Text></View>
                  <View style={styles.docTermsSection}>
                    {editedTerms.map((t: any, i: number) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderColor: '#F3F4F6' }}>
                        <Text style={{ flex: 1, fontSize: 13 }}>{i + 1}. {t.content}</Text>
                        <TouchableOpacity onPress={() => updateTermChecked(i, !t.isChecked)}><Text style={{ fontWeight: 'bold', color: t.isChecked ? '#10B981' : '#EF4444', fontSize: 16 }}>{t.isChecked ? '✓' : '✗'}</Text></TouchableOpacity>
                        <TextInput style={{ flex: 1, marginLeft: 8, borderBottomWidth: 1, borderColor: '#E5E7EB', fontSize: 12 }} placeholder="Ghi chú" value={t.deviation} onChangeText={(v) => updateTermNote(i, v)} />
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                activeHandoverRecord && (
                  <HandoverRecordDocument
                    type={activeHandoverRecord.type}
                    status={activeHandoverRecord.status}
                    handoverUserName={activeHandoverRecord.handoverUserName}
                    receiverUserName={activeHandoverRecord.receiverUserName}
                    vehiclePlate={trip.vehicle?.plateNumber || ''}
                    currentOdometer={activeHandoverRecord.currentOdometer}
                    fuelLevel={activeHandoverRecord.fuelLevel}
                    isEngineLightOn={activeHandoverRecord.isEngineLightOn}
                    notes={activeHandoverRecord.notes}
                    handoverSigned={activeHandoverRecord.handoverSigned}
                    handoverSignedAt={activeHandoverRecord.handoverSignedAt}
                    receiverSigned={activeHandoverRecord.receiverSigned}
                    receiverSignedAt={activeHandoverRecord.receiverSignedAt}
                    tripCode={trip.tripCode}
                    ownerCompany={trip.owner?.companyName}
                    termResults={activeHandoverRecord.termResults}
                    issues={activeHandoverRecord.issues}
                  />
                )
              )}
            </ScrollView>
            <View style={styles.paperFooter}>
              {isEditingChecklist ? (
                <>
                  <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1, backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]} onPress={toggleEditChecklist}><Text style={[styles.actionBtnTextSec, { color: '#EF4444' }]}>Hủy</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtnPrimary, { flex: 1 }]} onPress={saveChecklist}><Text style={styles.actionBtnTextPri}>Lưu thay đổi</Text></TouchableOpacity>
                </>
              ) : (
                <>
                  {(() => {
                    if (!activeHandoverRecord) return null;
                    
                    if (activeHandoverRecord.type === "HANDOVER") {
                      // HANDOVER: Owner waits for driver to sign first, then owner confirms
                      // Only allow Edit and Sign when trip status is VEHICLE_HANDOVERED
                      const driverHasSigned = activeHandoverRecord.receiverSigned;
                      const ownerHasSigned = activeHandoverRecord.handoverSigned;
                      const canEditOrSign = trip.status === "VEHICLE_HANDOVERED";
                      
                      return (
                        <>
                          {/* Edit Button - Show if no one has signed yet AND trip status is VEHICLE_HANDOVERED */}
                          {/* {!driverHasSigned && !ownerHasSigned && canEditOrSign && (
                            <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1 }]} onPress={toggleEditChecklist}>
                              <Text style={styles.actionBtnTextSec}>✏️ Sửa</Text>
                            </TouchableOpacity>
                          )} */}
                          
                          <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1 }]} onPress={() => openVehicleHandoverPdf(activeHandoverRecord?.tripVehicleHandoverRecordId)}>
                            <Text style={styles.actionBtnTextSec}>📄 PDF</Text>
                          </TouchableOpacity>
                          
                          {/* Sign Button - Show only after driver has signed AND trip status is VEHICLE_HANDOVERED */}
                          {driverHasSigned && !ownerHasSigned && canEditOrSign && (
                            <TouchableOpacity style={[styles.actionBtnPrimary, { flex: 1 }]} onPress={sendOtpForSigning}>
                              <Text style={styles.actionBtnTextPri}>Ký biên bản</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      );
                    } else {
                      // RETURN: Owner signs first to confirm receiving vehicle back
                      const ownerHasSigned = activeHandoverRecord.receiverSigned;
                      
                      return (
                        <>
                          {/* Edit Button - Show if owner hasn't signed yet */}
                          {!ownerHasSigned && (
                            <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1 }]} onPress={toggleEditChecklist}>
                              <Text style={styles.actionBtnTextSec}>✏️ Sửa</Text>
                            </TouchableOpacity>
                          )}
                          
                          <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1 }]} onPress={() => openVehicleHandoverPdf(activeHandoverRecord?.tripVehicleHandoverRecordId)}>
                            <Text style={styles.actionBtnTextSec}>📄 PDF</Text>
                          </TouchableOpacity>
                          
                          {/* Sign Button - Show if owner hasn't signed yet */}
                          {!ownerHasSigned && (
                            <TouchableOpacity style={[styles.actionBtnPrimary, { flex: 1 }]} onPress={sendOtpForSigning}>
                              <Text style={styles.actionBtnTextPri}>Ký biên bản</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      );
                    }
                  })()}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* 8. Modal OTP Handover */}
      <Modal visible={showHandoverOtpModal} transparent animationType="fade" onRequestClose={() => setShowHandoverOtpModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { width: '90%' }]}>
            <Text style={styles.otpModalTitle}>OTP Biên Bản</Text>
            <View style={styles.otpRow}>{handoverOtpDigits.map((d, i) => <TextInput key={i} ref={r => { handoverOtpInputsRef.current[i] = r; }} style={styles.otpInput} value={d} onChangeText={t => handleHandoverOtpChange(i, t)} keyboardType="numeric" maxLength={1} />)}</View>
            <TouchableOpacity style={[styles.actionBtnPrimary, { marginTop: 20 }]} onPress={submitOtpSignature}><Text style={styles.actionBtnTextPri}>Ký xác nhận</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ================= STYLES =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 16 },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFF", borderBottomWidth: 1, borderColor: "#E5E7EB" },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827", textAlign: "center" },
  headerSubTitle: { fontSize: 12, color: "#6B7280", textAlign: "center", fontWeight: "600" },

  // Stepper
  stepperContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, paddingHorizontal: 4 },
  stepCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center", marginBottom: 4, zIndex: 2 },
  stepCircleActive: { backgroundColor: "#3B82F6" },
  stepCircleCurrent: { backgroundColor: "#2563EB", borderWidth: 2, borderColor: '#DBEAFE' },
  stepNumber: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  stepNumberActive: { color: "#FFF" },
  stepLabel: { fontSize: 10, color: "#9CA3AF", fontWeight: "500" },
  stepLabelActive: { color: "#3B82F6", fontWeight: "700" },
  stepLine: { height: 2, flex: 1, backgroundColor: "#E5E7EB", marginTop: -16, marginHorizontal: -4, zIndex: 1 },
  stepLineActive: { backgroundColor: "#BFDBFE" },

  // Card Common
  card: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  linkText: { color: "#3B82F6", fontWeight: "600", fontSize: 13 },
  rowContainer: { flexDirection: "row", marginBottom: 16 },

  // Map & Route
  mapContainer: { height: 200, borderRadius: 12, overflow: "hidden", marginBottom: 12 },
  floatingProgress: { position: "absolute", bottom: 10, left: 10, right: 10 },
  routeSummary: { marginTop: 4 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  verticalLine: { width: 1, height: 16, backgroundColor: "#E5E7EB", marginLeft: 3.5, marginVertical: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeAddress: { fontSize: 13, color: "#374151", flex: 1, fontWeight: "500" },
  tripCode: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 4 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  routeTextRow: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "80%" },
  routeText: { fontSize: 13, color: "#4B5563", maxWidth: 100 },
  arrow: { color: "#9CA3AF" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  // Analysis Section
  analysisSection: { marginBottom: 16 },
  assignmentStatusBox: { backgroundColor: "#F0F9FF", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#BFDBFE" },
  assignmentRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 8 },
  assignmentItem: { alignItems: "center" },
  assignmentLabel: { fontSize: 11, color: "#1E40AF", fontWeight: "600", marginBottom: 4 },
  assignmentValue: { fontSize: 18, fontWeight: "800", color: "#1E3A8A" },
  recommendationBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#DBEAFE", padding: 8, borderRadius: 8, marginTop: 8 },
  recommendationText: { fontSize: 12, color: "#1E40AF", fontWeight: "600", flex: 1 },
  aiRecommendBox: { backgroundColor: "#FFFBEB", padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#FCD34D" },
  aiTitle: { fontSize: 13, fontWeight: "700", color: "#92400E" },
  aiText: { fontSize: 13, color: "#B45309", lineHeight: 18 },
  statsGrid: { flexDirection: "row", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, marginBottom: 12 },
  statBox: { flex: 1, padding: 12, alignItems: "center" },
  statLabel: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "700", color: "#111827" },

  // Scenario Cards
  scenarioCard: { width: SCREEN_WIDTH * 0.42, backgroundColor: "#FFF", borderRadius: 12, padding: 12, marginRight: 12, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, marginVertical: 4 },
  cardPossible: { borderColor: "#A7F3D0", backgroundColor: "#ECFDF5" },
  cardImpossible: { borderColor: "#FECACA", backgroundColor: "#FEF2F2", opacity: 0.8 },
  scenarioHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  scenarioTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  scenarioSub: { fontSize: 11, color: '#6B7280', marginBottom: 8 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginBottom: 8 },
  metricText: { fontSize: 11, color: '#4B5563', marginBottom: 2 },
  scenarioMessage: { fontSize: 11, color: '#1F2937', marginTop: 6, marginBottom: 4, lineHeight: 16, fontWeight: '500' },
  scenarioNote: { fontSize: 10, color: '#059669', marginTop: 4, fontStyle: 'italic', lineHeight: 14 },
  recommendTag: { position: 'absolute', top: -8, right: 8, backgroundColor: '#2563EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  recommendText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  impossibleTag: { color: '#DC2626', fontSize: 10, fontWeight: '700', marginTop: 4 },

  // Vehicle & Driver
  vehicleImage: { width: "100%", height: 90, borderRadius: 8, backgroundColor: "#E5E7EB", marginBottom: 8 },
  plateNumberBig: { fontSize: 15, fontWeight: "800", color: "#1E40AF", textAlign: "center" },
  vehicleDetail: { fontSize: 11, color: "#6B7280", textAlign: "center" },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#F9FAFB', padding: 6, borderRadius: 8 },
  driverAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  driverAvatarText: { fontSize: 12, fontWeight: '700', color: '#1E40AF' },
  driverName: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  driverRole: { fontSize: 10, color: '#6B7280' },
  dashedBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 8, height: 40, alignItems: 'center', justifyContent: 'center' },
  outlineBtn: { borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignItems: "center" },
  outlineBtnText: { fontSize: 12, color: "#374151", fontWeight: "600" },

  // Goods
  packageRow: { flexDirection: 'row', marginBottom: 12, borderBottomWidth: 1, borderColor: '#F3F4F6', paddingBottom: 12 },
  packageIcon: { width: 32, height: 32, backgroundColor: '#F3F4F6', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  pkgCode: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  pkgDetail: { fontSize: 12, color: '#6B7280', marginBottom: 4 },

  // Docs
  docRowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  docIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  docName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  docStatus: { fontSize: 12, color: '#6B7280' },

  // Warning Banner
  warningBanner: { backgroundColor: "#FEF3C7", borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: "row", borderLeftWidth: 4, borderLeftColor: "#F59E0B", shadowColor: "#F59E0B", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  warningIconContainer: { marginRight: 12, alignItems: "center", justifyContent: "flex-start" },
  warningIcon: { fontSize: 24 },
  warningContent: { flex: 1 },
  warningTitle: { fontSize: 16, fontWeight: "700", color: "#92400E", marginBottom: 4 },
  warningText: { fontSize: 14, color: "#78350F", lineHeight: 20 },

  // Bottom Bar
  bottomBar: { position: "absolute", bottom: 20, left: 16, right: 16, zIndex: 100 },
  confirmBtn: { backgroundColor: "#10B981", paddingVertical: 14, borderRadius: 12, alignItems: "center", shadowColor: "#10B981", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 4 },
  confirmBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },

  // Empty State
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, fontStyle: 'italic', marginTop: 10 },

  // Modal Styles (Keeping existing styles for modals)
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalPaper: { width: "100%", height: "90%", backgroundColor: "#FFFFFF", borderRadius: 8, overflow: "hidden" },
  paperCloseBtn: { position: "absolute", top: 10, right: 10, zIndex: 10, backgroundColor: "#F3F4F6", width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  paperCloseText: { fontSize: 20, fontWeight: "bold", color: "#6B7280", marginTop: -2 },
  paperScroll: { flex: 1 },
  paperContent: { padding: 20 },
  paperFooter: { padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB", flexDirection: "row", gap: 12, backgroundColor: "#F9FAFB" },

  // Doc Styling within Modal
  docHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  docHeaderLeft: { width: "40%", alignItems: "center" },
  docLogo: { width: 50, height: 50, marginBottom: 4 },
  docCompany: { fontSize: 9, fontWeight: "bold", textAlign: "center", color: "#1F2937" },
  docHeaderRight: { width: "58%", alignItems: "center" },
  docNational: { fontSize: 10, fontWeight: "bold", textTransform: "uppercase", textAlign: "center" },
  docMotto: { fontSize: 11, fontWeight: "bold", textDecorationLine: "underline", textAlign: "center", marginTop: 2 },
  docLine: { height: 1, width: "50%", backgroundColor: "#000", marginTop: 4 },
  docTitleSection: { alignItems: "center", marginBottom: 16 },
  docTitleMain: { fontSize: 18, fontWeight: "900", color: "#111827", textTransform: "uppercase", textAlign: "center", marginBottom: 4 },
  docNumber: { fontSize: 12, fontWeight: "bold", color: "#374151" },
  docDate: { fontSize: 12, fontStyle: "italic", color: "#4B5563", marginTop: 2 },
  docPartySection: { marginBottom: 16 },
  docPartyTitle: { fontSize: 13, fontWeight: "bold", textDecorationLine: "underline", color: "#000", marginBottom: 6 },
  docRow: { flexDirection: "row", marginBottom: 4 },
  docLabel: { width: 100, fontSize: 13, color: "#4B5563" },
  docValue: { flex: 1, fontSize: 13, fontWeight: "600", color: "#111827" },
  docTermsSection: { marginBottom: 20, padding: 10, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB" },
  docText: { fontSize: 13, lineHeight: 20, color: "#374151" },
  docSignatureSection: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, marginBottom: 30 },
  docSigBlock: { width: "48%", alignItems: "center" },
  docSigTitle: { fontSize: 12, fontWeight: "bold", textTransform: "uppercase" },
  docSigSub: { fontSize: 10, fontStyle: "italic", color: "#6B7280", marginBottom: 8 },
  docSigBox: { width: "100%", height: 80, borderWidth: 1, borderColor: "#D1D5DB", borderStyle: "dashed", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  docSigName: { fontSize: 12, fontWeight: "bold", textTransform: "uppercase", textAlign: "center" },

  // Buttons
  actionBtnSecondary: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: "#F3F4F6", alignItems: "center", flexDirection: "row", justifyContent: "center" },
  actionBtnPrimary: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: "#2563EB", alignItems: "center", flexDirection: "row", justifyContent: "center" },
  actionBtnTextSec: { fontWeight: "600", color: "#374151" },
  actionBtnTextPri: { fontWeight: "600", color: "#FFF" },
  signedStamp: { borderWidth: 2, borderColor: "#059669", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, transform: [{ rotate: "-10deg" }], alignItems: "center" },
  signedText: { color: "#059669", fontWeight: "900", fontSize: 14, textTransform: "uppercase" },
  pendingText: { color: "#9CA3AF", fontStyle: "italic" },
  contractActions: { flexDirection: "row", gap: 10 },
  completedSign: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#ECFDF5", padding: 10, borderRadius: 8 },

  // OTP Modal
  modalCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 20 },
  otpModalTitle: { fontSize: 20, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 12 },
  otpModalSubtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 24 },
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  otpInputContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  otpInput: { fontSize: 20, fontWeight: "800", color: "#111827", padding: 0, height: 50, width: 40, textAlign: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
  otpBox: { width: 44, height: 52, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFF", justifyContent: "center", alignItems: "center" },
  otpModalButtons: { flexDirection: "row", gap: 12 },
});

export default TripDetailScreen;