

import React from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, ImageBackground, Dimensions } from 'react-native'
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'

interface HeaderProps {
  driver: any
}

const HeaderDriver: React.FC<HeaderProps> = ({ driver }) => {
  const name = driver?.fullName || 'Nguyễn Văn B'
  const license = driver?.licenseClass || 'Hạng FC'
  const experience = driver?.experienceYears || 5
  const avatar = driver?.avatarUrl

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
            <View style={styles.ratingBadge}>
               <MaterialCommunityIcons name="star" size={12} color="#F59E0B" />
               <Text style={styles.ratingText}>4.9/5.0</Text>
            </View>
          </View>
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
  }
})

export default HeaderDriver