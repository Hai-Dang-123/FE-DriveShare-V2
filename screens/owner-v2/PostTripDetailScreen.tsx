import React, { useEffect, useState, useMemo } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Modal } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import postTripService from '@/services/postTripService'
import tripService from '@/services/tripService'

type AnyObj = Record<string, any>

function get(obj: AnyObj, ...keys: string[]) {
  for (const k of keys) {
    if (obj == null) return undefined
    obj = obj[k]
  }
  return obj
}

function normalize(raw: AnyObj) {
  const id = raw.postTripId || raw.PostTripId
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

const PostTripDetailScreen: React.FC = () => {
  const params = useLocalSearchParams()
  const postTripId = String((params as any).postTripId)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Hooks that were previously declared after conditional returns must be placed
  // here to ensure consistent hook order across renders.
  const [showTripModal, setShowTripModal] = useState(false)
  const [tripLoading, setTripLoading] = useState(false)
  const [tripDetail, setTripDetail] = useState<any | null>(null)
  const [tripError, setTripError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggleSection = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  const statusStyle = useMemo(() => {
    const map: Record<string, { bg: string; color: string }> = {
      OPEN: { bg: '#DBEAFE', color: '#1E3A8A' },
      CLOSED: { bg: '#D1FAE5', color: '#065F46' },
      CANCELLED: { bg: '#FEE2E2', color: '#991B1B' },
      COMPLETED: { bg: '#F5F3FF', color: '#5B21B6' },
      UNKNOWN: { bg: '#E5E7EB', color: '#374151' },
    }
    const key = data?.status || 'UNKNOWN'
    return map[key] || map.UNKNOWN
  }, [data?.status])

  const formatCurrency = (v: any) => {
    const num = Number(v || 0)
    return new Intl.NumberFormat('vi-VN').format(num)
  }

  const totalBudget = useMemo(() => {
    const details = data?.details || []
    return details.reduce((sum: number, d: AnyObj) => {
      const price = (d.pricePerPerson ?? d.PricePerPerson)
      const safePrice = price ?? 0
      const countVal = (d.requiredCount ?? d.RequiredCount)
      const safeCount = countVal ?? 0
      const computed = safePrice * safeCount
      const budget = (d.totalBudget ?? d.TotalBudget)
      return sum + (budget ?? computed)
    }, 0)
  }, [data?.details])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await postTripService.getById(String(postTripId))
        const ok = res?.isSuccess ?? (res?.statusCode === 200)
        if (!ok) throw new Error(res?.message || 'Load thất bại')
        const payload = res?.result || res?.data || res
        if (!mounted) return
        setData(normalize(payload))
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || 'Không tải được dữ liệu')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [postTripId])

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>
  if (!data) return <View style={styles.center}><Text>Không có dữ liệu</Text></View>

  return (
    <View style={{ flex: 1 }}>
<ScrollView style={styles.screen} contentContainerStyle={styles.content}>
<View style={styles.headerBlock}>
<View style={styles.headerRow}>
<Text style={styles.title}>{data.title}</Text>
<View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
<Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>{data.status}</Text>
</View>
</View>
          {!!data.description && <Text style={styles.desc}>{data.description}</Text>}
          <View style={styles.metaRow}>
<View style={styles.metaChip}><Text style={styles.metaChipText}>Chi tiết: {data.details.length}</Text></View>
<View style={styles.metaChip}><Text style={styles.metaChipText}>Tổng ngân sách ~ {formatCurrency(totalBudget)} VND</Text></View>
</View>
</View>
<View style={styles.section}>
<View style={styles.sectionHeaderRow}>
<Text style={styles.sectionTitle}>Tuyến & Chuyến</Text>
<TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                if (!data?.trip?.tripId) {
                  setTripError('Không có TripId hợp lệ')
                  setTripDetail(null)
                  setShowTripModal(true)
                  return
                }
                setShowTripModal(true)
                setTripLoading(true)
                setTripError(null)
                setTripDetail(null)
                ;(async () => {
                  try {
                    const res: any = await tripService.getById(String(data.trip.tripId))
                    const ok = res?.isSuccess ?? (res?.statusCode === 200)
                    if (!ok) throw new Error(res?.message || 'Tải chuyến thất bại')
                    const payload = res?.result || res?.data || res
                    // Lightweight normalization for fields we want to show
                    const t = {
                      tripId: payload.tripId || payload.TripId,
                      tripCode: payload.tripCode || payload.TripCode,
                      status: payload.status || payload.Status,
                      vehicle: payload.vehicle || payload.Vehicle,
                      owner: payload.owner || payload.Owner,
                      provider: payload.provider || payload.Provider,
                      shippingRoute: payload.shippingRoute || payload.ShippingRoute,
                      packages: payload.packages || payload.Packages || [],
                      drivers: payload.drivers || payload.Drivers || [],
                      contacts: payload.contacts || payload.Contacts || [],
                      providerContracts: payload.providerContracts || payload.ProviderContracts || null,
                      deliveryRecords: payload.deliveryRecords || payload.DeliveryRecords || [],
                      driverContracts: payload.driverContracts || payload.DriverContracts || [],
                      compensations: payload.compensations || payload.Compensations || [],
                      issues: payload.issues || payload.Issues || [],
                      createAt: payload.createAt || payload.CreateAt,
                    }
                    setTripDetail(t)
                  } catch (e: any) {
                    setTripError(e?.message || 'Không tải được chi tiết chuyến')
                  } finally {
                    setTripLoading(false)
                  }
                })()
              }}
            >
