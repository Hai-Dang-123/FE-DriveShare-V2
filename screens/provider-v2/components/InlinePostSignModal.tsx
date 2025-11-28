import React, { useEffect, useState } from 'react'
import { Modal, SafeAreaView, View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native'
import postService from '@/services/postService'
import contractTemplateService from '@/services/contractTemplateService'
import { Linking } from 'react-native'

// We will try to render HTML/PDF via WebView if available. If not, fall back to an external link.
let WebView: any = null
try {
  // dynamic import to avoid hard dependency
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebView = require('react-native-webview').WebView
} catch (e) {
  WebView = null
}

interface Props {
  visible: boolean
  postId?: string | null
  onClose: () => void
  onDone?: () => void
}

const InlinePostSignModal: React.FC<Props> = ({ visible, postId, onClose, onDone }) => {
  const [loading, setLoading] = useState(false)
  const [post, setPost] = useState<any>(null)
  const [contractTemplate, setContractTemplate] = useState<any | null>(null)

  useEffect(() => {
    if (visible && postId) {
      fetchDetails()
      fetchContract()
    }
    if (!visible) {
      setPost(null)
      setContractTemplate(null)
    }
  }, [visible, postId])

  const fetchDetails = async () => {
    try {
      const res: any = await postService.getPostPackageDetails(postId!)
      setPost(res?.result ?? res)
    } catch (e) { console.warn(e) }
  }

  const fetchContract = async () => {
    try {
      const resp: any = await contractTemplateService.getLatestProviderContract()
      setContractTemplate(resp?.result ?? resp)
    } catch (e) { console.warn(e) }
  }

  const handleSign = async () => {
    if (!postId) return
    setLoading(true)
    try {
      const upd: any = await postService.updatePostStatus(postId, 'AWAITING_PAYMENT')
      const ok = upd?.isSuccess ?? upd?.statusCode === 200
      if (!ok) throw new Error(upd?.message || 'Không thể cập nhật trạng thái')
      onDone?.()
      onClose()
    } catch (e: any) {
      alert(e?.message || 'Thất bại')
    } finally {
      setLoading(false)
    }
  }

  const openContractExternally = () => {
    const url = contractTemplate?.fileUrl || contractTemplate?.fileUrl
    if (url) Linking.openURL(url)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Ký hợp đồng</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.link}>Đóng</Text>
            </TouchableOpacity>
          </View>

          {(!post) ? (
            <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 24 }} />
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.meta}>ID: {postId}</Text>

                <View style={styles.contractBox}>
                  <Text style={styles.contractTitle}>{contractTemplate?.contractTemplateName ?? 'Hợp đồng vận tải'}</Text>
                  <Text style={styles.contractVersion}>Phiên bản: {contractTemplate?.version ?? 'N/A'}</Text>

                  {/* If HTML content exists and WebView is available, render it inline */}
                  {contractTemplate?.htmlContent && WebView ? (
                    <View style={{ height: 300, marginTop: 10 }}>
                      <WebView originWhitelist={["*"]} source={{ html: contractTemplate.htmlContent }} />
                    </View>
                  ) : contractTemplate?.fileUrl ? (
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ color: '#6B7280', marginBottom: 8 }}>Hợp đồng có file đính kèm.</Text>
                      <TouchableOpacity onPress={openContractExternally}><Text style={{ color: '#0284C7' }}>Mở hợp đồng</Text></TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ marginTop: 10 }}>
                      {(contractTemplate?.contractTerms || []).map((t: any, i: number) => (
                        <Text key={i} style={styles.term}>{i + 1}. {t.content}</Text>
                      ))}
                    </View>
                  )}

                </View>

                <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
                  <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose} disabled={loading}>
                    <Text style={styles.btnTextGhost}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleSign} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Ký & Chuyển sang Thanh toán</Text>}
                  </TouchableOpacity>
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
  contractBox: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, marginTop: 12 },
  contractTitle: { fontWeight: '700' },
  contractVersion: { color: '#6B7280', marginTop: 6 },
  term: { marginTop: 8, color: '#374151' },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#0284C7' },
  btnText: { color: '#fff', fontWeight: '700' },
  btnGhost: { backgroundColor: '#F3F4F6' },
  btnTextGhost: { color: '#374151', fontWeight: '700' }
})

export default InlinePostSignModal
