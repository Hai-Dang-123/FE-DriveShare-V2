// import React, { useEffect, useState } from 'react'
// import {
//   View,
//   Text,
//   StyleSheet,
//   SafeAreaView,
//   TouchableOpacity,
//   ActivityIndicator,
//   FlatList,
//   Image,
// } from 'react-native'
// import vehicleService from '@/services/vehicleService'
// import { Vehicle } from '../../models/types'
// import { ArrowLeftIcon } from '../provider-v2/icons/ActionIcons'
// import VehicleList from './components/VehicleList'
// import VehicleFormModal from './components/VehicleFormModal'
// import { Alert } from 'react-native'

// interface Props {
//   onBack?: () => void
// }

// const VehiclesManagementScreen: React.FC<Props> = ({ onBack }) => {
//   const [vehicles, setVehicles] = useState<Vehicle[]>([])
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState<string | null>(null)
//   const [showCreateModal, setShowCreateModal] = useState(false)

//   const fetchVehicles = async (pageNumber = 1, pageSize = 20) => {
//     setLoading(true)
//     setError(null)
//     try {
//       const res: any = await vehicleService.getMyVehicles(pageNumber, pageSize)
//       const payload = res?.result ?? res
//       let items: any[] = []
//       if (payload && Array.isArray(payload.data)) items = payload.data
//       else if (payload && Array.isArray(payload.items)) items = payload.items
//       else if (Array.isArray(payload)) items = payload

//       const mapped: Vehicle[] = items.map((v: any) => ({
//         id: v.vehicleId ?? v.VehicleId ?? v.id,
//         plateNumber: v.plateNumber ?? v.PlateNumber ?? v.Plate ?? '',
//         model: v.model ?? v.Model,
//         brand: v.brand ?? v.Brand,
//         color: v.color ?? v.Color,
//         yearOfManufacture: v.yearOfManufacture ?? v.YearOfManufacture,
//         payloadInKg: v.payloadInKg ?? v.PayloadInKg,
//         volumeInM3: v.volumeInM3 ?? v.VolumeInM3,
//         status: v.status ?? v.Status,
//         vehicleType: v.vehicleType ?? v.VehicleType,
//         owner: v.owner ?? v.Owner,
//         // Support multiple possible backend shapes: 'imageUrls' or 'vehicleImages'
//         imageUrls: Array.isArray(v.imageUrls)
//           ? v.imageUrls.map((i: any) => ({
//               vehicleImageId: i.vehicleImageId ?? i.id,
//               imageURL: i.imageURL ?? i.imageUrl ?? i.ImageURL ?? i.url,
//               caption: i.caption ?? i.captionText ?? null,
//               createdAt: i.createdAt ?? i.createdAt,
//             }))
//           : Array.isArray(v.vehicleImages)
//           ? v.vehicleImages.map((i: any) => ({
//               vehicleImageId: i.vehicleImageId ?? i.id,
//               imageURL: i.imageURL ?? i.imageUrl ?? i.ImageURL ?? i.url,
//               caption: i.caption ?? null,
//               createdAt: i.createdAt,
//             }))
//           : [],
//       }))

//       setVehicles(mapped)
//     } catch (e: any) {
//       setError(e?.message || 'Không thể tải danh sách xe')
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => {
//     fetchVehicles(1, 20)
//   }, [])

//   const handleEditVehicle = (v: Vehicle) => {
//     Alert.alert('Chưa hỗ trợ', `Chỉnh sửa xe: ${v.plateNumber}`)
//   }

//   const handleDeleteVehicle = (vehicleId: string) => {
//     Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa xe này?', [
//       { text: 'Hủy', style: 'cancel' },
//       { text: 'Xóa', style: 'destructive', onPress: () => setVehicles((prev) => prev.filter((x) => x.id !== vehicleId)) },
//     ])
//   }

//   const handleOpenCreate = () => setShowCreateModal(true)

//   const handleCreate = async (dto: any) => {
//     try {
//       setLoading(true)
//       await vehicleService.createVehicle(dto)
//       setShowCreateModal(false)
//       fetchVehicles(1, 20)
//     } catch (e: any) {
//       Alert.alert('Lỗi', e?.message || 'Tạo xe thất bại')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const renderItem = ({ item }: { item: Vehicle }) => (
//     <View style={styles.card}>
// <View style={styles.row}>
//         {item.imageUrls && item.imageUrls.length > 0 ? (
//           <Image source={{ uri: item.imageUrls[0].imageURL ?? item.imageUrls[0].imageURL }} style={styles.thumb} />
//         ) : (
//           <View style={[styles.thumb, styles.thumbPlaceholder]} />
//         )}
//         <View style={{ flex: 1 }}>
// <Text style={styles.plate}>{item.plateNumber}</Text>
// <Text style={styles.meta}>{item.brand ?? item.model}</Text>
// <Text style={styles.metaSmall}>{item.color ?? ''} • {item.yearOfManufacture ?? ''}</Text>
// </View>
// </View>
// </View>
//   )

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.centered}>
// <ActivityIndicator size="large" color="#4F46E5" />
// <Text style={styles.statusText}>Đang tải xe...</Text>
// </SafeAreaView>
//     )
//   }

//   if (error) {
//     return (
//       <SafeAreaView style={styles.centered}>
// <Text style={styles.errorText}>{error}</Text>
// <TouchableOpacity onPress={() => fetchVehicles(1, 20)} style={styles.retryButton}>
// <Text style={styles.retryText}>Thử lại</Text>
// </TouchableOpacity>
// </SafeAreaView>
//     )
//   }

