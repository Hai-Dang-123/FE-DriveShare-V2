import React from 'react';
import { View, Text, Image, StyleSheet, SafeAreaView, Dimensions, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';

// Lấy kích thước màn hình
const { width, height } = Dimensions.get('window');

const WelcomeScreen: React.FC = () => {
  const router = useRouter();

  return (
    <View style={styles.mainContainer}>
      {/* StatusBar trong suốt để ảnh nền tràn lên trên cùng */}
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* PHẦN 1: TOP SECTION - CHỨA ẢNH & LOGO */}
      {/* Dùng màu nền nhẹ để tách biệt với phần nội dung bên dưới */}
      <View style={styles.topSection}>
        
        {/* Logo nhỏ ở góc trên hoặc giữa */}
        <View style={styles.logoContainer}>
             <Image 
                source={require('../../assets/icon-with-name.png')} 
                style={styles.logoImage}
                resizeMode="contain"
            />
        </View>

        {/* Ảnh minh họa chính - Phóng to hơn */}
        <View style={styles.illustrationContainer}>
          <Image
            source={require('../../assets/welcome.png')}
            style={styles.mainImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* PHẦN 2: BOTTOM SHEET - CHỨA TEXT & BUTTON */}
      {/* Khối màu trắng bo góc trượt lên trên hình nền */}
      <View style={styles.bottomSection}>
        <View style={styles.contentContainer}>
          
          {/* Tiêu đề & Mô tả */}
          <View style={styles.textWrapper}>
            <Text style={styles.title}>
              Chào mừng đến <Text style={styles.brandName}>DriveShare</Text>
            </Text>
            
            <Text style={styles.subtitle}>
              Hệ sinh thái vận tải thông minh kết nối Chủ xe, Tài xế và Nhà cung cấp.
            </Text>
          </View>

          {/* Buttons Area */}
          <View style={styles.buttonWrapper}>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={[styles.button, styles.primaryButton]}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>Đăng Nhập</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              style={[styles.button, styles.secondaryButton]}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Tạo tài khoản mới</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F0F5FF', // Màu xanh rất nhạt làm nền cho phần trên (thay vì trắng)
  },
  
  // --- TOP SECTION ---
  topSection: {
    flex: 0.6, // Chiếm 60% màn hình
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight || 40,
    paddingBottom: 20,
  },
  logoContainer: {
    position: 'absolute',
    top: (StatusBar.currentHeight || 40) + 10,
    alignSelf: 'center',
    zIndex: 10,
  },
  logoImage: {
    width: 120, // Logo nhỏ lại một chút để tinh tế hơn
    height: 40,
  },
  illustrationContainer: {
    width: width,
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  mainImage: {
    width: width * 0.9, // Rộng gần bằng màn hình
    height: '100%',
  },

  // --- BOTTOM SECTION (Card Style) ---
  bottomSection: {
    flex: 0.4, // Chiếm 40% màn hình
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32, // Bo góc lớn tạo cảm giác hiện đại
    borderTopRightRadius: 32,
    // Đổ bóng cho khối này để tách biệt với nền trên
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 36, // Đẩy nội dung xuống một chút
    paddingBottom: 20,
    justifyContent: 'space-between', // Đẩy Text lên trên, Button xuống dưới
  },

  // --- TYPOGRAPHY ---
  textWrapper: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28, // Font to hơn
    fontWeight: '800', // Đậm hơn
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  brandName: {
    color: '#2563EB', // Blue 600
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280', // Gray 500
    textAlign: 'center',
    lineHeight: 24, // Tăng khoảng cách dòng cho dễ đọc
    paddingHorizontal: 10,
  },

  // --- BUTTONS ---
  buttonWrapper: {
    width: '100%',
    gap: 16, // Khoảng cách giữa 2 nút (cần Expo SDK mới hoặc React Native 0.71+, nếu lỗi thì dùng marginBottom ở button)
    marginBottom: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 18, // Nút cao hơn chút cho dễ bấm
    borderRadius: 16, // Bo góc tròn hơn
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    // Đổ bóng nhẹ cho nút chính
    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, // Viền dày hơn tí
    borderColor: '#E5E7EB', // Viền xám nhạt tinh tế hơn xanh
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#4B5563', // Chữ màu xám đậm cho nút phụ (trông sang hơn màu xanh)
  },
});

export default WelcomeScreen;