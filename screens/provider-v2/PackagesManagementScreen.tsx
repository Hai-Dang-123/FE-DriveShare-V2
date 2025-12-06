

import React, { useState } from 'react'
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, TextInput, StatusBar
} from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { Package } from '../../models/types'
import PackageList from './components/PackageList'
import PackageFormModal from './components/PackageFormModal'
import usePackages from '@/hooks/usePackages'

interface Props {
  onBack: () => void
}

// Status color mapping for packages
const STATUS_COLORS: Record<string, string> = {
  ALL: '#0284C7',
  PENDING: '#F59E0B', // orange
  IN_TRANSIT: '#3B82F6', // blue
  DELIVERED: '#10B981', // green
  COMPLETED: '#6B7280', // gray
  DELETED: '#EF4444', // red
}

// Status label mapping
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    ALL: 'Tất cả',
    PENDING: 'Chờ xử lý',
    IN_TRANSIT: 'Đang vận chuyển',
    DELIVERED: 'Đã giao',
    COMPLETED: 'Hoàn thành',
    DELETED: 'Đã xóa',
  }
  return labels[status] || status
}

// Get status color
const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status] || '#9CA3AF'
}

const PackagesManagementScreen: React.FC<Props> = ({ onBack }) => {
  const {
    packages,
    loading,
    error,
    search,
    sortField,
    sortOrder,
    statusFilter,
    setSearch,
    setSortField,
    setSortOrder,
    setStatusFilter,
    fetchPage
  } = usePackages(1, 20)

  const [isModalOpen, setModalOpen] = useState(false)
  const [isSortModalOpen, setIsSortModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  })

  const showToast = (message: string, type: 'success' | 'error' = 'success', duration = 3000) => {
    setToast({ visible: true, message, type })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), duration)
  }

  const handleEdit = (pkg: Package) => {
    showToast('Chỉnh sửa gói hàng chưa được hỗ trợ', 'error')
  }

  const handleDelete = (id: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa gói hàng này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => showToast('Xóa gói hàng chưa được hỗ trợ', 'error')
      }
    ])
  }

  const handleSearchChange = (text: string) => {
    setSearch(text)
    const timer = setTimeout(() => {
      fetchPage(1, 20, text, sortField, sortOrder, statusFilter)
    }, 500)
    return () => clearTimeout(timer)
  }

  const handleApplySort = (field: string, order: 'ASC' | 'DESC') => {
    setSortField(field)
    setSortOrder(order)
    setIsSortModalOpen(false)
    fetchPage(1, 20, search, field, order, statusFilter)
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    fetchPage(1, 20, search, sortField, sortOrder, status)
  }

  const handleOpenCreate = () => {
    setSelectedItem({ itemName: 'iPhone 15 Pro Max', declaredValue: 35000000, currency: 'VND' })
    setModalOpen(true)
  }

  const handleCreatePackage = (data: any) => {
    console.log('Create Package Data:', data)
    setModalOpen(false)
    showToast('Đã tạo gói hàng thành công', 'success')
    fetchPage(1, 20, search, sortField, sortOrder, statusFilter)
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerCenter} pointerEvents="none">
          <Text style={styles.headerTitle}>Quản Lý Gói Hàng</Text>
        </View>

        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* SEARCH & FILTER */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput 
            placeholder="Tìm gói hàng..." 
            style={styles.searchInput} 
            value={search} 
            onChangeText={handleSearchChange} 
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setIsSortModalOpen(true)}>
          <Ionicons name="options-outline" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* STATUS FILTER CHIPS */}
      <View style={styles.statusFilterRow}>
        {['ALL', 'PENDING', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.statusChip,
              statusFilter === status && styles.statusChipActive,
              { backgroundColor: statusFilter === status ? getStatusColor(status) : '#F3F4F6' }
            ]}
            onPress={() => handleStatusFilter(status)}
          >
            <Text style={[
              styles.statusChipText,
              statusFilter === status && styles.statusChipTextActive
            ]}>
              {getStatusLabel(status)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* LIST */}
      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.centeredContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchPage(1, 20)}
            >
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.centeredContainer}>
            <Text style={styles.emptyText}>
              {search ? 'Không tìm thấy gói hàng nào.' : 'Bạn chưa có gói hàng nào.'}
            </Text>
          </View>
        ) : (
          <PackageList 
            packages={packages} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
            onPost={() => {}} 
            getStatusColor={getStatusColor}
          />
        )}
      </View>

      {/* SORT MODAL */}
      {isSortModalOpen && (
        <View style={styles.sortModalBackdrop}>
          <View style={styles.sortModal}>
            <Text style={styles.sortModalTitle}>Sắp xếp theo</Text>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortField === 'title' && sortOrder === 'ASC' && styles.sortOptionActive]}
              onPress={() => handleApplySort('title', 'ASC')}
            >
              <Text style={styles.sortOptionText}>Tiêu đề (A-Z)</Text>
              {sortField === 'title' && sortOrder === 'ASC' && <Feather name="check" size={20} color="#0284C7" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sortOption, sortField === 'title' && sortOrder === 'DESC' && styles.sortOptionActive]}
              onPress={() => handleApplySort('title', 'DESC')}
            >
              <Text style={styles.sortOptionText}>Tiêu đề (Z-A)</Text>
              {sortField === 'title' && sortOrder === 'DESC' && <Feather name="check" size={20} color="#0284C7" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sortOption, sortField === 'weightKg' && sortOrder === 'ASC' && styles.sortOptionActive]}
              onPress={() => handleApplySort('weightKg', 'ASC')}
            >
              <Text style={styles.sortOptionText}>Khối lượng (Thấp đến cao)</Text>
              {sortField === 'weightKg' && sortOrder === 'ASC' && <Feather name="check" size={20} color="#0284C7" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sortOption, sortField === 'weightKg' && sortOrder === 'DESC' && styles.sortOptionActive]}
              onPress={() => handleApplySort('weightKg', 'DESC')}
            >
              <Text style={styles.sortOptionText}>Khối lượng (Cao đến thấp)</Text>
              {sortField === 'weightKg' && sortOrder === 'DESC' && <Feather name="check" size={20} color="#0284C7" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sortOption, sortField === 'status' && sortOrder === 'ASC' && styles.sortOptionActive]}
              onPress={() => handleApplySort('status', 'ASC')}
            >
              <Text style={styles.sortOptionText}>Trạng thái (A-Z)</Text>
              {sortField === 'status' && sortOrder === 'ASC' && <Feather name="check" size={20} color="#0284C7" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sortOption, sortField === 'status' && sortOrder === 'DESC' && styles.sortOptionActive]}
              onPress={() => handleApplySort('status', 'DESC')}
            >
              <Text style={styles.sortOptionText}>Trạng thái (Z-A)</Text>
              {sortField === 'status' && sortOrder === 'DESC' && <Feather name="check" size={20} color="#0284C7" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sortCancelBtn}
              onPress={() => setIsSortModalOpen(false)}
            >
              <Text style={styles.sortCancelText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* CREATE PACKAGE MODAL */}
      <PackageFormModal 
        visible={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        onCreate={handleCreatePackage} 
        item={selectedItem} 
      />

      {/* TOAST */}
      {toast.visible && (
        <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderColor: '#F3F4F6' 
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0284C7' },
  headerBtn: { flexDirection: 'row', alignItems: 'center' },
  headerBtnText: { fontSize: 15, fontWeight: '500', color: '#111827', marginLeft: 4 },
  headerCenter: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  headerRightPlaceholder: { width: 40 },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#fff' 
  },
  searchInputWrapper: { 
    flex: 1,
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F3F4F6', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    height: 44, 
    borderWidth: 1, 
    borderColor: '#E5E7EB' 
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  filterButton: { 
    marginLeft: 12, 
    width: 44, 
    height: 40, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#fff' 
  },
  
  // Status filter chips
  statusFilterRow: { 
    flexDirection: 'row', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusChipActive: {
    borderColor: 'transparent',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  listContainer: { flex: 1 },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Sort Modal
  sortModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  sortModal: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
  },
  sortOptionActive: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  sortOptionText: {
    fontSize: 15,
    color: '#111827',
  },
  sortCancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Toast
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  toastSuccess: {
    backgroundColor: '#10B981',
  },
  toastError: {
    backgroundColor: '#EF4444',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
})

export default PackagesManagementScreen