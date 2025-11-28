// import React, { useEffect, useMemo, useState } from 'react'
// import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity, Modal } from 'react-native'
// import VietMapWebSDK from '@/components/debug/VietMapWebSDK'
// import { useLocalSearchParams } from 'expo-router'
// import postTripService from '@/services/postTripService'
// import tripService from '@/services/tripService'
// import assignmentService from '@/services/assignmentService'
// import { decodePolyline } from '@/utils/polyline'
// import { useAuth } from '@/hooks/useAuth'
// import { track } from '@/utils/analytics'
// import useTripStore from '@/stores/tripStore'

// type AnyObj = Record<string, any>

// function get(obj: AnyObj, ...keys: string[]) {
//   for (const k of keys) {
//     if (obj == null) return undefined
//     obj = obj[k]
//   }
//   return obj
// }

// function normalizePostTrip(raw: AnyObj) {
//   const id = raw.postTripId || raw.PostTripId || raw.id || raw.Id
//   const title = raw.title || raw.Title || ''
//   const description = raw.description || raw.Description || ''
//   const status = raw.status || raw.Status || 'UNKNOWN'
//   const requiredPayloadInKg = raw.requiredPayloadInKg ?? raw.RequiredPayloadInKg
//   const tripRaw = raw.trip || raw.Trip || {}
//   const trip = {
//     tripId: tripRaw.tripId || tripRaw.TripId,
//     startLocationName: tripRaw.startLocationName || tripRaw.StartLocationName,
//     endLocationName: tripRaw.endLocationName || tripRaw.EndLocationName,
//     startTime: tripRaw.startTime || tripRaw.StartTime,
//     vehicleModel: tripRaw.vehicleModel || tripRaw.VehicleModel,
//     vehiclePlate: tripRaw.vehiclePlate || tripRaw.VehiclePlate,
//     packageCount: tripRaw.packageCount || tripRaw.PackageCount,
//     tripDescription: tripRaw.tripDescription || tripRaw.TripDescription,
//   }
//   const startName = trip.startLocationName || ''
//   const endName = trip.endLocationName || ''
//   const startTime = trip.startTime
//   const details = raw.postTripDetails || raw.PostTripDetails || []
//   return { id, title, description, status, requiredPayloadInKg, startName, endName, startTime, details, trip }
// }

// const DriverPostTripDetailScreen: React.FC = () => {
//   const params = useLocalSearchParams()
//   const postTripId = String((params as any).postTripId)
//   const { user } = useAuth()
//   const { getTripDetail, setTripDetail } = useTripStore()

//   // Primary state (declare all hooks before any early return)
//   const [loading, setLoading] = useState(true)
//   const [data, setData] = useState<any | null>(null)
//   const [error, setError] = useState<string | null>(null)

//   // Trip detail (fetched after post trip if tripId available)
//   const [tripLoading, setTripLoading] = useState(false)
//   const [tripDetail, setTripDetailState] = useState<any | null>(null)
//   const [tripError, setTripError] = useState<string | null>(null)

//   // Apply & UI feedback state (must be declared before any early return)
//   const [applyingId, setApplyingId] = useState<string | null>(null)
//   const [toast, setToast] = useState<{ visible: boolean; type: 'success'|'error'; message: string }>({ visible: false, type: 'success', message: '' })
//   const [showConfirm, setShowConfirm] = useState(false)
//   const [pendingDetail, setPendingDetail] = useState<AnyObj | null>(null)

//   // No collapsibles per requirement; render all content fully

//   const statusStyle = useMemo(() => {
//     const map: Record<string, { bg: string; color: string; label: string }> = {
//       OPEN: { bg: '#DBEAFE', color: '#1E3A8A', label: 'OPEN' },
//       CLOSED: { bg: '#D1FAE5', color: '#065F46', label: 'CLOSED' },
//       CANCELLED: { bg: '#FEE2E2', color: '#991B1B', label: 'CANCELLED' },
//       COMPLETED: { bg: '#F5F3FF', color: '#5B21B6', label: 'COMPLETED' },
//       UNKNOWN: { bg: '#E5E7EB', color: '#374151', label: 'UNKNOWN' },
//     }
//     const key = (data?.status || 'UNKNOWN').toUpperCase()
//     return map[key] || map.UNKNOWN
//   }, [data?.status])

//   const formatCurrency = (v: any) => {
//     const num = Number(v || 0)
//     return new Intl.NumberFormat('vi-VN').format(num)
//   }