<Text style={styles.linkButtonText}>Xem chi tiết chuyến</Text>
</TouchableOpacity>
</View>
<Text style={styles.row}><Text style={styles.rowLabel}>Từ:</Text> {data.startName || '—'}</Text>
<Text style={styles.row}><Text style={styles.rowLabel}>Đến:</Text> {data.endName || '—'}</Text>
<Text style={styles.row}><Text style={styles.rowLabel}>Tải yêu cầu:</Text> {data.requiredPayloadInKg ?? '—'} kg</Text>
<Text style={styles.row}><Text style={styles.rowLabel}>Bắt đầu:</Text> {(data.startTime ?? '').toString() || '—'}</Text>
</View>
<View style={styles.section}>
<Text style={styles.sectionTitle}>Chi tiết tuyển</Text>
          {data.details.map((d: AnyObj, idx: number) => (
            <View key={idx} style={styles.detailCard}>
<View style={styles.detailHeaderRow}>
<Text style={styles.detailType}>{(d.type || d.Type || 'TYPE').replace('_',' ')}</Text>
<View style={styles.badgeSecondary}><Text style={styles.badgeSecondaryText}>Số lượng {d.requiredCount ?? d.RequiredCount}</Text></View>
</View>
<View style={styles.detailGrid}>
<Text style={styles.gridItem}><Text style={styles.rowLabel}>Giá/người:</Text> {formatCurrency(d.pricePerPerson ?? d.PricePerPerson)} VND</Text>
<Text style={styles.gridItem}>
<Text style={styles.rowLabel}>Ngân sách:</Text> {formatCurrency((d.totalBudget ?? d.TotalBudget) ?? ((d.pricePerPerson ?? d.PricePerPerson ?? 0) * (d.requiredCount ?? d.RequiredCount ?? 0)))} VND
                </Text>
</View>
<Text style={styles.row}><Text style={styles.rowLabel}>Đón:</Text> {(d.pickupLocation ?? d.PickupLocation) || '—'}</Text>
<Text style={styles.row}><Text style={styles.rowLabel}>Trả:</Text> {(d.dropoffLocation ?? d.DropoffLocation) || '—'}</Text>
<View style={styles.flagRow}>
<View style={styles.smallFlag}><Text style={styles.smallFlagText}>Đón gara: {(d.mustPickAtGarage ?? d.MustPickAtGarage) ? 'Có' : 'Không'}</Text></View>
<View style={styles.smallFlag}><Text style={styles.smallFlagText}>Trả gara: {(d.mustDropAtGarage ?? d.MustDropAtGarage) ? 'Có' : 'Không'}</Text></View>
</View>
</View>
          ))}
        </View>
