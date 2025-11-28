// import React, { useEffect, useState } from 'react'
// import {
//   View,
//   Text,
//   StyleSheet,
//   SafeAreaView, // 1. Dùng SafeAreaView
//   TouchableOpacity,
//   ActivityIndicator, // 2. Dùng ActivityIndicator
//   Alert, // 3. Dùng Alert
// } from 'react-native'
// import { Package, PackageStatus, FreightPost } from '../../models/types'
// import { ArrowLeftIcon } from './icons/ActionIcons'
// import PackageList from './components/PackageList'
// // import FreightPostFormModal from './components/FreightPostFormModal'
// import packageService from '@/services/packageService'

// interface PackagesManagementPageProps {
//   onBack: () => void
// }

// const PackagesManagementScreen: React.FC<PackagesManagementPageProps> = ({
//   onBack,
// }) => {
//   const [packages, setPackages] = useState<Package[]>([])
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState<string | null>(null)

//   const [isPostModalOpen, setPostModalOpen] = useState(false)
//   const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)

//   // 4. Giữ nguyên logic fetch và chuẩn hóa dữ liệu của bạn
//   const fetchPackages = async (pageNumber = 1, pageSize = 20) => {
//     setLoading(true)
//     setError(null)
//     try {
//       const res = await packageService.getPackagesByUserId(pageNumber, pageSize)
//       let payload: any = res?.result ?? res
//       // The backend returns paginated object with 'data' array
//       let items: any[] = []
//       if (payload && Array.isArray(payload.data)) items = payload.data
//       else if (payload && Array.isArray(payload.items)) items = payload.items
//       else if (Array.isArray(payload)) items = payload
//       else {
//         console.warn('fetchPackages: unexpected response shape, coercing to empty array', res)
//         items = []
//       }

//       // Map backend fields to frontend Package shape
//       const mapped = items.map((p: any) => ({
//         id: p.packageId ?? p.id,
//         title: p.title,
//         description: p.description,
//         quantity: p.quantity ?? 0,
//         unit: p.unit ?? 'piece',
//         weightKg: p.weightKg ?? 0,
//         volumeM3: p.volumeM3 ?? 0,
//         images: Array.isArray(p.packageImages)
//           ? p.packageImages.map((pi: any) => ({
//               packageImageId: pi.packageImageId ?? pi.id,
//               packageImageURL: pi.imageUrl ?? pi.packageImageURL ?? pi.url,
//               createdAt: pi.createdAt ?? new Date().toISOString(),
//               status: pi.status ?? 'ACTIVE',
//             }))
//           : [],
//         itemId: p.itemId ?? p.ItemId ?? null,
//         status: p.status ?? 'PENDING',
//       }))

//       setPackages(mapped)
//     } catch (e: any) {
//       setError(e?.message || 'Không thể tải gói hàng')
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => {
//     fetchPackages(1, 20)
//   }, [])

//   const handleOpenPostModal = (pkg: Package) => {
//     setSelectedPackage(pkg)
//     setPostModalOpen(true)
//   }

//   // 5. Dùng Alert.alert thay cho window.confirm
//   const handleDeletePackage = (packageId: string) => {
//     Alert.alert(
//       'Xác nhận xóa',
//       'Bạn có chắc chắn muốn xóa gói hàng này?',
//       [
//         { text: 'Hủy', style: 'cancel' },
//         {
//           text: 'Xóa',
//           style: 'destructive',
//           onPress: () => {
//             // Logic xóa (hiện tại xóa local)
//             setPackages((prev) => prev.filter((p) => p.id !== packageId))
//           },
//         },
//       ],
//     )
//   }

//   // 6. Dùng Alert.alert thay cho alert
//   const handleEditPackage = (pkg: Package) => {
//     console.log('edit pkg', pkg)
//     Alert.alert('Chưa hỗ trợ', 'Chức năng chỉnh sửa gói hàng chưa được hỗ trợ.')
//   }

//   const handleCreatePost = (post: Omit<FreightPost, 'id' | 'packageId'>) => {
//     console.log('Creating Freight Post:', post)
//     Alert.alert('Thành công', `Đã tạo bài đăng "${post.title}" thành công!`)

//     if (selectedPackage) {
//       const updatedPackage = { ...selectedPackage, status: PackageStatus.OPEN }
//       setPackages((prev) =>
//         prev.map((p) => (p.id === selectedPackage.id ? updatedPackage : p)),
//       )
//     }

//     setPostModalOpen(false)
//     setSelectedPackage(null)
//   }

//   // 7. Helper render nội dung
//   const renderContent = () => {
//     if (loading) {
//       return (
//         <View style={styles.centeredContainer}>
// <ActivityIndicator size="large" color="#4F46E5" />
// <Text style={styles.statusText}>Đang tải gói hàng...</Text>
// </View>
//       )
//     }

//     if (error) {
//       return (
//         <View style={styles.centeredContainer}>
// <Text style={styles.errorText}>{error}</Text>
// <TouchableOpacity
//             style={styles.retryButton}
//             onPress={() => fetchPackages(1, 20)}
//           >
// <Text style={styles.retryButtonText}>Thử lại</Text>
// </TouchableOpacity>
// </View>
//       )
//     }

//     // Gói PackageList vào View để đảm bảo nó co giãn đúng
//     return (
//       <View style={{ flex: 1 }}>
// <PackageList
//           packages={packages} // Truyền 'packages' đã fetch
//           onEdit={handleEditPackage}
//           onDelete={handleDeletePackage}
//           onPost={handleOpenPostModal}
//         />
// </View>
//     )
//   }

//   return (
//     // 8. Dùng SafeAreaView
//     <SafeAreaView style={styles.container}>
// <View style={styles.headerContainer}>
// <TouchableOpacity onPress={onBack} style={styles.backButton}>
// <ArrowLeftIcon style={styles.icon} />
// </TouchableOpacity>
// <Text style={styles.title}>Quản lý gói hàng</Text>
//         {/* Placeholder để căn giữa title */}
//         <View style={styles.placeholder} />
// </View>

//       {renderContent()}
// {/* <FreightPostFormModal
//         isOpen={isPostModalOpen}
//         onClose={() => setPostModalOpen(false)}
//         onCreate={handleCreatePost}
//         pkg={selectedPackage}
//       /> */}
//     </SafeAreaView>
//   )
// }

// // 10. Toàn bộ StyleSheet
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
//     borderRadius: 999,
//     marginLeft: -8, // Căn lề trái
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
//   // Trạng thái Loading / Error
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
// })

// export default PackagesManagementScreen

import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, TextInput, StatusBar
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Package } from '../../models/types'
import packageService from '@/services/packageService'
import PackageList from './components/PackageList'
import PackageFormModal from './components/PackageFormModal' // Import Modal mới

