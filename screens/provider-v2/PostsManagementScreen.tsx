// import React, { useEffect, useState } from 'react'
// import {
//   View,
//   Text,
//   SafeAreaView,
//   TouchableOpacity,
//   ActivityIndicator,
//   StyleSheet,
//   Alert,
// } from 'react-native'
// import { FreightPost, ProviderTripSummary } from '../../models/types'
// import PostPackageList from './components/PostPackageList'
// import PostFormModal from './components/PostFormModal'
// import PostPackageDetailModal from './components/PostPackageDetailModal'
// import { ArrowLeftIcon } from './icons/ActionIcons'
// import { router } from 'expo-router'
// import postService from '@/services/postService'
// // Modal removed; using dedicated trip detail screen route instead

// interface PostsManagementPageProps {
//   onBack: () => void
// }

// const PostsManagementScreen: React.FC<PostsManagementPageProps> = ({ onBack }) => {
//   const [posts, setPosts] = useState<FreightPost[]>([])
//   const [trips, setTrips] = useState<ProviderTripSummary[]>([])
//   const [loading, setLoading] = useState(false)
//   const [tripLoading, setTripLoading] = useState(false)
//   const [error, setError] = useState<string | null>(null)
//   const [tripError, setTripError] = useState<string | null>(null)
//   const [modalVisible, setModalVisible] = useState(false)
//   const [detailId, setDetailId] = useState<string | null>(null)
//   const [detailVisible, setDetailVisible] = useState(false)
//   const [viewMode, setViewMode] = useState<'posts' | 'trips'>('posts')
//   // Removed modal state

//   // 1. Giữ nguyên logic fetch và mapping phức tạp của bạn
//   const fetchPosts = async (pageNumber = 1, pageSize = 20) => {
//     setLoading(true)
//     setError(null)
//     try {
//   const res: any = await postService.getOpenPosts(pageNumber, pageSize)
//       const payload = res?.result ?? res
//       const items = Array.isArray(payload?.data)
//         ? payload.data
//         : Array.isArray(payload)
//           ? payload
//           : []

//       const mapped: FreightPost[] = items.map((p: any) => ({
//         id: p.postPackageId ?? p.PostPackageId ?? p.id,
//         packageId: p.packageId ?? null,
//         title: p.title,
//         description: p.description,
//         offeredPrice: p.offeredPrice ?? 0,
//         status: p.status ?? 'OPEN',
//         shippingRoute: {
//           // start/end location may exist at root (p.startLocation) or nested under p.shippingRoute
//           startLocation: (() => {
//             const srStart = p.shippingRoute?.startLocation
//             if (srStart && typeof srStart === 'object') return srStart.address ?? JSON.stringify(srStart)
//             const rootStart = p.startLocation
//             if (rootStart && typeof rootStart === 'object') return rootStart.address ?? JSON.stringify(rootStart)
//             return (p.startLocation ?? p.StartLocation ?? '')
//           })(),
//           endLocation: (() => {
//             const srEnd = p.shippingRoute?.endLocation
//             if (srEnd && typeof srEnd === 'object') return srEnd.address ?? JSON.stringify(srEnd)
//             const rootEnd = p.endLocation
//             if (rootEnd && typeof rootEnd === 'object') return rootEnd.address ?? JSON.stringify(rootEnd)
//             return (p.endLocation ?? p.EndLocation ?? '')
//           })(),
//           expectedPickupDate: p.shippingRoute?.expectedPickupDate ?? p.expectedPickupDate ?? '',
//           expectedDeliveryDate: p.shippingRoute?.expectedDeliveryDate ?? p.expectedDeliveryDate ?? '',
//           startTimeToPickup: '09:00',
//           endTimeToPickup: '17:00',
//           startTimeToDelivery: '09:00',
//           endTimeToDelivery: '17:00',
//         },
//         packageDetails: {
//           title: `Gói (${p.packageCount ?? p.PackageCount ?? 0})`,
//           description: p.description ?? '',
//           quantity: p.packageCount ?? p.PackageCount ?? 0,
//           unit: 'piece',
//           weightKg: 0,
//           volumeM3: 0,
//           images: [],
//         },
//       }))

