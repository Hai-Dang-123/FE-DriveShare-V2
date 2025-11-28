// import React from 'react'
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList, // 1. Dùng FlatList
// } from 'react-native'
// import { Package } from '../../../models/types'
// import PackageCard from '../components/PackageCard'
// import { ArchiveBoxIcon } from '../icons/ManagementIcons' // 2. Import icon cho empty state

// interface PackageListProps {
//   packages: any // Giữ nguyên 'any' để xử lý logic chuẩn hóa
//   onEdit: (pkg: Package) => void
//   onDelete: (packageId: string) => void
//   onPost: (pkg: Package) => void
// }

// const PackageList: React.FC<PackageListProps> = ({
//   packages,
//   onEdit,
//   onDelete,
//   onPost,
// }) => {
//   // 3. Giữ nguyên logic chuẩn hóa dữ liệu của bạn
//   let list: Package[] = []
//   if (Array.isArray(packages)) list = packages
//   else if (packages && Array.isArray(packages.items)) list = packages.items
//   else if (packages && Array.isArray(packages.result)) list = packages.result
//   else if (packages && Array.isArray(packages.data)) list = packages.data
//   else {
//     if (packages) console.warn('PackageList received unexpected packages shape:', packages)
//     list = []
//   }

//   // 4. Tạo component rỗng
//   const renderEmptyComponent = () => (
//     <View style={styles.emptyContainer}>
// <ArchiveBoxIcon style={styles.emptyIcon} />
// <Text style={styles.emptyTitle}>Chưa có gói hàng</Text>
// <Text style={styles.emptySubtitle}>
//         Hãy tạo gói hàng từ sản phẩm của bạn.
//       </Text>
// </View>
//   )

//   return (
//     // 5. Dùng FlatList thay cho <div> và .map()
//     <FlatList
//       data={list} // Dùng 'list' đã chuẩn hóa
//       renderItem={({ item }) => (
//         <PackageCard
//           pkg={item}
//           onEdit={() => onEdit(item)}
//           onDelete={() => onDelete(item.id)}
//           onPost={() => onPost(item)}
//         />
//       )}
//       keyExtractor={(item) => item.id}
//       numColumns={2} // 6. Tạo layout 2 cột
//       ListEmptyComponent={renderEmptyComponent}
//       style={styles.listContainer}
//       contentContainerStyle={styles.listContentContainer}
//     />
//   )
// }

// const styles = StyleSheet.create({
//   listContainer: {
//     flex: 1,
//   },
//   listContentContainer: {
//     paddingHorizontal: 8, // Bù trừ cho margin 8 của Card
//     paddingBottom: 64,
//   },
//   // 7. Style cho trạng thái rỗng
//   emptyContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingTop: '30%',
//     paddingHorizontal: 20,
//   },
//   emptyIcon: {
//     width: 60,
//     height: 60,
//     color: '#9CA3AF', // text-gray-400
//   },
//   emptyTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//     color: '#374151',
//     marginTop: 16,
//     textAlign: 'center',
//   },
//   emptySubtitle: {
//     fontSize: 16,
//     color: '#6B7280',
//     marginTop: 8,
//     textAlign: 'center',
//   },
// })

// export default PackageList

import React from 'react'
import { View, Text, StyleSheet, FlatList } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Package } from '../../../models/types'
import PackageCard from './PackageCard'

interface PackageListProps {
  packages: any
  onEdit: (pkg: Package) => void
  onDelete: (packageId: string) => void
  onPost: (pkg: Package) => void
}

const PackageList: React.FC<PackageListProps> = ({ packages, onEdit, onDelete, onPost }) => {
  let list: Package[] = []
  if (Array.isArray(packages)) list = packages
  else if (packages?.data) list = packages.data
  else if (packages?.items) list = packages.items

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <MaterialCommunityIcons name="package-variant-closed" size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>Chưa có gói hàng</Text>
      <Text style={styles.emptySubtitle}>Tạo gói hàng từ sản phẩm để bắt đầu vận chuyển.</Text>
    </View>
  )

  return (
    <FlatList
      data={list}
      renderItem={({ item }) => (
        <PackageCard 
          pkg={item} 
          onEdit={() => onEdit(item)} 
          onDelete={() => onDelete(item.id)} 
          onPost={() => onPost(item)}
        />
      )}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ justifyContent: 'space-between' }}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
    />
  )
}

const styles = StyleSheet.create({
  listContent: { padding: 10, paddingBottom: 80 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
})

export default PackageList