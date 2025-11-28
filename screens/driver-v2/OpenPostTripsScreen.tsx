import React, { useEffect, useState, useCallback } from 'react'
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    ActivityIndicator, RefreshControl, StatusBar 
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'
import postTripService from '@/services/postTripService'

// --- 1. TYPES & HELPER FUNCTIONS ---

type AnyObj = Record<string, any>

// Hàm an toàn để lấy dữ liệu từ object (xử lý null/undefined)
function get(obj: AnyObj, ...keys: string[]) {
  for (const k of keys) {
    if (obj == null) return undefined
    obj = obj[k]
  }
  return obj
}

// Hàm chuẩn hóa dữ liệu từ API về format chuẩn cho UI
function normalizePost(raw: AnyObj) {
  const id = raw.postTripId || raw.PostTripId || raw.id || raw.Id
  const title = raw.title || raw.Title || ''
  const description = raw.description || raw.Description || ''
  const status = raw.status || raw.Status || 'UNKNOWN'
  const requiredPayloadInKg = raw.requiredPayloadInKg ?? raw.RequiredPayloadInKg
  
  // Xử lý Route (Điểm đi - Điểm đến)
  const trip = raw.trip || raw.Trip
  const sRaw = get(trip || {}, 'StartLocationName') || get(trip || {}, 'startLocationName') || ''
  const eRaw = get(trip || {}, 'EndLocationName') || get(trip || {}, 'endLocationName') || ''
  const startName = typeof sRaw === 'string' ? sRaw : ''
  const endName = typeof eRaw === 'string' ? eRaw : ''
  
  const details = raw.postTripDetails || raw.PostTripDetails || []
  const createdAt = raw.createAt || raw.CreateAt
  
  // Tính tổng số tài xế cần tuyển
  const totalDrivers = details.reduce((s: number, d: AnyObj) => s + (d.requiredCount ?? d.RequiredCount ?? 0), 0)

  return { id, title, description, status, requiredPayloadInKg, startName, endName, details, createdAt, totalDrivers }
}

// --- 2. COMPONENT: POST TRIP CARD (UI ONLY) ---

interface CardProps {
    item: ReturnType<typeof normalizePost>;
    onPress: () => void;
}

const PostTripCard: React.FC<CardProps> = ({ item, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9} // Hiệu ứng bấm mượt hơn
      style={styles.card}
    >
        {/* Header: Status Badge & Date */}
        <View style={styles.cardHeaderRow}>
            <View style={[styles.statusBadge, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[styles.statusText, { color: '#059669' }]}>ĐANG MỞ</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="time-outline" size={14} color="#9CA3AF" style={{marginRight: 4}}/>
                <Text style={styles.dateText}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong'}
                </Text>
            </View>
        </View>

        {/* Title */}
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

        {/* Route Timeline (Visual A -> B) */}
        <View style={styles.routeContainer}>
            {/* Start Point */}
            <View style={styles.routeRow}>
                <View style={styles.routeDotStart}>
                    <View style={styles.innerDot} />
                </View>
                <Text style={styles.routeText} numberOfLines={1}>
                    {item.startName || 'Điểm đi chưa xác định'}
                </Text>
            </View>
            
            {/* Connector Line (Dotted simulation) */}
            <View style={styles.connectorContainer}>
                <View style={styles.connectorLine} />
            </View>

            {/* End Point */}
            <View style={styles.routeRow}>
                <View style={styles.routeDotEnd}>
                    <MaterialCommunityIcons name="map-marker" size={12} color="#FFF" />
                </View>
                <Text style={styles.routeText} numberOfLines={1}>
                    {item.endName || 'Điểm đến chưa xác định'}
                </Text>
            </View>
        </View>

        <View style={styles.divider} />

        {/* Stats Grid (Thông số quan trọng) */}
        <View style={styles.statsGrid}>
            {/* Tải trọng */}
            <View style={styles.statItem}>
                <View style={[styles.iconBox, {backgroundColor: '#EEF2FF'}]}>
                    <MaterialCommunityIcons name="weight-kilogram" size={18} color="#4F46E5" />
                </View>
                <View>
                    <Text style={styles.statLabel}>Tải trọng</Text>
                    <Text style={styles.statValue}>
                        {item.requiredPayloadInKg ? `${item.requiredPayloadInKg} kg` : '--'}
                    </Text>
                </View>
            </View>

            {/* Vertical Divider */}
            <View style={styles.verticalLine} />

            {/* Số lượng tài xế */}
            <View style={styles.statItem}>
                <View style={[styles.iconBox, {backgroundColor: '#FEF3C7'}]}>
                    <Ionicons name="people" size={18} color="#D97706" />
                </View>
                <View>
                    <Text style={styles.statLabel}>Cần tuyển</Text>
                    <Text style={styles.statValue}>{item.totalDrivers} Tài xế</Text>
                </View>
            </View>
        </View>
    </TouchableOpacity>
  )
}

