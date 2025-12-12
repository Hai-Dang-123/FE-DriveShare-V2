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
import tripSurchargeService, { SurchargeType } from "@/services/tripSurchargeService";
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
import HandoverChecklistEditor, { HandoverChecklistFormData } from "@/components/shared/HandoverChecklistEditor";

const SCREEN_WIDTH = Dimensions.get('window').width;

// --- ENUMS ---
// VehicleIssueType enum matching backend
type VehicleIssueType = 
  // Ngoại thất (Bodywork)
  | 'SCRATCH'       // Trầy xước
  | 'DENT'          // Móp méo
  | 'CRACK'         // Nứt/Vỡ (Kính, đèn, gương)
  | 'PAINT_PEELING' // Tróc sơn
  // Vệ sinh (Cleanliness)
  | 'DIRTY'         // Dơ bẩn/Cần vệ sinh
  | 'ODOR'          // Có mùi hôi
  // Vận hành & Kỹ thuật (Mechanical)
  | 'MECHANICAL'    // Lỗi động cơ/Máy móc
  | 'ELECTRICAL'    // Lỗi hệ thống điện
  | 'TIRE'          // Lỗi lốp xe
  // Tài sản (Inventory)
  | 'MISSING_ITEM'  // Mất phụ kiện/Giấy tờ
  // Khác
  | 'OTHER';        // Khác

// --- CROSS-PLATFORM ALERT HELPER ---
const showAlertCrossPlatform = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`${title}\n${message}`);
    if (confirmed && onOk) onOk();
  } else {
    Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
  }
};

