// import React from 'react'
// import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native'
// import { Vehicle } from '../../../models/types'
// import { PencilSquareIcon, TrashIcon } from '../../provider-v2/icons/ActionIcons'

// interface Props {
//   vehicle: Vehicle
//   onEdit: () => void
//   onDelete: () => void
// }

// const VehicleCard: React.FC<Props> = ({ vehicle, onEdit, onDelete }) => {
//   const imageUrl = vehicle.imageUrls && vehicle.imageUrls.length > 0 ? vehicle.imageUrls[0].imageURL : 'https://via.placeholder.com/400'

//   return (
//     <View style={styles.cardContainer}>
// <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
// <View style={styles.contentContainer}>
// <View style={styles.header}>
// <Text style={styles.title} numberOfLines={2}>{vehicle.plateNumber}</Text>
// <View style={styles.statusBadge}>
// <Text style={styles.statusText}>{vehicle.status ?? ''}</Text>
// </View>
// </View>
// <Text style={styles.description} numberOfLines={2}>{vehicle.brand ?? vehicle.model ?? ''}</Text>
// <View style={styles.statsContainer}>
// <View style={styles.statItem}>
// <Text style={styles.statValue}>{vehicle.payloadInKg ?? '-'}</Text>
// <Text style={styles.statLabel}>Payload (kg)</Text>
// </View>
// <View style={styles.statItem}>
// <Text style={styles.statValue}>{vehicle.volumeInM3 ?? '-'}</Text>
// <Text style={styles.statLabel}>Volume (m³)</Text>
// </View>
// <View style={styles.statItem}>
// <Text style={styles.statValue}>{vehicle.yearOfManufacture ?? '-'}</Text>
// <Text style={styles.statLabel}>Year</Text>
// </View>
// </View>
// <View style={styles.footer}>
// <View style={styles.iconGroup}>
// <TouchableOpacity onPress={onEdit} style={styles.iconButton}>
// <PencilSquareIcon style={styles.icon as any} />
// </TouchableOpacity>
// <TouchableOpacity onPress={onDelete} style={styles.iconButton}>
// <TrashIcon style={[styles.icon, styles.iconDelete] as any} />
// </TouchableOpacity>
// </View>
// </View>
// </View>
// </View>
//   )
// }

// const styles = StyleSheet.create({
//   cardContainer: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 12,
//     overflow: 'hidden',
//     margin: 8,
//     flex: 1,
//     // shadow
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 10,
//     elevation: 6,
//   },
//   image: { width: '100%', height: 140, backgroundColor: '#F3F4F6' },
//   contentContainer: { padding: 12 },
//   header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
//   title: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
//   statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: '#F3F4F6' },
//   statusText: { fontSize: 12, fontWeight: '600', color: '#374151' },
//   description: { color: '#6B7280', marginTop: 8, marginBottom: 12 },
//   statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, backgroundColor: '#FAFAFB', padding: 8, borderRadius: 8 },
//   statItem: { alignItems: 'center', flex: 1 },
//   statValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
//   statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
//   footer: { flexDirection: 'row', justifyContent: 'flex-end' },
//   iconGroup: { flexDirection: 'row', gap: 8 },
//   iconButton: { padding: 8, borderRadius: 999 },
//   icon: { width: 18, height: 18, color: '#4B5563' },
//   iconDelete: { color: '#EF4444' },
// })

// export default VehicleCard


import React, { useState } from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform, Modal, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons'
import { Vehicle } from '../../../models/types'
import * as ImagePicker from 'expo-image-picker'

interface Props {
  vehicle: Vehicle
  onEdit: () => void
  onDelete: () => void
  onVerify?: (dto: any) => Promise<any>
}

