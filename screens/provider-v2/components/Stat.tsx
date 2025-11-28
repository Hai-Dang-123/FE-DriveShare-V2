import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import {
  TruckIcon,
  CurrencyDollarIcon,
  PackageIcon,
  StarIcon,
} from '../icons/StatIcon'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
  return (
    <View style={[styles.statCard, { flex: 1 }]}>
<View style={[styles.iconContainer, { backgroundColor: color }]}>
        {icon}
      </View>
<View>
<Text style={styles.statLabel}>{label}</Text>
<Text style={styles.statValue}>{value}</Text>
</View>
</View>
  )
}

const Stats: React.FC = () => {
  // Lấy màu từ Tailwind (bạn có thể định nghĩa màu này ở một file constants)
  const colors = {
    blue: '#3B82F6',
    green: '#22C55E',
    orange: '#F97316',
    yellow: '#EAB308',
  }

  
  return (
    <View>
<Text style={styles.title}>Thống kê tháng này</Text>
<View style={styles.container}>
<StatCard
          icon={<TruckIcon style={styles.icon} />}
          label="Completed Trips"
          value="124"
          color={colors.blue} // bg-blue-500
        />
<StatCard
          icon={<CurrencyDollarIcon style={styles.icon} />}
          label="Total Earnings"
          value="$25,6k"
          color={colors.green} // bg-green-500
        />
<StatCard
          icon={<PackageIcon style={styles.icon} />}
          label="Active Packages"
          value="18"
          color={colors.orange} // bg-orange-500
        />
<StatCard
          icon={<StarIcon style={styles.icon} />}
          label="Your Rating"
          value="4.8"
          color={colors.yellow} // bg-yellow-500
        />
</View>
</View>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24, // text-2xl
    fontWeight: '700', // font-bold
    marginBottom: 16, // mb-4
    paddingHorizontal: 4, // px-1
    color: '#111827', // text-gray-900
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16, // gap-4
  },
  statCard: {
    backgroundColor: '#FFFFFF', // bg-white
    padding: 16, // p-4
    borderRadius: 12, // rounded-xl
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // space-x-4
    minWidth: 150, // Đảm bảo card không quá nhỏ
    // shadow-xl
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    padding: 12, // p-3
    borderRadius: 9999, // rounded-full
  },
  icon: {
    width: 24, // w-6
    height: 24, // h-6
    color: '#FFFFFF', // text-white
  },
  statLabel: {
    fontSize: 14, // text-sm
    color: '#6B7280', // text-gray-500
  },
  statValue: {
    fontSize: 24, // text-2xl
    fontWeight: '700', // font-bold
    color: '#111827', // text-gray-900
  },
})

export default Stats