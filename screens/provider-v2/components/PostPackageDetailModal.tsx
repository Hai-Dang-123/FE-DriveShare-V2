

import React, { useEffect, useState } from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import postPackageService from '@/services/postPackageService'
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
      const res: any = await postPackageService.getPostPackageDetails(postId!)
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