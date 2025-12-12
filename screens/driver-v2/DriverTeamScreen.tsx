import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  Alert,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import ownerDriverLinkService, { DriverTeamInfoDTO } from '@/services/ownerDriverLinkService'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale/vi'

const DriverTeamScreen: React.FC = () => {
  const router = useRouter()
  const [teamInfo, setTeamInfo] = useState<DriverTeamInfoDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [ownerIdInput, setOwnerIdInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadTeamInfo()
  }, [])

  const loadTeamInfo = async () => {
    try {
      setLoading(true)
      const response = await ownerDriverLinkService.getMyTeamInfo()

      if (response.success) {
        if (response.data) {
          setTeamInfo(response.data)
          setShowJoinForm(false)
        } else {
          // Chưa thuộc đội nào
          setTeamInfo(null)
          setShowJoinForm(true)
        }
        setError(null)
      } else {
        setError(response.error || 'Không thể tải thông tin')
      }
    } catch (err) {
      setError('Lỗi kết nối')
      console.error('Load team info error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRequest = async () => {
    if (!ownerIdInput.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập ID chủ xe')
      return
    }

    try {
      setSubmitting(true)
      const response = await ownerDriverLinkService.createJoinRequest({
        ownerId: ownerIdInput.trim(),
      })

      if (response.success) {
        Alert.alert('Thành công', response.message || 'Gửi yêu cầu thành công', [
          {
            text: 'OK',
            onPress: () => {
              setOwnerIdInput('')
              loadTeamInfo()
            },
          },
        ])
      } else {
        Alert.alert('Lỗi', response.error || 'Không thể gửi yêu cầu')
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi gửi yêu cầu')
      console.error('Join request error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  type StatusInfo = {
    text: string
    color: string
    bg: string
    icon: keyof typeof MaterialCommunityIcons.glyphMap
  }

  const getStatusInfo = (status: string): StatusInfo => {
    switch (status) {
      case 'APPROVED':
        return {
          text: 'Đang hoạt động',
          color: '#10B981',
          bg: '#D1FAE5',
          icon: 'check-circle',
        }
      case 'PENDING':
        return {
          text: 'Chờ duyệt',
          color: '#F59E0B',
          bg: '#FEF3C7',
          icon: 'clock-outline',
        }
      case 'REJECTED':
        return {
          text: 'Đã từ chối',
          color: '#EF4444',
          bg: '#FEE2E2',
          icon: 'close-circle',
        }
      default:
        return {
          text: status,
          color: '#6B7280',
          bg: '#F3F4F6',
          icon: 'help-circle',
        }
    }
  }

  // Render: Loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Đang tải thông tin đội xe...</Text>
      </View>
    )
  }

  // Render: Error
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTeamInfo}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Render: Join Form (Chưa thuộc đội nào)
  if (showJoinForm || !teamInfo) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.emptySection}>
          <MaterialCommunityIcons name="account-group-outline" size={80} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Chưa thuộc đội xe nào</Text>
          <Text style={styles.emptySubtitle}>
            Bạn có thể gửi yêu cầu gia nhập đội xe của chủ xe bằng cách nhập ID chủ xe bên dưới
          </Text>
        </View>

        <View style={styles.formSection}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Gửi yêu cầu gia nhập</Text>
            <Text style={styles.formDescription}>
              Nhập ID của chủ xe mà bạn muốn gia nhập. Yêu cầu sẽ được gửi và chờ chủ xe phê duyệt.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ID Chủ xe</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập ID chủ xe (GUID)"
                value={ownerIdInput}
                onChangeText={setOwnerIdInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.inputHint}>
                Ví dụ: 12345678-1234-1234-1234-123456789abc
              </Text>
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleJoinRequest}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Gửi yêu cầu</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    )
  }

  // Render: Team Info (Đã có đội xe)
  const statusInfo = getStatusInfo(teamInfo.status)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="account-group" size={40} color="#3B82F6" />
        </View>
        <Text style={styles.headerTitle}>Đội xe của tôi</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <MaterialCommunityIcons name={statusInfo.icon} size={16} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
        </View>
      </View>

      {/* Owner Info Card */}
      <View style={styles.infoSection}>
        <View style={styles.ownerCard}>
          <View style={styles.ownerHeader}>
            <View style={styles.avatarContainer}>
              {teamInfo.ownerAvatar ? (
                <Image source={{ uri: teamInfo.ownerAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <MaterialCommunityIcons name="account" size={32} color="#94A3B8" />
                </View>
              )}
            </View>

            <View style={styles.ownerInfo}>
              <Text style={styles.ownerLabel}>Chủ xe</Text>
              <Text style={styles.ownerName}>{teamInfo.ownerName}</Text>
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.contactSection}>
            <View style={styles.contactItem}>
              <MaterialCommunityIcons name="phone" size={18} color="#64748B" />
              <Text style={styles.contactText}>{teamInfo.ownerPhoneNumber}</Text>
            </View>

            <View style={styles.contactItem}>
              <MaterialCommunityIcons name="email" size={18} color="#64748B" />
              <Text style={styles.contactText}>{teamInfo.ownerEmail}</Text>
            </View>
          </View>
        </View>

        {/* Timeline Card */}
        <View style={styles.timelineCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="timeline-clock" size={20} color="#3B82F6" />
            <Text style={styles.cardTitle}>Lịch sử</Text>
          </View>

          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>Gửi yêu cầu</Text>
              <Text style={styles.timelineValue}>
                {format(new Date(teamInfo.requestedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
              </Text>
            </View>
          </View>

          {teamInfo.approvedAt && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#10B981' }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Phê duyệt</Text>
                <Text style={styles.timelineValue}>
                  {format(new Date(teamInfo.approvedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Info Box */}
        {teamInfo.status === 'PENDING' && (
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information" size={20} color="#3B82F6" />
            <Text style={styles.infoBoxText}>
              Yêu cầu của bạn đang chờ chủ xe phê duyệt. Bạn sẽ nhận được thông báo khi yêu cầu được
              xử lý.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptySection: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  formSection: {
    padding: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  formDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#1E293B',
  },
  inputHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSection: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    padding: 16,
    gap: 16,
  },
  ownerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerInfo: {
    flex: 1,
  },
  ownerLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  contactSection: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactText: {
    fontSize: 14,
    color: '#1E293B',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  timelineValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
})

export default DriverTeamScreen