//   const totalBudget = useMemo(() => {
//     const details = data?.details || []
//     return details.reduce((sum: number, d: AnyObj) => {
//       const price = (d.pricePerPerson ?? d.PricePerPerson) ?? 0
//       const countVal = (d.requiredCount ?? d.RequiredCount) ?? 0
//       const budget = (d.totalBudget ?? d.TotalBudget)
//       return sum + (budget ?? price * countVal)
//     }, 0)
//   }, [data?.details])

//   // Hook must be declared before any early returns to keep order stable
//   const alreadyInTrip = useMemo(() => {
//     if (!user?.userId) return false
//     return (tripDetail?.drivers || []).some((d: AnyObj) => {
//       const did = d.driverId || d.DriverId || d.userId || d.UserId || d.id || d.Id
//       return String(did) === String(user.userId)
//     })
//   }, [tripDetail?.drivers, user?.userId])

//   useEffect(() => {
//     let mounted = true
//     ;(async () => {
//       try {
//         const res: any = await postTripService.getById(String(postTripId))
//         const ok = res?.isSuccess ?? (res?.statusCode === 200)
//         if (!ok) throw new Error(res?.message || 'Không tải được Post Trip')
//         const payload = res?.result || res?.data || res
//         if (!mounted) return
//         const normalized = normalizePostTrip(payload)
//         setData(normalized)
//         // Attempt fetching the linked Trip for richer driver view (cache first)
//         const tid = normalized?.trip?.tripId
//         if (tid) {
//           setTripLoading(true)
//           setTripError(null)
//           try {
//             const cached = getTripDetail(String(tid))
//             if (cached) {
//               setTripDetailState(cached)
//               // Track if user already in trip from cached data
//               if (user?.userId && (cached.drivers || []).some((d: AnyObj) => (d.driverId || d.DriverId || d.id || d.Id) === user.userId)) {
//                 track('driver_post_trip_view_already_joined', { postTripId: normalized.id })
//               }
//             } else {
//               const tRes: any = await tripService.getById(String(tid))
//               const tOk = tRes?.isSuccess ?? (tRes?.statusCode === 200)
//               if (!tOk) throw new Error(tRes?.message || 'Không tải được chi tiết chuyến')
//               const tPayload = tRes?.result || tRes?.data || tRes
//               if (!mounted) return
//               const tDetail = {
//                 tripId: tPayload.tripId || tPayload.TripId,
//                 tripCode: tPayload.tripCode || tPayload.TripCode,
//                 status: tPayload.status || tPayload.Status,
//                 vehicle: tPayload.vehicle || tPayload.Vehicle,
//                 owner: tPayload.owner || tPayload.Owner,
//                 provider: tPayload.provider || tPayload.Provider,
//                 shippingRoute: tPayload.shippingRoute || tPayload.ShippingRoute,
//                 tripRoute: tPayload.tripRoute || tPayload.TripRoute,
//                 packages: tPayload.packages || tPayload.Packages || [],
//                 drivers: tPayload.drivers || tPayload.Drivers || [],
//                 contacts: tPayload.contacts || tPayload.Contacts || [],
//                 createAt: tPayload.createAt || tPayload.CreateAt,
//                 updateAt: tPayload.updateAt || tPayload.UpdateAt,
//               }
//               setTripDetail(tDetail.tripId, tDetail)
//               setTripDetailState(tDetail)
//               if (user?.userId && (tDetail.drivers || []).some((d: AnyObj) => (d.driverId || d.DriverId || d.id || d.Id) === user.userId)) {
//                 track('driver_post_trip_view_already_joined', { postTripId: normalized.id })
//               }
//             }
//           } catch (e: any) {
//             if (!mounted) return
//             setTripError(e?.message || 'Không tải được chi tiết chuyến')
//           } finally {
//             if (mounted) setTripLoading(false)
//           }
//         }
//       } catch (e: any) {
//         if (!mounted) return
//         setError(e?.message || 'Không tải được dữ liệu')
//       } finally {
//         if (mounted) setLoading(false)
//       }
//     })()
//     return () => { mounted = false }
//   }, [postTripId, getTripDetail, setTripDetail, user?.userId])

//   if (loading) return <View style={styles.center}><ActivityIndicator /></View>
//   if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>
//   if (!data) return <View style={styles.center}><Text>Không có dữ liệu</Text></View>

//   const totalPositions = (data.details || []).reduce((s: number, d: AnyObj) => s + ((d.requiredCount ?? d.RequiredCount) || 0), 0)