//       setPosts(mapped)
//     } catch (e: any) {
//       setError(e?.message || 'Không thể tải bài đăng')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const fetchTrips = async (pageNumber = 1, pageSize = 10) => {
//     setTripLoading(true)
//     setTripError(null)
//     try {
//       const res: any = await (await import('@/services/tripService')).default.getTripsByProvider(pageNumber, pageSize)
//       const payload = res?.result ?? res
//       const paginated = payload?.data ? payload : payload?.result
//       const items = Array.isArray(paginated?.data) ? paginated.data : []
//       const mapped: ProviderTripSummary[] = items.map((t: any) => ({
//         tripId: t.tripId ?? t.TripId ?? '',
//         tripCode: t.tripCode ?? t.TripCode ?? '',
//         status: t.status ?? t.Status ?? 'N/A',
//         createAt: t.createAt ?? t.CreateAt ?? '',
//         updateAt: t.updateAt ?? t.UpdateAt ?? '',
//         vehicleModel: t.vehicleModel ?? t.VehicleModel ?? 'N/A',
//         vehiclePlate: t.vehiclePlate ?? t.VehiclePlate ?? 'N/A',
//         vehicleType: t.vehicleType ?? t.VehicleType ?? 'N/A',
//         ownerName: t.ownerName ?? t.OwnerName ?? 'N/A',
//         ownerCompany: t.ownerCompany ?? t.OwnerCompany ?? 'N/A',
//         startAddress: t.startAddress ?? t.StartAddress ?? 'N/A',
//         endAddress: t.endAddress ?? t.EndAddress ?? 'N/A',
//         estimatedDuration: t.estimatedDuration ?? t.EstimatedDuration ?? '',
//         packageCodes: t.packageCodes ?? t.PackageCodes ?? [],
//         driverNames: t.driverNames ?? t.DriverNames ?? [],
//         tripRouteSummary: t.tripRouteSummary ?? t.TripRouteSummary ?? '',
//       }))
//       setTrips(mapped)
//     } catch (e: any) {
//       setTripError(e?.message || 'Không thể tải chuyến đi')
//     } finally {
//       setTripLoading(false)
//     }
//   }

//   useEffect(() => {
//     fetchPosts(1, 20)
//   }, [])

//   useEffect(() => {
//     if (viewMode === 'trips') fetchTrips(1, 10)
//   }, [viewMode])

//   const handleOpenCreate = () => setModalVisible(true)

//   const handlePostCreated = async (dto: any) => {
//     // dto already in PascalCase from modal
//     try {
//       setLoading(true)
//       const res = await postService.createProviderPostPackage(dto)
//       // success — refresh list and close modal
//       fetchPosts(1, 20)
//       setModalVisible(false)
//       Alert.alert('Thành công', 'Tạo bài đăng thành công')
//     } catch (e: any) {
//       console.warn('createProviderPostPackage failed', e)
//       Alert.alert('Lỗi', e?.message || 'Không thể tạo bài đăng')
//     } finally {
//       setLoading(false)
//     }
//   }

//   // 2. Các hàm handler dùng Alert (đã đúng chuẩn Native)
//   const handleEditPost = (post: FreightPost) => {
//     Alert.alert('Chưa hỗ trợ', `Chỉnh sửa bài: ${post.title}`)
//   }

//   const openDetail = (postId: string) => {
//     setDetailId(postId)
//     setDetailVisible(true)
//   }

//   const handleDeletePost = (postId: string) => {
//     Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa bài đăng này?', [
//       { text: 'Hủy', style: 'cancel' },
//       {
//         text: 'Xóa',
//         style: 'destructive',
//         onPress: () => setPosts((prev) => prev.filter((p) => p.id !== postId)),
//       },
//     ])
//   }

//   // 3. Helper render
//   const renderPosts = () => {
//     if (loading) {
//       return (
//         <View style={styles.centeredContainer}>
// <ActivityIndicator size="large" color="#4F46E5" />
// <Text style={styles.statusText}>Đang tải bài đăng...</Text>
// </View>
//       )
//     }

//     if (error) {
//       return (
//         <View style={styles.centeredContainer}>
// <Text style={styles.errorText}>{error}</Text>
// <TouchableOpacity
//             style={styles.retryButton}
//             onPress={() => fetchPosts(1, 20)}
//           >
// <Text style={styles.retryButtonText}>Thử lại</Text>
// </TouchableOpacity>
// </View>
//       )
//     }