const VehicleCard: React.FC<Props> = ({ vehicle, onEdit, onDelete, onVerify }) => {

  // Work with a flexible object to avoid strict Vehicle type issues (DTO may use PascalCase)
  const v: any = vehicle as any

  // Normalize DTO/casing: backend may return PascalCase (VehicleDetailDTO) or camelCase
  const isVerified = !!(v.IsVerified ?? v.isVerified ?? (v.status === 'VERIFIED'))

  // Prefer backend ImageUrls / ImageURL fields, fallback to older keys
  const imageUrl =
    (v.ImageUrls && v.ImageUrls.length > 0 && (v.ImageUrls[0].ImageURL || v.ImageUrls[0].imageURL)) ||
    (v.imageUrls && v.imageUrls.length > 0 && (v.imageUrls[0].imageURL || v.imageUrls[0].ImageURL)) ||
    'https://via.placeholder.com/400'

  // Màu sắc dựa theo trạng thái xác minh
  const statusColor = isVerified ? '#10B981' : '#F59E0B'
  const statusText = isVerified ? 'Đã Xác Minh' : 'Chưa Xác Minh'
  const borderColor = isVerified ? 'transparent' : '#3B82F6'
  const borderWidth = isVerified ? 0 : 2

  // verify modal state
  const [verifyVisible, setVerifyVisible] = useState(false)
  const [docExpiry, setDocExpiry] = useState('')
  const [frontFile, setFrontFile] = useState<any>(null)
  const [backFile, setBackFile] = useState<any>(null)
  const [verifying, setVerifying] = useState(false)

  const { pickImage } = useImagePicker()

  const handlePickFront = async () => {
    const img = await pickImage()
    if (img) setFrontFile(img)
  }
  const handlePickBack = async () => {
    const img = await pickImage()
    if (img) setBackFile(img)
  }

  const handleVerify = async () => {
    if (!docExpiry) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập ngày hết hạn')
    if (!frontFile) return Alert.alert('Thiếu file', 'Vui lòng thêm ảnh mặt trước')
    setVerifying(true)
    const dto = {
      vehicleId: v.Id ?? v.id ?? v.VehicleId,
      expirationDate: docExpiry,
      frontFile,
      backFile,
    }
    try {
      if (onVerify) await Promise.resolve(onVerify(dto))
      else Alert.alert('Hoàn tất', 'Yêu cầu xác minh đã được gửi (mock)')
      setVerifyVisible(false)
      setDocExpiry('')
      setFrontFile(null)
      setBackFile(null)
    } catch (e) {
      console.warn('verify failed', e)
      Alert.alert('Lỗi', 'Xác minh thất bại')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <View style={[styles.cardContainer, { borderColor, borderWidth }]}>
      {/* 1. Image Header */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        
        {/* RIBBON STATUS (Dải băng góc phải) */}
        <View style={styles.ribbonContainer}>
          <View style={[styles.ribbon, { backgroundColor: statusColor }]}>
            <Text style={styles.ribbonText}>{statusText}</Text>
          </View>
        </View>
      </View>

      {/* 2. Content Body */}
      <View style={styles.contentContainer}>
        {/* Biển số & Model */}
        <Text style={styles.plateNumber}>{v.PlateNumber ?? v.plateNumber ?? v.plate ?? '—'}</Text>
        <Text style={styles.modelText} numberOfLines={1}>
          Model: {v.Brand ?? v.brand ?? v.Model ?? v.model ?? 'Unknown'}
        </Text>

        {/* Nút Xác minh ngay (Chỉ hiện nếu chưa xác minh) */}
        {!isVerified ? (
          <TouchableOpacity style={styles.verifyButton} onPress={() => setVerifyVisible(true)}>
            <Text style={styles.verifyButtonText}>Xác minh ngay</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.verifiedPill, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}>
            <Text style={[styles.verifiedText, { color: '#065F46' }]}>✓ Đã xác minh</Text>
          </View>
        )}

        {/* Thông số kỹ thuật (Grid 3 cột) */}
          <View style={[styles.specsContainer, !isVerified && { marginTop: 12 }]}>
          {/* Cột 1: Tải trọng */}
          <View style={styles.specItem}>
            <MaterialCommunityIcons name="scale-balance" size={20} color="#10B981" />
            <Text style={styles.specValue}>{(v.PayloadInKg ?? v.payloadInKg) ? `${(v.PayloadInKg ?? v.payloadInKg)}kg` : '-'}</Text>
          </View>

          {/* Cột 2: Thể tích */}
          <View style={styles.specItem}>
            <MaterialCommunityIcons name="cube-outline" size={20} color="#10B981" />
            <Text style={styles.specValue}>{(v.VolumeInM3 ?? v.volumeInM3) ? `${(v.VolumeInM3 ?? v.volumeInM3)}m³` : '-'}</Text>
          </View>

          {/* Cột 3: Năm SX */}
          <View style={styles.specItem}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={20} color="#10B981" />
            <Text style={styles.specValue}>{v.YearOfManufacture ?? v.yearOfManufacture ?? '-'}</Text>
          </View>
        </View>

        {/* Divider mờ */}
        <View style={styles.divider} />

        {/* 3. Meta info + Action Buttons (Edit/Delete) */}
        <View style={styles.metaRow}>
          <View style={styles.ownerInfo}>
            <Text style={styles.ownerName}>{v.Owner?.FullName ?? v.Owner?.fullName ?? v.owner?.fullName ?? ''}</Text>
            <Text style={styles.ownerCompany}>{v.Owner?.CompanyName ?? v.Owner?.companyName ?? ''}</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity onPress={onEdit} style={styles.circleButton}>
              <Feather name="edit-2" size={18} color="#6B7280" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={onDelete} style={styles.circleButton}>
              <Feather name="trash-2" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Verification Modal */}
      <Modal visible={verifyVisible} transparent animationType="slide" onRequestClose={() => setVerifyVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Image source={{ uri: imageUrl }} style={styles.modalImage} resizeMode="cover" />
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.modalTitle}>Xác minh giấy tờ</Text>
              <Text style={styles.label}>Ngày hết hạn</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={docExpiry} onChangeText={setDocExpiry} />

              <Text style={[styles.label, { marginTop: 12 }]}>Ảnh mặt trước</Text>
              <TouchableOpacity style={styles.docBox} onPress={handlePickFront}>
                {frontFile ? <Image source={{ uri: frontFile.uri }} style={styles.docImage} /> : <Text style={styles.docBoxText}>Chọn ảnh mặt trước</Text>}
              </TouchableOpacity>

              <Text style={[styles.label, { marginTop: 12 }]}>Ảnh mặt sau (tuỳ chọn)</Text>
              <TouchableOpacity style={styles.docBox} onPress={handlePickBack}>
                {backFile ? <Image source={{ uri: backFile.uri }} style={styles.docImage} /> : <Text style={styles.docBoxText}>Chọn ảnh mặt sau</Text>}
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setVerifyVisible(false)} disabled={verifying}>
                <Text style={styles.cancelBtnText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.createBtn, verifying && { opacity: 0.7 }]} onPress={handleVerify} disabled={verifying}>
                {verifying ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createBtnText}>Gửi xác minh</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
 
