// import React, { useEffect, useState } from 'react'
// import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert, Linking, Modal } from 'react-native'
// import tripService from '@/services/tripService'
// import { TripDetailFullDTOExtended, Role } from '@/models/types'
// import { useAuth } from '@/hooks/useAuth'
// import { useRouter } from 'expo-router'
// import walletService from '@/services/walletService'

// interface ProviderTripDetailProps {
//   tripId?: string
//   showHeader?: boolean
//   onBack?: () => void
// }

// const statusColor = (status: string) => {
//   const map: Record<string, string> = {
//     CREATED: '#3B82F6',
//     AWAITING_PROVIDER_CONTRACT: '#F59E0B',
//     AWAITING_PROVIDER_PAYMENT: '#D97706',
//     PENDING_DRIVER_ASSIGNMENT: '#6366F1',
//     AWAITING_DRIVER_CONTRACT: '#8B5CF6',
//     READY_FOR_VEHICLE_HANDOVER: '#0EA5E9',
//     VEHICLE_HANDOVER: '#06B6D4',
//     LOADING: '#0891B2',
//     IN_TRANSIT: '#10B981',
//     UNLOADING: '#34D399',
//     DELIVERED: '#059669',
//     RETURNING_VEHICLE: '#4ADE80',
//     VEHICLE_RETURNED: '#22C55E',
//     AWAITING_FINAL_PROVIDER_PAYMENT: '#FBBF24',
//     AWAITING_DRIVER_PAYOUT: '#F59E0B',
//     COMPLETED: '#15803D',
//     CANCELLED: '#EF4444',
//     DELETED: '#9CA3AF'
//   }
//   return map[status] || '#6B7280'
// }

// const ProviderTripDetail: React.FC<ProviderTripDetailProps> = ({ tripId, showHeader = true, onBack }) => {
//   const router = useRouter()
//   const { user } = useAuth()
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState<string | null>(null)
//   const [trip, setTrip] = useState<TripDetailFullDTOExtended | null>(null)
//   const [signing, setSigning] = useState(false)
//   const [showContractModal, setShowContractModal] = useState(false)
//   const [paying, setPaying] = useState(false)
//   // Simplified payment bar: detailed wallet check moved to pay-trip screen

//   useEffect(() => { if (tripId) fetchTrip(tripId) }, [tripId])

//   const fetchTrip = async (id: string) => {
//     setLoading(true); setError(null)
//     try {
//       const res = await tripService.getById(id)
//       if (res.isSuccess && res.result) {
//         setTrip({
//           ...res.result,
//           deliveryRecords: res.result.deliveryRecords || [],
//           compensations: res.result.compensations || [],
//           issues: res.result.issues || []
//         })
//       } else throw new Error(res.message || 'Không tải được chuyến')
//     } catch (e: any) { setError(e?.message || 'Lỗi không xác định') } finally { setLoading(false) }
//   }

//   const providerContract = trip?.providerContracts
//   const isProviderUser = user?.role === Role.PROVIDER
//   const ownerSigned = !!providerContract?.ownerSigned
//   const providerSigned = !!providerContract?.counterpartySigned
//   const bothSigned = ownerSigned && providerSigned
//   const waitingForOther = providerSigned && !ownerSigned
//   const canSign = isProviderUser && !providerSigned
//   const signBtnLabel = bothSigned ? 'Đã hoàn tất' : waitingForOther ? 'Đợi đối phương' : 'Ký hợp đồng'

//   const paymentEligibleStatuses = ['AWAITING_PROVIDER_PAYMENT','AWAITING_FINAL_PROVIDER_PAYMENT']
//   const showPayment = paymentEligibleStatuses.includes(trip?.status || '')
//   const paymentLabel = trip?.status === 'AWAITING_FINAL_PROVIDER_PAYMENT' ? 'Quyết toán cuối' : 'Thanh toán'

//   const handleSign = async () => {
//     if (!providerContract?.contractId || !canSign) return
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
//       // Refresh trip data from server to ensure latest status/contract info
//       const refreshId = (tripId || (trip as any)?.tripId || (trip as any)?.id) as string | undefined
//       if (refreshId) {
//         await fetchTrip(refreshId)
//       }
//       Alert.alert('Ký hợp đồng', 'Ký thành công')
//     } catch (e: any) { Alert.alert('Ký hợp đồng', e?.message || 'Có lỗi xảy ra') } finally { setSigning(false) }
//   }

//   const goToPayment = () => {
//     if (!tripId) return
//     try { router.push({ pathname: '/owner-v2/payment-qr', params: { tripId } } as any) } catch { Alert.alert('Thanh toán', 'Không thể mở màn hình thanh toán.') }
//   }

//   const navigateToPaymentFlow = () => {
//     if (!trip || !providerContract) return
//     const redirect = encodeURIComponent(`/(provider)/trip-detail?tripId=${tripId}`)
//     router.push({
//       pathname: '/(wallet)/pay-trip',
//       params: {
//         tripId: tripId as string,
//         amount: String(providerContract.contractValue || 0),
//         contractCode: providerContract.contractCode || '',
//         redirect
//       }
//     } as any)
//   }

//   const openContractPdf = async () => {
//     if (!providerContract?.contractId) return
//     try {
//       const direct = providerContract.fileURL ? providerContract.fileURL + (providerContract.fileURL.includes('?') ? '&' : '?') + 'includeTerms=true' : null
//       if (direct) {
//         await Linking.openURL(direct)
//         return
//       }
//       const anyService: any = tripService as any
//       if (typeof anyService.getProviderContractPdfLink === 'function') {
//         const res = await anyService.getProviderContractPdfLink(providerContract.contractId, true)
//         const url = typeof res === 'string' ? res : res?.url
//         if (url) {
//           await Linking.openURL(url)
//           return
//         }
//       }
//       Alert.alert('PDF', 'Không tìm thấy file PDF hợp đồng.')
//     } catch {
//       Alert.alert('PDF', 'Không mở được file hợp đồng.')
//     }
//   }

