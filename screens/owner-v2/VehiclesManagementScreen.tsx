

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StatusBar,
  Alert,
  Modal,
  ScrollView
} from 'react-native'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { Vehicle } from '../../models/types'
import vehicleService from '@/services/vehicleService'
import { useVehicles } from '@/hooks/useVehicles'
import VehicleList from './components/VehicleList'
import VehicleFormModal from './components/VehicleFormModal'

interface Props {
  onBack?: () => void
}

const VehiclesManagementScreen: React.FC<Props> = ({ onBack }) => {
  const router = useRouter()
  const { vehicles, loading, search, sortBy, sortOrder, statusFilter, setSearch, setSortBy, setSortOrder, setStatusFilter, fetchPage } = useVehicles()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isSortModalOpen, setIsSortModalOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searchDebounce, setSearchDebounce] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [toastMessage, setToastMessage] = useState('')

  // Refetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchPage(1)
    }, [fetchPage])
  )

  const statusOptions = ['ALL', 'ACTIVE', 'IN_USE', 'INACTIVE']
  const statusLabels: Record<string, string> = {
    ALL: 'Tất cả',
    ACTIVE: 'Hoạt động',
    IN_USE: 'Đang dùng',
    INACTIVE: 'Không hoạt động',
  }
  const statusColors: Record<string, string> = {
    ACTIVE: '#10B981',
    IN_USE: '#F59E0B',
    INACTIVE: '#6B7280',
  }

  const showToast = (message: string, duration = 3000) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(''), duration)
  }

  const handleSearchChange = (text: string) => {
    setSearchText(text)
    if (searchDebounce) clearTimeout(searchDebounce)
    const timeout = setTimeout(() => setSearch(text), 500)
    setSearchDebounce(timeout)
  }

  const handleApplySort = (field: string, order: 'ASC' | 'DESC') => {
    setSortBy(field)
    setSortOrder(order)
    setIsSortModalOpen(false)
    showToast('Đã áp dụng sắp xếp')
  }

  const handleEditVehicle = (v: Vehicle) => Alert.alert('Thông báo', `Sửa xe ${v.plateNumber}`)
  const handleDeleteVehicle = (id: string) => Alert.alert('Xác nhận', 'Bạn muốn xóa xe này?')
  
  const handleVehiclePress = (vehicleId: string) => {
    router.push(`/vehicle-detail?id=${vehicleId}` as any)
  }

  const handleCreate = async (dto: any) => {
    try {
      await vehicleService.createVehicle(dto)
      setShowCreateModal(false)
      showToast('Thêm xe mới thành công!')
      fetchPage(1)
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể tạo xe. Vui lòng thử lại.')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* 1. HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack || (() => router.back())} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
          <Text style={styles.headerBtnText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Quản Lý Xe</Text>

        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.headerBtn}>
          <Ionicons name="add" size={24} color="#10439F" />
          <Text style={[styles.headerBtnText, { color: '#10439F' }]}>Thêm xe</Text>
        </TouchableOpacity>
      </View>

      {/* 2. SEARCH BAR */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Tìm nhanh xe..."
            style={styles.searchInput}
            value={searchText}
            onChangeText={handleSearchChange}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setIsSortModalOpen(true)}>
          <Feather name="sliders" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* 3. STATUS FILTER CHIPS */}
      <View style={styles.statusFilterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {statusOptions.map(status => {
            const isActive = statusFilter === status
            const bgColor = isActive && status !== 'ALL' ? statusColors[status] : (isActive ? '#10439F' : '#F3F4F6')
            return (
              <TouchableOpacity
                key={status}
                style={[styles.statusChip, { backgroundColor: bgColor }]}
                onPress={() => {
                  setStatusFilter(status)
                  showToast(`Lọc: ${statusLabels[status]}`)
                }}
              >
                <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                  {statusLabels[status]}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* 4. VEHICLE LIST */}
      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#10439F" style={{ marginTop: 40 }} />
        ) : (
          <VehicleList 
            vehicles={vehicles} 
            onEdit={handleEditVehicle} 
            onDelete={handleDeleteVehicle}
            onPress={handleVehiclePress}
          />
        )}
      </View>

      {/* MODAL FORM */}
      <VehicleFormModal 
        visible={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        onCreate={handleCreate}
      />

      {/* SORT MODAL */}
      {isSortModalOpen && (
        <Modal transparent animationType="fade">
          <TouchableOpacity 
            style={styles.sortModalBackdrop} 
            activeOpacity={1} 
            onPress={() => setIsSortModalOpen(false)}
          >
            <View style={styles.sortModal}>
              <Text style={styles.sortModalTitle}>Sắp xếp theo</Text>
              
              {[
                { label: 'Biển số (A-Z)', field: 'plate', order: 'ASC' as const },
                { label: 'Biển số (Z-A)', field: 'plate', order: 'DESC' as const },
                { label: 'Hãng xe (A-Z)', field: 'brand', order: 'ASC' as const },
                { label: 'Hãng xe (Z-A)', field: 'brand', order: 'DESC' as const },
                { label: 'Năm sản xuất (Cũ → Mới)', field: 'year', order: 'ASC' as const },
                { label: 'Năm sản xuất (Mới → Cũ)', field: 'year', order: 'DESC' as const },
                { label: 'Tải trọng (Thấp → Cao)', field: 'payload', order: 'ASC' as const },
                { label: 'Tải trọng (Cao → Thấp)', field: 'payload', order: 'DESC' as const },
                { label: 'Trạng thái (A-Z)', field: 'status', order: 'ASC' as const },
                { label: 'Trạng thái (Z-A)', field: 'status', order: 'DESC' as const },
              ].map((option, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.sortOption,
                    sortBy === option.field && sortOrder === option.order && styles.sortOptionActive
                  ]}
                  onPress={() => handleApplySort(option.field, option.order)}
                >
                  <Text style={styles.sortOptionText}>{option.label}</Text>
                  {sortBy === option.field && sortOrder === option.order && (
                    <Feather name="check" size={20} color="#10439F" />
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity 
                style={styles.sortCancelBtn}
                onPress={() => setIsSortModalOpen(false)}
              >
                <Text style={styles.sortCancelText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* TOAST */}
      {toastMessage ? (
        <View style={styles.toast}>
          <Feather name="check-circle" size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10439F',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
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
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusFilterRow: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
  },
  // Sort Modal
  sortModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#10439F',
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
    bottom: 32,
    alignSelf: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
})

export default VehiclesManagementScreen