interface Props {
  onBack: () => void
}

const PackagesManagementScreen: React.FC<Props> = ({ onBack }) => {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null) // Mock item để test tạo gói

  const fetchPackages = async (pageNumber = 1, pageSize = 20) => {
    setLoading(true)
    try {
      const res: any = await packageService.getPackagesByUserId(pageNumber, pageSize)
      const payload = res?.result ?? res
      let items = []
      if (payload && Array.isArray(payload.data)) items = payload.data
      else if (Array.isArray(payload)) items = payload

      const mapped = items.map((p: any) => ({
        id: p.packageId ?? p.id,
        title: p.title,
        description: p.description,
        quantity: p.quantity ?? 0,
        unit: p.unit ?? 'piece',
        weightKg: p.weightKg ?? 0,
        volumeM3: p.volumeM3 ?? 0,
        status: p.status ?? 'PENDING',
        images: Array.isArray(p.packageImages) ? p.packageImages : []
      }))
      setPackages(mapped)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPackages() }, [])

  const handleEdit = (pkg: Package) => Alert.alert('Thông báo', 'Chỉnh sửa chưa hỗ trợ')
  const handleDelete = (id: string) => Alert.alert('Xác nhận', 'Xóa gói hàng này?')
  
  // Khi bấm tạo gói hàng (Mock data item để mở modal)
  const handleOpenCreate = () => {
    // Trong thực tế, bạn sẽ mở modal này từ trang "Kho Hàng" (Items)
    // Ở đây mình mock 1 item để test giao diện
    setSelectedItem({ itemName: 'iPhone 15 Pro Max', declaredValue: 35000000, currency: 'VND' })
    setModalOpen(true)
  }

  const handleCreatePackage = (data: any) => {
    console.log('Create Package Data:', data)
    setModalOpen(false)
    Alert.alert('Thành công', 'Đã tạo gói hàng')
    fetchPackages()
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerCenter} pointerEvents="none">
          <Text style={styles.headerTitle}>Quản Lý Gói Hàng</Text>
        </View>

        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* SEARCH */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput placeholder="Tìm gói hàng..." style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      {/* LIST */}
      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 40 }} />
        ) : (
          <PackageList packages={packages} onEdit={handleEdit} onDelete={handleDelete} onPost={() => {}} />
        )}
      </View>

      {/* MODAL */}
      <PackageFormModal 
        visible={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        onCreate={handleCreatePackage} 
        item={selectedItem} 
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F3F4F6' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0284C7' },
  headerBtn: { flexDirection: 'row', alignItems: 'center' },
  headerBtnText: { fontSize: 15, fontWeight: '500', color: '#111827', marginLeft: 4 },
  headerCenter: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  headerRightPlaceholder: { width: 40 },
  searchContainer: { padding: 16, backgroundColor: '#fff' },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  listContainer: { flex: 1 },
})

export default PackagesManagementScreen