//   const renderContractSummary = () => {
//     if (!providerContract?.contractId) return <Text style={styles.empty}>Chưa có hợp đồng.</Text>
//     const isFullySigned = bothSigned || providerContract.status === 'SIGNED' || providerContract.status === 'COMPLETED'
//     return (
//       <TouchableOpacity activeOpacity={0.9} onPress={() => setShowContractModal(true)} style={styles.contractBox}>
// <Text style={styles.contractHeaderTitle}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
// <Text style={styles.contractHeaderSubtitle}>Độc lập - Tự do - Hạnh phúc</Text>
// <Text style={styles.contractHeaderLine}>---o0o---</Text>
// <Text style={styles.contractTitle}>HỢP ĐỒNG VẬN TẢI</Text>
// <Text style={styles.contractCode}>Số: {providerContract.contractCode}</Text>
// <View style={styles.rowBetween}>
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Trạng thái</Text>
// <Text style={[styles.value, { color: isFullySigned ? '#059669' : '#D97706' }]}>{isFullySigned ? 'Đã ký' : providerContract.status}</Text>
// </View>
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Giá trị</Text>
// <Text style={styles.value}>{providerContract.contractValue?.toLocaleString('vi-VN')} {providerContract.currency}</Text>
// </View>
// </View>
// <View style={[styles.signRow, { marginTop: 8 }]}>
// <View style={styles.signCol}>
// <Text style={styles.signLabel}>Bên A</Text>
// <Text style={[styles.signStatus, { color: ownerSigned ? '#059669' : '#6B7280' }]}>{ownerSigned ? 'Đã ký' : 'Chưa ký'}</Text>
// </View>
// <View style={styles.signCol}>
// <Text style={styles.signLabel}>Bên B</Text>
// <Text style={[styles.signStatus, { color: providerSigned ? '#059669' : '#6B7280' }]}>{providerSigned ? 'Đã ký' : 'Chưa ký'}</Text>
// </View>
// </View>
// <Text style={styles.summaryHint}>Nhấn để xem chi tiết điều khoản và ký.</Text>
// </TouchableOpacity>
//     )
//   }

//   const renderContractModal = () => {
//     if (!showContractModal) return null
//     if (!providerContract?.contractId) return null
//     const isFullySigned = bothSigned || providerContract.status === 'SIGNED' || providerContract.status === 'COMPLETED'
//     const terms = (providerContract.terms || []).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
//     return (
//       <Modal visible transparent animationType="fade" onRequestClose={() => setShowContractModal(false)}>
// <View style={styles.modalBackdrop}>
// <View style={styles.modalCard}>
// <View style={styles.modalHeader}>
// <Text style={styles.modalTitle}>Hợp đồng vận tải</Text>
// <TouchableOpacity onPress={() => setShowContractModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
// <Text style={styles.closeX}>×</Text>
// </TouchableOpacity>
// </View>
// <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
// <Text style={styles.contractHeaderTitle}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
// <Text style={styles.contractHeaderSubtitle}>Độc lập - Tự do - Hạnh phúc</Text>
// <Text style={styles.contractHeaderLine}>---o0o---</Text>
// <Text style={styles.contractTitle}>HỢP ĐỒNG VẬN TẢI</Text>
// <Text style={styles.contractCode}>Số: {providerContract.contractCode}</Text>
// <View style={styles.rowBetween}>
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Trạng thái</Text>
// <Text style={[styles.value, { color: isFullySigned ? '#059669' : '#D97706' }]}>{isFullySigned ? 'Đã ký' : providerContract.status}</Text>
// </View>
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Giá trị</Text>
// <Text style={styles.value}>{providerContract.contractValue?.toLocaleString('vi-VN')} {providerContract.currency}</Text>
// </View>
// </View>
// <Text style={styles.modalSectionTitle}>Các bên tham gia</Text>
// <View style={styles.signatureRow}>
// <View style={styles.signatureCol}>
// <Text style={styles.signatureTitle}>BÊN A (Owner)</Text>
// <Text style={styles.signatureHint}>{ownerSigned ? 'Đã ký' : 'Chưa ký'}</Text>
// <View style={styles.signatureBox} />
//                   {ownerSigned && <View style={styles.signatureStamp}><Text style={styles.signatureStampText}>Ký {providerContract.ownerSignAt ? new Date(providerContract.ownerSignAt).toLocaleDateString('vi-VN') : ''}</Text></View>}
//                 </View>
// <View style={styles.signatureCol}>
// <Text style={styles.signatureTitle}>BÊN B (Provider)</Text>
// <Text style={styles.signatureHint}>{providerSigned ? 'Đã ký' : 'Chưa ký'}</Text>
// <View style={styles.signatureBox} />
//                   {providerSigned && <View style={styles.signatureStamp}><Text style={styles.signatureStampText}>Ký {providerContract.counterpartySignAt ? new Date(providerContract.counterpartySignAt).toLocaleDateString('vi-VN') : ''}</Text></View>}
//                 </View>
// </View>
// <Text style={styles.modalSectionTitle}>Điều khoản</Text>
// <View style={styles.termsContainer}>
//                 {terms.length === 0 ? <Text style={styles.empty}>Không có điều khoản.</Text> : terms.map((t: any, idx: number) => (
//                   <View key={t.contractTermId || idx} style={styles.termRow}>
// <Text style={styles.termOrder}>{(t.order ?? idx + 1)}</Text>
// <Text style={styles.termContent}>{t.content || t.termContent || ''}</Text>
// </View>
//                 ))}
//               </View>
// <View style={styles.modalActionsRow}>
// <TouchableOpacity style={[styles.modalActionBtn, (!canSign ? styles.btnDisabled : styles.btnPrimary)]} disabled={!canSign || signing} onPress={handleSign}>
//                   {signing ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalActionText}>{signBtnLabel}</Text>}
//                 </TouchableOpacity>
// <TouchableOpacity style={[styles.modalActionBtn, styles.btnSecondary]} onPress={openContractPdf}>
// <Text style={[styles.modalActionText, { color: '#111827' }]}>Xem PDF</Text>
// </TouchableOpacity>
// </View>
// <Text style={styles.waitingNote}>{waitingForOther && !bothSigned ? 'Bạn đã ký, đang đợi đối phương.' : (!canSign && !bothSigned ? 'Đang chờ bên ký còn lại.' : '')}</Text>
// </ScrollView>
// </View>
// </View>
// </Modal>
//     )
//   }

