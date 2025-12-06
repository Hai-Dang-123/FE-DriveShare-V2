

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
  getStatusColor?: (status: string) => string
}

const PackageList: React.FC<PackageListProps> = ({ packages, onEdit, onDelete, onPost, getStatusColor }) => {
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
          getStatusColor={getStatusColor}
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