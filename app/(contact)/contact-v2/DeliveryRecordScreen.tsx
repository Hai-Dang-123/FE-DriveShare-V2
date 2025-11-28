import React, { useEffect, useState, useRef, useMemo } from 'react'
import { 
  View, Text, ScrollView, ActivityIndicator, TouchableOpacity, 
  StyleSheet, Alert, TextInput, Linking, Image, Modal, SafeAreaView, StatusBar 
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import tripService from '@/services/tripService'

// Định dạng tiền tệ/số
const formatNumber = (num: number) => num?.toLocaleString('vi-VN') || '0'

// Component hiển thị trạng thái Loading/Error
const StatusView = ({ loading, error, retry }: { loading?: boolean, error?: string | null, retry?: () => void }) => (
  <View style={styles.center}>
    {loading ? (
      <>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Đang tải văn bản...</Text>
      </>
    ) : (
      <>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        {retry && (
          <TouchableOpacity style={styles.retryBtn} onPress={retry}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        )}
      </>
    )}
  </View>
)

const DeliveryRecordScreen: React.FC = () => {
  const params = useLocalSearchParams() as { recordId?: string; accessToken?: string }
  const recordId = params.recordId
  
  // Lấy accessToken từ params hoặc URL (cho web)
  let accessToken = params.accessToken as string | undefined
  if (!accessToken && typeof window !== 'undefined') {
    const sp = new URLSearchParams(window.location.search)
    accessToken = sp.get('accessToken') || undefined
  }

  // --- State ---
  const [loading, setLoading] = useState(true)
  const [record, setRecord] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''))
  const otpRefs = useRef<Array<TextInput | null>>([])
  const [sendingOtp, setSendingOtp] = useState(false)
  const [submittingOtp, setSubmittingOtp] = useState(false)
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null)

  // --- Effects ---
  useEffect(() => {
    if (!recordId || !accessToken) {
      setError('Liên kết không hợp lệ. Vui lòng kiểm tra lại email.')
      setLoading(false)
      return
    }
    fetchRecord()
  }, [recordId, accessToken])

  const fetchRecord = async () => {
    setLoading(true)
    setError(null)
    try {
      const res: any = await tripService.getDeliveryRecordForContact(recordId!, accessToken!)
      if (res?.isSuccess) {
        setRecord(res.result)
      } else {
        throw new Error(res?.message || 'Không thể tải dữ liệu')
      }
    } catch (e: any) {
      setError(e.message || 'Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  // --- Handlers ---
  const handleStartSignProcess = async () => {
    if (!recordId || !accessToken) return
    setSendingOtp(true)
    try {
      // Gọi API gửi OTP
      const res: any = await tripService.sendOtpToContact(recordId, accessToken)
      if (res?.isSuccess) {
        setOtpSentTo(res.result?.sentTo || 'email/SĐT của bạn')
        setOtpDigits(Array(6).fill(''))
        setShowOtpModal(true)
        // Auto focus ô đầu tiên sau khi mở modal
        setTimeout(() => otpRefs.current[0]?.focus(), 500)
      } else {
        Alert.alert('Lỗi', res?.message || 'Không thể gửi mã xác thực')
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi gửi OTP')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleOtpChange = (index: number, text: string) => {
    if (!/^\d*$/.test(text)) return // Chỉ nhận số
    const val = text.slice(-1)
    
    setOtpDigits(prev => {
      const newOtp = [...prev]
      newOtp[index] = val
      return newOtp
    })

    // Auto focus next input
    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpBackspace = (index: number, e: any) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (otpDigits[index] === '' && index > 0) {
        otpRefs.current[index - 1]?.focus()
        setOtpDigits(prev => {
          const newOtp = [...prev]
          newOtp[index - 1] = ''
          return newOtp
        })
      } else {
        setOtpDigits(prev => {
          const newOtp = [...prev]
          newOtp[index] = ''
          return newOtp
        })
      }
    }
  }

  const handleSubmitOtp = async () => {
    const otpCode = otpDigits.join('')
    if (otpCode.length < 6) {
      Alert.alert('Thông báo', 'Vui lòng nhập đủ 6 số OTP')
      return
    }

    setSubmittingOtp(true)
    try {
      const dto = { DeliveryRecordId: recordId!, Otp: otpCode, AccessToken: accessToken! }
      const res: any = await tripService.signDeliveryRecordForContact(dto)
      
      if (res?.isSuccess) {
        Alert.alert('Thành công', 'Bạn đã ký xác nhận thành công!')
        setShowOtpModal(false)
        fetchRecord() // Tải lại để hiện chữ ký
      } else {
        Alert.alert('Thất bại', res?.message || 'Mã OTP không đúng')
        // Clear OTP nếu sai
        setOtpDigits(Array(6).fill(''))
        otpRefs.current[0]?.focus()
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể xác thực OTP lúc này')
    } finally {
      setSubmittingOtp(false)
    }
  }

  // --- Render Helpers ---
  if (loading || error || !record) return <StatusView loading={loading} error={error} retry={fetchRecord} />

  // Data extraction safely
  const packages = record.tripDetail?.packages || []
  const terms = record.deliveryRecordTemplate?.deliveryRecordTerms || []
  const isSigned = record.contactSigned
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#E5E7EB" />
      
      {/* Header Navigation (Optional) */}
      <View style={styles.navHeader}>
        <Text style={styles.navTitle}>Chi Tiết Biên Bản</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- GIẤY A4 (DOCUMENT VIEW) --- */}
        <View style={styles.paper}>
          
          {/* 1. Document Header */}
          <View style={styles.docHeader}>
            <View style={styles.docHeaderLeft}>
              <Text style={styles.companyName}>CÔNG TY CỔ PHẦN{"\n"}DRIVESHARE LOGISTICS</Text>
              <Text style={styles.docRefNo}>Số: {record.tripDetail?.tripCode}</Text>
            </View>
            <View style={styles.docHeaderRight}>
              <Text style={styles.govText}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
              <Text style={styles.govMotto}>Độc lập - Tự do - Hạnh phúc</Text>
              <View style={styles.docLine} />
            </View>
          </View>

          <View style={styles.docTitleWrap}>
            <Text style={styles.docMainTitle}>{record.deliveryRecordTemplate?.templateName || 'BIÊN BẢN GIAO NHẬN'}</Text>
            <Text style={styles.docDate}>Ngày tạo: {new Date(record.createAt).toLocaleString('vi-VN')}</Text>
          </View>

          {/* 2. Thông tin các bên */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderBox}>
              <Text style={styles.sectionTitle}>I. THÔNG TIN CÁC BÊN</Text>
            </View>
            <View style={styles.partiesContainer}>
              {/* Bên Giao */}
              <View style={styles.partyBox}>
                <Text style={styles.partyLabel}>BÊN GIAO (Tài xế):</Text>
                <Text style={styles.partyName}>{record.driverPrimary?.fullName}</Text>
                <Text style={styles.partyInfo}>SĐT: {record.driverPrimary?.phoneNumber}</Text>
              </View>
              {/* Đường kẻ dọc */}
              <View style={styles.verticalDivider} />
              {/* Bên Nhận */}
              <View style={styles.partyBox}>
                <Text style={styles.partyLabel}>BÊN NHẬN (Khách hàng):</Text>
                <Text style={styles.partyName}>{record.tripContact?.fullName}</Text>
                <Text style={styles.partyInfo}>SĐT: {record.tripContact?.phoneNumber}</Text>
              </View>
            </View>
          </View>

          {/* 3. Chi tiết hàng hóa */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderBox}>
              <Text style={styles.sectionTitle}>II. CHI TIẾT HÀNG HÓA</Text>
            </View>
            
            {packages.map((pkg: any, index: number) => (
              <View key={index} style={styles.packageRow}>
                {/* Ảnh hàng hóa */}
                <View style={styles.packageImageContainer}>
                  {pkg.imageUrls?.[0] || pkg.item?.imageUrls?.[0] ? (
                    <Image 
                      source={{ uri: pkg.imageUrls?.[0] || pkg.item?.imageUrls?.[0] }} 
                      style={styles.packageImage} 
                    />
                  ) : (
                    <View style={[styles.packageImage, styles.imagePlaceholder]}>
                      <MaterialCommunityIcons name="package-variant" size={24} color="#9CA3AF" />
                    </View>
                  )}
                </View>

                {/* Thông tin hàng */}
                <View style={styles.packageInfo}>
                  <Text style={styles.pkgTitle}>{pkg.title || pkg.item?.name || pkg.packageCode}</Text>
                  <Text style={styles.pkgDesc}>{pkg.description || pkg.item?.description || 'Không có mô tả'}</Text>
                  <View style={styles.pkgMeta}>
                    <Text style={styles.pkgBadge}>{formatNumber(pkg.weightKg)} kg</Text>
                    <Text style={styles.pkgBadge}>{formatNumber(pkg.volumeM3)} m³</Text>
                  </View>
                </View>

                {/* Số lượng */}
                <View style={styles.packageQty}>
                  <Text style={styles.qtyNumber}>x{pkg.quantity}</Text>
                  <Text style={styles.qtyUnit}>{pkg.unit}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* 4. Điều khoản */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderBox}>
              <Text style={styles.sectionTitle}>III. CAM KẾT & XÁC NHẬN</Text>
            </View>
            <View style={styles.termsList}>
              {terms.map((term: any) => (
                <View key={term.deliveryRecordTermId} style={styles.termRow}>
                  <Text style={styles.termBullet}>•</Text>
                  <Text style={styles.termText}>{term.content}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 5. Chữ ký */}
          <View style={styles.signatureSection}>
            <View style={styles.signBox}>
              <Text style={styles.signTitle}>ĐẠI DIỆN BÊN GIAO</Text>
              <View style={styles.signArea}>
                {record.driverSigned ? (
                  <View style={[styles.stamp, { borderColor: '#2563EB' }]}>
                    <Text style={[styles.stampText, { color: '#2563EB' }]}>ĐÃ KÝ</Text>
                    <Text style={[styles.stampDate, { color: '#2563EB' }]}>
                      {new Date(record.driverSignedAt).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.pendingSign}>Chưa ký</Text>
                )}
              </View>
              <Text style={styles.signerName}>{record.driverPrimary?.fullName}</Text>
            </View>

            <View style={styles.signBox}>
              <Text style={styles.signTitle}>ĐẠI DIỆN BÊN NHẬN</Text>
              <View style={styles.signArea}>
                {isSigned ? (
                  <View style={[styles.stamp, { borderColor: '#059669' }]}>
                    <Text style={[styles.stampText, { color: '#059669' }]}>ĐÃ KÝ</Text>
                    <Text style={[styles.stampDate, { color: '#059669' }]}>
                      {record.contactSignedAt ? new Date(record.contactSignedAt).toLocaleDateString('vi-VN') : 'Hom nay'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.pendingSign}>Chờ ký...</Text>
                )}
              </View>
              <Text style={styles.signerName}>{record.tripContact?.fullName}</Text>
            </View>
          </View>

        </View>
        
        {/* Spacer for footer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* --- FOOTER ACTION BAR --- */}
      <View style={styles.footer}>
        {isSigned ? (
          <TouchableOpacity 
            style={styles.btnDownload}
            onPress={() => {
                tripService.getDeliveryRecordPdfLink(recordId!)
                .then((r:any) => {
                    const url = r?.result || r?.url
                    if(url) Linking.openURL(url)
                    else Alert.alert("Thông báo", "Không tìm thấy link PDF")
                })
                .catch(() => Alert.alert("Lỗi", "Không thể tải PDF"))
            }}
          >
            <MaterialCommunityIcons name="file-download-outline" size={20} color="#FFF" />
            <Text style={styles.btnTextWhite}>Tải Biên Bản PDF</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.btnSign}
            onPress={handleStartSignProcess}
            disabled={sendingOtp}
          >
            {sendingOtp ? <ActivityIndicator color="#FFF" /> : <MaterialCommunityIcons name="pencil-outline" size={20} color="#FFF" />}
            <Text style={styles.btnTextWhite}>{sendingOtp ? 'Đang gửi mã...' : 'Ký Xác Nhận (Gửi OTP)'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* --- OTP MODAL --- */}
      <Modal visible={showOtpModal} transparent animationType="slide" onRequestClose={() => setShowOtpModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác thực OTP</Text>
              <TouchableOpacity onPress={() => setShowOtpModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.otpInstruction}>
                Mã xác thực đã được gửi đến <Text style={{fontWeight: 'bold'}}>{otpSentTo}</Text>.
                Vui lòng kiểm tra và nhập mã 6 số bên dưới để ký tên.
              </Text>

              <View style={styles.otpInputContainer}>
                {otpDigits.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => { otpRefs.current[index] = ref }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(index, text)}
                    onKeyPress={(e) => handleOtpBackspace(index, e)}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.btnSubmitOtp, submittingOtp && { opacity: 0.7 }]}
                onPress={handleSubmitOtp}
                disabled={submittingOtp}
              >
                {submittingOtp ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnTextWhite}>Xác Nhận & Ký Tên</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnResend} onPress={handleStartSignProcess} disabled={sendingOtp}>
                <Text style={styles.btnResendText}>Chưa nhận được mã? Gửi lại</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#E5E7EB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  navHeader: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  navTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  scrollContent: { padding: 16 },
  
  // States
  loadingText: { marginTop: 12, color: '#6B7280' },
  errorText: { marginTop: 12, color: '#EF4444', textAlign: 'center', fontSize: 16 },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#2563EB', borderRadius: 8 },
  retryText: { color: '#FFF', fontWeight: '600' },

  // A4 PAPER STYLES
  paper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 2, // Góc nhọn giống giấy
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 600,
  },
  
  // Doc Header
  docHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  docHeaderLeft: { width: '45%' },
  companyName: { fontSize: 10, fontWeight: '800', color: '#111827', marginBottom: 4, textTransform: 'uppercase' },
  docRefNo: { fontSize: 11, color: '#6B7280' },
  docHeaderRight: { width: '55%', alignItems: 'center' },
  govText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  govMotto: { fontSize: 10, fontStyle: 'italic', fontWeight: '600', textAlign: 'center', marginTop: 2 },
  docLine: { width: 60, height: 1, backgroundColor: '#000', marginTop: 4 },

  docTitleWrap: { alignItems: 'center', marginBottom: 24 },
  docMainTitle: { fontSize: 18, fontWeight: '900', color: '#111827', textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 },
  docDate: { fontSize: 12, fontStyle: 'italic', color: '#6B7280' },

  // Section Styles
  section: { marginBottom: 24 },
  sectionHeaderBox: { backgroundColor: '#F3F4F6', paddingVertical: 6, paddingHorizontal: 10, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#6B7280' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#374151', textTransform: 'uppercase' },

  // Parties
  partiesContainer: { flexDirection: 'row', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 4, padding: 12 },
  partyBox: { flex: 1 },
  verticalDivider: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 12 },
  partyLabel: { fontSize: 10, color: '#6B7280', marginBottom: 4, fontWeight: '600' },
  partyName: { fontSize: 13, fontWeight: '800', color: '#111827', marginBottom: 2 },
  partyInfo: { fontSize: 12, color: '#4B5563' },

  // Package List
  packageRow: { flexDirection: 'row', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  packageImageContainer: { marginRight: 12 },
  packageImage: { width: 56, height: 56, borderRadius: 6, backgroundColor: '#F3F4F6' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  packageInfo: { flex: 1, justifyContent: 'center' },
  pkgTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  pkgDesc: { fontSize: 12, color: '#6B7280', marginVertical: 2 },
  pkgMeta: { flexDirection: 'row', gap: 6, marginTop: 4 },
  pkgBadge: { fontSize: 10, backgroundColor: '#EFF6FF', color: '#2563EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: '600' },
  packageQty: { alignItems: 'center', justifyContent: 'center', paddingLeft: 8 },
  qtyNumber: { fontSize: 16, fontWeight: '800', color: '#111827' },
  qtyUnit: { fontSize: 10, color: '#6B7280' },

  // Terms
  termsList: { paddingHorizontal: 4 },
  termRow: { flexDirection: 'row', marginBottom: 6 },
  termBullet: { width: 16, fontSize: 14, color: '#374151' },
  termText: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 18, textAlign: 'justify' },

  // Signatures
  signatureSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  signBox: { flex: 1, alignItems: 'center' },
  signTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 12 },
  signArea: { height: 80, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stamp: { borderWidth: 2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, alignItems: 'center', transform: [{ rotate: '-10deg' }], backgroundColor: 'rgba(255,255,255,0.9)' },
  stampText: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  stampDate: { fontSize: 9, marginTop: 2 },
  pendingSign: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  signerName: { fontSize: 12, fontWeight: '700', color: '#111827', textTransform: 'uppercase' },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 16, borderTopWidth: 1, borderColor: '#E5E7EB', elevation: 10 },
  btnSign: { flexDirection: 'row', backgroundColor: '#2563EB', padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnDownload: { flexDirection: 'row', backgroundColor: '#059669', padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnTextWhite: { color: '#FFF', fontWeight: '700', fontSize: 16 },

  // Modal OTP
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, minHeight: 350 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalBody: { alignItems: 'center' },
  otpInstruction: { textAlign: 'center', color: '#4B5563', marginBottom: 24, lineHeight: 20 },
  otpInputContainer: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  otpBox: { width: 48, height: 56, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', textAlign: 'center', fontSize: 24, fontWeight: '700', color: '#1F2937', backgroundColor: '#F9FAFB' },
  otpBoxFilled: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  btnSubmitOtp: { width: '100%', backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 16 },
  btnResend: { padding: 10 },
  btnResendText: { color: '#2563EB', fontWeight: '600' },
})

export default DeliveryRecordScreen