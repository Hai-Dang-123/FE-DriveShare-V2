// import React, { useEffect, useState } from 'react'
// import {
//   Modal,
//   View,
//   Text,
//   StyleSheet,
//   SafeAreaView,
//   TouchableOpacity,
//   ActivityIndicator,
//   ScrollView,
//   Image,
// } from 'react-native'
// import postService from '@/services/postService'
// // import { XMarkIcon, MapPinIcon, CalendarDaysIcon, UserCircleIcon, PhoneIcon } from './icons/ActionIcons'

// // --- Icon Fallbacks (Xóa đi nếu bạn đã có file icon) ---
// // Thêm các icon này để đảm bảo code chạy được
// const XMarkIcon: React.FC<{ style?: any }> = ({ style }) => (
//   <Text style={[{ fontSize: 24, color: '#4B5563' }, style]}>✕</Text>
// )
// const MapPinIcon: React.FC<{ style?: any }> = ({ style }) => (
//   <Text style={[{ fontSize: 16, color: '#6B7280' }, style]}>📍</Text>
// )
// const CalendarDaysIcon: React.FC<{ style?: any }> = ({ style }) => (
//   <Text style={[{ fontSize: 16, color: '#6B7280' }, style]}>📅</Text>
// )
// const UserCircleIcon: React.FC<{ style?: any }> = ({ style }) => (
//   <Text style={[{ fontSize: 48, color: '#9CA3AF' }, style]}>👤</Text>
// )
// const PhoneIcon: React.FC<{ style?: any }> = ({ style }) => (
//   <Text style={[{ fontSize: 16, color: '#6B7280' }, style]}>📞</Text>
// )
// // --- Kết thúc Icon Fallbacks ---

// // Component tiêu đề cho mỗi Nhóm
// const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
//   <Text style={styles.sectionTitle}>{children}</Text>
// )

// // Component cho mỗi hàng thông tin (Label trái, Value phải)
// const InfoRow: React.FC<{ label: string; value?: string | null }> = ({
//   label,
//   value,
// }) => (
//   <View style={styles.infoRow}>
// <Text style={styles.label}>{label}</Text>
// <Text style={styles.value}>{value || 'N/A'}</Text>
// </View>
// )

// // Component cho hàng thông tin có Icon
// const IconInfoRow: React.FC<{ icon: React.ReactNode; text?: string | null }> = ({
//   icon,
//   text,
// }) => (
//   <View style={styles.iconInfoRow}>
// <View style={styles.iconContainer}>{icon}</View>
// <Text style={styles.iconInfoText}>{text || 'N/A'}</Text>
// </View>
// )

// // Component Badge cho Trạng thái
// const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
//   const S_OPEN = { bg: '#D1FAE5', text: '#065F46' } // Green
//   const S_IN_TRANSIT = { bg: '#DBEAFE', text: '#1E40AF' } // Blue
//   const S_COMPLETED = { bg: '#E5E7EB', text: '#374151' } // Gray
//   const S_CANCELLED = { bg: '#FEE2E2', text: '#991B1B' } // Red
//   const S_PENDING = { bg: '#FEF3C7', text: '#92400E' } // Amber

//   let style
//   switch (status?.toUpperCase()) {
//     case 'OPEN': style = S_OPEN; break
//     case 'IN_TRANSIT': style = S_IN_TRANSIT; break
//     case 'COMPLETED': style = S_COMPLETED; break
//     case 'CANCELLED': style = S_CANCELLED; break
//     default: style = S_PENDING; break
//   }

//   return (
//     <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
// <Text style={[styles.statusBadgeText, { color: style.text }]}>{status}</Text>
// </View>
//   )
// }

// interface Props {
//   visible: boolean
//   postId?: string | null
//   onClose: () => void
// }

// const formatCurrency = (value?: number | null) => {
//   if (value == null) return 'N/A'
//   return new Intl.NumberFormat('vi-VN', {
//     style: 'currency',
//     currency: 'VND',
//   }).format(value)
// }

