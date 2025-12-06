

import React, { useEffect, useState } from 'react'
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, 
  ScrollView, ActivityIndicator, Pressable, FlatList, Alert
} from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import packageService from '@/services/packageService'
import contractTemplateService from '@/services/contractTemplateService'
import postPackageService, { type RouteCalculationResultDTO, type Location } from '@/services/postPackageService'
import walletService from '@/services/walletService'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import DateInput from '@/components/DateInput'
import { formatVND, digitsOnly } from '@/utils/currency'

interface PostFormModalProps {
  visible: boolean
  onClose: () => void
  onCreated: (res: any) => void
  // Optional: when editing a PENDING post, pass initial data to prefill the form.
  initialData?: any | null
  isEdit?: boolean
}

const COLORS = { primary: '#0284C7', text: '#1F2937', border: '#E5E7EB', bg: '#FFFFFF', danger: '#EF4444' }

// Component Input dùng chung
const InputField = ({ label, value, onChange, placeholder, width = '100%', multiline = false, required = false }: any) => (
  <View style={{ width, marginBottom: 16 }}>
    <Text style={styles.label}>{label} {required && <Text style={{color: COLORS.danger}}>*</Text>}</Text>
    <TextInput
      style={[styles.input, multiline && { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      multiline={multiline}
    />
  </View>
)

// Step indicator dots component (4 steps: Form, Contract, Payment, Success)
const StepIndicator: React.FC<{ step: number }> = ({ step }) => (
  <View style={styles.stepIndicator}>
    {[1,2,3,4].map(s => (
      <View key={s} style={[styles.stepDot, s === step ? styles.stepDotActive : null]} />
    ))}
  </View>
)

const PostFormModal: React.FC<PostFormModalProps> = ({ visible, onClose, onCreated, initialData = null, isEdit = false }) => {
  const [loading, setLoading] = useState(false)
  const [packages, setPackages] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // multi-step state: 1=form,2=terms,3=payment,4=success
  const [step, setStep] = useState<number>(1)
  const [contractTemplate, setContractTemplate] = useState<any | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false)
  const [createdPostId, setCreatedPostId] = useState<string | null>(null)
  const [wallet, setWallet] = useState<any | null>(null)
  const [sufficientBalance, setSufficientBalance] = useState<boolean | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  
  // Route validation state
  const [routeValidation, setRouteValidation] = useState<RouteCalculationResultDTO | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Form State
  const [form, setForm] = useState({
    title: '', description: '', offeredPrice: '',
    startLocation: '', endLocation: '',
    pickupDate: '', deliveryDate: '',
    senderName: '', senderPhone: '',
    senderEmail: '', senderNote: '',
    receiverName: '', receiverPhone: '', receiverEmail: '', receiverNote: ''
  })

  useEffect(() => {
    if (visible) {
      fetchPendingPackages()
      // If editing, prefill form from initialData
      if (initialData) {
        const d = initialData
        setForm({
          title: d.title ?? d.Title ?? '',
          description: d.description ?? d.Description ?? '',
          offeredPrice: (d.offeredPrice ?? d.OfferedPrice ?? 0).toString(),
          startLocation: d.shippingRoute?.startLocation?.address ?? d.shippingRoute?.StartLocation ?? d.startLocation ?? '',
          endLocation: d.shippingRoute?.endLocation?.address ?? d.shippingRoute?.EndLocation ?? d.endLocation ?? '',
          pickupDate: d.shippingRoute?.expectedPickupDate ?? d.shippingRoute?.ExpectedPickupDate ?? d.expectedPickupDate ?? '',
          deliveryDate: d.shippingRoute?.expectedDeliveryDate ?? d.shippingRoute?.ExpectedDeliveryDate ?? d.expectedDeliveryDate ?? '',
          senderName: d.senderContact?.fullName ?? d.SenderContact?.FullName ?? '',
          senderPhone: d.senderContact?.phoneNumber ?? d.SenderContact?.PhoneNumber ?? '',
          senderEmail: d.senderContact?.email ?? d.SenderContact?.Email ?? '',
          senderNote: d.senderContact?.note ?? d.SenderContact?.Note ?? '',
          receiverName: d.receiverContact?.fullName ?? d.ReceiverContact?.FullName ?? '',
          receiverPhone: d.receiverContact?.phoneNumber ?? d.ReceiverContact?.PhoneNumber ?? '',
          receiverEmail: d.receiverContact?.email ?? d.ReceiverContact?.Email ?? '',
          receiverNote: d.receiverContact?.note ?? d.ReceiverContact?.Note ?? '',
        })
        // pre-select package ids if provided
        const pkgIds = (d.packages || d.PackageIds || []).map((p: any) => p.packageId ?? p.id ?? p)
        setSelectedIds(pkgIds)
      }
    } else reset()
  }, [visible, initialData])

  const reset = () => {
    setForm({ title: '', description: '', offeredPrice: '', startLocation: '', endLocation: '', pickupDate: '', deliveryDate: '', senderName: '', senderPhone: '', senderEmail: '', senderNote: '', receiverName: '', receiverPhone: '', receiverEmail: '', receiverNote: '' })
    setSelectedIds([])
    setStep(1)
    setContractTemplate(null)
    setAcceptedTerms(false)
    setLoading(false)
  }

  const handleChange = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  // Real-time route calculation - CHỈ gửi khi có đủ cả ngày lấy VÀ ngày giao
  useEffect(() => {
    const calculateRoute = async () => {
      // PHẢI có đủ: địa điểm đi, địa điểm đến, ngày lấy, ngày giao
      if (!form.startLocation || !form.endLocation || !form.pickupDate || !form.deliveryDate) {
        setRouteValidation(null)
        setValidationError(null)
        return
      }

      setIsCalculating(true)
      setValidationError(null)

      try {
        console.log('📍 Starting route calculation...')
        console.log('Start address:', form.startLocation)
        console.log('End address:', form.endLocation)
        console.log('Pickup date:', form.pickupDate)
        console.log('Delivery date:', form.deliveryDate)

        // Geocode addresses to get coordinates first (with error handling)
        let startLoc: Location
        let endLoc: Location

        try {
          startLoc = await postPackageService.ensureLocationCoordinates({
            address: form.startLocation || '',
            latitude: null,
            longitude: null
          })
          console.log('✅ Start location geocoded:', startLoc)
        } catch (err: any) {
          console.error('❌ Failed to geocode start location:', err)
          setValidationError(`Không thể tìm tọa độ điểm đi: ${form.startLocation}. Vui lòng nhập địa chỉ cụ thể hơn.`)
          setIsCalculating(false)
          return
        }

        try {
          endLoc = await postPackageService.ensureLocationCoordinates({
            address: form.endLocation || '',
            latitude: null,
            longitude: null
          })
          console.log('✅ End location geocoded:', endLoc)
        } catch (err: any) {
          console.error('❌ Failed to geocode end location:', err)
          setValidationError(`Không thể tìm tọa độ điểm đến: ${form.endLocation}. Vui lòng nhập địa chỉ cụ thể hơn.`)
          setIsCalculating(false)
          return
        }

        // Final validation before calling backend
        if (!startLoc.address || !startLoc.latitude || !startLoc.longitude) {
          console.error('❌ Start location incomplete:', startLoc)
          setValidationError('Dữ liệu địa điểm đi không đầy đủ')
          setIsCalculating(false)
          return
        }

        if (!endLoc.address || !endLoc.latitude || !endLoc.longitude) {
          console.error('❌ End location incomplete:', endLoc)
          setValidationError('Dữ liệu địa điểm đến không đầy đủ')
          setIsCalculating(false)
          return
        }

        console.log('✅ Both locations validated, calling calculateRoute API...')

        // Call calculate route với CẢ ngày lấy VÀ ngày giao
        const response = await postPackageService.calculateRoute({
          startLocation: startLoc,
          endLocation: endLoc,
          expectedPickupDate: new Date(form.pickupDate).toISOString(),
          expectedDeliveryDate: new Date(form.deliveryDate).toISOString()
        })

        console.log('✅ Route calculation response:', response)
        
        // Extract result from ResponseDTO
        const result = response?.result
        console.log('✅ Extracted result:', result)

        if (!result) {
          setValidationError('Không nhận được kết quả từ server')
          return
        }

        setRouteValidation(result)

        if (!result.isValid) {
          setValidationError(result.message || 'Lộ trình không hợp lệ')
        }
      } catch (error: any) {
        console.error('❌ Route calculation error:', error)
        setValidationError(error?.message || 'Không thể tính toán lộ trình')
      } finally {
        setIsCalculating(false)
      }
    }

    const timer = setTimeout(calculateRoute, 800)
    return () => clearTimeout(timer)
  }, [form.startLocation, form.endLocation, form.pickupDate, form.deliveryDate])

  // Validate delivery date against suggestion - tích hợp vào validation result
  const getDeliveryDateValidation = () => {
    if (!routeValidation?.suggestedMinDeliveryDate || !form.deliveryDate) return null
    
    const suggestedTime = new Date(routeValidation.suggestedMinDeliveryDate).getTime()
    const selectedTime = new Date(form.deliveryDate).getTime()
    
    if (selectedTime < suggestedTime) {
      return {
        isValid: false,
        message: `⚠️ Thời gian giao hàng quá ngắn! Vui lòng chọn sau ${new Date(suggestedTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
      }
    }
    return { isValid: true, message: '✓ Thời gian giao hàng hợp lý' }
  }

  const fetchPendingPackages = async () => {
    try {
      const res: any = await packageService.getMyPendingPackages(1, 100)
      const items = res?.result?.data || res?.data || []
      setPackages(items.map((p: any) => ({ id: p.packageId ?? p.id, title: p.title })))
    } catch (e) { console.warn(e) }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  const handleSubmit = () => {
    // Deprecated single-step submit. Now handled in step flow.
    // Keep for backward compatibility but route to first step validation.
    if (!form.title || selectedIds.length === 0 || !form.startLocation || !form.endLocation) {
      return Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin bắt buộc (*)')
    }
    // Move to terms/consent step
    handleNext()
  }

  // Move from form (step1) to terms (step2): validate & fetch contract template
  const handleNext = async () => {
    // basic validation
    if (!form.title || selectedIds.length === 0 || !form.startLocation || !form.endLocation) {
      return Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin bắt buộc (*)')
    }
    setLoading(true)
    try {
      // Create post on server with AWAITING_SIGNATURE status so we have a valid PostId (GUID)
      const createDto = {
        Title: form.title,
        Description: form.description,
        OfferedPrice: Number(form.offeredPrice) || 0,
        ShippingRoute: {
          StartLocation: form.startLocation,
          EndLocation: form.endLocation,
          ExpectedPickupDate: form.pickupDate ? new Date(form.pickupDate).toISOString() : null,
          ExpectedDeliveryDate: form.deliveryDate ? new Date(form.deliveryDate).toISOString() : null,
        },
        SenderContact: { FullName: form.senderName, PhoneNumber: form.senderPhone, Email: form.senderEmail, Note: form.senderNote ? form.senderNote : null },
        ReceiverContact: { FullName: form.receiverName, PhoneNumber: form.receiverPhone, Email: form.receiverEmail, Note: form.receiverNote ? form.receiverNote : null },
        PackageIds: selectedIds,
        Status: 'AWAITING_SIGNATURE'
      }

      // Geocode locations to ensure we have coordinates
      const startLoc = await postPackageService.ensureLocationCoordinates({
        address: form.startLocation,
        latitude: null,
        longitude: null
      })

      const endLoc = await postPackageService.ensureLocationCoordinates({
        address: form.endLocation,
        latitude: null,
        longitude: null
      })

      // Use postPackageService for creating with Location object (with coordinates)
      const shippingRouteDto = {
        startLocation: startLoc,
        endLocation: endLoc,
        expectedPickupDate: form.pickupDate ? new Date(form.pickupDate).toISOString() : new Date().toISOString(),
        expectedDeliveryDate: form.deliveryDate ? new Date(form.deliveryDate).toISOString() : new Date().toISOString()
      }

      const createDtoNew = {
        title: form.title,
        description: form.description,
        offeredPrice: Number(form.offeredPrice) || 0,
        shippingRoute: shippingRouteDto,
        senderContact: {
          fullName: form.senderName,
          phoneNumber: form.senderPhone,
          email: form.senderEmail || undefined,
          address: form.startLocation
        },
        receiverContact: {
          fullName: form.receiverName,
          phoneNumber: form.receiverPhone,
          email: form.receiverEmail || undefined,
          address: form.endLocation
        },
        packageIds: selectedIds,
        status: 'OPEN' as const
      }

      const createResp: any = await postPackageService.createProviderPostPackage(createDtoNew)
      const okCreate = createResp?.isSuccess ?? (createResp?.statusCode === 201 || createResp?.statusCode === 200)
      if (!okCreate) {
        throw new Error(createResp?.message || 'Không thể tạo bài đăng')
      }
      const postId = createResp?.result?.PostPackageId || createResp?.result?.postPackageId || createResp?.result?.id
      setCreatedPostId(postId || null)

      // Fetch contract template if available
      try {
        const resp: any = await contractTemplateService.getLatestProviderContract()
        const tpl = resp?.result ?? resp
        setContractTemplate(tpl ?? null)
      } catch (e) {
        console.warn('contract fetch failed', e)
        setContractTemplate(null)
      }
      setAcceptedTerms(false)
      setStep(2)
    } catch (e: any) {
      console.warn('fetch template error', e)
      Alert.alert('Lỗi', 'Không thể lấy mẫu hợp đồng. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
    else onClose()
  }


  // Final confirmation — do not call server. Inform parent with a local postId so parent treats it as created without extra API call.
  const handleConfirmAndPost = async () => {
    setLoading(true)
    try {
      await Promise.resolve(onCreated({ postId: createdPostId }))
      // Move to success step
      setStep(4)
    } catch (e) {
      console.warn('confirm local create failed', e)
      Alert.alert('Lỗi', 'Không thể hoàn tất thao tác. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  // whether the form has the minimum required fields to proceed from step 1
  const canProceed = (() => {
    if (loading || isCalculating) return false
    if (!form.title.trim() || selectedIds.length === 0) return false
    if (!form.startLocation.trim() || !form.endLocation.trim()) return false
    if (!form.pickupDate || !form.deliveryDate) return false
    
    // PHẢI có route validation và isValid === true mới được tiếp tục
    if (!routeValidation) return false
    if (routeValidation.isValid === false) return false
    
    // Kiểm tra delivery date validation
    const deliveryValidation = getDeliveryDateValidation()
    if (deliveryValidation && !deliveryValidation.isValid) return false
    
    return true
  })()

  if (!visible) return null

  return (
    <View style={[styles.container, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }]}> 
      {/* Using full-screen absolute container instead of native Modal */}
      <View style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{step === 1 ? 'Tạo Bài Đăng Mới' : step === 2 ? 'Xem Điều Khoản Hợp Đồng' : step === 3 ? 'Thanh Toán' : 'Hoàn Thành'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Step progress indicator */}
        <StepIndicator step={step} />

        {/* Content by step */}
        {step === 1 && (
          <>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Thông tin chung</Text>
            <InputField label="Tiêu đề bài đăng" value={form.title} onChange={(v: string) => handleChange('title', v)} placeholder="Ví dụ: Vận chuyển lô hàng điện tử..." required />
            <InputField label="Mô tả chi tiết" value={form.description} onChange={(v: string) => handleChange('description', v)} placeholder="Ghi chú..." multiline />
            <InputField label="Giá đề xuất (VNĐ)" value={formatVND(form.offeredPrice)} onChange={(v: string) => handleChange('offeredPrice', digitsOnly(v))} placeholder="500000" keyboardType="numeric" />

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Lộ trình vận chuyển</Text>
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Điểm lấy hàng <Text style={{color: COLORS.danger}}>*</Text></Text>
              <AddressAutocomplete value={form.startLocation} onSelect={(s: any) => handleChange('startLocation', s.display || s.name)} placeholder="Địa chỉ lấy hàng" />
            </View>
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Điểm giao hàng <Text style={{color: COLORS.danger}}>*</Text></Text>
              <AddressAutocomplete value={form.endLocation} onSelect={(s: any) => handleChange('endLocation', s.display || s.name)} placeholder="Địa chỉ giao hàng" />
            </View>
            <View style={styles.row}>
              <View style={{ width: '48%' }}>
                <DateInput label="Ngày lấy" value={form.pickupDate || ''} onChange={(d) => handleChange('pickupDate', d ?? '')} />
              </View>
              <View style={{ width: '48%' }}>
                <DateInput label="Ngày giao" value={form.deliveryDate || ''} onChange={(d) => handleChange('deliveryDate', d ?? '')} />
              </View>
            </View>
            
            {/* Hint: Cần nhập đủ ngày lấy và ngày giao */}
            {(!form.pickupDate || !form.deliveryDate) && (form.startLocation && form.endLocation) && (
              <View style={{ backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, marginTop: 8, borderLeftWidth: 3, borderLeftColor: COLORS.primary }}>
                <Text style={{ fontSize: 13, color: '#1E40AF' }}>
                  💡 Vui lòng nhập cả Ngày lấy và Ngày giao để tính toán lộ trình
                </Text>
              </View>
            )}

            {/* Route Validation Display */}
            {isCalculating && (
              <View style={styles.validationBox}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.validationText}>Đang tính toán lộ trình...</Text>
              </View>
            )}

            {routeValidation && !isCalculating && (() => {
              const deliveryValidation = getDeliveryDateValidation()
              const finalIsValid = routeValidation.isValid && (!deliveryValidation || deliveryValidation.isValid)
              
              return (
                <View style={[
                  styles.validationBox,
                  routeValidation.isValid ? styles.validationSuccess : styles.validationWarning
                ]}>
                  <MaterialCommunityIcons 
                    name={routeValidation.isValid ? "check-circle" : "alert-circle"} 
                    size={20} 
                    color={routeValidation.isValid ? '#10B981' : '#F59E0B'} 
                  />
                  <View style={styles.validationContent}>
                    {/* Ngày lấy và ngày giao - CHỈ HIỆN NGÀY */}
                    {form.pickupDate && (
                      <Text style={styles.validationSubtext}>
                        🚚 Ngày lấy: {new Date(form.pickupDate).toLocaleDateString('vi-VN', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric'
                        })}
                      </Text>
                    )}
                    
                    {form.deliveryDate && (
                      <Text style={styles.validationSubtext}>
                        📦 Ngày giao: {new Date(form.deliveryDate).toLocaleDateString('vi-VN', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric'
                        })}
                      </Text>
                    )}
                    
                    {/* Message từ backend */}
                    {routeValidation.message && (
                      <Text style={[
                        styles.validationSubtext, 
                        { 
                          color: routeValidation.isValid ? '#059669' : '#D97706', 
                          marginTop: 6,
                          fontWeight: '600'
                        }
                      ]}>
                        {routeValidation.message}
                      </Text>
                    )}
                    
                    {/* Thông tin quãng đường */}
                    {routeValidation.distanceKm != null && (
                      <Text style={styles.validationSubtext}>
                        📍 Quãng đường: {routeValidation.distanceKm.toFixed(2)} km
                      </Text>
                    )}
                    
                    {/* Thời gian hoàn thành */}
                    {routeValidation.estimatedDurationHours != null && (
                      <Text style={styles.validationSubtext}>
                        ⏱️ Thời gian hoàn thành: {routeValidation.estimatedDurationHours.toFixed(1)} giờ
                      </Text>
                    )}
                    
                    {/* Ngày gợi ý từ backend - CHỈ HIỆN NGÀY */}
                    {routeValidation.suggestedMinDeliveryDate && (
                      <Text style={styles.validationSubtext}>
                        💡 Ngày giao gợi ý: {new Date(routeValidation.suggestedMinDeliveryDate).toLocaleDateString('vi-VN', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric'
                        })}
                      </Text>
                    )}
                  </View>
                </View>
              )
            })()}

            {validationError && !routeValidation && (
              <View style={styles.errorBox}>
                <Ionicons name="warning" size={20} color={COLORS.danger} />
                <Text style={styles.errorText}>{validationError}</Text>
              </View>
            )}

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
            <View style={styles.row}>
              <InputField label="Tên người gửi" width="48%" value={form.senderName} onChange={(v: string) => handleChange('senderName', v)} placeholder="Nguyễn Văn A" />
              <InputField label="SĐT người gửi" width="48%" value={form.senderPhone} onChange={(v: string) => handleChange('senderPhone', v)} placeholder="090..." keyboardType="phone-pad" />
            </View>
            <View style={styles.row}>
              <InputField label="Email người gửi" width="48%" value={form.senderEmail} onChange={(v: string) => handleChange('senderEmail', v)} placeholder="example@mail.com" />
              <InputField label="Ghi chú (người gửi)" width="48%" value={form.senderNote} onChange={(v: string) => handleChange('senderNote', v)} placeholder="Note (tuỳ chọn)" />
            </View>
            <View style={styles.row}>
              <InputField label="Tên người nhận" width="48%" value={form.receiverName} onChange={(v: string) => handleChange('receiverName', v)} placeholder="Trần Thị B" />
              <InputField label="SĐT người nhận" width="48%" value={form.receiverPhone} onChange={(v: string) => handleChange('receiverPhone', v)} placeholder="091..." keyboardType="phone-pad" />
            </View>
            <View style={styles.row}>
              <InputField label="Email người nhận" width="48%" value={form.receiverEmail} onChange={(v: string) => handleChange('receiverEmail', v)} placeholder="example@mail.com" />
              <InputField label="Ghi chú (người nhận)" width="48%" value={form.receiverNote} onChange={(v: string) => handleChange('receiverNote', v)} placeholder="Note (tuỳ chọn)" />
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Chọn gói hàng (Bắt buộc)</Text>
            {packages.length === 0 ? (
              <Text style={styles.emptyText}>Không có gói hàng nào ở trạng thái chờ.</Text>
            ) : (
              <View style={styles.packageList}>
                {packages.map(p => {
                  const selected = selectedIds.includes(p.id)
                  return (
                    <TouchableOpacity key={p.id} style={[styles.pkgItem, selected && styles.pkgItemSelected]} onPress={() => toggleSelect(p.id)}>
                      <MaterialCommunityIcons name={selected ? "checkbox-marked" : "checkbox-blank-outline"} size={24} color={selected ? COLORS.primary : "#9CA3AF"} />
                      <Text style={[styles.pkgTitle, selected && { color: COLORS.primary, fontWeight: '600' }]}>{p.title}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose}><Text style={styles.btnCancelText}>Hủy</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btnSubmit, !canProceed && { backgroundColor: '#9CA3AF' }]} onPress={handleNext} disabled={!canProceed}><Text style={styles.btnSubmitText}>Tiếp Theo</Text></TouchableOpacity>
          </View>
          </>
        )}

        {step === 2 && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
            <Text style={styles.sectionTitle}>Mẫu hợp đồng (Phiên bản mới nhất)</Text>
            {loading && <ActivityIndicator />}
            {!loading && contractTemplate && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: '700' }}>{contractTemplate.contractTemplateName || 'Hợp đồng vận tải'}</Text>
                <Text style={{ color: '#6B7280', marginBottom: 8 }}>Phiên bản: {contractTemplate.version}</Text>
                <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  {(contractTemplate.contractTerms || []).map((t: any, idx: number) => (
                    <View key={t.contractTermId || idx} style={{ marginBottom: 8 }}>
                      <Text style={{ fontWeight: '700' }}>{t.order ?? idx + 1}.</Text>
                      <Text style={{ color: '#374151' }}>{t.content}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!contractTemplate && !loading && (
              <Text style={{ color: '#6B7280' }}>Không có mẫu hợp đồng từ server. Bạn vẫn cần đồng ý các điều khoản nội bộ.</Text>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <Pressable onPress={() => setAcceptedTerms(!acceptedTerms)} style={{ marginRight: 12 }}>
                <MaterialCommunityIcons name={acceptedTerms ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={acceptedTerms ? COLORS.primary : '#9CA3AF'} />
              </Pressable>
              <Text>Tôi đã đọc và đồng ý với các điều khoản hợp đồng</Text>
            </View>

            <View style={{ height: 20 }} />
            <View style={styles.footer}>
              <TouchableOpacity style={styles.btnCancel} onPress={handleBack}><Text style={styles.btnCancelText}>Quay Lại</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btnSubmit, !acceptedTerms && { backgroundColor: '#9CA3AF' }]} disabled={!acceptedTerms} onPress={async () => {
                if (!createdPostId) {
                  Alert.alert('Lỗi', 'Không tìm thấy Post ID. Vui lòng quay lại và thử lại.')
                  return
                }
                // Update post status to AWAITING_PAYMENT on server, then fetch wallet and compare balance
                setLoading(true)
                try {
                  const upd: any = await postPackageService.updatePostStatus(createdPostId as string, 'AWAITING_PAYMENT')
                  const ok = upd?.isSuccess ?? (upd?.statusCode === 200)
                  if (!ok) throw new Error(upd?.message || 'Không thể cập nhật trạng thái bài đăng')

                  const w: any = await walletService.getMyWallet()
                  const myw = w?.result ?? w
                  setWallet(myw)
                  const balance = Number(myw?.balance ?? myw?.Balance ?? 0) || 0
                  const amount = Number(form.offeredPrice) || 0
                  setSufficientBalance(balance >= amount)
                } catch (e: any) {
                  console.warn('wallet/status error', e)
                  Alert.alert('Lỗi', e?.message || 'Không thể tiếp tục')
                  setWallet(null)
                  setSufficientBalance(null)
                } finally {
                  setLoading(false)
                }
                // advance to payment step (UI will indicate sufficiency)
                setStep(3)
              }}>
                <Text style={styles.btnSubmitText}>Đồng ý & Tiếp Tục</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.sectionTitle}>Thanh toán</Text>
            <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <Text style={{ fontWeight: '700', fontSize: 16 }}>Tổng cần thanh toán</Text>
              <Text style={{ marginTop: 8, fontSize: 20, fontWeight: '800' }}>{formatVND(form.offeredPrice)} VND</Text>
              <Text style={{ color: '#6B7280', marginTop: 8 }}>Phương thức: Ví nội bộ</Text>
              <View style={{ height: 8 }} />
              <Text style={{ color: '#6B7280' }}>Số dư ví của bạn: {wallet ? (Number(wallet.balance ?? wallet.Balance ?? 0)).toLocaleString('vi-VN') + ' VND' : '—'}</Text>
              {sufficientBalance === true && <Text style={{ color: '#059669', marginTop: 6 }}>Số dư đủ để thanh toán.</Text>}
              {sufficientBalance === false && <Text style={{ color: COLORS.danger, marginTop: 6 }}>Số dư không đủ. Vui lòng nạp thêm.</Text>}
            </View>
            <View style={{ height: 20 }} />
            <View style={styles.footer}>
              <TouchableOpacity style={styles.btnCancel} onPress={handleBack}><Text style={styles.btnCancelText}>Quay Lại</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btnSubmit, sufficientBalance === false && { backgroundColor: '#9CA3AF' }]} onPress={async () => {
                if (!createdPostId) { Alert.alert('Lỗi', 'Không tìm thấy Post ID'); return }
                setPaymentLoading(true)
                try {
                  const amount = Number(form.offeredPrice) || 0
                  const dto = { amount, type: 'POST_PAYMENT', tripId: null, postId: createdPostId, description: `Thanh toán bài đăng ${createdPostId}` }
                  const payResp: any = await walletService.createPayment(dto)
                  const ok = payResp?.isSuccess ?? (payResp?.statusCode === 200 || payResp?.statusCode === 201)
                  if (!ok) throw new Error(payResp?.message || 'Thanh toán thất bại')
                  Alert.alert('Thành công', 'Thanh toán thành công.')
                  // Notify parent that post is 'created'
                  try { await Promise.resolve(onCreated({ postId: createdPostId })) } catch {}
                  setStep(4)
                } catch (err: any) {
                  Alert.alert('Lỗi thanh toán', err?.message || 'Không thể thực hiện thanh toán')
                } finally {
                  setPaymentLoading(false)
                }
              }} disabled={paymentLoading || sufficientBalance === false}>
                {paymentLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSubmitText}>Thanh toán & Hoàn tất</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Step 4: Success confirmation */}
        {step === 4 && (
          <View style={[styles.body, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 12 }}>Tạo bài đăng thành công</Text>
            <Text style={{ color: '#6B7280', marginBottom: 24 }}>Bài đăng của bạn đã được tạo (giả lập). Quay về danh sách để xem.</Text>
            <View style={{ flexDirection: 'row', width: '100%' }}>
              <TouchableOpacity style={[styles.btnCancel, { flex: 1 }]} onPress={() => { onClose(); }}>{/* close */}
                <Text style={styles.btnCancelText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSubmit, { flex: 1 }]} onPress={() => { onClose(); }}>
                <Text style={styles.btnSubmitText}>Về danh sách</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', marginTop: 40 }, // marginTop 40 cho status bar
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: { padding: 4 },
  body: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F3F4F6' },
  stepDot: { width: 10, height: 10, borderRadius: 6, backgroundColor: '#E5E7EB', marginHorizontal: 6 },
  stepDotActive: { backgroundColor: COLORS.primary, width: 14, height: 14, borderRadius: 8 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  
  // Package List
  packageList: { backgroundColor: '#fff', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  pkgItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pkgItemSelected: { backgroundColor: '#F0F9FF' },
  pkgTitle: { marginLeft: 12, fontSize: 14, color: '#374151' },
  emptyText: { color: '#6B7280', fontSize: 13, fontStyle: 'italic' },

  footer: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB' },
  btnCancel: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  btnCancelText: { fontWeight: '600', color: '#374151' },
  btnSubmit: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center' },
  btnSubmitText: { fontWeight: '600', color: '#fff' }
  ,
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12 },
  actionBtnSecondary: { padding: 10, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  actionBtnPrimary: { padding: 10, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  actionBtnTextSec: { fontWeight: '600', color: '#374151' },
  actionBtnTextPri: { fontWeight: '600', color: '#fff' },
  
  // Validation styles
  validationBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginVertical: 8, backgroundColor: '#F0F9FF' },
  validationSuccess: { backgroundColor: '#ECFDF5', borderLeftWidth: 4, borderLeftColor: '#10B981' },
  validationWarning: { backgroundColor: '#FEF3C7', borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  validationContent: { marginLeft: 8, flex: 1 },
  validationText: { marginLeft: 8, fontSize: 13, color: '#6B7280' },
  validationTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  validationSubtext: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: '#FEE2E2', borderLeftWidth: 4, borderLeftColor: COLORS.danger, marginVertical: 8 },
  errorText: { marginLeft: 8, fontSize: 13, color: COLORS.danger, flex: 1 }
})

export default PostFormModal