import React, { useState, useEffect } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import walletService from '@/services/walletService'
import { formatVND } from '@/utils/currency'

const COLORS = {
  primary: '#0284C7',
  background: '#F3F4F6',
  white: '#FFFFFF',
  textMain: '#111827',
  textSec: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  infoBg: '#E0F2FE',
  infoText: '#0369A1'
}

interface Props {
  onBack?: () => void
  prefilledAmount?: string
}

export default function WalletOperationsScreen({ onBack, prefilledAmount = '' }: Props) {
  const [activeTab, setActiveTab] = useState<'topup' | 'withdraw'>('topup')
  const [wallet, setWallet] = useState<any>(null)
  const [loadingWallet, setLoadingWallet] = useState(false)
  const [amountInput, setAmountInput] = useState(prefilledAmount)
  const [description, setDescription] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchWallet()
  }, [])

  useEffect(() => {
    if (prefilledAmount) {
      setAmountInput(prefilledAmount)
    }
  }, [prefilledAmount])

  const fetchWallet = async () => {
    setLoadingWallet(true)
    try {
      const res: any = await walletService.getMyWallet()
      const walletData = res?.result ?? res
      setWallet(walletData)
    } catch (e) {
      console.warn(e)
    } finally {
      setLoadingWallet(false)
    }
  }

  const handleTopup = async () => {
    const amount = Math.floor(Number(amountInput || '0'))
    if (!amount || amount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ.')
      return
    }
    if (amount < 10000) {
      Alert.alert('Lỗi', 'Số tiền nạp tối thiểu là 10,000 VND.')
      return
    }

    setProcessing(true)
    try {
      const desc = description.trim() || 'Nạp tiền qua ứng dụng'
      const res: any = await walletService.topup(amount, desc)
      const ok = res?.isSuccess ?? res?.statusCode === 200
      if (!ok) throw new Error(res?.message || 'Nạp tiền thất bại')
      
      Alert.alert('Thành công', 'Nạp tiền vào ví thành công!', [
        { text: 'OK', onPress: () => {
          setAmountInput('')
          setDescription('')
          fetchWallet()
        }}
      ])
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể nạp tiền')
    } finally {
      setProcessing(false)
    }
  }

  const handleWithdraw = async () => {
    const amount = Math.floor(Number(amountInput || '0'))
    const balance = Number(wallet?.balance ?? wallet?.Balance ?? 0)
    
    if (!amount || amount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ.')
      return
    }
    if (amount < 10000) {
      Alert.alert('Lỗi', 'Số tiền rút tối thiểu là 10,000 VND.')
      return
    }
    if (amount > balance) {
      Alert.alert('Lỗi', 'Số dư không đủ để thực hiện giao dịch.')
      return
    }

    Alert.alert(
      'Xác nhận rút tiền',
      `Bạn muốn rút ${formatVND(amount)} VND từ ví?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xác nhận', onPress: () => processWithdraw(amount) }
      ]
    )
  }

  const processWithdraw = async (amount: number) => {
    setProcessing(true)
    try {
      const desc = description.trim() || 'Rút tiền qua ứng dụng'
      const res: any = await walletService.requestWithdrawal(amount, desc)
      const ok = res?.isSuccess ?? res?.statusCode === 200
      if (!ok) throw new Error(res?.message || 'Yêu cầu rút tiền thất bại')
      
      Alert.alert('Thành công', 'Yêu cầu rút tiền đã được gửi. Vui lòng chờ xét duyệt.', [
        { text: 'OK', onPress: () => {
          setAmountInput('')
          setDescription('')
          fetchWallet()
        }}
      ])
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể rút tiền')
    } finally {
      setProcessing(false)
    }
  }

  const quickAmounts = [50000, 100000, 200000, 500000, 1000000]

  const renderQuickButtons = () => (
    <View style={styles.quickButtonsContainer}>
      <Text style={styles.quickLabel}>Chọn nhanh:</Text>
      <View style={styles.quickButtons}>
        {quickAmounts.map((amt) => (
          <TouchableOpacity
            key={amt}
            style={[
              styles.quickBtn,
              Number(amountInput) === amt && styles.quickBtnActive
            ]}
            onPress={() => setAmountInput(String(amt))}
          >
            <Text style={[
              styles.quickBtnText,
              Number(amountInput) === amt && styles.quickBtnTextActive
            ]}>
              {formatVND(amt)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={onBack} 
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản Lý Ví</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Wallet Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Ionicons name="wallet" size={24} color={COLORS.primary} />
              <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
            </View>
            {loadingWallet ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 8 }} />
            ) : (
              <Text style={styles.balanceAmount}>
                {wallet ? formatVND(Number(wallet.balance ?? wallet.Balance ?? 0)) : '---'} đ
              </Text>
            )}
            <TouchableOpacity onPress={fetchWallet} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={16} color={COLORS.primary} />
              <Text style={styles.refreshText}>Làm mới</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'topup' && styles.activeTab]}
              onPress={() => setActiveTab('topup')}
            >
              <MaterialCommunityIcons 
                name="plus-circle" 
                size={20} 
                color={activeTab === 'topup' ? COLORS.primary : COLORS.textSec} 
              />
              <Text style={[styles.tabText, activeTab === 'topup' && styles.activeTabText]}>
                Nạp tiền
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'withdraw' && styles.activeTab]}
              onPress={() => setActiveTab('withdraw')}
            >
              <MaterialCommunityIcons 
                name="minus-circle" 
                size={20} 
                color={activeTab === 'withdraw' ? COLORS.danger : COLORS.textSec} 
              />
              <Text style={[styles.tabText, activeTab === 'withdraw' && styles.activeTabText]}>
                Rút tiền
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Info Banner */}
            <View style={[styles.infoBanner, activeTab === 'withdraw' && { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
              <Ionicons 
                name={activeTab === 'topup' ? 'information-circle' : 'alert-circle'} 
                size={20} 
                color={activeTab === 'topup' ? COLORS.infoText : COLORS.danger} 
              />
              <Text style={[styles.infoText, activeTab === 'withdraw' && { color: '#991B1B' }]}>
                {activeTab === 'topup' 
                  ? 'Số tiền sẽ được cộng vào ví ngay lập tức.' 
                  : 'Yêu cầu rút tiền sẽ được xét duyệt trong 1-3 ngày làm việc.'}
              </Text>
            </View>

            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số tiền {activeTab === 'topup' ? 'nạp' : 'rút'}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số tiền"
                  keyboardType="numeric"
                  value={amountInput}
                  onChangeText={setAmountInput}
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.inputSuffix}>VND</Text>
              </View>
              {amountInput && Number(amountInput) > 0 && (
                <Text style={styles.inputHint}>
                  = {formatVND(Number(amountInput))} đồng
                </Text>
              )}
            </View>

            {/* Quick Amount Buttons */}
            {renderQuickButtons()}

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ghi chú (tùy chọn)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={activeTab === 'topup' ? 'Nạp tiền cho...' : 'Rút tiền để...'}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                activeTab === 'withdraw' && styles.withdrawBtn,
                processing && styles.btnDisabled
              ]}
              onPress={activeTab === 'topup' ? handleTopup : handleWithdraw}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <MaterialCommunityIcons 
                    name={activeTab === 'topup' ? 'plus-circle' : 'minus-circle'} 
                    size={20} 
                    color={COLORS.white} 
                  />
                  <Text style={styles.actionBtnText}>
                    {activeTab === 'topup' ? 'XÁC NHẬN NẠP TIỀN' : 'XÁC NHẬN RÚT TIỀN'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Important Notes */}
          <View style={styles.notesContainer}>
            <Text style={styles.notesTitle}>Lưu ý:</Text>
            {activeTab === 'topup' ? (
              <>
                <Text style={styles.noteItem}>• Số tiền nạp tối thiểu: 10,000 VND</Text>
                <Text style={styles.noteItem}>• Tiền sẽ được cộng vào ví ngay lập tức</Text>
                <Text style={styles.noteItem}>• Giao dịch nạp tiền không thể hoàn tác</Text>
              </>
            ) : (
              <>
                <Text style={styles.noteItem}>• Số tiền rút tối thiểu: 10,000 VND</Text>
                <Text style={styles.noteItem}>• Yêu cầu rút tiền cần được xét duyệt</Text>
                <Text style={styles.noteItem}>• Thời gian xử lý: 1-3 ngày làm việc</Text>
                <Text style={styles.noteItem}>• Phí rút tiền: 0 VND (nếu có thay đổi sẽ thông báo)</Text>
              </>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderColor: COLORS.border
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMain },
  backBtn: { 
    padding: 8,
    marginLeft: -8,
    borderRadius: 8,
  },
  headerRight: { width: 40 },
  iconBtn: { padding: 4 },

  // Content
  scrollContent: { padding: 16 },

  // Balance Card
  balanceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  balanceLabel: {
    fontSize: 14,
    color: COLORS.textSec,
    marginLeft: 8,
    fontWeight: '500'
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: COLORS.infoBg
  },
  refreshText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '600'
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6
  },
  activeTab: {
    backgroundColor: '#F0F9FF',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSec
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '700'
  },

  // Form
  formContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.infoBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 8
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#0C4A6E',
    lineHeight: 18
  },

  // Input
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 8
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textMain,
    paddingVertical: 12
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSec,
    marginLeft: 8
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.textSec,
    marginTop: 4,
    fontStyle: 'italic'
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingTop: 12,
    height: 80,
    textAlignVertical: 'top'
  },

  // Quick Buttons
  quickButtonsContainer: { marginBottom: 20 },
  quickLabel: {
    fontSize: 13,
    color: COLORS.textSec,
    marginBottom: 8,
    fontWeight: '500'
  },
  quickButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  quickBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white
  },
  quickBtnActive: {
    backgroundColor: COLORS.infoBg,
    borderColor: COLORS.primary
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSec
  },
  quickBtnTextActive: {
    color: COLORS.primary
  },

  // Action Button
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  withdrawBtn: {
    backgroundColor: COLORS.danger,
    shadowColor: COLORS.danger
  },
  btnDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700'
  },

  // Notes
  notesContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7'
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8
  },
  noteItem: {
    fontSize: 12,
    color: '#78350F',
    marginBottom: 4,
    lineHeight: 18
  }
})