// const formatDate = (dateString?: string | null) => {
//   if (!dateString) return 'N/A'
//   try {
//     const date = new Date(dateString)
//     return date.toLocaleDateString('vi-VN', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric',
//     }) + ' ' + date.toLocaleTimeString('vi-VN', {
//       hour: '2-digit',
//       minute: '2-digit'
//     })
//   } catch (e) {
//     return 'Ngày không hợp lệ'
//   }
// }

// const PostPackageDetailModal: React.FC<Props> = ({
//   visible,
//   postId,
//   onClose,
// }) => {
//   const [loading, setLoading] = useState(false)
//   const [data, setData] = useState<any | null>(null)

//   useEffect(() => {
//     if (visible && postId) fetchDetails()
//     if (!visible) setData(null)
//   }, [visible, postId])

//   const fetchDetails = async () => {
//     setLoading(true)
//     try {
//       const res: any = await postService.getPostPackageDetails(postId!)
//       // Sửa lỗi: Lấy 'result' chứ không phải 'result.data'
//       const detail = res?.result ?? res
//       setData(detail)
//     } catch (e) {
//       console.warn('fetchDetails failed', e)
//     } finally {
//       setLoading(false)
//     }
//   }

//   // Render các gói hàng (đã cập nhật)
//   const renderPackages = (packages: any[]) => {
//     if (!Array.isArray(packages) || packages.length === 0) {
//       return (
//         <View style={styles.card}>
// <Text style={styles.emptyText}>Không có gói hàng</Text>
// </View>
//       )
//     }
//     return packages.map((pkg) => (
//       <View key={pkg.packageId ?? pkg.id} style={styles.card}>
// <View style={styles.pkgHeader}>
// <Text style={styles.pkgTitle}>{pkg.title ?? 'Gói hàng'}</Text>
// <Text style={styles.pkgCode}>{pkg.packageCode}</Text>
// </View>
// <Text style={styles.pkgDesc}>{pkg.description ?? 'Không có mô tả'}</Text>

//         {/* Thông số gói hàng */}
//         <View style={styles.statsContainer}>
// <StatItem label="Cân nặng" value={`${pkg.weightKg ?? 0} kg`} />
// <StatItem label="Thể tích" value={`${pkg.volumeM3 ?? 0} m³`} />
// <StatItem label="Trạng thái" value={pkg.status ?? 'N/A'} />
// </View>

//         {/* Hình ảnh gói hàng (Sửa key: pkg.packageImages) */}
//         <ImageScrollView images={pkg.packageImages ?? []} />

//         {/* Thông tin Item (Sửa key: pkg.item) */}
//         {pkg.item && (
//           <View style={styles.itemBox}>
// <Text style={styles.itemTitle}>Sản phẩm bên trong:</Text>
//             {/* Sửa key: pkg.item.itemName */}
//             <InfoRow label="Tên sản phẩm" value={pkg.item.itemName} />
// <InfoRow 
//               label="Giá trị" 
//               value={formatCurrency(pkg.item.declaredValue) + ` (${pkg.item.currency})`} 
//             />
// <InfoRow label="Trạng thái" value={pkg.item.status} />
// <Text style={styles.itemDesc}>{pkg.item.description ?? ''}</Text>
            
//             {/* Hình ảnh item (Sửa key: pkg.item.imageUrls) */}
//             <ImageScrollView images={pkg.item.imageUrls ?? []} />
// </View>
//         )}
//       </View>
//     ))
//   }
  
//   // Component cuộn ngang (dùng chung cho Gói hàng & Item)
//   const ImageScrollView: React.FC<{images: any[]}> = ({ images }) => {
//     if (!images || images.length === 0) return null
//     return (
//       <ScrollView
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         style={styles.imageScroll}
//       >
//         {images.map(
//           (img: any, i: number) => (
//             <Image
//               key={i}
//               // Sửa key: img.imageUrl
//               source={{ uri: img.imageUrl ?? img.url }}
//               style={styles.thumb}
//             />
//           ),
//         )}
//       </ScrollView>
//     )
//   }