//   const showToast = (type: 'success'|'error', message: string) => {
//     setToast({ visible: true, type, message })
//     setTimeout(() => setToast(t => ({ ...t, visible: false })), 2400)
//   }

//   const getDefaultLocations = () => {
//     // Derive coords from route polyline if available, else 0,0
//     const rawRouteData = get(tripDetail || {}, 'tripRoute', 'routeData')
//     const routeData = typeof rawRouteData === 'string' ? rawRouteData : undefined
//     let start = { lat: 0, lng: 0 }
//     let end = { lat: 0, lng: 0 }
//     if (routeData) {
//       try {
//         const decoded = decodePolyline(routeData)
//         if (decoded.coordinates.length >= 2) {
//           const first = decoded.coordinates[0]
//           const last = decoded.coordinates[decoded.coordinates.length - 1]
//           start = { lng: first[0], lat: first[1] }
//           end = { lng: last[0], lat: last[1] }
//         }
//       } catch {}
//     }
//     const startAddress = (get(tripDetail || {}, 'shippingRoute', 'startAddress')
//       || `${data.startName || ''}`) as string
//     const endAddress = (get(tripDetail || {}, 'shippingRoute', 'endAddress')
//       || `${data.endName || ''}`) as string
//     return {
//       startLocation: { address: startAddress, latitude: start.lat, longitude: start.lng },
//       endLocation: { address: endAddress, latitude: end.lat, longitude: end.lng },
//     }
//   }

//   const handleApply = async (detail: AnyObj) => {
//     if (!data?.id) return
//     const postTripDetailId = detail.postTripDetailId || detail.PostTripDetailId || detail.id || detail.Id
//     if (!postTripDetailId) {
//       showToast('error', 'Thiếu PostTripDetailId trong dòng chi tiết.')
//       return
//     }
//     const { startLocation, endLocation } = getDefaultLocations()
//     try {
//       track('driver_apply_attempt', { postTripId: data.id, postTripDetailId })
//       setApplyingId(String(postTripDetailId))
//       const res: any = await assignmentService.applyByPostTrip({
//         postTripId: String(data.id),
//         postTripDetailId: String(postTripDetailId),
//         startLocation,
//         endLocation,
//       })
//       const ok = res?.isSuccess ?? (res?.statusCode === 201)
//       if (!ok) throw new Error(res?.message || 'Ứng tuyển thất bại')
//       // Optimistic: append current driver
//       if (tripDetail && user?.userId) {
//         const newDriver = {
//           driverId: user.userId,
//           fullName: (user as any).fullName || user.userName,
//           type: (detail.type || detail.Type || 'PRIMARY'),
//           assignmentStatus: 'ACCEPTED',
//           paymentStatus: 'UNPAID',
//         }
//         const updated = { ...tripDetail, drivers: [...(tripDetail.drivers || []), newDriver] }
//         setTripDetailState(updated)
//         setTripDetail(updated.tripId, updated)
//       }
//       track('driver_apply_success', { postTripId: data.id, postTripDetailId })
//       showToast('success', 'Đã ứng tuyển và được chấp nhận tự động.')
//     } catch (e: any) {
//       const rawMsg = e?.message || 'Có lỗi xảy ra khi ứng tuyển'
//       if (/already applied/i.test(rawMsg) || e?.statusCode === 409) {
//         showToast('error', 'Bạn đã ứng tuyển chuyến này trước đó')
//         track('driver_apply_duplicate', { postTripId: data.id, postTripDetailId })
//       } else {
//         showToast('error', rawMsg)
//         track('driver_apply_error', { postTripId: data.id, postTripDetailId, error: rawMsg })
//       }
//     } finally {
//       setApplyingId(null)
//       setShowConfirm(false)
//       setPendingDetail(null)
//     }
//   }

//   const isPostOpen = (data?.status || '').toUpperCase() === 'OPEN'
//   const isTripAccepting = (tripDetail?.status || '').toUpperCase() === 'PENDING_DRIVER_ASSIGNMENT'

//   const getSlotState = (detail: AnyObj) => {
//     const type = (detail.type || detail.Type || '').toString().toUpperCase()
//     const required = Number(detail.requiredCount ?? detail.RequiredCount ?? 0)
//     const accepted = (tripDetail?.drivers || []).filter((d: AnyObj) => (
//       (d.type || d.Type || '').toString().toUpperCase() === type &&
//       (d.assignmentStatus || d.AssignmentStatus || '').toString().toUpperCase() === 'ACCEPTED'
//     )).length
//     const full = accepted >= required && required > 0
//     return { type, required, accepted, full }
//   }


