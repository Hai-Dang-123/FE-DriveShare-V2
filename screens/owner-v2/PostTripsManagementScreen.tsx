import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import postTripService from '@/services/postTripService'

type AnyObj = Record<string, any>

function get(obj: AnyObj, ...keys: string[]) {
  for (const k of keys) {
    if (obj == null) return undefined
    obj = obj[k]
  }
  return obj
}

function normalizePost(raw: AnyObj) {
  const id = raw.postTripId || raw.PostTripId || raw.id || raw.Id
  const title = raw.title || raw.Title || ''
  const description = raw.description || raw.Description || ''
  const status = raw.status || raw.Status || 'UNKNOWN'
  const requiredPayloadInKg = raw.requiredPayloadInKg ?? raw.RequiredPayloadInKg
  const trip = raw.trip || raw.Trip
  const sRaw = get(trip || {}, 'StartLocationName') || get(trip || {}, 'startLocationName') || ''
  const eRaw = get(trip || {}, 'EndLocationName') || get(trip || {}, 'endLocationName') || ''
  const startName = typeof sRaw === 'string' ? sRaw : ''
  const endName = typeof eRaw === 'string' ? eRaw : ''
  const details = raw.postTripDetails || raw.PostTripDetails || []
  return { id, title, description, status, requiredPayloadInKg, startName, endName, details }
}

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const color = useMemo(() => {
    switch (status) {
      case 'OPEN': return ['#DCFCE7', '#16A34A']
      case 'CLOSED': return ['#F3F4F6', '#6B7280']
      case 'DELETED': return ['#FEE2E2', '#DC2626']
      default: return ['#E0E7FF', '#4338CA']
    }
  }, [status])
  return <View style={[styles.chip, { backgroundColor: color[0] }]}><Text style={[styles.chipText, { color: color[1] }]}>{status}</Text></View>
}

const PostCard: React.FC<{ item: ReturnType<typeof normalizePost>, onPress: () => void }> = ({ item, onPress }) => {
  const totalDrivers = (item.details || []).reduce((s: number, d: AnyObj) => s + (d.requiredCount ?? d.RequiredCount ?? 0), 0)
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.card}>
<View style={styles.cardHeader}>
<Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
<StatusChip status={item.status} />
</View>
      {!!item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}
      <View style={styles.metaRow}>
<Text style={styles.metaText}>Tuyến: {item.startName} → {item.endName}</Text>
</View>
<View style={styles.metaRow}>
<Text style={styles.metaText}>Yêu cầu tải: {item.requiredPayloadInKg ?? '—'} kg</Text>
<Text style={styles.metaText}>Tổng tài xế: {totalDrivers}</Text>
</View>
      {(item.details || []).slice(0, 3).map((d: AnyObj, idx: number) => (
        <View key={idx} style={styles.detailRow}>
<Text style={styles.detailText}>• {d.type || d.Type}: {d.requiredCount ?? d.RequiredCount} người, {d.pricePerPerson ?? d.PricePerPerson} VND/người</Text>
</View>
      ))}
      {(item.details || []).length > 3 && <Text style={styles.moreText}>…và {item.details.length - 3} dòng nữa</Text>}
      <View style={styles.actions}>
<TouchableOpacity style={styles.primaryBtn} onPress={onPress}><Text style={styles.primaryBtnText}>Xem chi tiết</Text></TouchableOpacity>
</View>
</TouchableOpacity>
  )
}

const PostTripsManagementScreen: React.FC = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [pageNumber, setPageNumber] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchPage = async (page: number, append = false) => {
    try {
      if (!append) setLoading(true)
      const res: any = await postTripService.getMy(page, 10)
      const ok = res?.isSuccess ?? (res?.statusCode === 200)
      const payload = res?.result || res?.data || res
      const data = payload?.data || payload?.items || payload?.results || payload
      const total = payload?.totalCount ?? (Array.isArray(data) ? data.length : 0)
      const arr = Array.isArray(data) ? data : []
      const mapped = arr.map(normalizePost)
      setItems(prev => append ? [...prev, ...mapped] : mapped)
      setHasMore((page * 10) < (payload?.totalCount ?? mapped.length))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchPage(1)
    }, [])
  )

  const onRefresh = () => {
    setRefreshing(true)
    setPageNumber(1)
    fetchPage(1)
  }

  const loadMore = () => {
    if (loading || !hasMore) return
    const next = pageNumber + 1
    setPageNumber(next)
    fetchPage(next, true)
  }

  return (
    <View style={styles.screen}>
<Text style={styles.title}>Bài trip của tôi</Text>
      {loading && items.length === 0 ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <PostCard item={item} onPress={() => router.push({ pathname: '/(owner)/trip-post/[postTripId]', params: { postTripId: item.id } })} />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={!loading ? <Text style={styles.empty}>Chưa có bài nào</Text> : null}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12, color: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '800', flex: 1, paddingRight: 8, color: '#111827' },
  cardDesc: { color: '#6B7280', marginTop: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  metaText: { color: '#374151', fontSize: 13 },
  detailRow: { marginTop: 6 },
  detailText: { color: '#4B5563', fontSize: 13 },
  moreText: { marginTop: 6, color: '#6B7280', fontStyle: 'italic' },
  actions: { marginTop: 12, flexDirection: 'row' },
  primaryBtn: { backgroundColor: '#4F46E5', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#6B7280', marginTop: 40 }
})

export default PostTripsManagementScreen