//   // Component Stats (dùng cho Gói hàng)
//   const StatItem: React.FC<{ label: string; value: string }> = ({
//     label,
//     value,
//   }) => (
//     <View style={styles.statItem}>
// <Text style={styles.statLabel}>{label}</Text>
// <Text style={styles.statValue}>{value}</Text>
// </View>
//   )

//   // Render nội dung chính
//   const renderContent = () => {
//     if (loading) {
//       return (
//         <View style={styles.centeredContainer}>
// <ActivityIndicator size="large" color="#4F46E5" />
// <Text style={styles.statusText}>Đang tải chi tiết...</Text>
// </View>
//       )
//     }
//     if (!data) {
//       return (
//         <View style={styles.centeredContainer}>
// <Text style={styles.statusText}>Không tìm thấy dữ liệu</Text>
// </View>
//       )
//     }

//     // Gán biến cho dễ đọc
//     const provider = data.provider
//     const route = data.shippingRoute

//     return (
//       <ScrollView
//         style={styles.content}
//         contentContainerStyle={styles.scrollContentContainer}
//       >
//         {/* Card 1: Header (Mới) */}
//         <View style={styles.card}>
// <View style={styles.headerRow}>
// <Text style={styles.mainTitle} numberOfLines={2}>{data.title}</Text>
// <StatusBadge status={data.status} />
// </View>
// <Text style={styles.price}>{formatCurrency(data.offeredPrice)}</Text>
// <Text style={styles.date}>Đăng ngày: {formatDate(data.created)}</Text>
// </View>

//         {/* Card 2: Nhà cung cấp (Mới) */}
//         <View style={styles.card}>
// <SectionTitle>Nhà cung cấp</SectionTitle>
// <View style={styles.providerRow}>
// <Image 
//               source={provider?.avatarUrl ? { uri: provider.avatarUrl } : undefined} 
//               style={styles.avatar} 
//               defaultSource={require('../../../assets/user-avatar.png')}
//             />
//             {/* <UserCircleIcon style={styles.avatar} /> */}
//             <View>
//               {/* Sửa key: provider.fullName */}
//               <Text style={styles.providerName}>{provider?.fullName ?? 'N/A'}</Text>
// <IconInfoRow 
//                 icon={<PhoneIcon style={styles.iconSmall} />} 
//                 text={provider?.phoneNumber ?? 'N/A'} 
//               />
// </View>
// </View>
// </View>

//         {/* Card 3: Lộ trình */}
//         <View style={styles.card}>
// <SectionTitle>Lộ trình</SectionTitle>
// <IconInfoRow
//             icon={<MapPinIcon style={styles.iconRouteStart} />}
//             text={route?.startLocation?.address}
//           />
// <IconInfoRow
//             icon={<MapPinIcon style={styles.iconRouteEnd} />}
//             text={route?.endLocation?.address}
//           />
// <View style={styles.dateRow}>
// <IconInfoRow
//               icon={<CalendarDaysIcon style={styles.iconSmall} />}
//               text={`Nhận: ${formatDate(route?.expectedPickupDate)}`}
//             />
// <IconInfoRow
//               icon={<CalendarDaysIcon style={styles.iconSmall} />}
//               text={`Giao: ${formatDate(route?.expectedDeliveryDate)}`}
//             />
// </View>
// </View>