//   const openConfirm = (detail: AnyObj) => {
//     setPendingDetail(detail)
//     setShowConfirm(true)
//   }

//   // Removed separate effect for tracking to keep hook count stable during fast refresh

//   return (
//     <View style={{ flex: 1 }}>
// <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
//       {/* Header */}
//       <View style={styles.headerBlock}>
// <View style={styles.headerRow}>
// <Text style={styles.title}>{data.title}</Text>
// <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
// <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
// </View>
// </View>
//         {alreadyInTrip && <View style={styles.joinedBadge}><Text style={styles.joinedBadgeText}>Đã tham gia</Text></View>}
//         {!!data.description && <Text style={styles.desc}>{data.description}</Text>}
//         <View style={styles.metaRow}>
// <View style={styles.metaChip}><Text style={styles.metaChipText}>Tuyến: {data.startName || '—'} → {data.endName || '—'}</Text></View>
// <View style={styles.metaChip}><Text style={styles.metaChipText}>Bắt đầu: {(data.startTime ?? '').toString() || '—'}</Text></View>
// <View style={styles.metaChip}><Text style={styles.metaChipText}>Tải yêu cầu: {data.requiredPayloadInKg ?? '—'} kg</Text></View>
// <View style={styles.metaChip}><Text style={styles.metaChipText}>Vị trí cần: {totalPositions}</Text></View>
// <View style={styles.metaChip}><Text style={styles.metaChipText}>Ngân sách ~ {formatCurrency(totalBudget)} VND</Text></View>
// </View>
// </View>

//       {/* Chi trả & Vị trí */}
//       <Text style={styles.sectionHeaderRowStatic}>Chi trả & Vị trí</Text>
// <View style={styles.section}>
//         {data.details.map((d: AnyObj, idx: number) => (
//           <View key={idx} style={styles.detailCard}>
// <View style={styles.detailHeaderRow}>
// <Text style={styles.detailType}>{(d.type || d.Type || 'TYPE').replace('_',' ')}</Text>
// <View style={styles.badgeSecondary}><Text style={styles.badgeSecondaryText}>Số lượng: {(d.requiredCount ?? d.RequiredCount) || 0}</Text></View>
// </View>
// <View style={styles.detailGrid}>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Giá/người:</Text> {formatCurrency(d.pricePerPerson ?? d.PricePerPerson)} VND</Text>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Ngân sách:</Text> {formatCurrency((d.totalBudget ?? d.TotalBudget) ?? ((d.pricePerPerson ?? d.PricePerPerson ?? 0) * (d.requiredCount ?? d.RequiredCount ?? 0)))} VND</Text>
// </View>
// <Text style={styles.row}><Text style={styles.rowLabel}>Đón:</Text> {(d.pickupLocation ?? d.PickupLocation) || '—'}</Text>
// <Text style={styles.row}><Text style={styles.rowLabel}>Trả:</Text> {(d.dropoffLocation ?? d.DropoffLocation) || '—'}</Text>
// <View style={styles.flagRow}>
// <View style={styles.smallFlag}><Text style={styles.smallFlagText}>Đón gara: {String((d.pickupAtGarage ?? d.PickupAtGarage) ?? false)}</Text></View>
// <View style={styles.smallFlag}><Text style={styles.smallFlagText}>Trả gara: {String((d.dropoffAtGarage ?? d.DropoffAtGarage) ?? false)}</Text></View>
// </View>
//             {(() => {
//               if (alreadyInTrip) return null
//               const idStr = String(d.postTripDetailId || d.PostTripDetailId || d.id || d.Id)
//               const { full } = getSlotState(d)
//               const disabled = applyingId !== null || !isPostOpen || !isTripAccepting || full
//               let label = 'Ứng tuyển'
//               if (applyingId === idStr) label = 'Đang ứng tuyển…'
//               else if (full) label = 'Đã đủ slot'
//               else if (!isPostOpen) label = 'Bài đã đóng'
//               else if (!isTripAccepting) label = 'Chuyến không tuyển'
//               return (
//                 <TouchableOpacity
//                   style={[styles.applyBtn, disabled && styles.applyBtnDisabled]}
//                   disabled={disabled}
//                   onPress={() => { if (!disabled) openConfirm(d) }}
//                 >
// <Text style={styles.applyBtnText}>{label}</Text>
// </TouchableOpacity>
//               )
//             })()}
//           </View>
//         ))}
//         {!data.details.length && <Text style={styles.row}>Không có dòng chi tiết nào</Text>}
//       </View>