//     // PostPackageList bây giờ là FlatList, nó sẽ tự fill flex: 1
//     return <PostPackageList posts={posts} onEdit={handleEditPost} onDelete={handleDeletePost} onView={openDetail} />
//   }

//   const renderTrips = () => {
//     if (tripLoading) {
//       return (
//         <View style={styles.centeredContainer}>
// <ActivityIndicator size="large" color="#4F46E5" />
// <Text style={styles.statusText}>Đang tải chuyến đi...</Text>
// </View>
//       )
//     }
//     if (tripError) {
//       return (
//         <View style={styles.centeredContainer}>
// <Text style={styles.errorText}>{tripError}</Text>
// <TouchableOpacity style={styles.retryButton} onPress={() => fetchTrips(1, 10)}>
// <Text style={styles.retryButtonText}>Thử lại</Text>
// </TouchableOpacity>
// </View>
//       )
//     }
//     if (!trips.length) return <Text style={styles.statusText}>Chưa có chuyến nào.</Text>
//     return (
//       <View style={{ gap: 12 }}>
//         {trips.map(tr => (
//           <View key={tr.tripId} style={styles.tripCard}>
// <View style={styles.tripHeaderRow}>
// <Text style={styles.tripCode}>{tr.tripCode}</Text>
// <View style={[styles.tripStatusBadge, statusColorStyle(tr.status)]}>
// <Text style={styles.tripStatusText}>{tr.status}</Text>
// </View>
// </View>
// <Text style={styles.tripRoute}>{tr.startAddress} → {tr.endAddress}</Text>
// <View style={styles.tripMetaRow}>
// <Text style={styles.tripMeta}>Xe: {tr.vehiclePlate} ({tr.vehicleType})</Text>
// <Text style={styles.tripMeta}>Gói: {tr.packageCodes.length}</Text>
// </View>
// <Text style={styles.tripMeta}>Tài xế: {tr.driverNames.length ? tr.driverNames.join(', ') : 'Chưa có'}</Text>
// <Text style={styles.tripMetaSmall}>{tr.tripRouteSummary}</Text>
// <TouchableOpacity style={styles.detailBtn} onPress={() => openTripDetail(tr.tripId)}>
// <Text style={styles.detailBtnText}>Xem chi tiết</Text>
// </TouchableOpacity>
// </View>
//         ))}
//       </View>
//     )
//   }

//   const openTripDetail = (id: string) => {
//     if (!id) return
//     try {
//       router.push({ pathname: '/trip-detail', params: { tripId: id } } as any)
//     } catch {
//       Alert.alert('Chi tiết', `TripId: ${id}`)
//     }
//   }

//   const statusColorStyle = (status: string) => {
//     const map: Record<string, { bg: string; border: string; color: string }> = {
//       CREATED: { bg: '#DBEAFE', border: '#3B82F6', color: '#1E3A8A' },
//       AWAITING_PROVIDER_CONTRACT: { bg: '#FEF3C7', border: '#FBBF24', color: '#92400E' },
//       AWAITING_PROVIDER_PAYMENT: { bg: '#FDE68A', border: '#F59E0B', color: '#78350F' },
//       IN_PROGRESS: { bg: '#DCFCE7', border: '#10B981', color: '#065F46' },
//       COMPLETED: { bg: '#D1FAE5', border: '#059669', color: '#047857' },
//       CANCELLED: { bg: '#FECACA', border: '#EF4444', color: '#991B1B' }
//     }
//     const st = map[status] || { bg: '#E5E7EB', border: '#9CA3AF', color: '#374151' }
//     return { backgroundColor: st.bg, borderColor: st.border }
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Header */}
//       <View style={styles.headerContainer}>
// <TouchableOpacity onPress={onBack} style={styles.backButton}>
// <ArrowLeftIcon style={styles.icon} />
// </TouchableOpacity>
// <Text style={styles.title}>Quản lý bài đăng</Text>
// <TouchableOpacity onPress={handleOpenCreate} style={styles.createButton}>
// <Text style={styles.createButtonText}>Tạo bài</Text>
// </TouchableOpacity>
// </View>

