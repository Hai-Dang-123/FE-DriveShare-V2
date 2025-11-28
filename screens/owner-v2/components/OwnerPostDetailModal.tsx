import React, { useEffect, useState } from 'react'
import {
  Modal, View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions
} from 'react-native'
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons'
import postService from '@/services/postService'

interface Props {
  visible: boolean
  postId?: string | null
  onClose: () => void
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
  senderBg: '#E0F2FE',
  receiverBg: '#FFEDD5',
}

const OwnerPostDetailModal: React.FC<Props> = ({ visible, postId, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (visible && postId) fetchDetails()
    else setData(null)
  }, [visible, postId])

  const fetchDetails = async () => {
    setLoading(true)
    try {
      const res: any = await postService.getPostPackageDetails(postId!)
      setData(res?.result ?? res)
    } catch (e) {
      console.warn('Fetch detail error', e)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch { return 'N/A' }
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val)

  const renderContent = () => {
    if (loading) return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
    if (!data) return <Text style={styles.emptyText}>Không tải được dữ liệu.</Text>

    const route = data.shippingRoute || {}
    const provider = data.provider
    const sender = data.postContacts?.find((c: any) => c.type === 'SENDER')
    const receiver = data.postContacts?.find((c: any) => c.type === 'RECEIVER')

    return (
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        
        {/* --- 1. HEADER CARD --- */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.postTitle}>{data.title}</Text>
              <Text style={styles.postDate}>Ngày tạo: {formatDate(data.created)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#ECFDF5' }]}>
              <Text style={styles.statusText}>{data.status}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.priceLabel}>Giá đề xuất</Text>
          <Text style={styles.priceValue}>{formatCurrency(data.offeredPrice)} VND</Text>
          
          {data.description ? <Text style={styles.desc}>{data.description}</Text> : null}
        </View>

        {/* --- 2. LỘ TRÌNH (VISUAL) --- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📍 Lộ Trình Vận Chuyển</Text>
          
          <View style={styles.routeContainer}>
            {/* Start */}
            <View style={styles.routeRow}>
              <MaterialCommunityIcons name="circle-slice-8" size={20} color={COLORS.primary} />
              <View style={styles.routeContent}>
                <Text style={styles.routeLabel}>Điểm đi ({formatDate(route.expectedPickupDate)})</Text>
                <Text style={styles.routeAddress}>{route.startLocation?.address}</Text>
              </View>
            </View>

            {/* Line */}
            <View style={styles.routeLine}>
              <View style={styles.dashedLine} />
            </View>

            {/* End */}
            <View style={styles.routeRow}>
              <MaterialCommunityIcons name="map-marker" size={20} color={COLORS.danger} />
              <View style={styles.routeContent}>
                <Text style={styles.routeLabel}>Điểm đến ({formatDate(route.expectedDeliveryDate)})</Text>
                <Text style={styles.routeAddress}>{route.endLocation?.address}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- 3. GÓI HÀNG & ITEM (QUAN TRỌNG) --- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="package-variant-closed" size={20} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Chi Tiết Gói Hàng</Text>
          </View>

          {(data.packages || []).map((pkg: any, index: number) => (
            <View key={index} style={styles.packageItem}>
              <View style={styles.pkgHeader}>
                <Text style={styles.pkgTitle}>{pkg.title}</Text>
                <Text style={styles.pkgCode}>{pkg.packageCode}</Text>
              </View>
              
              <View style={styles.specRow}>
                <Text style={styles.specText}>⚖️ {pkg.weightKg} kg</Text>
                <Text style={styles.specText}>📦 {pkg.volumeM3} m³</Text>
              </View>

              {/* Item bên trong */}
              {pkg.item && (
                <View style={styles.itemBox}>
                  <Image 
                    source={{ uri: pkg.item.imageUrls?.[0]?.imageUrl || 'https://via.placeholder.com/100' }} 
                    style={styles.itemImage} 
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{pkg.item.itemName}</Text>
                    <Text style={styles.itemVal}>Giá trị: {formatCurrency(pkg.item.declaredValue)} {pkg.item.currency}</Text>
                    <Text style={styles.itemDesc} numberOfLines={2}>{pkg.item.description}</Text>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* --- 4. ĐỐI TÁC (PROVIDER) --- */}
        {provider && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🤝 Đối Tác Nhận Đơn</Text>
            <View style={styles.providerRow}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{provider.fullName?.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{provider.fullName}</Text>
                <Text style={styles.providerPhone}>{provider.phoneNumber}</Text>
              </View>
              <TouchableOpacity style={styles.callBtn}>
                <Ionicons name="call" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- 5. LIÊN HỆ --- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📞 Liên Hệ</Text>
          
          {/* Sender */}
          <View style={[styles.contactRow, { backgroundColor: COLORS.senderBg }]}>
            <MaterialCommunityIcons name="arrow-up-bold-box-outline" size={24} color={COLORS.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.contactLabel}>Người Gửi</Text>
              <Text style={styles.contactName}>{sender?.fullName}</Text>
              <Text style={styles.contactPhone}>{sender?.phoneNumber}</Text>
            </View>
          </View>

          {/* Receiver */}
          <View style={[styles.contactRow, { backgroundColor: COLORS.receiverBg, marginTop: 10 }]}>
            <MaterialCommunityIcons name="arrow-down-bold-box-outline" size={24} color="#C2410C" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.contactLabel}>Người Nhận</Text>
              <Text style={styles.contactName}>{receiver?.fullName}</Text>
              <Text style={styles.contactPhone}>{receiver?.phoneNumber}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    )
  }

  if (!visible) return null

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* HEADER MODAL */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi Tiết Bài Đăng</Text>
          <View style={{ width: 32 }} />
        </View>

        {renderContent()}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderColor: COLORS.border,
    paddingTop: 12 // Điều chỉnh nếu có SafeArea
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  closeBtn: { padding: 4 },
  body: { padding: 16 },
  emptyText: { textAlign: 'center', marginTop: 40, color: COLORS.textLight },

  // CARD
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  postTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  postDate: { fontSize: 12, color: COLORS.textLight },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  divider: { height: 1, backgroundColor: COLORS.bg, marginVertical: 12 },
  priceLabel: { fontSize: 12, color: COLORS.textLight },
  priceValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  desc: { marginTop: 8, fontSize: 14, color: COLORS.text, fontStyle: 'italic' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },

  // ROUTE
  routeContainer: { paddingLeft: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start' },
  routeContent: { flex: 1, marginLeft: 12 },
  routeLabel: { fontSize: 12, color: COLORS.textLight, marginBottom: 2 },
  routeAddress: { fontSize: 14, fontWeight: '500', color: COLORS.text, lineHeight: 20 },
  routeLine: { marginLeft: 9, height: 24, borderLeftWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', marginVertical: 4 },
  dashedLine: { flex: 1 },

  // PACKAGES
  packageItem: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  pkgHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  pkgTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  pkgCode: { fontSize: 12, color: COLORS.textLight },
  specRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  specText: { fontSize: 12, fontWeight: '600', color: COLORS.textLight, backgroundColor: '#E5E7EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  
  // ITEM INSIDE PACKAGE
  itemBox: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 8, borderRadius: 8, gap: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  itemImage: { width: 50, height: 50, borderRadius: 6, backgroundColor: '#E5E7EB' },
  itemName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  itemVal: { fontSize: 12, color: COLORS.blue, fontWeight: '600', marginTop: 2 },
  itemDesc: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },

  // CONTACT
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12 },
  contactLabel: { fontSize: 11, fontWeight: '600', color: '#4B5563', marginBottom: 2 },
  contactName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  contactPhone: { fontSize: 13, color: '#4B5563' },

  // PROVIDER
  providerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', padding: 12, borderRadius: 12 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  providerName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  providerPhone: { fontSize: 13, color: COLORS.textLight },
  callBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
})

export default OwnerPostDetailModal