</ScrollView>
<Modal visible={showTripModal} transparent animationType="slide" onRequestClose={() => setShowTripModal(false)}>
<View style={styles.modalBackdrop}>
<View style={styles.modalCard}>
<View style={styles.modalHeaderRow}>
<Text style={styles.modalTitle}>Chi tiết chuyến</Text>
<TouchableOpacity onPress={() => setShowTripModal(false)} style={styles.closeBtn}><Text style={styles.closeBtnText}>✕</Text></TouchableOpacity>
</View>
            {tripLoading && <ActivityIndicator style={{ marginVertical: 12 }} />}
            {!tripLoading && tripError && <Text style={[styles.modalRow, { color: '#DC2626' }]}>{tripError}</Text>}
            {!tripLoading && !tripError && tripDetail && (
              <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Basic summary */}
                <View style={styles.modalSection}>
<Text style={styles.modalRow}><Text style={styles.rowLabel}>Mã chuyến:</Text> {tripDetail.tripCode || tripDetail.tripId}</Text>
<Text style={styles.modalRow}><Text style={styles.rowLabel}>Trạng thái:</Text> {tripDetail.status}</Text>
<Text style={styles.modalRow}><Text style={styles.rowLabel}>Tạo lúc:</Text> {tripDetail.createAt}</Text>
</View>

                {/* Vehicle */}
                <TouchableOpacity style={styles.collapseHeader} onPress={() => toggleSection('vehicle')}>
<Text style={styles.collapseTitle}>Xe & Tuyến</Text>
<Text style={styles.collapseChevron}>{expanded.vehicle ? '▾' : '▸'}</Text>
</TouchableOpacity>
                {expanded.vehicle && (
                  <View style={styles.modalSection}>
                    {tripDetail.vehicle && (
                      <>
<Text style={styles.modalRow}><Text style={styles.rowLabel}>Xe:</Text> {tripDetail.vehicle.model || tripDetail.vehicle.vehicleModel} • {tripDetail.vehicle.plateNumber || tripDetail.vehicle.plate || tripDetail.vehicle.vehiclePlate}</Text>
<Text style={styles.modalRow}><Text style={styles.rowLabel}>Loại:</Text> {tripDetail.vehicle.vehicleTypeName || tripDetail.vehicle.vehicleType}</Text>
                        {!!tripDetail.vehicle.imageUrls?.length && <Text style={styles.modalRow}><Text style={styles.rowLabel}>Ảnh:</Text> {tripDetail.vehicle.imageUrls.length} ảnh</Text>}
                      </>
                    )}
                    {tripDetail.shippingRoute && (
                      <>
<Text style={styles.modalRow}><Text style={styles.rowLabel}>Từ:</Text> {tripDetail.shippingRoute.startAddress || tripDetail.shippingRoute.startLocationName}</Text>
<Text style={styles.modalRow}><Text style={styles.rowLabel}>Đến:</Text> {tripDetail.shippingRoute.endAddress || tripDetail.shippingRoute.endLocationName}</Text>
                        {tripDetail.shippingRoute.estimatedDuration && <Text style={styles.modalRow}><Text style={styles.rowLabel}>Dự kiến:</Text> {tripDetail.shippingRoute.estimatedDuration}</Text>}
                      </>
                    )}
                  </View>
                )}
{/* Packages */}
                <TouchableOpacity style={styles.collapseHeader} onPress={() => toggleSection('packages')}>
<Text style={styles.collapseTitle}>Gói hàng ({tripDetail.packages.length})</Text>
<Text style={styles.collapseChevron}>{expanded.packages ? '▾' : '▸'}</Text>
</TouchableOpacity>
                {expanded.packages && (
                  <View style={styles.modalSection}>
                    {tripDetail.packages.map((p: AnyObj, i: number) => (
                      <View key={p.packageId || i} style={styles.itemBlock}>
<Text style={styles.modalRow}><Text style={styles.rowLabel}>Mã:</Text> {p.packageCode}</Text>
<Text style={styles.modalRow}><Text style={styles.rowLabel}>Khối lượng:</Text> {p.weight} kg • Thể tích: {p.volume}</Text>
                        {!!p.items?.length && <Text style={styles.modalRow}><Text style={styles.rowLabel}>Items:</Text> {p.items.length}</Text>}
                      </View>
                    ))}
                    {!tripDetail.packages.length && <Text style={styles.modalRow}>Không có gói hàng</Text>}
                  </View>
                )}
{/* Drivers */}
                <TouchableOpacity style={styles.collapseHeader} onPress={() => toggleSection('drivers')}>
<Text style={styles.collapseTitle}>Tài xế ({tripDetail.drivers.length})</Text>
<Text style={styles.collapseChevron}>{expanded.drivers ? '▾' : '▸'}</Text>
</TouchableOpacity>
                {expanded.drivers && (
                  <View style={styles.modalSection}>
                    {tripDetail.drivers.map((d: AnyObj, i: number) => (
                      <Text key={d.driverId || i} style={styles.modalRow}>
<Text style={styles.rowLabel}>{d.type}:</Text> {d.fullName} • {d.assignmentStatus || '—'}
                      </Text>
                    ))}
                    {!tripDetail.drivers.length && <Text style={styles.modalRow}>Chưa có tài xế</Text>}
                  </View>
                )}
{/* Contacts */}
                <TouchableOpacity style={styles.collapseHeader} onPress={() => toggleSection('contacts')}>
<Text style={styles.collapseTitle}>Liên hệ ({tripDetail.contacts?.length || 0})</Text>
<Text style={styles.collapseChevron}>{expanded.contacts ? '▾' : '▸'}</Text>
</TouchableOpacity>
                {expanded.contacts && (
                  <View style={styles.modalSection}>
                    {tripDetail.contacts?.map((c: AnyObj, i: number) => (
                      <Text key={c.tripContactId || i} style={styles.modalRow}>
<Text style={styles.rowLabel}>{c.type}:</Text> {c.fullName} • {c.phoneNumber}
                      </Text>
                    )) || <Text style={styles.modalRow}>Không có liên hệ</Text>}
                  </View>
                )}
{/* Provider Contract */}
                <TouchableOpacity style={styles.collapseHeader} onPress={() => toggleSection('contract')}>
<Text style={styles.collapseTitle}>Hợp đồng (Provider)</Text>
<Text style={styles.collapseChevron}>{expanded.contract ? '▾' : '▸'}</Text>
</TouchableOpacity>
                {expanded.contract && (
                  <View style={styles.modalSection}>
                    {tripDetail.providerContracts ? (
                      <>
<Text style={styles.modalRow}><Text style={styles.rowLabel}>Mã:</Text> {tripDetail.providerContracts.contractCode}</Text>
<Text style={styles.modalRow}><Text style={styles.rowLabel}>Trạng thái:</Text> {tripDetail.providerContracts.status}</Text>
<Text style={styles.modalRow}><Text style={styles.rowLabel}>Giá trị:</Text> {formatCurrency(tripDetail.providerContracts.contractValue)} {tripDetail.providerContracts.currency}</Text>
<Text style={styles.modalRow}><Text style={styles.rowLabel}>Ký owner:</Text> {tripDetail.providerContracts.ownerSigned ? '✔' : '✘'} {tripDetail.providerContracts.ownerSignAt || ''}</Text>
<Text style={styles.modalRow}><Text style={styles.rowLabel}>Ký đối tác:</Text> {tripDetail.providerContracts.counterpartySigned ? '✔' : '✘'} {tripDetail.providerContracts.counterpartySignAt || ''}</Text>
                        {!!tripDetail.providerContracts.terms?.length && (
                          <View style={styles.termBlock}>
                            {tripDetail.providerContracts.terms.map((t: AnyObj) => (
                              <Text key={t.contractTermId} style={styles.termRow}>• {t.content}</Text>
                            ))}
                          </View>
                        )}
                      </>
                    ) : <Text style={styles.modalRow}>Không có hợp đồng</Text>}
                  </View>
                )}
{/* Delivery Records */}
                <TouchableOpacity style={styles.collapseHeader} onPress={() => toggleSection('delivery')}>
<Text style={styles.collapseTitle}>Biên bản giao nhận ({tripDetail.deliveryRecords?.length || 0})</Text>
<Text style={styles.collapseChevron}>{expanded.delivery ? '▾' : '▸'}</Text>
</TouchableOpacity>
                {expanded.delivery && (
                  <View style={styles.modalSection}>
                    {tripDetail.deliveryRecords?.map((r: AnyObj) => (
                      <View key={r.tripDeliveryRecordId} style={styles.itemBlock}>
<Text style={styles.modalRow}><Text style={styles.rowLabel}>{r.recordType}:</Text> {r.note}</Text>
                        {!!r.terms?.length && r.terms.map((tm: AnyObj) => (
                          <Text key={tm.deliveryRecordTermId} style={styles.termRow}>• {tm.content}</Text>
                        ))}
                      </View>
                    )) || <Text style={styles.modalRow}>Không có biên bản</Text>}
                  </View>
                )}
              </ScrollView>
            )}
            {!tripLoading && !tripError && !tripDetail && (
              <Text style={styles.modalRow}>Không có dữ liệu chuyến</Text>
            )}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowTripModal(false)}>