//         {/* Card 4: Liên hệ */}
//         <View style={styles.card}>
// <SectionTitle>Liên hệ</SectionTitle>
//           {/* Sửa key: data.postContacts */}
//           {(data.postContacts ?? []).map((c: any, i: number) => (
//             <View key={i} style={styles.contactCard}>
// <Text style={styles.contactRole}>
//                 {/* Sửa logic: c.type */}
//                 {c.type === 'SENDER' ? 'NGƯỜI GỬI' : (c.type === 'RECEIVER' ? 'NGƯỜI NHẬN' : (c.type ?? 'LIÊN HỆ'))}
//               </Text>
// <Text style={styles.contactValue}>{c.fullName}</Text>
// <Text style={styles.contactValue}>{c.phoneNumber}</Text>
//               {c.email && <Text style={styles.contactValue}>{c.email}</Text>}
//             </View>
//           ))}
//         </View>

//         {/* Section 5: Gói hàng (đã sửa) */}
//         <SectionTitle>Chi tiết gói hàng</SectionTitle>
//         {renderPackages(data.packages ?? [])}
//       </ScrollView>
//     )
//   }

//   return (
//     <Modal
//       visible={visible}
//       animationType="slide"
//       transparent={false}
//       onRequestClose={onClose}
//     >
// <SafeAreaView style={styles.container}>
// <View style={styles.header}>
// <Text style={styles.title}>Chi tiết bài đăng</Text>
// <TouchableOpacity onPress={onClose} style={styles.closeButton}>
// <XMarkIcon style={styles.closeIcon} />
// </TouchableOpacity>
// </View>
//         {renderContent()}
//       </SafeAreaView>
// </Modal>
//   )
// }

// // StyleSheet được làm lại toàn bộ
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F3F4F6', // Nền xám nhạt
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     backgroundColor: '#FFFFFF',
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E7EB',
//   },
//   title: {
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
//   content: {
//     flex: 1,
//   },
//   scrollContentContainer: {
//     padding: 16,
//     paddingBottom: 48,
//     gap: 16, // Khoảng cách giữa các Card
//   },
//   centeredContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     gap: 12,
//   },
//   statusText: {
//     fontSize: 16,
//     color: '#6B7280',
//   },
//   emptyText: {
//     fontSize: 14,
//     color: '#6B7280',
//     textAlign: 'center',
//   },
//   // Card (Thẻ)
//   card: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 12,
//     padding: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3,
//     elevation: 2,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#111827',
//     marginBottom: 12,
//   },
//   // Card Header (Mới)
//   headerRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     gap: 8,
//   },
//   mainTitle: {
//     fontSize: 22,
//     fontWeight: '700',
//     color: '#111827',
//     flex: 1,
//     marginBottom: 8,
//   },
//   price: {
//     fontSize: 24,
//     fontWeight: '800',
//     color: '#4F46E5', // Tím
//     marginBottom: 4,
//   },
//   date: {
//     fontSize: 12,
//     color: '#6B7280',
//   },
//   statusBadge: {
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 9999,
//   },
//   statusBadgeText: {
//     fontSize: 12,
//     fontWeight: '700',
//     textTransform: 'uppercase',
//   },
//   // Card Provider (Mới)
//   providerRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   avatar: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     backgroundColor: '#E5E7EB',
//   },
//   providerName: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#1F2937',
//   },
//   // Row thông tin (Cũ)
//   infoRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 6,
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: '#6B7280',
//     flex: 1,
//     marginRight: 8,
//   },
//   value: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#1F2937',
//     flex: 1.5,
//     textAlign: 'right',
//   },
//   // Row thông tin có Icon (Mới)
//   iconInfoRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//     marginBottom: 8,
//   },
//   iconContainer: {
//     width: 24,
//     alignItems: 'center',
//   },
//   iconSmall: {
//     width: 16,
//     height: 16,
//     color: '#6B7280',
//   },
//   iconRouteStart: {
//     width: 20,
//     height: 20,
//     color: '#22C55E', // Green
//   },
//   iconRouteEnd: {
//     width: 20,
//     height: 20,
//     color: '#EF4444', // Red
//   },
//   iconInfoText: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: '#1F2937',
//     flex: 1,
//   },
//   dateRow: {
//     flexDirection: 'row',
//     gap: 8,
//     marginTop: 8,
//     flexWrap: 'wrap',
//   },
//   // Card Liên hệ
//   contactCard: {
//     padding: 12,
//     backgroundColor: '#F9FAFB',
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//     marginBottom: 8,
//   },
//   contactRole: {
//     fontSize: 12,
//     fontWeight: '700',
//     color: '#4F46E5', // Tím
//     marginBottom: 4,
//   },
//   contactValue: {
//     fontSize: 15,
//     fontWeight: '500',
//     color: '#1F2937',
//   },
//   contactNote: {
//     fontSize: 14,
//     color: '#6B7280',
//     fontStyle: 'italic',
//     marginTop: 4,
//   },
//   // Card Gói hàng
//   pkgHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   pkgTitle: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: '#111827',
//     flex: 1,
//   },
//   pkgCode: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: '#6B7280',
//   },
//   pkgDesc: {
//     fontSize: 14,
//     color: '#6B7280',
//     marginTop: 2,
//     marginBottom: 12,
//   },
//   statsContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     backgroundColor: '#F9FAFB',
//     borderRadius: 8,
//     padding: 12,
//     marginBottom: 12,
//   },
//   statItem: {
//     alignItems: 'center',
//   },
//   statLabel: {
//     fontSize: 12,
//     color: '#6B7280',
//   },
//   statValue: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: '#111827',
//   },
//   imageScroll: {
//     marginTop: 8,
//   },
//   thumb: {
//     width: 120,
//     height: 90,
//     borderRadius: 8,
//     marginRight: 10,
//     backgroundColor: '#E5E7EB',
//   },
//   // Box Item (bên trong Gói hàng)
//   itemBox: {
//     marginTop: 12,
//     paddingTop: 12,
//     borderTopWidth: 1,
//     borderTopColor: '#E5E7EB',
//   },
//   itemTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#374151',
//     marginBottom: 8,
//   },
//   itemDesc: {
//     fontSize: 13,
//     color: '#6B7280',
//     marginTop: 4,
//   },
// })

