// import React, { useEffect, useState, useMemo } from 'react'
// import { View, Text, Modal, ActivityIndicator, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native'
// import tripService from '@/services/tripService'
// import { TripDetailFullDTOExtended, Role } from '@/models/types'
// import { useAuth } from '@/hooks/useAuth'

// interface Props {
//   visible: boolean;
//   tripId?: string;
//   onClose: () => void;
// }

// // Simple status color mapping
// const statusColor = (status: string) => {
//   const map: Record<string, string> = {
//     CREATED: '#3B82F6',
//     AWAITING_PROVIDER_CONTRACT: '#F59E0B',
//     AWAITING_PROVIDER_PAYMENT: '#D97706',
//     IN_PROGRESS: '#10B981',
//     COMPLETED: '#059669',
//     CANCELLED: '#EF4444'
//   }
//   return map[status] || '#6B7280'
// }

// const ProviderTripDetailModal: React.FC<Props> = ({ visible, tripId, onClose }) => {
//   const { user } = useAuth()
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState<string | null>(null)
//   const [trip, setTrip] = useState<TripDetailFullDTOExtended | null>(null)
//   const [signing, setSigning] = useState(false)

//   useEffect(() => {
//     if (visible && tripId) fetchTrip(tripId)
//   }, [visible, tripId])

//   const fetchTrip = async (id: string) => {
//     setLoading(true)
//     setError(null)
//     try {
//       const res = await tripService.getById(id)
//       if (res.isSuccess && res.result) {
//         const normalized: TripDetailFullDTOExtended = {
//           ...res.result,
//           deliveryRecords: res.result.deliveryRecords || [],
//           compensations: res.result.compensations || [],
//           issues: res.result.issues || []
//         }
//         setTrip(normalized)
//       } else throw new Error(res.message || 'Không tải được chuyến')
//     } catch (e: any) {
//       setError(e?.message || 'Lỗi không xác định')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const providerContract = trip?.providerContracts
//   const isProviderUser = user?.role === Role.PROVIDER
//   const ownerSigned = !!providerContract?.ownerSigned
//   const providerSigned = !!providerContract?.counterpartySigned
//   const bothSigned = ownerSigned && providerSigned
//   const waitingForOther = providerSigned && !ownerSigned
//   const canSign = isProviderUser && !providerSigned
//   const signBtnLabel = bothSigned ? 'Đã hoàn tất' : waitingForOther ? 'Đợi đối phương' : 'Ký hợp đồng'

//   const handleSign = async () => {
//     if (!providerContract?.contractId) return
//     if (!canSign) return
//     setSigning(true)
//     try {
//       const response: any = await tripService.signProviderContract(providerContract.contractId)
//       const ok = response?.isSuccess ?? response?.statusCode === 200
//       if (!ok) throw new Error(response?.message || 'Ký thất bại')
//       const payload = response?.data ?? response?.result ?? {}
//       setTrip(prev => prev ? {
//         ...prev,
//         status: payload.TripStatus || prev.status,
//         providerContracts: {
//           ...prev.providerContracts,
//           status: payload.ContractStatus || prev.providerContracts.status,
//           ownerSigned: payload.OwnerSigned ?? prev.providerContracts.ownerSigned,
//           counterpartySigned: payload.CounterpartySigned ?? prev.providerContracts.counterpartySigned,
//           ownerSignAt: payload.OwnerSignAt ?? prev.providerContracts.ownerSignAt,
//           counterpartySignAt: payload.CounterpartySignAt ?? prev.providerContracts.counterpartySignAt,
//         } as any
//       } : prev)
//       Alert.alert('Ký hợp đồng', 'Ký thành công')
//     } catch (e: any) {
//       Alert.alert('Ký hợp đồng', e?.message || 'Có lỗi xảy ra')
//     } finally {
//       setSigning(false)
//     }
//   }

