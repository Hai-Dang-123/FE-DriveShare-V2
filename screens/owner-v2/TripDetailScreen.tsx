

import React, { useEffect, useState, useMemo, useRef } from 'react'
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
    FlatList
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import type { Feature, LineString } from 'geojson'

// --- Icons ---
import { ArrowLeftIcon, PhoneIcon, PencilSquareIcon, CheckIcon, ArchiveBoxArrowDownIcon } from '@/screens/provider-v2/icons/ActionIcons'

// --- Services & Models ---
import tripService from '@/services/tripService'
import tripProviderContractService from '@/services/tripProviderContractService'
import { TripDetailFullDTOExtended, ContractSummary } from '@/models/types'
import { useAuth } from '@/hooks/useAuth'

// --- Utils ---
import { decodePolyline, toGeoJSONLineFeature } from '@/utils/polyline'

// --- Custom Components ---
import VietMapWebSDK from '../../components/map/VietMapWebSDK'
import { AnimatedRouteProgress } from '@/components/map/AnimatedRouteProgress'
import DriverAssignModal from './components/DriverAssignModal'
import CreatePostTripModal from './components/CreatePostTripModal'
import RouteProgressBar from '../../components/map/RouteProgressBar'

// --- Helper Component: Image Carousel ---
const SmallImageCarousel = ({ images }: { images?: string[] }) => {
    if (!images || images.length === 0) return null
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginBottom: 8 }}>
            {images.map((uri, index) => (
                <Image 
                    key={index} 
                    source={{ uri }} 
                    style={{ width: 80, height: 80, borderRadius: 8, marginRight: 8, backgroundColor: '#E5E7EB' }} 
                />
            ))}
        </ScrollView>
    )
}

// --- Helper Component: Status Badge ---
const StatusBadge = ({ status }: { status: string }) => {
    const config: any = {
        CREATED: { color: '#3B82F6', bg: '#EFF6FF', label: 'Mới tạo' },
        PENDING: { color: '#F59E0B', bg: '#FFFBEB', label: 'Đang xử lý' },
        AWAITING_OWNER_CONTRACT: { color: '#D97706', bg: '#FEF3C7', label: 'Chờ ký hợp đồng' },
        AWAITING_DRIVER: { color: '#8B5CF6', bg: '#F5F3FF', label: 'Tìm tài xế' },
        IN_PROGRESS: { color: '#10B981', bg: '#ECFDF5', label: 'Đang chạy' },
        COMPLETED: { color: '#059669', bg: '#D1FAE5', label: 'Hoàn thành' },
        CANCELLED: { color: '#EF4444', bg: '#FEF2F2', label: 'Đã hủy' },
    }
    const s = config[status] || { color: '#6B7280', bg: '#F3F4F6', label: status }
    return (
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
            <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
        </View>
    )
}

