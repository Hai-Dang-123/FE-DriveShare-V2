import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ekycService, MyDocumentsResponseDTO, DocumentDetailDTO } from '@/services/ekycService';

// --- COLORS & CONSTANTS ---
const COLORS = {
  primary: '#0EA5E9',    // Sky Blue
  secondary: '#0284C7',  // Darker Blue
  bg: '#F8FAFC',         // Slate 50
  card: '#FFFFFF',
  textMain: '#0F172A',   // Slate 900
  textSub: '#64748B',    // Slate 500
  border: '#E2E8F0',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  inactive: '#94A3B8',
  errorBg: '#FEF2F2',
  successBg: '#ECFDF5',
  warningBg: '#FFFBEB',
};

const { width } = Dimensions.get('window');

const MyDocumentsScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<MyDocumentsResponseDTO | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await ekycService.getMyDocuments();
      if (response.isSuccess && response.result) {
        setDocuments(response.result);
      } else {
        // Fallback data for testing UI if API fails (Optional)
        // console.log(response.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReview = async () => {
    if (!selectedDocId) return;
    if (!reviewNote.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập lý do yêu cầu xét duyệt');
      return;
    }

    try {
      setSendingRequest(true);
      const response = await ekycService.requestManualReview({
        UserDocumentId: selectedDocId,
        UserNote: reviewNote.trim(),
      });

      if (response.isSuccess) {
        Alert.alert('Thành công', 'Đã gửi yêu cầu xét duyệt thành công. Vui lòng đợi staff xác nhận.');
        setShowReviewModal(false);
        setReviewNote('');
        setSelectedDocId(null);
        await loadDocuments(); // Reload to update status
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể gửi yêu cầu');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Đã có lỗi xảy ra');
    } finally {
      setSendingRequest(false);
    }
  };

  // --- HELPER COMPONENTS ---

  // 1. Info Row Item (Hiển thị thông tin dạng key-value đẹp)
  const InfoItem = ({ icon, label, value, isFullWidth = false }: any) => (
    <View style={[styles.infoItem, isFullWidth ? { width: '100%' } : { width: '48%' }]}>
      <View style={styles.infoLabelContainer}>
        <Feather name={icon} size={14} color={COLORS.textSub} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={2}>{value || '---'}</Text>
    </View>
  );

  // 2. Status Badge (Thanh trạng thái)
  const StatusBanner = ({ status }: { status: string }) => {
    let config = { color: COLORS.inactive, bg: COLORS.bg, icon: 'minus-circle', text: 'Chưa cập nhật' };
    
    if (status === 'ACTIVE') {
      config = { color: COLORS.success, bg: COLORS.successBg, icon: 'check-circle', text: 'Đã xác thực' };
    } else if (status === 'REJECTED' || status === 'INACTIVE') { 
      // INACTIVE mà có reason thì coi như bị từ chối/chưa đạt
      config = { color: COLORS.error, bg: COLORS.errorBg, icon: 'alert-circle', text: 'Chưa đạt / Bị từ chối' };
    } else if (status === 'PENDING' || status === 'PENDING_REVIEW') {
      config = { color: COLORS.warning, bg: COLORS.warningBg, icon: 'clock', text: 'Đang chờ duyệt' };
    }

    return (
      <View style={[styles.statusBanner, { backgroundColor: config.bg, borderColor: config.color }]}>
        <Feather name={config.icon as any} size={16} color={config.color} />
        <Text style={[styles.statusBannerText, { color: config.color }]}>{config.text}</Text>
      </View>
    );
  };

  // 3. Document Card (Component chính)
  const DocumentCard = ({ doc, type }: { doc: DocumentDetailDTO | null, type: 'CCCD' | 'GPLX' }) => {
    const isCCCD = type === 'CCCD';
    const title = isCCCD ? 'Căn cước công dân' : 'Giấy phép lái xe';
    const mainIcon = isCCCD ? 'card-account-details-outline' : 'car';
    
    const handlePress = () => {
        if (type === 'CCCD') router.push('/owner/verify-cccd' as any);
        else router.push('/owner/verify-license' as any);
    };

    if (!doc) {
      return (
        <TouchableOpacity style={styles.emptyCard} onPress={handlePress} activeOpacity={0.8}>
          <View style={styles.dashedBorder}>
            <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name={mainIcon} size={32} color={COLORS.textSub} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có {title}</Text>
            <Text style={styles.emptySub}>Chạm để tải lên ngay</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                <MaterialCommunityIcons name={mainIcon} size={22} color={COLORS.primary} />
            </View>
            <View>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardId}>#{doc.identityNumber || 'N/A'}</Text>
            </View>
          </View>
          <StatusBanner status={doc.status} />
        </View>

        <View style={styles.divider} />

        {/* Images Gallery */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryContainer}>
            {[
                { uri: doc.frontImageUrl, label: 'Mặt trước' },
                { uri: doc.backImageUrl, label: 'Mặt sau' },
                
            ].map((img, idx) => (
                img.uri ? (
                    <View key={idx} style={styles.imageWrapper}>
                        <Image source={{ uri: img.uri }} style={styles.docImage} />
                        <View style={styles.imageBadge}>
                            <Text style={styles.imageBadgeText}>{img.label}</Text>
                        </View>
                    </View>
                ) : null
            ))}
        </ScrollView>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
            <InfoItem icon="user" label="Họ và tên" value={doc.fullName} isFullWidth />
            {/* <InfoItem icon="calendar" label="Ngày sinh" value={doc.dateOfBirth ? new Date(doc.dateOfBirth).toLocaleDateString('vi-VN') : null} />
            {isCCCD ? (
                 <InfoItem icon="map-pin" label="Nơi cấp" value={doc.issuePlace} /> // Giả sử DTO có
            ) : (
                 <InfoItem icon="award" label="Hạng bằng" value={doc.licenseClass} />
            )}
            <InfoItem icon="clock" label="Ngày cấp" value={doc.issueDate ? new Date(doc.issueDate).toLocaleDateString('vi-VN') : null} /> */}
            {/* <InfoItem icon="alert-circle" label="Hết hạn" value={doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString('vi-VN') : 'Không thời hạn'} /> */}
        </View>

        {/* Rejection / Analysis Box */}
        {(doc.status === 'REJECTED' || doc.status === 'INACTIVE') && doc.rejectionReason && (
            <View style={styles.errorBox}>
                <View style={styles.errorHeader}>
                    <Feather name="alert-triangle" size={16} color={COLORS.error} />
                    <Text style={styles.errorTitle}>Kết quả phân tích</Text>
                </View>
                <Text style={styles.errorText}>{doc.rejectionReason}</Text>
            </View>
        )}

        {/* Action Button - Always show for non-ACTIVE status */}
        {doc.status !== 'ACTIVE' ? (
            <View style={{ gap: 10, marginTop: 16 }}>
                <TouchableOpacity style={styles.fixButton} onPress={handlePress}>
                    <Text style={styles.fixButtonText}>
                        {doc.rejectionReason ? 'Cập nhật lại ngay' : 'Xác thực ngay'}
                    </Text>
                    <Feather name="chevron-right" size={16} color="#FFF" />
                </TouchableOpacity>
                {doc.status !== 'PENDING' && doc.status !== 'PENDING_REVIEW' && doc.userDocumentId && (
                    <TouchableOpacity 
                        style={styles.requestReviewButton} 
                        onPress={() => {
                            setSelectedDocId(doc.userDocumentId!);
                            setShowReviewModal(true);
                        }}
                    >
                        <Feather name="send" size={16} color={COLORS.primary} />
                        <Text style={styles.requestReviewButtonText}>Yêu cầu Staff xét duyệt</Text>
                    </TouchableOpacity>
                )}
            </View>
        ) : (
            <TouchableOpacity style={styles.updateButton} onPress={handlePress}>
                <Feather name="edit-3" size={16} color={COLORS.primary} />
                <Text style={styles.updateButtonText}>Cập nhật giấy tờ</Text>
            </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textSub }}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Hồ sơ của tôi</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* User Summary (Optional) */}
        {/* <View style={styles.summaryContainer}>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.userName}>{documents?.cccd?.fullName || 'Người dùng'}</Text>
            <Text style={styles.userRole}>
                {documents?.isDriver ? 'Tài xế đối tác' : 'Chủ xe / Khách hàng'}
            </Text>
        </View> */}

        <Text style={styles.sectionTitle}>Giấy tờ tùy thân</Text>
        <DocumentCard doc={documents?.cccd || null} type="CCCD" />

        {documents?.isDriver && (
            <>
                <Text style={styles.sectionTitle}>Giấy tờ hành nghề</Text>
                <DocumentCard doc={documents?.driverDocuments?.drivingLicense || null} type="GPLX" />
            </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Review Request Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Yêu cầu xét duyệt thủ công</Text>
                <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                  <Feather name="x" size={24} color={COLORS.textMain} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDescription}>
                Vui lòng mô tả lý do bạn muốn staff xét duyệt lại tài liệu này:
              </Text>

              <TextInput
                style={styles.modalTextArea}
                placeholder="Ví dụ: Ảnh bị mờ do điều kiện ánh sáng, xin được duyệt thủ công..."
                placeholderTextColor={COLORS.textSub}
                multiline
                numberOfLines={4}
                value={reviewNote}
                onChangeText={setReviewNote}
                maxLength={500}
              />

              <Text style={styles.charCount}>{reviewNote.length}/500</Text>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalCancelBtn} 
                  onPress={() => {
                    setShowReviewModal(false);
                    setReviewNote('');
                    setSelectedDocId(null);
                  }}
                >
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalSubmitBtn, sendingRequest && { opacity: 0.6 }]} 
                  onPress={handleRequestReview}
                  disabled={sendingRequest}
                >
                  {sendingRequest ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Gửi yêu cầu</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Very light gray
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#F8FAFC',
    zIndex: 10,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  // Summary
  summaryContainer: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSub,
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textMain,
    marginTop: 4,
  },
  userRole: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSub,
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // CARD STYLES
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  cardId: {
    fontSize: 13,
    color: COLORS.textSub,
    marginTop: 2,
    fontWeight: '500',
  },
  
  // Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  statusBannerText: {
    fontSize: 11,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },

  // Gallery
  galleryContainer: {
    gap: 12,
    marginBottom: 20,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docImage: {
    width: 140,
    height: 90,
    resizeMode: 'cover',
  },
  imageBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  imageBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },

  // Details Grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  infoItem: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSub,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },

  // Error Box
  errorBox: {
    marginTop: 20,
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.error,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 20,
    marginBottom: 12,
  },
  fixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    marginTop: 16,
  },
  fixButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Empty State
  emptyCard: {
    marginBottom: 20,
  },
  dashedBorder: {
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSub,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Update Button (for ACTIVE documents)
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  updateButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  // Request Review Button
  requestReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  requestReviewButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.textSub,
    marginBottom: 12,
    lineHeight: 20,
  },
  modalTextArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: COLORS.textMain,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSub,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSub,
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default MyDocumentsScreen;