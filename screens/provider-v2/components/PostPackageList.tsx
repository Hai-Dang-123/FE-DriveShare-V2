// import React from 'react'
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList, // 1. Dùng FlatList
// } from 'react-native'
// import { FreightPost } from '../../../models/types'
// import PostPackageCard from '../components/PostPackageCard'
// import { PaperAirplaneIcon } from '../icons/ActionIcons' // 2. Import icon

// interface PostListProps {
//   posts: FreightPost[]
//   onEdit: (post: FreightPost) => void
//   onDelete: (postId: string) => void
//   onView?: (postId: string) => void
//   onAccept?: (postId: string) => void
//   // when false, hide edit/delete actions and show only a View button
//   showActions?: boolean
// }

// const PostPackageList: React.FC<PostListProps> = ({ posts, onEdit, onDelete, onView, showActions = true, onAccept }) => {
//   // 3. Component rỗng
//   const renderEmptyComponent = () => (
//     <View style={styles.emptyContainer}>
// <PaperAirplaneIcon style={styles.emptyIcon} />
// <Text style={styles.emptyTitle}>Chưa có bài đăng</Text>
// <Text style={styles.emptySubtitle}>
//         Đăng tin các gói hàng của bạn để chúng xuất hiện ở đây.
//       </Text>
// </View>
//   )

//   return (
//     // 4. Dùng FlatList thay cho .map()
//     <FlatList
//       data={posts}
//       renderItem={({ item }) => (
//         <PostPackageCard
//           post={item}
//           onEdit={() => onEdit(item)}
//           onDelete={() => onDelete(item.id)}
//           onView={() => onView?.(item.id)}
//           onAccept={() => onAccept?.(item.id)}
//           showActions={showActions}
//         />
//       )}
//       keyExtractor={(item) => item.id}
//       ListEmptyComponent={renderEmptyComponent}
//       // 5. Thêm khoảng cách giữa các item
//       ItemSeparatorComponent={() => <View style={{ height: 16 }} />} 
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
//     paddingBottom: 64, // Thêm padding ở dưới
//   },
//   // 6. Style cho trạng thái rỗng
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
//     color: '#9CA3AF',
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

// export default PostPackageList

import React from 'react'
import { View, Text, StyleSheet, FlatList } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { FreightPost } from '../../../models/types'
import PostPackageCard from './PostPackageCard'

interface PostListProps {
  posts: FreightPost[]
  onEdit: (post: FreightPost) => void
  onDelete: (postId: string) => void
  onView?: (postId: string) => void
  showActions?: boolean
  onSign?: (postId: string) => void
  onPay?: (postId: string) => void
}

const PostPackageList: React.FC<PostListProps> = ({ posts, onEdit, onDelete, onView, showActions = true, onSign, onPay }) => {
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <MaterialCommunityIcons name="file-document-edit-outline" size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>Chưa có bài đăng nào</Text>
      <Text style={styles.emptySubtitle}>Tạo bài đăng mới để tìm tài xế vận chuyển.</Text>
    </View>
  )

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => (
        <PostPackageCard 
          post={item} 
          onEdit={() => onEdit(item)} 
          onDelete={() => onDelete(item.id)} 
          onView={onView}
          onSign={() => onSign?.(item.id)}
          onPay={() => onPay?.(item.id)}
          showActions={showActions}
        />
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
    />
  )
}

const styles = StyleSheet.create({
  listContent: { padding: 16, paddingBottom: 80 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
})

export default PostPackageList