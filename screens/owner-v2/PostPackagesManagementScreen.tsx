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
// import { useRouter } from 'expo-router'
// import { FreightPost } from '../../models/types'
// import OwnerPostPackageList from './components/OwnerPostPackageList'
// import PostPackageDetailModal from '@/screens/provider-v2/components/PostPackageDetailModal'
// import AcceptFromPostModal from './components/AcceptFromPostModal'
// import { ArrowLeftIcon } from '@/screens/provider-v2/icons/ActionIcons'
// import postService from '@/services/postService'

// interface Props {
//   onBack?: () => void
// }

// const PostPackagesManagementScreen: React.FC<Props> = ({ onBack }) => {
//   const router = useRouter()
//   const [posts, setPosts] = useState<FreightPost[]>([])
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState<string | null>(null)
//   const [detailId, setDetailId] = useState<string | null>(null)
//   const [detailVisible, setDetailVisible] = useState(false)
//   const [acceptVisible, setAcceptVisible] = useState(false)
//   const [selectedPost, setSelectedPost] = useState<any | null>(null)

//   const fetchPosts = async (pageNumber = 1, pageSize = 20) => {
//     setLoading(true)
//     setError(null)
//     try {
//       const res: any = await postService.getOpenPosts(pageNumber, pageSize)
//       const payload = res?.result ?? res
//       const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []

//       const mapped: FreightPost[] = items.map((p: any) => ({
//         id: p.postPackageId ?? p.PostPackageId ?? p.id,
//         packageId: p.packageId ?? null,
//         title: p.title,
//         description: p.description,
//         offeredPrice: p.offeredPrice ?? 0,
//   providerId: p.providerId ?? p.ProviderId ?? p.Provider ?? p.ownerId ?? p.owner ?? undefined,
//   shippingRouteId: p.shippingRouteId ?? p.ShippingRouteId ?? p.shippingRoute?.id ?? p.postPackageId ?? undefined,
//         status: p.status ?? 'OPEN',
//         shippingRoute: {
//           startLocation: (() => {
//             const srStart = p.shippingRoute?.startLocation
//             if (srStart && typeof srStart === 'object') return srStart.address ?? JSON.stringify(srStart)
//             const rootStart = p.startLocation
//             if (rootStart && typeof rootStart === 'object') return rootStart.address ?? JSON.stringify(rootStart)
//             return p.startLocation ?? p.StartLocation ?? ''
//           })(),
//           endLocation: (() => {
//             const srEnd = p.shippingRoute?.endLocation
//             if (srEnd && typeof srEnd === 'object') return srEnd.address ?? JSON.stringify(srEnd)
//             const rootEnd = p.endLocation
//             if (rootEnd && typeof rootEnd === 'object') return rootEnd.address ?? JSON.stringify(rootEnd)
//             return p.endLocation ?? p.EndLocation ?? ''
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

//   useEffect(() => {
//     fetchPosts(1, 20)
//   }, [])

//   const openDetail = (postId: string) => {
//     setDetailId(postId)
//     setDetailVisible(true)
//   }

//   const handleEditPost = (post: FreightPost) => {
//     Alert.alert('Chưa hỗ trợ', `Chỉnh sửa bài: ${post.title}`)
//   }

//   const handleDeletePost = (postId: string) => {
//     Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa bài đăng này?', [
//       { text: 'Hủy', style: 'cancel' },
//       { text: 'Xóa', style: 'destructive', onPress: () => setPosts((prev) => prev.filter((p) => p.id !== postId)) },
//     ])
//   }

//   const renderContent = () => {
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
// <TouchableOpacity style={styles.retryButton} onPress={() => fetchPosts(1, 20)}>
// <Text style={styles.retryButtonText}>Thử lại</Text>
// </TouchableOpacity>
// </View>
//       )
//     }

//     return (
//       <OwnerPostPackageList
//         posts={posts}
//         onView={openDetail}
//         onAccept={(postId: string) => {
//           const p = posts.find((x) => x.id === postId)
//           setSelectedPost(p ?? null)
//           setAcceptVisible(true)
//         }}
//       />
//     )
//   }

//   return (
//     <SafeAreaView style={styles.container}>
// <View style={styles.headerContainer}>
// <TouchableOpacity onPress={() => (onBack ? onBack() : router.back())} style={styles.backButton}>
// <ArrowLeftIcon style={styles.icon} />
// </TouchableOpacity>
// <Text style={styles.title}>Bài đăng (Owner view)</Text>
// <View style={styles.placeholder} />
// </View>
// <View style={styles.body}>{renderContent()}</View>
// <PostPackageDetailModal visible={detailVisible} postId={detailId ?? undefined} onClose={() => setDetailVisible(false)} />
// <AcceptFromPostModal isOpen={acceptVisible} post={selectedPost} onClose={() => setAcceptVisible(false)} onSuccess={() => fetchPosts(1, 20)} />
// </SafeAreaView>
//   )
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F3F4F6' },
//   headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
//   backButton: { padding: 8, marginLeft: -8 },
//   icon: { width: 24, height: 24, color: '#111827' },
//   title: { fontSize: 20, fontWeight: '700', color: '#111827' },
//   placeholder: { width: 40 },
//   body: { flex: 1, padding: 16 },
//   centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
//   statusText: { fontSize: 16, color: '#6B7280' },
//   errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center', paddingHorizontal: 20 },
//   retryButton: { backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 12 },
//   retryButtonText: { color: '#FFFFFF', fontWeight: '600' },
// })

