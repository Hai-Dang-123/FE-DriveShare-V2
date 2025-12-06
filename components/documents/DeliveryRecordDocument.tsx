import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DeliveryRecordTerm {
  deliveryRecordTermId: string;
  content: string;
  displayOrder: number;
}

interface Contact {
  tripContactId: string;
  type: 'SENDER' | 'RECEIVER';
  fullName: string;
  phoneNumber: string;
  note: string | null;
}

interface Driver {
  driverId: string;
  fullName: string;
  type: string; // 'PRIMARY' | 'SECONDARY' but accept string for flexibility
}

interface Surcharge {
  tripSurchargeId: string;
  type: string;
  amount: number;
  description: string;
  status: string;
}

interface DeliveryIssue {
  tripDeliveryIssueId: string;
  issueType: string;
  description: string;
  status: string;
  createdAt: string;
  imageUrls: string[];
  surcharges?: Surcharge[];
}

interface DeliveryRecordDocumentProps {
  recordType: 'PICKUP' | 'DROPOFF';
  note: string;
  createAt: string;
  terms: DeliveryRecordTerm[];
  driver: Driver;
  contact: Contact;
  driverSigned: boolean | null;
  driverSignedAt: string | null;
  contactSigned: boolean | null;
  contactSignedAt: string | null;
  status: string;
  tripCode?: string;
  vehiclePlate?: string;
  ownerCompany?: string;
  packages?: Array<{
    packageCode: string;
    weight: number;
    volume: number;
  }>;
  issues?: DeliveryIssue[];
}