//   const goToPayment = () => {
//     if (!tripId) return
//     try {
//       const router = require('expo-router').useRouter?.()
//       if (router) router.push({ pathname: '/owner-v2/payment-qr', params: { tripId } } as any)
//       else Alert.alert('Thanh toán', 'Mở màn hình thanh toán QR')
//     } catch {
//       Alert.alert('Thanh toán', 'Không thể mở màn hình thanh toán.')
//     }
//   }

//   const renderContract = () => {
//     if (!providerContract?.contractId) return <Text style={styles.empty}>Chưa có hợp đồng.</Text>
//     return (
//       <View style={styles.contractBox}>
// <Text style={styles.contractTitle}>{providerContract.contractCode}</Text>
// <View style={styles.rowBetween}>
// <Text style={styles.label}>Trạng thái:</Text>
// <Text style={[styles.value, { color: bothSigned ? '#059669' : '#D97706' }]}>{bothSigned ? 'Đã ký' : providerContract.status}</Text>
// </View>
// <View style={styles.rowBetween}>
// <Text style={styles.label}>Giá trị:</Text>
// <Text style={styles.value}>{providerContract.contractValue?.toLocaleString('vi-VN')} {providerContract.currency}</Text>
// </View>
// <View style={styles.signRow}>
// <View style={styles.signCol}>
// <Text style={styles.signLabel}>Bên A</Text>
// <Text style={[styles.signStatus, { color: ownerSigned ? '#059669' : '#6B7280' }]}>{ownerSigned ? 'Đã ký' : 'Chưa ký'}</Text>
// </View>
// <View style={styles.signCol}>
// <Text style={styles.signLabel}>Bên B</Text>
// <Text style={[styles.signStatus, { color: providerSigned ? '#059669' : '#6B7280' }]}>{providerSigned ? 'Đã ký' : 'Chưa ký'}</Text>
// </View>
// </View>
// <View style={styles.actionRow}>
// <TouchableOpacity style={[styles.actionBtn, (!canSign ? styles.btnDisabled : styles.btnPrimary)]} disabled={!canSign || signing} onPress={handleSign}>
//             {signing ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>{signBtnLabel}</Text>}
//           </TouchableOpacity>
// <TouchableOpacity style={[styles.actionBtn, styles.btnSecondary]} onPress={goToPayment}>
// <Text style={[styles.actionBtnText, { color: '#111827' }]}>Thanh toán (QR)</Text>
// </TouchableOpacity>
// </View>
// </View>
//     )
//   }

//   const renderBody = () => {
//     if (loading) return <View style={styles.center}><ActivityIndicator color="#4F46E5" /><Text style={styles.loadingText}>Đang tải chuyến...</Text></View>
//     if (error) return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
//     if (!trip) return null
//     const color = statusColor(trip.status)
//     return (
//       <ScrollView contentContainerStyle={styles.scrollContent}>
// <View style={styles.headerBlock}>
// <Text style={styles.tripCode}>{trip.tripCode}</Text>
// <View style={[styles.statusBadge, { borderColor: color, backgroundColor: color + '22' }]}>
// <Text style={[styles.statusBadgeText, { color }]}>{trip.status}</Text>
// </View>
// </View>
// <Text style={styles.routeText}>{trip.shippingRoute?.startAddress || 'N/A'} → {trip.shippingRoute?.endAddress || 'N/A'}</Text>
// <View style={styles.metaGrid}>
// <View style={styles.metaItem}><Text style={styles.metaLabel}>Xe</Text><Text style={styles.metaValue}>{trip.vehicle?.plateNumber || 'N/A'}</Text></View>
// <View style={styles.metaItem}><Text style={styles.metaLabel}>Loại xe</Text><Text style={styles.metaValue}>{trip.vehicle?.vehicleTypeName || 'N/A'}</Text></View>
// <View style={styles.metaItem}><Text style={styles.metaLabel}>Gói hàng</Text><Text style={styles.metaValue}>{(trip.packages || []).length}</Text></View>
// <View style={styles.metaItem}><Text style={styles.metaLabel}>Tài xế</Text><Text style={styles.metaValue}>{(trip.drivers || []).length}</Text></View>
// </View>
// <View style={styles.section}><Text style={styles.sectionTitle}>Hợp đồng</Text>{renderContract()}</View>
// <View style={styles.section}>
// <Text style={styles.sectionTitle}>Tài xế</Text>
//           {(trip.drivers || []).length === 0 ? <Text style={styles.empty}>Chưa có tài xế.</Text> : (trip.drivers || []).map(d => (
//             <View key={d.driverId} style={styles.rowBetween}><Text style={styles.label}>{d.fullName}</Text><Text style={styles.value}>{d.assignmentStatus}</Text></View>
//           ))}
//         </View>
// <View style={styles.section}>
// <Text style={styles.sectionTitle}>Theo dõi</Text>
// <Text style={styles.trackText}>Quãng đường: {trip.tripRoute?.distanceKm?.toFixed(1) || 0} km | Thời gian dự kiến: {Math.round(trip.tripRoute?.durationMinutes || 0)} phút</Text>
// <Text style={styles.trackSub}>Nhật ký: {(trip.deliveryRecords || []).length} bản ghi | Sự cố: {(trip.issues || []).length} | Bồi thường: {(trip.compensations || []).length}</Text>
// </View>
// <View style={{ height: 24 }} />
// </ScrollView>
//     )
//   }