//   return (
//     <SafeAreaView style={styles.container}>
// <View style={styles.headerContainer}>
//         {onBack ? (
//           <TouchableOpacity onPress={onBack} style={styles.backButton}>
// <ArrowLeftIcon style={styles.icon} />
// </TouchableOpacity>
//         ) : (
//           <View style={styles.placeholder} />
//         )}
//         <Text style={styles.title}>Quản lý xe</Text>
// <TouchableOpacity onPress={handleOpenCreate} style={{ padding: 8 }}>
// <Text style={{ color: '#4F46E5', fontWeight: '700' }}>Thêm</Text>
// </TouchableOpacity>
// </View>
// <View style={{ flex: 1 }}>
// <VehicleList vehicles={vehicles} onEdit={handleEditVehicle} onDelete={handleDeleteVehicle} />
// </View>
// <VehicleFormModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreate} />
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
//   centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   statusText: { marginTop: 12, color: '#6B7280' },
//   errorText: { color: '#EF4444' },
//   retryButton: { marginTop: 12, backgroundColor: '#4F46E5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
//   retryText: { color: '#fff', fontWeight: '600' },
//   listContent: { padding: 16, paddingBottom: 64 },
//   card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
//   row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
//   thumb: { width: 96, height: 64, borderRadius: 8, backgroundColor: '#E5E7EB', marginRight: 12 },
//   thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
//   plate: { fontSize: 16, fontWeight: '700', color: '#111827' },
//   meta: { color: '#6B7280' },
//   metaSmall: { color: '#9CA3AF', marginTop: 4 },
// })

// export default VehiclesManagementScreen

import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StatusBar,
  Alert // Nhớ import Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Vehicle } from '../../models/types'
import vehicleService from '@/services/vehicleService'
import VehicleList from './components/VehicleList'
import VehicleFormModal from './components/VehicleFormModal'

interface Props {
  onBack?: () => void
}

const VehiclesManagementScreen: React.FC<Props> = ({ onBack }) => {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Hàm tải danh sách xe
  const fetchVehicles = async (pageNumber = 1, pageSize = 20) => {
    setLoading(true)
    try {
      const res: any = await vehicleService.getMyVehicles(pageNumber, pageSize)
      const payload = res?.result ?? res
      let items: any[] = []
      if (payload && Array.isArray(payload.data)) items = payload.data
      else if (payload && Array.isArray(payload.items)) items = payload.items
      else if (Array.isArray(payload)) items = payload

      const mapped: Vehicle[] = items.map((v: any) => ({
        id: v.vehicleId ?? v.id,
        plateNumber: v.plateNumber ?? '',
        model: v.model,
        brand: v.brand,
        color: v.color,
        yearOfManufacture: v.yearOfManufacture,
        payloadInKg: v.payloadInKg,
        volumeInM3: v.volumeInM3,
        status: v.status,
        // preserve verification flag and documents so UI can display correct state
        isVerified: v.isVerified ?? v.IsVerified ?? false,
        documents: Array.isArray(v.documents) ? v.documents : (Array.isArray(v.Documents) ? v.Documents : []),
        imageUrls: Array.isArray(v.imageUrls) ? v.imageUrls : [],
      }))

      setVehicles(mapped)
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehicles()
  }, [])

  const handleEditVehicle = (v: Vehicle) => Alert.alert('Thông báo', `Sửa xe ${v.plateNumber}`)
  const handleDeleteVehicle = (id: string) => Alert.alert('Xác nhận', 'Bạn muốn xóa xe này?')

  // Handle verification request coming from VehicleCard
  const handleVerify = async (dto: any) => {
    try {
      setLoading(true)
      // Normalize DTO shape for service method
      const payload = {
        VehicleId: dto.vehicleId ?? dto.VehicleId,
        Documents: [
          {
            ExpirationDate: dto.expirationDate ?? dto.ExpirationDate,
            FrontFile: dto.frontFile ?? dto.frontFile,
            BackFile: dto.backFile ?? dto.backFile,
          },
        ],
      }
      await vehicleService.uploadVehicleDocument(payload)
      Alert.alert('Thành công', 'Yêu cầu xác minh đã được gửi')
      // refresh list so user sees updated documents/status
      fetchVehicles()
    } catch (e: any) {
      console.error('verify failed', e)
      Alert.alert('Lỗi', e?.message || 'Gửi yêu cầu xác minh thất bại')
    } finally {
      setLoading(false)
    }
  }

  // --- LOGIC TẠO XE MỚI (ĐÃ SỬA) ---
  const handleCreate = async (dto: any) => {
    try {
      // 1. Gọi API tạo xe
      await vehicleService.createVehicle(dto)
      
      // 2. Thông báo thành công
      Alert.alert('Thành công', 'Thêm xe mới thành công!')
      
      // 3. Đóng modal
      setShowCreateModal(false)
      
      // 4. Tải lại danh sách
      fetchVehicles()
    } catch (e: any) {
      // Xử lý lỗi
      Alert.alert('Lỗi', e?.message || 'Không thể tạo xe. Vui lòng thử lại.')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* 1. HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack || (() => router.back())} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
          <Text style={styles.headerBtnText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Quản Lý Xe</Text>

        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.headerBtn}>
          <Ionicons name="add" size={24} color="#10439F" />
          <Text style={[styles.headerBtnText, { color: '#10439F' }]}>Thêm xe</Text>
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

      {/* 3. VEHICLE LIST */}
      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#10439F" style={{ marginTop: 40 }} />
        ) : (
          <VehicleList 
            vehicles={vehicles} 
            onEdit={handleEditVehicle} 
            onDelete={handleDeleteVehicle}
            onVerify={handleVerify}
          />
        )}
      </View>

      {/* MODAL FORM */}
      <VehicleFormModal 
        visible={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        onCreate={handleCreate} // Truyền hàm logic vào đây
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10439F',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 4,
  },
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

export default VehiclesManagementScreen