import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/hooks/useAuth';

export default function RootLayout() {
  const { restoreSession } = useAuth();

  useEffect(() => {
    // Khi app mở lại, tự khôi phục session từ AsyncStorage
    restoreSession();
  }, []);

  return (
    <>
<StatusBar style="auto" />
<Stack screenOptions={{ headerShown: false }}>
<Stack.Screen name="index" />
<Stack.Screen name="(auth)" />
<Stack.Screen name="(driver)" />
<Stack.Screen name="(owner)" />
<Stack.Screen name="(provider)" />
<Stack.Screen name="(wallet)" />
</Stack>
</>
  );
}
