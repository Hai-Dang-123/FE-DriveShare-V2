import React, { useEffect, useState } from 'react'
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, ScrollView, SafeAreaView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import postPackageService from '@/services/postPackageService'
import contractTemplateService from '@/services/contractTemplateService'

const PostSignScreen: React.FC = () => {
  const params: any = useLocalSearchParams()
  const router = useRouter()
  const postId = params.postId as string | undefined
  const [loading, setLoading] = useState(false)
  const [post, setPost] = useState<any>(null)
  const [contractTemplate, setContractTemplate] = useState<any | null>(null)
  const [modalVisible, setModalVisible] = useState(true)

  useEffect(() => { if (postId) { fetchDetails(); fetchContract() } }, [postId])

  const fetchDetails = async () => {
    setLoading(true)
    try {
      const res: any = await postPackageService.getPostPackageDetails(postId!)
      setPost(res?.result ?? res)
    } catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  const fetchContract = async () => {
    try {
      const resp: any = await contractTemplateService.getLatestProviderContract()
      const tpl = resp?.result ?? resp
      setContractTemplate(tpl)
    } catch (e) { console.warn('fetchContract failed', e); setContractTemplate(null) }
  }

  const handleSign = async () => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn ký hợp đồng cho bài đăng này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xác nhận', onPress: async () => {
        setLoading(true)
        try {
          const upd: any = await postPackageService.updatePostStatus(postId!, 'AWAITING_PAYMENT')
          const ok = upd?.isSuccess ?? upd?.statusCode === 200
          if (!ok) throw new Error(upd?.message || 'Không thể cập nhật trạng thái')
          Alert.alert('Thành công', 'Đã ký hợp đồng. Mở giao diện thanh toán.')
          setModalVisible(false)
          router.back()
        } catch (e: any) { Alert.alert('Lỗi', e?.message || 'Thất bại') } finally { setLoading(false) }
      }}
    ])
  }

  return (
    <Modal visible={modalVisible} animationType="slide" onRequestClose={() => { setModalVisible(false); router.back() }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Ký hợp đồng</Text>
          <TouchableOpacity onPress={() => { setModalVisible(false); router.back() }}>
            <Text style={{ color: '#0284C7', fontWeight: '700' }}>Đóng</Text>
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 40 }} /> : (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>{post?.title}</Text>
            <Text style={{ color: '#6B7280', marginTop: 6 }}>ID: {postId}</Text>

            <View style={{ marginTop: 16, backgroundColor: '#fff', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontWeight: '700' }}>{contractTemplate?.contractTemplateName ?? 'Hợp đồng vận tải'}</Text>
              <Text style={{ color: '#6B7280', marginTop: 6 }}>Phiên bản: {contractTemplate?.version ?? 'N/A'}</Text>
              <View style={{ marginTop: 12 }}>
                {(contractTemplate?.contractTerms || []).map((t: any, idx: number) => (
                  <Text key={idx} style={{ marginBottom: 8 }}>{idx + 1}. {t.content}</Text>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.btnPrimary} onPress={handleSign} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Đang xử lý...' : 'Ký & Chuyển sang Thanh toán'}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 20, fontWeight: '700' },
  btnPrimary: { marginTop: 24, backgroundColor: '#0284C7', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' }
})

export default PostSignScreen