const TripDetailScreen: React.FC = () => {
    const router = useRouter()
    const params: any = useLocalSearchParams()
    const tripId = params.tripId as string
    const { user } = useAuth()

    // --- State ---
    const [loading, setLoading] = useState(true)
    const [trip, setTrip] = useState<TripDetailFullDTOExtended | null>(null)
    const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null)
    const [routeFeature, setRouteFeature] = useState<Feature<LineString> | null>(null)
    
    // Simulation State
    const [simulationActive, setSimulationActive] = useState(false)
    const [simulatedProgressIndex, setSimulatedProgressIndex] = useState(0)

    // Modals
    const [showDriverModal, setShowDriverModal] = useState(false)
    const [showCreatePostModal, setShowCreatePostModal] = useState(false)
    const [showContractModal, setShowContractModal] = useState(false) // Trạng thái modal hợp đồng
    const [signing, setSigning] = useState(false) // Trạng thái đang ký
    const [showDriverContractModal, setShowDriverContractModal] = useState(false)
    const [activeDriverContract, setActiveDriverContract] = useState<any | null>(null)
    const [loadingDriverContract, setLoadingDriverContract] = useState(false)
    const [showDeliveryModal, setShowDeliveryModal] = useState(false)
    const [activeDeliveryRecord, setActiveDeliveryRecord] = useState<any | null>(null)
    const [loadingDeliveryRecord, setLoadingDeliveryRecord] = useState(false)
    // OTP flow state
    const [showOtpModal, setShowOtpModal] = useState(false)
    const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''))
    const otpInputsRef = useRef<Array<TextInput | null>>([])
    const [otpLoading, setOtpLoading] = useState(false)
    const [otpSentTo, setOtpSentTo] = useState<string | null>(null)
    const [confirmingDrivers, setConfirmingDrivers] = useState(false)
    const [confirmingCompletion, setConfirmingCompletion] = useState(false)

    useEffect(() => {
        if (tripId) fetchTrip(tripId)
    }, [tripId])

    const fetchTrip = async (id: string) => {
        setLoading(true)
        try {
            const res = await tripService.getById(id)
            if (res.isSuccess && res.result) {
                const data = res.result
                console.log('[TripDetailScreen] fetched trip', data?.tripId ?? data)
                setTrip(data)
                
                // Decode Route
                if (data.tripRoute?.routeData) {
                    const decoded = decodePolyline(data.tripRoute.routeData)
                    setRouteCoords(decoded.coordinates as [number, number][])
                    setRouteFeature(toGeoJSONLineFeature(decoded.coordinates as [number, number][]) as Feature<LineString>)
                }
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể tải dữ liệu chuyến đi')
        } finally {
            setLoading(false)
        }
    }

    const openDriverContractModal = async (contractId?: string) => {
        if (!tripId || !contractId) return Alert.alert('Thông báo', 'Không có hợp đồng để xem')
        setLoadingDriverContract(true)
        try {
            const res: any = await tripService.getById(tripId)
            if (res?.isSuccess && res.result) {
                const found = (res.result.driverContracts || []).find((c: any) => String(c.contractId) === String(contractId))
                if (!found) return Alert.alert('Thông báo', 'Không tìm thấy hợp đồng')
                setActiveDriverContract(found)
                setShowDriverContractModal(true)
            }
        } catch (e: any) {
            console.error('openDriverContractModal failed', e)
            Alert.alert('Lỗi', e?.message || 'Không thể tải hợp đồng')
        } finally {
            setLoadingDriverContract(false)
        }
    }

    const openDeliveryRecordModal = async (recordId?: string) => {
        if (!recordId) return Alert.alert('Thông báo', 'Không có biên bản')
        setLoadingDeliveryRecord(true)
        try {
            const res: any = await tripService.getDeliveryRecordForDriver(recordId)
            if (res?.isSuccess) {
                setActiveDeliveryRecord(res.result)
                setShowDeliveryModal(true)
            } else {
                Alert.alert('Lỗi', res?.message || 'Không thể tải biên bản')
            }
        } catch (e: any) {
            console.error('openDeliveryRecordModal failed', e)
            Alert.alert('Lỗi', e?.message || 'Không thể tải biên bản')
        } finally {
            setLoadingDeliveryRecord(false)
        }
    }

    const handleConfirmDrivers = async () => {
        if (!trip) return
        // On web Alert.alert does not support custom buttons, so use a window.confirm fallback
        if (Platform.OS === 'web') {
            const ok = window.confirm('Xác nhận rằng chuyến này đã có đủ tài xế?')
            if (!ok) return
            console.log('[TripDetailScreen] (web) confirm accepted. tripId=', trip.tripId)
            setConfirmingDrivers(true)
            try {
                const dto = { TripId: trip.tripId, NewStatus: 'READY_FOR_VEHICLE_HANDOVER' }
                console.log('[TripDetailScreen] calling tripService.changeStatus', dto)
                const res: any = await tripService.changeStatus(dto)
                console.log('[TripDetailScreen] changeStatus result', res)
                const ok2 = res?.isSuccess ?? (res?.statusCode === 200)
                if (!ok2) throw new Error(res?.message || 'Xác nhận thất bại')
                Alert.alert('Thành công', 'Đã xác nhận đủ tài xế cho chuyến này.')
                await fetchTrip(tripId)
            } catch (e: any) {
                console.error('[TripDetailScreen] changeStatus error', e)
                Alert.alert('Lỗi', e?.message || 'Không thể xác nhận')
            } finally {
                setConfirmingDrivers(false)
            }
            return
        }

        // Native flow: show alert with buttons
        Alert.alert('Xác nhận', 'Xác nhận rằng chuyến này đã có đủ tài xế?', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Xác nhận', onPress: async () => {
                console.log('[TripDetailScreen] confirm button pressed. tripId=', trip.tripId)
                setConfirmingDrivers(true)
                try {
                    // Use change-status API to mark trip READY_FOR_VEHICLE_HANDOVER
                    const dto = { TripId: trip.tripId, NewStatus: 'READY_FOR_VEHICLE_HANDOVER' }
                    console.log('[TripDetailScreen] calling tripService.changeStatus', dto)
                    const res: any = await tripService.changeStatus(dto)
                    console.log('[TripDetailScreen] changeStatus result', res)
                    const ok = res?.isSuccess ?? (res?.statusCode === 200)
                    if (!ok) throw new Error(res?.message || 'Xác nhận thất bại')
                    Alert.alert('Thành công', 'Đã xác nhận đủ tài xế cho chuyến này.')
                    await fetchTrip(tripId)
                } catch (e: any) {
                    console.error('[TripDetailScreen] changeStatus error', e)
                    Alert.alert('Lỗi', e?.message || 'Không thể xác nhận')
                } finally {
                    setConfirmingDrivers(false)
                }
            } }
        ])
    }

    const handleCompleteTrip = async () => {
        if (!trip) return
        // Web fallback
        if (Platform.OS === 'web') {
            const ok = window.confirm('Xác nhận đã trả xe và hoàn tất chuyến đi?')
            if (!ok) return
            setConfirmingCompletion(true)
            try {
                const dto = { TripId: trip.tripId, NewStatus: 'COMPLETED' }
                const res: any = await tripService.changeStatus(dto)
                const ok2 = res?.isSuccess ?? (res?.statusCode === 200)
                if (!ok2) throw new Error(res?.message || 'Hoàn tất thất bại')
                Alert.alert('Thành công', 'Chuyến đi đã được hoàn tất')
                await fetchTrip(tripId)
            } catch (e: any) {
                console.error('[TripDetailScreen] completeTrip error', e)
                Alert.alert('Lỗi', e?.message || 'Không thể hoàn tất chuyến')
            } finally {
                setConfirmingCompletion(false)
            }
            return
        }

        // Native alert buttons
        Alert.alert('Xác nhận', 'Xác nhận đã trả xe và hoàn tất chuyến đi?', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Xác nhận', onPress: async () => {
                setConfirmingCompletion(true)
                try {
                    const dto = { TripId: trip.tripId, NewStatus: 'COMPLETED' }
                    const res: any = await tripService.changeStatus(dto)
                    const ok = res?.isSuccess ?? (res?.statusCode === 200)
                    if (!ok) throw new Error(res?.message || 'Hoàn tất thất bại')
                    Alert.alert('Thành công', 'Chuyến đi đã được hoàn tất')
                    await fetchTrip(tripId)
                } catch (e: any) {
                    console.error('[TripDetailScreen] completeTrip error', e)
                    Alert.alert('Lỗi', e?.message || 'Không thể hoàn tất chuyến')
                } finally {
                    setConfirmingCompletion(false)
                }
            } }
        ])
    }

    // --- Logic Ký hợp đồng ---
    const handleSignContract = async () => {
        if (!trip?.providerContracts?.contractId) return
        setSigning(true)
        try {
            // Request backend to send OTP (email)
            const contractId = trip.providerContracts.contractId
            const res: any = await tripProviderContractService.sendSignOtp(contractId)
            const ok = res?.isSuccess ?? (res?.statusCode === 200)
            if (!ok) {
                Alert.alert('Lỗi', res?.message || 'Không thể gửi mã xác nhận')
                return
            }
            // Try to extract a masked destination (email/phone) from response
            const sentTo = res?.result?.sentTo || res?.result?.email || res?.message || null
            setOtpSentTo(sentTo)
            setOtpDigits(Array(6).fill(''))
            setShowOtpModal(true)
            // focus the first input after a short delay
            setTimeout(() => otpInputsRef.current?.[0]?.focus?.(), 200)
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Không thể gửi mã xác nhận')
        } finally {
            setSigning(false)
        }
    }

    const handleOtpChange = (index: number, text: string) => {
        if (!/^[0-9]*$/.test(text)) return
        const val = text.slice(-1) // only keep last char
        setOtpDigits(prev => {
            const next = [...prev]
            next[index] = val
            return next
        })
        if (val && index < 5) {
            otpInputsRef.current[index + 1]?.focus?.()
        }
    }

    const handleOtpKeyPress = (index: number, e: any) => {
        if (e.nativeEvent.key === 'Backspace') {
            if (otpDigits[index] === '' && index > 0) {
                otpInputsRef.current[index - 1]?.focus?.()
                setOtpDigits(prev => {
                    const next = [...prev]
                    next[index - 1] = ''
                    return next
                })
            } else {
                setOtpDigits(prev => {
                    const next = [...prev]
                    next[index] = ''
                    return next
                })
            }
        }
    }

    const submitOtp = async () => {
        const otp = otpDigits.join('')
        if (otp.length < 6) {
            Alert.alert('OTP', 'Vui lòng nhập đủ 6 chữ số')
            return
        }
        if (!trip?.providerContracts?.contractId) return
        setOtpLoading(true)
        try {
            const dto = { ContractId: trip.providerContracts.contractId, Otp: otp }
            const res: any = await tripProviderContractService.signContract(dto)
            const ok = res?.isSuccess ?? (res?.statusCode === 200)
            if (!ok) {
                Alert.alert('Ký thất bại', res?.message || 'Mã OTP không hợp lệ')
                return
            }
            Alert.alert('Thành công', 'Ký hợp đồng thành công')
            setShowOtpModal(false)
            setShowContractModal(false)
            fetchTrip(tripId)
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Có lỗi khi xác thực OTP')
        } finally {
            setOtpLoading(false)
        }
    }

    const resendOtp = async () => {
        if (!trip?.providerContracts?.contractId) return
        try {
            const res: any = await tripProviderContractService.sendSignOtp(trip.providerContracts.contractId)
            const ok = res?.isSuccess ?? (res?.statusCode === 200)
            if (ok) {
                const sentTo = res?.result?.sentTo || res?.message || null
                setOtpSentTo(sentTo)
                Alert.alert('Đã gửi', 'Mã xác nhận đã được gửi lại')
                setOtpDigits(Array(6).fill(''))
                setTimeout(() => otpInputsRef.current?.[0]?.focus?.(), 200)
            } else {
                Alert.alert('Lỗi', res?.message || 'Không thể gửi lại mã')
            }
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Không thể gửi lại mã')
        }
    }

    // --- Simulation Logic ---
    const handleSimulationUpdate = (feature: any) => {
        if (feature.properties && typeof feature.properties.nearestIndex === 'number' && routeCoords) {
            setSimulatedProgressIndex(feature.properties.nearestIndex)
        }
    }

    const currentDistance = useMemo(() => {
        if (!trip?.tripRoute?.distanceKm || !routeCoords) return 0
        const total = routeCoords.length
        if (total === 0) return 0
        return (simulatedProgressIndex / total) * trip.tripRoute.distanceKm
    }, [simulatedProgressIndex, trip?.tripRoute?.distanceKm, routeCoords])

    const toggleSimulation = () => {
        setSimulationActive(!simulationActive)
        if (!simulationActive) Alert.alert('Demo Mode', 'Đã bật chế độ mô phỏng lộ trình.')
    }

    // --- Helpers: Open PDFs for contracts and delivery records ---
    const openDriverContractPdf = async (contractId?: string) => {
        if (!contractId) return Alert.alert('Thông báo', 'Không có hợp đồng tài xế')
        try {
            const res: any = await tripService.getDriverContractPdfLink(contractId)
            if (res?.result) Linking.openURL(res.result)
            else Alert.alert('Thông báo', 'Chưa có file PDF cho hợp đồng này')
        } catch (e: any) {
            console.error('openDriverContractPdf failed', e)
            Alert.alert('Lỗi', e?.message || 'Không thể tải PDF')
        }
    }

    const openDeliveryRecordPdf = async (recordId?: string) => {
        if (!recordId) return Alert.alert('Thông báo', 'Không có biên bản')
        try {
            // Use the PDF link endpoint (returns a URL in res.result)
            const res: any = await tripService.getDeliveryRecordPdfLink(recordId)
            if (res?.result) {
                // open in browser / external viewer
                Linking.openURL(res.result)
            } else {
                Alert.alert('Thông báo', 'Chưa có file PDF cho biên bản này')
            }
        } catch (e: any) {
            console.error('openDeliveryRecordPdf failed', e)
            // Show a clearer message when backend returns 404
            if (e?.response?.status === 404) {
                Alert.alert('Không tìm thấy', 'File PDF biên bản không tồn tại (404)')
            } else {
                Alert.alert('Lỗi', e?.message || 'Không thể tải PDF')
            }
        }
    }

    // --- Render ---
    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>
    if (!trip) return <View style={styles.center}><Text>Không tìm thấy chuyến đi</Text></View>

    const hasMainDriver = trip.drivers?.some(d => d.type === 'MAIN')
    const packages = trip.packages || []
    const canSign = !trip.providerContracts?.ownerSigned

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeftIcon style={{ color: '#1F2937', width: 24, height: 24 }} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi Tiết Chuyến Đi</Text>
                <TouchableOpacity onPress={toggleSimulation}>
                    <Text style={{fontSize: 20}}>{simulationActive ? '🎬' : '🧪'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* CARD 1: MAP & ROUTE */}
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <View>
                            <Text style={styles.tripCode}>Trip Code: #{trip.tripCode}</Text>
                            <View style={styles.routeTextRow}>
                                <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
                                <Text style={styles.routeText} numberOfLines={1}>{trip.shippingRoute?.startAddress?.split(',')[0]}</Text>
                                <Text style={styles.arrow}>→</Text>
                                <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                                <Text style={styles.routeText} numberOfLines={1}>{trip.shippingRoute?.endAddress?.split(',')[0]}</Text>
                            </View>
                        </View>
                        <StatusBadge status={trip.status} />
                    </View>

                    <View style={styles.mapContainer}>
                        <VietMapWebSDK
                            routeData={trip.tripRoute?.routeData}
                            showOverviewMarkers={true}
                        />
                        {simulationActive && routeFeature && (
                            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                                <AnimatedRouteProgress 
                                    route={routeFeature}
                                    isSimulating={simulationActive}
                                    speed={80}
                                    onPositionUpdate={handleSimulationUpdate}
                                />
                            </View>
                        )}
                        <View style={styles.floatingProgress}>
                            <RouteProgressBar 
                                currentDistance={currentDistance}
                                totalDistance={trip.tripRoute?.distanceKm || 100}
                                durationMinutes={trip.tripRoute?.durationMinutes || 60}
                            />
                        </View>
                    </View>
                </View>

                {/* CARD 2: VEHICLE & DRIVER */}
                <View style={styles.rowContainer}>
                    {/* Vehicle */}
                    <View style={[styles.card, { flex: 1, marginRight: 6 }]}>
                         <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>🚛 Phương tiện</Text>
                        </View>
                        {trip.vehicle ? (
                            <View>
                                <Image 
                                    source={{ uri: trip.vehicle.imageUrls?.[0] || 'https://via.placeholder.com/150' }} 
                                    style={styles.vehicleImage} 
                                />
                                <View style={styles.plateTag}>
                                    <Text style={styles.plateText}>{trip.vehicle.plateNumber}</Text>
                                </View>
                                <Text style={styles.vehicleModel}>{trip.vehicle.model} • {trip.vehicle.vehicleTypeName}</Text>
                            </View>
                        ) : (
                            <Text style={styles.emptyText}>Chưa gán xe</Text>
                        )}
                    </View>

                    {/* Driver */}
                    <View style={[styles.card, { flex: 1, marginLeft: 6 }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>👮 Đội ngũ</Text>
                            <TouchableOpacity onPress={() => setShowDriverModal(true)}>
                                <Text style={styles.linkText}>+ Gán</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {trip.drivers && trip.drivers.length > 0 ? (
                            <>
                                {trip.drivers.map((d, idx) => (
                                    <View key={idx} style={styles.driverRow}>
                                        <View style={styles.driverAvatar}>
                                            <Text style={styles.driverAvatarText}>{d.fullName.charAt(0)}</Text>
                                        </View>
                                        <View style={{flex:1}}>
                                            <Text style={styles.driverName}>{d.fullName}</Text>
                                            <Text style={styles.driverRole}>{d.type === 'MAIN' ? 'Tài chính' : 'Tài phụ'}</Text>
                                        </View>
                                        <TouchableOpacity style={styles.callBtnSmall}>
                                            <PhoneIcon style={{ width: 14, height: 14, color: '#3B82F6' }} />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                {/* still allow posting / re-assigning even when drivers exist */}
                                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                                    <TouchableOpacity style={[styles.outlineBtn, { marginRight: 8 }]} onPress={() => setShowDriverModal(true)}>
                                        <Text style={styles.outlineBtnText}>Gán thêm</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowCreatePostModal(true)}>
                                        <Text style={styles.outlineBtnText}>Đăng tìm tài</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <View style={{alignItems: 'center', marginTop: 10}}>
                                <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowDriverModal(true)}>
                                    <Text style={styles.outlineBtnText}>Gán tài xế</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.outlineBtn, {marginTop: 8}]} onPress={() => setShowCreatePostModal(true)}>
                                    <Text style={styles.outlineBtnText}>Đăng tìm tài</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* CARD 3: GOODS INFO (UPDATED with Images) */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>📦 Thông tin hàng hóa</Text>
                    </View>
                    
                    {/* Tổng quan */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Tổng trọng lượng</Text>
                            <Text style={styles.statValue}>{packages.reduce((acc, p) => acc + p.weight, 0)} kg</Text>
                        </View>
                        <View style={[styles.statBox, { borderLeftWidth: 1, borderColor: '#E5E7EB' }]}>
                            <Text style={styles.statLabel}>Tổng thể tích</Text>
                            <Text style={styles.statValue}>{packages.reduce((acc, p) => acc + p.volume, 0)} m³</Text>
                        </View>
                    </View>

                    {/* Danh sách chi tiết gói hàng */}
                    {packages.map((pkg, index) => (
                        <View key={pkg.packageId || index} style={styles.packageContainer}>
                            <View style={styles.packageHeader}>
                                <Text style={styles.pkgCode}>📦 Gói #{pkg.packageCode}</Text>
                                <Text style={styles.pkgSubInfo}>{pkg.weight}kg - {pkg.volume}m³</Text>
                            </View>
                            
                            {/* Hình ảnh gói hàng */}
                            <SmallImageCarousel images={pkg.imageUrls} />

                            {/* Danh sách items trong gói */}
                            {(pkg.items || []).map((item, idx) => (
                                <View key={item.itemId || idx} style={styles.itemRow}>
                                    <View style={{flex: 1}}>
                                        <Text style={styles.itemName}>🔹 {item.itemName}</Text>
                                        <Text style={styles.itemDesc}>{item.description || 'Không có mô tả'}</Text>
                                        <Text style={styles.itemValue}>Giá trị: {item.declaredValue?.toLocaleString()} đ</Text>
                                    </View>
                                    {/* Hình ảnh item */}
                                    {(item.images && item.images.length > 0) && (
                                        <Image 
                                            source={{ uri: item.images[0] }} 
                                            style={styles.itemThumb} 
                                        />
                                    )}
                                </View>
                            ))}
                        </View>
                    ))}
                </View>

                {/* CARD 4: CONTACTS */}
                <View style={styles.rowContainer}>
                     {(trip.contacts || []).map((c, i) => (
                        <View key={i} style={[styles.card, { flex: 1, marginRight: i%2===0?6:0, marginLeft: i%2!==0?6:0 }]}>
                             <View style={styles.contactHeader}>
                                <Text style={styles.contactRole}>{c.type === 'SENDER' ? '⬆️ Người Gửi' : '⬇️ Người Nhận'}</Text>
                             </View>
                             <Text style={styles.contactName}>{c.fullName}</Text>
                             <Text style={styles.contactPhone}>{c.phoneNumber}</Text>
                             <TouchableOpacity style={styles.callBtnFull} onPress={() => Linking.openURL(`tel:${c.phoneNumber}`)}>
                                <PhoneIcon style={{width: 16, height: 16, color: '#FFF'}} />
                             </TouchableOpacity>
                        </View>
                     ))}
                </View>

                {/* CARD 5: CONTRACT */}
                <View style={styles.card}>
                     <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>📄 Hợp đồng vận chuyển</Text>
                        <StatusBadge status={trip.providerContracts?.status || 'PENDING'} />
                    </View>
                    <View style={styles.moneyBox}>
                        <Text style={styles.moneyLabel}>Giá trị hợp đồng</Text>
                        <Text style={styles.moneyValue}>
                            {trip.providerContracts?.contractValue?.toLocaleString('vi-VN') || '0'} VND
                        </Text>
                    </View>
                    <View style={styles.contractActions}>
                        <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => setShowContractModal(true)}>
                             <Text style={styles.actionBtnTextSec}>Xem chi tiết</Text>
                        </TouchableOpacity>
                        {canSign && (
                             <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => setShowContractModal(true)}>
                                <PencilSquareIcon style={{width: 18, height: 18, color: '#FFF', marginRight: 6}} />
                                <Text style={styles.actionBtnTextPri}>Ký ngay</Text>
                           </TouchableOpacity>
                        )}
                         {(trip.providerContracts?.ownerSigned && trip.providerContracts?.counterpartySigned) && (
                             <View style={styles.completedSign}>
                                <CheckIcon style={{width: 18, height: 18, color: '#059669', marginRight: 4}} />
                                <Text style={{color: '#059669', fontWeight: '700'}}>Đã hoàn tất</Text>
                             </View>
                        )}
                    </View>
                </View>
                {/* CARD 6: DRIVER CONTRACTS */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>📜 Hợp đồng Tài xế</Text>
                        <Text style={styles.linkText}>{(trip.driverContracts || []).length} hợp đồng</Text>
                    </View>
                        {(trip.driverContracts || []).length === 0 ? (
                            <Text style={styles.emptyText}>Chưa có hợp đồng tài xế</Text>
                        ) : (
                            (trip.driverContracts || []).map((c: any, idx: number) => (
                                <View key={c.contractId || idx} style={styles.card}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>{c.contractCode || 'Hợp đồng Tài xế'}</Text>
                                        <Text style={{ fontSize: 12, color: '#6B7280' }}>{c.status || ''}</Text>
                                    </View>

                                    <View style={styles.moneyBox}>
                                        <Text style={styles.moneyLabel}>Giá trị hợp đồng</Text>
                                        <Text style={styles.moneyValue}>{(c.contractValue ?? 0).toLocaleString('vi-VN')} {c.currency || 'VND'}</Text>
                                    </View>

                                    <View style={{ marginTop: 8 }}>
                                        {(c.terms || []).slice(0,2).map((t: any, i: number) => (
                                            <Text key={t.contractTermId || i} style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>{i+1}. {t.content}</Text>
                                        ))}
                                        { (c.terms || []).length > 2 && <Text style={{ color: '#6B7280', marginTop: 4 }}>...{(c.terms || []).length - 2} điều khoản nữa</Text> }
                                    </View>

                                    <View style={styles.contractActions}>
                                        <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => openDriverContractModal(c.contractId)}>
                                            <ArchiveBoxArrowDownIcon style={{ width: 16, height: 16, color: '#374151', marginRight: 6 }} />
                                            <Text style={styles.actionBtnTextSec}>Xem chi tiết</Text>
                                        </TouchableOpacity>
                                        {c.ownerSigned && c.counterpartySigned ? (
                                            <View style={styles.completedSign}>
                                                <CheckIcon style={{width: 18, height: 18, color: '#059669', marginRight: 6}} />
                                                <Text style={{color: '#059669', fontWeight: '700'}}>Đã ký</Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity style={[styles.actionBtnPrimary, { flex: 1 }]} onPress={() => openDriverContractModal(c.contractId)}>
                                                <Text style={styles.actionBtnTextPri}>Chi tiết / Ký</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            ))
                        )}
                </View>

                {/* CARD 7: DELIVERY RECORDS */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🧾 Biên bản giao nhận</Text>
                        <Text style={styles.linkText}>{(trip.deliveryRecords || []).length} biên bản</Text>
                    </View>
                    {(trip.deliveryRecords || []).length === 0 ? (
                        <Text style={styles.emptyText}>Chưa có biên bản giao nhận</Text>
                    ) : (
                            (trip.deliveryRecords || []).map((r: any, i: number) => (
                                <TouchableOpacity key={r.tripDeliveryRecordId || i} onPress={() => openDeliveryRecordModal(r.tripDeliveryRecordId)} style={{ marginBottom: 12 }}>
                                <View style={{ padding: 12, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontWeight: '800' }}>{r.recordType === 'PICKUP' ? 'Biên bản Lấy hàng' : 'Biên bản Giao hàng'}</Text>
                                    <Text style={{ fontSize: 12, color: '#6B7280' }}>{new Date(r.createAt).toLocaleString('vi-VN')}</Text>
                                </View>
                                <Text style={{ marginTop: 8, color: '#374151' }}>{r.note || ''}</Text>
                                <View style={{ marginTop: 8 }}>
                                    {(r.terms || []).map((t: any, j: number) => (
                                        <Text key={t.deliveryRecordTermId || j} style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>{j+1}. {t.content}</Text>
                                    ))}
                                </View>
                                <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ fontSize: 12, color: r.driverSigned ? '#059669' : '#9CA3AF' }}>{r.driverSigned ? 'Tài xế: Đã ký' : 'Tài xế: Chưa ký'}</Text>
                                            {r.driverSignedAt ? <Text style={{ fontSize: 11, color: '#6B7280' }}>{new Date(r.driverSignedAt).toLocaleString('vi-VN')}</Text> : null}
                                        </View>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ fontSize: 12, color: r.contactSigned ? '#059669' : '#9CA3AF' }}>{r.contactSigned ? 'Khách: Đã ký' : 'Khách: Chưa ký'}</Text>
                                            {r.contactSignedAt ? <Text style={{ fontSize: 11, color: '#6B7280' }}>{new Date(r.contactSignedAt).toLocaleString('vi-VN')}</Text> : null}
                                        </View>
                                    </View>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity style={[styles.actionBtnSecondary, { paddingHorizontal: 12 }]} onPress={() => openDeliveryRecordPdf(r.tripDeliveryRecordId)}>
                                                <ArchiveBoxArrowDownIcon style={{ width: 16, height: 16, color: '#374151', marginRight: 6 }} />
                                                <Text style={styles.actionBtnTextSec}>Xem PDF</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                                </TouchableOpacity>
                            ))
                    )}
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* --- MODALS --- */}
            <DriverAssignModal
                visible={showDriverModal}
                onClose={() => setShowDriverModal(false)}
                trip={trip}
                tripId={trip.tripId}
                mainDriverExists={hasMainDriver}
                onAssigned={(updated) => setTrip(updated)}
            />
            
            <CreatePostTripModal
                visible={showCreatePostModal}
                onClose={() => setShowCreatePostModal(false)}
                tripId={trip.tripId}
                onCreated={() => Alert.alert('Thành công', 'Đã tạo bài đăng tìm tài xế!')}
            />

            {/* MODAL HỢP ĐỒNG - REDESIGNED V2 (A4 PAPER STYLE) */}
            <Modal visible={showContractModal} transparent animationType="slide" onRequestClose={() => setShowContractModal(false)}>
                <View style={styles.modalBackdrop}>
                    {/* Khung mô phỏng tờ giấy A4 */}
                    <View style={styles.modalPaper}>
                        
                        {/* Nút đóng (X) nằm góc trên */}
                        <TouchableOpacity style={styles.paperCloseBtn} onPress={() => setShowContractModal(false)}>
                            <Text style={styles.paperCloseText}>×</Text>
                        </TouchableOpacity>

                        <ScrollView style={styles.paperScroll} showsVerticalScrollIndicator={true}>
                            <View style={styles.paperContent}>
                                
                                {/* 1. Header: Logo & Quốc hiệu */}
                                <View style={styles.docHeader}>
                                    <View style={styles.docHeaderLeft}>
                                        {/* LOGO CỦA BẠN */}
                                        <Image 
                                            source={require('../../assets/icon-with-name.png')} 
                                            style={styles.docLogo} 
                                            resizeMode="contain" 
                                        />
                                        <Text style={styles.docCompany}>CÔNG TY CỔ PHẦN{"\n"}DRIVESHARE LOGISTICS</Text>
                                    </View>
                                    <View style={styles.docHeaderRight}>
                                        <Text style={styles.docNational}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
                                        <Text style={styles.docMotto}>Độc lập - Tự do - Hạnh phúc</Text>
                                        <View style={styles.docLine} />
                                    </View>
                                </View>

                                {/* 2. Title & Number */}
                                <View style={styles.docTitleSection}>
                                    <Text style={styles.docTitleMain}>HỢP ĐỒNG VẬN CHUYỂN</Text>
                                    <Text style={styles.docNumber}>Số: {trip.providerContracts?.contractCode || '.......'}/HĐVC-{new Date().getFullYear()}</Text>
                                    <Text style={styles.docDate}>
                                        Hôm nay, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                                    </Text>
                                </View>

                                {/* 3. Căn cứ pháp lý (Hardcode cho giống thật) */}
                                <View style={styles.docLegalSection}>
                                    <Text style={styles.docItalic}>- Căn cứ Bộ luật Dân sự số 91/2015/QH13;</Text>
                                    <Text style={styles.docItalic}>- Căn cứ Luật Thương mại số 36/2005/QH11;</Text>
                                    <Text style={styles.docItalic}>- Căn cứ nhu cầu và khả năng của hai bên.</Text>
                                </View>

                                <View style={styles.docDivider} />

                                {/* 4. Bên A (Chủ xe / Đơn vị vận tải) */}
                                <View style={styles.docPartySection}>
                                    <Text style={styles.docPartyTitle}>BÊN A: CHỦ XE / ĐƠN VỊ VẬN TẢI</Text>
                                    <View style={styles.docRow}>
                                        <Text style={styles.docLabel}>Đơn vị / Biển số:</Text>
                                        <Text style={styles.docValue}>{trip.vehicle?.plateNumber ? `${trip.vehicle.plateNumber} • ${trip.vehicle?.vehicleTypeName || ''}` : 'Đang cập nhật'}</Text>
                                    </View>
                                    <View style={styles.docRow}>
                                        <Text style={styles.docLabel}>Tài xế đại diện:</Text>
                                        <Text style={styles.docValue}>{trip.drivers?.[0]?.fullName || 'Đang cập nhật'}</Text>
                                    </View>
                                    <View style={styles.docRow}>
                                        <Text style={styles.docLabel}>Liên hệ:</Text>
                                        <Text style={styles.docValue}>{trip.drivers?.[0]?.fullName || '—'}</Text>
                                    </View>
                                </View>

                                {/* 5. Bên B (Chủ hàng / Provider) */}
                                <View style={styles.docPartySection}>
                                    <Text style={styles.docPartyTitle}>BÊN B: CHỦ HÀNG / PROVIDER</Text>
                                    <View style={styles.docRow}>
                                        <Text style={styles.docLabel}>Đại diện:</Text>
                                        <Text style={styles.docValue}>{trip.provider?.companyName || 'Người gửi'}</Text>
                                    </View>
                                    <View style={styles.docRow}>
                                        <Text style={styles.docLabel}>Điện thoại:</Text>
                                        {/* <Text style={styles.docValue}>{trip.provider?.phoneNumber || '...'}</Text> */}
                                    </View>
                                    <View style={styles.docRow}>
                                        <Text style={styles.docLabel}>Địa chỉ:</Text>
                                        <Text style={styles.docValue} numberOfLines={1}>{trip.shippingRoute?.startAddress || '...'}</Text>
                                    </View>
                                </View>

                                {/* 6. Nội dung điều khoản */}
                                <View style={styles.docTermsSection}>
                                    <Text style={[styles.docPartyTitle, { marginBottom: 4 }]}>ĐIỀU KHOẢN CHÍNH:</Text>
                                    <Text style={styles.docText}>
                                        Hai bên thỏa thuận thực hiện vận chuyển lô hàng với chi tiết như sau:{'\n'}
                                        - Mã chuyến: {trip.tripCode}{'\n'}
                                        - Giá trị hợp đồng: <Text style={{fontWeight: 'bold'}}>{trip.providerContracts?.contractValue?.toLocaleString('vi-VN')} VNĐ</Text>{'\n'}
                                        {trip.providerContracts?.terms?.map((t, i) => `- Điều ${i+1}: ${t.content}`).join('\n') || '- Theo quy định của sàn DriveShare.'}
                                    </Text>
                                </View>

                                {/* 7. Khu vực ký tên (2 bên) */}
                                <View style={styles.docSignatureSection}>
                                    {/* Cột Bên A */}
                                    <View style={styles.docSigBlock}>
                                        <Text style={styles.docSigTitle}>ĐẠI DIỆN BÊN A</Text>
                                        <Text style={styles.docSigSub}>(Ký, ghi rõ họ tên)</Text>
                                        
                                            <View style={styles.docSigBox}>
                                                {trip.providerContracts?.counterpartySigned ? (
                                                    <View style={styles.signedStamp}>
                                                        <Text style={styles.signedText}>ĐÃ KÝ</Text>
                                                        <Text style={styles.signedDate}>{trip.providerContracts?.counterpartySignAt ? new Date(trip.providerContracts.counterpartySignAt).toLocaleDateString('vi-VN') : ''}</Text>
                                                    </View>
                                                ) : (
                                                    <Text style={styles.pendingText}>Chưa ký</Text>
                                                )}
                                            </View>
                                            <Text style={styles.docSigName}>{trip.drivers?.[0]?.fullName || 'Đại diện Đơn vị vận tải'}</Text>
                                    </View>

                                    {/* Cột Bên B */}
                                    <View style={styles.docSigBlock}>
                                        <Text style={styles.docSigTitle}>ĐẠI DIỆN BÊN B</Text>
                                        <Text style={styles.docSigSub}>(Ký, đóng dấu)</Text>
                                        
                                        <View style={styles.docSigBox}>
                                            {trip.providerContracts?.ownerSigned ? (
                                                <View style={[styles.signedStamp, { borderColor: '#065F46' }]}>
                                                    <Text style={[styles.signedText, { color: '#065F46' }]}>ĐÃ KÝ</Text>
                                                    <Text style={styles.signedDate}>{trip.providerContracts?.ownerSignAt ? new Date(trip.providerContracts.ownerSignAt).toLocaleDateString('vi-VN') : ''}</Text>
                                                </View>
                                            ) : (
                                                <Text style={styles.pendingText}>Chưa ký</Text>
                                            )}
                                        </View>
                                        <Text style={styles.docSigName}>{trip.contacts?.find(c => c.type === 'SENDER')?.fullName || 'Chủ Hàng'}</Text>
                                    </View>
                                </View>

                            </View>
                        </ScrollView>

                        {/* Footer Actions (Fixed at bottom of modal) */}
                        <View style={styles.paperFooter}>
                            <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => {
                                if (trip.providerContracts?.fileURL) Linking.openURL(trip.providerContracts.fileURL)
                                else Alert.alert('Thông báo', 'Chưa có file PDF')
                            }}>
                                <ArchiveBoxArrowDownIcon style={{ width: 18, height: 18, color: '#374151', marginRight: 6 }} />
                                <Text style={styles.actionBtnTextSec}>Tải PDF</Text>
                            </TouchableOpacity>
                            
                            {canSign && (
                                <TouchableOpacity 
                                    style={[styles.actionBtnPrimary, signing && { opacity: 0.7 }]} 
                                    onPress={handleSignContract}
                                    disabled={signing}
                                >
                                    {signing ? <ActivityIndicator color="#FFF" /> : <PencilSquareIcon style={{ width: 18, height: 18, color: '#FFF', marginRight: 6 }} />}
                                    <Text style={styles.actionBtnTextPri}>{signing ? 'Đang ký...' : 'Ký xác nhận'}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* OTP Modal for contract signing */}
            <Modal visible={showOtpModal} transparent animationType="fade" onRequestClose={() => setShowOtpModal(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { maxWidth: 420, width: '92%', padding: 18 }]}>
                        <Text style={{ fontSize: 16, fontWeight: '800', marginBottom: 8 }}>Nhập mã xác nhận</Text>
                        <Text style={{ color: '#6B7280', marginBottom: 12 }}>{otpSentTo ? `Mã đã được gửi tới ${otpSentTo}` : 'Mã xác nhận đã được gửi vào email của bạn.'}</Text>

                        <View style={styles.otpRow}>
                            {otpDigits.map((d, i) => (
                                <View key={i} style={styles.otpBox}>
                                    <TextInput
                                        ref={r => { otpInputsRef.current[i] = r }}
                                        keyboardType="number-pad"
                                        returnKeyType={i === 5 ? 'done' : 'next'}
                                        maxLength={1}
                                        value={d}
                                        onChangeText={t => handleOtpChange(i, t)}
                                        onKeyPress={e => handleOtpKeyPress(i, e)}
                                        style={styles.otpInput}
                                        textAlign="center"
                                        autoFocus={i === 0}
                                    />
                                </View>
                            ))}
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                            <TouchableOpacity onPress={resendOtp} style={[styles.actionBtnSecondary, { flex: 0.48 }]}>
                                <Text style={styles.actionBtnTextSec}>Gửi lại</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={submitOtp} style={[styles.actionBtnPrimary, { flex: 0.48 }]} disabled={otpLoading}>
                                {otpLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionBtnTextPri}>Xác nhận</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Bottom confirm bar for awaiting owner contract signature */}
            {trip.status === 'AWAITING_OWNER_CONTRACT' ? (
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={[styles.confirmBtn, signing && { opacity: 0.7 }]} onPress={handleSignContract} disabled={signing}>
                        {signing ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Ký xác nhận hợp đồng</Text>}
                    </TouchableOpacity>
                </View>
            ) : null}

            {/* Bottom confirm bar for pending driver assignment */}
            {trip.status === 'PENDING_DRIVER_ASSIGNMENT' ? (
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={[styles.confirmBtn, confirmingDrivers && { opacity: 0.7 }]} onPress={handleConfirmDrivers} disabled={confirmingDrivers}>
                        {confirmingDrivers ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Xác nhận đủ tài xế</Text>}
                    </TouchableOpacity>
                </View>
            ) : null}

            {/* Bottom confirm bar for vehicle returned -> complete trip */}
            {trip.status === 'VEHICLE_RETURNED' ? (
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={[styles.confirmBtn, confirmingCompletion && { opacity: 0.7 }]} onPress={handleCompleteTrip} disabled={confirmingCompletion}>
                        {confirmingCompletion ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Xác nhận trả xe & Hoàn tất chuyến</Text>}
                    </TouchableOpacity>
                </View>
            ) : null}

            {/* DRIVER CONTRACT MODAL (A4 style, mirrors provider modal) */}
            <Modal visible={showDriverContractModal && !!activeDriverContract} transparent animationType="slide" onRequestClose={() => { setShowDriverContractModal(false); setActiveDriverContract(null) }}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalPaper}>
                        <TouchableOpacity style={styles.paperCloseBtn} onPress={() => { setShowDriverContractModal(false); setActiveDriverContract(null) }}>
                            <Text style={styles.paperCloseText}>×</Text>
                        </TouchableOpacity>

                        <ScrollView style={styles.paperScroll} showsVerticalScrollIndicator={true}>
                            <View style={styles.paperContent}>
                                {/* Header */}
                                <View style={styles.docHeader}>
                                    <View style={styles.docHeaderLeft}>
                                        <Image source={require('../../assets/icon-with-name.png')} style={styles.docLogo} resizeMode="contain" />
                                        <Text style={styles.docCompany}>CÔNG TY CỔ PHẦN{"\n"}DRIVESHARE LOGISTICS</Text>
                                    </View>
                                    <View style={styles.docHeaderRight}>
                                        <Text style={styles.docNational}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
                                        <Text style={styles.docMotto}>Độc lập - Tự do - Hạnh phúc</Text>
                                        <View style={styles.docLine} />
                                    </View>
                                </View>

                                <View style={styles.docTitleSection}>
                                    <Text style={styles.docTitleMain}>HỢP ĐỒNG VẬN CHUYỂN (TÀI XẾ)</Text>
                                    <Text style={styles.docNumber}>Số: {activeDriverContract?.contractCode || '.......'}/HĐ-DRIVER</Text>
                                    <Text style={styles.docDate}>Ngày: {activeDriverContract?.effectiveDate ? new Date(activeDriverContract.effectiveDate).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}</Text>
                                </View>

                                <View style={styles.docLegalSection}>
                                    <Text style={styles.docItalic}>- Hợp đồng giữa chủ xe và tài xế theo thỏa thuận hai bên.</Text>
                                </View>

                                <View style={styles.docDivider} />

                                <View style={styles.docPartySection}>
                                    <Text style={styles.docPartyTitle}>BÊN A: CHỦ XE / ĐƠN VỊ VẬN TẢI</Text>
                                    <View style={styles.docRow}>
                                        <Text style={styles.docLabel}>Đơn vị / Biển số:</Text>
                                        <Text style={styles.docValue}>{trip.vehicle?.plateNumber ? `${trip.vehicle.plateNumber} • ${trip.vehicle?.vehicleTypeName || ''}` : 'Đang cập nhật'}</Text>
                                    </View>
                                    <View style={styles.docRow}>
                                        <Text style={styles.docLabel}>Liên hệ:</Text>
                                        <Text style={styles.docValue}>{trip.contacts?.[0]?.fullName || '—'}</Text>
                                    </View>
                                </View>

                                <View style={styles.docPartySection}>
                                    <Text style={styles.docPartyTitle}>BÊN B: TÀI XẾ</Text>
                                    <View style={styles.docRow}>
                                        <Text style={styles.docLabel}>Họ tên:</Text>
                                        <Text style={styles.docValue}>{activeDriverContract?.counterpartyName || 'Tài xế'}</Text>
                                    </View>
                                    <View style={styles.docRow}>
                                        <Text style={styles.docLabel}>Hiệu lực:</Text>
                                        <Text style={styles.docValue}>{activeDriverContract?.effectiveDate ? `${new Date(activeDriverContract.effectiveDate).toLocaleDateString('vi-VN')} - ${activeDriverContract?.expirationDate ? new Date(activeDriverContract.expirationDate).toLocaleDateString('vi-VN') : '...'}` : '—'}</Text>
                                    </View>
                                </View>

                                <View style={styles.docTermsSection}>
                                    <Text style={[styles.docPartyTitle, { marginBottom: 4 }]}>ĐIỀU KHOẢN CHÍNH:</Text>
                                    <Text style={styles.docText}>
                                        { (activeDriverContract?.terms || []).map((t: any, i: number) => `- Điều ${i+1}: ${t.content}`).join('\n') || '- Nội dung hợp đồng theo thỏa thuận.' }
                                    </Text>
                                </View>

                                <View style={styles.docSignatureSection}>
                                    <View style={styles.docSigBlock}>
                                        <Text style={styles.docSigTitle}>ĐẠI DIỆN CHỦ XE</Text>
                                        <Text style={styles.docSigSub}>(Ký, ghi rõ họ tên)</Text>
                                        <View style={styles.docSigBox}>
                                            {activeDriverContract?.ownerSigned ? (
                                                <View style={styles.signedStamp}><Text style={styles.signedText}>ĐÃ KÝ</Text></View>
                                            ) : (
                                                <Text style={styles.pendingText}>Chưa ký</Text>
                                            )}
                                        </View>
                                        <Text style={styles.docSigName}>{trip.drivers?.[0]?.fullName || 'Đại diện'}</Text>
                                    </View>

                                    <View style={styles.docSigBlock}>
                                        <Text style={styles.docSigTitle}>ĐẠI DIỆN TÀI XẾ</Text>
                                        <Text style={styles.docSigSub}>(Ký, ghi rõ họ tên)</Text>
                                        <View style={styles.docSigBox}>
                                            {activeDriverContract?.counterpartySigned ? (
                                                <View style={[styles.signedStamp, { borderColor: '#065F46' }]}><Text style={[styles.signedText, { color: '#065F46' }]}>ĐÃ KÝ</Text></View>
                                            ) : (
                                                <Text style={styles.pendingText}>Chưa ký</Text>
                                            )}
                                        </View>
                                        <Text style={styles.docSigName}>{activeDriverContract?.counterpartyName || 'Tài xế'}</Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.paperFooter}>
                            <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => openDriverContractPdf(activeDriverContract?.contractId)}>
                                <ArchiveBoxArrowDownIcon style={{ width: 18, height: 18, color: '#374151', marginRight: 6 }} />
                                <Text style={styles.actionBtnTextSec}>Tải PDF</Text>
                            </TouchableOpacity>
                            {/* Owner may not sign driver contract here; keep only download */}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* DELIVERY RECORD MODAL (owner view) */}
            <Modal visible={showDeliveryModal && !!activeDeliveryRecord} transparent animationType="slide" onRequestClose={() => { setShowDeliveryModal(false); setActiveDeliveryRecord(null) }}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalPaper}>
                        <TouchableOpacity style={styles.paperCloseBtn} onPress={() => { setShowDeliveryModal(false); setActiveDeliveryRecord(null) }}>
                            <Text style={styles.paperCloseText}>×</Text>
                        </TouchableOpacity>
                        <ScrollView style={styles.paperScroll} showsVerticalScrollIndicator={true}>
                            <View style={styles.paperContent}>
                                <View style={styles.docHeader}>
                                    <View style={styles.docHeaderLeft}>
                                        <Image source={require('../../assets/icon-with-name.png')} style={styles.docLogo} resizeMode="contain" />
                                        <Text style={styles.docCompany}>CÔNG TY CỔ PHẦN{"\n"}DRIVESHARE LOGISTICS</Text>
                                    </View>
                                    <View style={styles.docHeaderRight}>
                                        <Text style={styles.docNational}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
                                        <Text style={styles.docMotto}>Độc lập - Tự do - Hạnh phúc</Text>
                                        <View style={styles.docLine} />
                                    </View>
                                </View>

                                <View style={styles.docTitleSection}>
                                    <Text style={styles.docTitleMain}>BIÊN BẢN GIAO NHẬN</Text>
                                    <Text style={styles.docNumber}>Số: {activeDeliveryRecord?.tripDeliveryRecordId ? String(activeDeliveryRecord.tripDeliveryRecordId).substring(0,8).toUpperCase() : '---'}</Text>
                                    <Text style={styles.docDate}>Ngày: {activeDeliveryRecord?.createAt ? new Date(activeDeliveryRecord.createAt).toLocaleDateString('vi-VN') : ''}</Text>
                                </View>

                                <View style={styles.docPartySection}>
                                    <Text style={styles.docPartyTitle}>THÔNG TIN CÁC BÊN</Text>
                                    <View style={styles.docRow}>
                                        <Text style={styles.docLabel}>Người giao:</Text>
                                        <Text style={styles.docValue}>{activeDeliveryRecord?.driverPrimary?.fullName || '—'}</Text>
                                    </View>
                                    <View style={styles.docRow}>
                                        <Text style={styles.docLabel}>Người nhận:</Text>
                                        <Text style={styles.docValue}>{activeDeliveryRecord?.tripContact?.fullName || '—'}</Text>
                                    </View>
                                </View>

                                <View style={styles.docTermsSection}>
                                    <Text style={[styles.docPartyTitle, { marginBottom: 4 }]}>NỘI DUNG BIÊN BẢN:</Text>
                                    <Text style={styles.docText}>{activeDeliveryRecord?.note || ''}</Text>
                                    <View style={{ marginTop: 8 }}>
                                        {(activeDeliveryRecord?.terms || []).map((t: any, i: number) => (
                                            <Text key={t.deliveryRecordTermId || i} style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>{i+1}. {t.content}</Text>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.docSignatureSection}>
                                    <View style={styles.docSigBlock}>
                                        <Text style={styles.docSigTitle}>ĐẠI DIỆN TÀI XẾ</Text>
                                        <View style={styles.docSigBox}>{activeDeliveryRecord?.driverSigned ? <View style={styles.signedStamp}><Text style={styles.signedText}>ĐÃ KÝ</Text></View> : <Text style={styles.pendingText}>Chưa ký</Text>}</View>
                                        {activeDeliveryRecord?.driverSignedAt ? <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>{new Date(activeDeliveryRecord.driverSignedAt).toLocaleString('vi-VN')}</Text> : null}
                                    </View>
                                    <View style={styles.docSigBlock}>
                                        <Text style={styles.docSigTitle}>ĐẠI DIỆN KHÁCH HÀNG</Text>
                                        <View style={styles.docSigBox}>{activeDeliveryRecord?.contactSigned ? <View style={[styles.signedStamp, { borderColor:'#DC2626' }]}><Text style={[styles.signedText,{color:'#DC2626'}]}>ĐÃ KÝ</Text></View> : <Text style={styles.pendingText}>Chưa ký</Text>}</View>
                                        {activeDeliveryRecord?.contactSignedAt ? <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>{new Date(activeDeliveryRecord.contactSignedAt).toLocaleString('vi-VN')}</Text> : null}
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.paperFooter}>
                            <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => openDeliveryRecordPdf(activeDeliveryRecord?.tripDeliveryRecordId)}>
                                <ArchiveBoxArrowDownIcon style={{ width: 18, height: 18, color: '#374151', marginRight: 6 }} />
                                <Text style={styles.actionBtnTextSec}>Xem PDF</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16, paddingBottom: 30 },
    
    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF' },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
    
    // Cards
    card: { backgroundColor: '#FFF', borderRadius: 16, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: {width:0, height:2}, shadowRadius: 4, elevation: 2 },
    rowContainer: { flexDirection: 'row', marginBottom: 12 },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    
    // Typography
    tripCode: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
    routeTextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '80%' },
    routeText: { fontSize: 13, color: '#4B5563', maxWidth: 100 },
    arrow: { color: '#9CA3AF' },
    dot: { width: 6, height: 6, borderRadius: 3 },
    
    // Map
    mapContainer: { height: 220, borderRadius: 12, overflow: 'hidden', position: 'relative' },
    floatingProgress: { position: 'absolute', bottom: 12, left: 12, right: 12 },
    
    // Sections
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
    linkText: { color: '#3B82F6', fontWeight: '600', fontSize: 13 },
    emptyText: { color: '#9CA3AF', fontStyle: 'italic', fontSize: 12, textAlign: 'center', marginVertical: 8 },
    
    // Vehicle
    vehicleImage: { width: '100%', height: 100, borderRadius: 8, backgroundColor: '#E5E7EB', marginBottom: 8 },
    plateTag: { position: 'absolute', bottom: 34, left: 4, backgroundColor: '#1E40AF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    plateText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
    vehicleModel: { fontSize: 12, color: '#4B5563', textAlign: 'center' },
    
    // Driver
    driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 8 },
    driverAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    driverAvatarText: { color: '#1E40AF', fontWeight: '700' },
    driverName: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
    driverRole: { fontSize: 11, color: '#6B7280' },
    callBtnSmall: { padding: 6, backgroundColor: '#EFF6FF', borderRadius: 12 },
    outlineBtn: { borderWidth: 1, borderColor: '#E5E7EB', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center' },
    outlineBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
    
    // Goods Info (New Styles)
    statsGrid: { flexDirection: 'row', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 12 },
    statBox: { flex: 1, padding: 12, alignItems: 'center' },
    statLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
    packageContainer: { marginTop: 8, padding: 10, backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
    packageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pkgCode: { fontWeight: '700', fontSize: 14, color: '#1F2937' },
    pkgSubInfo: { fontSize: 12, color: '#6B7280' },
    itemRow: { flexDirection: 'row', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    itemName: { fontWeight: '600', fontSize: 13, color: '#374151' },
    itemDesc: { fontSize: 12, color: '#6B7280', marginVertical: 2 },
    itemValue: { fontSize: 12, color: '#059669', fontWeight: '500' },
    itemThumb: { width: 40, height: 40, borderRadius: 4, marginLeft: 8, backgroundColor: '#E5E7EB' },

    // Contact
    contactHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    contactRole: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
    contactName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
    contactPhone: { fontSize: 13, color: '#4B5563', marginBottom: 10 },
    callBtnFull: { backgroundColor: '#10B981', padding: 8, borderRadius: 20, alignItems: 'center', alignSelf: 'flex-start', width: 36, height: 36, justifyContent: 'center' },
    
    // Contract
    moneyBox: { alignItems: 'center', paddingVertical: 12, backgroundColor: '#F0FDF4', borderRadius: 8, marginBottom: 12 },
    moneyLabel: { fontSize: 12, color: '#166534' },
    moneyValue: { fontSize: 20, fontWeight: '800', color: '#15803D' },
    contractActions: { flexDirection: 'row', gap: 10 },
    actionBtnSecondary: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    actionBtnPrimary: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#2563EB', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    actionBtnTextSec: { fontWeight: '600', color: '#374151' },
    actionBtnTextPri: { fontWeight: '600', color: '#FFF' },
    completedSign: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', padding: 10, borderRadius: 8 },

    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalPaper: {
        width: '100%',
        height: '90%',
        backgroundColor: '#FFFFFF', // Màu giấy trắng
        borderRadius: 4, // Góc giấy chỉ bo nhẹ
        overflow: 'hidden',
    },
    paperCloseBtn: {
        position: 'absolute',
        top: 8,
        right: 12,
        zIndex: 10,
        backgroundColor: '#F3F4F6',
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    paperCloseText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#6B7280',
        marginTop: -2,
    },
    paperScroll: {
        flex: 1,
    },
    paperContent: {
        padding: 20, // Lề giấy
    },

    // OTP modal styles
    otpRow: { flexDirection: 'row', justifyContent: 'space-between' },
    otpBox: { width: 44, height: 52, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    otpInput: { fontSize: 20, fontWeight: '800', color: '#111827', padding: 0, height: 52, width: '100%' },
    
    // --- Header Văn bản ---
    docHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    docHeaderLeft: {
        width: '40%',
        alignItems: 'center',
    },
    docLogo: {
        width: 50,
        height: 50,
        marginBottom: 4,
    },
    docCompany: {
        fontSize: 9,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1F2937',
    },
    docHeaderRight: {
        width: '58%',
        alignItems: 'center',
    },
    docNational: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    docMotto: {
        fontSize: 11,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
        textAlign: 'center',
        marginTop: 2,
    },
    docLine: {
        height: 1,
        width: '50%',
        backgroundColor: '#000',
        marginTop: 4,
    },

    // --- Title ---
    docTitleSection: {
        alignItems: 'center',
        marginBottom: 16,
    },
    docTitleMain: {
        fontSize: 18,
        fontWeight: '900',
        color: '#111827',
        textTransform: 'uppercase',
        textAlign: 'center',
        marginBottom: 4,
    },
    docNumber: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#374151',
    },
    docDate: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#4B5563',
        marginTop: 2,
    },

    // --- Legal ---
    docLegalSection: {
        marginBottom: 12,
        paddingLeft: 10,
    },
    docItalic: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#374151',
        marginBottom: 2,
    },
    docDivider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 10,
    },

    // --- Parties ---
    docPartySection: {
        marginBottom: 16,
    },
    docPartyTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
        color: '#000',
        marginBottom: 6,
    },
    docRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    docLabel: {
        width: 80,
        fontSize: 13,
        color: '#4B5563',
    },
    docValue: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#111827',
    },

    // --- Terms ---
    docTermsSection: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    docText: {
        fontSize: 13,
        lineHeight: 20,
        color: '#374151',
    },

    // --- Signature Section ---
    docSignatureSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 30,
    },
    docSigBlock: {
        width: '48%',
        alignItems: 'center',
    },
    docSigTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    docSigSub: {
        fontSize: 10,
        fontStyle: 'italic',
        color: '#6B7280',
        marginBottom: 8,
    },
    docSigBox: {
        width: '100%',
        height: 100,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    docSigName: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    
    // --- Stamp Styles ---
    signedStamp: {
        borderWidth: 2,
        borderColor: '#059669',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        transform: [{ rotate: '-10deg' }],
        alignItems: 'center',
    },
    signedText: {
        color: '#059669',
        fontWeight: '900',
        fontSize: 14,
        textTransform: 'uppercase',
    },
    signedDate: {
        color: '#059669',
        fontSize: 9,
    },
    pendingText: {
        color: '#9CA3AF',
        fontStyle: 'italic',
    },

    // --- Footer Actions ---
    paperFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#F9FAFB',
    },
    
    // Modal
    // modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderColor: '#E5E7EB', paddingBottom: 10 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    closeX: { fontSize: 24, color: '#6B7280' },
    contractText: { fontSize: 14, color: '#374151', lineHeight: 22 },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },

    // Common
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeText: { fontSize: 11, fontWeight: '700' }
    ,
    bottomBar: {
    position: 'absolute',
    left: 16, // Cách lề trái
    right: 16, // Cách lề phải
    bottom: 20, // Đẩy lên cao hơn một chút tránh thanh Home ảo
    backgroundColor: 'transparent',
    zIndex: 9999, // Tăng zIndex tối đa
    elevation: 20
},
    confirmBtn: { backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', width: '100%' },
    confirmBtnText: { color: '#FFFFFF', fontWeight: '800' }
})

export default TripDetailScreen