export const DeliveryRecordDocument: React.FC<DeliveryRecordDocumentProps> = ({
  recordType,
  note,
  createAt,
  terms,
  issues = [],
  driver,
  contact,
  driverSigned,
  driverSignedAt,
  contactSigned,
  contactSignedAt,
  status,
  tripCode,
  vehiclePlate,
  ownerCompany,
  packages,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `Ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')} - ${formatDate(dateString)}`;
  };

  const getRecordTitle = () => {
    return recordType === 'PICKUP'
      ? 'BIÊN BẢN BÀN GIAO HÀNG HÓA'
      : 'BIÊN BẢN GIAO NHẬN HÀNG HÓA';
  };

  const getRecordSubtitle = () => {
    return recordType === 'PICKUP'
      ? '(Bên giao hàng → Tài xế)'
      : '(Tài xế → Bên nhận hàng)';
  };

  const getDriverTypeText = (type: string) => {
    return type.toUpperCase() === 'PRIMARY' ? 'Tài xế chính' : 'Tài xế phụ';
  };

  const getIssueTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DAMAGED: 'Hàng hư hỏng',
      LOST: 'Thiếu hàng',
      LATE: 'Giao trễ',
      WRONG_ITEM: 'Sai hàng'
    };
    return labels[type] || type;
  };

  const getIssueTypeStyle = (type: string) => {
    const styles: Record<string, any> = {
      DAMAGED: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
      LOST: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
      LATE: { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' },
      WRONG_ITEM: { backgroundColor: '#FCE7F3', borderColor: '#EC4899' }
    };
    return styles[type] || { backgroundColor: '#F3F4F6', borderColor: '#9CA3AF' };
  };

  const getIssueStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      REPORTED: 'Đã báo cáo',
      RESOLVED: 'Đã xử lý',
      REJECTED: 'Từ chối'
    };
    return labels[status] || status;
  };

  const getIssueStatusStyle = (status: string) => {
    const styles: Record<string, any> = {
      REPORTED: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
      RESOLVED: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
      REJECTED: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }
    };
    return styles[status] || { backgroundColor: '#F3F4F6', borderColor: '#9CA3AF' };
  };

  const getSurchargeStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Chờ duyệt',
      APPROVED: 'Đã duyệt',
      REJECTED: 'Từ chối'
    };
    return labels[status] || status;
  };

  const getSurchargeStatusStyle = (status: string) => {
    const styles: Record<string, any> = {
      PENDING: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
      APPROVED: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
      REJECTED: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }
    };
    return styles[status] || { backgroundColor: '#F3F4F6', borderColor: '#9CA3AF' };
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' VNĐ';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerCompany}>{ownerCompany || 'DRIVESHARE'}</Text>
          <Text style={styles.headerSubtext}>Hệ thống vận tải thông minh</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerCountry}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
          <Text style={styles.headerMotto}>Độc lập - Tự do - Hạnh phúc</Text>
          <Text style={styles.headerLine}>————————</Text>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>{getRecordTitle()}</Text>
        <Text style={styles.subtitle}>{getRecordSubtitle()}</Text>
      </View>

      {/* Date and Location */}
      <View style={styles.dateSection}>
        <Text style={styles.dateText}>{formatDate(createAt)}</Text>
      </View>

      {/* Trip Info */}
      {tripCode && (
        <View style={styles.tripSection}>
          <Text style={styles.sectionTitle}>THÔNG TIN CHUYẾN ĐI:</Text>
          <Text style={styles.tripInfo}>• Mã chuyến: {tripCode}</Text>
          {vehiclePlate && <Text style={styles.tripInfo}>• Biển số xe: {vehiclePlate}</Text>}
        </View>
      )}

      {/* Parties */}
      <View style={styles.partiesSection}>
        <View style={styles.party}>
          <Text style={styles.partyTitle}>
            {recordType === 'PICKUP' ? 'BÊN GIAO HÀNG:' : 'TÀI XẾ VẬN CHUYỂN:'}
          </Text>
          {recordType === 'PICKUP' ? (
            <>
              <Text style={styles.partyInfo}>Họ tên: {contact.fullName}</Text>
              <Text style={styles.partyInfo}>SĐT: {contact.phoneNumber}</Text>
              {contact.note && <Text style={styles.partyInfo}>Ghi chú: {contact.note}</Text>}
            </>
          ) : (
            <>
              <Text style={styles.partyInfo}>Họ tên: {driver.fullName}</Text>
              <Text style={styles.partyInfo}>Loại: {getDriverTypeText(driver.type)}</Text>
            </>
          )}
        </View>

        <View style={styles.party}>
          <Text style={styles.partyTitle}>
            {recordType === 'PICKUP' ? 'TÀI XẾ NHẬN HÀNG:' : 'BÊN NHẬN HÀNG:'}
          </Text>
          {recordType === 'PICKUP' ? (
            <>
              <Text style={styles.partyInfo}>Họ tên: {driver.fullName}</Text>
              <Text style={styles.partyInfo}>Loại: {getDriverTypeText(driver.type)}</Text>
            </>
          ) : (
            <>
              <Text style={styles.partyInfo}>Họ tên: {contact.fullName}</Text>
              <Text style={styles.partyInfo}>SĐT: {contact.phoneNumber}</Text>
              {contact.note && <Text style={styles.partyInfo}>Ghi chú: {contact.note}</Text>}
            </>
          )}
        </View>
      </View>

      {/* Package Info */}
      {packages && packages.length > 0 && (
        <View style={styles.packageSection}>
          <Text style={styles.sectionTitle}>THÔNG TIN HÀNG HÓA:</Text>
          {packages.map((pkg, index) => (
            <View key={pkg.packageCode} style={styles.packageItem}>
              <Text style={styles.packageInfo}>Kiện {index + 1}: {pkg.packageCode}</Text>
              <Text style={styles.packageInfo}>  - Khối lượng: {pkg.weight} kg</Text>
              <Text style={styles.packageInfo}>  - Thể tích: {pkg.volume} m³</Text>
            </View>
          ))}
        </View>
      )}

      {/* Terms */}
      <View style={styles.termsSection}>
        <Text style={styles.sectionTitle}>NỘI DUNG XÁC NHẬN:</Text>
        {terms.sort((a, b) => a.displayOrder - b.displayOrder).map((term, index) => (
          <View key={term.deliveryRecordTermId} style={styles.term}>
            <Text style={styles.termNumber}>{index + 1}.</Text>
            <Text style={styles.termContent}>{term.content}</Text>
          </View>
        ))}
      </View>

      {/* Issues Section - Show reported issues */}
      {issues && issues.length > 0 && (
        <View style={styles.issuesSection}>
          <Text style={styles.issuesSectionTitle}>⚠️ SỰ CỐ ĐÃ BÁO CÁO:</Text>
          {issues.map((issue, index) => (
            <View key={issue.tripDeliveryIssueId} style={styles.issueItem}>
              <View style={styles.issueHeader}>
                <Text style={styles.issueNumber}>#{index + 1}</Text>
                <View style={[styles.issueTypeBadge, getIssueTypeStyle(issue.issueType)]}>
                  <Text style={styles.issueTypeText}>{getIssueTypeLabel(issue.issueType)}</Text>
                </View>
                <View style={[styles.issueStatusBadge, getIssueStatusStyle(issue.status)]}>
                  <Text style={styles.issueStatusText}>{getIssueStatusLabel(issue.status)}</Text>
                </View>
              </View>
              <Text style={styles.issueDescription}>{issue.description}</Text>
              <Text style={styles.issueTime}>
                Báo cáo lúc: {new Date(issue.createdAt).toLocaleString('vi-VN')}
              </Text>
              {issue.imageUrls && issue.imageUrls.length > 0 && (
                <Text style={styles.issueImages}>📷 Có {issue.imageUrls.length} ảnh minh chứng</Text>
              )}
              
              {/* Surcharges/Compensation Display */}
              {issue.surcharges && issue.surcharges.length > 0 && (
                <View style={styles.surchargesContainer}>
                  <Text style={styles.surchargesTitle}>💰 Yêu cầu bồi thường:</Text>
                  {issue.surcharges.map((surcharge) => (
                    <View key={surcharge.tripSurchargeId} style={styles.surchargeItem}>
                      <View style={styles.surchargeHeader}>
                        <Text style={styles.surchargeAmount}>{formatCurrency(surcharge.amount)}</Text>
                        <View style={[styles.surchargeStatusBadge, getSurchargeStatusStyle(surcharge.status)]}>
                          <Text style={styles.surchargeStatusText}>
                            {getSurchargeStatusLabel(surcharge.status)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.surchargeDescription}>{surcharge.description}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Note */}
      {note && (
        <View style={styles.noteSection}>
          <Text style={styles.noteTitle}>Ghi chú:</Text>
          <Text style={styles.noteText}>{note}</Text>
        </View>
      )}

      {/* Signatures */}
      <View style={styles.signatureSection}>
        <View style={styles.signatureBox}>
          <Text style={styles.signatureTitle}>
            {recordType === 'PICKUP' ? 'BÊN GIAO' : 'TÀI XẾ'}
          </Text>
          <Text style={styles.signatureName}>
            {recordType === 'PICKUP' ? contact.fullName : driver.fullName}
          </Text>
          {recordType === 'PICKUP' ? (
            <>
              {contactSigned && contactSignedAt && (
                <Text style={styles.signatureDate}>{formatDateTime(contactSignedAt)}</Text>
              )}
              {contactSigned ? (
                <Text style={styles.signedText}>✓ Đã ký</Text>
              ) : (
                <Text style={styles.unsignedText}>(Chưa ký)</Text>
              )}
            </>
          ) : (
            <>
              {driverSigned && driverSignedAt && (
                <Text style={styles.signatureDate}>{formatDateTime(driverSignedAt)}</Text>
              )}
              {driverSigned ? (
                <Text style={styles.signedText}>✓ Đã ký</Text>
              ) : (
                <Text style={styles.unsignedText}>(Chưa ký)</Text>
              )}
            </>
          )}
        </View>

        <View style={styles.signatureBox}>
          <Text style={styles.signatureTitle}>
            {recordType === 'PICKUP' ? 'TÀI XẾ' : 'BÊN NHẬN'}
          </Text>
          <Text style={styles.signatureName}>
            {recordType === 'PICKUP' ? driver.fullName : contact.fullName}
          </Text>
          {recordType === 'PICKUP' ? (
            <>
              {driverSigned && driverSignedAt && (
                <Text style={styles.signatureDate}>{formatDateTime(driverSignedAt)}</Text>
              )}
              {driverSigned ? (
                <Text style={styles.signedText}>✓ Đã ký</Text>
              ) : (
                <Text style={styles.unsignedText}>(Chưa ký)</Text>
              )}
            </>
          ) : (
            <>
              {contactSigned && contactSignedAt && (
                <Text style={styles.signatureDate}>{formatDateTime(contactSignedAt)}</Text>
              )}
              {contactSigned ? (
                <Text style={styles.signedText}>✓ Đã ký</Text>
              ) : (
                <Text style={styles.unsignedText}>(Chưa ký)</Text>
              )}
            </>
          )}
        </View>
      </View>

      {/* Status Badge */}
      <View style={[styles.statusBadge, status === 'PENDING' ? styles.statusPending : styles.statusCompleted]}>
        <Text style={styles.statusText}>
          {status === 'PENDING' ? '⏳ Chờ ký' : '✓ Đã hoàn thành'}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Biên bản được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderWidth: 2,
    borderColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerCompany: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  headerSubtext: {
    fontSize: 10,
    marginTop: 2,
    color: '#6B7280',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerCountry: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  headerMotto: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  headerLine: {
    fontSize: 10,
    marginTop: 2,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#6B7280',
  },
  dateSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  tripSection: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tripInfo: {
    fontSize: 11,
    marginBottom: 4,
  },
  partiesSection: {
    marginBottom: 16,
  },
  party: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 6,
  },
  partyTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  partyInfo: {
    fontSize: 11,
    marginBottom: 2,
  },
  packageSection: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
  },
  packageItem: {
    marginBottom: 6,
  },
  packageInfo: {
    fontSize: 11,
    marginBottom: 2,
  },
  termsSection: {
    marginBottom: 16,
  },
  term: {
    flexDirection: 'row',
    marginBottom: 8,
    marginLeft: 8,
  },
  termNumber: {
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 8,
  },
  termContent: {
    fontSize: 11,
    lineHeight: 18,
    flex: 1,
  },
  noteSection: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
  noteTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  signatureBox: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginHorizontal: 4,
  },
  signatureTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  signatureName: {
    fontSize: 11,
    marginBottom: 4,
  },
  signatureDate: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 8,
  },
  signedText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: 'bold',
  },
  unsignedText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  statusBadge: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 12,
  },
  footerText: {
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Issues Styles
  issuesSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  issuesSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 12,
  },
  issueItem: {
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  issueNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  issueTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  issueTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  issueStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  issueStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  issueDescription: {
    fontSize: 11,
    color: '#111827',
    marginBottom: 4,
    lineHeight: 16,
  },
  issueTime: {
    fontSize: 9,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  issueImages: {
    fontSize: 9,
    color: '#3B82F6',
    fontWeight: '600',
  },
  // Surcharges Styles
  surchargesContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  surchargesTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 6,
  },
  surchargeItem: {
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  surchargeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  surchargeAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  surchargeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  surchargeStatusText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#374151',
  },
  surchargeDescription: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 14,
    fontStyle: 'italic',
  },
});