//       {/* Lộ trình & Lịch trình (Trip) */}
//       <Text style={styles.sectionHeaderRowStatic}>Lộ trình & Lịch trình</Text>
// <View style={styles.section}>
//         {tripLoading && <ActivityIndicator />}
//         {!tripLoading && tripError && <Text style={[styles.row, { color: '#DC2626' }]}>{tripError}</Text>}
//         {!tripLoading && !tripError && (
//           <>
//             {!!tripDetail?.shippingRoute ? (
//               <>
// <Text style={styles.row}><Text style={styles.rowLabel}>Địa chỉ bắt đầu:</Text> {(get(tripDetail, 'shippingRoute', 'startAddress') || get(tripDetail, 'shippingRoute', 'startLocationName') || '—').toString()}</Text>
// <Text style={styles.row}><Text style={styles.rowLabel}>Địa chỉ kết thúc:</Text> {(get(tripDetail, 'shippingRoute', 'endAddress') || get(tripDetail, 'shippingRoute', 'endLocationName') || '—').toString()}</Text>
// <Text style={styles.row}><Text style={styles.rowLabel}>Thời lượng ước tính:</Text> {(get(tripDetail, 'shippingRoute', 'estimatedDuration') ?? '').toString() || '—'}</Text>
// </>
//             ) : (
//               <>
// <Text style={styles.row}><Text style={styles.rowLabel}>Tuyến (theo bài):</Text> {data.startName || '—'} → {data.endName || '—'}</Text>
// <Text style={styles.row}><Text style={styles.rowLabel}>Bắt đầu (theo bài):</Text> {(data.startTime ?? '').toString() || '—'}</Text>
// </>
//             )}
//             {!!tripDetail?.tripRoute && (
//               <>
// <View style={styles.detailGrid}>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Quãng đường:</Text> {(get(tripDetail, 'tripRoute', 'distanceKm') ?? '—').toString()} km</Text>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Thời gian (phút):</Text> {(get(tripDetail, 'tripRoute', 'durationMinutes') ?? '—').toString()}</Text>
// </View>
//                 {!!get(tripDetail, 'tripRoute', 'routeData') && (
//                   <View style={styles.mapContainer}>
// <VietMapWebSDK
//                       routeData={String(get(tripDetail, 'tripRoute', 'routeData'))}
//                       style={{ flex: 1 }}
//                       showOverviewMarkers={true}
//                       startMarker={undefined}
//                       endMarker={undefined}
//                       onMapLoad={() => console.log('VietMap Web SDK loaded - DriverPostTripDetail')}
//                     />
// </View>
//                 )}
//               </>
//             )}
//           </>
//         )}
//       </View>

//       {/* Xe */}
//       <Text style={styles.sectionHeaderRowStatic}>Xe</Text>
// <View style={styles.section}>
//         {tripDetail?.vehicle ? (
//           <>
// <View style={styles.detailGrid}>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Biển số:</Text> {get(tripDetail, 'vehicle', 'plateNumber') || get(tripDetail, 'vehicle', 'plate') || get(tripDetail, 'vehicle', 'Plate') || data.trip?.vehiclePlate || '—'}</Text>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Model:</Text> {get(tripDetail, 'vehicle', 'model') || get(tripDetail, 'vehicle', 'Model') || data.trip?.vehicleModel || '—'}</Text>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Loại xe:</Text> {String(get(tripDetail, 'vehicle', 'vehicleTypeName') || get(tripDetail, 'vehicle', 'type') || '—')}</Text>
// </View>
//             {!!get(tripDetail, 'vehicle', 'imageUrls')?.length && (
//               <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
//                 {(get(tripDetail, 'vehicle', 'imageUrls') || []).map((uri: string, i: number) => (
//                   <Image key={i} source={{ uri }} style={styles.thumb} />
//                 ))}
//               </ScrollView>
//             )}
//           </>
//         ) : (
//           <>
// <Text style={styles.row}><Text style={styles.rowLabel}>Model:</Text> {data.trip?.vehicleModel || '—'}</Text>
// <Text style={styles.row}><Text style={styles.rowLabel}>Biển số:</Text> {data.trip?.vehiclePlate || '—'}</Text>
// </>
//         )}
//       </View>