//   return (
//     <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
// <View style={styles.backdrop}>
// <View style={styles.card}>
// <View style={styles.modalHeader}>
// <Text style={styles.modalTitle}>Chi tiết chuyến (Provider)</Text>
// <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
// <Text style={styles.close}>×</Text>
// </TouchableOpacity>
// </View>
//           {renderBody()}
//         </View>
// </View>
// </Modal>
//   )
// }

// const styles = StyleSheet.create({
//   backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
//   card: { width: '100%', maxWidth: 640, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
//   modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
//   modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
//   close: { fontSize: 28, lineHeight: 28, color: '#6B7280' },
//   center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
//   loadingText: { marginTop: 8, color: '#6B7280' },
//   errorText: { color: '#EF4444', textAlign: 'center' },
//   scrollContent: { paddingBottom: 12 },
//   headerBlock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
//   tripCode: { fontSize: 18, fontWeight: '800', color: '#111827' },
//   statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1 },
//   statusBadgeText: { fontSize: 12, fontWeight: '700' },
//   routeText: { fontSize: 14, fontWeight: '600', color: '#4F46E5', marginBottom: 12 },
//   metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginBottom: 16 },
//   metaItem: { width: '50%', paddingHorizontal: 6, marginBottom: 10 },
//   metaLabel: { fontSize: 12, color: '#6B7280' },
//   metaValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
//   section: { marginBottom: 16 },
//   sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
//   empty: { fontStyle: 'italic', color: '#6B7280' },
//   contractBox: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, backgroundColor: '#F9FAFB' },
//   contractTitle: { fontSize: 14, fontWeight: '700', color: '#4F46E5', marginBottom: 6 },
//   rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
//   label: { fontSize: 13, color: '#6B7280' },
//   value: { fontSize: 13, fontWeight: '600', color: '#111827' },
//   signRow: { flexDirection: 'row', marginTop: 8, marginBottom: 10 },
//   signCol: { flex: 1 },
//   signLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 2 },
//   signStatus: { fontSize: 12, fontWeight: '700' },
//   actionRow: { flexDirection: 'row', gap: 8 },
//   actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
//   actionBtnText: { fontWeight: '700', color: '#FFFFFF' },
//   btnPrimary: { backgroundColor: '#2563EB' },
//   btnSecondary: { backgroundColor: '#E0E7FF' },
//   btnDisabled: { backgroundColor: '#9CA3AF' },
//   trackText: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
//   trackSub: { fontSize: 12, color: '#6B7280' }
// })

