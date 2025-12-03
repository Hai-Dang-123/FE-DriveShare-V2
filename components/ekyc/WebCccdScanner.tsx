import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // Đảm bảo đã cài expo-linear-gradient

// Global type declarations for VNPT SDK
declare global {
  interface Window {
    SDK?: {
      launch: (config: any) => void;
    };
  }
}

interface VnptSdkConfig {
  accessToken: string;
  tokenId: string;
  tokenKey: string;
}

interface WebCccdScannerProps {
  config: VnptSdkConfig;
  onResult: (result: any) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
  style?: ViewStyle;
}

// --- LOGIC GIỮ NGUYÊN ---
let isSdkScriptsLoading = false;
let sdkScriptsLoadedPromise: Promise<void> | null = null;

const loadVnptSdkScripts = async () => {
    if (window.SDK) return;
    if (isSdkScriptsLoading && sdkScriptsLoadedPromise) return sdkScriptsLoadedPromise;

    console.log("🚀 Bắt đầu tải VNPT SDK scripts...");
    isSdkScriptsLoading = true;

    sdkScriptsLoadedPromise = new Promise(async (resolve, reject) => {
        try {
            const scripts = [
                '/js/dist/lib/VNPTQRBrowserApp.js',
                '/js/dist/lib/VNPTBrowserSDKAppV4.0.0.js',
                '/js/dist/web-sdk-version-3.2.0.0.js',
            ];

            for (const src of scripts) {
                if (document.querySelector(`script[src="${src}"]`)) continue;
                const script = document.createElement('script');
                script.src = src;
                script.async = false;
                script.defer = true;
                document.body.appendChild(script);

                await new Promise((res, rej) => {
                    script.onload = () => res(null);
                    script.onerror = () => rej(new Error(`Không thể tải script: ${src}`));
                });
            }
            await new Promise(r => setTimeout(r, 500));
            if (!window.SDK) throw new Error("Scripts đã tải nhưng window.SDK không tồn tại.");
            resolve();
        } catch (error) {
            sdkScriptsLoadedPromise = null;
            reject(error);
        } finally {
            isSdkScriptsLoading = false;
        }
    });
    return sdkScriptsLoadedPromise;
};

// --- COMPONENT CHÍNH ---
const WebCccdScanner: React.FC<WebCccdScannerProps> = ({ config, onResult, onError, onCancel, style }) => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Đang khởi tạo hệ thống...');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const initSdk = async () => {
      try {
        if (!config.accessToken) throw new Error("Thiếu Access Token");
        if (isMounted.current) setStatus('Đang tải tài nguyên AI...');
        
        await loadVnptSdkScripts();
        if (!isMounted.current) return;
        if (!window.SDK) throw new Error("SDK không phản hồi.");

        if (isMounted.current) setStatus('Kết nối máy chủ eKYC...');
        
        const dataConfig = {
          CALL_BACK_END_FLOW: (result: any) => {
            if (isMounted.current) onResult(result);
          },
          HAS_BACKGROUND_IMAGE: false, 
          MAX_SIZE_IMAGE: 1, 
          LIST_TYPE_DOCUMENT: [-1, 4, 5, 6, 7],
        };

        if (isMounted.current) {
            setLoading(false);
            window.SDK.launch(dataConfig);
        }
      } catch (err: any) {
        if (isMounted.current) {
            setLoading(false);
            onError(err.message || 'Lỗi khởi tạo eKYC');
        }
      }
    };
    const timer = setTimeout(initSdk, 300);
    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      try {
        const container = document.getElementById("ekyc_sdk_intergrated");
        if (container) container.innerHTML = "";
      } catch (e) {}
    };
  }, [config]);

  return (
    <View style={[styles.wrapper, style]}>
      {/* Header nhẹ nhàng với Gradient */}
      <LinearGradient
        colors={['#FFFFFF', '#F0F9FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
            <View style={styles.indicator} />
            <Text style={styles.headerTitle}>Máy quét thông minh</Text>
        </View>
        <View style={styles.badge}>
            <Text style={styles.badgeText}>AI POWERED</Text>
        </View>
      </LinearGradient>

      <View style={styles.cameraContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0EA5E9" />
            <Text style={styles.loadingText}>{status}</Text>
          </View>
        )}

        {Platform.OS === 'web' ? (
            // @ts-ignore
            <div 
                id="ekyc_sdk_intergrated" 
                style={{ 
                    width: '100%', 
                    height: '100%', 
                    backgroundColor: '#000',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }} 
            />
        ) : (
            <Text style={{color: 'red', padding: 20}}>Chỉ hỗ trợ trên Web</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
            Vui lòng giữ giấy tờ nằm trọn trong khung hình
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: 620,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F9FF',
  },
  headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
  },
  indicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#22C55E', // Green dot
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  badgeText: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: '800',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#1E293B',
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F9FF',
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  }
});

export default WebCccdScanner;