// --- 3. MAIN SCREEN: LIST LOGIC ---

const OpenPostTripsScreen: React.FC = () => {
  const router = useRouter()
  
  // States
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [pageNumber, setPageNumber] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // API Call
  const fetchPage = async (page: number, append = false) => {
    try {
      if (!append) setLoading(true)
      
      // Gọi API lấy danh sách bài đăng OPEN
      const res: any = await postTripService.getOpen(page, 10)
      
      const ok = res?.isSuccess ?? (res?.statusCode === 200)
      const payload = res?.result || res?.data || res
      const data = payload?.data || payload?.items || payload?.results || payload
      const totalCount = payload?.totalCount ?? (Array.isArray(data) ? data.length : 0)
      
      const arr = Array.isArray(data) ? data : []
      const mapped = arr.map(normalizePost)
      
      setItems(prev => append ? [...prev, ...mapped] : mapped)
      setHasMore((page * 10) < totalCount)
    } catch (e) {
      console.error('Fetch posts error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial Load
  useEffect(() => {
    fetchPage(1)
  }, [])

  // Handlers
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setPageNumber(1)
    fetchPage(1)
  }, [])

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return
    const next = pageNumber + 1
    setPageNumber(next)
    fetchPage(next, true)
  }, [loading, hasMore, pageNumber])

  const navigateToDetail = (id: string) => {
    router.push({ pathname: '/(driver)/trip-post/[postTripId]', params: { postTripId: id } })
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tìm Chuyến Mới</Text>
        <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="filter" size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && items.length === 0 ? (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Đang tải danh sách...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item }) => (
            <PostTripCard 
                item={item} 
                onPress={() => navigateToDetail(item.id)} 
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />
          }
          ListEmptyComponent={!loading ? (
              <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="clipboard-text-search-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Hiện chưa có bài đăng nào.</Text>
                  <Text style={styles.emptySubText}>Vui lòng quay lại sau!</Text>
              </View>
          ) : null}
          ListFooterComponent={
            loading && items.length > 0 ? 
            <ActivityIndicator style={{marginTop: 12}} color="#4F46E5" /> : 
            <View style={{height: 24}}/>
          }
        />
      )}
    </View>
  )
}

// --- 4. STYLES ---

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#FFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: {width:0, height:2}
  },
  backBtn: { padding: 4 },
  filterBtn: { padding: 8, backgroundColor: '#F9FAFB', borderRadius: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },

  listContent: { padding: 16, paddingBottom: 32 },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },

  // --- CARD STYLES ---
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#F3F4F6', // Viền rất nhạt
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 8, 
    elevation: 3 
  },
  
  // Card Header
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  dateText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827', lineHeight: 24, marginBottom: 14 },

  // Timeline Route
  routeContainer: { marginBottom: 8 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 24 },
  
  // Start Dot
  routeDotStart: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  innerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' },
  
  // End Dot
  routeDotEnd: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  
  routeText: { fontSize: 14, color: '#374151', flex: 1, fontWeight: '500' },
  
  // Connector Line
  connectorContainer: { paddingLeft: 8.5, height: 16, justifyContent: 'center' },
  connectorLine: { width: 1, height: '100%', backgroundColor: '#D1D5DB', borderStyle: 'dotted' }, // Có thể dùng dashed border nếu view hỗ trợ

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 },

  // Stats Grid
  statsGrid: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  verticalLine: { width: 1, height: 30, backgroundColor: '#F3F4F6', marginHorizontal: 8 },

  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#374151', marginTop: 16, fontSize: 16, fontWeight: '600' },
  emptySubText: { color: '#9CA3AF', marginTop: 4, fontSize: 14 },
})

export default OpenPostTripsScreen