// --- HELPER: GET ISSUE TYPE LABEL ---
const getIssueTypeLabel = (type: VehicleIssueType): string => {
  const labels: Record<VehicleIssueType, string> = {
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

// --- COMPONENT: STEPPER TIẾN TRÌNH ---
const TripStepper = ({ status }: { status: string }) => {
  let currentStep = 1;
  if (['CREATED', 'PENDING', 'AWAITING_OWNER_CONTRACT'].includes(status)) currentStep = 1;
  else if (['AWAITING_DRIVER','PENDING_DRIVER_ASSIGNMENT', 'DONE_ASSIGNING_DRIVER'].includes(status)) currentStep = 2;
  else if (['READY_FOR_VEHICLE_HANDOVER', 'VEHICLE_HANDOVERED', 'MOVING_TO_PICKUP', 'VEHICLE_RETURNED','VEHICLE_RETURNING'].includes(status)) currentStep = 3;
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
  const [loadingProviderContract, setLoadingProviderContract] = useState(false);
  const [providerContractDetail, setProviderContractDetail] = useState<any | null>(null);

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

  // Edit Checklist - using new HandoverChecklistEditor component
  const [showHandoverEditor, setShowHandoverEditor] = useState(false);
  
  // Issue reporting states
  const [showIssuesPanel, setShowIssuesPanel] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueType, setIssueType] = useState<VehicleIssueType>('SCRATCH');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueImage, setIssueImage] = useState<File | string | null>(null);
  const [submittingIssue, setSubmittingIssue] = useState(false);
  
  // Surcharge/Compensation states for handover issues
  const [showSurchargeModal, setShowSurchargeModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [surchargeAmount, setSurchargeAmount] = useState('');
  const [surchargeDescription, setSurchargeDescription] = useState('');
  const [submittingSurcharge, setSubmittingSurcharge] = useState(false);

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
      showAlertCrossPlatform("Lỗi", "Không thể tải dữ liệu chuyến đi");
    } finally {
      setLoading(false);
    }
  };

  // --- Helper Functions ---
  const openProviderContractModal = async (contractId?: string) => {
    if (!contractId) return showAlertCrossPlatform("Thông báo", "Không có hợp đồng để xem");
    setLoadingProviderContract(true);
    try {
      const res: any = await tripProviderContractService.getById(contractId);
      if (res?.isSuccess && res.result) {
        setProviderContractDetail(res.result);
        setShowContractModal(true);
      } else {
        showAlertCrossPlatform("Lỗi", res?.message || "Không thể tải hợp đồng");
      }
    } catch (e: any) {
      showAlertCrossPlatform("Lỗi", e?.message || "Không thể tải hợp đồng");
    } finally {
      setLoadingProviderContract(false);
    }
  };

  const openDriverContractModal = async (contractId?: string) => {
    if (!tripId || !contractId) return showAlertCrossPlatform("Thông báo", "Không có hợp đồng để xem");
    setLoadingDriverContract(true);
    try {
      const res: any = await tripService.getById(tripId);
      if (res?.isSuccess && res.result) {
        const found = (res.result.driverContracts || []).find((c: any) => String(c.contractId) === String(contractId));
        if (!found) return showAlertCrossPlatform("Thông báo", "Không tìm thấy hợp đồng");
        setActiveDriverContract(found);
        setShowDriverContractModal(true);
      }
    } catch (e: any) { showAlertCrossPlatform("Lỗi", e?.message || "Không thể tải hợp đồng"); } finally { setLoadingDriverContract(false); }
  };

  const openDeliveryRecordModal = async (recordId?: string) => {
    if (!recordId) return showAlertCrossPlatform("Thông báo", "Không có biên bản");
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
      } else showAlertCrossPlatform("Lỗi", res?.message || "Không thể tải biên bản");
    } catch (e: any) { showAlertCrossPlatform("Lỗi", e?.message || "Không thể tải biên bản"); } finally { setLoadingDeliveryRecord(false); }
  };

  const openVehicleHandoverModal = async (recordId?: string) => {
    if (!recordId) return showAlertCrossPlatform("Thông báo", "Không có biên bản giao xe");
    setLoadingHandoverRecord(true);
    try {
      const res: any = await tripService.getVehicleHandoverRecord(recordId);
      if (res?.isSuccess && res?.result) {
        const record = res.result;
        if (record.termResults && Array.isArray(record.termResults)) {
          // Map for editing UI (used by HandoverChecklistEditor)
          record.terms = record.termResults.map((term: any, index: number) => ({
            tripVehicleHandoverTermResultId: term.tripVehicleHandoverTermResultId,
            vehicleHandoverTermId: term.tripVehicleHandoverTermResultId || term.termId || `term-${index}`,
            content: term.termContent || "",
            isChecked: term.isPassed || false,
            deviation: term.note || "",
            displayOrder: index,
          }));
          // Keep termResults intact with all original fields for editing
          record.termResults = record.termResults.map((term: any) => ({
            tripVehicleHandoverTermResultId: term.tripVehicleHandoverTermResultId,
            termContent: term.termContent || "",
            isPassed: term.isPassed !== undefined ? term.isPassed : false,
            note: term.note || "",
            evidenceImageUrl: term.evidenceImageUrl || null,
            // Also add fields for document display
            termResultId: term.tripVehicleHandoverTermResultId,
            isOk: term.isPassed !== undefined ? term.isPassed : false,
          }));
        } else { record.terms = []; }
        
        // Map issues to ensure correct field names
        if (record.issues && Array.isArray(record.issues)) {
          record.issues = record.issues.map((issue: any) => ({
            vehicleHandoverIssueId: issue.vehicleHandoverIssueId || issue.tripVehicleHandoverIssueId,
            tripVehicleHandoverIssueId: issue.tripVehicleHandoverIssueId || issue.vehicleHandoverIssueId,
            issueType: issue.issueType || 'OTHER',
            description: issue.description || '',
            status: issue.status || 'REPORTED',
            severity: issue.severity || 'MEDIUM',
            estimatedCompensationAmount: issue.estimatedCompensationAmount || null,
            imageUrls: issue.imageUrls || [],
            surcharges: issue.surcharges || [],
          }));
        } else {
          record.issues = [];
        }
        
        // Map surcharges from root level
        if (record.surcharges && Array.isArray(record.surcharges)) {
          record.surcharges = record.surcharges.map((surcharge: any) => ({
            tripSurchargeId: surcharge.tripSurchargeId,
            type: surcharge.type || 'OTHER',
            amount: surcharge.amount || 0,
            description: surcharge.description || '',
            status: surcharge.status || 'PENDING',
          }));
        } else {
          record.surcharges = [];
        }
        
        setActiveHandoverRecord(record);
        setShowHandoverModal(true);
      } else { showAlertCrossPlatform("Lỗi", res?.message || "Không thể tải biên bản"); }
    } catch (e: any) { showAlertCrossPlatform("Lỗi", e?.message || "Không thể tải biên bản"); } finally { setLoadingHandoverRecord(false); }
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
        showAlertCrossPlatform("Thành công", "Đã xác nhận đủ tài xế.");
        await fetchTrip(tripId);
      } catch (e: any) { showAlertCrossPlatform("Lỗi", e?.message); } finally { setConfirmingDrivers(false); }
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
            showAlertCrossPlatform("Thành công", "Đã xác nhận đủ tài xế.");
            await fetchTrip(tripId);
          } catch (e: any) { showAlertCrossPlatform("Lỗi", e?.message); } finally { setConfirmingDrivers(false); }
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
        showAlertCrossPlatform("Thành công", "Chuyến đi đã được hoàn tất");
        await fetchTrip(tripId);
      } catch (e: any) { showAlertCrossPlatform("Lỗi", e?.message); } finally { setConfirmingCompletion(false); }
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
            showAlertCrossPlatform("Thành công", "Chuyến đi đã được hoàn tất");
            await fetchTrip(tripId);
          } catch (e: any) { showAlertCrossPlatform("Lỗi", e?.message); } finally { setConfirmingCompletion(false); }
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
        showAlertCrossPlatform("Thành công", "Hành trình đã được hoàn tất");
        await fetchTrip(tripId);
      } catch (e: any) { showAlertCrossPlatform("Lỗi", e?.message); } finally { setConfirmingTripCompletion(false); }
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
            showAlertCrossPlatform("Thành công", "Hành trình đã được hoàn tất");
            await fetchTrip(tripId);
          } catch (e: any) { showAlertCrossPlatform("Lỗi", e?.message); } finally { setConfirmingTripCompletion(false); }
        }
      },
    ]);
  };

  const handleSignContract = async () => {
    const contractId = providerContractDetail?.contract?.contractId || trip?.providerContracts?.contractId;
    if (!contractId) return;
    setSigning(true);
    try {
      const res: any = await tripProviderContractService.sendSignOtp(contractId);
      if (res?.isSuccess) {
        setOtpDigits(Array(6).fill(""));
        setShowOtpModal(true);
        setTimeout(() => otpInputsRef.current?.[0]?.focus?.(), 200);
      } else { showAlertCrossPlatform("Lỗi", res?.message); }
    } catch (e: any) { showAlertCrossPlatform("Lỗi", e?.message); } finally { setSigning(false); }
  };

  const submitOtp = async () => {
    const otp = otpDigits.join("");
    if (otp.length < 6) return showAlertCrossPlatform("OTP", "Vui lòng nhập đủ 6 số");
    const contractId = providerContractDetail?.contract?.contractId || trip?.providerContracts?.contractId;
    if (!contractId) return showAlertCrossPlatform("Lỗi", "Không tìm thấy hợp đồng");
    setOtpLoading(true);
    try {
      const res: any = await tripProviderContractService.signContract({ ContractId: contractId, Otp: otp });
      if (res?.isSuccess) {
        showAlertCrossPlatform("Thành công", "Ký hợp đồng thành công");
        setShowOtpModal(false); setShowContractModal(false); fetchTrip(tripId);
      } else { showAlertCrossPlatform("Lỗi", res?.message); }
    } catch (e: any) { showAlertCrossPlatform("Lỗi", e?.message); } finally { setOtpLoading(false); }
  };

  const resendOtp = async () => {
    const contractId = providerContractDetail?.contract?.contractId || trip?.providerContracts?.contractId;
    if (!contractId) return;
    try {
      const res: any = await tripProviderContractService.sendSignOtp(contractId);
      if (res?.isSuccess) { showAlertCrossPlatform("Đã gửi", "OTP đã được gửi lại"); }
    } catch (e) { }
  };

  const openDriverContractPdf = async (contractId: any) => {
    if (!contractId) return;
    try { const res: any = await tripService.getDriverContractPdfLink(contractId); if (res?.result) Linking.openURL(res.result); } catch (e) { showAlertCrossPlatform("Lỗi", "Không mở được PDF"); }
  };
  const openDeliveryRecordPdf = async (recordId: any) => {
    if (!recordId) return;
    try { const res: any = await tripService.getDeliveryRecordPdfLink(recordId); if (res?.result) Linking.openURL(res.result); } catch (e) { showAlertCrossPlatform("Lỗi", "Không mở được PDF"); }
  };
  const openVehicleHandoverPdf = async (recordId: any) => {
    if (!recordId) return;
    try { const res: any = await tripService.getVehicleHandoverPdfLink(recordId); if (res?.result) Linking.openURL(res.result); } catch (e) { showAlertCrossPlatform("Lỗi", "Không mở được PDF"); }
  };

  // Handover Editor handlers
  const handleOpenHandoverEditor = () => {
    if (activeHandoverRecord) {
      console.log('📝 Opening editor with termResults:', activeHandoverRecord.termResults);
    }
    setShowHandoverEditor(true);
  };

  const handleSaveHandoverChecklist = async (formData: any) => {
    try {
      console.log('📋 FormData received:', formData);
      console.log('📋 ChecklistItems:', formData.checklistItems);
      console.log('📋 RecordId:', formData.recordId);
      formData.checklistItems.forEach((item: any, idx: number) => {
        console.log(`📋 Item ${idx}:`, JSON.stringify(item, null, 2));
        console.log(`📋 Item ${idx} tripVehicleHandoverTermResultId:`, item.tripVehicleHandoverTermResultId);
      });
      
      const res: any = await tripService.updateVehicleHandoverChecklist({
        RecordId: formData.recordId,
        CurrentOdometer: formData.currentOdometer,
        FuelLevel: formData.fuelLevel,
        IsEngineLightOn: formData.isEngineLightOn,
        Notes: formData.notes,
        ChecklistItems: formData.checklistItems.map((item: any) => {
          console.log('📋 Mapping item:', item);
          const termResultId = item.tripVehicleHandoverTermResultId || item.vehicleHandoverTermId || item.id;
          if (!termResultId) {
            console.error('❌ Missing term result ID:', item);
            throw new Error('Missing TripVehicleHandoverTermResultId for checklist item');
          }
          return {
            TripVehicleHandoverTermResultId: termResultId,
            IsPassed: item.isPassed,
            Note: item.note || "",
            EvidenceImage: item.evidenceImage,
          };
        })
      });
      
      if (res?.isSuccess) {
        showAlertCrossPlatform("Thành công", "Đã cập nhật biên bản giao nhận xe");
        setShowHandoverEditor(false);
        fetchTrip(tripId); // Refresh trip data
      } else {
        showAlertCrossPlatform("Lỗi", res?.message || "Không thể cập nhật biên bản");
      }
    } catch (e: any) {
      console.error("Save handover checklist error:", e);
      showAlertCrossPlatform("Lỗi", "Có lỗi xảy ra khi cập nhật biên bản");
      throw e;
    }
  };

  const sendOtpForSigning = async () => {
    setSendingHandoverOtp(true);
    try {
      const res: any = await tripService.sendVehicleHandoverOtp(activeHandoverRecord.tripVehicleHandoverRecordId);
      if (res?.isSuccess) { setShowHandoverOtpModal(true); } else showAlertCrossPlatform("Lỗi", res?.message);
    } catch (e) { } finally { setSendingHandoverOtp(false); }
  };

  const submitOtpSignature = async () => {
    setHandoverOtpLoading(true);
    try {
      const res: any = await tripService.signVehicleHandoverRecord({ RecordId: activeHandoverRecord.tripVehicleHandoverRecordId, Otp: handoverOtpDigits.join("") });
      if (res?.isSuccess) { showAlertCrossPlatform("Thành công", "Đã ký"); setShowHandoverOtpModal(false); openVehicleHandoverModal(activeHandoverRecord.tripVehicleHandoverRecordId); fetchTrip(tripId); }
      else showAlertCrossPlatform("Lỗi", res?.message);
    } catch (e) { } finally { setHandoverOtpLoading(false); }
  };

  const handleSimulationUpdate = (feature: any) => {
    if (feature.properties && typeof feature.properties.nearestIndex === "number" && routeCoords) {
      setSimulatedProgressIndex(feature.properties.nearestIndex);
    }
  };
  const toggleSimulation = () => {
    setSimulationActive(!simulationActive);
    if (!simulationActive) showAlertCrossPlatform("Demo Mode", "Đã bật chế độ mô phỏng.");
  };
  const currentDistance = useMemo(() => {
    if (!trip?.tripRoute?.distanceKm || !routeCoords) return 0;
    const total = routeCoords.length;
    if (total === 0) return 0;
    return (simulatedProgressIndex / total) * trip.tripRoute.distanceKm;
  }, [simulatedProgressIndex, trip?.tripRoute?.distanceKm, routeCoords]);

  const displaySurchargeAmount = useMemo(() => {
    if (!surchargeAmount) return '';
    const num = parseFloat(surchargeAmount);
    return isNaN(num) ? '' : num.toLocaleString('vi-VN');
  }, [surchargeAmount]);

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

  const handleOpenIssueModal = () => {
    setIssueType('SCRATCH');
    setIssueDescription('');
    setIssueImage(null);
    setShowIssueModal(true);
  };

  const handleSubmitIssue = async () => {
    if (!activeHandoverRecord || !trip) return;
    
    if (!issueDescription.trim()) {
      showAlertCrossPlatform('Lỗi', 'Vui lòng nhập mô tả sự cố');
      return;
    }

    if (!issueImage) {
      showAlertCrossPlatform('Lỗi', 'Vui lòng chọn ảnh minh chứng');
      return;
    }

    setSubmittingIssue(true);
    try {
      const formData = new FormData();
      formData.append('RecordId', activeHandoverRecord.tripVehicleHandoverRecordId);
      formData.append('IssueType', issueType);
      formData.append('Description', issueDescription.trim());
      
      if (issueImage instanceof File) {
        formData.append('Image', issueImage);
      } else if (typeof issueImage === 'string') {
        const response = await fetch(issueImage);
        const blob = await response.blob();
        formData.append('Image', blob, 'issue.jpg');
      }

      const res = await tripService.reportHandoverIssue(formData);
      
      if (res.isSuccess) {
        const newIssueId = res.result?.issueId;
        showAlertCrossPlatform('Thành công', 'Đã báo cáo sự cố. Bạn có muốn tạo phiếu thu bồi thường?', () => {
          setShowIssueModal(false);
          // Reload record to get new issue
          openVehicleHandoverModal(activeHandoverRecord.tripVehicleHandoverRecordId).then(() => {
            // Find the new issue and open surcharge modal
            if (newIssueId && activeHandoverRecord.issues) {
              const issue = activeHandoverRecord.issues.find((i: any) => i.vehicleHandoverIssueId === newIssueId);
              if (issue) {
                handleOpenSurchargeModal(issue);
              }
            }
          });
        });
      } else {
        showAlertCrossPlatform('Lỗi', res.message || 'Không thể báo cáo sự cố');
      }
    } catch (error: any) {
      showAlertCrossPlatform('Lỗi', error?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmittingIssue(false);
    }
  };

  const handleOpenSurchargeModal = (issue: any) => {
    setSelectedIssue(issue);
    setSurchargeAmount('');
    setSurchargeDescription('');
    setShowSurchargeModal(true);
  };

  const handleSubmitSurcharge = async () => {
    if (!selectedIssue || !trip) return;
    
    const amount = parseFloat(surchargeAmount);
    if (!surchargeAmount || isNaN(amount) || amount <= 0) {
      showAlertCrossPlatform('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }
    
    if (!surchargeDescription.trim()) {
      showAlertCrossPlatform('Lỗi', 'Vui lòng nhập lý do bồi thường');
      return;
    }

    setSubmittingSurcharge(true);
    try {
      // Map issue severity to surcharge type
      const surchargeTypeMap: Record<string, SurchargeType> = {
        'HIGH': SurchargeType.VEHICLE_DAMAGE,
        'MEDIUM': SurchargeType.VEHICLE_DAMAGE,
        'LOW': SurchargeType.CLEANING,
      };

      const dto = {
        TripId: trip.tripId,
        Type: surchargeTypeMap[selectedIssue.severity] || SurchargeType.VEHICLE_DAMAGE,
        Amount: amount,
        Description: surchargeDescription.trim(),
        TripVehicleHandoverIssueId: selectedIssue.vehicleHandoverIssueId,
      };

      const res = await tripSurchargeService.createByOwner(dto);
      
      if (res.isSuccess) {
        showAlertCrossPlatform('Thành công', `Đã tạo phiếu thu ${amount.toLocaleString('vi-VN')} VNĐ`);
        setShowSurchargeModal(false);
        // Reload handover record to show updated surcharges
        if (activeHandoverRecord?.tripVehicleHandoverRecordId) {
          await openVehicleHandoverModal(activeHandoverRecord.tripVehicleHandoverRecordId);
        }
      } else {
        showAlertCrossPlatform('Lỗi', res.message || 'Không thể tạo phiếu thu');
      }
    } catch (error: any) {
      showAlertCrossPlatform('Lỗi', error?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmittingSurcharge(false);
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
                {/* Trip Distance & Duration Info */}
                {driverAnalysis.suggestion && (
                  <View style={styles.tripInfoContainer}>
                    <View style={styles.tripInfoItem}>
                      <MaterialCommunityIcons name="map-marker-distance" size={18} color="#0284C7" />
                      <Text style={styles.tripInfoLabel}>Khoảng cách</Text>
                      <Text style={styles.tripInfoValue}>{driverAnalysis.suggestion.distanceKm?.toFixed(1) || 0} km</Text>
                    </View>
                    <View style={styles.tripInfoItem}>
                      <MaterialCommunityIcons name="clock-outline" size={18} color="#0284C7" />
                      <Text style={styles.tripInfoLabel}>Thời gian ước tính</Text>
                      <Text style={styles.tripInfoValue}>{driverAnalysis.suggestion.estimatedDurationHours?.toFixed(1) || 0} giờ</Text>
                    </View>
                    <View style={styles.tripInfoItem}>
                      <MaterialCommunityIcons name="steering" size={18} color="#0284C7" />
                      <Text style={styles.tripInfoLabel}>Giờ lái yêu cầu</Text>
                      <Text style={styles.tripInfoValue}>{driverAnalysis.suggestion.requiredHoursFromQuota?.toFixed(1) || 0} giờ</Text>
                    </View>
                  </View>
                )}

                {/* AI Recommendation */}
                {driverAnalysis.suggestion?.systemRecommendation && (
                  <View style={styles.aiRecommendBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <MaterialCommunityIcons name="robot-outline" size={20} color="#D97706" style={{ marginRight: 6 }} />
                      <Text style={styles.aiTitle}>Đề xuất từ AI System</Text>
                    </View>
                    <Text style={styles.aiText}>
                      {driverAnalysis.suggestion.systemRecommendation === 'SOLO' ? '1 Tài xế (Solo)' : 
                       driverAnalysis.suggestion.systemRecommendation === 'TEAM' ? '2 Tài xế (Team)' : 
                       '3 Tài xế (Express)'}
                    </Text>
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
                    <Text style={styles.metricText}>⏱ {driverAnalysis.suggestion?.soloScenario?.totalElapsedHours?.toFixed(1) || 0}h tổng</Text>
                    <Text style={styles.metricText}>👤 {driverAnalysis.suggestion?.soloScenario?.drivingHoursPerDriver?.toFixed(1) || 0}h/tài</Text>
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
                    <Text style={styles.metricText}>⏱ {driverAnalysis.suggestion?.teamScenario?.totalElapsedHours?.toFixed(1) || 0}h tổng</Text>
                    <Text style={styles.metricText}>👤 {driverAnalysis.suggestion?.teamScenario?.drivingHoursPerDriver?.toFixed(1) || 0}h/tài</Text>
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
                    <Text style={styles.metricText}>⏱ {driverAnalysis.suggestion?.expressScenario?.totalElapsedHours?.toFixed(1) || 0}h tổng</Text>
                    <Text style={styles.metricText}>👤 {driverAnalysis.suggestion?.expressScenario?.drivingHoursPerDriver?.toFixed(1) || 0}h/tài</Text>
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
                    <View key={idx} style={styles.driverDetailCard}>
                      {/* Header */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <View style={styles.driverAvatar}>
                          <Text style={styles.driverAvatarText}>{d.fullName.charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.driverName}>{d.fullName}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[styles.badge, d.type === "PRIMARY" ? { backgroundColor: '#DBEAFE' } : { backgroundColor: '#FEF3C7' }]}>
                              <Text style={[styles.badgeText, d.type === "PRIMARY" ? { color: '#1E40AF' } : { color: '#92400E' }]}>
                                {d.type === "PRIMARY" ? "Chính" : "Phụ"}
                              </Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: d.assignmentStatus === 'COMPLETED' ? '#D1FAE5' : '#FEE2E2' }]}>
                              <Text style={[styles.badgeText, { color: d.assignmentStatus === 'COMPLETED' ? '#065F46' : '#991B1B' }]}>
                                {d.assignmentStatus}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Payment Info */}
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>💰 Lương cơ bản:</Text>
                        <Text style={styles.infoValue}>{d.baseAmount.toLocaleString('vi-VN')} đ</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>🔒 Đặt cọc:</Text>
                        <Text style={[styles.infoValue, { color: d.depositStatus === 'DEPOSITED' ? '#059669' : '#DC2626' }]}>
                          {d.depositAmount.toLocaleString('vi-VN')} đ ({d.depositStatus})
                        </Text>
                      </View>

                      {/* Check-in Info */}
                      {d.isOnBoard && (
                        <View style={[styles.statusSection, { backgroundColor: '#ECFDF5', borderLeftColor: '#10B981' }]}>
                          <Text style={[styles.statusTitle, { color: '#065F46' }]}>✅ Đã Check-in</Text>
                          {d.onBoardTime && (
                            <Text style={styles.infoDetail}>🕐 {new Date(d.onBoardTime).toLocaleString('vi-VN')}</Text>
                          )}
                          {d.onBoardLocation && (
                            <Text style={styles.infoDetail} numberOfLines={2}>📍 {d.onBoardLocation}</Text>
                          )}
                          {d.onBoardImage && (
                            <Image source={{ uri: d.onBoardImage }} style={styles.evidenceImage} />
                          )}
                        </View>
                      )}

                      {/* Check-out Info */}
                      {d.isFinished && (
                        <View style={[styles.statusSection, { backgroundColor: '#F0F9FF', borderLeftColor: '#3B82F6' }]}>
                          <Text style={[styles.statusTitle, { color: '#1E40AF' }]}>🏁 Đã Check-out</Text>
                          {d.offBoardTime && (
                            <Text style={styles.infoDetail}>🕐 {new Date(d.offBoardTime).toLocaleString('vi-VN')}</Text>
                          )}
                          {d.offBoardLocation && (
                            <Text style={styles.infoDetail} numberOfLines={2}>📍 {d.offBoardLocation}</Text>
                          )}
                          {d.offBoardImage && (
                            <Image source={{ uri: d.offBoardImage }} style={styles.evidenceImage} />
                          )}
                        </View>
                      )}

                      {/* Addresses */}
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>🚩 Điểm đón:</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{d.startAddress || 'N/A'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>🏁 Điểm trả:</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{d.endAddress || 'N/A'}</Text>
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
                <TouchableOpacity style={styles.docRowItem} onPress={() => openProviderContractModal(trip.providerContracts.contractId)} disabled={loadingProviderContract}>
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
              {loadingProviderContract ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text style={{ marginTop: 10, color: '#6B7280' }}>Đang tải hợp đồng...</Text>
                </View>
              ) : providerContractDetail?.contract ? (
                <ContractDocument
                  contractCode={providerContractDetail.contract.contractCode}
                  contractType="PROVIDER_CONTRACT"
                  contractValue={providerContractDetail.contract.contractValue}
                  currency={providerContractDetail.contract.currency}
                  effectiveDate={providerContractDetail.contract.effectiveDate || ""}
                  terms={providerContractDetail.terms || []}
                  ownerName={providerContractDetail.contract.partyA?.fullName || ''}
                  ownerCompany={providerContractDetail.contract.partyA?.companyName}
                  ownerTaxCode={providerContractDetail.contract.partyA?.taxCode}
                  counterpartyName={providerContractDetail.contract.partyB?.companyName || providerContractDetail.contract.partyB?.fullName || ''}
                  ownerSigned={providerContractDetail.contract.ownerSigned ?? false}
                  ownerSignAt={providerContractDetail.contract.ownerSignAt ?? null}
                  counterpartySigned={providerContractDetail.contract.providerSigned ?? false}
                  counterpartySignAt={providerContractDetail.contract.providerSignAt ?? null}
                  tripCode={providerContractDetail.contract.tripCode}
                  vehiclePlate={trip.vehicle?.plateNumber}
                  startAddress={trip.shippingRoute?.startAddress}
                  endAddress={trip.shippingRoute?.endAddress}
                />
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#6B7280' }}>Không có dữ liệu hợp đồng</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.paperFooter}>
              <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => Linking.openURL(providerContractDetail?.contract?.fileURL || trip.providerContracts?.fileURL || '')} disabled={!providerContractDetail?.contract?.fileURL && !trip.providerContracts?.fileURL}><Text style={styles.actionBtnTextSec}>Tải PDF</Text></TouchableOpacity>
              {canSign && providerContractDetail?.contract && <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleSignContract}><Text style={styles.actionBtnTextPri}>Ký xác nhận</Text></TouchableOpacity>}
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Modal Driver Assign */}
      <DriverAssignModal visible={showDriverModal} onClose={() => setShowDriverModal(false)} trip={trip} tripId={trip.tripId} mainDriverExists={hasMainDriver} onAssigned={(u) => { setTrip(u); fetchTrip(tripId); }} driverAnalysis={driverAnalysis} />

      {/* 3. Modal Create Post */}
      <CreatePostTripModal visible={showCreatePostModal} onClose={() => setShowCreatePostModal(false)} tripId={trip.tripId} onCreated={() => { showAlertCrossPlatform("Thành công", "Đã tạo bài đăng"); fetchTrip(tripId); }} driverAnalysis={driverAnalysis} />

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
                <DeliveryRecordDocument data={activeDeliveryRecord} />
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
            
            {/* Loading Overlay khi đang gửi OTP */}
            {sendingHandoverOtp && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#10439F" />
                  <Text style={styles.loadingText}>Đang gửi OTP...</Text>
                </View>
              </View>
            )}
            
            <ScrollView style={styles.paperScroll}>
              {activeHandoverRecord && (
                <>
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
                  
                  {/* Button to open Issues Panel - Only show for RETURN type */}
                  {activeHandoverRecord.type === 'RETURN' && (
                    <TouchableOpacity 
                      style={styles.btnViewIssues}
                      onPress={() => setShowIssuesPanel(true)}
                    >
                      <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#DC2626" />
                      <Text style={styles.btnViewIssuesText}>
                        🛠️ Xem sự cố & bồi thường ({activeHandoverRecord.issues?.length || 0})
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
            <View style={styles.paperFooter}>
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
                          {!driverHasSigned && !ownerHasSigned && canEditOrSign && (
                            <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1 }]} onPress={handleOpenHandoverEditor}>
                              <Text style={styles.actionBtnTextSec}>✏️ Sửa</Text>
                            </TouchableOpacity>
                          )}
                          
                          <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1 }]} onPress={() => openVehicleHandoverPdf(activeHandoverRecord?.tripVehicleHandoverRecordId)}>
                            <Text style={styles.actionBtnTextSec}>📄 PDF</Text>
                          </TouchableOpacity>
                          
                          {/* Sign Button - Show only after driver has signed AND trip status is VEHICLE_HANDOVERED */}
                          {driverHasSigned && !ownerHasSigned && canEditOrSign && (
                            <TouchableOpacity 
                              style={[styles.actionBtnPrimary, { flex: 1 }]} 
                              onPress={sendOtpForSigning}
                              disabled={sendingHandoverOtp}
                            >
                              {sendingHandoverOtp ? (
                                <ActivityIndicator size="small" color="#FFF" />
                              ) : (
                                <Text style={styles.actionBtnTextPri}>Ký biên bản</Text>
                              )}
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
                            <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1 }]} onPress={handleOpenHandoverEditor}>
                              <Text style={styles.actionBtnTextSec}>✏️ Sửa</Text>
                            </TouchableOpacity>
                          )}
                          
                          <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1 }]} onPress={() => openVehicleHandoverPdf(activeHandoverRecord?.tripVehicleHandoverRecordId)}>
                            <Text style={styles.actionBtnTextSec}>📄 PDF</Text>
                          </TouchableOpacity>
                          
                          {/* Sign Button - Show if owner hasn't signed yet */}
                          {!ownerHasSigned && (
                            <TouchableOpacity 
                              style={[styles.actionBtnPrimary, { flex: 1 }]} 
                              onPress={sendOtpForSigning}
                              disabled={sendingHandoverOtp}
                            >
                              {sendingHandoverOtp ? (
                                <ActivityIndicator size="small" color="#FFF" />
                              ) : (
                                <Text style={styles.actionBtnTextPri}>Ký biên bản</Text>
                              )}
                            </TouchableOpacity>
                          )}
                        </>
                      );
                    }
                  })()}
            </View>
          </View>
        </View>
      </Modal>

      {/* 8. Issues Panel Modal */}
      <Modal visible={showIssuesPanel} transparent animationType="slide" onRequestClose={() => setShowIssuesPanel(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.issuesPanelContainer}>
            {/* Header */}
            <View style={styles.issuesPanelHeader}>
              <Text style={styles.issuesPanelTitle}>🛠️ XỬ LÝ SỰ CỐ & BỒI THƯỜNG</Text>
              <TouchableOpacity onPress={() => setShowIssuesPanel(false)}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.issuesPanelBody}>
              {/* Button to add new issue */}
              <TouchableOpacity 
                style={styles.btnAddIssueInPanel}
                onPress={() => {
                  setShowIssuesPanel(false);
                  handleOpenIssueModal();
                }}
              >
                <Ionicons name="add-circle" size={24} color="#FFF" />
                <Text style={styles.btnAddIssueInPanelText}>➕ Báo cáo sự cố mới</Text>
              </TouchableOpacity>

              {/* Issues List */}
              {activeHandoverRecord?.issues && activeHandoverRecord.issues.length > 0 ? (
                <>
                  {activeHandoverRecord.issues.map((issue: any) => (
                    <View key={issue.vehicleHandoverIssueId} style={styles.issueCard}>
                      <View style={styles.issueCardHeader}>
                        <Text style={styles.issueSeverityBadge}>
                          {issue.severity === 'HIGH' ? '🔴 Nghiêm trọng' : issue.severity === 'MEDIUM' ? '🟡 Trung bình' : '🟢 Nhẹ'}
                        </Text>
                      </View>
                      <Text style={styles.issueCardDesc}>{issue.description}</Text>
                      {issue.imageUrls && issue.imageUrls.length > 0 && (
                        <Text style={styles.issueCardInfo}>📷 {issue.imageUrls.length} ảnh minh chứng</Text>
                      )}
                      
                      {/* Show existing surcharges if any */}
                      {issue.surcharges && issue.surcharges.length > 0 && (
                        <View style={styles.existingSurchargesInPanel}>
                          <Text style={styles.existingSurchargeLabel}>Phiếu thu đã tạo:</Text>
                          {issue.surcharges.map((surcharge: any) => (
                            <View key={surcharge.tripSurchargeId} style={styles.surchargeTagInPanel}>
                              <Text style={styles.surchargeTagText}>
                                {surcharge.amount.toLocaleString('vi-VN')} VNĐ - {surcharge.status === 'PENDING' ? '⏳ Chờ' : surcharge.status === 'PAID' ? '✅ Đã trả' : '❌'}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      <TouchableOpacity 
                        style={styles.btnRequestCompensation}
                        onPress={() => {
                          setShowIssuesPanel(false);
                          handleOpenSurchargeModal(issue);
                        }}
                      >
                        <Text style={styles.btnRequestCompensationText}>💰 Yêu cầu bồi thường</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.noIssuesInPanel}>
                  <MaterialCommunityIcons name="check-circle-outline" size={64} color="#10B981" />
                  <Text style={styles.noIssuesInPanelText}>Không có sự cố nào được báo cáo</Text>
                  <Text style={styles.noIssuesInPanelSubText}>Xe được trả về trong tình trạng tốt</Text>
                </View>
              )}
              
              {/* All Surcharges Summary */}
              {activeHandoverRecord?.surcharges && activeHandoverRecord.surcharges.length > 0 && (
                <View style={styles.allSurchargesSection}>
                  <View style={styles.allSurchargesHeader}>
                    <MaterialCommunityIcons name="cash-multiple" size={20} color="#F59E0B" />
                    <Text style={styles.allSurchargesTitle}>Tổng hợp phiếu thu bồi thường ({activeHandoverRecord.surcharges.length})</Text>
                  </View>
                  {activeHandoverRecord.surcharges.map((surcharge: any, idx: number) => (
                    <View key={surcharge.tripSurchargeId || idx} style={styles.surchargeCard}>
                      <View style={styles.surchargeCardHeader}>
                        <Text style={styles.surchargeType}>{getIssueTypeLabel(surcharge.type)}</Text>
                        <View style={[styles.surchargeStatusBadge, { backgroundColor: surcharge.status === 'PAID' ? '#DCFCE7' : '#FEF3C7' }]}>
                          <Text style={[styles.surchargeStatusText, { color: surcharge.status === 'PAID' ? '#059669' : '#F59E0B' }]}>
                            {surcharge.status === 'PAID' ? '✅ Đã thanh toán' : '⏳ Chờ thanh toán'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.surchargeDesc}>{surcharge.description}</Text>
                      <View style={styles.surchargeAmountBox}>
                        <Text style={styles.surchargeAmountLabel}>Số tiền:</Text>
                        <Text style={styles.surchargeAmountValue}>{surcharge.amount.toLocaleString('vi-VN')} đ</Text>
                      </View>
                    </View>
                  ))}
                  <View style={styles.totalSurchargeBox}>
                    <Text style={styles.totalSurchargeLabel}>Tổng cộng:</Text>
                    <Text style={styles.totalSurchargeValue}>
                      {activeHandoverRecord.surcharges.reduce((sum: number, s: any) => sum + (s.amount || 0), 0).toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Quick add surcharge without issue */}
              <View style={styles.quickSurchargeInPanel}>
                <Text style={styles.quickSurchargeTitle}>💰 Phát sinh phí khác</Text>
                <Text style={styles.quickSurchargeDesc}>Tạo phiếu thu trực tiếp (vệ sinh, nhiên liệu, v.v.)</Text>
                <TouchableOpacity 
                  style={styles.btnQuickSurchargeInPanel}
                  onPress={() => {
                    setShowIssuesPanel(false);
                    handleOpenSurchargeModal(null);
                  }}
                >
                  <MaterialCommunityIcons name="plus-circle" size={20} color="#FFF" />
                  <Text style={styles.btnQuickSurchargeInPanelText}>Tạo phiếu thu</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 9. Modal OTP Handover */}
      <Modal visible={showHandoverOtpModal} transparent animationType="fade" onRequestClose={() => setShowHandoverOtpModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { width: '90%' }]}>
            <Text style={styles.otpModalTitle}>OTP Biên Bản</Text>
            <View style={styles.otpRow}>{handoverOtpDigits.map((d, i) => <TextInput key={i} ref={r => { handoverOtpInputsRef.current[i] = r; }} style={styles.otpInput} value={d} onChangeText={t => handleHandoverOtpChange(i, t)} keyboardType="numeric" maxLength={1} />)}</View>
            <TouchableOpacity style={[styles.actionBtnPrimary, { marginTop: 20 }]} onPress={submitOtpSignature}><Text style={styles.actionBtnTextPri}>Ký xác nhận</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 9. Modal Handover Checklist Editor */}
      <Modal visible={showHandoverEditor && !!activeHandoverRecord} transparent animationType="slide" onRequestClose={() => setShowHandoverEditor(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalFullscreen}>
            {activeHandoverRecord && (() => {
              console.log('🔍 activeHandoverRecord.termResults:', activeHandoverRecord.termResults);
              activeHandoverRecord.termResults?.forEach((term: any, idx: number) => {
                console.log(`🔍 Term ${idx}:`, {
                  id: term.tripVehicleHandoverTermResultId,
                  content: term.termContent,
                  isPassed: term.isPassed,
                  note: term.note
                });
              });
              
              const initialData = {
                recordId: activeHandoverRecord.tripVehicleHandoverRecordId,
                currentOdometer: activeHandoverRecord.currentOdometer || 0,
                fuelLevel: activeHandoverRecord.fuelLevel || 0,
                isEngineLightOn: activeHandoverRecord.isEngineLightOn || false,
                notes: activeHandoverRecord.notes || '',
                checklistItems: (activeHandoverRecord.termResults || []).map((term: any) => {
                  const item = {
                    tripVehicleHandoverTermResultId: term.tripVehicleHandoverTermResultId,
                    content: term.termContent || term.content,
                    isPassed: term.isPassed,
                    note: term.note || '',
                    evidenceImageUrl: term.evidenceImageUrl,
                  };
                  console.log('🔍 Mapped item:', item);
                  return item;
                }),
              };
              console.log('📝 Passing initialData to HandoverChecklistEditor:', initialData);
              console.log('📝 ChecklistItems count:', initialData.checklistItems.length);
              return (
                <HandoverChecklistEditor
                  initialData={initialData}
                  onSave={handleSaveHandoverChecklist}
                  onCancel={() => setShowHandoverEditor(false)}
                  saving={false}
                />
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Issue Reporting Modal */}
      <Modal visible={showIssueModal} transparent animationType="slide" onRequestClose={() => setShowIssueModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.issueModalContainer}>
            <View style={styles.issueModalHeader}>
              <Text style={styles.issueModalTitle}>🚨 Báo cáo sự cố</Text>
              <TouchableOpacity onPress={() => setShowIssueModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.issueModalBody}>
              <Text style={styles.issueLabel}>Loại sự cố: *</Text>
              <View style={styles.issueTypeGrid}>
                {[
                  // Ngoại thất (Bodywork)
                  { value: 'SCRATCH', label: 'Trầy xước', icon: 'color-wand-outline', emoji: '🔴' },
                  { value: 'DENT', label: 'Móp méo', icon: 'hammer-outline', emoji: '🟡' },
                  { value: 'CRACK', label: 'Nứt/Vỡ', icon: 'water-outline', emoji: '🔴' },
                  { value: 'PAINT_PEELING', label: 'Tróc sơn', icon: 'brush-outline', emoji: '🟠' },
                  
                  // Vệ sinh (Cleanliness)
                  { value: 'DIRTY', label: 'Dơ bẩn', icon: 'sparkles-outline', emoji: '🧹' },
                  { value: 'ODOR', label: 'Có mùi hôi', icon: 'nose-outline', emoji: '👃' },
                  
                  // Vận hành & Kỹ thuật (Mechanical)
                  { value: 'MECHANICAL', label: 'Lỗi động cơ', icon: 'build-outline', emoji: '🔧' },
                  { value: 'ELECTRICAL', label: 'Lỗi điện', icon: 'flash-outline', emoji: '⚡' },
                  { value: 'TIRE', label: 'Lỗi lốp xe', icon: 'ellipse-outline', emoji: '⭕' },
                  
                  // Tài sản (Inventory)
                  { value: 'MISSING_ITEM', label: 'Mất phụ kiện', icon: 'cube-outline', emoji: '📦' },
                  
                  // Khác
                  { value: 'OTHER', label: 'Khác', icon: 'ellipsis-horizontal', emoji: '❓' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.issueTypeCard,
                      issueType === type.value && styles.issueTypeCardActive,
                    ]}
                    onPress={() => setIssueType(type.value as any)}
                  >
                    <View style={styles.issueTypeIconWrapper}>
                      <Text style={styles.issueTypeEmoji}>{type.emoji}</Text>
                      <Ionicons
                        name={type.icon as any}
                        size={24}
                        color={issueType === type.value ? '#DC2626' : '#6B7280'}
                      />
                    </View>
                    <Text style={[
                      styles.issueTypeLabel,
                      issueType === type.value && styles.issueTypeLabelActive,
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.issueLabel}>Mô tả chi tiết: *</Text>
              <TextInput
                style={styles.issueDescInput}
                placeholder="Nhập mô tả sự cố (bắt buộc)"
                value={issueDescription}
                onChangeText={setIssueDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={styles.issueLabel}>Ảnh minh chứng: *</Text>
              <TouchableOpacity 
                style={styles.issueImagePicker}
                onPress={async () => {
                  if (Platform.OS === 'web') {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files[0];
                      if (file) setIssueImage(file);
                    };
                    input.click();
                  }
                }}
              >
                {issueImage ? (
                  <View style={styles.issueImagePreview}>
                    <Image
                      source={{ uri: issueImage instanceof File ? URL.createObjectURL(issueImage) : issueImage }}
                      style={styles.issueImagePreviewImg}
                    />
                    <TouchableOpacity
                      style={styles.issueImageRemove}
                      onPress={() => setIssueImage(null)}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.issueImagePlaceholder}>
                    <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                    <Text style={styles.issueImagePlaceholderText}>Chụp ảnh hoặc chọn từ thư viện</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.issueNote}>
                <MaterialCommunityIcons name="information-outline" size={20} color="#F59E0B" />
                <Text style={styles.issueNoteText}>
                  Sau khi báo cáo sự cố, bạn có thể tạo phiếu thu bồi thường
                </Text>
              </View>
            </ScrollView>

            <View style={styles.issueModalFooter}>
              <TouchableOpacity
                style={[styles.btnSecondary, { flex: 1 }]}
                onPress={() => setShowIssueModal(false)}
                disabled={submittingIssue}
              >
                <Text style={styles.btnSecondaryText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { flex: 1 },
                  (!issueDescription.trim() || !issueImage || submittingIssue) && styles.btnPrimaryDisabled,
                ]}
                onPress={handleSubmitIssue}
                disabled={!issueDescription.trim() || !issueImage || submittingIssue}
              >
                {submittingIssue ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Báo cáo sự cố</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Surcharge/Compensation Modal */}
      <Modal visible={showSurchargeModal} transparent animationType="slide" onRequestClose={() => setShowSurchargeModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.surchargeModalContainer}>
            <View style={styles.surchargeModalHeader}>
              <Text style={styles.surchargeModalTitle}>
                {selectedIssue ? '💰 Yêu cầu bồi thường' : '📝 Tạo phiếu thu'}
              </Text>
              <TouchableOpacity onPress={() => setShowSurchargeModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.surchargeModalBody}>
              {selectedIssue ? (
                <View style={styles.selectedIssueCard}>
                  <Text style={styles.selectedIssueLabel}>Sự cố:</Text>
                  <Text style={styles.selectedIssueText}>{selectedIssue.description}</Text>
                  <Text style={styles.selectedIssueSeverity}>
                    Mức độ: {selectedIssue.severity === 'HIGH' ? '🔴 Nghiêm trọng' : selectedIssue.severity === 'MEDIUM' ? '🟡 Trung bình' : '🟢 Nhẹ'}
                  </Text>
                </View>
              ) : (
                <View style={styles.selectedIssueCard}>
                  <Text style={styles.selectedIssueLabel}>Loại phí:</Text>
                  <Text style={styles.selectedIssueText}>Phát sinh phí khác (vệ sinh, nhiên liệu, v.v.)</Text>
                </View>
              )}

              <Text style={styles.surchargeLabel}>Số tiền (VNĐ): *</Text>
              <TextInput
                style={styles.surchargeInput}
                placeholder="Nhập số tiền"
                value={displaySurchargeAmount}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9]/g, '');
                  setSurchargeAmount(numericValue);
                }}
                keyboardType="numeric"
              />

              <Text style={styles.surchargeLabel}>Lý do yêu cầu bồi thường: *</Text>
              <TextInput
                style={styles.surchargeDescInput}
                placeholder="Nhập lý do chi tiết (bắt buộc)"
                value={surchargeDescription}
                onChangeText={setSurchargeDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.surchargeNote}>
                <MaterialCommunityIcons name="information-outline" size={20} color="#F59E0B" />
                <Text style={styles.surchargeNoteText}>
                  Phiếu thu sẽ được tạo và gửi cho tài xế để thanh toán
                </Text>
              </View>
            </ScrollView>

            <View style={styles.surchargeModalFooter}>
              <TouchableOpacity
                style={[styles.btnSecondary, { flex: 1 }]}
                onPress={() => setShowSurchargeModal(false)}
                disabled={submittingSurcharge}
              >
                <Text style={styles.btnSecondaryText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { flex: 1 },
                  (!surchargeAmount || !surchargeDescription.trim() || submittingSurcharge) && styles.btnPrimaryDisabled,
                ]}
                onPress={handleSubmitSurcharge}
                disabled={!surchargeAmount || !surchargeDescription.trim() || submittingSurcharge}
              >
                {submittingSurcharge ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Tạo phiếu thu</Text>
                )}
              </TouchableOpacity>
            </View>
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
  
  // Trip Info Container
  tripInfoContainer: { backgroundColor: "#F0F9FF", padding: 12, borderRadius: 12, marginBottom: 12, gap: 8 },
  tripInfoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  tripInfoLabel: { fontSize: 12, color: "#0369A1", fontWeight: "500", flex: 1 },
  tripInfoValue: { fontSize: 13, color: "#0C4A6E", fontWeight: "700" },
  
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
  driverDetailCard: { backgroundColor: '#FAFAFA', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  driverAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  driverAvatarText: { fontSize: 14, fontWeight: '700', color: '#1E40AF' },
  driverName: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  driverRole: { fontSize: 10, color: '#6B7280' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  infoLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  infoValue: { fontSize: 11, color: '#1F2937', fontWeight: '600', flex: 1, textAlign: 'right' },
  infoDetail: { fontSize: 11, color: '#4B5563', marginTop: 2, lineHeight: 16 },
  statusSection: { marginTop: 8, padding: 10, borderRadius: 8, borderLeftWidth: 3 },
  statusTitle: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  evidenceImage: { width: '100%', height: 120, borderRadius: 8, marginTop: 8, backgroundColor: '#F3F4F6' },
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
  modalFullscreen: { width: "100%", height: "95%", backgroundColor: "#FFFFFF", borderRadius: 12, overflow: "hidden", marginTop: 20 },
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

  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  // OTP Modal
  modalCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 20 },
  otpModalTitle: { fontSize: 20, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 12 },
  otpModalSubtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 24 },
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  otpInputContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  otpInput: { fontSize: 20, fontWeight: "800", color: "#111827", padding: 0, height: 50, width: 40, textAlign: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
  otpBox: { width: 44, height: 52, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFF", justifyContent: "center", alignItems: "center" },
  otpModalButtons: { flexDirection: "row", gap: 12 },

  // Issue Reporting Modal
  issueModalContainer: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, width: '100%', maxWidth: 500, maxHeight: '85%' },
  issueModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  issueModalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  issueModalBody: { flex: 1, marginBottom: 16 },
  issueLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 12 },
  issueTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  issueTypeCard: { 
    width: '31%', 
    aspectRatio: 1, 
    borderWidth: 2, 
    borderColor: '#E5E7EB', 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#FFF',
    padding: 8
  },
  issueTypeCardActive: { 
    borderColor: '#DC2626', 
    backgroundColor: '#FEF2F2'
  },
  issueTypeIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 4
  },
  issueTypeEmoji: {
    fontSize: 20,
  },
  issueTypeLabel: { 
    fontSize: 11, 
    color: '#6B7280', 
    fontWeight: '600', 
    marginTop: 2, 
    textAlign: 'center' 
  },
  issueTypeLabelActive: { 
    color: '#DC2626', 
    fontWeight: '700' 
  },
  issueDescInput: { 
    borderWidth: 1, 
    borderColor: '#D1D5DB', 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 14, 
    color: '#1F2937', 
    backgroundColor: '#F9FAFB', 
    minHeight: 100, 
    textAlignVertical: 'top' 
  },
  issueImagePicker: { 
    borderWidth: 2, 
    borderColor: '#D1D5DB', 
    borderStyle: 'dashed', 
    borderRadius: 12, 
    padding: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#F9FAFB', 
    minHeight: 120 
  },
  issueImagePreview: { 
    width: '100%', 
    height: 200, 
    borderRadius: 12, 
    position: 'relative', 
    overflow: 'hidden' 
  },
  issueImagePlaceholder: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: '#E5E7EB', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 8 
  },
  issueImageRemove: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  issueNote: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: 8, 
    backgroundColor: '#EFF6FF', 
    padding: 12, 
    borderRadius: 8, 
    marginTop: 16, 
    borderLeftWidth: 3, 
    borderLeftColor: '#3B82F6' 
  },
  issueNoteText: { 
    flex: 1, 
    fontSize: 12, 
    color: '#1E40AF', 
    lineHeight: 18 
  },
  issueImagePreviewImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  issueImagePlaceholderText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4
  },
  issueModalFooter: { 
    flexDirection: 'row', 
    gap: 12, 
    paddingTop: 16, 
    borderTopWidth: 1, 
    borderColor: '#E5E7EB' 
  },
  btnAddIssue: { 
    backgroundColor: '#3B82F6', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  btnAddIssueText: { 
    color: '#FFF', 
    fontSize: 13, 
    fontWeight: '700' 
  },
  btnViewIssues: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  btnViewIssuesText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700'
  },
  issuesPanelContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 0,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden'
  },
  issuesPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#FCA5A5',
    backgroundColor: '#FEF2F2'
  },
  issuesPanelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#991B1B'
  },
  issuesPanelBody: {
    flex: 1,
    padding: 16
  },
  btnAddIssueInPanel: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16
  },
  btnAddIssueInPanelText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700'
  },
  issueCard: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  issueCardHeader: {
    marginBottom: 8
  },
  issueSeverityBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626'
  },
  issueCardDesc: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 20
  },
  issueCardInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12
  },
  existingSurchargesInPanel: {
    marginTop: 8,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B'
  },
  existingSurchargeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 6
  },
  surchargeTagInPanel: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FCD34D'
  },
  surchargeTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78350F'
  },
  btnRequestCompensation: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  btnRequestCompensationText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700'
  },
  noIssuesInPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20
  },
  noIssuesInPanelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    marginTop: 16,
    marginBottom: 8
  },
  noIssuesInPanelSubText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center'
  },
  quickSurchargeInPanel: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B'
  },
  btnQuickSurchargeInPanel: {
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  btnQuickSurchargeInPanelText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700'
  },
  allSurchargesSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#FCD34D',
  },
  allSurchargesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  allSurchargesTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  surchargeCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
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
    marginBottom: 8,
  },
  surchargeType: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78350F',
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
  surchargeDesc: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 10,
    lineHeight: 18,
  },
  surchargeAmountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  surchargeAmountLabel: {
    fontSize: 13,
    color: '#78350F',
    fontWeight: '600',
  },
  surchargeAmountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F59E0B',
  },
  totalSurchargeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  totalSurchargeLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#78350F',
    textTransform: 'uppercase',
  },
  totalSurchargeValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#DC2626',
  },
  noIssuesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed'
  },
  noIssuesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginTop: 8,
    marginBottom: 4
  },
  noIssuesSubText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center'
  },
  quickSurchargeSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B'
  },
  quickSurchargeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4
  },
  quickSurchargeDesc: {
    fontSize: 12,
    color: '#78350F',
    marginBottom: 12,
    lineHeight: 18
  },
  btnQuickSurcharge: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6
  },
  btnQuickSurchargeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700'
  },

  // Surcharge Modal
  surchargeModalContainer: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, width: '100%', maxWidth: 500, maxHeight: '80%' },
  surchargeModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  surchargeModalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  surchargeModalBody: { flex: 1, marginBottom: 16 },
  selectedIssueCard: { padding: 12, backgroundColor: '#FEF2F2', borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#FCA5A5' },
  selectedIssueLabel: { fontSize: 11, fontWeight: '700', color: '#991B1B', marginBottom: 4 },
  selectedIssueText: { fontSize: 13, color: '#1F2937', marginBottom: 6 },
  selectedIssueSeverity: { fontSize: 12, fontWeight: '600', color: '#DC2626' },
  surchargeLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 12 },
  surchargeInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, color: '#1F2937', backgroundColor: '#FFF', fontWeight: '700' },
  surchargeDescInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 14, color: '#1F2937', backgroundColor: '#F9FAFB', minHeight: 100 },
  surchargeNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, marginTop: 16 },
  surchargeNoteText: { flex: 1, fontSize: 12, color: '#78350F', lineHeight: 18 },
  surchargeModalFooter: { flexDirection: 'row', gap: 12, paddingTop: 16, borderTopWidth: 1, borderColor: '#E5E7EB' },
  btnSecondary: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB' },
  btnSecondaryText: { color: '#374151', fontWeight: '700', fontSize: 16 },
  btnPrimary: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#DC2626' },
  btnPrimaryDisabled: { backgroundColor: '#9CA3AF', opacity: 0.6 },
  btnPrimaryText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});

export default TripDetailScreen;