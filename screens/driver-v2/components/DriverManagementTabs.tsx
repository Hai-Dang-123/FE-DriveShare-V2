// import React, { useState } from 'react'
// import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
// import { useRouter } from 'expo-router'
// import { ArchiveBoxIcon } from '../../provider-v2/icons/ManagementIcons'

// const ManagementButton: React.FC<{
//   icon: React.ReactNode
//   label: string
//   description: string
//   isPrimary?: boolean
//   onPress?: () => void
//   disabled?: boolean
// }> = ({ icon, label, description, isPrimary = false, onPress, disabled = false }) => {
//   const containerStyle = [
//     styles.manageButton,
//     isPrimary ? styles.manageButtonPrimary : styles.manageButtonSecondary,
//   ]
//   const labelStyle = [styles.manageLabel, isPrimary ? styles.manageTextPrimary : styles.manageTextSecondary]
//   const descriptionStyle = [styles.manageDescription, isPrimary ? styles.manageDescriptionPrimary : styles.manageDescriptionSecondary]

//   return (
//     <TouchableOpacity style={[containerStyle, disabled && styles.manageDisabled]} onPress={onPress} disabled={disabled} activeOpacity={0.8}>
// <View style={styles.manageIcon}>{disabled ? <ActivityIndicator size="small" color={isPrimary ? '#fff' : '#4F46E5'} /> : icon}</View>
// <View style={styles.manageTextContainer}>
// <Text style={labelStyle}>{label}</Text>
// <Text style={descriptionStyle}>{description}</Text>
// </View>
// </TouchableOpacity>
//   )
// }

// const DriverManagementTabs: React.FC = () => {
//   const router = useRouter()
//   const [loading, setLoading] = useState(false)

//   const go = (path: string) => {
//     setLoading(true)
//     router.push(path)
//     setLoading(false)
//   }

//   return (
//     <View>
// <Text style={styles.title}>Quản lý</Text>
// <View style={styles.container}>
// <ManagementButton
//           icon={<ArchiveBoxIcon style={styles.iconPrimary} />}
//           label="Bài Post Trip"
//           description="Xem danh sách bài đăng cần tài xế"
//           isPrimary
//           onPress={() => go('/(driver)/post-trips')}
//           disabled={loading}
//         />
// <ManagementButton
//           icon={<Text style={styles.icon}>🚌</Text>}
//           label="Chuyến của tôi"
//           description="Danh sách các chuyến bạn đã tham gia"
//           onPress={() => go('/(driver)/my-trips')}
//           disabled={loading}
//         />
// </View>
// </View>
//   )
// }

// const styles = StyleSheet.create({
//   title: { fontSize: 24, fontWeight: '700', marginBottom: 16, paddingHorizontal: 4, color: '#111827' },
//   container: { gap: 16 },
//   manageButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 8 },
//   manageButtonPrimary: { backgroundColor: '#4F46E5' },
//   manageDisabled: { opacity: 0.7 },
//   manageButtonSecondary: { backgroundColor: '#FFFFFF' },
//   manageIcon: { marginRight: 16 },
//   icon: { width: 32, height: 32, color: '#4F46E5' },
//   iconPrimary: { width: 32, height: 32, color: '#FFFFFF' },
//   manageTextContainer: { flex: 1 },
//   manageLabel: { fontWeight: '700', fontSize: 16 },
//   manageTextPrimary: { color: '#FFFFFF' },
//   manageTextSecondary: { color: '#1F2937' },
//   manageDescription: { fontSize: 14, marginTop: 4 },
//   manageDescriptionPrimary: { color: '#C7D2FE' },
//   manageDescriptionSecondary: { color: '#6B7280' },
// })

// export default DriverManagementTabs


import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

const BigButton = ({ title, subtitle, icon, color, onPress }: any) => (
  <TouchableOpacity style={styles.btnContainer} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
       <MaterialCommunityIcons name={icon} size={32} color={color} />
    </View>
    <View style={styles.textContainer}>
        <Text style={styles.btnTitle}>{title}</Text>
        <Text style={styles.btnSub}>{subtitle}</Text>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={24} color="#94A3B8" />
  </TouchableOpacity>
)

const DriverManagementTabs = () => {
  const router = useRouter()

  return (
    <View style={styles.container}>
        <Text style={styles.title}>Menu Quản lý</Text>
        
        <View style={styles.grid}>
            {/* Nút 1: Tìm chuyến mới */}
            <BigButton 
                title="Tìm Chuyến Đi Mới" 
                subtitle="Duyệt & nhận chuyến phù hợp"
                icon="map-search-outline"
                color="#2563EB" // Blue
                onPress={() => router.push('/(driver)/post-trips')}
            />

            {/* Nút 2: Chuyến đi của tôi */}
            <BigButton 
                title="Chuyến Đi Của Tôi" 
                subtitle="Chuyến hiện tại & sắp tới"
                icon="steering" // or truck-fast
                color="#059669" // Green
                onPress={() => router.push('/(driver)/my-trips')}
            />
        </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 24 },
  title: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 12, marginLeft: 4 },
  grid: { gap: 12 },
  btnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  iconBox: {
    width: 56, height: 56,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: { flex: 1 },
  btnTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  btnSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
})

export default DriverManagementTabs