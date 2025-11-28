// import React, { useState, useEffect } from 'react'
// import {
//   Modal,
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   Pressable,
//   Alert,
//   Image, // 1. Import Image
// } from 'react-native'
// import { Item, Package, ImageStatus } from '../../../models/types'
// import { XMarkIcon } from '../icons/ActionIcons'
// import ImageUploader from '../components/ImageUploader'

// interface PackageFormModalProps {
//   visible: boolean // 2. Đổi 'isOpen' thành 'visible'
//   onClose: () => void
//   // loosen type to accept the simple form payload; ItemsManagementScreen will map to DTO
//   onCreate: (pkg: any) => void
//   item: Item | null
// }

// const PackageFormModal: React.FC<PackageFormModalProps> = ({
//   visible,
//   onClose,
//   onCreate,
//   item,
// }) => {
//   // 3. Đặt kiểu cho formData để code rõ ràng hơn
//   const [formData, setFormData] = useState({
//     title: '',
//     description: '',
//     quantity: 1,
//     unit: 'piece',
//     weightKg: 0,
//     volumeM3: 0,
//     images: [] as any[], // Sẽ chứa { packageImageURL: 'file://...' }
//   })

//   // Reset form khi modal mở
//   useEffect(() => {
//     if (visible && item) {
//       setFormData({
//         title: `Gói hàng cho ${item.itemName}`,
//         description: item.description || '',
//         quantity: 1,
//         unit: 'piece',
//         weightKg: 0,
//         volumeM3: 0,
//         images: [],
//       })
//     } else if (!visible) {
//       // Clear form khi đóng
//       setFormData({
//         title: '',
//         description: '',
//         quantity: 1,
//         unit: 'piece',
//         weightKg: 0,
//         volumeM3: 0,
//         images: [],
//       })
//     }
//   }, [item, visible])

//   if (!visible || !item) return null

//   // 4. Hàm helper cho TextInput
//   const handleChange = (name: string, value: string | number) => {
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }))
//   }

//   // 5. Sửa lại để nhận object { uri?, base64? } từ ImageUploader
//   const handleImageChange = (img: { uri?: string; base64?: string }) => {
//     const dataUrl = img?.base64 ? `data:image/jpeg;base64,${img.base64}` : undefined
//     setFormData((prev) => ({
//       ...prev,
//       images: [
//         {
//           packageImageId: prev?.images?.[0]?.packageImageId || `pkg-img-${Date.now()}`,
//           packageImageURL: dataUrl ?? img?.uri ?? '',
//           uri: img?.uri,
//           createdAt: new Date().toISOString(),
//           status: ImageStatus.ACTIVE,
//         },
//       ],
//     }))
//   }

//   // 6. Xóa 'e: React.FormEvent'
//   const handleSubmit = () => {
//     if (!formData.title) {
//       Alert.alert('Lỗi', 'Vui lòng nhập Tiêu đề gói hàng.')
//       return
//     }
//     onCreate(formData)
//   }

//   return (
//     <Modal
//       visible={visible}
//       transparent={true}
//       animationType="slide"
//       onRequestClose={onClose}
//     >
//       {/* Backdrop để bấm ra ngoài */}
//       <Pressable style={styles.backdrop} onPress={onClose} />
// <View style={styles.modalContainer}>
//         {/* Header */}
//         <View style={styles.modalHeader}>
// <Text style={styles.modalTitle}>Đóng gói & Vận chuyển</Text>
// <TouchableOpacity onPress={onClose} style={styles.closeButton}>
// <XMarkIcon style={styles.closeIcon} />
// </TouchableOpacity>
// </View>

//         {/* 7. Thông tin Item được đóng gói (thiết kế lại) */}
//         <View style={styles.itemInfoBox}>
// <Image
//             source={{ uri: item.images?.[0]?.itemImageURL || 'https://via.placeholder.com/150' }}
//             style={styles.itemImage}
//           />
// <View style={styles.itemInfoText}>
// <Text style={styles.itemTitle} numberOfLines={1}>{item.itemName}</Text>
// <Text style={styles.itemSubtitle}>
//               Giá trị: {new Intl.NumberFormat('vi-VN').format(item.declaredValue || 0)}{' '}
//               {item.currency}
//             </Text>
// </View>
// </View>

