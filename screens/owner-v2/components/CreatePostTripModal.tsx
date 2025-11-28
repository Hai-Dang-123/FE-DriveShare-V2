// import React, { useState } from 'react'
// import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Modal, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
// import postTripService, { PostTripCreateDTO, PostTripViewDTO, PostTripDetailCreateDTO, DriverType } from '@/services/postTripService'
// import { CheckIcon } from '@/screens/provider-v2/icons/ActionIcons'

// interface CreatePostTripModalProps {
//   visible: boolean
//   onClose: () => void
//   tripId: string
//   onCreated: (post: PostTripViewDTO) => void
// }

// const CreatePostTripModal: React.FC<CreatePostTripModalProps> = ({ visible, onClose, tripId, onCreated }) => {
//   const [title, setTitle] = useState('Tìm thêm tài xế cho chuyến')
//   const [description, setDescription] = useState('Cần bổ sung tài xế, ưu tiên kinh nghiệm và đúng giờ.')
//   const [payloadKg, setPayloadKg] = useState('')
//   // Removed top-level post trip type per new backend change
//   interface DetailFormState {
//     detailType: DriverType
//     requiredCount: string
//     pricePerPerson: string
//     pickupLocation: string
//     dropoffLocation: string
//     mustPickAtGarage: boolean
//     mustDropAtGarage: boolean
//   }
//   const [details, setDetails] = useState<DetailFormState[]>([{
//     detailType: 'PRIMARY',
//     requiredCount: '1',
//     pricePerPerson: '0',
//     pickupLocation: '',
//     dropoffLocation: '',
//     mustPickAtGarage: false,
//     mustDropAtGarage: false
//   }])
//   const [submitting, setSubmitting] = useState(false)

//   const submit = async () => {
//     if (!title.trim()) return Alert.alert('Thiếu tiêu đề', 'Vui lòng nhập tiêu đề.')
//     if (!details.length) return Alert.alert('Thiếu chi tiết', 'Cần ít nhất 1 dòng chi tiết.')
//     // Validate each detail line
//     const builtDetails: PostTripDetailCreateDTO[] = []
//     for (let i = 0; i < details.length; i++) {
//       const d = details[i]
//       const reqCount = parseInt(d.requiredCount || '0', 10)
//       if (isNaN(reqCount) || reqCount <= 0) return Alert.alert('Dòng ' + (i+1) + ' lỗi', 'Số lượng phải > 0.')
//       const price = parseFloat(d.pricePerPerson || '0')
//       if (price < 0) return Alert.alert('Dòng ' + (i+1) + ' lỗi', 'Giá phải >= 0.')
//       builtDetails.push({
//         Type: d.detailType,
//         RequiredCount: reqCount,
//         PricePerPerson: price,
//         PickupLocation: d.pickupLocation.trim(),
//         DropoffLocation: d.dropoffLocation.trim(),
//         MustPickAtGarage: d.mustPickAtGarage,
//         MustDropAtGarage: d.mustDropAtGarage
//       })
//     }
//     const payload = payloadKg ? parseFloat(payloadKg) : undefined
//     if (payloadKg && (isNaN(payload!) || payload! < 0)) return Alert.alert('Khối lượng không hợp lệ', 'Payload phải >= 0.')
//     setSubmitting(true)
//     try {
//       const dto: PostTripCreateDTO = {
//         Title: title.trim(),
//         Description: description.trim(),
//         TripId: tripId,
//         RequiredPayloadInKg: payload,
//         PostTripDetails: builtDetails
//       }
//       const res: any = await postTripService.create(dto)
//       const ok = res?.isSuccess ?? (res?.statusCode === 200 || res?.statusCode === 201)
//       if (!ok) throw new Error(res?.message || 'Tạo bài đăng thất bại')
//       const post: PostTripViewDTO = res.result || res.data || res.post || {
//         postTripId: 'temp', tripId, title: dto.Title, description: dto.Description, status: 'OPEN'
//       }
//       onCreated(post)
//       onClose()
//       Alert.alert('Thành công', 'Đã đăng bài tìm tài xế.')
//     } catch (e: any) {
//       Alert.alert('Lỗi', e?.message || 'Không thể tạo bài đăng')
//     } finally {
//       setSubmitting(false)
//     }
//   }