// export default PostPackageDetailModal

import React, { useEffect, useState } from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import postService from '@/services/postService'
import { useRouter } from 'expo-router'

interface Props { visible: boolean; postId?: string | null; onClose: () => void }

const DetailRow = ({ icon, label, value }: any) => (
  <View style={styles.detailRow}>
    <View style={styles.iconBox}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'N/A'}</Text>
    </View>
  </View>
)

const PostPackageDetailModal: React.FC<Props> = ({ visible, postId, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const router = useRouter()

  useEffect(() => { if (visible && postId) fetchDetails() }, [visible, postId])

  const fetchDetails = async () => {
    setLoading(true)
    try {
      const res: any = await postService.getPostPackageDetails(postId!)
      setData(res?.result ?? res)
    } catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  const route = data?.shippingRoute

  if (!visible) return null

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chi Tiết Bài Đăng</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color="#4B5563" /></TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 50 }} /> : data ? (
          <ScrollView contentContainerStyle={styles.body}>
            
            {/* HEADER CARD */}
            <View style={styles.mainCard}>
              <Text style={styles.title}>{data.title}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{data.status}</Text>
              </View>
              <Text style={styles.price}>{new Intl.NumberFormat('vi-VN').format(data.offeredPrice)} đ</Text>
            </View>

            {/* ACTION BUTTONS (placed directly under header card for visibility) */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              {(() => {
                const st = (data?.status ?? data?.Status ?? '').toString().toUpperCase()
                if (st === 'AWAITING_SIGNATURE') {
                  return (
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: '#10B981', marginRight: 8 }]} onPress={() => router.push(`/provider-v2/PostSignScreen?postId=${encodeURIComponent(postId || '')}`)}>
                        <Text style={[styles.actionText, { color: '#fff' }]}>Ký & Thanh toán</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: '#0284C7' }]} onPress={() => router.push(`/provider-v2/PostPaymentScreen?postId=${encodeURIComponent(postId || '')}`)}>
                        <Text style={[styles.actionText, { color: '#fff' }]}>Thanh toán</Text>
                      </TouchableOpacity>
                    </View>
                  )
                }
                if (st === 'AWAITING_PAYMENT') {
                  return (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0284C7' }]} onPress={() => router.push(`/provider-v2/PostPaymentScreen?postId=${encodeURIComponent(postId || '')}`)}>
                      <Text style={[styles.actionText, { color: '#fff' }]}>Thanh toán</Text>
                    </TouchableOpacity>
                  )
                }
                if (st === 'PENDING') {
                  return (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]} onPress={() => { router.back(); }}>
                      <Text style={[styles.actionText, { color: '#fff' }]}>Cập nhật</Text>
                    </TouchableOpacity>
                  )
                }
                return null
              })()}
            </View>

            {/* LỘ TRÌNH */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Lộ trình vận chuyển</Text>
              <DetailRow icon={<MaterialCommunityIcons name="map-marker-outline" size={20} color="#0284C7" />} label="Điểm lấy hàng" value={route?.startLocation?.address} />
              <DetailRow icon={<MaterialCommunityIcons name="map-marker-check-outline" size={20} color="#EF4444" />} label="Điểm giao hàng" value={route?.endLocation?.address} />
              <View style={styles.row}>
                <View style={{flex:1}}><DetailRow icon={<Ionicons name="calendar-outline" size={18} color="#6B7280" />} label="Ngày nhận" value={new Date(route?.expectedPickupDate).toLocaleDateString('vi-VN')} /></View>
                <View style={{flex:1}}><DetailRow icon={<Ionicons name="calendar-outline" size={18} color="#6B7280" />} label="Ngày giao" value={new Date(route?.expectedDeliveryDate).toLocaleDateString('vi-VN')} /></View>
              </View>
            </View>

            {/* LIÊN HỆ */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Thông tin liên hệ</Text>
              {(data.postContacts || []).map((c:any, i:number) => (
                <View key={i} style={styles.contactItem}>
                  <Text style={styles.contactRole}>{c.type}</Text>
                  <Text style={styles.contactName}>{c.fullName} - {c.phoneNumber}</Text>
                </View>
              ))}
            </View>

            {/* GÓI HÀNG */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Gói hàng kèm theo</Text>
              {(data.packages || []).map((p:any, i:number) => (
                <View key={i} style={styles.pkgItem}>
                  <Text style={styles.pkgTitle}>{p.title}</Text>
                  <Text style={styles.pkgDesc}>{p.description}</Text>
                  <Text style={styles.pkgInfo}>{p.weightKg}kg • {p.volumeM3}m³</Text>
                </View>
              ))}
            </View>

            {/* (actions moved above under header card for visibility) */}

          </ScrollView>
        ) : <Text style={{ textAlign: 'center', marginTop: 20 }}>Không tìm thấy dữ liệu</Text>}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', marginTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  body: { padding: 16 },
  mainCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  statusText: { color: '#059669', fontWeight: '700', fontSize: 12 },
  price: { fontSize: 22, fontWeight: '800', color: '#0284C7' },
  
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12 },
  
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  detailLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  row: { flexDirection: 'row', gap: 12 },

  contactItem: { marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  contactRole: { fontSize: 11, fontWeight: '700', color: '#0284C7', marginBottom: 2 },
  contactName: { fontSize: 14, fontWeight: '500', color: '#374151' },

  pkgItem: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, marginBottom: 8 },
  pkgTitle: { fontWeight: '600', color: '#111827' },
  pkgDesc: { fontSize: 13, color: '#6B7280', marginVertical: 2 },
  pkgInfo: { fontSize: 12, fontWeight: '500', color: '#374151' },
  actionBtn: { padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  actionText: { fontWeight: '700', textAlign: 'center' },
})

export default PostPackageDetailModal