//         {/* 8. Form cuộn */}
//         <ScrollView style={styles.formContainer} bounces={false}>
// <View style={styles.formContent}>
//             {/* 9. Layout đã được xếp dọc (bỏ grid 2 cột) */}
//             <View style={styles.inputGroup}>
// <Text style={styles.label}>Tiêu đề gói hàng *</Text>
// <TextInput
//                 style={styles.input}
//                 value={formData.title}
//                 onChangeText={(val) => handleChange('title', val)}
//                 placeholder="Ví dụ: Thùng 1 - Điện thoại"
//                 placeholderTextColor="#9CA3AF"
//               />
// </View>
// <View style={styles.inputGroup}>
// <Text style={styles.label}>Mô tả gói hàng</Text>
// <TextInput
//                 style={[styles.input, styles.textarea]}
//                 value={formData.description}
//                 onChangeText={(val) => handleChange('description', val)}
//                 placeholder="Ghi chú thêm về gói hàng (nếu có)"
//                 placeholderTextColor="#9CA3AF"
//                 multiline
//                 numberOfLines={3}
//               />
// </View>

//             {/* 10. Dùng flex row cho các trường trên 1 hàng */}
//             <View style={styles.row}>
// <View style={[styles.inputGroup, { flex: 1 }]}>
// <Text style={styles.label}>Số lượng</Text>
// <TextInput
//                   style={styles.input}
//                   value={String(formData.quantity)}
//                   onChangeText={(val) =>
//                     handleChange('quantity', parseInt(val, 10) || 0)
//                   }
//                   keyboardType="numeric"
//                 />
// </View>
// <View style={[styles.inputGroup, { flex: 1 }]}>
// <Text style={styles.label}>Đơn vị</Text>
// <TextInput
//                   style={styles.input}
//                   value={formData.unit}
//                   onChangeText={(val) => handleChange('unit', val)}
//                   placeholder="Cái, thùng,..."
//                   placeholderTextColor="#9CA3AF"
//                 />
// </View>
// </View>
// <View style={styles.row}>
// <View style={[styles.inputGroup, { flex: 1 }]}>
// <Text style={styles.label}>Cân nặng (kg)</Text>
// <TextInput
//                   style={styles.input}
//                   value={String(formData.weightKg)}
//                   onChangeText={(val) =>
//                     handleChange('weightKg', parseFloat(val) || 0)
//                   }
//                   keyboardType="numeric"
//                   placeholder="0.5"
//                   placeholderTextColor="#9CA3AF"
//                 />
// </View>
// <View style={[styles.inputGroup, { flex: 1 }]}>
// <Text style={styles.label}>Thể tích (m³)</Text>
// <TextInput
//                   style={styles.input}
//                   value={String(formData.volumeM3)}
//                   onChangeText={(val) =>
//                     handleChange('volumeM3', parseFloat(val) || 0)
//                   }
//                   keyboardType="numeric"
//                   placeholder="0.1"
//                   placeholderTextColor="#9CA3AF"
//                 />
// </View>
// </View>

//             {/* ImageUploader xếp dọc */}
//             <ImageUploader
//               currentImage={formData.images[0]?.packageImageURL || null}
//               onImageChange={handleImageChange}
//             />
// </View>
// </ScrollView>

//         {/* Footer */}
//         <View style={styles.modalFooter}>
// <TouchableOpacity
//             style={[styles.button, styles.cancelButton]}
//             onPress={onClose}
//           >
// <Text style={styles.cancelButtonText}>Hủy</Text>
// </TouchableOpacity>
// <TouchableOpacity
//             style={[styles.button, styles.saveButton]}
//             onPress={handleSubmit}
//           >
// <Text style={styles.saveButtonText}>Tạo gói</Text>
// </TouchableOpacity>
// </View>
// </View>
// </Modal>
//   )
// }