//       {/* Chủ chuyến (Owner) */}
//       <Text style={styles.sectionHeaderRowStatic}>Chủ chuyến</Text>
// <View style={styles.section}>
//         {tripDetail?.owner ? (
//           <View style={styles.detailGrid}>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Tên:</Text> {String(get(tripDetail, 'owner', 'fullName') || '—')}</Text>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Công ty:</Text> {String(get(tripDetail, 'owner', 'companyName') || '—')}</Text>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>SĐT:</Text> {String(get(tripDetail, 'owner', 'phoneNumber') || '—')}</Text>
// </View>
//         ) : (
//           <Text style={styles.row}>Không có dữ liệu Chủ chuyến</Text>
//         )}
//       </View>

//       {/* Đơn vị cung cấp (Provider) */}
//       <Text style={styles.sectionHeaderRowStatic}>Đơn vị cung cấp</Text>
// <View style={styles.section}>
//         {tripDetail?.provider ? (
//           <View style={styles.detailGrid}>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Tên:</Text> {String(get(tripDetail, 'provider', 'companyName') || get(tripDetail, 'provider', 'name') || '—')}</Text>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Mã số thuế:</Text> {String(get(tripDetail, 'provider', 'taxCode') || '—')}</Text>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Đánh giá TB:</Text> {String(get(tripDetail, 'provider', 'averageRating') ?? '—')}</Text>
// </View>
//         ) : (
//           <Text style={styles.row}>Không có dữ liệu Provider</Text>
//         )}
//       </View>

//       {/* Liên hệ */}
//       <Text style={styles.sectionHeaderRowStatic}>Liên hệ</Text>
// <View style={styles.section}>
//         {tripDetail?.contacts?.length ? (
//           tripDetail.contacts.map((c: AnyObj, i: number) => (
//             <View key={i} style={styles.itemBlock}>
// <Text style={styles.row}><Text style={styles.rowLabel}>Loại:</Text> {c.type || c.Type || '—'}</Text>
// <Text style={styles.row}><Text style={styles.rowLabel}>Tên:</Text> {c.fullName || c.name || c.Name || '—'}</Text>
// <Text style={styles.row}><Text style={styles.rowLabel}>SĐT:</Text> {c.phoneNumber || c.phone || c.Phone || '—'}</Text>
//               {!!c.note && <Text style={styles.row}><Text style={styles.rowLabel}>Ghi chú:</Text> {String(c.note)}</Text>}
//             </View>
//           ))
//         ) : (
//           <Text style={styles.row}>Không có liên hệ</Text>
//         )}
//       </View>

//       {/* Gói hàng */}
//       <Text style={styles.sectionHeaderRowStatic}>Gói hàng</Text>
// <View style={styles.section}>
//         {tripDetail?.packages?.length ? (
//           tripDetail.packages.map((p: AnyObj, i: number) => (
//             <View key={i} style={styles.itemBlock}>
// <View style={styles.detailGrid}>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Mã gói:</Text> {p.packageCode || p.PackageCode || '—'}</Text>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Khối lượng:</Text> {(p.weight ?? p.Weight ?? '—').toString()} kg</Text>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Thể tích:</Text> {(p.volume ?? p.Volume ?? '—').toString()} m³</Text>
// </View>
//               {!!p.imageUrls?.length && (
//                 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
//                   {p.imageUrls.map((uri: string, idx: number) => (
//                     <Image key={idx} source={{ uri }} style={styles.thumb} />
//                   ))}
//                 </ScrollView>
//               )}
//               {!!p.items?.length && (
//                 <View style={styles.termBlock}>
// <Text style={[styles.row, { fontWeight: '700' }]}>Hàng hóa:</Text>
//                   {p.items.map((it: AnyObj, j: number) => (
//                     <View key={j} style={{ marginTop: 6 }}>
// <Text style={styles.row}><Text style={styles.rowLabel}>Tên:</Text> {it.itemName || it.ItemName || '—'}</Text>
//                       {!!it.description && <Text style={styles.row}><Text style={styles.rowLabel}>Mô tả:</Text> {String(it.description)}</Text>}
//                       <Text style={styles.row}><Text style={styles.rowLabel}>Giá trị khai báo:</Text> {formatCurrency(it.declaredValue ?? it.DeclaredValue)} VND</Text>
//                       {!!it.images?.length && (
//                         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
//                           {it.images.map((uri: string, k: number) => (
//                             <Image key={k} source={{ uri }} style={styles.thumbSmall } />
//                           ))}
//                         </ScrollView>
//                       )}
//                     </View>
//                   ))}
//                 </View>
//               )}
//             </View>
//           ))
//         ) : (
//           <Text style={styles.row}>Không có gói hàng</Text>
//         )}
//       </View>