<Text style={styles.primaryBtnText}>Đóng</Text>
</TouchableOpacity>
</View>
</View>
</Modal>
</View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBlock: { marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', flex: 1, paddingRight: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  desc: { marginTop: 8, color: '#6B7280', lineHeight: 20 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  metaChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  metaChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  section: { marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  linkButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#EEF2FF' },
  linkButtonText: { fontSize: 12, fontWeight: '600', color: '#4338CA' },
  row: { color: '#374151', marginTop: 6, fontSize: 13 },
  rowLabel: { fontWeight: '600', color: '#111827' },
  detailCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, marginTop: 10, backgroundColor: '#F9FAFB' },
  detailHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  detailType: { fontSize: 13, fontWeight: '700', color: '#374151' },
  badgeSecondary: { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeSecondaryText: { fontSize: 11, fontWeight: '600', color: '#0369A1' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  gridItem: { fontSize: 13, color: '#374151' },
  flagRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  smallFlag: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  smallFlagText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  // Modal
  modalBackdrop: { flex:1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent:'flex-end' },
  modalCard: { backgroundColor:'#FFFFFF', borderTopLeftRadius:20, borderTopRightRadius:20, padding:16, shadowColor:'#000', shadowOpacity:0.2, shadowRadius:12, elevation:12 },
  modalHeaderRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  modalTitle: { fontSize:18, fontWeight:'700', color:'#111827' },
  closeBtn: { padding:8, borderRadius:8, backgroundColor:'#F3F4F6' },
  closeBtnText: { fontSize:14, fontWeight:'700', color:'#374151' },
  modalRow: { marginTop:6, color:'#374151', fontSize:13 },
  primaryBtn: { marginTop:16, backgroundColor:'#4F46E5', paddingVertical:12, borderRadius:10, alignItems:'center' },
  primaryBtnText: { color:'#FFFFFF', fontWeight:'600' },
  error: { color: '#DC2626' }
  ,modalSection: { marginTop:8 }
  ,collapseHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:12, paddingVertical:6, paddingHorizontal:10, backgroundColor:'#F3F4F6', borderRadius:8 }
  ,collapseTitle: { fontSize:13, fontWeight:'700', color:'#111827', flex:1, paddingRight:8 }
  ,collapseChevron: { fontSize:14, fontWeight:'700', color:'#374151' }
  ,itemBlock: { borderWidth:1, borderColor:'#E5E7EB', borderRadius:10, padding:8, marginTop:8, backgroundColor:'#FFFFFF' }
  ,termBlock: { marginTop:4 }
  ,termRow: { fontSize:12, color:'#374151', marginTop:4, lineHeight:16 }
})

export default PostTripDetailScreen
