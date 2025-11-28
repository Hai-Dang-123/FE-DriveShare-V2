import React, { useState, useMemo } from 'react'
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert, // 1. Import Alert
  ActivityIndicator, // 2. Import ActivityIndicator
  TextInput,
  Platform,
} from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { Item, ItemStatus, Package } from '../../models/types'
import packageService from '@/services/packageService'
import ItemList from './components/ItemList'
import { ArrowLeftIcon } from './icons/ActionIcons' // Giả định icon này là component RN
import ItemFormModal from './components/ItemFormModal'
import PackageFormModal from './components/PackageFormModal'
import useItems from '@/hooks/useItems'

interface ItemsManagementScreenProps {
  onBack: () => void
}

const COLORS = {
  primary: '#4F46E5', // indigo-600
  white: '#FFFFFF',
  black: '#111827', // gray-900
  gray: '#6B7280', // gray-500
  lightGray: '#F3F4F6', // gray-100
  separator: '#E5E7EB', // gray-200
  red: '#EF4444', // red-500
}

const ItemsManagementScreen: React.FC<ItemsManagementScreenProps> = ({
  onBack,
}) => {
  const { items, loading, error, createItem, updateItem, deleteItem, fetchPage } =
    useItems(1, 20)
  const [isItemModalOpen, setItemModalOpen] = useState(false)
  const [isPackageModalOpen, setPackageModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState<string>('')
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>(
    { visible: false, message: '', type: 'success' },
  )

  const showToast = (message: string, type: 'success' | 'error' = 'success', duration = 3000) => {
    setToast({ visible: true, message, type })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), duration)
  }

  const handleEditItem = (item: Item) => {
    setSelectedItem(item)
    setItemModalOpen(true)
  }

  // 3. Dùng Alert.alert của React Native
  const handleDeleteItem = (itemId: string) => {
    // On web Alert.alert may not show; use window.confirm as fallback
    // Debug log so we can see that handler fired
    // eslint-disable-next-line no-console
    console.debug('handleDeleteItem called for', itemId)
    if (Platform.OS === 'web') {
      const ok = window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')
      if (!ok) return
      ;(async () => {
        try {
          setDeletingId(itemId)
          const res = await deleteItem(itemId)
          if (res?.isSuccess) {
            showToast('Xóa sản phẩm thành công', 'success')
            fetchPage(1, 20)
          } else {
            showToast(res?.message || 'Xóa không thành công', 'error')
          }
        } catch (e: any) {
          showToast(e?.message || 'Lỗi khi xóa', 'error')
        } finally {
          setDeletingId(null)
        }
      })()
      return
    }

    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa sản phẩm này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
            onPress: async () => {
            try {
              setDeletingId(itemId)
              const res = await deleteItem(itemId)
              if (res?.isSuccess) {
                showToast('Xóa sản phẩm thành công', 'success')
                fetchPage(1, 20)
              } else {
                showToast(res?.message || 'Xóa không thành công', 'error')
              }
            } catch (e: any) {
              showToast(e?.message || 'Lỗi khi xóa', 'error')
            } finally {
              setDeletingId(null)
            }
          },
        },
      ],
    )
  }

  const handlePackItem = (item: Item) => {
    setSelectedItem(item)
    setPackageModalOpen(true)
  }

  const handleAddNewItem = () => {
    setSelectedItem(null)
    setItemModalOpen(true)
  }

  const filteredItems = useMemo(() => {
    if (!search) return items
    const q = search.trim().toLowerCase()
    return items.filter((it) => (it.itemName || '').toString().toLowerCase().includes(q))
  }, [items, search])

  const onOpenSort = () => {
    Alert.alert('Sắp xếp / Lọc', 'Chức năng sắp xếp/lọc sẽ được thêm sau (mock).')
  }

  const handleSaveItem = async (itemToSave: any) => {
    // Map frontend form to backend DTO (PascalCase) before sending
    if (selectedItem) {
      // accept both PascalCase and camelCase from modal
      const getField = (pascal: string, camel: string) =>
        itemToSave[pascal] ?? itemToSave[camel]

      const updateDto = {
        ItemId: (selectedItem as any).id ?? (selectedItem as any).itemId,
        ItemName: String(getField('ItemName', 'itemName') ?? ''),
        Description: String(getField('Description', 'description') ?? ''),
        DeclaredValue: Number(getField('DeclaredValue', 'declaredValue') ?? 0),
        Currency: String(getField('Currency', 'currency') ?? 'VND'),
        Quantity: Number(getField('Quantity', 'quantity') ?? 1),
        Unit: String(getField('Unit', 'unit') ?? 'pcs'),
      }

      await updateItem(updateDto as any)
    } else {
      // accept both PascalCase and camelCase and include images if present
      const getField = (pascal: string, camel: string) =>
        itemToSave[pascal] ?? itemToSave[camel]

      const createDto: any = {
        ItemName: String(getField('ItemName', 'itemName') ?? ''),
        Description: String(getField('Description', 'description') ?? ''),
        DeclaredValue: Number(getField('DeclaredValue', 'declaredValue') ?? 0),
        Currency: String(getField('Currency', 'currency') ?? 'VND'),
        Price: Number(getField('Price', 'price') ?? 0),
        Quantity: Number(getField('Quantity', 'quantity') ?? 1),
        Unit: String(getField('Unit', 'unit') ?? 'pcs'),
      }

      // ItemImages may be provided as PascalCase array of dataURLs or images array
      if (itemToSave.ItemImages) createDto.ItemImages = itemToSave.ItemImages
      else if (itemToSave.images) createDto.ItemImages = itemToSave.images.map((i: any) => i.itemImageURL ?? i.uri ?? i)
      else if (itemToSave.itemImages) createDto.ItemImages = itemToSave.itemImages

      await createItem(createDto as any)
    }
    setItemModalOpen(false)
    setSelectedItem(null)
    fetchPage(1, 20)
  }

  const handleCreatePackage = (
    packageDetails: Omit<Package, 'id' | 'itemId'>,
  ) => {
    ;(async () => {
      try {
        // Build DTO, include ItemId from selectedItem
        const dto: any = {
          Title: packageDetails.title,
          Description: packageDetails.description,
          Quantity: packageDetails.quantity,
          Unit: packageDetails.unit,
          WeightKg: packageDetails.weightKg,
          VolumeM3: packageDetails.volumeM3,
          OtherRequirements: '',
          HandlingAttributes: [],
          // images
          PackageImages: packageDetails.images ?? [],
          ItemId: (selectedItem as any)?.id ?? (selectedItem as any)?.itemId,
        }

        const res = await packageService.createPackage(dto)
        if (res?.isSuccess) {
          showToast('Tạo gói thành công', 'success')
          // mark item as packaged locally and refresh
          // if (selectedItem) {
          //   const updatedItem = { ...selectedItem, status: ItemStatus.PACKAGED }
          //   updateItem(updatedItem)
          // }
          fetchPage(1, 20)
        } else {
          showToast(res?.message || 'Tạo gói không thành công', 'error')
        }
      } catch (e: any) {
        showToast(e?.message || 'Lỗi khi tạo gói', 'error')
      } finally {
        setPackageModalOpen(false)
        setSelectedItem(null)
      }
    })()
  }

  // Helper function để render nội dung chính
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centeredContainer}>
<ActivityIndicator size="large" color={COLORS.primary} />
<Text style={styles.statusText}>Đang tải dữ liệu...</Text>
</View>
      )
    }

    if (error) {
      return (
        <View style={styles.centeredContainer}>
<Text style={styles.errorText}>{error}</Text>
<TouchableOpacity
            style={styles.primaryButton}
            onPress={() => fetchPage(1, 20)}
          >
<Text style={styles.primaryButtonText}>Thử lại</Text>
</TouchableOpacity>
</View>
      )
    }

    if (filteredItems.length === 0) {
      return (
        <View style={styles.centeredContainer}>
<Text style={styles.statusText}>Bạn chưa có sản phẩm nào.</Text>
<TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAddNewItem}
          >
<Text style={styles.primaryButtonText}>Thêm sản phẩm ngay</Text>
</TouchableOpacity>
</View>
      )
    }

    return (
      <ItemList
        items={filteredItems}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
        onPack={handlePackItem}
        deletingId={deletingId}
      />
    )
  }

  // Toast/snackbar render (absolute at bottom)
  return (
    <SafeAreaView style={styles.container}>
      {/* Header similar to Vehicle screen: back | centered title | + Thêm */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ArrowLeftIcon style={styles.icon} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerCenter} pointerEvents="none">
          <Text style={styles.headerTitle}>Quản Lý Sản Phẩm</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleAddNewItem} style={styles.addLink}>
            <Feather name="plus" size={16} color="#0B5FFF" />
            <Text style={[styles.addLinkText, { color: '#10439F' }]}> Thêm</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#9CA3AF" style={{ marginLeft: 10 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm nhanh sản phẩm..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={onOpenSort}>
          <Ionicons name="options-outline" size={22} color="#374151" />
        </TouchableOpacity>
      </View>
