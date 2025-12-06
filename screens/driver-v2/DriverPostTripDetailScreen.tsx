

import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity, Modal, StatusBar, SafeAreaView, TextInput } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import postTripService from '@/services/postTripService'
import tripService from '@/services/tripService'
import assignmentService from '@/services/assignmentService'
import { useAuth } from '@/hooks/useAuth'
import { track } from '@/utils/analytics'
import useTripStore from '@/stores/tripStore'
import VietMapUniversal from '@/components/map/VietMapUniversal'
import { extractRouteWithSteps } from '@/utils/navigation'
import AddressAutocomplete from '@/components/AddressAutocomplete'

// --- HELPER FUNCTIONS ---
type AnyObj = Record<string, any>
function get(obj: AnyObj, ...keys: string[]) {
  for (const k of keys) {
    if (obj == null) return undefined
    obj = obj[k]
  }
  return obj
}

function normalizePostTrip(raw: AnyObj) {
  const id = raw.postTripId || raw.PostTripId || raw.id || raw.Id
  const title = raw.title || raw.Title || ''
  const description = raw.description || raw.Description || ''
  const status = raw.status || raw.Status || 'UNKNOWN'
  const requiredPayloadInKg = raw.requiredPayloadInKg ?? raw.RequiredPayloadInKg
  const tripRaw = raw.trip || raw.Trip || {}
  const trip = {
    tripId: tripRaw.tripId || tripRaw.TripId,
    startLocationName: tripRaw.startLocationName || tripRaw.StartLocationName,
    endLocationName: tripRaw.endLocationName || tripRaw.EndLocationName,
    startTime: tripRaw.startTime || tripRaw.StartTime,
    vehicleModel: tripRaw.vehicleModel || tripRaw.VehicleModel,
    vehiclePlate: tripRaw.vehiclePlate || tripRaw.VehiclePlate,
    packageCount: tripRaw.packageCount || tripRaw.PackageCount,
    tripDescription: tripRaw.tripDescription || tripRaw.TripDescription,
  }
  const startName = trip.startLocationName || ''
  const endName = trip.endLocationName || ''
  const startTime = trip.startTime
  const details = raw.postTripDetails || raw.PostTripDetails || []
  return { id, title, description, status, requiredPayloadInKg, startName, endName, startTime, details, trip }
}

// --- COMPONENTS ---

const StatusPill = ({ value }: { value: string }) => {
    const config = useMemo(() => {
        const map: Record<string, any> = {
            OPEN: { color: '#16A34A', bg: '#DCFCE7', label: 'ĐANG TUYỂN' },
            CLOSED: { color: '#DC2626', bg: '#FEE2E2', label: 'ĐÃ ĐÓNG' },
            COMPLETED: { color: '#4F46E5', bg: '#EEF2FF', label: 'HOÀN THÀNH' }
        }
        return map[value.toUpperCase()] || { color: '#6B7280', bg: '#F3F4F6', label: value }
    }, [value])
    return (
        <View style={[styles.pill, { backgroundColor: config.bg, borderColor: config.color }]}>
            <Text style={[styles.pillText, { color: config.color }]}>{config.label}</Text>
        </View>
    )
}