//       {/* Tài xế */}
//       <Text style={styles.sectionHeaderRowStatic}>Tài xế</Text>
// <View style={styles.section}>
//         {tripDetail?.drivers?.length ? (
//           tripDetail.drivers.map((d: AnyObj, i: number) => (
//             <View key={i} style={styles.itemBlock}>
// <View style={styles.detailGrid}>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Tên:</Text> {d.fullName || d.FullName || '—'}</Text>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Loại:</Text> {d.type || d.Type || '—'}</Text>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Trạng thái phân công:</Text> {d.assignmentStatus || d.AssignmentStatus || '—'}</Text>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Thanh toán:</Text> {(d.paymentStatus || d.PaymentStatus || '—').toString()}</Text>
// </View>
// </View>
//           ))
//         ) : (
//           <Text style={styles.row}>Chưa có tài xế</Text>
//         )}
//       </View>

//       {/* Ghi chú cho tài xế (từ mô tả bài) */}
//       <Text style={styles.sectionHeaderRowStatic}>Ghi chú</Text>
// <View style={styles.section}>
// <Text style={styles.row}>{data.description || 'Không có ghi chú thêm'}</Text>
//         {/* Explicitly exclude contracts, deliveryRecords, compensations, issues */}
//       </View>
// </ScrollView>
//     {/* Confirmation dialog */}
//     <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
// <View style={styles.confirmBackdrop}>
// <View style={styles.confirmCard}>
// <Text style={styles.confirmTitle}>Xác nhận ứng tuyển</Text>
//           {pendingDetail && (
//             <>
// <View style={styles.detailGrid}>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Loại:</Text> {String(pendingDetail.type || pendingDetail.Type || '—')}</Text>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Số lượng:</Text> {String(pendingDetail.requiredCount ?? pendingDetail.RequiredCount ?? 0)}</Text>
// </View>
// <View style={styles.detailGrid}>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Giá/người:</Text> {formatCurrency(pendingDetail.pricePerPerson ?? pendingDetail.PricePerPerson)} VND</Text>
// <Text style={styles.gridItem}><Text style={styles.rowLabel}>Ngân sách:</Text> {formatCurrency((pendingDetail.totalBudget ?? pendingDetail.TotalBudget) ?? ((pendingDetail.pricePerPerson ?? pendingDetail.PricePerPerson ?? 0) * (pendingDetail.requiredCount ?? pendingDetail.RequiredCount ?? 0)))} VND</Text>
// </View>
// <Text style={[styles.row, { marginTop: 8 }]}>Bạn chắc chắn muốn ứng tuyển vào slot này?</Text>
// </>
//           )}
//           <View style={styles.confirmActions}>
// <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setShowConfirm(false); setPendingDetail(null) }}>
// <Text style={styles.secondaryBtnText}>Hủy</Text>
// </TouchableOpacity>
//             {!alreadyInTrip && (
//               <TouchableOpacity
//                 style={[styles.applyBtn, { flex: 1 }]}
//                 onPress={() => pendingDetail && handleApply(pendingDetail)}
//               >
// <Text style={styles.applyBtnText}>Ứng tuyển</Text>
// </TouchableOpacity>
//             )}
//           </View>
// </View>
// </View>
// </Modal>

//     {/* Toast */}
//     {toast.visible && (
//       <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
// <Text style={styles.toastText}>{toast.message}</Text>
// </View>
//     )}
//     </View>
//   )
// }

