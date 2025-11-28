// import React, { Suspense, Component, ErrorInfo, ReactNode } from 'react'
// import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native'
// import SafeVietMapComponent from './SafeVietMapComponent'
// import VietMapWebWrapper from './VietMapWebWrapper'
// import WebNavigation from './WebNavigation'

// interface VietMapUniversalProps {
//   coordinates?: [number, number][]
//   style?: any
//   showUserLocation?: boolean
//   navigationActive?: boolean
//   onLocationUpdate?: (pos: [number, number]) => void
//   onNavigationComplete?: () => void
//   showInstructions?: boolean
//   instructions?: string[]
//   externalLocation?: [number, number] | null
//   useWebNavigation?: boolean // Flag to use full navigation for web
//   userMarkerBearing?: number | undefined
// }

// interface VietMapUniversalState {
//   hasError: boolean
//   errorMessage?: string
// }

// // Error boundary for VietMap component
// class VietMapErrorBoundary extends Component<
//   { children: ReactNode },
//   VietMapUniversalState
// > {
//   constructor(props: { children: ReactNode }) {
//     super(props)
//     this.state = { hasError: false }
//   }

//   static getDerivedStateFromError(error: Error): VietMapUniversalState {
//     return {
//       hasError: true,
//       errorMessage: error.message
//     }
//   }

//   componentDidCatch(error: Error, errorInfo: ErrorInfo) {
//     console.error('VietMap Universal Error:', error, errorInfo)
//   }

//   render() {
//     if (this.state.hasError) {
//       return (
//         <View style={styles.errorContainer}>
// <Text style={styles.errorTitle}>🗺️ VietMap Error</Text>
// <Text style={styles.errorText}>
//             {this.state.errorMessage || 'Unknown map error'}
//           </Text>
// <Text style={styles.errorHint}>
//             Platform: {Platform.OS} | Check network and API key
//           </Text>
// </View>
//       )
//     }

//     return this.props.children
//   }
// }

// const LoadingFallback = () => (
//   <View style={styles.loadingContainer}>
// <ActivityIndicator size="large" color="#3B82F6" />
// <Text style={styles.loadingText}>Loading VietMap...</Text>
// <Text style={styles.loadingPlatform}>Platform: {Platform.OS}</Text>
// <Text style={styles.loadingSDK}>
//       {Platform.OS === 'web' ? '🌐 Web SDK' : '📱 Native SDK'}
//     </Text>
// </View>
// )

// /**
//  * Universal VietMap component that works on both web and mobile
//  * - Web: Uses VietMap Web SDK with full navigation support
//  * - Mobile: Uses VietMap React Native SDK
//  * - Supports both simple map view and full navigation mode
//  */
// export const VietMapUniversal: React.FC<VietMapUniversalProps> = ({
//   coordinates = [],
//   style,
//   showUserLocation = false,
//   navigationActive = false,
//   onLocationUpdate,
//   onNavigationComplete,
//   showInstructions = true,
//   instructions = [],
//   externalLocation = null,
//   useWebNavigation = false
//   , userMarkerBearing
// }) => {
//   const props = {
//     coordinates,
//     style,
//     showUserLocation,
//     navigationActive,
//     onLocationUpdate,
//     onNavigationComplete,
//     showInstructions,
//     instructions
//   }

//   const renderWebComponent = () => {
//     // Use full WebNavigation for navigation mode or when explicitly requested
//     if (useWebNavigation || (navigationActive && coordinates.length > 1)) {
//       return <WebNavigation {...props} externalLocation={externalLocation} userMarkerBearing={userMarkerBearing} />
//     }
//     // Use simple map wrapper for basic map display
//     return <VietMapWebWrapper {...props} userMarkerPosition={externalLocation ?? undefined} userMarkerBearing={userMarkerBearing} />
//   }

//   return (
//     <VietMapErrorBoundary>
// <Suspense fallback={<LoadingFallback />}>
//         {Platform.OS === 'web' ? (
//           renderWebComponent()
//         ) : (
//           <SafeVietMapComponent {...props} externalLocation={externalLocation} userMarkerBearing={userMarkerBearing} />
//         )}
//       </Suspense>
// </VietMapErrorBoundary>
//   )
// }

