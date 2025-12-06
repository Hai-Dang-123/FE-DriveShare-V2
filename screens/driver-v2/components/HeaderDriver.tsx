

import React, { useState, useEffect } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, ImageBackground, Dimensions } from 'react-native'
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { ekycService } from '@/services/ekycService'

interface HeaderProps {
  driver: any
}

const HeaderDriver: React.FC<HeaderProps> = ({ driver }) => {
  const router = useRouter()
  const [isVerified, setIsVerified] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkVerifiedStatus()
  }, [])

  const checkVerifiedStatus = async () => {
    try {
      const response = await ekycService.checkVerifiedStatus()
      // Backend returns: { result: boolean, message: string }
      if (response.isSuccess) {
        setIsVerified(response.result === true)
        setVerificationMessage(response.message || '')
      }
    } catch (error) {
      console.error('Failed to check verified status:', error)
    } finally {
      setLoading(false)
    }
  }
  const name = driver?.fullName || 'N/A'
  const license = driver?.licenseClass || 'Chưa cập nhật'
  const experience = driver?.experienceYears || 0
  const avatar = driver?.avatarUrl

  const handleVerifyCCCD = () => {
    router.push('/driver/my-documents')
  }

  return (
    <ImageBackground
      source={require('../../../assets/header-bg.png')} // Dùng ảnh nền giống Owner hoặc ảnh Cabin xe tải
      style={styles.backgroundImage}
      imageStyle={{ opacity: 0.85, backgroundColor: '#000' }} // Làm tối ảnh nền một chút
    >
      <View style={styles.overlay}>
        <View style={styles.topBar}>
           {/* Logo hoặc Brand Name nhỏ */}
           <Text style={styles.brandText}>DriveShare Driver</Text>
           
           <View style={styles.actions}>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="notifications-outline" size={24} color="#FFF" />
                <View style={styles.dot} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="settings-outline" size={24} color="#FFF" />
              </TouchableOpacity>
           </View>
        </View>

        {/* Driver Info Row */}
        <View style={styles.profileRow}>
          <View style={styles.avatarContainer}>
             {avatar ? (
               <Image source={{ uri: avatar }} style={styles.avatar} />
             ) : (
               <View style={[styles.avatar, { backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center' }]}>
                 <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#4F46E5' }}>{name.charAt(0)}</Text>
               </View>
             )}
             <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={16} color="#10B981" />
             </View>
          </View>
          
          <View style={styles.infoText}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.subInfo}>Bằng lái {license} • {experience} năm kinh nghiệm</Text>
            <View style={styles.badgeRow}>
              <View style={styles.ratingBadge}>
                <MaterialCommunityIcons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>4.9/5.0</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Verification Status (CCCD + GPLX for drivers) */}
        <View style={styles.verifySection}>
          {!loading && (
            isVerified ? (
              <TouchableOpacity style={styles.verifiedBadgeContainer} onPress={handleVerifyCCCD}>
                <MaterialCommunityIcons name="shield-check" size={16} color="#10B981" />
                <Text style={styles.verifiedText}>Đã xác minh đầy đủ</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyCCCD}>
                <MaterialCommunityIcons name="shield-alert" size={16} color="#EF4444" />
                <Text style={styles.verifyButtonText}>
                  {verificationMessage || 'Xác minh CCCD & GPLX'}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  backgroundImage: {
    width: '100%',
    height: 240, 
    paddingTop: 40,
  },
  overlay: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.3)', // Lớp phủ đen mờ để chữ nổi bật
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  dot: {
    position: 'absolute',
    top: 8, right: 10,
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    backgroundColor: '#FFF',
    borderRadius: 10,
  },
  infoText: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  subInfo: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  verifySection: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  verifiedBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    alignSelf: 'flex-start',
  },
  verifyButtonText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
})

export default HeaderDriver