// // 11. Toàn bộ StyleSheet
// const styles = StyleSheet.create({
//   backdrop: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(0, 0, 0, 0.6)',
//   },
//   modalContainer: {
//     backgroundColor: '#FFFFFF',
//     marginTop: '10%', // Nâng modal lên cao hơn
//     height: '90%',
//     borderTopLeftRadius: 16,
//     borderTopRightRadius: 16,
//     shadowColor: '#000',
//     shadowOpacity: 0.25,
//     shadowRadius: 10,
//     elevation: 10,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E7EB',
//   },
//   modalTitle: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#111827',
//   },
//   closeButton: {
//     padding: 8,
//     borderRadius: 999,
//   },
//   closeIcon: {
//     width: 24,
//     height: 24,
//     color: '#4B5563',
//   },
//   // Thẻ thông tin item
//   itemInfoBox: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 16,
//     margin: 16,
//     padding: 12,
//     backgroundColor: '#F9FAFB', // bg-gray-50
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//   },
//   itemImage: {
//     width: 64, // w-16
//     height: 64, // h-16
//     borderRadius: 8, // rounded-md
//   },
//   itemInfoText: {
//     flex: 1,
//   },
//   itemTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#111827',
//   },
//   itemSubtitle: {
//     fontSize: 14,
//     color: '#6B7280',
//   },
//   // Form
//   formContainer: {
//     flex: 1,
//   },
//   formContent: {
//     padding: 16,
//     gap: 16,
//   },
//   inputGroup: {
//     width: '100%',
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: '#374151',
//     marginBottom: 4,
//   },
//   input: {
//     width: '100%',
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     borderWidth: 1,
//     borderColor: '#D1D5DB',
//     borderRadius: 8,
//     backgroundColor: '#F9FAFB',
//     fontSize: 16,
//     color: '#111827',
//   },
//   textarea: {
//     height: 80,
//     textAlignVertical: 'top',
//   },
//   row: {
//     flexDirection: 'row',
//     gap: 16,
//   },
//   // Footer
//   modalFooter: {
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//     gap: 12,
//     padding: 16,
//     borderTopWidth: 1,
//     borderTopColor: '#E5E7EB',
//   },
//   button: {
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 8,
//   },
//   cancelButton: {
//     backgroundColor: '#E5E7EB',
//   },
//   cancelButtonText: {
//     color: '#374151',
//     fontWeight: '600',
//   },
//   saveButton: {
//     backgroundColor: '#4F46E5',
//     shadowColor: '#4F46E5',
//     shadowOpacity: 0.3,
//     shadowRadius: 5,
//     elevation: 3,
//   },
//   saveButtonText: {
//     color: '#FFFFFF',
//     fontWeight: '600',
//   },
// })

// export default PackageFormModal

import React, { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Pressable, Alert, Image, ActivityIndicator
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Item, ImageStatus } from '../../../models/types'

interface PackageFormModalProps {
  visible: boolean
  onClose: () => void
  onCreate: (pkg: any) => void
  item: Item | null
}

const COLORS = {
  primary: '#0284C7',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  bg: '#FFFFFF',
  inputBg: '#FFFFFF',
  danger: '#EF4444'
}