//   const renderContent = () => {
//     if (loading) return <View style={styles.center}><ActivityIndicator color="#4F46E5" /><Text style={styles.loadingText}>Đang tải chuyến...</Text></View>
//     if (error) return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
//     if (!trip) return null
//     const color = statusColor(trip.status)
//     return (
//       <ScrollView contentContainerStyle={styles.scrollContent}>
// <View style={styles.headerBlock}>
// <Text style={styles.tripCode}>{trip.tripCode}</Text>
// <View style={[styles.statusBadge, { borderColor: color, backgroundColor: color + '22' }]}><Text style={[styles.statusBadgeText, { color }]}>{trip.status}</Text></View>
// </View>
// <Text style={styles.routeText}>{trip.shippingRoute?.startAddress || 'N/A'} → {trip.shippingRoute?.endAddress || 'N/A'}</Text>
// <View style={styles.metaGrid}>
// <View style={styles.metaItem}><Text style={styles.metaLabel}>Xe</Text><Text style={styles.metaValue}>{trip.vehicle?.plateNumber || 'N/A'}</Text></View>
// <View style={styles.metaItem}><Text style={styles.metaLabel}>Loại xe</Text><Text style={styles.metaValue}>{trip.vehicle?.vehicleTypeName || 'N/A'}</Text></View>
// <View style={styles.metaItem}><Text style={styles.metaLabel}>Gói hàng</Text><Text style={styles.metaValue}>{(trip.packages || []).length}</Text></View>
// <View style={styles.metaItem}><Text style={styles.metaLabel}>Tài xế</Text><Text style={styles.metaValue}>{(trip.drivers || []).length}</Text></View>
// </View>
// <View style={styles.section}><Text style={styles.sectionTitle}>Hợp đồng</Text>{renderContractSummary()}</View>
// <View style={styles.section}><Text style={styles.sectionTitle}>Tài xế</Text>{(trip.drivers || []).length === 0 ? <Text style={styles.empty}>Chưa có tài xế.</Text> : (trip.drivers || []).map(d => <View key={d.driverId} style={styles.rowBetween}><Text style={styles.label}>{d.fullName}</Text><Text style={styles.value}>{d.assignmentStatus}</Text></View>)}</View>
// <View style={styles.section}><Text style={styles.sectionTitle}>Theo dõi</Text><Text style={styles.trackText}>Quãng đường: {trip.tripRoute?.distanceKm?.toFixed(1) || 0} km | Thời gian dự kiến: {Math.round(trip.tripRoute?.durationMinutes || 0)} phút</Text><Text style={styles.trackSub}>Nhật ký: {(trip.deliveryRecords || []).length} | Sự cố: {(trip.issues || []).length} | Bồi thường: {(trip.compensations || []).length}</Text></View>
// <View style={{ height: showPayment ? 96 : 28 }} />
// </ScrollView>
//     )
//   }

//   const contractModal = renderContractModal()
//   return showHeader ? (
//     <SafeAreaView style={styles.container}>
// <View style={styles.topBar}>
// <TouchableOpacity onPress={() => (onBack ? onBack() : router.back())} style={styles.backBtn}><Text style={styles.backTxt}>◀</Text></TouchableOpacity>
// <Text style={styles.screenTitle}>Chi tiết chuyến (Provider)</Text>
// <View style={{ width: 32 }} />
// </View>
//       {renderContent()}
//       {showPayment && (
//         <View style={styles.payBar}>
// <View style={{ flex: 1 }}>
// <Text style={styles.payTitle}>Thanh toán hợp đồng</Text>
// <Text style={styles.paySub}>{providerContract?.contractValue?.toLocaleString('vi-VN')} {providerContract?.currency}</Text>
// </View>
// <TouchableOpacity style={[styles.payBtn, styles.payBtnPrimary]} onPress={navigateToPaymentFlow}>
// <Text style={styles.payBtnText}>{paymentLabel}</Text>
// </TouchableOpacity>
// </View>
//       )}
//       {contractModal}
//     </SafeAreaView>
//   ) : (
//     <>
//       {renderContent()}
//       {showPayment && (
//         <View style={styles.payBar}>
// <View style={{ flex: 1 }}>
// <Text style={styles.payTitle}>Thanh toán hợp đồng</Text>
// <Text style={styles.paySub}>{providerContract?.contractValue?.toLocaleString('vi-VN')} {providerContract?.currency}</Text>
// </View>
// <TouchableOpacity style={[styles.payBtn, styles.payBtnPrimary]} onPress={navigateToPaymentFlow}>
// <Text style={styles.payBtnText}>{paymentLabel}</Text>
// </TouchableOpacity>
// </View>
//       )}
//       {contractModal}
//     </>
//   )
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F3F4F6' },
//   topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
//   backBtn: { padding: 6 },
//   backTxt: { fontSize: 18, fontWeight: '600', color: '#111827' },
//   screenTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
//   center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
//   loadingText: { marginTop: 8, color: '#6B7280' },
//   errorText: { color: '#EF4444', textAlign: 'center' },
//   scrollContent: { padding: 16, paddingBottom: 12 },
//   headerBlock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
//   tripCode: { fontSize: 18, fontWeight: '800', color: '#111827' },
//   statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1 },
//   statusBadgeText: { fontSize: 12, fontWeight: '700' },
//   routeText: { fontSize: 14, fontWeight: '600', color: '#4F46E5', marginBottom: 12 },
//   metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginBottom: 16 },
//   metaItem: { width: '50%', paddingHorizontal: 6, marginBottom: 10 },
//   metaLabel: { fontSize: 12, color: '#6B7280' },
//   metaValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
//   section: { marginBottom: 18 },
//   sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
//   empty: { fontStyle: 'italic', color: '#6B7280' },
//   contractBox: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, backgroundColor: '#FFFFFF' },
//   contractHeaderTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center', color: '#111827' },
//   contractHeaderSubtitle: { fontSize: 13, fontWeight: '600', textAlign: 'center', color: '#111827', textDecorationLine: 'underline' },
//   contractHeaderLine: { fontSize: 12, textAlign: 'center', color: '#374151', marginVertical: 8 },
//   contractTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', color: '#111827', marginVertical: 12 },
//   contractCode: { fontSize: 12, fontStyle: 'italic', textAlign: 'center', color: '#6B7280', marginBottom: 16 },
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
//   trackSub: { fontSize: 12, color: '#6B7280' },
//   termsContainer: { marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
//   termsTitle: { fontWeight: '700', fontSize: 15, marginBottom: 8, color: '#111827' },
//   termRow: { flexDirection: 'row', marginBottom: 6 },
//   termOrder: { width: 24, fontWeight: '700', color: '#374151' },
//   termContent: { flex: 1, color: '#111827' },
//   signatureStamp: { position: 'absolute', top: 6, right: 6, backgroundColor: '#E0F2FE', borderColor: '#38BDF8', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
//   signatureStampText: { color: '#075985', fontWeight: '800', fontSize: 11 }
//   ,summaryHint: { marginTop: 8, color: '#6B7280', fontSize: 12, textAlign: 'center' },
//   modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
//   modalCard: { width: '100%', maxWidth: 560, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 16 },
//   modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
//   modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
//   closeX: { fontSize: 28, lineHeight: 28, color: '#6B7280' },
//   modalSectionTitle: { fontWeight: '700', marginTop: 16, marginBottom: 8, color: '#111827' },
//   signatureRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
//   signatureCol: { flex: 1, position: 'relative', paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#F9FAFB' },
//   signatureTitle: { fontWeight: '700', color: '#111827', marginBottom: 4 },
//   signatureHint: { color: '#6B7280', marginBottom: 6, fontSize: 12 },
//   signatureBox: { height: 70, width: '90%', borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 6 },
//   modalActionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
//   modalActionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
//   modalActionText: { fontWeight: '700', color: '#FFFFFF' },
//   waitingNote: { marginTop: 12, textAlign: 'center', color: '#6B7280', fontSize: 12 }
//   ,payBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopColor: '#E5E7EB', borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
//   payTitle: { fontSize: 12, color: '#6B7280' },
//   paySub: { fontSize: 14, fontWeight: '800', color: '#111827' },
//   payBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, minWidth: 140, alignItems: 'center' },
//   payBtnPrimary: { backgroundColor: '#2563EB' },
//   payBtnDisabled: { backgroundColor: '#93C5FD' },
//   payBtnText: { color: '#FFFFFF', fontWeight: '800' }
// })

