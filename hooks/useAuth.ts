// src/hooks/useAuth.ts
import { useAuthStore } from '@/stores/authStore'

export const useAuth = () => {
  const { user, loading, login, logout, restoreSession, wallet, cccdVerified } = useAuthStore()
  return { user, loading, login, logout, restoreSession, wallet, cccdVerified }
}
