import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface ContractTerm {
  contractTermId: string;
  content: string;
  order: number;
}

interface ContractDocumentProps {
  contractCode: string;
  contractType: 'DRIVER_CONTRACT' | 'PROVIDER_CONTRACT';
  contractValue: number;
  currency: string;
  effectiveDate: string;
  terms: ContractTerm[];
  ownerName: string;
  ownerCompany?: string;
  ownerTaxCode?: string;
  counterpartyName: string;
  counterpartyPhone?: string;
  ownerSigned: boolean;
  ownerSignAt: string | null;
  counterpartySigned: boolean;
  counterpartySignAt: string | null;
  tripCode?: string;
  vehiclePlate?: string;
  startAddress?: string;
  endAddress?: string;
}

export const ContractDocument: React.FC<ContractDocumentProps> = ({
  contractCode,
  contractType,
  contractValue,
  currency,
  effectiveDate,
  terms,
  ownerName,
  ownerCompany,
  ownerTaxCode,
  counterpartyName,
  counterpartyPhone,
  ownerSigned,
  ownerSignAt,
  counterpartySigned,
  counterpartySignAt,
  tripCode,
  vehiclePlate,
  startAddress,
  endAddress,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `Ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
  };

  const getContractTitle = () => {
    return contractType === 'DRIVER_CONTRACT'
      ? 'HỢP ĐỒNG THUÊ TÀI XẾ VẬN CHUYỂN'
      : 'HỢP ĐỒNG CUNG CẤP DỊCH VỤ VẬN TẢI';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerCompany}>{ownerCompany || 'DRIVESHARE'}</Text>
          {ownerTaxCode && <Text style={styles.headerTax}>MST: {ownerTaxCode}</Text>}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerCountry}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
          <Text style={styles.headerMotto}>Độc lập - Tự do - Hạnh phúc</Text>
          <Text style={styles.headerLine}>————————</Text>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>{getContractTitle()}</Text>
        <Text style={styles.contractCode}>Số: {contractCode}</Text>
      </View>

      {/* Introduction */}
      <View style={styles.introSection}>
        <Text style={styles.introText}>
          Hôm nay, {formatDate(effectiveDate)}, tại trụ sở {ownerCompany || 'DriveShare'}, chúng tôi gồm:
        </Text>
      </View>

      {/* Parties */}
      <View style={styles.partiesSection}>
        <View style={styles.party}>
          <Text style={styles.partyTitle}>BÊN A (BÊN THUÊ/CHỦ XE):</Text>
          <Text style={styles.partyInfo}>Tên: {ownerName}</Text>
          {ownerCompany && <Text style={styles.partyInfo}>Công ty: {ownerCompany}</Text>}
          {ownerTaxCode && <Text style={styles.partyInfo}>MST: {ownerTaxCode}</Text>}
        </View>

        <View style={styles.party}>
          <Text style={styles.partyTitle}>
            {contractType === 'DRIVER_CONTRACT' ? 'BÊN B (TÀI XẾ):' : 'BÊN B (NHÀ CUNG CẤP):'}
          </Text>
          <Text style={styles.partyInfo}>Tên: {counterpartyName}</Text>
          {counterpartyPhone && <Text style={styles.partyInfo}>SĐT: {counterpartyPhone}</Text>}
        </View>
      </View>

      {/* Trip Info */}
      {tripCode && (
        <View style={styles.tripSection}>
          <Text style={styles.sectionTitle}>THÔNG TIN CHUYẾN ĐI:</Text>
          <Text style={styles.tripInfo}>Mã chuyến: {tripCode}</Text>
          {vehiclePlate && <Text style={styles.tripInfo}>Biển số xe: {vehiclePlate}</Text>}
          {startAddress && <Text style={styles.tripInfo}>Điểm đi: {startAddress}</Text>}
          {endAddress && <Text style={styles.tripInfo}>Điểm đến: {endAddress}</Text>}
        </View>
      )}

      {/* Terms */}
      <View style={styles.termsSection}>
        <Text style={styles.sectionTitle}>ĐIỀU KHOẢN HỢP ĐỒNG:</Text>
        {terms.sort((a, b) => a.order - b.order).map((term) => (
          <View key={term.contractTermId} style={styles.term}>
            <Text style={styles.termNumber}>Điều {term.order}:</Text>
            <Text style={styles.termContent}>{term.content}</Text>
          </View>
        ))}
      </View>

      {/* Contract Value */}
      <View style={styles.valueSection}>
        <Text style={styles.valueTitle}>GIÁ TRỊ HỢP ĐỒNG:</Text>
        <Text style={styles.valueAmount}>
          {formatCurrency(contractValue)} {currency}
        </Text>
        <Text style={styles.valueWords}>
          (Bằng chữ: {convertNumberToWords(contractValue)} đồng)
        </Text>
      </View>

      {/* Signatures */}
      <View style={styles.signatureSection}>
        <View style={styles.signatureBox}>
          <Text style={styles.signatureTitle}>BÊN A</Text>
          <Text style={styles.signatureName}>{ownerName}</Text>
          {ownerSigned && ownerSignAt && (
            <Text style={styles.signatureDate}>Đã ký: {formatDate(ownerSignAt)}</Text>
          )}
          {ownerSigned ? (
            <Text style={styles.signedText}>✓ Đã ký</Text>
          ) : (
            <Text style={styles.unsignedText}>(Chưa ký)</Text>
          )}
        </View>

        <View style={styles.signatureBox}>
          <Text style={styles.signatureTitle}>BÊN B</Text>
          <Text style={styles.signatureName}>{counterpartyName}</Text>
          {counterpartySigned && counterpartySignAt && (
            <Text style={styles.signatureDate}>Đã ký: {formatDate(counterpartySignAt)}</Text>
          )}
          {counterpartySigned ? (
            <Text style={styles.signedText}>✓ Đã ký</Text>
          ) : (
            <Text style={styles.unsignedText}>(Chưa ký)</Text>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau.
        </Text>
      </View>
    </View>
  );
};

// Helper function to convert number to Vietnamese words
const convertNumberToWords = (num: number): string => {
  if (num === 0) return 'Không';
  
  const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];
  const tens = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
  const thousands = ['', 'nghìn', 'triệu', 'tỷ'];

  const convert = (n: number): string => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const one = n % 10;
      return tens[ten] + (one ? ' ' + ones[one] : '');
    }
    if (n < 1000) {
      const hundred = Math.floor(n / 100);
      const rest = n % 100;
      return ones[hundred] + ' trăm' + (rest ? ' ' + convert(rest) : '');
    }
    return '';
  };

  let result = '';
  let unitIndex = 0;

  while (num > 0) {
    const segment = num % 1000;
    if (segment > 0) {
      const prefix = convert(segment);
      result = prefix + (thousands[unitIndex] ? ' ' + thousands[unitIndex] : '') + (result ? ' ' + result : '');
    }
    num = Math.floor(num / 1000);
    unitIndex++;
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
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
  headerTax: {
    fontSize: 10,
    marginTop: 4,
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
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  contractCode: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  introSection: {
    marginBottom: 16,
  },
  introText: {
    fontSize: 11,
    lineHeight: 18,
  },
  partiesSection: {
    marginBottom: 16,
  },
  party: {
    marginBottom: 12,
  },
  partyTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  partyInfo: {
    fontSize: 11,
    marginLeft: 8,
    marginBottom: 2,
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
  termsSection: {
    marginBottom: 16,
  },
  term: {
    marginBottom: 10,
    marginLeft: 8,
  },
  termNumber: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  termContent: {
    fontSize: 11,
    lineHeight: 18,
    marginLeft: 8,
  },
  valueSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
  },
  valueTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  valueAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 4,
  },
  valueWords: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
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
});
