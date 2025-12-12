

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
            
            {/* Nút 3: Quản lý Giao dịch */}
            <BigButton 
                title="Quản lý Giao dịch" 
                subtitle="Lịch sử thu chi, nạp rút tiền"
                icon="receipt-text" // or cash-multiple
                color="#F59E0B" // Amber
                onPress={() => router.push({ pathname: '/shared/transactions', params: { roleTitle: 'Giao dịch - Tài xế' } })}
            />
            
            {/* Nút 4: Team của tôi */}
            <BigButton 
                title="Team của tôi" 
                subtitle="Thông tin đội xe hiện tại"
                icon="account-group" // or shield-account
                color="#8B5CF6" // Purple
                onPress={() => router.push('/(driver)/my-team')}
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