const DriverPostTripDetailScreen: React.FC = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const postTripId = String((params as any).postTripId)
  const { user } = useAuth()
  const { getTripDetail, setTripDetail } = useTripStore()

  // States
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
    const [justApplied, setJustApplied] = useState(false)

  // Trip Detail (for rich data)
  const [tripDetail, setTripDetailState] = useState<any | null>(null)
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([])

  // Action States
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ visible: boolean; type: 'success'|'error'; message: string }>({ visible: false, type: 'success', message: '' })
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingDetail, setPendingDetail] = useState<AnyObj | null>(null)
  
  // Custom Location States (for assistant drivers)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [customPickup, setCustomPickup] = useState<string>('')
  const [customDropoff, setCustomDropoff] = useState<string>('')
  const [locationError, setLocationError] = useState<string>('')
  const [selectedPickupSuggestion, setSelectedPickupSuggestion] = useState<any>(null)
  const [selectedDropoffSuggestion, setSelectedDropoffSuggestion] = useState<any>(null)

  // --- Logic ---
  const alreadyInTrip = useMemo(() => {
    if (!user?.userId) return false
    return (tripDetail?.drivers || []).some((d: AnyObj) => {
      const did = d.driverId || d.DriverId || d.userId || d.UserId || d.id || d.Id
      return String(did) === String(user.userId)
    })
  }, [tripDetail?.drivers, user?.userId])

  const isPostOpen = (data?.status || '').toUpperCase() === 'OPEN'

  useEffect(() => {
    fetchData()
  }, [postTripId])

  const fetchData = async () => {
    setLoading(true)
    try {
        const res: any = await postTripService.getById(String(postTripId))

        // If backend returns 403 after we've just applied, treat as success and navigate back
        if ((res?.statusCode === 403 || (typeof res?.message === 'string' && /forbidden/i.test(res.message))) && justApplied) {
            showToast('success', 'Ứng tuyển thành công!')
            setJustApplied(false)
            router.back()
            return
        }

        // If backend returns 403 and we did NOT just apply, this is a permission issue — show friendly message and go back
        if (res?.statusCode === 403 || (typeof res?.message === 'string' && /forbidden/i.test(res.message))) {
            showToast('error', 'Bạn không có quyền xem bài đăng này')
            router.back()
            return
        }

        if (res?.isSuccess) {
            const normalized = normalizePostTrip(res.result)
            setData(normalized)

            // Fetch linked trip details
            if (normalized.trip?.tripId) {
                const tRes: any = await tripService.getById(normalized.trip.tripId)
                if (tRes?.isSuccess) {
                    setTripDetailState(tRes.result)
                    // Decode route
                    if (tRes.result.tripRoute?.routeData) {
                        const { coords } = extractRouteWithSteps(tRes.result.tripRoute.routeData)
                        setRouteCoords(coords as [number, number][])
                    }
                }
            }
        } else {
            setError(res?.message || 'Không tải được bài đăng')
        }
    } catch (e: any) {
        // If server responds with 403 (forbidden) after an apply, show success and navigate back
        const status = e?.response?.status
        const apiMessage = e?.response?.data?.message || e?.message || ''
        if ((status === 403 || /forbidden/i.test(apiMessage)) && justApplied) {
            showToast('success', 'Ứng tuyển thành công!')
            setJustApplied(false)
            router.back()
            return
        }

        // If thrown 403 (permission) and not justApplied, show friendly message and navigate back
        if (status === 403 || /forbidden/i.test(apiMessage)) {
            showToast('error', 'Bạn không có quyền xem bài đăng này')
            router.back()
            return
        }

        setError(e?.message || 'Lỗi mạng')
    } finally {
        setLoading(false)
    }
  }

  const showToast = (type: 'success'|'error', message: string) => {
    setToast({ visible: true, type, message })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500)
  }

  const handleApply = async (detail: AnyObj) => {
    if (!data?.id) return
    const postTripDetailId = detail.postTripDetailId || detail.PostTripDetailId || detail.id || detail.Id
    const isAssistant = (detail.type || 'PRIMARY') !== 'PRIMARY'
    
    // For assistant drivers with custom locations, use them; otherwise send null (backend will use default)
    const startLocation = (isAssistant && customPickup.trim()) ? customPickup.trim() : null
    const endLocation = (isAssistant && customDropoff.trim()) ? customDropoff.trim() : null

    setApplyingId(String(postTripDetailId))
    try {
        const res: any = await assignmentService.applyByPostTrip({
            postTripId: String(data.id),
            postTripDetailId: String(postTripDetailId),
            startLocation: startLocation as any,
            endLocation: endLocation as any
        })
        if (res?.isSuccess || res?.statusCode === 201) {
            showToast('success', 'Ứng tuyển thành công!')
            // Reset custom locations
            setCustomPickup('')
            setCustomDropoff('')
            // Optimistic UI update: avoid immediate refetch which may return 403/forbidden
            const newDriver = {
                driverId: user?.userId,
                fullName: (user as any)?.fullName || (user as any)?.userName || '',
                type: detail.type || detail.Type || 'PRIMARY',
                assignmentStatus: 'ACCEPTED',
                paymentStatus: 'UNPAID',
            }
            if (tripDetail) {
                setTripDetailState({ ...tripDetail, drivers: [...(tripDetail.drivers || []), newDriver] })
            } else {
                setTripDetailState({ drivers: [newDriver] })
            }
            // mark that we just applied so fetchData can handle a 403 gracefully
            setJustApplied(true)
        } else {
            throw new Error(res?.message || 'Thất bại')
        }
    } catch (e: any) {
        // Check if error is about location validation
        const errMsg = e?.response?.data?.message || e?.message || 'Lỗi ứng tuyển'
        showToast('error', errMsg)
    } finally {
        setApplyingId(null)
        setShowConfirm(false)
        setShowLocationModal(false) // Close location modal after applying
    }
  }

  const openLocationModal = (detail: AnyObj) => {
    setPendingDetail(detail)
    setLocationError('')
    // Reset suggestions when opening modal
    setSelectedPickupSuggestion(null)
    setSelectedDropoffSuggestion(null)
    setShowLocationModal(true)
  }

  const confirmWithLocation = () => {
    if (!pendingDetail) return
    // Don't close location modal, just show confirm on top
    setShowConfirm(true)
  }

  const openConfirm = (detail: AnyObj) => {
    setPendingDetail(detail)
    setShowConfirm(true)
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>
  if (error || !data) return <View style={styles.center}><Text style={styles.errorText}>{error || 'Không có dữ liệu'}</Text></View>

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={{flex: 1}}>
            <Text style={styles.headerTitle} numberOfLines={1}>Chi tiết Bài đăng</Text>
        </View>
        <StatusPill value={data.status} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* 1. Map Preview */}
        <View style={styles.cardNoPadding}>
            <View style={styles.mapContainer}>
                <VietMapUniversal 
                    coordinates={routeCoords}
                    style={{ height: 200 }}
                    navigationActive={false}
                />
            </View>
            <View style={styles.routeInfoBox}>
                <View style={styles.routeRow}>
                    <View style={[styles.dot, {backgroundColor: '#3B82F6'}]} />
                    <Text style={styles.routeText}>{data.startName || '---'}</Text>
                </View>
                <View style={styles.routeConnector} />
                <View style={styles.routeRow}>
                    <View style={[styles.dot, {backgroundColor: '#EF4444'}]} />
                    <Text style={styles.routeText}>{data.endName || '---'}</Text>
                </View>
            </View>
        </View>

        {/* 2. Overview Info */}
        <View style={styles.card}>
            <Text style={styles.title}>{data.title}</Text>
            <Text style={styles.desc}>{data.description}</Text>
            
            <View style={styles.divider} />
            
            <View style={styles.grid}>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Tải trọng</Text>
                    <Text style={styles.value}>{data.requiredPayloadInKg} kg</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Khởi hành</Text>
                    <Text style={styles.value}>{data.startTime ? new Date(data.startTime).toLocaleDateString('vi-VN') : '---'}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Tổng Slot</Text>
                    <Text style={styles.value}>{data.details.length}</Text>
                </View>
            </View>
        </View>

        {/* 3. Positions (Slots) */}
        <Text style={styles.sectionTitle}>VỊ TRÍ CẦN TUYỂN</Text>
        
        {data.details.map((d: AnyObj, idx: number) => {
            const type = (d.type || 'PRIMARY') === 'PRIMARY' ? 'Tài xế Chính' : 'Tài xế Phụ'
            const salary = d.pricePerPerson || 0
            const count = d.requiredCount || 0
            // Check if slot is full: requiredCount === 0 means no more drivers needed
            const isFull = count === 0 

            return (
                <View key={idx} style={styles.slotCard}>
                    <View style={styles.slotHeader}>
                        <View style={styles.slotTypeTag}>
                            <Text style={styles.slotTypeText}>{type}</Text>
                        </View>
                        <Text style={styles.slotSalary}>{salary.toLocaleString('vi-VN')} đ</Text>
                    </View>

                    <View style={styles.slotBody}>
                        <View style={styles.slotRow}>
                            <Ionicons name="people-outline" size={16} color="#6B7280" />
                            <Text style={styles.slotText}>
                                Số lượng còn thiếu: <Text style={[styles.slotCount, isFull && styles.slotCountFull]}>{count}</Text>
                            </Text>
                        </View>
                        <View style={styles.slotRow}>
                            <Ionicons name="location-outline" size={16} color="#6B7280" />
                            <Text style={styles.slotText}>Đón: {d.pickupLocation || '---'}</Text>
                        </View>
                        <View style={styles.slotRow}>
                            <Ionicons name="flag-outline" size={16} color="#6B7280" />
                            <Text style={styles.slotText}>Trả: {d.dropoffLocation || '---'}</Text>
                        </View>
                    </View>

                    {/* Apply Button */}
                    {!alreadyInTrip && isPostOpen && (
                        <View style={styles.actionContainer}>
                            {type === 'Tài xế Phụ' && (
                                <TouchableOpacity 
                                    style={[styles.customLocationBtn, (applyingId || isFull) && styles.btnDisabled]}
                                    onPress={() => openLocationModal(d)}
                                    disabled={!!applyingId || isFull}
                                >
                                    <Ionicons name="location" size={16} color="#4F46E5" />
                                    <Text style={styles.customLocationText}>Tùy chỉnh điểm đón/trả</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                                style={[styles.applyBtn, (applyingId || isFull) && styles.btnDisabled, type === 'Tài xế Phụ' && styles.applyBtnSecondary]}
                                onPress={() => openConfirm(d)}
                                disabled={!!applyingId || isFull}
                            >
                                {applyingId === String(d.postTripDetailId) ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.applyBtnText}>{isFull ? 'Đã đủ người' :  'Ứng tuyển ngay'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {alreadyInTrip && (
                        <View style={styles.joinedBanner}>
                            <Ionicons name="checkmark-circle" size={18} color="#059669" />
                            <Text style={styles.joinedText}>Bạn đã tham gia chuyến này</Text>
                        </View>
                    )}
                </View>
            )
        })}

        {/* 4. Trip Context (Vehicle & Owner) - Optional */}
        {tripDetail && (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Thông tin bổ sung</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Xe:</Text>
                    <Text style={styles.infoValue}>{tripDetail.vehicle?.plateNumber} - {tripDetail.vehicle?.model}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Chủ xe:</Text>
                    <Text style={styles.infoValue}>{tripDetail.owner?.fullName}</Text>
                </View>
            </View>
        )}

        <View style={{height: 40}} />
      </ScrollView>

      {/* Custom Location Modal (Assistant Drivers Only) */}
      <Modal visible={showLocationModal} transparent animationType="slide" onRequestClose={() => setShowLocationModal(false)}>
        <View style={styles.modalBackdrop}>
            <View style={styles.locationModalCard}>
                <View style={styles.locationModalHeader}>
                    <Text style={styles.modalTitle}>Tùy chỉnh điểm đón/trả</Text>
                    <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.warningBox}>
                    <Ionicons name="information-circle" size={20} color="#F59E0B" />
                    <Text style={styles.warningText}>
                        Điểm đón/trả tùy chỉnh chỉ hợp lệ khi nằm trên tuyến đường và cách đường dưới 5km. 
                        Để trống nếu muốn dùng điểm mặc định.
                    </Text>
                </View>

                <ScrollView style={{maxHeight: 400}}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Điểm đón (tùy chọn)</Text>
                        <AddressAutocomplete
                            value={customPickup}
                            onSelect={(suggestion) => {
                                setSelectedPickupSuggestion(suggestion)
                                setCustomPickup(suggestion.display || suggestion.name || suggestion.address || '')
                            }}
                            placeholder="Nhập địa chỉ đón dọc đường..."
                            displayType={1}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Điểm trả (tùy chọn)</Text>
                        <AddressAutocomplete
                            value={customDropoff}
                            onSelect={(suggestion) => {
                                setSelectedDropoffSuggestion(suggestion)
                                setCustomDropoff(suggestion.display || suggestion.name || suggestion.address || '')
                            }}
                            placeholder="Nhập địa chỉ trả dọc đường..."
                            displayType={1}
                        />
                    </View>
                </ScrollView>

                {locationError ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorBoxText}>{locationError}</Text>
                    </View>
                ) : null}

                <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowLocationModal(false)}>
                        <Text style={styles.btnSecondaryText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnPrimary} onPress={confirmWithLocation}>
                        <Text style={styles.btnPrimaryText}>Tiếp tục</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* Confirm Modal - Appears on top of location modal */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.confirmModalBackdrop}>
            <View style={styles.confirmModalCard}>
                <Text style={styles.modalTitle}>Xác nhận Ứng tuyển</Text>
                <Text style={styles.modalDesc}>
                    Bạn có chắc chắn muốn ứng tuyển vị trí 
                    <Text style={{fontWeight: 'bold'}}> {pendingDetail?.type === 'PRIMARY' ? 'Tài xế Chính' : 'Tài xế Phụ'} </Text>
                    với mức lương 
                    <Text style={{fontWeight: 'bold', color: '#2563EB'}}> {pendingDetail?.pricePerPerson?.toLocaleString()} đ</Text>?
                </Text>
                
                {/* Show custom locations if set */}
                {(customPickup || customDropoff) && (
                    <View style={styles.customLocSummary}>
                        <Text style={styles.customLocTitle}>📍 Địa điểm tùy chỉnh:</Text>
                        {customPickup && <Text style={styles.customLocText}>Đón: {customPickup}</Text>}
                        {customDropoff && <Text style={styles.customLocText}>Trả: {customDropoff}</Text>}
                    </View>
                )}
                
                <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowConfirm(false)}>
                        <Text style={styles.btnSecondaryText}>Quay lại</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnPrimary} onPress={() => pendingDetail && handleApply(pendingDetail)}>
                        <Text style={styles.btnPrimaryText}>Xác nhận</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* Toast */}
      {toast.visible && (
        <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
            <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },

  // Cards
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardNoPadding: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  
  // Map
  mapContainer: { height: 200 },
  routeInfoBox: { padding: 16, backgroundColor: '#FFF' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeConnector: { height: 16, borderLeftWidth: 1, borderLeftColor: '#D1D5DB', borderStyle: 'dashed', marginLeft: 6, marginVertical: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  routeText: { fontSize: 14, color: '#1F2937', flex: 1, fontWeight: '500' },

  // Overview
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  desc: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  gridItem: { alignItems: 'center', flex: 1 },
  label: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  value: { fontSize: 14, fontWeight: '700', color: '#111827' },

  // Section
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Slot Card
  slotCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  slotTypeTag: { backgroundColor: '#E0E7FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  slotTypeText: { fontSize: 12, fontWeight: '700', color: '#4338CA' },
  slotSalary: { fontSize: 16, fontWeight: '800', color: '#059669' },
  slotBody: { padding: 16, gap: 8 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotText: { fontSize: 13, color: '#374151' },
  slotCount: { fontWeight: '700', color: '#2563EB' },
  slotCountFull: { color: '#DC2626' },
  actionContainer: { padding: 16, paddingTop: 0, gap: 8 },
  customLocationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE', gap: 6 },
  customLocationText: { color: '#4F46E5', fontWeight: '600', fontSize: 13 },
  applyBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#4F46E5' },
  applyBtnSecondary: { backgroundColor: '#6B7280' },
  applyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  btnDisabled: { backgroundColor: '#A5B4FC' },
  joinedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#ECFDF5', gap: 8 },
  joinedText: { color: '#065F46', fontWeight: '600' },

  // Additional Info
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  locationModalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, maxHeight: '90%' },
  confirmModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  confirmModalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  customLocSummary: { backgroundColor: '#F0F9FF', padding: 12, borderRadius: 8, marginVertical: 12, borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  customLocTitle: { fontSize: 13, fontWeight: '700', color: '#1E40AF', marginBottom: 6 },
  customLocText: { fontSize: 12, color: '#1E3A8A', marginTop: 2 },
  locationModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  warningBox: { flexDirection: 'row', backgroundColor: '#FFFBEB', padding: 12, borderRadius: 8, gap: 8, marginBottom: 16, borderWidth: 1, borderColor: '#FEF3C7' },
  warningText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputWrapper: { position: 'relative' as 'relative' },
  inputIcon: { position: 'absolute' as 'absolute', left: 12, top: 12, zIndex: 1 },
  errorBox: { backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorBoxText: { color: '#991B1B', fontSize: 13, fontWeight: '500' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#111827', textAlign: 'center' },
  modalDesc: { fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  btnSecondary: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  btnSecondaryText: { fontWeight: '600', color: '#374151' },
  btnPrimary: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#2563EB', alignItems: 'center' },
  btnPrimaryText: { fontWeight: '600', color: '#FFF' },

  // Toast
  toast: { position: 'absolute', bottom: 40, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  toastSuccess: { backgroundColor: '#059669' },
  toastError: { backgroundColor: '#DC2626' },
  toastText: { color: '#FFF', fontWeight: '600' },
  errorText: { color: '#DC2626' }
})

export default DriverPostTripDetailScreen
