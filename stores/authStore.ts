// src/stores/authStore.ts
import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { jwtDecode } from 'jwt-decode'
import { AuthenticatedUser } from '@/models/types'

interface AuthState {
  user: AuthenticatedUser | null
  loading: boolean
  wallet?: any | null
  isVerified?: boolean
  verificationMessage?: string
  login: (user: AuthenticatedUser) => Promise<void>
  logout: () => Promise<void>
  restoreSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  restoreSession: async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken')
      const userStr = await AsyncStorage.getItem('user')
      const walletStr = await AsyncStorage.getItem('wallet')
      const verifyStr = await AsyncStorage.getItem('verificationStatus')
      if (token && userStr) {
        const decoded: any = jwtDecode(token)
        
        if (decoded.exp * 1000 > Date.now()) {
          const storedUser = JSON.parse(userStr)
          let storedWallet = walletStr ? JSON.parse(walletStr) : null
          // if backend response DTO was stored accidentally, extract result
          if (storedWallet && storedWallet.result) storedWallet = storedWallet.result
          const verifyData = verifyStr ? JSON.parse(verifyStr) : null
          set({ 
            user: storedUser, 
            wallet: storedWallet, 
            isVerified: verifyData?.isVerified || false,
            verificationMessage: verifyData?.message || '',
            loading: false 
          })
          return
        }
      }
      await AsyncStorage.multiRemove(['accessToken', 'user'])
    } catch (e) {
      console.error('restoreSession error', e)
    } finally {
      set({ loading: false })
    }
  },

  login: async (userData) => {
    await AsyncStorage.setItem('accessToken', userData.accessToken)
    await AsyncStorage.setItem('user', JSON.stringify(userData))
    set({ user: userData })

    // fetch wallet and verification status after login (best-effort)
    try {
      const walletService = (await import('@/services/walletService')).default
      const ekycService = (await import('@/services/ekycService')).ekycService
      const w = await walletService.getMyWallet()
      if (w && w.isSuccess !== false) {
        const walletObj = (w.result ?? w.data) || w
        await AsyncStorage.setItem('wallet', JSON.stringify(walletObj))
        set({ wallet: walletObj })
      }
      const verifyResp = await ekycService.checkVerifiedStatus()
      if (verifyResp && verifyResp.isSuccess !== false) {
        // Backend returns: { result: boolean, message: string }
        const isVerified = verifyResp.result === true
        const message = verifyResp.message || ''
        
        const statusData = {
          isVerified,
          message
        }
        await AsyncStorage.setItem('verificationStatus', JSON.stringify(statusData))
        set({ 
          isVerified: statusData.isVerified,
          verificationMessage: statusData.message
        })
      }
    } catch (e) {
      // swallow — non-critical for login
      console.warn('post-login fetch failed', e)
    }
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['accessToken', 'user'])
    await AsyncStorage.multiRemove(['wallet', 'verificationStatus'])
    set({ user: null, wallet: null, isVerified: false, verificationMessage: '' })
  },
}))