//   return (
//     <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
// <View style={styles.backdrop}>
// <View style={styles.card}>
// <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
// <View style={styles.headerRow}>
// <Text style={styles.title}>Đăng bài tìm tài xế</Text>
// <TouchableOpacity onPress={onClose}><Text style={styles.close}>×</Text></TouchableOpacity>
// </View>
// <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
// <View style={{ gap: 14 }}>
// <View>
// <Text style={styles.label}>Tiêu đề</Text>
// <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Tiêu đề" />
// </View>
// <View>
// <Text style={styles.label}>Mô tả</Text>
// <TextInput value={description} onChangeText={setDescription} style={[styles.input, { height: 90, textAlignVertical: 'top' }]} multiline placeholder="Mô tả ngắn" />
// </View>
// <View style={styles.rowWrap}>
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Payload cần (kg)</Text>
// <TextInput value={payloadKg} onChangeText={setPayloadKg} keyboardType="numeric" style={styles.input} placeholder="Ví dụ: 500" />
// </View>
// </View>
// <View style={styles.separator} />
// <Text style={styles.sectionSub}>Chi tiết yêu cầu (nhiều dòng)</Text>
//                 {details.map((d, idx) => (
//                   <View key={idx} style={styles.detailBlock}>
// <View style={styles.detailHeader}>
// <Text style={styles.detailTitle}>Dòng {idx+1}</Text>
//                       {details.length > 1 && (
//                         <TouchableOpacity onPress={() => setDetails(prev => prev.filter((_, i) => i !== idx))}>
// <Text style={styles.remove}>Xóa</Text>
// </TouchableOpacity>
//                       )}
//                     </View>
// <View style={styles.rowWrap}>
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Loại tài xế</Text>
// <View style={styles.toggleRow}>
// <TouchableOpacity onPress={() => setDetails(prev => prev.map((p,i)=> i===idx?{...p, detailType:'PRIMARY'}:p))} style={[styles.toggleBtn, d.detailType==='PRIMARY'&&styles.toggleActive]}><Text style={[styles.toggleText,d.detailType==='PRIMARY'&&styles.toggleTextActive]}>Chính</Text></TouchableOpacity>
// <TouchableOpacity onPress={() => setDetails(prev => prev.map((p,i)=> i===idx?{...p, detailType:'SECONDARY'}:p))} style={[styles.toggleBtn, d.detailType==='SECONDARY'&&styles.toggleActive]}><Text style={[styles.toggleText,d.detailType==='SECONDARY'&&styles.toggleTextActive]}>Phụ</Text></TouchableOpacity>
// </View>
// </View>
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Số lượng cần</Text>
// <TextInput value={d.requiredCount} onChangeText={v => setDetails(prev => prev.map((p,i)=> i===idx?{...p, requiredCount:v.replace(/[^0-9]/g,'')}:p))} keyboardType="number-pad" style={styles.input} placeholder="1" />
// </View>
// </View>
// <View style={styles.rowWrap}>
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Giá mỗi tài xế (VND)</Text>
// <TextInput value={d.pricePerPerson} onChangeText={v => setDetails(prev => prev.map((p,i)=> i===idx?{...p, pricePerPerson:v.replace(/[^0-9.]/g,'')}:p))} keyboardType="numeric" style={styles.input} placeholder="0" />
// </View>
// </View>
// <View>
// <Text style={styles.label}>Điểm đón</Text>
// <TextInput value={d.pickupLocation} onChangeText={v => setDetails(prev => prev.map((p,i)=> i===idx?{...p, pickupLocation:v}:p))} style={styles.input} placeholder="Địa điểm đón" />
// </View>
// <View>
// <Text style={styles.label}>Điểm trả</Text>
// <TextInput value={d.dropoffLocation} onChangeText={v => setDetails(prev => prev.map((p,i)=> i===idx?{...p, dropoffLocation:v}:p))} style={styles.input} placeholder="Địa điểm trả" />
// </View>
// <View style={styles.flagsRow}>
// <TouchableOpacity onPress={()=>setDetails(prev => prev.map((p,i)=> i===idx?{...p, mustPickAtGarage: !p.mustPickAtGarage}:p))} style={[styles.flagBtn, d.mustPickAtGarage && styles.flagActive]}>
// <Text style={[styles.flagText, d.mustPickAtGarage && styles.flagTextActive]}>Đón tại gara</Text>
// </TouchableOpacity>
// <TouchableOpacity onPress={()=>setDetails(prev => prev.map((p,i)=> i===idx?{...p, mustDropAtGarage: !p.mustDropAtGarage}:p))} style={[styles.flagBtn, d.mustDropAtGarage && styles.flagActive]}>
// <Text style={[styles.flagText, d.mustDropAtGarage && styles.flagTextActive]}>Trả tại gara</Text>
// </TouchableOpacity>
// </View>
// </View>
//                 ))}
//                 <TouchableOpacity style={styles.addLineBtn} onPress={() => setDetails(prev => [...prev, { detailType:'PRIMARY', requiredCount:'1', pricePerPerson:'0', pickupLocation:'', dropoffLocation:'', mustPickAtGarage:false, mustDropAtGarage:false }])}>
// <Text style={styles.addLineText}>+ Thêm dòng</Text>
// </TouchableOpacity>
// <Text style={styles.totalDrivers}>Tổng số tài xế cần: {details.reduce((sum,d)=> sum + (parseInt(d.requiredCount||'0',10)||0),0)}</Text>
// </View>
// </ScrollView>
// </KeyboardAvoidingView>
// <View style={styles.footerBar}>
// <TouchableOpacity style={[styles.btnSmall, styles.secondaryOutline]} onPress={onClose} disabled={submitting}>
// <Text style={styles.secondaryOutlineText}>Đóng</Text>
// </TouchableOpacity>
// <TouchableOpacity style={[styles.btnPrimaryWide]} onPress={submit} disabled={submitting}> 
//               {submitting ? <ActivityIndicator color="#fff" /> : <CheckIcon style={styles.primaryIcon} />}
//               <Text style={styles.btnPrimaryWideText}>{submitting ? 'Đang đăng...' : 'Đăng bài'}</Text>
// </TouchableOpacity>
// </View>
// </View>
// </View>
// </Modal>
//   )
// }