// export default PostPackagesManagementScreen


import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  StatusBar,
  TextInput
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { FreightPost } from '../../models/types'
import OwnerPostPackageList from './components/OwnerPostPackageList'
import PostPackageDetailModal from '@/screens/provider-v2/components/PostPackageDetailModal' // Tái sử dụng modal chi tiết xịn xò bạn đã có
import AcceptFromPostModal from './components/AcceptFromPostModal'
import postService from '@/services/postService'

interface Props {
  onBack?: () => void
}

// Màu sắc chủ đạo
const COLORS = {
  primary: '#0284C7',
  bg: '#F9FAFB',
  text: '#111827',
  border: '#E5E7EB'
}

const PostPackagesManagementScreen: React.FC<Props> = ({ onBack }) => {
  const router = useRouter()
  const [posts, setPosts] = useState<FreightPost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [acceptVisible, setAcceptVisible] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any | null>(null)

  const [searchQuery, setSearchQuery] = useState('')

  const fetchPosts = async (pageNumber = 1, pageSize = 20) => {
    setLoading(true)
    setError(null)
    try {
      const res: any = await postService.getOpenPosts(pageNumber, pageSize)
      const payload = res?.result ?? res
      const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []

      const mapped: FreightPost[] = items.map((p: any) => ({
        id: p.postPackageId ?? p.PostPackageId ?? p.id,
        packageId: p.packageId ?? null,
        title: p.title,
        description: p.description,
        offeredPrice: p.offeredPrice ?? 0,
        providerId: p.providerId ?? p.ProviderId ?? p.Provider ?? p.ownerId ?? p.owner ?? undefined,
        shippingRouteId: p.shippingRouteId ?? p.ShippingRouteId ?? p.shippingRoute?.id ?? p.postPackageId ?? undefined,
        status: p.status ?? 'OPEN',
        shippingRoute: {
          startLocation: (() => {
            const srStart = p.shippingRoute?.startLocation
            if (srStart && typeof srStart === 'object') return srStart.address ?? JSON.stringify(srStart)
            const rootStart = p.startLocation
            if (rootStart && typeof rootStart === 'object') return rootStart.address ?? JSON.stringify(rootStart)
            return p.startLocation ?? p.StartLocation ?? ''
          })(),
          endLocation: (() => {
            const srEnd = p.shippingRoute?.endLocation
            if (srEnd && typeof srEnd === 'object') return srEnd.address ?? JSON.stringify(srEnd)
            const rootEnd = p.endLocation
            if (rootEnd && typeof rootEnd === 'object') return rootEnd.address ?? JSON.stringify(rootEnd)
            return p.endLocation ?? p.EndLocation ?? ''
          })(),
          expectedPickupDate: p.shippingRoute?.expectedPickupDate ?? p.expectedPickupDate ?? '',
          expectedDeliveryDate: p.shippingRoute?.expectedDeliveryDate ?? p.expectedDeliveryDate ?? '',
          startTimeToPickup: '09:00',
          endTimeToPickup: '17:00',
          startTimeToDelivery: '09:00',
          endTimeToDelivery: '17:00',
        },
        packageDetails: {
          title: `Gói (${p.packageCount ?? p.PackageCount ?? 0})`,
          description: p.description ?? '',
          quantity: p.packageCount ?? p.PackageCount ?? 0,
          unit: 'piece',
          weightKg: 0,
          volumeM3: 0,
          images: [],
        },
      }))

      setPosts(mapped)
    } catch (e: any) {
      setError(e?.message || 'Không thể tải bài đăng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts(1, 20)
  }, [])

  const openDetail = (postId: string) => {
    setDetailId(postId)
    setDetailVisible(true)
  }

  // Hàm tạo bài đăng mới (Điều hướng sang trang tạo hoặc mở Modal tạo)
  const handleCreatePost = () => {
    // Ví dụ: Mở modal tạo bài đăng (nếu bạn đã có component PostFormModal)
    // Hoặc điều hướng: router.push('/(owner)/create-post')
    Alert.alert('Thông báo', 'Chức năng tạo bài đăng đang phát triển')
  }

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.statusText}>Đang tải bài đăng...</Text>
        </View>
      )
    }

    if (error) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchPosts(1, 20)}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <OwnerPostPackageList
        posts={posts}
        onView={openDetail}
        onAccept={(postId: string) => {
          const p = posts.find((x) => x.id === postId)
          setSelectedPost(p ?? null)
          setAcceptVisible(true)
        }}
      />
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (onBack ? onBack() : router.back())} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          <Text style={styles.headerBtnText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Bài Đăng Của Tôi</Text>

        <TouchableOpacity onPress={handleCreatePost} style={styles.headerBtn}>
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

       {/* 2. SEARCH BAR */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Tìm nhanh xe..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>{renderContent()}</View>

     

      {/* MODALS */}
      <PostPackageDetailModal
        visible={detailVisible}
        postId={detailId ?? undefined}
        onClose={() => setDetailVisible(false)}
      />
      <AcceptFromPostModal
        isOpen={acceptVisible}
        post={selectedPost}
        onClose={() => setAcceptVisible(false)}
        onSuccess={() => fetchPosts(1, 20)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  headerBtn: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  headerBtnText: { fontSize: 15, fontWeight: '500', color: COLORS.text, marginLeft: 4 },

  body: { flex: 1 },

  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  statusText: { fontSize: 16, color: '#6B7280' },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center', paddingHorizontal: 20 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '600' },

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

export default PostPackagesManagementScreen