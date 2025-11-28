// import React from 'react'
// import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native'
// import { Package, PackageStatus } from '../../../models/types'
// // Giả định các icon này là component React Native (nhận 'style' prop)
// import {
//   PencilSquareIcon,
//   TrashIcon,
//   PaperAirplaneIcon,
// } from '../icons/ActionIcons'

// interface PackageCardProps {
//   pkg: Package
//   onEdit: () => void
//   onDelete: () => void
//   onPost: () => void
// }

// // 1. Chuyển đổi statusStyles sang giá trị style của React Native
// const statusStyles = {
//   [PackageStatus.PENDING]: { text: '#92400E', bg: '#FEF3C7' },
//   [PackageStatus.OPEN]: { text: '#065F46', bg: '#D1FAE5' },
//   [PackageStatus.CLOSED]: { text: '#374151', bg: '#E5E7EB' },
//   [PackageStatus.DELETED]: { text: '#991B1B', bg: '#FEE2E2' },
// }

// const PackageCard: React.FC<PackageCardProps> = ({
//   pkg,
//   onEdit,
//   onDelete,
//   onPost,
// }) => {
//   const {
//     title,
//     description,
//     quantity,
//     unit,
//     weightKg,
//     volumeM3,
//     images = [], // Đảm bảo images là mảng
//     status,
//   } = pkg
//   const statusStyle = statusStyles[status] || statusStyles[PackageStatus.PENDING]
//   const imageUrl =
//     images.length > 0
//       ? images[0].packageImageURL
//       : 'https://via.placeholder.com/400'

//   const isPostable = status === PackageStatus.PENDING

//   return (
//     // 2. Dùng <View> và gán style
//     <View style={styles.cardContainer}>
//       {/* 3. Dùng <Image> */}
//       <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
// <View style={styles.contentContainer}>
// <View style={styles.header}>
// <Text style={styles.title} numberOfLines={2}>
//             {title}
//           </Text>
// <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
// <Text style={[styles.statusText, { color: statusStyle.text }]}>
//               {status}
//             </Text>
// </View>
// </View>
// <Text style={styles.description} numberOfLines={3}>
//           {description || 'Không có mô tả'}
//         </Text>

//         {/* 4. Stats được thiết kế lại (thay cho grid 3 cột) */}
//         <View style={styles.statsContainer}>
// <StatItem label="Số lượng" value={`${quantity} ${unit}(s)`} />
// <StatItem label="Cân nặng" value={`${weightKg} kg`} />
// <StatItem label="Thể tích" value={`${volumeM3} m³`} />
// </View>
// <View style={styles.footer}>
// <View style={styles.iconGroup}>
// <TouchableOpacity onPress={onEdit} style={styles.iconButton}>
// <PencilSquareIcon style={styles.icon as any} />
// </TouchableOpacity>
// <TouchableOpacity onPress={onDelete} style={styles.iconButton}>
//               {/* flatten style array to a plain object so SVG <svg> receives an object on web */}
//               <TrashIcon style={StyleSheet.flatten([styles.icon, styles.iconDelete]) as any} />
// </TouchableOpacity>
// </View>

//           {/* <TouchableOpacity
//             onPress={onPost}
//             disabled={!isPostable}
//             style={[
//               styles.postButton,
//               !isPostable && styles.postButtonDisabled,
//             ]}
//           >
// <PaperAirplaneIcon style={styles.postButtonIcon as any} />
// <Text style={styles.postButtonText}>Đăng tin</Text>
// </TouchableOpacity> */}
//         </View>
// </View>
// </View>
//   )
// }

// // Component phụ cho các ô stat
// const StatItem: React.FC<{ label: string; value: string }> = ({
//   label,
//   value,
// }) => (
//   <View style={styles.statItem}>
// <Text style={styles.statValue}>{value}</Text>
// <Text style={styles.statLabel}>{label}</Text>
// </View>
// )

// // 5. Toàn bộ StyleSheet
// const styles = StyleSheet.create({
//   cardContainer: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 10,
//     elevation: 7,
//     overflow: 'hidden',
//     margin: 8,
//     flex: 1, // Cần thiết cho FlatList numColumns
//   },
//   image: {
//     width: '100%',
//     height: 192, // h-48
//     backgroundColor: '#F3F4F6',
//   },
//   contentContainer: {
//     padding: 16, // p-4
//     flex: 1, // flex-grow (giúp đẩy footer xuống)
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: 8,
//   },
//   title: {
//     flex: 1,
//     marginRight: 8,
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#111827',
//   },
//   statusBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 9999,
//   },
//   statusText: {
//     fontSize: 12,
//     fontWeight: '600',
//     textTransform: 'capitalize',
//   },
//   description: {
//     flex: 1, // Đẩy stats và footer xuống
//     fontSize: 14,
//     color: '#6B7280',
//     marginBottom: 16,
//   },
//   // Stats
//   statsContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 16,
//     backgroundColor: '#F9FAFB',
//     borderRadius: 8,
//     padding: 12,
//     borderWidth: 1,
//     borderColor: '#E5E7EB'
//   },
//   statItem: {
//     alignItems: 'center',
//     flex: 1,
//   },
//   statValue: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: '#111827',
//   },
//   statLabel: {
//     fontSize: 12,
//     color: '#6B7280',
//     marginTop: 2,
//   },
//   // Footer
//   footer: {
//     borderTopWidth: 1,
//     borderColor: '#E5E7EB',
//     paddingTop: 16,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   iconGroup: {
//     flexDirection: 'row',
//     gap: 8,
//   },
//   iconButton: {
//     padding: 8,
//     borderRadius: 9999,
//   },
//   icon: {
//     width: 20,
//     height: 20,
//     color: '#4B5563',
//   },
//   iconDelete: {
//     color: '#EF4444',
//   },
//   postButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     backgroundColor: '#4F46E5', // bg-indigo-600
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 8,
//     elevation: 2,
//   },
//   postButtonDisabled: {
//     backgroundColor: '#9CA3AF', // bg-gray-400
//   },
//   postButtonIcon: {
//     width: 20,
//     height: 20,
//     color: '#FFFFFF',
//   },
//   postButtonText: {
//     color: '#FFFFFF',
//     fontWeight: '600',
//   },
// })