//       {/* Body */}
//       <View style={styles.modeSwitcher}>
// <TouchableOpacity onPress={() => setViewMode('posts')} style={[styles.modeBtn, viewMode==='posts' && styles.modeBtnActive]}>
// <Text style={[styles.modeBtnText, viewMode==='posts' && styles.modeBtnTextActive]}>Bài đăng</Text>
// </TouchableOpacity>
// <TouchableOpacity onPress={() => setViewMode('trips')} style={[styles.modeBtn, viewMode==='trips' && styles.modeBtnActive]}>
// <Text style={[styles.modeBtnText, viewMode==='trips' && styles.modeBtnTextActive]}>Chuyến đi</Text>
// </TouchableOpacity>
// </View>
// <View style={styles.body}>{viewMode === 'posts' ? renderPosts() : renderTrips()}</View>
// <PostFormModal visible={modalVisible} onClose={() => setModalVisible(false)} onCreated={handlePostCreated} />
// <PostPackageDetailModal visible={detailVisible} postId={detailId ?? undefined} onClose={() => setDetailVisible(false)} />
//         {/* ProviderTripDetailModal removed; navigation to dedicated screen */}
//     </SafeAreaView>
//   )
// }

// // 4. Dọn dẹp StyleSheet
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F3F4F6', // bg-gray-100
//   },
//   headerContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     backgroundColor: '#FFFFFF',
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E7EB',
//   },
//   backButton: {
//     padding: 8,
//     marginLeft: -8, // Căn lề
//   },
//   icon: {
//     width: 24,
//     height: 24,
//     color: '#111827',
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#111827',
//   },
//   placeholder: {
//     width: 40, // = (padding 8 + width 24)
//   },
//   createButton: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     backgroundColor: 'transparent',
//   },
//   createButtonText: {
//     color: '#4F46E5',
//     fontWeight: '600',
//   },
//   body: {
//     flex: 1,
//     padding: 16, // Thêm padding cho body
//   },
//   centeredContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     gap: 16,
//   },
//   statusText: {
//     fontSize: 16,
//     color: '#6B7280',
//   },
//   errorText: {
//     fontSize: 16,
//     color: '#EF4444',
//     textAlign: 'center',
//     paddingHorizontal: 20,
//   },
//   retryButton: {
//     backgroundColor: '#4F46E5',
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     borderRadius: 8,
//   },
//   retryButtonText: {
//     color: '#FFFFFF',
//     fontWeight: '600',
//   },
//   modeSwitcher: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, backgroundColor: '#FFFFFF', gap: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
//   modeBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F3F4F6' },
//   modeBtnActive: { backgroundColor: '#4F46E5' },
//   modeBtnText: { color: '#374151', fontWeight: '600' },
//   modeBtnTextActive: { color: '#FFFFFF' },
//   tripCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
//   tripHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
//   tripCode: { fontSize: 16, fontWeight: '700', color: '#111827' },
//   tripStatusBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
//   tripStatusText: { fontSize: 12, fontWeight: '700', color: '#111827' },
//   tripRoute: { color: '#4F46E5', fontWeight: '600', marginBottom: 4 },
//   tripMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
//   tripMeta: { fontSize: 13, color: '#374151', marginBottom: 2 },
//   tripMetaSmall: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
//   detailBtn: { marginTop: 4, backgroundColor: '#111827', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
//   detailBtnText: { color: '#FFFFFF', fontWeight: '700' }
// })

// export default PostsManagementScreen

import React, { useEffect, useState } from 'react'
import { View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, StatusBar, TextInput } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { FreightPost, ProviderTripSummary } from '../../models/types'
import PostPackageList from './components/PostPackageList'
import PostFormModal from './components/PostFormModal'
import PostPackageDetailModal from './components/PostPackageDetailModal'
import InlinePostSignModal from './components/InlinePostSignModal'
import InlinePostPaymentModal from './components/InlinePostPaymentModal'
import postService from '@/services/postService'
import tripService from '@/services/tripService'
import { router } from 'expo-router'

interface Props { onBack: () => void }