// const styles = StyleSheet.create({
//   backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 16 },
//   card: { width: '100%', maxWidth: 560, maxHeight: '90%', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', paddingTop: 12, paddingHorizontal: 16, paddingBottom: 0, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
//   scroll: { flex: 1 },
//   scrollContent: { paddingBottom: 8 },
//   headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
//   title: { fontWeight: '800', fontSize: 16, color: '#111827' },
//   close: { fontSize: 22, lineHeight: 22, color: '#6B7280' },
//   label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
//   input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#111827', fontSize: 14 },
//   primaryIcon: { width: 18, height: 18, color: '#FFFFFF', marginRight: 8 },
//   footerBar: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderTopWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#FFFFFF', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
//   btnSmall: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
//   secondaryOutline: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' },
//   secondaryOutlineText: { color: '#475569', fontWeight: '600', fontSize: 13 },
//   btnPrimaryWide: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#4F46E5', paddingVertical: 12, borderRadius: 10 },
//   btnPrimaryWideText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
//   rowWrap: { flexDirection: 'row', gap: 12 },
//   toggleRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
//   toggleBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
//   toggleActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
//   toggleText: { fontWeight: '600', color: '#374151' },
//   toggleTextActive: { color: '#FFFFFF' },
//   separator: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
//   sectionSub: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8 },
//   flagsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
//   flagBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
//   flagActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
//   flagText: { fontSize: 12, fontWeight: '600', color: '#374151' },
//   flagTextActive: { color: '#FFFFFF' }
//   ,detailBlock: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#F9FAFB' }
//   ,detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }
//   ,detailTitle: { fontSize: 12, fontWeight: '700', color: '#111827' }
//   ,remove: { fontSize: 12, fontWeight: '600', color: '#DC2626' }
//   ,addLineBtn: { marginTop: 4, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#EEF2FF', borderRadius: 8, borderWidth: 1, borderColor: '#E0E7FF' }
//   ,addLineText: { fontSize: 12, fontWeight: '600', color: '#4338CA' }
//   ,totalDrivers: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#374151' }
// })

// export default CreatePostTripModal

import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import postTripService, { PostTripCreateDTO, PostTripViewDTO, PostTripDetailCreateDTO, DriverType } from '@/services/postTripService'
import contractTemplateService from '@/services/contractTemplateService'
import walletService from '@/services/walletService'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import AddressAutocomplete from '@/components/AddressAutocomplete'

interface CreatePostTripModalProps {
  visible: boolean
  onClose: () => void
  tripId: string
  onCreated: (post: PostTripViewDTO) => void
}

interface DetailFormState {
  detailType: DriverType
  requiredCount: string
  pricePerPerson: string
  pickupLocation: string
  dropoffLocation: string
  // Giữ lại field trong state để không lỗi logic, mặc định false
  mustPickAtGarage: boolean
  mustDropAtGarage: boolean
    bonusAmount?: string
}

