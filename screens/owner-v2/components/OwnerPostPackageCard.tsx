// import React from 'react'
// import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
// import { FreightPost } from '@/models/types'
// import { MapPinIcon, ArrowLongRightIcon, CalendarDaysIcon, EyeIcon, CheckIcon } from '@/screens/provider-v2/icons/ActionIcons'

// interface Props {
//   post: FreightPost
//   onView?: (postId: string) => void
//   onAccept?: (postId: string) => void
// }

// const formatDate = (dateString: string) => {
//   if (!dateString) return 'N/A'
//   try { return new Date(dateString).toLocaleDateString('vi-VN') } catch { return 'Invalid' }
// }

// const OwnerPostPackageCard: React.FC<Props> = ({ post, onView, onAccept }) => {
//   return (
//     <View style={styles.card}>
// <View style={styles.rowTop}>
// <View style={{ flex: 1 }}>
// <Text style={styles.title}>{post.title}</Text>
// <Text style={styles.sub}>{post.packageDetails?.title ?? ''}</Text>
// </View>
// <View style={styles.priceWrap}>
// <Text style={styles.price}>{new Intl.NumberFormat('vi-VN').format(post.offeredPrice)} VND</Text>
// </View>
// </View>
// <View style={styles.infoRow}>
// <MapPinIcon style={styles.icon} />
// <Text style={styles.infoText}>Từ: {post.shippingRoute?.startLocation}</Text>
// </View>
// <View style={styles.infoRow}>
// <ArrowLongRightIcon style={styles.icon} />
// <Text style={styles.infoText}>Đến: {post.shippingRoute?.endLocation}</Text>
// </View>
// <View style={styles.infoRow}>
// <CalendarDaysIcon style={styles.icon} />
// <Text style={styles.infoText}>Nhận: {formatDate(post.shippingRoute?.expectedPickupDate)} | Giao: {formatDate(post.shippingRoute?.expectedDeliveryDate)}</Text>
// </View>
// <View style={styles.actions}>
// <TouchableOpacity onPress={() => onView?.(post.id)} style={styles.actionBtn}>
// <EyeIcon style={{ width: 18, height: 18, color: '#4F46E5' }} />
// </TouchableOpacity>
// <TouchableOpacity onPress={() => onAccept?.(post.id)} style={[styles.actionBtn, { backgroundColor: '#ECFDF5' }]}>
// <CheckIcon style={{ width: 18, height: 18, color: '#059669' }} />
// </TouchableOpacity>
// </View>
// </View>
//   )
// }

// const styles = StyleSheet.create({
//   card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F3F4F6' },
//   rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
//   title: { fontSize: 16, fontWeight: '700' },
//   sub: { color: '#6B7280' },
//   priceWrap: { marginLeft: 12 },
//   price: { fontWeight: '700', color: '#4F46E5' },
//   infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
//   icon: { width: 16, height: 16, color: '#6B7280' },
//   infoText: { color: '#374151', flex: 1 },
//   actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 8 },
//   actionBtn: { padding: 8, borderRadius: 8, backgroundColor: '#EEF2FF' },
// })

// export default OwnerPostPackageCard


import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons'
import { FreightPost } from '@/models/types'
import OwnerPostDetailModal from './OwnerPostDetailModal'

interface Props {
  post: FreightPost
  onView?: (postId: string) => void
  onAccept?: (postId: string) => void
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  try { return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) } 
  catch { return 'Invalid' }
}

// Màu sắc chủ đạo
const COLORS = {
  primary: '#0284C7',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  bg: '#FFFFFF',
  success: '#10B981',
  danger: '#EF4444',
}

const OwnerPostPackageCard: React.FC<Props> = ({ post, onView, onAccept }) => {
  const [detailVisible, setDetailVisible] = useState(false)
  return (
    <>
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => setDetailVisible(true)}
      activeOpacity={0.9}
    >
      {/* HEADER: Title & Price */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{post.title}</Text>
          <Text style={styles.subTitle}>{post.packageDetails?.title ?? 'Gói hàng'}</Text>
        </View>
        <View>
          <Text style={styles.price}>{new Intl.NumberFormat('vi-VN').format(post.offeredPrice)} đ</Text>
          <View style={[styles.statusBadge, { backgroundColor: '#ECFDF5', alignSelf: 'flex-end', marginTop: 4 }]}>
             <Text style={{ fontSize: 10, color: '#059669', fontWeight: '700' }}>OPEN</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* ROUTE INFO */}
      <View style={styles.routeContainer}>
        {/* From */}
        <View style={styles.routeRow}>
          <MaterialCommunityIcons name="circle-slice-8" size={16} color={COLORS.primary} />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={styles.routeLabel}>Điểm đi ({formatDate(post.shippingRoute?.expectedPickupDate)})</Text>
            <Text style={styles.routeText} numberOfLines={1}>{post.shippingRoute?.startLocation}</Text>
          </View>
        </View>
        
        {/* Line */}
        <View style={styles.connector}>
          <View style={styles.dashedLine} />
        </View>

        {/* To */}
        <View style={styles.routeRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.danger} />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={styles.routeLabel}>Điểm đến ({formatDate(post.shippingRoute?.expectedDeliveryDate)})</Text>
            <Text style={styles.routeText} numberOfLines={1}>{post.shippingRoute?.endLocation}</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* FOOTER ACTIONS */}
      <View style={styles.footer}>
        <View style={styles.metaInfo}>
           <Feather name="package" size={14} color={COLORS.textLight} />
           <Text style={styles.metaText}>{post.packageDetails?.quantity || 1} kiện</Text>
        </View>

              <View style={styles.actions}>
                <TouchableOpacity onPress={() => { setDetailVisible(true) }} style={styles.iconBtn}>
                  <Feather name="eye" size={18} color={COLORS.primary} />
                </TouchableOpacity>

                {/* Nút Accept (nếu cần) - gọi callback và hiển thị lỗi nếu server trả về isSuccess=false */}
                {onAccept && (
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        const res: any = await onAccept(post.id as string)
                        // Nếu callback trả về object với isSuccess false, show message
                        if (res && res.isSuccess === false) {
                          const msg = res.message ?? 'Không thể nhận chuyến.'
                          Alert.alert('Lỗi khi nhận chuyến', msg)
                        }
                      } catch (e: any) {
                        Alert.alert('Lỗi', e?.message ?? 'Có lỗi xảy ra khi nhận chuyến')
                      }
                    }}
                    style={[styles.iconBtn, { backgroundColor: '#ECFDF5' }]}
                  >
                    <Feather name="check" size={18} color={COLORS.success} />
                  </TouchableOpacity>
                )}
              </View>
      </View>
    </TouchableOpacity>
    <OwnerPostDetailModal visible={detailVisible} postId={post.id} onClose={() => setDetailVisible(false)} />
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 4, // Tạo khoảng cách nhỏ 2 bên để shadow đẹp hơn
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  subTitle: { fontSize: 13, color: COLORS.textLight },
  price: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },

  routeContainer: { gap: 0 },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  routeText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  connector: { marginLeft: 7, height: 16, borderLeftWidth: 1, borderLeftColor: COLORS.border, borderStyle: 'dashed', marginVertical: 2 },
  dashedLine: { width: 1, height: '100%' },

  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  metaInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: COLORS.textLight },
  
  actions: { flexDirection: 'row', gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F9FF', alignItems: 'center', justifyContent: 'center' },
})

export default OwnerPostPackageCard