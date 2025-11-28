import React from 'react'
import { Tabs, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../constants/Colors'
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs'
import type { RouteProp } from '@react-navigation/native'

// Những route mà ta muốn ẨN tab bar (ví dụ trang chi tiết, chỉnh sửa...)
const hideTabBarForRoutes = [
  '/(provider)/item-detail',
  '/(provider)/package-detail',
  '/(provider)/post-package-detail',
  // Thêm route khác nếu cần
]

export default function ProviderLayout() {
  const pathname = usePathname()
  const display = hideTabBarForRoutes.some((r) => pathname.startsWith(r)) ? 'none' : 'flex'

  return (
    <Tabs
      screenOptions={({ route }: { route: RouteProp<Record<string, object | undefined>, string> }): BottomTabNavigationOptions => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'grid-outline'

          switch (route.name) {
            case 'home':
              iconName = focused ? 'home' : 'home-outline'
              break
            case 'items':
              iconName = focused ? 'list' : 'list-outline'
              break
            case 'packages':
              iconName = focused ? 'cube' : 'cube-outline'
              break
            case 'posts':
              iconName = focused ? 'newspaper' : 'newspaper-outline'
              break
            case 'profile':
              iconName = focused ? 'person-circle' : 'person-circle-outline'
              break
            default:
              iconName = 'grid-outline'
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.grey,
        headerShown: false,
        tabBarStyle: { height: 60, paddingBottom: 5, paddingTop: 5, display },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      })}
    >
      {/* Các tab chính của Provider */}
      <Tabs.Screen name="home" options={{ title: 'Trang chủ' }} />
<Tabs.Screen name="items" options={{ title: 'Sản phẩm' }} />
<Tabs.Screen name="packages" options={{ title: 'Gói' }} />
<Tabs.Screen name="posts" options={{ title: 'Bài đăng' }} />
<Tabs.Screen name="profile" options={{ title: 'Hồ sơ' }} />

      {/* Các màn hình chi tiết ẩn khỏi tab bar */}
      <Tabs.Screen name="item-detail" options={{ href: null }} />
<Tabs.Screen name="package-detail" options={{ href: null }} />
<Tabs.Screen name="post-package-detail" options={{ href: null }} />
</Tabs>
  )
}
