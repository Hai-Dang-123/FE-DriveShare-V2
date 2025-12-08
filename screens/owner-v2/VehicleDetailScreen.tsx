import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons'
import { VehicleDetail, VehicleImageType, DocumentType, DocumentStatus } from '@/models/types'
import vehicleService from '@/services/vehicleService'
import ImageUploader from '@/screens/provider-v2/components/ImageUploader'

interface Props {
  onBack?: () => void
}

const VehicleDetailScreen: React.FC<Props> = ({ onBack }) => {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Upload modal states
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadDocType, setUploadDocType] = useState<DocumentType | null>(null)
  const [frontImage, setFrontImage] = useState<{ uri?: string; base64?: string; fileName?: string; type?: string } | null>(null)
  const [backImage, setBackImage] = useState<{ uri?: string; base64?: string; fileName?: string; type?: string } | null>(null)
  const [expirationDate, setExpirationDate] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (id) fetchVehicleDetail()
  }, [id])

  const fetchVehicleDetail = async () => {
    try {
      setLoading(true)
      const res: any = await vehicleService.getVehicleById(String(id))
      const data = res?.result ?? res
      
      // Map backend DTO to VehicleDetail
      const mapped: VehicleDetail = {
        vehicleId: data.vehicleId,
        id: data.vehicleId,
        plateNumber: data.plateNumber,
        model: data.model,
        brand: data.brand,
        color: data.color,
        yearOfManufacture: data.yearOfManufacture,
        payloadInKg: data.payloadInKg,
        volumeInM3: data.volumeInM3,
        status: data.status,
        vehicleType: data.vehicleType,
        owner: data.owner,
        imageUrls: data.imageUrls || [],
        documents: data.documents || [],
      }
      
      setVehicle(mapped)
    } catch (e: any) {
      console.error('fetchVehicleDetail error:', e)
      Alert.alert('Lỗi', 'Không thể tải thông tin xe')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#10B981'
      case 'IN_USE': return '#F59E0B'
      case 'INACTIVE': return '#6B7280'
      case 'DELETED': return '#EF4444'
      default: return '#6B7280'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Hoạt động'
      case 'IN_USE': return 'Đang sử dụng'
      case 'INACTIVE': return 'Không hoạt động'
      case 'DELETED': return 'Đã xóa'
      default: return status
    }
  }

  const getDocStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.APPROVED: return '#10B981'
      case DocumentStatus.PENDING: return '#F59E0B'
      case DocumentStatus.REJECTED: return '#EF4444'
      default: return '#6B7280'
    }
  }

  const getDocStatusLabel = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.APPROVED: return 'Đã duyệt'
      case DocumentStatus.PENDING: return 'Chờ duyệt'
      case DocumentStatus.REJECTED: return 'Từ chối'
      default: return status
    }
  }

  const getDocTypeLabel = (type: DocumentType) => {
    switch (type) {
      case DocumentType.VEHICLE_LICENSE: return 'Đăng kiểm xe'
      case DocumentType.CIVIL_INSURANCE: return 'Bảo hiểm dân sự'
      case DocumentType.PHYSICAL_INSURANCE: return 'Bảo hiểm vật chất'
      case DocumentType.DRIVER_LICENSE: return 'Bằng lái xe'
      case DocumentType.CCCD: return 'CCCD'
      default: return type
    }
  }

  const handleUploadDocument = (docType: DocumentType) => {
    setUploadDocType(docType)
    setFrontImage(null)
    setBackImage(null)
    setExpirationDate('')
    setShowUploadModal(true)
  }

  const handleSubmitUpload = async () => {
    if (!uploadDocType || !frontImage || !id) {
      Alert.alert('Lỗi', 'Vui lòng chọn ảnh mặt trước')
      return
    }

    setUploading(true)
    try {
      // Map frontend enum to backend enum (backend has typo: VEHICLE_LINCENSE)
      let backendDocType: string = uploadDocType
      
      // Check if it's VEHICLE_LICENSE (need to convert to backend's typo VEHICLE_LINCENSE)
      const docTypeStr = String(uploadDocType)
      if (docTypeStr === 'VEHICLE_LICENSE' || docTypeStr.includes('VEHICLE_LICENSE')) {
        backendDocType = 'VEHICLE_LINCENSE' // Backend typo
      }

      console.log('Uploading document:', {
        originalType: uploadDocType,
        backendType: backendDocType,
        hasFront: !!frontImage,
        hasBack: !!backImage,
        expirationDate: expirationDate
      })

      await vehicleService.addVehicleDocument(String(id), {
        documentType: backendDocType,
        expirationDate: expirationDate || undefined,
        frontFile: frontImage,
        backFile: backImage || undefined,
      })

      Alert.alert('Thành công', 'Upload giấy tờ thành công!', [
        {
          text: 'OK',
          onPress: () => {
            setShowUploadModal(false)
            fetchVehicleDetail() // Refresh data
          }
        }
      ])
    } catch (e: any) {
      console.error('Upload error:', e)
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể upload giấy tờ')
    } finally {
      setUploading(false)
    }
  }

  const renderUploadModal = () => {
    if (!uploadDocType) return null

    return (
      <Modal
        visible={showUploadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload {getDocTypeLabel(uploadDocType)}</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Front Image */}
              <Text style={styles.uploadLabel}>Mặt trước <Text style={styles.required}>*</Text></Text>
              <ImageUploader
                currentImage={frontImage?.uri || null}
                onImageChange={(img) => {
                  console.log('FrontImage changed:', {
                    hasUri: !!img.uri,
                    hasBase64: !!img.base64,
                    fileName: img.fileName,
                    type: img.type,
                    uriPrefix: img.uri?.substring(0, 30)
                  })
                  setFrontImage(img)
                }}
              />

              {/* Back Image */}
              <Text style={[styles.uploadLabel, { marginTop: 16 }]}>Mặt sau (tùy chọn)</Text>
              <ImageUploader
                currentImage={backImage?.uri || null}
                onImageChange={(img) => {
                  console.log('BackImage changed:', {
                    hasUri: !!img.uri,
                    hasBase64: !!img.base64,
                    fileName: img.fileName,
                    type: img.type
                  })
                  setBackImage(img)
                }}
              />

              {/* Expiration Date */}
              <Text style={[styles.uploadLabel, { marginTop: 16 }]}>
                Ngày hết hạn (dd/mm/yyyy)
              </Text>
              <TextInput
                style={styles.dateInput}
                placeholder="VD: 31/12/2025"
                value={expirationDate}
                onChangeText={setExpirationDate}
              />

              <Text style={styles.noteText}>
                💡 Lưu ý: Giấy tờ sẽ được gửi đến quản trị viên để xét duyệt. 
                Trạng thái mặc định là "Chờ duyệt".
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowUploadModal(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (!frontImage || uploading) && styles.submitBtnDisabled]}
                onPress={handleSubmitUpload}
                disabled={!frontImage || uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Upload</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#10439F" style={{ marginTop: 100 }} />
      </SafeAreaView>
    )
  }

  if (!vehicle) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Không tìm thấy thông tin xe</Text>
      </SafeAreaView>
    )
  }

  // Separate images by type
  const overviewImages = vehicle.imageUrls.filter(img => 
    img.imageType === VehicleImageType.OVERVIEW || (img.imageType as any) === 'OVERVIEW'
  )
  const licensePlateImages = vehicle.imageUrls.filter(img => 
    img.imageType === VehicleImageType.LICENSE_PLATE || (img.imageType as any) === 'LICENSE_PLATE'
  )
  const otherImages = vehicle.imageUrls.filter(img => 
    !img.imageType || img.imageType === VehicleImageType.OTHER || (img.imageType as any) === 'OTHER'
  )

  // Check documents (only VEHICLE_LICENSE and PHYSICAL_INSURANCE needed)
  const vehicleLicenseDoc = vehicle.documents.find(d => 
    d.documentType === DocumentType.VEHICLE_LICENSE || (d.documentType as any) === 'VEHICLE_LICENSE' || (d.documentType as any) === 'VEHICLE_LINCENSE'
  )
  const physicalInsuranceDoc = vehicle.documents.find(d => 
    d.documentType === DocumentType.PHYSICAL_INSURANCE || (d.documentType as any) === 'PHYSICAL_INSURANCE'
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack || (() => router.back())} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
          <Text style={styles.headerBtnText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết xe</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* VEHICLE INFO CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.plateNumber}>{vehicle.plateNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(vehicle.status || '') }]}>
              <Text style={styles.statusText}>{getStatusLabel(vehicle.status || '')}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Feather name="truck" size={16} color="#6B7280" />
            <Text style={styles.infoLabel}>Hãng xe:</Text>
            <Text style={styles.infoValue}>{vehicle.brand || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Feather name="tag" size={16} color="#6B7280" />
            <Text style={styles.infoLabel}>Mẫu xe:</Text>
            <Text style={styles.infoValue}>{vehicle.model || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Feather name="droplet" size={16} color="#6B7280" />
            <Text style={styles.infoLabel}>Màu sắc:</Text>
            <Text style={styles.infoValue}>{vehicle.color || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Feather name="calendar" size={16} color="#6B7280" />
            <Text style={styles.infoLabel}>Năm SX:</Text>
            <Text style={styles.infoValue}>{vehicle.yearOfManufacture || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="scale" size={16} color="#6B7280" />
            <Text style={styles.infoLabel}>Tải trọng:</Text>
            <Text style={styles.infoValue}>{vehicle.payloadInKg ? `${vehicle.payloadInKg} kg` : 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="straighten" size={16} color="#6B7280" />
            <Text style={styles.infoLabel}>Thể tích:</Text>
            <Text style={styles.infoValue}>{vehicle.volumeInM3 ? `${vehicle.volumeInM3} m³` : 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Feather name="package" size={16} color="#6B7280" />
            <Text style={styles.infoLabel}>Loại xe:</Text>
            <Text style={styles.infoValue}>{vehicle.vehicleType?.vehicleTypeName || 'N/A'}</Text>
          </View>
        </View>

        {/* IMAGES SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hình ảnh xe</Text>
          
          {/* Overview Images */}
          {overviewImages.length > 0 && (
            <View style={styles.imageGroup}>
              <Text style={styles.imageGroupTitle}>📸 Ảnh toàn cảnh</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {overviewImages.map((img, idx) => (
                  <Image key={idx} source={{ uri: img.imageURL }} style={styles.vehicleImage} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* License Plate Images */}
          {licensePlateImages.length > 0 && (
            <View style={styles.imageGroup}>
              <Text style={styles.imageGroupTitle}>🔢 Ảnh biển số</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {licensePlateImages.map((img, idx) => (
                  <Image key={idx} source={{ uri: img.imageURL }} style={styles.vehicleImage} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Other Images */}
          {otherImages.length > 0 && (
            <View style={styles.imageGroup}>
              <Text style={styles.imageGroupTitle}>🖼️ Ảnh khác</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {otherImages.map((img, idx) => (
                  <Image key={idx} source={{ uri: img.imageURL }} style={styles.vehicleImage} />
                ))}
              </ScrollView>
            </View>
          )}

          {vehicle.imageUrls.length === 0 && (
            <Text style={styles.emptyText}>Chưa có hình ảnh nào</Text>
          )}
        </View>

        {/* DOCUMENTS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giấy tờ xe</Text>

          {/* REQUIRED: Vehicle License */}
          <View style={styles.documentCard}>
            <View style={styles.docHeader}>
              <View style={styles.docTitleRow}>
                <MaterialIcons name="description" size={20} color="#10439F" />
                <Text style={styles.docTitle}>Đăng kiểm xe</Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>BẮT BUỘC</Text>
                </View>
              </View>
              {vehicleLicenseDoc && (
                <View style={[styles.docStatusBadge, { backgroundColor: getDocStatusColor(vehicleLicenseDoc.status) }]}>
                  <Text style={styles.docStatusText}>{getDocStatusLabel(vehicleLicenseDoc.status)}</Text>
                </View>
              )}
            </View>

            {!vehicleLicenseDoc && (
              <View style={styles.warningBox}>
                <Feather name="alert-triangle" size={18} color="#F59E0B" />
                <Text style={styles.warningText}>⚠️ Chưa có giấy tờ đăng kiểm xe. Vui lòng upload!</Text>
              </View>
            )}

            {vehicleLicenseDoc && (
              <View style={styles.docImages}>
                {vehicleLicenseDoc.frontDocumentUrl && (
                  <Image source={{ uri: vehicleLicenseDoc.frontDocumentUrl }} style={styles.docImage} />
                )}
                {vehicleLicenseDoc.backDocumentUrl && (
                  <Image source={{ uri: vehicleLicenseDoc.backDocumentUrl }} style={styles.docImage} />
                )}
              </View>
            )}

            <TouchableOpacity 
              style={styles.uploadBtn} 
              onPress={() => handleUploadDocument(DocumentType.VEHICLE_LICENSE)}
            >
              <Feather name="upload" size={18} color="#FFFFFF" />
              <Text style={styles.uploadBtnText}>
                {vehicleLicenseDoc ? 'Cập nhật giấy tờ' : 'Upload giấy tờ'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* OPTIONAL: Physical Insurance */}
          <View style={styles.documentCard}>
            <View style={styles.docHeader}>
              <View style={styles.docTitleRow}>
                <MaterialIcons name="shield" size={20} color="#3B82F6" />
                <Text style={styles.docTitle}>Bảo hiểm vật chất</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalText}>TÙY Ý</Text>
                </View>
              </View>
              {physicalInsuranceDoc && (
                <View style={[styles.docStatusBadge, { backgroundColor: getDocStatusColor(physicalInsuranceDoc.status) }]}>
                  <Text style={styles.docStatusText}>{getDocStatusLabel(physicalInsuranceDoc.status)}</Text>
                </View>
              )}
            </View>

            {physicalInsuranceDoc && (
              <View style={styles.docImages}>
                {physicalInsuranceDoc.frontDocumentUrl && (
                  <Image source={{ uri: physicalInsuranceDoc.frontDocumentUrl }} style={styles.docImage} />
                )}
                {physicalInsuranceDoc.backDocumentUrl && (
                  <Image source={{ uri: physicalInsuranceDoc.backDocumentUrl }} style={styles.docImage} />
                )}
              </View>
            )}

            <TouchableOpacity 
              style={[styles.uploadBtn, styles.uploadBtnSecondary]} 
              onPress={() => handleUploadDocument(DocumentType.PHYSICAL_INSURANCE)}
            >
              <Feather name="upload" size={18} color="#10439F" />
              <Text style={[styles.uploadBtnText, styles.uploadBtnTextSecondary]}>
                {physicalInsuranceDoc ? 'Cập nhật bảo hiểm' : 'Upload bảo hiểm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Upload Modal */}
      {renderUploadModal()}
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
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  plateNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  imageGroup: {
    marginBottom: 16,
  },
  imageGroupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  vehicleImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginVertical: 20,
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  docTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  requiredBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  optionalBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  optionalText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  docStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  docStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
    flex: 1,
  },
  docImages: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  docImage: {
    width: 120,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10439F',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  uploadBtnSecondary: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#10439F',
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadBtnTextSecondary: {
    color: '#10439F',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 40,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  noteText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10439F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})

export default VehicleDetailScreen
