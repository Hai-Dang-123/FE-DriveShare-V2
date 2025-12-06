


import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, StatusBar } from 'react-native'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import OwnerTripList from './components/OwnerTripList'
import { Ionicons } from '@expo/vector-icons'
import tripService from '@/services/tripService'

interface Props {
  onBack?: () => void
}

const COLORS = {
  primary: '#0284C7',
  bg: '#F9FAFB',
  text: '#111827',
  border: '#E5E7EB'
}

const TripsManagementScreen: React.FC<Props> = ({ onBack }) => {
  const router = useRouter()
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true) // Bắt đầu với loading = true
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const fetchTrips = async (pageNumber = 1) => {
    setLoading(true)
    setError(null)
    try {
      const res: any = await tripService.getByOwner(pageNumber, pageSize)
      const payload = res?.result ?? res
      const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []

      const mapped = items.map((t: any) => ({
        tripId: t.tripId ?? t.TripId ?? t.id,
        tripCode: t.tripCode ?? t.TripCode ?? '',
        status: t.status ?? t.Status ?? '',
        createAt: t.createAt ?? t.CreateAt ?? '',
        vehiclePlate: t.vehiclePlate ?? t.VehiclePlate ?? '',
        vehicleType: t.vehicleType ?? t.VehicleType ?? '',
        startAddress: t.startAddress ?? t.StartAddress ?? (t.shippingRoute?.startLocation?.address ?? ''),
        endAddress: t.endAddress ?? t.EndAddress ?? (t.shippingRoute?.endLocation?.address ?? ''),
        packageCodes: t.packageCodes ?? t.PackageCodes ?? [],
        driverNames: t.driverNames ?? t.DriverNames ?? [],
        tripRouteSummary: t.tripRouteSummary ?? t.TripRouteSummary ?? '',
      }))

      setTrips(mapped) // Luôn set mới, không merge với cũ
      setPage(pageNumber)
    } catch (e: any) {
      setError(e?.message || 'Không thể tải hành trình')
    } finally {
      setLoading(false)
    }
  }

  // Gọi API mỗi khi component mount (mỗi lần vào trang)
  useFocusEffect(
    useCallback(() => {
      fetchTrips(1)
    }, [])
  )

  const handleRefresh = () => fetchTrips(1)

  const openDetail = (tripId: string) => {
    try {
      router.push(`/(owner)/trip/${tripId}`)
    } catch (e) {
      Alert.alert('Trip', `Xem chi tiết hành trình ${tripId}`)
    }
  }

  const renderContent = () => {
    if (loading && trips.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.statusText}>Đang tải hành trình...</Text>
        </View>
      )
    }

    if (error) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchTrips(1)}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return <OwnerTripList trips={trips} onView={openDetail} />
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (onBack ? onBack() : router.back())} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          <Text style={styles.headerBtnText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Quản Lý Hành Trình</Text>

        <TouchableOpacity onPress={handleRefresh} style={styles.headerBtn}>
          <Ionicons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {renderContent()}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  headerBtn: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  headerBtnText: { fontSize: 15, fontWeight: '500', color: COLORS.text, marginLeft: 4 },
  
  body: { flex: 1 },
  
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  statusText: { fontSize: 16, color: '#6B7280' },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center', paddingHorizontal: 20 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '600' },
})

export default TripsManagementScreen