// const styles = StyleSheet.create({
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#FEF2F2',
//     padding: 20,
//     borderRadius: 12,
//     borderWidth: 2,
//     borderColor: '#FECACA',
//     borderStyle: 'dashed'
//   },
//   errorTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#DC2626',
//     marginBottom: 8,
//     textAlign: 'center'
//   },
//   errorText: {
//     fontSize: 14,
//     color: '#B91C1C',
//     textAlign: 'center',
//     marginBottom: 8,
//     lineHeight: 20
//   },
//   errorHint: {
//     fontSize: 12,
//     color: '#7F1D1D',
//     textAlign: 'center',
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#F3F4F6',
//     borderRadius: 12,
//     padding: 20
//   },
//   loadingText: {
//     marginTop: 12,
//     fontSize: 16,
//     color: '#374151',
//     fontWeight: '600'
//   },
//   loadingPlatform: {
//     marginTop: 4,
//     fontSize: 12,
//     color: '#6B7280',
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
//   },
//   loadingSDK: {
//     marginTop: 2,
//     fontSize: 11,
//     color: '#9CA3AF',
//     fontWeight: '600'
//   }
// })

// export default VietMapUniversal

import React, { Suspense, forwardRef } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import SafeVietMapComponent, { SafeVietMapRef } from './SafeVietMapComponent'
import VietMapWebWrapper from './VietMapWebWrapper'
import WebNavigation from './WebNavigation'

export interface VietMapUniversalProps {
  coordinates?: [number, number][]
  secondaryRoute?: [number, number][] // optional secondary route to render (e.g., pickup route)
  style?: any
  showUserLocation?: boolean
  navigationActive?: boolean
  onLocationUpdate?: (pos: [number, number]) => void
  onNavigationComplete?: () => void
  showInstructions?: boolean
  instructions?: string[]
  externalLocation?: [number, number] | null
  useWebNavigation?: boolean
  userMarkerBearing?: number | undefined
  primaryRouteColor?: string
  secondaryRouteColor?: string
}

const LoadingFallback = () => (
  <View style={styles.centerContainer}>
    <View style={styles.loadingCard}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
    </View>
  </View>
)

// ⚠️ QUAN TRỌNG: Dùng forwardRef để truyền ref xuống component con
const VietMapUniversal = forwardRef<SafeVietMapRef, VietMapUniversalProps>((props, ref) => {
  const {
    coordinates = [],
    navigationActive = false,
    useWebNavigation = false,
    externalLocation,
    userMarkerBearing
  } = props

  const renderWebComponent = () => {
    // Logic Web: Chọn Navigation hoặc View thường
    const shouldNavigate = useWebNavigation || (navigationActive && coordinates.length > 1)
    
    if (shouldNavigate) {
      // When app-level navigation is active, hide the WebNavigation's internal HUD/controls
      // to avoid duplicate FABs and speed badge overlapping with app UI.
      return <WebNavigation {...props} coordinates={coordinates} externalLocation={externalLocation} userMarkerBearing={userMarkerBearing} hideInternalControls={navigationActive} />
    }
    return <VietMapWebWrapper {...props} coordinates={coordinates} userMarkerPosition={externalLocation ?? undefined} userMarkerBearing={userMarkerBearing} secondaryRoute={props.secondaryRoute} primaryRouteColor={props.primaryRouteColor} secondaryRouteColor={props.secondaryRouteColor} />
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
        {Platform.OS === 'web' ? (
          renderWebComponent()
        ) : (
          // Truyền ref xuống SafeVietMapComponent để gọi recenter()
          <SafeVietMapComponent
            ref={ref} 
            {...props}
            coordinates={coordinates}
            externalLocation={externalLocation}
            userMarkerBearing={userMarkerBearing}
          />
        )}
    </Suspense>
  )
})

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    minHeight: 200,
  },
  loadingCard: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600', color: '#374151' },
})

export default VietMapUniversal