// export default ProviderTripDetail


import React, { useEffect, useState } from 'react'
import {
  SafeAreaView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert, Linking, Modal, Image, Dimensions
} from 'react-native'
import tripService from '@/services/tripService'
import { TripDetailFullDTOExtended, Role } from '@/models/types'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'expo-router'
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons'
import NativeRouteMap from '@/components/map/NativeRouteMap'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { decodePolyline } from '@/utils/polyline'
import Svg, { Polyline as SvgPolyline, Circle as SvgCircle } from 'react-native-svg'

interface ProviderTripDetailProps {
  tripId?: string
  showHeader?: boolean
  onBack?: () => void
}

const { width } = Dimensions.get('window')

// Lightweight SVG preview for encoded route polyline (works in Expo Go)
const MapPreview: React.FC<{ routeData: string; style?: any; precision?: number }> = ({ routeData, style = {}, precision = 5 }) => {
  try {
    const decoded = decodePolyline(routeData, precision)
    const coords = (decoded && decoded.coordinates) || []
    if (!coords || coords.length === 0) return (
      <View style={[{ height: 220, alignItems: 'center', justifyContent: 'center' }, style]}>
        <MaterialCommunityIcons name="map" size={48} color="#9CA3AF" />
        <Text style={{ color: '#6B7280', marginTop: 8 }}>No route preview</Text>
      </View>
    )

    const padding = 12
    const vw = typeof style.width === 'number' ? style.width : width - 32
    const vh = typeof style.height === 'number' ? style.height : 220

    const lons = coords.map(c => c[0])
    const lats = coords.map(c => c[1])
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    const w = Math.max(1, vw - padding * 2)
    const h = Math.max(1, vh - padding * 2)

    const normalize = (lon: number, lat: number) => {
      const x = (maxLon === minLon) ? w / 2 : ((lon - minLon) / (maxLon - minLon)) * w
      const yFrac = (maxLat === minLat) ? 0.5 : ((lat - minLat) / (maxLat - minLat))
      const y = (1 - yFrac) * h
      return { x: padding + x, y: padding + y }
    }

    const points = coords.map(c => {
      const p = normalize(c[0], c[1])
      return `${p.x},${p.y}`
    }).join(' ')

    const start = normalize(coords[0][0], coords[0][1])
    const end = normalize(coords[coords.length - 1][0], coords[coords.length - 1][1])

    return (
      <View style={[{ height: vh, width: vw, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' }, style]}>
        <Svg width={vw} height={vh}>
          <SvgPolyline points={points} fill="none" stroke="#2563EB" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <SvgCircle cx={start.x} cy={start.y} r={6} fill="#10B981" />
          <SvgCircle cx={end.x} cy={end.y} r={6} fill="#EF4444" />
        </Svg>
      </View>
    )
  } catch (e) {
    return (
      <View style={[{ height: 220, alignItems: 'center', justifyContent: 'center' }, style]}>
        <MaterialCommunityIcons name="map" size={48} color="#9CA3AF" />
        <Text style={{ color: '#6B7280', marginTop: 8 }}>Preview error</Text>
      </View>
    )
  }
}

// --- PALETTE MÀU SẮC ---
const COLORS = {
  primary: '#0284C7', // Xanh dương đậm
  bg: '#F3F4F6',      // Nền xám nhạt
  white: '#FFFFFF',
  text: '#1F2937',    // Đen xám
  textLight: '#6B7280', // Xám nhạt
  border: '#E5E7EB',
  success: '#10B981', // Xanh lá
  warning: '#F59E0B', // Cam
  danger: '#EF4444',  // Đỏ
  blue: '#3B82F6',    // Xanh dương
  orangeBadge: '#F97316', // Màu cam badge
  
  // Màu nền contact
  senderBg: '#DBEAFE',   // Xanh nhạt
  receiverBg: '#FFEDD5', // Cam nhạt
}

const ProviderTripDetail: React.FC<ProviderTripDetailProps> = ({ tripId, showHeader = true, onBack }) => {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trip, setTrip] = useState<TripDetailFullDTOExtended | null>(null)
  const [signing, setSigning] = useState(false)
  const [showContractModal, setShowContractModal] = useState(false)

  useEffect(() => { if (tripId) fetchTrip(tripId) }, [tripId])

  const fetchTrip = async (id: string) => {
    setLoading(true); setError(null)
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
    } catch (e: any) { setError(e?.message || 'Lỗi không xác định') } finally { setLoading(false) }
  }

  // --- LOGIC ---
  const providerContract = trip?.providerContracts
  const isProviderUser = user?.role === Role.PROVIDER
  const ownerSigned = !!providerContract?.ownerSigned
  const providerSigned = !!providerContract?.counterpartySigned
  const bothSigned = ownerSigned && providerSigned
  const waitingForOther = providerSigned && !ownerSigned
  const canSign = isProviderUser && !providerSigned
  const signBtnLabel = bothSigned ? 'Đã hoàn tất' : (!providerSigned ? 'Ký ngay' : 'Đợi đối tác')

  const paymentEligibleStatuses = ['AWAITING_PROVIDER_PAYMENT','AWAITING_FINAL_PROVIDER_PAYMENT']
  const showPayment = paymentEligibleStatuses.includes(trip?.status || '')
  const paymentLabel = trip?.status === 'AWAITING_FINAL_PROVIDER_PAYMENT' ? 'Quyết toán cuối' : 'Thanh toán'

  const handleSign = async () => {
    if (!providerContract?.contractId || !canSign) return
    setSigning(true)
    try {
      const response: any = await tripService.signProviderContract(providerContract.contractId)
      if (response?.isSuccess || response?.statusCode === 200) {
        Alert.alert('Thành công', 'Đã ký hợp đồng!')
        if (tripId) fetchTrip(tripId)
      } else throw new Error(response?.message || 'Ký thất bại')
    } catch (e: any) { Alert.alert('Lỗi', e?.message || 'Có lỗi xảy ra') } finally { setSigning(false) }
  }

  const navigateToPaymentFlow = () => {
    if (!trip || !providerContract) return
    const redirect = encodeURIComponent(`/(provider)/trip-detail?tripId=${tripId}`)
    router.push({
      pathname: '/(wallet)/pay-trip',
      params: { tripId: tripId as string, amount: String(providerContract.contractValue || 0), contractCode: providerContract.contractCode || '', redirect }
    } as any)
  }

  const openContractPdf = async () => {
    if (!providerContract?.contractId) return
    try {
      // Logic mở PDF (giả lập)
      Alert.alert('PDF', 'Đang mở file hợp đồng...')
    } catch { Alert.alert('Lỗi', 'Không mở được file.') }
  }

  // --- COMPONENTS ---

  // 1. Modal Hợp đồng Chi tiết (giữ modal gọn, hiển thị điều khoản và nút ký)
  const renderContractModal = () => {
    if (!showContractModal) return null
    if (!providerContract?.contractId) return null

    const terms = (providerContract.terms || []).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))

    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => setShowContractModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hợp đồng vận tải</Text>
              <TouchableOpacity onPress={() => setShowContractModal(false)}>
                <Text style={styles.closeX}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={styles.contractHeaderTitle}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
              <Text style={styles.contractHeaderSubtitle}>Độc lập - Tự do - Hạnh phúc</Text>
              <Text style={styles.contractHeaderLine}>---o0o---</Text>
              <Text style={styles.contractTitle}>HỢP ĐỒNG VẬN TẢI</Text>
              <Text style={styles.contractCode}>Số: {providerContract.contractCode}</Text>

              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Trạng thái</Text>
                  <Text style={[styles.value, { color: providerContract.status === 'COMPLETED' ? COLORS.success : COLORS.warning }]}>{providerContract.status}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Giá trị</Text>
                  <Text style={styles.value}>{providerContract.contractValue?.toLocaleString('vi-VN')} {providerContract.currency}</Text>
                </View>
              </View>

              <Text style={styles.modalSectionTitle}>Các bên tham gia</Text>
              <View style={styles.signatureRow}>
                <View style={styles.signatureCol}>
                  <Text style={styles.signatureTitle}>BÊN A (Owner)</Text>
                  <View style={styles.signatureBox} />
                  <Text style={styles.signatureHint}>{ownerSigned ? `Đã ký ${providerContract.ownerSignAt ? new Date(providerContract.ownerSignAt).toLocaleDateString('vi-VN') : ''}` : 'Chưa ký'}</Text>
                </View>
                <View style={styles.signatureCol}>
                  <Text style={styles.signatureTitle}>BÊN B (Provider)</Text>
                  <View style={styles.signatureBox} />
                  <Text style={styles.signatureHint}>{providerSigned ? `Đã ký ${providerContract.counterpartySignAt ? new Date(providerContract.counterpartySignAt).toLocaleDateString('vi-VN') : ''}` : 'Chưa ký'}</Text>
                </View>
              </View>

              <Text style={styles.modalSectionTitle}>Điều khoản</Text>
              <View style={styles.termsContainer}>
                {terms.length === 0 ? <Text style={styles.empty}>Không có điều khoản.</Text> : terms.map((t: any, idx: number) => (
                  <View key={t.contractTermId || idx} style={styles.termRow}>
                    <Text style={styles.termOrder}>{(t.order ?? idx + 1)}</Text>
                    <Text style={styles.termContent}>{t.content || t.termContent || ''}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={[styles.modalActionBtn, (!canSign ? styles.btnDisabled : styles.btnPrimary)]} disabled={!canSign || signing} onPress={handleSign}>
                  {signing ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalActionText}>{signBtnLabel}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalActionBtn, styles.btnSecondary]} onPress={openContractPdf}>
                  <Text style={[styles.modalActionText, { color: '#111827' }]}>Xem PDF</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.waitingNote}>{waitingForOther && !bothSigned ? 'Bạn đã ký, đang đợi đối phương.' : (!canSign && !bothSigned ? 'Đang chờ bên ký còn lại.' : '')}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    )
  }

  // 2. Card Tóm tắt Hợp đồng (Hiển thị trên trang)
  const renderContractSummary = () => {
    if (!providerContract?.contractId) return null
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text-outline" size={20} color={COLORS.text} />
          <Text style={styles.cardTitle}>Hợp Đồng Vận Chuyển</Text>
        </View>
        
        <TouchableOpacity activeOpacity={0.9} onPress={() => setShowContractModal(true)} style={styles.contractContainer}>
          <Text style={styles.contractValue}>{providerContract.contractValue?.toLocaleString()} VND</Text>
          <Text style={styles.contractCodeSub}>Mã HĐ: {providerContract.contractCode}</Text>
          
          <View style={[styles.statusTag, bothSigned ? styles.bgSuccess : styles.bgWarning]}>
            <Text style={[styles.statusTagText, bothSigned ? {color: '#fff'} : {color: '#78350F'}]}>
              {bothSigned ? '✔ HOÀN TẤT (Đã ký)' : '⚠ ĐANG CHỜ KÝ'}
            </Text>
          </View>

          {/* Timeline visual */}
          <View style={styles.signTimeline}>
            <View style={styles.signNode}>
              <Text style={styles.signLabel}>Chủ xe</Text>
              <Ionicons name={ownerSigned ? "checkmark-circle" : "ellipse-outline"} size={24} color={ownerSigned ? COLORS.success : COLORS.border} />
            </View>
            <View style={styles.signLine} />
            <View style={styles.signNode}>
              <Text style={styles.signLabel}>Đối tác</Text>
              <Ionicons name={providerSigned ? "checkmark-circle" : "ellipse-outline"} size={24} color={providerSigned ? COLORS.success : COLORS.border} />
            </View>
          </View>
          
          <Text style={styles.tapToViewText}>Chạm để xem chi tiết hợp đồng</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const renderContent = () => {
    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
    if (error) return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
    if (!trip) return null

    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- 1. MAP & ROUTE HEADER --- */}
        <View style={styles.mapSection}>
          <View style={styles.statusBanner}>
            <Text style={styles.statusBannerText}>{trip.status}</Text>
          </View>
            {trip?.tripRoute?.routeData ? (
              (Constants?.appOwnership === 'expo' || Platform.OS === 'web') ? (
                <MapPreview routeData={trip.tripRoute.routeData} style={{ height: 220, width: '100%' }} />
              ) : (
                <NativeRouteMap routeData={trip.tripRoute.routeData} style={{ height: 220, width: '100%' }} />
              )
            ) : (
              <View style={styles.mapPlaceholder}>
                <MaterialCommunityIcons name="map" size={80} color="#CBD5E1" />
              </View>
            )}
        </View>

        {/* Route Card - placed after map so it does not overlap */}
        <View style={styles.routeCard}>
            <View style={{alignItems: 'center', marginBottom: 8}}>
               <Text style={styles.tripCode}>Trip Code: {trip.tripCode}</Text>
            </View>
            <View style={styles.routeRow}>
              <View style={styles.routeNode}>
                <View style={[styles.dot, {backgroundColor: COLORS.blue}]}><Text style={styles.dotText}>A</Text></View>
              </View>
              <View style={styles.routeLine}>
                <View style={styles.dashedLine} />
                <View style={styles.truckIconBox}><MaterialCommunityIcons name="truck-fast" size={14} color={COLORS.orangeBadge} /></View>
              </View>
              <View style={styles.routeNode}>
                <View style={[styles.dot, {backgroundColor: COLORS.danger}]}><Text style={styles.dotText}>B</Text></View>
              </View>
            </View>
            <View style={styles.addressRow}>
               <Text style={[styles.addressText, {textAlign: 'left'}]} numberOfLines={2}>{trip.shippingRoute?.startAddress}</Text>
               <Text style={[styles.addressText, {textAlign: 'right'}]} numberOfLines={2}>{trip.shippingRoute?.endAddress}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.routeStats}>
              <Text style={styles.routeStatText}>🏁 {trip.tripRoute?.distanceKm?.toFixed(0) ?? '-'} km</Text>
              <Text style={styles.routeStatText}>🕒 ~{Math.round((trip.tripRoute?.durationMinutes ?? 0)/60)}h</Text>
              <Text style={styles.routeStatText}>📅 {new Date(trip.createAt || new Date()).toLocaleDateString('vi-VN')}</Text>
            </View>
          </View>

        {/* --- 2. GRID: HÀNG HÓA & XE --- */}
        <View style={styles.gridContainer}>
            {/* Cột Trái: Hàng */}
            <View style={[styles.card, styles.gridItem]}>
                <Text style={styles.cardTitleSmall}>📦 Hàng Hóa</Text>
                <View style={styles.specRow}>
                    <View style={styles.specBox}>
                        <MaterialCommunityIcons name="weight-kilogram" size={14} color={COLORS.text} />
                        <Text style={styles.specValue}>{(trip.packages || []).reduce((a,b)=>a+(b.weight||0),0)} kg</Text>
                    </View>
                    <View style={styles.specBox}>
                        <MaterialCommunityIcons name="cube-outline" size={14} color={COLORS.text} />
                        <Text style={styles.specValue}>{(trip.packages || []).reduce((a,b)=>a+(b.volume||0),0)} m³</Text>
                    </View>
                </View>
                {(trip.packages || []).slice(0, 3).map((p, i) => (
                  <View key={p.packageId || i} style={{marginTop: 8, flexDirection: 'row', alignItems: 'center'}}>
                    <View style={styles.packageThumbWrap}>
                      {p.imageUrls && p.imageUrls.length > 0 ? (
                        <Image source={{ uri: p.imageUrls[0] }} style={styles.packageThumb} />
                      ) : (
                        <View style={styles.packageThumbPlaceholder}><MaterialCommunityIcons name="package-variant" size={22} color="#9CA3AF" /></View>
                      )}
                    </View>
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.pkgSpec}>{p.packageCode}</Text>
                      <View style={styles.itemRow}>
                        {p.items && p.items.length > 0 && p.items[0].images && p.items[0].images.length > 0 ? (
                          <Image source={{ uri: p.items[0].images[0] }} style={styles.itemImage} />
                        ) : (
                          <View style={styles.itemImagePlaceholder}><MaterialCommunityIcons name="image-off-outline" size={18} color="#9CA3AF" /></View>
                        )}
                        <View style={{ marginLeft: 8, flex: 1 }}>
                          <Text style={styles.pkgItem}>{p.items && p.items.length > 0 ? p.items[0].itemName || p.items[0].itemName || 'Item' : 'No items'}</Text>
                          {p.items && p.items.length > 0 && typeof p.items[0].declaredValue !== 'undefined' && (
                            <Text style={styles.smallMuted}>{Number(p.items[0].declaredValue).toLocaleString('vi-VN')} VND</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
            </View>

            {/* Cột Phải: Xe */}
            <View style={[styles.card, styles.gridItem]}>
                <Text style={styles.cardTitleSmall}>🚛 Phương Tiện</Text>
                <View style={styles.vehicleThumb}>
                  {trip.vehicle?.imageUrls && trip.vehicle.imageUrls.length > 0 ? (
                    <Image source={{ uri: trip.vehicle.imageUrls[0] }} style={styles.vehicleImage} />
                  ) : (
                    <MaterialCommunityIcons name="truck" size={32} color="#9CA3AF" />
                  )}
                </View>
                <View style={styles.plateBadge}><Text style={styles.plateText}>{trip.vehicle?.plateNumber || '---'}</Text></View>
                <Text style={styles.vehicleModel}>{trip.vehicle?.vehicleTypeName}</Text>
                {/* Driver Compact */}
                <View style={styles.driverRowCompact}>
                    <Ionicons name="person-circle" size={18} color={COLORS.textLight} />
                    <Text style={styles.driverNameCompact} numberOfLines={1}>{(trip.drivers && trip.drivers.length > 0) ? trip.drivers[0].fullName : 'Chưa có TX'}</Text>
                </View>
            </View>
        </View>

        {/* --- 3. LIÊN HỆ --- */}
        <View style={styles.card}>
            <Text style={[styles.cardTitle, {marginBottom: 12}]}>📞 Điểm Giao & Nhận</Text>
            <View style={[styles.contactRow, {backgroundColor: COLORS.senderBg}]}>
                <View style={styles.contactIconBox}><MaterialCommunityIcons name="arrow-up-bold" size={20} color={COLORS.primary} /></View>
                <View style={{flex: 1}}>
                    <Text style={styles.contactLabel}>Người Gửi:</Text>
                    <Text style={styles.contactName}>{trip.contacts?.find(c => c.type === 'SENDER')?.fullName || 'N/A'}</Text>
                    <Text style={styles.contactPhone}>{trip.contacts?.find(c => c.type === 'SENDER')?.phoneNumber || '---'}</Text>
                </View>
                <TouchableOpacity style={styles.phoneBtn}><Ionicons name="call" size={20} color={COLORS.primary} /></TouchableOpacity>
            </View>
            <View style={[styles.contactRow, {backgroundColor: COLORS.receiverBg, marginTop: 8}]}>
                <View style={styles.contactIconBox}><MaterialCommunityIcons name="arrow-down-bold" size={20} color={COLORS.danger} /></View>
                <View style={{flex: 1}}>
                    <Text style={styles.contactLabel}>Người Nhận:</Text>
                    <Text style={styles.contactName}>{trip.contacts?.find(c => c.type === 'RECEIVER')?.fullName || 'N/A'}</Text>
                    <Text style={styles.contactPhone}>{trip.contacts?.find(c => c.type === 'RECEIVER')?.phoneNumber || '---'}</Text>
                </View>
                <TouchableOpacity style={styles.phoneBtn}><Ionicons name="call" size={20} color={COLORS.danger} /></TouchableOpacity>
            </View>
        </View>

        {/* --- 4. HỢP ĐỒNG --- */}
        {renderContractSummary()}

        <View style={{ height: showPayment ? 100 : 40 }} />
      </ScrollView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      {showHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (onBack ? onBack() : router.push('/(provider)/posts'))} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi Tiết Chuyến Đi</Text>
          <TouchableOpacity><Ionicons name="notifications-outline" size={24} color={COLORS.text} /></TouchableOpacity>
        </View>
      )}

      {renderContent()}

      {/* PAYMENT BAR */}
      {showPayment && providerContract && (
        <View style={styles.payBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.payTitle}>Thanh toán hợp đồng</Text>
            <Text style={styles.paySub}>{providerContract.contractValue?.toLocaleString('vi-VN')} {providerContract.currency}</Text>
          </View>
          <TouchableOpacity style={styles.payBtn} onPress={navigateToPaymentFlow}>
            <Text style={styles.payBtnText}>{paymentLabel}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL HỢP ĐỒNG CHI TIẾT */}
      {renderContractModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  backBtn: { padding: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: COLORS.danger },
  scrollContent: { paddingBottom: 20 },

  // MAP
  mapSection: { marginBottom: 12 },
  mapPlaceholder: { height: 220, backgroundColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  statusBanner: { position: 'absolute', top: 16, alignSelf: 'center', zIndex: 10, backgroundColor: COLORS.orangeBadge, paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
  statusBannerText: { color: '#fff', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  routeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.06, elevation: 4 },
  tripCode: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
  routeNode: { width: 30, alignItems: 'center' },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  routeLine: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 20 },
  dashedLine: { width: '100%', height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.textLight, position: 'absolute' },
  truckIconBox: { backgroundColor: '#fff', paddingHorizontal: 6 },
  addressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  addressText: { width: '48%', fontSize: 12, fontWeight: '500', color: COLORS.text },
  routeStats: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#F3F4F6' },
  routeStatText: { fontSize: 11, color: COLORS.textLight, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },

  // GRID
  gridContainer: { flexDirection: 'row', marginHorizontal: 16, gap: 12, marginBottom: 16 },
  gridItem: { flex: 1, marginBottom: 0, minHeight: 160 },
  
  // CARD
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 16, elevation: 2, shadowOpacity: 0.05 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardTitleSmall: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 8, borderBottomWidth: 1, borderColor: '#F3F4F6', paddingBottom: 6 },

  // GOODS
  specRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  specBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 4, borderRadius: 4, flex: 1, gap: 4, justifyContent: 'center' },
  specValue: { fontSize: 11, fontWeight: '600' },
  pkgName: { fontSize: 12, fontWeight: '500', color: COLORS.text },
  pkgCode: { fontSize: 10, color: COLORS.textLight },

  // VEHICLE
  vehicleThumb: { height: 60, backgroundColor: '#E5E7EB', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  plateBadge: { backgroundColor: '#1E40AF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'center', marginBottom: 4 },
  plateText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  vehicleModel: { textAlign: 'center', fontSize: 11, color: COLORS.textLight },
  driverRowCompact: { flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: '#F0FDF4', padding: 4, borderRadius: 4 },
  driverNameCompact: { fontSize: 11, fontWeight: '600', color: '#166534', marginLeft: 4 },

  // CONTACT
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12 },
  contactIconBox: { marginRight: 12 },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 11, color: COLORS.textLight, marginBottom: 2 },
  contactName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  contactPhone: { fontSize: 12, color: '#4B5563' },
  phoneBtn: { backgroundColor: '#fff', padding: 8, borderRadius: 20, elevation: 1 },

  // CONTRACT SUMMARY
  contractContainer: { alignItems: 'center' },
  contractValue: { fontSize: 24, fontWeight: '800', color: COLORS.success, marginBottom: 4 },
  contractCodeSub: { fontSize: 13, color: COLORS.textLight, marginBottom: 12 },
  statusTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  bgSuccess: { backgroundColor: '#DCFCE7' },
  bgWarning: { backgroundColor: '#FEF9C3' },
  statusTagText: { fontSize: 12, fontWeight: '700' },
  signTimeline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  signNode: { alignItems: 'center', gap: 4 },
  signLabel: { fontSize: 12, color: COLORS.textLight },
  signLine: { flex: 1, height: 1, backgroundColor: COLORS.border, marginHorizontal: 8 },
  tapToViewText: { color: COLORS.blue, fontSize: 12, marginTop: 8 },
  emptyText: { fontStyle: 'italic', color: COLORS.textLight, textAlign: 'center' },

  // MODAL CONTRACT FULL
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 600, backgroundColor: '#fff', borderRadius: 16, padding: 16, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  contractHeaderTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center', color: '#111827' },
  contractHeaderSubtitle: { fontSize: 13, fontWeight: '600', textAlign: 'center', color: '#111827', textDecorationLine: 'underline' },
  contractHeaderLine: { fontSize: 12, textAlign: 'center', marginVertical: 8 },
  contractTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginVertical: 12 },
  contractCode: { fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginBottom: 16 },
  modalSectionTitle: { fontWeight: '700', marginTop: 16, marginBottom: 8 },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  signatureCol: { flex: 1, alignItems: 'center', padding: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: '#F9FAFB' },
  signatureTitle: { fontWeight: '700', marginBottom: 4 },
  signatureBox: { height: 60, width: '100%', borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  termRow: { flexDirection: 'row', marginBottom: 6 },
  termOrder: { width: 24, fontWeight: '700' },
  termContent: { flex: 1 },
  modalActionsRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnOutline: { borderWidth: 1, borderColor: COLORS.border },
  btnDisabled: { backgroundColor: '#9CA3AF' },
  btnTextWhite: { color: '#fff', fontWeight: '700' },
  btnTextDark: { color: COLORS.text, fontWeight: '600' },

  // PAY BAR
  payBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopColor: '#E5E7EB', borderTopWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  payTitle: { fontSize: 12, color: '#6B7280' },
  paySub: { fontSize: 14, fontWeight: '800', color: '#111827' },
  payBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, minWidth: 120, alignItems: 'center' },
  payBtnText: { color: '#FFFFFF', fontWeight: '800' }
  ,
  /* New styles for horizontal cards and small components */
  hScrollContainer: { paddingHorizontal: 12, paddingVertical: 18 },
  ribbon: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, zIndex: 5 },
  ribbonText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  mapWrap: { height: 140, borderRadius: 12, backgroundColor: '#E6EEF8', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  mapPlaceholderText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  cardBody: { paddingTop: 6 },
  routeTextSmall: { fontSize: 12, color: COLORS.textLight, marginTop: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  metaBox: { alignItems: 'center', flex: 1 },
  metaLabel: { fontSize: 12, color: COLORS.textLight },
  metaValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  /* Packages */
  packageRow: { flexDirection: 'row', alignItems: 'center' },
  packageThumbWrap: { width: 84, height: 64, borderRadius: 8, overflow: 'hidden', backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  packageThumb: { width: 84, height: 64, resizeMode: 'cover' },
  packageThumbPlaceholder: { width: 84, height: 64, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderRadius: 8 },
  smallMuted: { fontSize: 11, color: COLORS.textLight },
  pkgSpec: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  pkgItem: { fontSize: 12, color: COLORS.textLight, marginTop: 6 },

  /* Item thumbnail inside package */
  itemRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  itemImage: { width: 48, height: 48, borderRadius: 6, backgroundColor: '#F3F4F6' },
  itemImagePlaceholder: { width: 48, height: 48, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },

  /* misc small styles used by modal and card pieces */
  loadingText: { marginTop: 8, color: COLORS.textLight },
  closeX: { fontSize: 28, lineHeight: 28, color: '#6B7280' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 13, color: '#6B7280' },
  value: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  signatureHint: { color: '#6B7280', marginTop: 6, fontSize: 12 },
  termsContainer: { marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  empty: { fontStyle: 'italic', color: COLORS.textLight },
  modalActionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontWeight: '700', color: '#FFFFFF' },
  btnSecondary: { backgroundColor: '#E0E7FF' },
  waitingNote: { marginTop: 12, textAlign: 'center', color: COLORS.textLight, fontSize: 12 },

  /* Vehicle card */
  vehicleWrap: { flexDirection: 'row', alignItems: 'center' },
  vehicleImage: { width: 96, height: 64, borderRadius: 8, resizeMode: 'cover', backgroundColor: '#F3F4F6' },
  vehicleImagePlaceholder: { width: 96, height: 64, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  plate: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  driverRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  driverName: { fontSize: 13, color: COLORS.text },
  driverBadge: { fontSize: 11, color: '#065F46', backgroundColor: '#ECFCCB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },

  /* Contacts */
  contactBox: { width: '100%' },
  contactType: { fontSize: 12, color: '#374151', fontWeight: '700', marginBottom: 4 },
  callBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 1 },
  callTxt: { fontSize: 18 },

  /* Contract small */
  contractCard: { paddingVertical: 8, alignItems: 'flex-start' },
  contractAmount: { fontSize: 20, fontWeight: '900', color: COLORS.success },
  contractCodeSmall: { fontSize: 12, color: COLORS.textLight, marginTop: 6 },
  smallBadge: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10 },
  badgeSuccess: { backgroundColor: '#DCFCE7' },
  badgeNeutral: { backgroundColor: '#F3F4F6' },
  smallBadgeText: { fontSize: 12, fontWeight: '700', color: '#065F46' }
})

export default ProviderTripDetail