<View style={styles.bodyContainer}>{renderContent()}</View>
<ItemFormModal visible={isItemModalOpen} onClose={() => setItemModalOpen(false)} onSave={handleSaveItem} item={selectedItem} />
<PackageFormModal visible={isPackageModalOpen} onClose={() => setPackageModalOpen(false)} onCreate={handleCreatePackage} item={selectedItem} />

      {toast.visible && (
        <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
<Text style={styles.toastText}>{toast.message}</Text>
</View>
      )}
    </SafeAreaView>
  )

  // above return already renders the full screen (with toast)
}

// 8. Toàn bộ style được định nghĩa bằng StyleSheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  // Header
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.separator,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1, // Cho phép text co lại nếu cần
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  icon: {
    width: 24,
    height: 24,
    color: COLORS.black,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10439F',
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCenter: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  addLink: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 },
  addLinkText: { fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 4,
   },

  // search
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, height: 40 },
  searchInput: { flex: 1, paddingHorizontal: 10, color: '#111827' },
  filterButton: { marginLeft: 12, width: 44, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
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
  // Body
  bodyContainer: {
    flex: 1,
    padding: 12,
  },
  // Trạng thái (Loading, Empty, Error)
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  statusText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.red,
    textAlign: 'center',
  },
  // Buttons
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonSmall: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.separator,
  },
  secondaryButtonText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: '600',
  },
})

export default ItemsManagementScreen