const PostsManagementScreen: React.FC<Props> = ({ onBack }) => {
  const [viewMode, setViewMode] = useState<'posts' | 'trips'>('posts')
  const [posts, setPosts] = useState<FreightPost[]>([])
  const [trips, setTrips] = useState<ProviderTripSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [editPostData, setEditPostData] = useState<any | null>(null)
  const [signModalPostId, setSignModalPostId] = useState<string | null>(null)
  const [paymentModalPostId, setPaymentModalPostId] = useState<string | null>(null)

    const [searchQuery, setSearchQuery] = useState('')

  // Fetch Logic (Giữ nguyên logic API của bạn)
  const fetchPosts = async () => {
    setLoading(true)
    try {
      // Use provider-specific endpoint to fetch the current user's posts
      const res: any = await postService.getMyPosts(1, 20)
      const items = res?.result?.data || res?.data || []
      // Map data (simplified for brevity, keep your original detailed map if needed)
      const mapped = items.map((p: any) => ({
        id: p.postPackageId ?? p.PostPackageId ?? p.id,
        title: p.title,
        status: p.status ?? p.Status ?? 'OPEN',
        offeredPrice: p.offeredPrice ?? 0,
        packageDetails: { title: `Gói (${p.packageCount ?? 0})` },
        shippingRoute: {
          startLocation: p.startLocation?.address ?? 'N/A',
          endLocation: p.endLocation?.address ?? 'N/A',
          expectedPickupDate: p.expectedPickupDate,
          expectedDeliveryDate: p.expectedDeliveryDate
        }
      }))
      setPosts(mapped)
    } catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  const handlePostAction = (post: FreightPost) => {
    const status = (post.status || '').toString()
    switch (status) {
      case 'AWAITING_SIGNATURE':
        Alert.alert('Bài đăng chờ ký', 'Bài đăng đang chờ ký. Bạn muốn ký và thanh toán hay chỉ xem chi tiết?', [
          { text: 'Ký & Thanh toán', onPress: () => { setDetailId(post.id); setDetailVisible(true) } },
          { text: 'Xem chi tiết', onPress: () => { setDetailId(post.id); setDetailVisible(true) } },
          { text: 'Hủy', style: 'cancel' }
        ])
        break
      case 'AWAITING_PAYMENT':
        Alert.alert('Chờ thanh toán', 'Bài đăng đã chờ thanh toán. Mở giao diện thanh toán?', [
          { text: 'Thanh toán', onPress: () => { setDetailId(post.id); setDetailVisible(true) } },
          { text: 'Hủy', style: 'cancel' }
        ])
        break
      case 'PENDING':
        Alert.alert('Chưa hoàn thiện', 'Bài đăng đang ở trạng thái PENDING. Cập nhật thông tin?', [
          { text: 'Cập nhật', onPress: () => { setEditPostData(post); setModalVisible(true) } },
          { text: 'Hủy', style: 'cancel' }
        ])
        break
      case 'OPEN':
      case 'IN_PROGRESS':
      case 'DONE':
        // For active/completed posts just show details
        setDetailId(post.id)
        setDetailVisible(true)
        break
      case 'DELETED':
        Alert.alert('Đã xóa', 'Bài đăng này đã bị xóa.')
        break
      default:
        setDetailId(post.id)
        setDetailVisible(true)
    }
  }

  const fetchTrips = async () => {
    setLoading(true)
    try {
      const res: any = await tripService.getTripsByProvider(1, 10)
      const items = res?.result?.data || res?.data || []
      const mapped = items.map((t: any) => ({
        tripId: t.tripId ?? t.id,
        tripCode: t.tripCode ?? 'TRIP-XXX',
        status: t.status ?? 'CREATED',
        startAddress: t.startAddress,
        endAddress: t.endAddress,
        vehiclePlate: t.vehiclePlate ?? 'N/A'
      }))
      setTrips(mapped)
    } catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => {
    if (viewMode === 'posts') fetchPosts()
    else fetchTrips()
  }, [viewMode])

  // Handlers
  const handleCreateSuccess = async (dto: any) => {
    try {
      // If caller provides a created postId, just refresh list and close
      if (dto && (dto.postId || dto.postPackageId)) {
        setModalVisible(false)
        setEditPostData(null)
        fetchPosts()
        Alert.alert('Thành công', 'Tạo bài đăng thành công')
        return
      }

      if (editPostData) {
        const payload = { ...dto, PostPackageId: editPostData.id }
        await postService.createProviderPostPackage(payload)
        Alert.alert('Thành công', 'Cập nhật bài đăng thành công')
      } else {
        await postService.createProviderPostPackage(dto)
        Alert.alert('Thành công', 'Tạo bài đăng thành công')
      }
      setModalVisible(false)
      setEditPostData(null)
      fetchPosts()
    } catch (e: any) { Alert.alert('Lỗi', e?.message || 'Thất bại') }
  }

  const handleEditPost = (post: FreightPost) => {
    setEditPostData(post)
    setModalVisible(true)
  }

  const handleDeletePost = (postId: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa bài đăng này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => setPosts(prev => prev.filter(p => p.id !== postId)) }
    ])
  }

  // Component: Trip List Item (Vì chưa có component riêng)
  const renderTripItem = (t: ProviderTripSummary) => (
    <TouchableOpacity key={t.tripId} style={styles.tripCard} onPress={() => router.push(`/trip-detail?tripId=${encodeURIComponent(t.tripId)}`)}>
      <View style={{flexDirection:'row', justifyContent:'space-between'}}>
        <Text style={styles.tripCode}>{t.tripCode}</Text>
        <Text style={styles.tripStatus}>{t.status}</Text>
      </View>
      <Text style={styles.tripRoute}>{t.startAddress} ➔ {t.endAddress}</Text>
      <View style={{flexDirection:'row', alignItems:'center', marginTop:8}}>
        <MaterialCommunityIcons name="truck-outline" size={16} color="#6B7280" />
        <Text style={styles.tripVehicle}> {t.vehiclePlate}</Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản Lý Vận Chuyển</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#0284C7" />
        </TouchableOpacity>
      </View>

      {/* TABS (SEGMENTED CONTROL) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, viewMode === 'posts' && styles.activeTab]} onPress={() => setViewMode('posts')}>
          <Text style={[styles.tabText, viewMode === 'posts' && styles.activeTabText]}>Bài Đăng</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, viewMode === 'trips' && styles.activeTab]} onPress={() => setViewMode('trips')}>
          <Text style={[styles.tabText, viewMode === 'trips' && styles.activeTabText]}>Chuyến Đi</Text>
        </TouchableOpacity>
      </View>

      {/* 2. SEARCH BAR */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Tìm nhanh bài đăng..."
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <TouchableOpacity style={styles.filterBtn}>
                <Ionicons name="options-outline" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

      {/* CONTENT */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 40 }} />
        ) : viewMode === 'posts' ? (
          <PostPackageList 
            posts={posts} 
            onEdit={(p) => handleEditPost(p)} 
            onDelete={(id) => handleDeletePost(id)} 
            onView={(id) => {
              const p = posts.find(x => x.id === id)
              if (p) handlePostAction(p)
              else { setDetailId(id); setDetailVisible(true) }
            }} 
            onSign={(id) => {
              if (!id) return
              // open inline modal
              setSignModalPostId(id)
            }}
            onPay={(id) => {
              if (!id) return
              // open inline modal
              setPaymentModalPostId(id)
            }}
          />
        ) : (
          <View style={{ padding: 16 }}>
            {trips.length === 0 ? <Text style={{textAlign:'center', color:'#6B7280'}}>Chưa có chuyến đi</Text> : trips.map(renderTripItem)}
          </View>
        )}
      </View>

      <PostFormModal visible={modalVisible} onClose={() => { setModalVisible(false); setEditPostData(null); }} onCreated={handleCreateSuccess} initialData={editPostData} isEdit={!!editPostData} />
      <PostPackageDetailModal visible={detailVisible} postId={detailId} onClose={() => setDetailVisible(false)} />
      <InlinePostSignModal visible={!!signModalPostId} postId={signModalPostId ?? undefined} onClose={() => setSignModalPostId(null)} onDone={() => { fetchPosts() }} />
      <InlinePostPaymentModal visible={!!paymentModalPostId} postId={paymentModalPostId ?? undefined} onClose={() => setPaymentModalPostId(null)} onDone={() => { fetchPosts() }} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0284C7' },
  addBtn: { padding: 4 },
  
  tabContainer: { flexDirection: 'row', margin: 16, padding: 4, backgroundColor: '#E5E7EB', borderRadius: 12 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#0284C7' },

  content: { flex: 1 },

  // Trip Card Styles
  tripCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  tripCode: { fontSize: 16, fontWeight: '700', color: '#111827' },
  tripStatus: { fontSize: 12, fontWeight: '600', color: '#059669', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  tripRoute: { marginTop: 8, fontSize: 14, color: '#374151', fontWeight: '500' },
  tripVehicle: { fontSize: 13, color: '#6B7280' },

  // Search Bar Styles
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  listContainer: {
    flex: 1,
  },
})

export default PostsManagementScreen