const CreatePostTripModal: React.FC<CreatePostTripModalProps> = ({ visible, onClose, tripId, onCreated }) => {
  const [title, setTitle] = useState('Tìm thêm tài xế cho chuyến')
  const [description, setDescription] = useState('Cần bổ sung tài xế, ưu tiên kinh nghiệm và đúng giờ.')
    const [payloadKg, setPayloadKg] = useState('')
  
  const [details, setDetails] = useState<DetailFormState[]>([{
    detailType: 'PRIMARY',
    requiredCount: '1',
    pricePerPerson: '0',
    pickupLocation: '',
    dropoffLocation: '',
        mustPickAtGarage: false,
        mustDropAtGarage: false,
        bonusAmount: ''
  }])
  
    const [submitting, setSubmitting] = useState(false)
    // multi-step flow state
    const [step, setStep] = useState<number>(1)
    const [loading, setLoading] = useState(false)
    const [contractTemplate, setContractTemplate] = useState<any | null>(null)
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const [createdPostId, setCreatedPostId] = useState<string | null>(null)
    const [wallet, setWallet] = useState<any | null>(null)
    const [sufficientBalance, setSufficientBalance] = useState<boolean | null>(null)
    const [paymentLoading, setPaymentLoading] = useState(false)

  const formatMoney = (val: string) => val.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const sanitizeNumber = (val: string) => val.replace(/[^0-9]/g, '')

    // Step 1 -> Step 2: create post on server and fetch contract template
    const handleNext = async () => {
        if (!title.trim()) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề bài đăng.')
        if (!details.length) return Alert.alert('Thiếu thông tin', 'Cần ít nhất 1 dòng yêu cầu chi tiết.')

        const builtDetails: PostTripDetailCreateDTO[] = []
        for (let i = 0; i < details.length; i++) {
            const d = details[i]
            const reqCount = parseInt(d.requiredCount || '0', 10)
            if (isNaN(reqCount) || reqCount <= 0) return Alert.alert('Lỗi nhập liệu', `Dòng ${i + 1}: Số lượng tài xế phải lớn hơn 0.`)

            const price = parseFloat(d.pricePerPerson.replace(/,/g, '') || '0')
            if (price < 0) return Alert.alert('Lỗi nhập liệu', `Dòng ${i + 1}: Giá không hợp lệ.`)
            const bonus = d.bonusAmount ? parseFloat(d.bonusAmount.replace(/,/g, '')) : undefined
            if (typeof bonus === 'number' && (isNaN(bonus) || bonus < 0)) return Alert.alert('Lỗi nhập liệu', `Dòng ${i + 1}: Phụ phí không hợp lệ.`)
            if (typeof bonus === 'number' && bonus > 1000000000) return Alert.alert('Lỗi nhập liệu', `Dòng ${i + 1}: Phụ phí quá lớn.`)

            const detail: PostTripDetailCreateDTO = {
                Type: d.detailType,
                RequiredCount: reqCount,
                PricePerPerson: price,
                PickupLocation: d.pickupLocation.trim(),
                DropoffLocation: d.dropoffLocation.trim(),
                MustPickAtGarage: false,
                MustDropAtGarage: false,
                BonusAmount: bonus
            }
            builtDetails.push(detail)
        }

        const payload = payloadKg ? parseFloat(payloadKg.replace(/,/g, '')) : undefined

        setLoading(true)
        try {
            const dto: PostTripCreateDTO = {
                Title: title.trim(),
                Description: description.trim(),
                TripId: tripId,
                RequiredPayloadInKg: payload,
                PostTripDetails: builtDetails
            }

            // create post trip on server with awaiting signature status (backend will return id)
            const res: any = await postTripService.create(dto)
            const ok = res?.isSuccess ?? (res?.statusCode === 200 || res?.statusCode === 201)
            if (!ok) throw new Error(res?.message || 'Tạo bài đăng thất bại')

            const createdId = res.result?.postTripId || res.result?.PostTripId || res.result?.id || res.postTripId || res.data?.postTripId
            setCreatedPostId(String(createdId || ''))

            // fetch latest provider contract template (includes terms)
            try {
                const tplResp: any = await contractTemplateService.getLatestProviderContract()
                const tpl = tplResp?.result ?? tplResp
                setContractTemplate(tpl ?? null)
            } catch (e) {
                console.warn('contract fetch failed', e)
                setContractTemplate(null)
            }

            setAcceptedTerms(false)
            setStep(2)
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Không thể tạo bài đăng')
        } finally {
            setLoading(false)
        }
    }

  const updateDetail = (index: number, field: keyof DetailFormState, value: any) => {
    setDetails(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

    // Called from Step 2 when user accepts contract terms
    const handleAcceptAndProceedToPayment = async () => {
        if (!createdPostId) return Alert.alert('Lỗi', 'Không tìm thấy ID bài đăng để thanh toán.')
        if (!acceptedTerms) return Alert.alert('Vui lòng chấp nhận hợp đồng để tiếp tục')

        setLoading(true)
            try {
                // Best-effort: update post trip status to AWAITING_PAYMENT if endpoint exists
                try {
                    await postTripService.updateStatus(createdPostId, 'AWAITING_PAYMENT')
                } catch (e) {
                    console.warn('postTrip.updateStatus not available or failed', e)
                }

            // fetch wallet info to check balance and compute sufficiency
            let myWallet: any = null
            try {
                const wresp: any = await walletService.getMyWallet()
                myWallet = wresp?.result ?? wresp
                setWallet(myWallet)
            } catch (e) {
                console.warn('wallet fetch failed', e)
                setWallet(null)
            }

            // compute simple total and set sufficiency flag
            const total = details.reduce((sum, d) => {
                const price = parseFloat((d.pricePerPerson || '0').toString().replace(/,/g, '')) || 0
                const bonus = parseFloat((d.bonusAmount || '0').toString().replace(/,/g, '')) || 0
                const count = parseInt(d.requiredCount || '0', 10) || 0
                return sum + (price + bonus) * count
            }, 0)
            const bal = Number(myWallet?.balance ?? myWallet?.Balance ?? null)
            if (!isNaN(bal)) setSufficientBalance(bal >= total)

            setStep(3)
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Không thể chuẩn bị thanh toán')
        } finally {
            setLoading(false)
        }
    }

    const handlePayment = async () => {
        if (!createdPostId) return Alert.alert('Lỗi', 'Không tìm thấy ID bài đăng để thanh toán.')
        setPaymentLoading(true)
        try {
            const amount = details.reduce((sum, d) => {
                const price = parseFloat((d.pricePerPerson || '0').toString().replace(/,/g, '')) || 0
                const bonus = parseFloat((d.bonusAmount || '0').toString().replace(/,/g, '')) || 0
                const count = parseInt(d.requiredCount || '0', 10) || 0
                return sum + (price + bonus) * count
            }, 0)

            const payload = {
                amount,
                type: 'POST_TRIP_PAYMENT',
                // send the created postTrip id in the PostId field so backend recognizes the post resource
                postId: createdPostId,
                tripId: null,
                description: `Thanh toán cho bài đăng tìm tài xế (${createdPostId})`
            }

            const presp: any = await walletService.createPayment(payload)
            const ok = presp?.isSuccess ?? (presp?.statusCode === 200 || presp?.statusCode === 201)
            if (!ok) throw new Error(presp?.message || 'Thanh toán thất bại')

            setStep(4)
            // notify parent with a lightweight PostTripViewDTO stub
            const postStub: PostTripViewDTO = {
                postTripId: createdPostId,
                tripId,
                title,
                description,
                status: 'AWAITING_DRIVER'
            } as any
            onCreated(postStub)
        } catch (e: any) {
            const msg = e?.message || 'Thanh toán thất bại'
            Alert.alert('Lỗi thanh toán', msg, [
                { text: 'Thử lại', onPress: () => handlePayment() },
                { text: 'Hủy', style: 'cancel' }
            ])
        } finally {
            setPaymentLoading(false)
        }
    }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerHandle} />
            <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>Đăng Tin Tìm Tài Xế</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color="#4B5563" />
                </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {step === 1 && (
              <>
                {/* Section 1: Thông tin chung */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. THÔNG TIN BÀI ĐĂNG</Text>
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Tiêu đề bài viết</Text>
                            <TextInput 
                                value={title} 
                                onChangeText={setTitle} 
                                style={styles.input} 
                                placeholder="VD: Cần tìm 2 tài xế xe tải 5 tấn..." 
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Mô tả công việc</Text>
                            <TextInput 
                                value={description} 
                                onChangeText={setDescription} 
                                style={[styles.input, styles.textArea]} 
                                multiline 
                                placeholder="Mô tả chi tiết yêu cầu..." 
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Tải trọng yêu cầu (Kg)</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialCommunityIcons name="weight-kilogram" size={20} color="#6B7280" style={styles.inputIcon} />
                                <TextInput 
                                    value={formatMoney(payloadKg)} 
                                    onChangeText={(t) => setPayloadKg(sanitizeNumber(t))} 
                                    keyboardType="numeric" 
                                    style={styles.inputNoBorder} 
                                    placeholder="0"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                    </View>
                </View>

                {/* Section 2: Chi tiết yêu cầu */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>2. CHI TIẾT YÊU CẦU ({details.length})</Text>
                        <TouchableOpacity style={styles.addBtn} onPress={() => setDetails(prev => [...prev, { detailType:'PRIMARY', requiredCount:'1', pricePerPerson:'0', pickupLocation:'', dropoffLocation:'', mustPickAtGarage:false, mustDropAtGarage:false }])}>
                            <Ionicons name="add" size={16} color="#FFF" />
                            <Text style={styles.addBtnText}>Thêm dòng</Text>
                        </TouchableOpacity>
                    </View>

                    {details.map((d, idx) => {
                        const isPrimary = d.detailType === 'PRIMARY'
                        return (
                            <View key={idx} style={styles.detailCard}>
                                {/* Header của từng Card */}
                                <View style={styles.detailCardHeader}>
                                    <View style={styles.tagContainer}>
                                        <Text style={styles.tagText}>Yêu cầu #{idx + 1}</Text>
                                    </View>
                                    {details.length > 1 && (
                                        <TouchableOpacity onPress={() => setDetails(prev => prev.filter((_, i) => i !== idx))} style={styles.deleteBtn}>
                                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Content Card */}
                                <View style={styles.detailCardBody}>
                                    
                                    {/* [FIXED] Sử dụng width cố định cho ô Số lượng để tránh tràn */}
                                    <View style={styles.rowInputs}>
                                        <View style={{ flex: 1, marginRight: 12 }}>
                                            <Text style={styles.label}>Loại tài xế</Text>
                                            <View style={styles.segmentControl}>
                                                <TouchableOpacity 
                                                    style={[styles.segmentBtn, isPrimary && styles.segmentBtnActive]} 
                                                    onPress={() => updateDetail(idx, 'detailType', 'PRIMARY')}
                                                >
                                                    <Text style={[styles.segmentText, isPrimary && styles.segmentTextActive]}>Chính</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    style={[styles.segmentBtn, !isPrimary && styles.segmentBtnActive]} 
                                                    onPress={() => updateDetail(idx, 'detailType', 'SECONDARY')}
                                                >
                                                    <Text style={[styles.segmentText, !isPrimary && styles.segmentTextActive]}>Phụ</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        {/* Width cố định 100 cho ô số lượng */}
                                        <View style={{ width: 100 }}>
                                            <Text style={styles.label}>Số lượng</Text>
                                                <View style={styles.smallInputWrapper}>
                                                    <TextInput
                                                        value={d.requiredCount}
                                                        onChangeText={v => updateDetail(idx, 'requiredCount', sanitizeNumber(v))}
                                                        keyboardType="number-pad"
                                                        style={styles.smallInput}
                                                        placeholder="1"
                                                        maxLength={3}
                                                    />
                                                </View>
                                        </View>
                                    </View>

                                    {/* Giá tiền */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Ngân sách / người (VND)</Text>
                                        <View style={styles.inputWrapper}>
                                            <Text style={styles.currencySymbol}>₫</Text>
                                            <TextInput 
                                                value={formatMoney(d.pricePerPerson)} 
                                                onChangeText={v => updateDetail(idx, 'pricePerPerson', sanitizeNumber(v))} 
                                                keyboardType="numeric" 
                                                style={styles.inputNoBorder} 
                                                placeholder="0"
                                            />
                                        </View>
                                    </View>

                                    {/* Phụ phí / Tiền thưởng cho từng dòng */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Phụ phí / Tiền thưởng (VND)</Text>
                                        <View style={styles.inputWrapper}>
                                            <Text style={styles.currencySymbol}>₫</Text>
                                            <TextInput
                                                value={formatMoney(d.bonusAmount || '')}
                                                onChangeText={v => updateDetail(idx, 'bonusAmount', sanitizeNumber(v))}
                                                keyboardType="numeric"
                                                style={styles.inputNoBorder}
                                                placeholder="0"
                                            />
                                        </View>
                                        {d.bonusAmount && parseFloat(d.bonusAmount.replace(/,/g, '')) > 1000000000 && (
                                            <Text style={styles.errorText}>Phụ phí quá lớn (tối đa 1,000,000,000)</Text>
                                        )}
                                    </View>

                                    {/* Địa điểm (Timeline style) - [REMOVED CHECKBOXES] */}
                                    <View style={styles.timelineContainer}>
                                        <View style={styles.timelineDecor}>
                                            <View style={[styles.dot, {backgroundColor: '#3B82F6'}]} />
                                            <View style={styles.line} />
                                            <View style={[styles.dot, {backgroundColor: '#EF4444'}]} />
                                        </View>
                                        <View style={{flex: 1, gap: 12}}>
                                            
                                            {/* Điểm Đi [FIXED zIndex] */}
                                            <View style={{zIndex: 20}}>
                                                <Text style={styles.label}>{isPrimary ? 'Điểm nhận xe (Garage)' : 'Điểm đón tài xế'}</Text>
                                                <View style={styles.addressInputWrapper}>
                                                    <AddressAutocomplete
                                                        value={d.pickupLocation}
                                                        onSelect={(s: any) => updateDetail(idx, 'pickupLocation', s.display || s.name)}
                                                        placeholder={isPrimary ? "VD: Bãi xe miền Đông..." : "VD: Ngã tư Thủ Đức..."}
                                                    />
                                                </View>
                                            </View>

                                            {/* Điểm Đến [FIXED zIndex] */}
                                            <View style={{zIndex: 10}}>
                                                <Text style={styles.label}>{isPrimary ? 'Điểm trả xe (Bắt buộc)' : 'Điểm trả tài xế'}</Text>
                                                <View style={styles.addressInputWrapper}>
                                                    <AddressAutocomplete
                                                        value={d.dropoffLocation}
                                                        onSelect={(s: any) => updateDetail(idx, 'dropoffLocation', s.display || s.name)}
                                                        placeholder={isPrimary ? "VD: Trả xe tại bãi..." : "VD: Bến xe..."}
                                                    />
                                                </View>
                                            </View>

                                        </View>
                                    </View>

                                    {/* Note Box */}
                                    <View style={[styles.noteBox, isPrimary ? styles.notePrimary : styles.noteSecondary]}>
                                        <Ionicons name="information-circle" size={20} color={isPrimary ? "#4338CA" : "#4B5563"} />
                                        <Text style={[styles.noteText, {color: isPrimary ? "#3730A3" : "#374151"}]}> 
                                            {isPrimary 
                                                ? "Lưu ý: Tài xế chính bắt buộc phải đến điểm nhận xe và hoàn trả xe tại điểm kết thúc."
                                                : "Lưu ý: Tài xế phụ chỉ cần có mặt tại điểm đón và kết thúc tại điểm trả khách."}
                                        </Text>
                                    </View>

                                </View>
                            </View>
                        )
                    })}
                </View>
              </>
            )}

            {step === 2 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>2. XEM HỢP ĐỒNG</Text>
                <View style={styles.card}>
                                    {contractTemplate ? (
                                        <>
                                            <Text style={styles.contractTitle}>{contractTemplate?.ContractTemplateName || contractTemplate?.contractTemplateName || 'Hợp đồng nhà cung cấp'}</Text>
                                            {((contractTemplate?.ContractTerms ?? contractTemplate?.contractTerms) || []).map((t: any, i: number) => (
                                                <View key={t?.contractTermId ?? i} style={styles.termItem}>
                                                    <Text style={styles.termIndex}>{t?.order ?? (i + 1)}.</Text>
                                                    <Text style={styles.termText}>{t?.Content ?? t?.content ?? t?.contentHtml ?? ''}</Text>
                                                </View>
                                            ))}
                                        </>
                                    ) : (
                                        <Text>Không có mẫu hợp đồng. Vui lòng kiểm tra kết nối.</Text>
                                    )}

                  <View style={styles.acceptRow}>
                    <TouchableOpacity onPress={() => setAcceptedTerms(prev => !prev)} style={styles.checkboxArea}>
                      {acceptedTerms ? <Ionicons name="checkbox" size={20} color="#4F46E5" /> : <Ionicons name="square-outline" size={20} color="#6B7280" />}
                    </TouchableOpacity>
                    <Text style={styles.acceptText}>Tôi đã đọc và đồng ý với các điều khoản</Text>
                  </View>
                </View>
              </View>
            )}

            {step === 3 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>3. THANH TOÁN</Text>
                                <View style={styles.card}>
                                    {(() => {
                                        const total = details.reduce((sum, d) => {
                                            const price = parseFloat((d.pricePerPerson || '0').toString().replace(/,/g, '')) || 0
                                            const bonus = parseFloat((d.bonusAmount || '0').toString().replace(/,/g, '')) || 0
                                            const count = parseInt(d.requiredCount || '0', 10) || 0
                                            return sum + (price + bonus) * count
                                        }, 0)
                                        return (
                                            <>
                                                <Text style={{ fontSize: 14, fontWeight: '700' }}>Tổng cần thanh toán</Text>
                                                <Text style={{ fontSize: 22, fontWeight: '800', marginTop: 8 }}>₫ {formatMoney(String(total))}</Text>
                                                <Text style={{ color: '#6B7280', marginTop: 8 }}>Phương thức: Ví nội bộ</Text>
                                            </>
                                        )
                                    })()}

                                    <View style={{ height: 12 }} />
                                    <Text style={styles.label}>Số dư ví của bạn</Text>
                                    <Text style={styles.walletBalance}>₫ {formatMoney(String(wallet?.balance ?? wallet?.Balance ?? 0))}</Text>
                                    {sufficientBalance === true && <Text style={{ color: '#059669', marginTop: 6 }}>Số dư đủ để thanh toán.</Text>}
                                    {sufficientBalance === false && <Text style={{ color: '#DC2626', marginTop: 6 }}>Số dư không đủ. Vui lòng nạp thêm.</Text>}
                                </View>
                            </View>
            )}

            {step === 4 && (
              <View style={styles.section}>
                <View style={styles.card}>
                  <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Hoàn tất</Text>
                  <Text>Thanh toán thành công. Bài đăng của bạn đã được gửi và đang chờ tài xế nhận.</Text>
                </View>
              </View>
            )}

          </ScrollView>

                    {/* Footer (step aware) */}
                    <View style={styles.footer}>
                        {step === 1 && (
                            <>
                                <View style={styles.summaryBox}>
                                        <Text style={styles.summaryLabel}>Tổng cần tuyển:</Text>
                                        <Text style={styles.summaryValue}>{details.reduce((sum,d)=> sum + (parseInt(d.requiredCount||'0',10)||0),0)} Tài xế</Text>
                                </View>
                                <TouchableOpacity 
                                        style={[styles.btnPrimary, (submitting || loading) && styles.btnDisabled]} 
                                        onPress={handleNext} 
                                        disabled={submitting || loading}
                                >
                                        {submitting ? <ActivityIndicator color="#FFF" /> : (
                                                <>
                                                        <Text style={styles.btnPrimaryText}>Đăng Tin Ngay</Text>
                                                        <Ionicons name="paper-plane-outline" size={18} color="#FFF" />
                                                </>
                                        )}
                                </TouchableOpacity>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <TouchableOpacity style={[styles.btnSmall, styles.secondaryOutline]} onPress={() => setStep(1)} disabled={loading}>
                                    <Text style={styles.secondaryOutlineText}>Quay lại</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btnPrimary, (loading || !acceptedTerms) && styles.btnDisabled]} onPress={handleAcceptAndProceedToPayment} disabled={loading || !acceptedTerms}>
                                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimaryText}>Chấp nhận & Thanh toán</Text>}
                                </TouchableOpacity>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <TouchableOpacity style={[styles.btnSmall, styles.secondaryOutline]} onPress={() => setStep(2)} disabled={paymentLoading}>
                                    <Text style={styles.secondaryOutlineText}>Quay lại</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btnPrimary, paymentLoading && styles.btnDisabled]} onPress={handlePayment} disabled={paymentLoading}>
                                    {paymentLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimaryText}>Thanh toán</Text>}
                                </TouchableOpacity>
                            </>
                        )}

                        {step === 4 && (
                            <>
                                <View style={styles.summaryBox}>
                                    <Text style={styles.summaryLabel}>Trạng thái</Text>
                                    <Text style={styles.summaryValue}>Hoàn tất</Text>
                                </View>
                                <TouchableOpacity style={styles.btnPrimary} onPress={() => { onClose(); setStep(1); }}>
                                    <Text style={styles.btnPrimaryText}>Đóng</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  // Modal Layout
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#F3F4F6', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '90%', shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 10 },
  
  // Header
  header: { alignItems: 'center', paddingVertical: 12, backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, marginBottom: 12 },
  headerRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  closeBtn: { padding: 6, backgroundColor: '#F3F4F6', borderRadius: 12 },

  scrollContent: { flex: 1 },

  // Generic
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  
  // Inputs
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  inputNoBorder: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
    smallInputWrapper: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 8, height: 44 },
    smallInput: { width: '100%', textAlign: 'center', fontSize: 14, color: '#111827', paddingVertical: 10 },
  inputIcon: { marginRight: 8 },
  textArea: { height: 80, textAlignVertical: 'top' },
  currencySymbol: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginRight: 4 },

  // Detail Cards
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4F46E5', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, gap: 4 },
  addBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  
  detailCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', shadowColor: "#000", shadowOffset: {width:0, height:1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  detailCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tagContainer: { backgroundColor: '#E0E7FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 12, fontWeight: '700', color: '#4338CA' },
  deleteBtn: { padding: 4 },
  
  detailCardBody: { padding: 16 },
  rowInputs: { flexDirection: 'row', marginBottom: 14 },
  
  // Segment
  segmentControl: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 4, height: 44 },
  segmentBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  segmentBtnActive: { backgroundColor: '#FFF', shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  segmentText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  segmentTextActive: { color: '#4F46E5' },

  // Timeline Address
  timelineContainer: { flexDirection: 'row', marginTop: 4 },
  timelineDecor: { alignItems: 'center', width: 20, paddingTop: 24, paddingRight: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { flex: 1, width: 2, backgroundColor: '#E5E7EB', marginVertical: 4 },
  addressInputWrapper: { marginBottom: 4 },
  
  // Note Box
  noteBox: { flexDirection: 'row', padding: 12, borderRadius: 10, gap: 10, alignItems: 'flex-start', marginTop: 16 },
  notePrimary: { backgroundColor: '#EEF2FF' },
  noteSecondary: { backgroundColor: '#F3F4F6' },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 12 },
  summaryBox: { flex: 1 },
  summaryLabel: { fontSize: 12, color: '#6B7280' },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#111827' },
  btnPrimary: { flexDirection: 'row', backgroundColor: '#4F46E5', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', gap: 8, shadowColor: "#4F46E5", shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 8 },
  btnDisabled: { backgroundColor: '#A5B4FC', shadowOpacity: 0 },
  btnPrimaryText: { color: '#FFF', fontSize: 15, fontWeight: '700' }
        ,
    contractTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 8 },
    btnSmall: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
    secondaryOutline: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' },
    secondaryOutlineText: { color: '#475569', fontWeight: '600', fontSize: 13 },
    termItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    termIndex: { fontSize: 13, fontWeight: '700', color: '#6B7280', width: 20 },
    termText: { flex: 1, fontSize: 13, color: '#374151' },
    acceptRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    checkboxArea: { marginRight: 8 },
    acceptText: { fontSize: 13, color: '#374151' },
    totalAmount: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 6 },
    walletBalance: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 6 },
        errorText: { color: '#DC2626', fontSize: 12, marginTop: 6 }
})

export default CreatePostTripModal