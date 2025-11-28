import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Role } from '../../models/types';
import { authService } from '../../services/authService';

// Sử dụng lại bộ màu từ LoginScreen
const COLORS = {
  primaryStart: '#00C6FF',
  primaryEnd: '#0072FF',
  activeBorder: '#00C6FF',
  textPrimary: '#2D3748',
  textSecondary: '#718096',
  inputBg: '#F7FAFC',
  borderColor: '#E2E8F0',
  bgColor: '#F9FAFB',
};

const RegisterScreen: React.FC = () => {
  const [userName, setUserName] = useState('');
  const [dob, setDob] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role] = useState<Role>(Role.OWNER); // Giả sử đang đăng ký Chủ Xe
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!userName || !email || !phoneNumber || !password || !confirmPassword || !agreed) {
        Alert.alert("Thiếu thông tin", "Vui lòng điền đầy đủ các trường bắt buộc và đồng ý điều khoản.");
        return;
    }
    if (password !== confirmPassword) {
        Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp.");
        return;
    }
    setLoading(true);
    try {
      // Gửi thêm dob và address nếu API hỗ trợ
      const response = await authService.register({ userName, email, phoneNumber, password, role });
      if (response.isSuccess) {
        Alert.alert("Thành công", "Tài khoản đã được tạo. Vui lòng đăng nhập.", [
            { text: "OK", onPress: () => router.push('/(auth)/login') }
        ]);
      } else {
        Alert.alert('Đăng ký thất bại', response.message || 'Đã có lỗi xảy ra.');
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể hoàn tất đăng ký. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.headerTitle}>Đăng Ký Tài Khoản</Text>
            <Text style={styles.headerSubtitle}>
              Bạn đang đăng ký với vai trò: <Text style={styles.roleHighlight}>Chủ Xe</Text>
            </Text>

            {/* Avatar Upload Placeholder */}
            <TouchableOpacity style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                {/* Icon máy ảnh (có thể thay bằng Image) */}
                <Text style={styles.cameraIcon}>📷</Text>
              </View>
              <Text style={styles.avatarText}>Tải ảnh đại diện</Text>
            </TouchableOpacity>

            <View style={styles.form}>
              <TextInput style={styles.input} placeholder="Họ và tên" value={userName} onChangeText={setUserName} placeholderTextColor={COLORS.textSecondary} />
              <TextInput style={styles.input} placeholder="Ngày sinh (DD/MM/YYYY)" value={dob} onChangeText={setDob} placeholderTextColor={COLORS.textSecondary} />
              <TextInput style={styles.input} placeholder="Số điện thoại" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" placeholderTextColor={COLORS.textSecondary} />
              <TextInput style={styles.input} placeholder="Địa chỉ" value={address} onChangeText={setAddress} placeholderTextColor={COLORS.textSecondary} />
              <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={COLORS.textSecondary} />
              
              {/* Hàng Mật khẩu và Xác nhận mật khẩu */}
              <View style={styles.row}>
                <TextInput 
                  style={[styles.input, styles.halfInput]} 
                  placeholder="Mật khẩu" 
                  value={password} 
                  onChangeText={setPassword} 
                  secureTextEntry 
                  placeholderTextColor={COLORS.textSecondary} 
                />
                <View style={{ width: 12 }} /> {/* Khoảng cách giữa 2 input */}
                <TextInput 
                  style={[styles.input, styles.halfInput]} 
                  placeholder="Xác nhận mật khẩu" 
                  value={confirmPassword} 
                  onChangeText={setConfirmPassword} 
                  secureTextEntry 
                  placeholderTextColor={COLORS.textSecondary} 
                />
              </View>

              {/* Checkbox Điều khoản */}
              <TouchableOpacity style={styles.checkboxContainer} onPress={() => setAgreed(!agreed)} activeOpacity={0.8}>
                <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                  {agreed && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  Tôi đồng ý với <Text style={styles.linkText}>Điều khoản & Chính sách</Text>
                </Text>
              </TouchableOpacity>

              {/* Nút Đăng ký Gradient */}
              <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.9} style={styles.buttonContainer}>
                <LinearGradient
                  colors={[COLORS.primaryStart, COLORS.primaryEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng Ký</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.linkText}>Đăng nhập tại đây</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgColor },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingVertical: 40 },
  content: { width: '100%', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  headerSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  roleHighlight: { color: COLORS.textPrimary, fontWeight: '700' },
  
  // Avatar Styles
  avatarContainer: { alignItems: 'center', marginBottom: 24 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.activeBorder,
    borderStyle: 'dashed', // Viền nét đứt như thiết kế
  },
  cameraIcon: { fontSize: 28, color: COLORS.activeBorder },
  avatarText: { fontSize: 13, color: COLORS.activeBorder, fontWeight: '600' },

  // Form Styles
  form: { width: '100%' },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { flex: 1 },

  // Checkbox Styles
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: COLORS.inputBg,
  },
  checkboxActive: {
    backgroundColor: COLORS.activeBorder,
    borderColor: COLORS.activeBorder,
  },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  // Button & Footer Styles
  buttonContainer: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  gradientButton: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  footer: { flexDirection: 'row', marginTop: 24 },
  footerText: { color: COLORS.textSecondary, fontSize: 14 },
  linkText: { color: COLORS.activeBorder, fontSize: 14, fontWeight: '700' },
});

export default RegisterScreen;