// --- COMPONENT CON TÁCH RA NGOÀI ĐỂ TRÁNH RE-RENDER MẤT FOCUS ---
const InputField = ({ label, value, onChange, placeholder, width = '100%', keyboardType = 'default', multiline = false, numberOfLines = 1, required = false }: any) => (
  <View style={{ width, marginBottom: 16 }}>
    <Text style={styles.label}>
      {label} {required && <Text style={{ color: COLORS.danger }}>*</Text>}
    </Text>
    <TextInput
      style={[styles.input, multiline && { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
      value={String(value || '')}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={numberOfLines}
    />
  </View>
)

// --- MAIN COMPONENT ---
const PackageFormModal: React.FC<PackageFormModalProps> = ({ visible, onClose, onCreate, item }) => {
  const [formData, setFormData] = useState<any>({
    title: '', description: '', quantity: 1, unit: 'piece', weightKg: 0, volumeM3: 0, images: []
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (visible && item) {
      setFormData({
        title: `Gói hàng: ${item.itemName}`,
        description: item.description || '',
        quantity: 1, unit: 'piece', weightKg: 0, volumeM3: 0, images: []
      })
    }
  }, [visible, item])

  const handleChange = (key: string, val: any) => setFormData((p: any) => ({ ...p, [key]: val }))

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return Alert.alert('Cần quyền', 'Vui lòng cấp quyền ảnh.')
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true })
    
    if (!result.canceled && result.assets[0]) {
      const newImg = { 
        uri: result.assets[0].uri, 
        packageImageURL: result.assets[0].base64 ? `data:image/jpeg;base64,${result.assets[0].base64}` : result.assets[0].uri,
        status: ImageStatus.ACTIVE 
      }
      setFormData((p: any) => ({ ...p, images: [...p.images, newImg] }))
    }
  }

  const removeImage = (index: number) => {
    setFormData((p: any) => ({ ...p, images: p.images.filter((_: any, i: number) => i !== index) }))
  }

  const handleSubmit = () => {
    if (!formData.title) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề gói hàng.')
    setSubmitting(true)
    Promise.resolve(onCreate(formData)).finally(() => setSubmitting(false))
  }

  if (!visible || !item) return null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Đóng Gói & Vận Chuyển</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          {/* Item Info Banner */}
          <View style={styles.itemBanner}>
            <MaterialCommunityIcons name="cube-send" size={32} color={COLORS.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.itemName}>{item.itemName}</Text>
              <Text style={styles.itemSub}>Giá trị: {item.declaredValue?.toLocaleString()} {item.currency}</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Thông tin đóng gói</Text>
            
            <InputField 
              label="Tiêu đề gói hàng" 
              value={formData.title} 
              onChange={(v: string) => handleChange('title', v)} 
              required 
            />
            
            <InputField 
              label="Ghi chú / Mô tả" 
              value={formData.description} 
              onChange={(v: string) => handleChange('description', v)} 
              multiline 
            />

            <View style={styles.row}>
              <InputField label="Số lượng" width="48%" value={formData.quantity} onChange={(v: string) => handleChange('quantity', Number(v))} keyboardType="numeric" />
              <InputField label="Đơn vị" width="48%" value={formData.unit} onChange={(v: string) => handleChange('unit', v)} />
            </View>

            <View style={styles.row}>
              <InputField label="Cân nặng (kg)" width="48%" value={formData.weightKg} onChange={(v: string) => handleChange('weightKg', Number(v))} keyboardType="numeric" />
              <InputField label="Thể tích (m³)" width="48%" value={formData.volumeM3} onChange={(v: string) => handleChange('volumeM3', Number(v))} keyboardType="numeric" />
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Hình ảnh kiện hàng</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageList}>
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <Ionicons name="camera-outline" size={24} color={COLORS.textLight} />
                <Text style={styles.addImageText}>Thêm ảnh</Text>
              </TouchableOpacity>
              {formData.images.map((img: any, idx: number) => (
                <View key={idx} style={styles.imageWrapper}>
                  <Image source={{ uri: img.uri }} style={styles.thumbnail} />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(idx)}>
                    <Ionicons name="close" size={10} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose} disabled={submitting}>
              <Text style={styles.btnCancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSubmit, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSubmitText}>Tạo Gói</Text>}
            </TouchableOpacity>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContainer: { width: '100%', maxWidth: 550, maxHeight: '90%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  closeBtn: { padding: 4 },
  itemBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', padding: 12, margin: 16, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  itemName: { fontWeight: '700', color: '#0F172A' },
  itemSub: { fontSize: 12, color: '#64748B' },
  body: { paddingHorizontal: 20, paddingBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 14, color: '#1F2937', backgroundColor: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
  imageList: { flexDirection: 'row' },
  addImageBtn: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', marginRight: 12 },
  addImageText: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  imageWrapper: { position: 'relative', marginRight: 12 },
  thumbnail: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  removeBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#9CA3AF', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff' },
  footer: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderColor: '#E5E7EB' },
  btnCancel: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  btnCancelText: { fontWeight: '600', color: '#374151' },
  btnSubmit: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center' },
  btnSubmitText: { fontWeight: '600', color: '#fff' }
})

export default PackageFormModal