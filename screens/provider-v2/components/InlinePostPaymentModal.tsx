import React, { useEffect, useState } from 'react'
import { Modal, SafeAreaView, View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native'
import postService from '@/services/postService'
import walletService from '@/services/walletService'
import { Linking } from 'react-native'
import { useRouter } from 'expo-router'

interface Props {
  visible: boolean
  postId?: string | null
  onClose: () => void
  onDone?: () => void
}

const InlinePostPaymentModal: React.FC<Props> = ({ visible, postId, onClose, onDone }) => {
  const [loading, setLoading] = useState(false)
  const [post, setPost] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const router = useRouter()
  const openTopup = () => {
    // navigate to wallet topup route. If router present, use push; otherwise fallback to Linking
    const amount = Number(post?.offeredPrice ?? post?.OfferedPrice ?? 0)
    try {
      router.push('/(wallet)/topup?amount=' + Math.max(0, amount - (wallet?.balance || 0)))
    } catch (e) {
      const url = 'myapp://wallet/topup?amount=' + Math.max(0, amount - (wallet?.balance || 0))
      Linking.openURL(url)
    }
  }

  useEffect(() => {
    if (visible && postId) {
      fetchDetails()
      fetchWallet()
    }
    if (!visible) {
      setPost(null)
      setWallet(null)
    }
  }, [visible, postId])

  const fetchDetails = async () => {
    try {
      const res: any = await postService.getPostPackageDetails(postId!)
      setPost(res?.result ?? res)
    } catch (e) { console.warn(e) }
  }

  const fetchWallet = async () => {
    try {
      const w: any = await walletService.getMyWallet()
      setWallet(w?.result ?? w)
    } catch (e) { console.warn(e) }
  }

  const handlePayNow = async () => {
    if (!post) return
    setLoading(true)
    try {
      const amount = Number(post.offeredPrice ?? post.OfferedPrice ?? 0)
      const dto = { amount, type: 'POST_PAYMENT', tripId: null, postId, description: `Thanh toán bài đăng ${postId}` }
      const resp: any = await walletService.createPayment(dto)
      const ok = resp?.isSuccess ?? (resp?.statusCode === 200 || resp?.statusCode === 201)
      if (!ok) throw new Error(resp?.message || 'Thanh toán thất bại')
      onDone?.()
      onClose()
    } catch (e: any) { alert(e?.message || 'Thất bại') } finally { setLoading(false) }
  }

  const handleTopup = () => {
    const balance = Number(wallet?.balance ?? wallet?.Balance ?? 0)
    const needed = Math.max(0, Number(post?.offeredPrice ?? post?.OfferedPrice ?? 0) - balance)
    // Navigate to wallet topup screen with prefilled amount
    try {
      router.push({ pathname: '/(wallet)/topup', params: { amount: String(needed) } } as any)
      onClose()
    } catch {
      // fallback: open wallet page
      Linking.openURL('/(wallet)/topup')
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Thanh toán</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.link}>Đóng</Text>
            </TouchableOpacity>
          </View>

          {(!post || !wallet) ? (
            <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 24 }} />
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.meta}>Số dư ví: {(wallet.balance ?? wallet.Balance ?? 0).toLocaleString('vi-VN')} đ</Text>
                <Text style={styles.meta}>Số tiền cần: {(post.offeredPrice ?? post.OfferedPrice ?? 0).toLocaleString('vi-VN')} đ</Text>
                {(() => {
                  const bal = Number(wallet?.balance ?? wallet?.Balance ?? 0)
                  const need = Number(post?.offeredPrice ?? post?.OfferedPrice ?? 0)
                  if (bal < need) {
                    return <Text style={{ color: '#DC2626', marginTop: 8 }}>Số dư không đủ. Vui lòng nạp thêm.</Text>
                  }
                  return null
                })()}

              <View style={{ marginTop: 16, flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose} disabled={loading}>
                  <Text style={styles.btnTextGhost}>Hủy</Text>
                </TouchableOpacity>
                {Number(wallet?.balance ?? wallet?.Balance ?? 0) < Number(post?.offeredPrice ?? post?.OfferedPrice ?? 0) ? (
                  <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleTopup} disabled={loading}>
                    <Text style={styles.btnTextGhost}>Nạp tiền</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handlePayNow} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Thanh toán bằng ví</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, maxHeight: '85%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  link: { color: '#0284C7', fontWeight: '700' },
  postTitle: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  meta: { color: '#6B7280', marginTop: 6 },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#0284C7' },
  btnSecondary: { backgroundColor: '#38BDF8' }, // Added secondary button style
  btnText: { color: '#fff', fontWeight: '700' },
  btnGhost: { backgroundColor: '#F3F4F6' },
  btnTextGhost: { color: '#374151', fontWeight: '700' }
})

export default InlinePostPaymentModal