// ---------------- Verification Modal logic ----------------
// We'll define it after export to keep the main component tidy (but still in the same file).

function useImagePicker() {
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần cấp quyền truy cập thư viện ảnh')
        return null
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 })
      if (result.canceled || !result.assets || !result.assets[0]) return null
      return { uri: result.assets[0].uri }
    } catch (e) {
      console.warn('pickImage error', e)
      return null
    }
  }
  return { pickImage }
}


const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    flex: 1,
    marginHorizontal: 6,
    // Shadow đẹp
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
  },
  verifiedPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  metaRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  ownerCompany: {
    fontSize: 12,
    color: '#6B7280',
  },
  imageContainer: {
    position: 'relative',
    height: 130,
    backgroundColor: '#F3F4F6',
    margin: 4, // Tạo viền trắng nhỏ bên trong
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  // --- RIBBON STYLES ---
  ribbonContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    overflow: 'hidden',
    width: 80,
    height: 80,
    zIndex: 10,
  },
  ribbon: {
    position: 'absolute',
    top: 12,
    right: -25,
    width: 100,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  ribbonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  // --- CONTENT STYLES ---
  contentContainer: {
    padding: 12,
    alignItems: 'center',
  },
  plateNumber: {
    fontSize: 18,
    fontWeight: '800', // Extra Bold
    color: '#111827', // Xanh đen đậm
    marginBottom: 4,
  },
  modelText: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 12,
  },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  verifyButton: {
    backgroundColor: '#F59E0B', // Cam
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  // --- SPECS GRID ---
  specsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#ECFDF5', // Nền xanh lá rất nhạt
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  specItem: {
    alignItems: 'center',
    flex: 1,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  // --- ACTIONS ---
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Đẩy sang phải giống hình
    width: '100%',
    gap: 12,
  },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  // modal styles for verification dialog
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 640, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalImage: { width: '100%', height: 160, backgroundColor: '#F3F4F6' },
  modalBody: { padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#0F172A' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  docBox: { height: 120, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  docImage: { width: '100%', height: '100%', borderRadius: 8 },
  docBoxText: { color: '#6B7280' },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', marginRight: 8, backgroundColor: '#fff' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  createBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: '#0EA5E9' },
  createBtnText: { fontWeight: '600', color: '#fff' },
})

export default VehicleCard