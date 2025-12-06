import React, { useEffect, useState } from 'react'
import {
  Modal, View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, ScrollView, Image, Linking, Alert
} from 'react-native'
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons'
import postPackageService from '@/services/postPackageService'

interface Props {
  visible: boolean
  postId?: string | null
  onClose: () => void
  onAccept?: (postId: string) => void
  onRefresh?: () => void
}

const COLORS = {
  primary: '#0284C7',
  bg: '#F3F4F6',
  white: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  blue: '#3B82F6',
  senderBg: '#EFF6FF',
  receiverBg: '#FFF7ED',
  purple: '#7C3AED',
  driverBg: '#F0FDF4' // Màu nền nhẹ cho card tài xế
}

const OwnerPostDetailModal: React.FC<Props> = ({ visible, postId, onClose, onAccept, onRefresh }) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (visible && postId) fetchDetails()
    else setData(null)
  }, [visible, postId])

  const fetchDetails = async () => {
    setLoading(true)
    try {
      const res: any = await postPackageService.getPostPackageDetails(postId!)
      setData(res?.result ?? res)
    } catch (e) {
      console.warn('Fetch detail error', e)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '---'
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return '---' }
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

  const handleCall = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`)
  }

  const handleAccept = async () => {
    if (!postId || !onAccept) return
    
    setAccepting(true)
    try {
      const res: any = await onAccept(postId)
      // Nếu callback trả về object với isSuccess false, show message
      if (res && res.isSuccess === false) {
        const msg = res.message ?? 'Không thể nhận chuyến.'
        Alert.alert('Lỗi khi nhận chuyến', msg)
      } else {
        // Thành công - refresh và đóng modal
        Alert.alert('Thành công', 'Đã nhận chuyến thành công!', [
          { 
            text: 'OK', 
            onPress: () => {
              onRefresh?.()
              onClose()
            }
          }
        ])
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Có lỗi xảy ra khi nhận chuyến')
    } finally {
      setAccepting(false)
    }
  }

  const renderScenario = (label: string, scenarioData: any) => {
    if (!scenarioData) return null
    const isPossible = scenarioData.isPossible
    return (
      <View style={[styles.scenarioBox, isPossible ? styles.scenarioOk : styles.scenarioFail]}>
        <View style={{flexDirection:'row', justifyContent:'space-between'}}>
            <Text style={styles.scenarioLabel}>{label}</Text>
            {isPossible ? <Ionicons name="checkmark-circle" size={16} color={COLORS.success} /> : <Ionicons name="close-circle" size={16} color={COLORS.danger} />}
        </View>
        <Text style={styles.scenarioMsg}>{scenarioData.message}</Text>
        <Text style={styles.scenarioTime}>⏱ {scenarioData.totalHoursNeeded}h • {scenarioData.workHoursPerDriver}h/tài</Text>
      </View>
    )
  }

  const renderContent = () => {
    if (loading) return <View style={styles.centerBox}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={{marginTop: 8, color: COLORS.textLight}}>Đang tải dữ liệu...</Text></View>
    if (!data) return <View style={styles.centerBox}><Text style={styles.emptyText}>Không tải được dữ liệu.</Text></View>

    const route = data.shippingRoute || {}
    const provider = data.provider
    const suggest = data.driverSuggestion
    const sender = data.postContacts?.find((c: any) => c.type === 'SENDER')
    const receiver = data.postContacts?.find((c: any) => c.type === 'RECEIVER')
    const myDrivers = data.myDrivers || [] // Lấy danh sách tài xế

    return (
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        
        {/* --- 1. HEADER & PRICE --- */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.postTitle}>{data.title}</Text>
              <Text style={styles.postDate}>{formatDate(data.created)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: data.status === 'OPEN' ? '#DBEAFE' : '#ECFDF5' }]}>
              <Text style={[styles.statusText, { color: data.status === 'OPEN' ? COLORS.blue : COLORS.success }]}>{data.status}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={{flexDirection: 'row', justifyContent:'space-between', alignItems:'flex-end'}}>
            <View>
                <Text style={styles.priceLabel}>Giá đề xuất</Text>
                <Text style={styles.priceValue}>{formatCurrency(data.offeredPrice)}</Text>
            </View>
            {provider && (
                <View style={{alignItems:'flex-end'}}>
                    <Text style={styles.priceLabel}>Đơn vị vận chuyển</Text>
                    <Text style={{fontWeight:'700', color: COLORS.text}}>{provider.fullName}</Text>
                </View>
            )}
          </View>

          {data.description ? <View style={styles.descBox}><Text style={styles.desc}>{data.description}</Text></View> : null}
        </View>

        

        {/* --- 3. LỘ TRÌNH & PHÂN TÍCH --- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📍 Lộ Trình & Phân Tích</Text>
          
          <View style={styles.routeContainer}>
            {/* Start */}
            <View style={styles.routeRow}>
              <MaterialCommunityIcons name="circle-slice-8" size={20} color={COLORS.primary} />
              <View style={styles.routeContent}>
                <Text style={styles.routeLabel}>Điểm đi ({formatDate(route.expectedPickupDate)})</Text>
                <Text style={styles.routeAddress}>{route.startLocation?.address}</Text>
              </View>
            </View>

            <View style={styles.routeLine} />

            {/* End */}
            <View style={styles.routeRow}>
              <MaterialCommunityIcons name="map-marker" size={20} color={COLORS.danger} />
              <View style={styles.routeContent}>
                <Text style={styles.routeLabel}>Điểm đến ({formatDate(route.expectedDeliveryDate)})</Text>
                <Text style={styles.routeAddress}>{route.endLocation?.address}</Text>
              </View>
            </View>
          </View>

          {suggest && (
             <View style={styles.aiContainer}>
                <View style={{flexDirection:'row', alignItems:'center', marginBottom: 8}}>
                    <MaterialCommunityIcons name="robot-outline" size={20} color={COLORS.purple} />
                    <Text style={styles.aiTitle}>Phân tích hành trình ({suggest.distanceKm} km)</Text>
                </View>
                <Text style={styles.aiRec}>{suggest.systemRecommendation}</Text>
                
                <View style={styles.scenarioGrid}>
                    {renderScenario("1 Tài xế", suggest.soloScenario)}
                    {renderScenario("2 Tài xế", suggest.teamScenario)}
                    {renderScenario("Express", suggest.expressScenario)}
                </View>
             </View>
          )}
        </View>

        {/* --- 2. TÀI XẾ THỰC HIỆN (MY DRIVERS) - MỚI THÊM --- */}
        {myDrivers.length > 0 && (
          <View style={styles.card}>
             <View style={styles.cardHeader}>
                
                <Text style={styles.sectionTitle}>Đội Ngũ Tài Xế Hiện Tại ({myDrivers.length})</Text>
             </View>

             {myDrivers.map((driver: any, index: number) => (
               <View key={index} style={[styles.driverCard, index < myDrivers.length - 1 && {marginBottom: 10}]}>
                  {/* Avatar Area */}
                  <View style={styles.avatarContainer}>
                     {driver.avatarUrl ? (
                        <Image source={{ uri: driver.avatarUrl }} style={styles.avatarImg} />
                     ) : (
                        <View style={[styles.avatarImg, { backgroundColor: '#E0E7FF', alignItems:'center', justifyContent:'center' }]}>
                           <Text style={{color: '#4F46E5', fontWeight:'700', fontSize: 16}}>{driver.fullName?.charAt(0)}</Text>
                        </View>
                     )}
                     {/* Online/Offline Dot */}
                     <View style={[styles.statusDot, { backgroundColor: driver.isAvailable ? COLORS.success : COLORS.textLight }]} />
                  </View>

                  {/* Info Area */}
                  <View style={{ flex: 1, paddingHorizontal: 12 }}>
                     <Text style={styles.driverName}>{driver.fullName}</Text>
                     <View style={{flexDirection:'row', alignItems:'center', marginBottom: 4}}>
                        <Text style={[styles.driverStatusText, { color: driver.isAvailable ? COLORS.success : COLORS.textLight }]}>
                           ● {driver.statusMessage || (driver.isAvailable ? 'Sẵn sàng' : 'Không sẵn sàng')}
                        </Text>
                     </View>
                     {/* Stats */}
                     <View style={styles.statsBadge}>
                        <MaterialCommunityIcons name="clock-time-four-outline" size={12} color={COLORS.textLight} style={{marginRight:4}}/>
                        <Text style={styles.statsText}>{driver.stats}</Text>
                     </View>
                  </View>

                  {/* Call Button */}
                  <TouchableOpacity onPress={() => handleCall(driver.phoneNumber)} style={styles.callBtnCircle}>
                     <Ionicons name="call" size={18} color={COLORS.white} />
                  </TouchableOpacity>
               </View>
             ))}
          </View>
        )}

        {/* --- 4. GÓI HÀNG --- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="package" size={20} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Thông Tin Hàng Hóa</Text>
          </View>

          {(data.packages || []).map((pkg: any, index: number) => {
             const allImages = [...(pkg.packageImages || []), ...(pkg.item?.imageUrls || [])];
             return (
                <View key={index} style={styles.packageItem}>
                <View style={styles.pkgHeader}>
                    <Text style={styles.pkgTitle}>{pkg.title}</Text>
                    <Text style={styles.pkgCode}>{pkg.packageCode}</Text>
                </View>
                
                <View style={styles.specRow}>
                    <Text style={styles.specText}>⚖️ {pkg.weightKg} kg</Text>
                    <Text style={styles.specText}>📦 {pkg.volumeM3} m³</Text>
                    <Text style={styles.specText}>🏷️ {pkg.status}</Text>
                </View>

                {pkg.item && (
                    <View style={styles.itemMeta}>
                        <Text style={styles.itemName}>{pkg.item.itemName}</Text>
                        <Text style={styles.itemDesc}>{pkg.item.description}</Text>
                        <Text style={styles.itemVal}>Giá trị: {formatCurrency(pkg.item.declaredValue)}</Text>
                    </View>
                )}

                {allImages.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 8}}>
                        {allImages.map((img: any, i: number) => (
                            <Image key={i} source={{ uri: img.imageUrl }} style={styles.galleryImg} />
                        ))}
                    </ScrollView>
                )}
                </View>
             )
          })}
        </View>

        {/* --- 5. LIÊN HỆ --- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📞 Danh Bạ Liên Hệ</Text>
          
          <View style={[styles.contactRow, { backgroundColor: COLORS.senderBg }]}>
            <View style={styles.roleBox}><Text style={[styles.roleText, {color: COLORS.primary}]}>GỬI</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactName}>{sender?.fullName}</Text>
              <Text style={styles.contactPhone}>{sender?.phoneNumber}</Text>
            </View>
            <TouchableOpacity onPress={() => handleCall(sender?.phoneNumber)} style={styles.miniCallBtn}>
                <Ionicons name="call-outline" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.contactRow, { backgroundColor: COLORS.receiverBg, marginTop: 8 }]}>
             <View style={[styles.roleBox, {borderColor: '#F97316'}]}><Text style={[styles.roleText, {color: '#F97316'}]}>NHẬN</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactName}>{receiver?.fullName}</Text>
              <Text style={styles.contactPhone}>{receiver?.phoneNumber}</Text>
            </View>
            <TouchableOpacity onPress={() => handleCall(receiver?.phoneNumber)} style={[styles.miniCallBtn, {borderColor:'#F97316'}]}>
                <Ionicons name="call-outline" size={16} color={'#F97316'} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    )
  }

  if (!visible) return null

  return (
    <View style={[styles.fullScreenOverlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi Tiết Đơn Hàng</Text>
          <View style={{ width: 32 }} />
        </View>
        {renderContent()}
        
        {/* BOTTOM BAR - Accept Button */}
        {onAccept && data && (
          <View style={styles.bottomBar}>
            <TouchableOpacity 
              style={[styles.acceptBtn, accepting && styles.acceptBtnDisabled]} 
              onPress={handleAccept}
              disabled={accepting}
            >
              {accepting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check-circle" size={20} color="#fff" />
                  <Text style={styles.acceptBtnText}>Nhận Chuyến</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fullScreenOverlay: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: COLORS.bg },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderColor: COLORS.border, paddingTop: 12 
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  closeBtn: { padding: 4 },
  body: { padding: 16 },
  emptyText: { textAlign: 'center', color: COLORS.textLight },

  // CARD
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  postTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  postDate: { fontSize: 12, color: COLORS.textLight },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: COLORS.bg, marginVertical: 12 },
  priceLabel: { fontSize: 12, color: COLORS.textLight },
  priceValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  descBox: { marginTop: 12, padding: 8, backgroundColor: '#F9FAFB', borderRadius: 8 },
  desc: { fontSize: 14, color: COLORS.text, fontStyle: 'italic' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },

  // ROUTE
  routeContainer: { paddingLeft: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start' },
  routeContent: { flex: 1, marginLeft: 12 },
  routeLabel: { fontSize: 12, color: COLORS.textLight, marginBottom: 2 },
  routeAddress: { fontSize: 14, fontWeight: '500', color: COLORS.text, lineHeight: 20 },
  routeLine: { marginLeft: 9, height: 20, borderLeftWidth: 2, borderColor: '#E5E7EB', marginVertical: 2 },

  // AI & DRIVERS
  aiContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderColor: COLORS.border },
  aiTitle: { fontSize: 14, fontWeight: '700', color: COLORS.purple, marginLeft: 6 },
  aiRec: { fontSize: 13, color: COLORS.text, marginBottom: 12, fontStyle:'italic' },
  scenarioGrid: { gap: 8 },
  scenarioBox: { padding: 8, borderRadius: 8, borderWidth: 1 },
  scenarioOk: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  scenarioFail: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', opacity: 0.7 },
  scenarioLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  scenarioMsg: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  scenarioTime: { fontSize: 11, fontWeight: '500', color: COLORS.text, marginTop: 4 },

  // DRIVER CARD STYLE
  driverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  avatarContainer: { position: 'relative' },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  statusDot: { width: 12, height: 12, borderRadius: 6, position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: '#fff' },
  driverName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  driverStatusText: { fontSize: 12, fontWeight: '600' },
  statsBadge: { flexDirection:'row', alignItems:'center', backgroundColor: '#E5E7EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  statsText: { fontSize: 11, color: COLORS.textLight },
  callBtnCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },

  // PACKAGES
  packageItem: { backgroundColor: '#fff', borderBottomWidth:1, borderColor: COLORS.bg, paddingBottom: 16, marginBottom: 16 },
  pkgHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  pkgTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  pkgCode: { fontSize: 12, color: COLORS.textLight },
  specRow: { flexDirection: 'row', flexWrap:'wrap', gap: 8, marginBottom: 8 },
  specText: { fontSize: 11, fontWeight: '600', color: COLORS.textLight, backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  itemMeta: { marginTop: 4 },
  itemName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  itemDesc: { fontSize: 12, color: COLORS.textLight },
  itemVal: { fontSize: 12, color: COLORS.success, fontWeight: '500', marginTop: 2 },
  galleryImg: { width: 80, height: 80, borderRadius: 8, marginRight: 8, backgroundColor: '#E5E7EB' },

  // CONTACT
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12 },
  roleBox: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginRight: 12 },
  roleText: { fontSize: 10, fontWeight: '800' },
  contactName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  contactPhone: { fontSize: 13, color: COLORS.textLight },
  miniCallBtn: { padding: 8, borderWidth:1, borderColor: COLORS.primary, borderRadius: 20 },
  
  // BOTTOM BAR
  bottomBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  acceptBtn: {
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  acceptBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})

export default OwnerPostDetailModal