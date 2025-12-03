import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { ekycService } from '@/services/ekycService'

interface CapturedImages {
  front: { uri: string; name: string; type: string } | null
  selfie: { uri: string; name: string; type: string } | null
}

const { width } = Dimensions.get('window')

const VerifyLicenseScreen = () => {
  const router = useRouter()
  const [step, setStep] = useState<'instruction' | 'capture' | 'review' | 'processing'>('instruction')
  const [images, setImages] = useState<CapturedImages>({
    front: null,
    selfie: null,
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    requestPermissions()
  }, [])

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền camera để tiếp tục')
      }
    }
  }

  const pickImage = async (type: 'front' | 'selfie') => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: type === 'selfie' ? [3, 4] : [16, 9],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        const timestamp = Date.now()
        setImages((prev) => ({
          ...prev,
          [type]: {
            uri: asset.uri,
            name: `${type}_${timestamp}.jpg`,
            type: 'image/jpeg',
          },
        }))
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.')
    }
  }

  const handleSubmit = async () => {
    if (!images.front || !images.selfie) {
      Alert.alert('Thiếu ảnh', 'Vui lòng chụp đầy đủ ảnh GPLX mặt trước và chân dung')
      return
    }
    setStep('processing')
    setUploading(true)

    try {
      let front: any, selfie: any

      if (Platform.OS === 'web') {
        const frontBlob = await (await fetch(images.front.uri)).blob()
        const selfieBlob = await (await fetch(images.selfie.uri)).blob()
        front = new File([frontBlob], images.front.name, { type: images.front.type })
        selfie = new File([selfieBlob], images.selfie.name, { type: images.selfie.type })
      } else {
        front = images.front
        selfie = images.selfie
      }

      const response = await ekycService.verifyLicense(front, selfie)
      
      console.log('✅ VerifyLicense Response:', JSON.stringify(response, null, 2))
      
      setUploading(false)
      setStep('instruction') // Reset to initial state

      if (response.isSuccess) {
        Alert.alert('Thành công! 🎉', response.message || 'GPLX của bạn đã được xác thực', [
          { text: 'OK', onPress: () => router.back() },
        ])
      } else {
        setStep('capture') // Go back to capture for retry
        const errorTitle = 'Xác thực thất bại'
        const errorReason = response.result?.reason || response.result?.rejectionReason || response.message || 'Vui lòng kiểm tra lại'
        Alert.alert(errorTitle, errorReason, [
          { text: 'Chụp lại', onPress: () => setStep('capture'), style: 'default' },
          { text: 'Hủy', onPress: () => router.back(), style: 'cancel' },
        ])
      }
    } catch (error: any) {
      console.error('❌ VerifyLicense Error:', error)
      
      setUploading(false)
      setStep('capture') // Go back to capture
      
      const errorData = error?.response?.data
      if (errorData) {
        console.log('Error Data:', JSON.stringify(errorData, null, 2))
        const errorTitle = errorData.message || 'Xác thực thất bại'
        const errorReason = errorData.result?.reason || errorData.result?.rejectionReason || errorData.message || 'Vui lòng kiểm tra lại'
        Alert.alert(errorTitle, errorReason, [
          { text: 'Chụp lại', onPress: () => setStep('capture') },
          { text: 'Hủy', onPress: () => router.back(), style: 'cancel' },
        ])
      } else {
        Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ', [
          { text: 'Thử lại', onPress: () => setStep('capture') },
          { text: 'Hủy', onPress: () => router.back(), style: 'cancel' },
        ])
      }
    }
  }

  const renderInstruction = () => (
    <View style={styles.cardContainer}>
      <View style={styles.iconCircleBig}>
        <MaterialCommunityIcons name="card-account-details-outline" size={60} color="#F59E0B" />
      </View>
      <Text style={styles.titleText}>Xác thực Giấy phép lái xe</Text>
      <Text style={styles.subtitleText}>
        Chuẩn bị GPLX của bạn và chụp ảnh chân dung để xác thực
      </Text>

      <View style={styles.stepsContainer}>
        <View style={styles.stepRow}>
          <View style={[styles.stepIconBox, { backgroundColor: '#FEF3C7' }]}>
            <MaterialCommunityIcons name="card-account-details" size={24} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Chụp GPLX mặt trước</Text>
            <Text style={styles.stepDesc}>Đặt bằng lái nằm ngang, rõ nét</Text>
          </View>
        </View>

        <View style={styles.stepRow}>
          <View style={[styles.stepIconBox, { backgroundColor: '#FEF3C7' }]}>
            <MaterialCommunityIcons name="face-recognition" size={24} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Chụp ảnh chân dung</Text>
            <Text style={styles.stepDesc}>Nhìn thẳng, không đeo khẩu trang hoặc kính</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity onPress={() => setStep('capture')} activeOpacity={0.8}>
        <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Bắt đầu</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )

  const renderCapture = () => (
    <View style={styles.captureWrapper}>
      <Text style={styles.sectionHeader}>Chụp ảnh GPLX</Text>

      <View style={styles.gridContainer}>
        {/* Front Image */}
        <TouchableOpacity
          style={[styles.uploadBox, images.front && styles.uploadBoxActive]}
          onPress={() => pickImage('front')}
          activeOpacity={0.7}
        >
          {images.front ? (
            <>
              <Image source={{ uri: images.front.uri }} style={styles.uploadedImage} />
              <View style={styles.checkBadge}>
                <MaterialCommunityIcons name="check" size={16} color="#FFF" />
              </View>
            </>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <View style={[styles.uploadIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="card-account-details" size={28} color="#F59E0B" />
              </View>
              <Text style={styles.uploadLabel}>GPLX mặt trước</Text>
              <Text style={styles.uploadSub}>Nhấn để chụp</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Selfie */}
        <TouchableOpacity
          style={[styles.uploadBox, images.selfie && styles.uploadBoxActive]}
          onPress={() => pickImage('selfie')}
          activeOpacity={0.7}
        >
          {images.selfie ? (
            <>
              <Image source={{ uri: images.selfie.uri }} style={styles.uploadedImage} />
              <View style={styles.checkBadge}>
                <MaterialCommunityIcons name="check" size={16} color="#FFF" />
              </View>
            </>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <View style={[styles.uploadIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="face-recognition" size={28} color="#F59E0B" />
              </View>
              <Text style={styles.uploadLabel}>Ảnh chân dung</Text>
              <Text style={styles.uploadSub}>Nhấn để chụp</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.continueBtn, (!images.front || !images.selfie) && styles.disabledBtn]}
        disabled={!images.front || !images.selfie}
        onPress={() => setStep('review')}
      >
        <Text style={styles.continueBtnText}>Tiếp tục</Text>
      </TouchableOpacity>
    </View>
  )

  const renderReview = () => (
    <View style={styles.reviewCard}>
      <Text style={styles.reviewHeader}>Kiểm tra lại thông tin</Text>
      <Text style={styles.reviewSub}>Đảm bảo hình ảnh không bị mờ hoặc lóa sáng</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
        {images.front && (
          <View style={styles.reviewItem}>
            <Image source={{ uri: images.front.uri }} style={styles.reviewImg} />
            <View style={styles.reviewLabelBadge}>
              <Text style={styles.reviewLabelText}>GPLX mặt trước</Text>
            </View>
          </View>
        )}
        {images.selfie && (
          <View style={styles.reviewItem}>
            <Image source={{ uri: images.selfie.uri }} style={styles.reviewImg} />
            <View style={styles.reviewLabelBadge}>
              <Text style={styles.reviewLabelText}>Chân dung</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('capture')}>
          <Text style={styles.secondaryBtnText}>Chụp lại</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ flex: 1 }} onPress={handleSubmit}>
          <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Xác nhận</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderProcessing = () => (
    <View style={styles.centerContent}>
      <View style={styles.processingCircle}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
      <Text style={styles.processingTitle}>Đang xác thực...</Text>
      <Text style={styles.processingDesc}>Vui lòng chờ trong giây lát</Text>
    </View>
  )

  return (
    <LinearGradient colors={['#FEF3C7', '#FFFFFF']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác thực GPLX</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 'instruction' && renderInstruction()}
        {step === 'capture' && renderCapture()}
        {step === 'review' && renderReview()}
        {step === 'processing' && renderProcessing()}
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  scrollContent: { padding: 20, paddingBottom: 50 },

  // Instruction
  cardContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  iconCircleBig: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleText: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  subtitleText: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  stepsContainer: { width: '100%', marginBottom: 30, gap: 16 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  stepIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },
  stepDesc: { fontSize: 13, color: '#94A3B8', marginTop: 2 },

  // Buttons
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    gap: 8,
  },
  primaryButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 12,
  },
  secondaryBtnText: { color: '#64748B', fontWeight: '700', fontSize: 16 },

  // Capture
  captureWrapper: { width: '100%' },
  sectionHeader: { fontSize: 16, fontWeight: '600', color: '#64748B', marginBottom: 16, textAlign: 'center' },
  gridContainer: { gap: 16 },
  uploadBox: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBoxActive: {
    backgroundColor: '#FFF',
    borderWidth: 0,
    borderStyle: 'solid',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  uploadPlaceholder: { alignItems: 'center' },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadLabel: { fontSize: 16, fontWeight: '600', color: '#475569' },
  uploadSub: { fontSize: 13, color: '#94A3B8' },
  uploadedImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  continueBtn: {
    marginTop: 30,
    backgroundColor: '#F59E0B',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  disabledBtn: { backgroundColor: '#CBD5E1', shadowOpacity: 0 },
  continueBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

  // Review
  reviewCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 24 },
  reviewHeader: { fontSize: 20, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  reviewSub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, marginTop: 4 },
  galleryScroll: { marginBottom: 24 },
  reviewItem: { marginRight: 16, position: 'relative' },
  reviewImg: { width: 220, height: 140, borderRadius: 16, backgroundColor: '#F1F5F9' },
  reviewLabelBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reviewLabelText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 12 },

  // Processing
  centerContent: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  processingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  processingTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  processingDesc: { fontSize: 14, color: '#64748B', marginTop: 8 },
})

export default VerifyLicenseScreen