// export default PackageCard

import React from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native'
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons'
import { Package, PackageStatus } from '../../../models/types'

interface PackageCardProps {
  pkg: Package
  onEdit: () => void
  onDelete: () => void
  onPost: () => void
}

// Màu sắc trạng thái
const getStatusColor = (status: string) => {
  switch (status) {
    case PackageStatus.OPEN: return '#10B981' // Xanh lá
    case PackageStatus.CLOSED: return '#6B7280' // Xám
    case PackageStatus.DELETED: return '#EF4444' // Đỏ
    default: return '#F59E0B' // Cam (Pending)
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case PackageStatus.OPEN: return 'Đang mở'
    case PackageStatus.CLOSED: return 'Đã đóng'
    case PackageStatus.DELETED: return 'Đã xóa'
    default: return 'Chờ duyệt'
  }
}

const PackageCard: React.FC<PackageCardProps> = ({ pkg, onEdit, onDelete, onPost }) => {
  const { title, description, quantity, unit, weightKg, volumeM3, images = [], status } = pkg
  
  // Resolve image URL defensively: packageImages may contain objects with different keys or plain strings
  let imageUrl = 'https://via.placeholder.com/400'
  if (images && images.length > 0) {
    const first = images[0]
    if (typeof first === 'string') imageUrl = first
    else if (first) {
      const f: any = first
      imageUrl = f.packageImageURL ?? f.imageUrl ?? f.url ?? f.uri ?? f.packageImageUrl ?? imageUrl
    }
  }

  const statusColor = getStatusColor(status)
  const statusLabel = getStatusText(status)

  return (
    <View style={[styles.card, { borderColor: status === PackageStatus.PENDING ? '#3B82F6' : 'transparent', borderWidth: status === PackageStatus.PENDING ? 1 : 0 }]}>
      {/* IMAGE HEADER */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            // eslint-disable-next-line no-console
            console.warn('Package image failed to load, showing placeholder', e.nativeEvent?.error)
          }}
        />
        {/* Ribbon Status */}
        <View style={[styles.badge, { backgroundColor: statusColor }]}>
          <Text style={styles.badgeText}>{statusLabel}</Text>
        </View>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.desc} numberOfLines={2}>{description || 'Chưa có mô tả'}</Text>

        {/* STATS GRID */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="cube-outline" size={16} color="#6B7280" />
            <Text style={styles.statValue}>{quantity} {unit}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="weight-kilogram" size={16} color="#6B7280" />
            <Text style={styles.statValue}>{weightKg} kg</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="arrow-expand-all" size={16} color="#6B7280" />
            <Text style={styles.statValue}>{volumeM3} m³</Text>
          </View>
        </View>

        {/* FOOTER ACTIONS */}
        <View style={styles.footer}>
          <View style={styles.actionGroup}>
            <TouchableOpacity onPress={onEdit} style={styles.iconBtn}>
              <Feather name="edit-2" size={16} color="#4B5563" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.iconBtn}>
              <Feather name="trash-2" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* Nút Đăng Tin (chỉ hiện khi Pending) */}
          {status === PackageStatus.PENDING && (
            <TouchableOpacity onPress={onPost} style={styles.postBtn}>
              <Text style={styles.postBtnText}>Đăng tin</Text>
              <Feather name="send" size={12} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
    marginBottom: 16, marginHorizontal: 6, flex: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 4,
  },
  imageContainer: { height: 120, position: 'relative', backgroundColor: '#F3F4F6' },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute', top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  
  content: { padding: 12 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  desc: { fontSize: 12, color: '#6B7280', marginBottom: 12, height: 32 },
  
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between', 
    backgroundColor: '#F9FAFB', borderRadius: 8, padding: 8, marginBottom: 12 
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 11, fontWeight: '600', color: '#374151' },

  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  actionGroup: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  
  postBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0284C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 
  },
  postBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' }
})

export default PackageCard