// export default ProviderTripDetailModal

import React, { useEffect, useState } from 'react'
import {
  Modal, View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, Dimensions
} from 'react-native'
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons'
import tripService from '@/services/tripService'
import { TripDetailFullDTOExtended, Role } from '@/models/types'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  visible: boolean;
  tripId?: string;
  onClose: () => void;
}

const { width } = Dimensions.get('window')

// Màu sắc chủ đạo theo thiết kế mới
const COLORS = {
  primary: '#0284C7',
  bg: '#F3F4F6',
  white: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  blue: '#3B82F6',
  // Màu nền cho Contact
  senderBg: '#E0F2FE', // Xanh nhạt
  receiverBg: '#FFEDD5', // Cam nhạt
}

const ProviderTripDetailModal: React.FC<Props> = ({ visible, tripId, onClose }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trip, setTrip] = useState<TripDetailFullDTOExtended | null>(null)
  const [signing, setSigning] = useState(false)

  useEffect(() => {
    if (visible && tripId) fetchTrip(tripId)
  }, [visible, tripId])

  const fetchTrip = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await tripService.getById(id)
      if (res.isSuccess && res.result) {
        setTrip({
          ...res.result,
          deliveryRecords: res.result.deliveryRecords || [],
          compensations: res.result.compensations || [],
          issues: res.result.issues || []
        })
      } else throw new Error(res.message || 'Không tải được chuyến')
    } catch (e: any) {
      setError(e?.message || 'Lỗi không xác định')
    } finally {
      setLoading(false)
    }
  }

  // --- LOGIC HỢP ĐỒNG (GIỮ NGUYÊN NHƯ CŨ) ---
  const providerContract = trip?.providerContracts
  const isProviderUser = user?.role === Role.PROVIDER
  const ownerSigned = !!providerContract?.ownerSigned
  const providerSigned = !!providerContract?.counterpartySigned
  const bothSigned = ownerSigned && providerSigned
  const waitingForOther = providerSigned && !ownerSigned
  const canSign = isProviderUser && !providerSigned
  const signBtnLabel = bothSigned ? 'Đã hoàn tất' : waitingForOther ? 'Đợi đối phương' : 'Ký hợp đồng'

  const handleSign = async () => {
    if (!providerContract?.contractId || !canSign) return
    setSigning(true)
    try {
      const response: any = await tripService.signProviderContract(providerContract.contractId)
      if (response?.isSuccess || response?.statusCode === 200) {
        Alert.alert('Thành công', 'Đã ký hợp đồng!')
        if (tripId) fetchTrip(tripId)
      } else throw new Error(response?.message || 'Ký thất bại')
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Có lỗi xảy ra')
    } finally {
      setSigning(false)
    }
  }

  const goToPayment = () => {
    Alert.alert('Thông báo', 'Chuyển hướng đến màn hình thanh toán QR...')
  }

  // --- RENDERERS ---

  // 1. Card Hợp Đồng (Design kiểu văn bản cũ nhưng đẹp hơn)
  const renderContractCard = () => {
    if (!providerContract?.contractId) return <Text style={styles.emptyText}>Chưa có hợp đồng.</Text>
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text" size={20} color={COLORS.text} />
          <Text style={styles.cardTitle}>Hợp Đồng Vận Chuyển</Text>
        </View>
        
        <View style={styles.contractContainer}>
          <Text style={styles.contractValue}>{providerContract.contractValue?.toLocaleString()} VND</Text>
          <Text style={styles.contractCode}>Mã HĐ: {providerContract.contractCode}</Text>
          
          <View style={[styles.statusTag, bothSigned ? styles.bgSuccess : styles.bgWarning]}>
            <Text style={[styles.statusTagText, bothSigned ? {color: '#fff'} : {color: '#78350F'}]}>
              {bothSigned ? '✔ HOÀN TẤT (Đã ký)' : '⚠ ĐANG CHỜ KÝ'}
            </Text>
          </View>

          {/* Timeline ký kết */}
          <View style={styles.signTimeline}>
            <View style={styles.signNode}>
              <Text style={styles.signLabel}>Chủ xe ký</Text>
              <Ionicons name={ownerSigned ? "checkmark-circle" : "ellipse-outline"} size={20} color={ownerSigned ? COLORS.success : COLORS.textLight} />
            </View>
            <View style={styles.signLine} />
            <View style={styles.signNode}>
              <Text style={styles.signLabel}>Đối tác ký</Text>
              <Ionicons name={providerSigned ? "checkmark-circle" : "ellipse-outline"} size={20} color={providerSigned ? COLORS.success : COLORS.textLight} />
            </View>
          </View>

          {/* Nút hành động */}
          <View style={styles.contractActions}>
            {canSign && (
              <TouchableOpacity 
                style={[styles.actionBtn, styles.btnPrimary]} 
                onPress={handleSign} 
                disabled={signing}
              >
                {signing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTextWhite}>{signBtnLabel}</Text>}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionBtn, styles.btnOutline]} onPress={goToPayment}>
              <Text style={styles.btnTextDark}>Thanh toán</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  const renderContent = () => {
    if (loading) return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
    if (error) return <Text style={styles.errorText}>{error}</Text>
    if (!trip) return null

    return (
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        
        {/* --- SECTION 1: MAP & ROUTE --- */}
        <View style={styles.mapSection}>
          {/* Map Placeholder (Hình nền bản đồ) */}
          <View style={styles.mapPlaceholder}>
            {/* Thay thế bằng Image bản đồ thật nếu có */}
            <MaterialCommunityIcons name="map" size={64} color="#CBD5E1" /> 
          </View>
          
          {/* Floating Route Card */}
          <View style={styles.floatingRouteCard}>
            <View style={styles.routeHeader}>
              <Text style={styles.tripCode}>Code: {trip.tripCode}</Text>
              {/* Badge trạng thái chuyến */}
              <View style={styles.tripStatusBadge}>
                <Text style={styles.tripStatusText}>{trip.status}</Text>
              </View>
            </View>

            <View style={styles.routeRow}>
              <View style={styles.routeNode}>
                <View style={[styles.dot, { backgroundColor: COLORS.blue }]}>
                  <Text style={styles.dotText}>A</Text>
                </View>
                <Text style={styles.locationText} numberOfLines={2}>{trip.shippingRoute?.startAddress}</Text>
              </View>
              
              <View style={styles.routeLine}>
                <Text style={styles.distanceText}>{trip.tripRoute?.distanceKm?.toFixed(0) ?? '-'} km</Text>
                <View style={styles.dashedLine} />
                <MaterialCommunityIcons name="truck-fast" size={16} color={COLORS.warning} />
              </View>

              <View style={styles.routeNode}>
                <View style={[styles.dot, { backgroundColor: COLORS.danger }]}>
                  <Text style={styles.dotText}>B</Text>
                </View>
                <Text style={styles.locationText} numberOfLines={2}>{trip.shippingRoute?.endAddress}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- SECTION 2: PACKAGE INFO --- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="cube-outline" size={20} color={COLORS.text} />
            <Text style={styles.cardTitle}>Thông Tin Hàng Hóa</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <MaterialCommunityIcons name="weight-kilogram" size={16} color={COLORS.textLight} />
              <Text style={styles.statValue}>{(trip.packages || []).reduce((acc, p) => acc + (p.weight || 0), 0)} kg</Text>
            </View>
            <View style={styles.statBadge}>
              <MaterialCommunityIcons name="cube-send" size={16} color={COLORS.textLight} />
              <Text style={styles.statValue}>{(trip.packages || []).reduce((acc, p) => acc + (p.volume || 0), 0)} m³</Text>
            </View>
          </View>
          {(trip.packages || []).map((p, i) => (
            <View key={i} style={styles.pkgRow}>
              {/* <Text style={styles.pkgName}>• {p.}</Text> */}
              <Text style={styles.pkgCode}>{p.packageCode}</Text>
            </View>
          ))}
        </View>

        {/* --- SECTION 3: TRANSPORT TEAM --- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="truck-outline" size={20} color={COLORS.text} />
            <Text style={styles.cardTitle}>Đội Ngũ Vận Chuyển</Text>
          </View>
          
          {/* Vehicle Info */}
          <View style={styles.vehicleInfo}>
            <View style={styles.vehicleImagePlaceholder}>
               <MaterialCommunityIcons name="truck" size={40} color="#9CA3AF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehiclePlate}>{trip.vehicle?.plateNumber || 'Chưa gán xe'}</Text>
              <Text style={styles.vehicleType}>{trip.vehicle?.vehicleTypeName}</Text>
            </View>
          </View>

          {/* Drivers */}
          <View style={styles.driverList}>
            {(trip.drivers || []).map((d, i) => (
              <View key={i} style={styles.driverItem}>
                <Image source={require('../../assets/images/icon-driver.png')} style={styles.driverIcon} />
                <Text style={styles.driverName}>{d.fullName}</Text>
                <View style={styles.driverBadge}>
                  <Text style={styles.driverBadgeText}>Đã nhận</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Owner Contact */}
          <View style={styles.ownerContact}>
            <View>
              <Text style={styles.contactLabel}>Chủ xe:</Text>
              <Text style={styles.contactName}>{trip.owner?.companyName || trip.owner?.fullName}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Ionicons name="call" size={18} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- SECTION 4: CONTACT POINTS (SENDER / RECEIVER) --- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={20} color={COLORS.text} />
            <Text style={styles.cardTitle}>Liên Hệ Giao Nhận</Text>
          </View>

          {/* Sender */}
          <View style={[styles.contactBox, { backgroundColor: COLORS.senderBg }]}>
            <View style={styles.contactIconBox}>
              <MaterialCommunityIcons name="arrow-up-bold" size={20} color="#0369A1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactRoleLabel}>Người Gửi:</Text>
              <Text style={styles.contactPersonName}>
                {trip.contacts?.find(c => c.type === 'SENDER')?.fullName || 'N/A'}
              </Text>
              <Text style={styles.contactPhone}>
                {trip.contacts?.find(c => c.type === 'SENDER')?.phoneNumber || '---'}
              </Text>
            </View>
            <TouchableOpacity style={styles.phoneBtn}>
              <Ionicons name="call" size={20} color="#0369A1" />
            </TouchableOpacity>
          </View>

          {/* Receiver */}
          <View style={[styles.contactBox, { backgroundColor: COLORS.receiverBg, marginTop: 8 }]}>
            <View style={styles.contactIconBox}>
              <MaterialCommunityIcons name="arrow-down-bold" size={20} color="#C2410C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactRoleLabel}>Người Nhận:</Text>
              <Text style={styles.contactPersonName}>
                {trip.contacts?.find(c => c.type === 'RECEIVER')?.fullName || 'N/A'}
              </Text>
              <Text style={styles.contactPhone}>
                {trip.contacts?.find(c => c.type === 'RECEIVER')?.phoneNumber || '---'}
              </Text>
            </View>
            <TouchableOpacity style={styles.phoneBtn}>
              <Ionicons name="call" size={20} color="#C2410C" />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- SECTION 5: CONTRACT --- */}
        {renderContractCard()}

        <View style={{ height: 40 }} />
      </ScrollView>
    )
  }

  if (!visible) return null

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi Tiết Chuyến Đi</Text>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {renderContent()}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderColor: '#E5E7EB', paddingTop: 50
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  backBtn: { padding: 4 },
  errorText: { color: COLORS.danger, textAlign: 'center', marginTop: 20 },
  emptyText: { color: COLORS.textLight, fontStyle: 'italic', textAlign: 'center', padding: 20 },
  
  body: { paddingBottom: 40 },

  // --- MAP SECTION ---
  mapSection: { position: 'relative', marginBottom: 80 }, // Margin bottom để chừa chỗ cho card nổi
  mapPlaceholder: {
    height: 200, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center'
  },
  floatingRouteCard: {
    position: 'absolute', top: 120, left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5
  },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  tripCode: { fontWeight: '700', fontSize: 14, color: COLORS.text },
  tripStatusBadge: { backgroundColor: '#FFF7ED', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  tripStatusText: { fontSize: 10, color: '#C2410C', fontWeight: '700' },
  routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeNode: { alignItems: 'center', width: '30%' },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  dotText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  locationText: { fontSize: 12, textAlign: 'center', color: COLORS.text, fontWeight: '500' },
  routeLine: { flex: 1, alignItems: 'center', height: 40, justifyContent: 'center' },
  dashedLine: { width: '100%', height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.textLight, position: 'absolute', top: 20, zIndex: -1 },
  distanceText: { fontSize: 10, color: COLORS.textLight, marginBottom: 4, backgroundColor: '#fff', paddingHorizontal: 4 },

  // --- COMMON CARD ---
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 16,
    padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },

  // --- PACKAGE INFO ---
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8, gap: 6 },
  statValue: { fontWeight: '600', fontSize: 14, color: COLORS.text },
  pkgRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  pkgName: { fontSize: 14, color: COLORS.text },
  pkgCode: { fontSize: 12, color: COLORS.textLight },

  // --- TEAM INFO ---
  vehicleInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  vehicleImagePlaceholder: { width: 80, height: 60, backgroundColor: '#E5E7EB', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  vehiclePlate: { fontSize: 16, fontWeight: '700', color: COLORS.blue, backgroundColor: '#EFF6FF', alignSelf: 'flex-start', paddingHorizontal: 6, borderRadius: 4, marginBottom: 4 },
  vehicleType: { fontSize: 13, color: COLORS.textLight },
  driverList: { gap: 12 },
  driverItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  driverIcon: { width: 24, height: 24, marginRight: 8 },
  driverName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  driverBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  driverBadgeText: { fontSize: 11, color: '#059669', fontWeight: '600' },
  ownerContact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderColor: '#F3F4F6' },
  contactLabel: { fontSize: 12, color: COLORS.textLight },
  contactName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  
  // --- CONTACT BOXES ---
  contactBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12 },
  contactIconBox: { marginRight: 12 },
  contactRoleLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  contactPersonName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  contactPhone: { fontSize: 13, color: '#4B5563' },
  phoneBtn: { padding: 8, backgroundColor: '#fff', borderRadius: 20 },

  // --- CONTRACT ---
  contractContainer: { alignItems: 'center' },
  contractValue: { fontSize: 24, fontWeight: '800', color: '#059669', marginBottom: 4 },
  contractCode: { fontSize: 13, color: COLORS.textLight, marginBottom: 12 },
  statusTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  bgSuccess: { backgroundColor: '#10B981' },
  bgWarning: { backgroundColor: '#FDE047' },
  statusTagText: { fontSize: 12, fontWeight: '700' },
  signTimeline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  signNode: { alignItems: 'center', gap: 4 },
  signLabel: { fontSize: 12, color: COLORS.textLight },
  signLine: { flex: 1, height: 1, backgroundColor: COLORS.border, marginHorizontal: 8 },
  contractActions: { width: '100%', gap: 12 },
  actionBtn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnOutline: { borderWidth: 1, borderColor: COLORS.border },
  btnTextWhite: { color: '#fff', fontWeight: '700' },
  btnTextDark: { color: COLORS.text, fontWeight: '600' },
  
  callBtn: { padding: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 }
})

export default ProviderTripDetailModal