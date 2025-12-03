import React, { useState, useEffect } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, ImageBackground, Dimensions } from 'react-native'
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { ekycService } from '@/services/ekycService'

interface HeaderProps {
  provider: any | null | undefined
}

const { width } = Dimensions.get('window')

const HeaderProvider: React.FC<HeaderProps> = ({ provider }) => {
  const router = useRouter()
  const [isVerified, setIsVerified] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkVerifiedStatus()
  }, [])

  const checkVerifiedStatus = async () => {
    try {
      const response = await ekycService.checkVerifiedStatus()
      if (response.isSuccess && response.result) {
        setIsVerified(response.result.isVerified)
      }
    } catch (error) {
      console.error('Failed to check verified status:', error)
    } finally {
      setLoading(false)
    }
  }
  const p = provider as any
  const profile = p?.profile ?? p?.result ?? p ?? {}

  const name = profile?.fullName || profile?.userName || 'Nhà cung cấp'
  const company = profile?.companyName || profile?.company || 'Chưa có dữ liệu'
  const avatar = profile?.avatarUrl || profile?.AvatarUrl || null
  const email = profile?.email || 'Chưa có dữ liệu'
  const phone = profile?.phoneNumber || 'Chưa có dữ liệu'
  const status = (profile?.status || '').toString()

  const initials = name
    ? name.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()
    : 'NP'

  const handleVerifyCCCD = () => {
    router.push('/provider-v2/my-documents')
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../../assets/header-bg.png')}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.9 }}
      >
        <View style={styles.topOverlay}>
          <View style={styles.topIconContainer}>
            <TouchableOpacity style={styles.iconButton}>
              <MaterialCommunityIcons name="bell-outline" size={26} color="#FFFFFF" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="settings-outline" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      <View style={styles.floatingCardWrapper}>
        <View style={styles.floatingCard}>
          <View style={styles.avatarWrapper}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <View style={styles.avatarInitialsContainer}>
                <Text style={styles.avatarInitialsText}>{initials}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoContent}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{name}</Text>
              {status && status.toUpperCase() === 'ACTIVE' ? (
                <View style={[styles.verifiedIcon, { backgroundColor: '#10B981' }]}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                </View>
              ) : (
                <View style={[styles.verifiedIcon, { backgroundColor: '#EF4444' }]}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✕</Text>
                </View>
              )}
            </View>

            <Text style={styles.profileCompany}>{company}</Text>
            <Text style={styles.profileContact}>{email} • {phone}</Text>

            {!loading && (
              isVerified ? (
                <TouchableOpacity style={styles.verifyBadge} onPress={handleVerifyCCCD}>
                  <MaterialCommunityIcons name="shield-check" size={16} color="#047857" />
                  <Text style={styles.verifyText}>Đã xác minh</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.unverifiedBadge} onPress={handleVerifyCCCD}>
                  <MaterialCommunityIcons name="shield-alert" size={16} color="#2563EB" />
                  <Text style={styles.unverifiedText}>Xác minh tài khoản</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  backgroundImage: {
    width: '100%',
    height: 220,
    justifyContent: 'flex-start',
  },
  topOverlay: {
    paddingTop: 44,
    paddingHorizontal: 20,
  },
  topIconContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 22,
    marginLeft: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },

  floatingCardWrapper: {
    alignItems: 'center',
    marginTop: -70,
    paddingHorizontal: 16,
  },
  floatingCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarWrapper: {
    position: 'absolute',
    top: -56,
    alignSelf: 'center',
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 64,
  },
  avatarImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  avatarInitialsContainer: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  avatarInitialsText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#4F46E5',
  },
  infoContent: {
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  verifiedIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  profileCompany: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 2,
    textAlign: 'center',
  },
  profileContact: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#34D399',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    gap: 6,
  },
  verifyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#047857',
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    gap: 6,
  },
  unverifiedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
})

export default HeaderProvider