// const styles = StyleSheet.create({
//   screen: { flex: 1 },
//   content: { padding: 16, paddingBottom: 40 },
//   center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
//   headerBlock: { marginBottom: 12 },
//   headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
//   title: { fontSize: 22, fontWeight: '800', color: '#111827', flex: 1, paddingRight: 12 },
//   statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
//   statusBadgeText: { fontSize: 12, fontWeight: '700' },
//   desc: { marginTop: 8, color: '#6B7280', lineHeight: 20 },
//   metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
//   metaChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
//   metaChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
//   sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
//   sectionHeaderRowStatic: { marginTop: 16, backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '700', color: '#111827' },
//   sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
//   collapseChevron: { fontSize: 16, fontWeight: '700', color: '#4B5563' },
//   section: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, marginTop: 8 },
//   row: { color: '#374151', marginTop: 6, fontSize: 13 },
//   rowLabel: { fontWeight: '600', color: '#111827' },
//   detailCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, marginTop: 10, backgroundColor: '#F9FAFB' },
//   detailHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
//   detailType: { fontSize: 13, fontWeight: '700', color: '#374151' },
//   badgeSecondary: { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
//   badgeSecondaryText: { fontSize: 11, fontWeight: '600', color: '#0369A1' },
//   detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
//   gridItem: { fontSize: 13, color: '#374151' },
//   flagRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
//   smallFlag: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
//   smallFlagText: { fontSize: 11, fontWeight: '600', color: '#374151' },
//   itemBlock: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 8, marginTop: 8, backgroundColor: '#FFFFFF' },
//   termBlock: { marginTop: 8 },
//   termRow: { fontSize: 12, color: '#374151', marginTop: 4, lineHeight: 16 },
//   blockBox: { marginTop: 8, backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
//   blockText: { fontSize: 12, color: '#374151', lineHeight: 16 },
//   thumb: { width: 84, height: 84, borderRadius: 10, marginRight: 8, backgroundColor: '#E5E7EB' },
//   thumbSmall: { width: 64, height: 64, borderRadius: 8, marginRight: 6, backgroundColor: '#E5E7EB' },
//   error: { color: '#DC2626' },
//   mapContainer: { marginTop: 8, height: 220, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
//   applyBtn: { marginTop: 10, backgroundColor: '#4F46E5', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
//   applyBtnText: { color: '#FFFFFF', fontWeight: '700' },
//   applyBtnDisabled: { backgroundColor: '#9CA3AF' },
//   confirmBackdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', alignItems:'center', padding: 16 },
//   confirmCard: { width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
//   confirmTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
//   confirmActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
//   secondaryBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', flex: 1 },
//   secondaryBtnText: { color: '#111827', fontWeight: '700' },
//   toast: { position: 'absolute', bottom: 24, left: 16, right: 16, marginHorizontal: 'auto', alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 },
//   toastText: { color: '#FFFFFF', fontWeight: '700' },
//   toastSuccess: { backgroundColor: '#059669' },
//   toastError: { backgroundColor: '#DC2626' },
//   joinedBadge: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
//   joinedBadgeText: { fontSize: 12, fontWeight: '700', color: '#166534' },
// })

// export default DriverPostTripDetailScreen

import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity, Modal, StatusBar, SafeAreaView } from 'react-native'
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
    
    // Mock location for apply (in real app, use current location or let user pick)
    const startLocation = { address: 'Vị trí hiện tại', latitude: 0, longitude: 0 } 
    const endLocation = { address: 'Điểm trả xe', latitude: 0, longitude: 0 }

    setApplyingId(String(postTripDetailId))
    try {
        const res: any = await assignmentService.applyByPostTrip({
            postTripId: String(data.id),
            postTripDetailId: String(postTripDetailId),
            startLocation,
            endLocation
        })
        if (res?.isSuccess || res?.statusCode === 201) {
            showToast('success', 'Ứng tuyển thành công!')
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
        showToast('error', e?.message || 'Lỗi ứng tuyển')
    } finally {
        setApplyingId(null)
        setShowConfirm(false)
    }
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
            // Simple logic to check availability (in real app, check accepted count)
            const isFull = false 

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
                            <Text style={styles.slotText}>Số lượng: {count}</Text>
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
                        <TouchableOpacity 
                            style={[styles.applyBtn, (applyingId || isFull) && styles.btnDisabled]}
                            onPress={() => openConfirm(d)}
                            disabled={!!applyingId || isFull}
                        >
                            {applyingId === String(d.postTripDetailId) ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.applyBtnText}>{isFull ? 'Đã đủ người' : 'Ứng tuyển ngay'}</Text>
                            )}
                        </TouchableOpacity>
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

      {/* Confirm Modal */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Xác nhận Ứng tuyển</Text>
                <Text style={styles.modalDesc}>
                    Bạn có chắc chắn muốn ứng tuyển vị trí 
                    <Text style={{fontWeight: 'bold'}}> {pendingDetail?.type === 'PRIMARY' ? 'Tài xế Chính' : 'Tài xế Phụ'} </Text>
                    với mức lương 
                    <Text style={{fontWeight: 'bold', color: '#2563EB'}}> {pendingDetail?.pricePerPerson?.toLocaleString()} đ</Text>?
                </Text>
                
                <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowConfirm(false)}>
                        <Text style={styles.btnSecondaryText}>Hủy</Text>
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
  applyBtn: { margin: 16, marginTop: 0, backgroundColor: '#4F46E5', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
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
