// // Tên file: app/(driver)/_layout.tsx

// import React from 'react';
// import { Tabs, usePathname } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';
// import { Colors } from '../../constants/Colors'; 
// import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
// import type { RouteProp } from '@react-navigation/native';

// // Danh sách các trang sẽ ẨN tab bar (khi đang ở trang đó)
// const hideTabBarForRoutes = [
//   '/(driver)/vehicle-detail',
//   '/(driver)/package-detail',
//   '/(driver)/payment',
//   '/(driver)/create-trip',
//   '/(driver)/active-trip',
//   '/(driver)/verification',
//   '/(driver)/vehicle-booking-detail',
//   // --- THÊM CÁC ROUTE MỚI CẦN ẨN ---
//   '/(driver)/findPackages', // Thêm tên file "rác"
//   '/(driver)/post-vehicle', // Thêm tên file "rác"
// ];

import React from 'react'
import { Stack } from 'expo-router'

// Minimal driver group layout. Use a Stack with header hidden.
// You can switch to Tabs later if you add more driver routes.
export default function DriverLayout() {
	return <Stack screenOptions={{ headerShown: false }} />
}
// }

