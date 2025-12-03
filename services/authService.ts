// src/services/authService.ts
import api from '@/config/api'
import { jwtDecode } from 'jwt-decode'
import { setToken, removeToken } from '@/utils/token'
import { ResponseDTO, AuthenticatedUser, Role } from '@/models/types'

interface DecodedToken {
  userId: string
  fullName?: string
  Role?: Role
  exp?: number
}

export const authService = {
  login: async (
    credentials: { email: string; password: string },
    role: Role
  ): Promise<ResponseDTO<AuthenticatedUser>> => {
    try {
      const response = await api.post<ResponseDTO>(
        '/api/auth/login',
        { ...credentials, role }
      )

      const { statusCode, isSuccess, message, result } = response.data
      if (!isSuccess || !result) {
        return { statusCode, isSuccess, message, result: null as any }
      }

      const { accessToken, refreshToken } = result as {
        accessToken: string
        refreshToken: string
      }

      // Xóa token cũ nếu có, sau đó lưu token mới
      try {
        await removeToken()
      } catch (e) {
        console.warn('[authService] removeToken warning', e)
      }
      await setToken(accessToken)

      // Đồng thời set header mặc định cho axios instance để chắc chắn request tiếp theo dùng token mới
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      } catch (e) {
        console.warn('[authService] fail to set axios default header', e)
      }

      const decoded = jwtDecode<DecodedToken>(accessToken)

      console.log('[authService] Decoded token:', decoded)

      // Sau khi lưu token, gọi API /api/user/me để lấy profile đầy đủ
      try {
        // Gọi profile kèm header rõ ràng để tránh trường hợp interceptor chưa đọc token kịp
        const profileResp = await api.get<ResponseDTO>('/api/user/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const profileData = profileResp.data?.result
        

        // Gộp thông tin từ token + profile
        const user: AuthenticatedUser = {
          userId: decoded.userId,
          userName: profileData?.userName || decoded.fullName || '',
          email: profileData?.email || credentials.email,
          role: decoded.Role || role,
          accessToken,
          refreshToken,
          userStatus: profileData?.userStatus || ('ACTIVE' as any),
          phoneNumber: profileData?.phoneNumber || '',
          avatarUrl: profileData?.avatarUrl || undefined,
          // gắn thêm các trường của provider nếu có
          ...(profileData?.companyName ? { companyName: profileData.companyName } : {}),
          ...(profileData?.totalItems ? { totalItems: profileData.totalItems } : {}),
          ...(profileData?.totalPackages ? { totalPackages: profileData.totalPackages } : {}),
        } as AuthenticatedUser

        // Attach raw profile payload so callers can access all profile fields
        ;(user as any).profile = profileData || profileResp.data || null

        console.log('[authService] Final user object with profile:', user)

        return {
          statusCode,
          isSuccess: true,
          message,
          result: user,
        }
      } catch (err) {
        console.warn('[authService] Failed to fetch profile after login', err)

        // Nếu không lấy được profile thì trả về user tối thiểu từ token
        const user: AuthenticatedUser = {
          userId: decoded.userId,
          userName: decoded.fullName || '',
          email: credentials.email,
          role: decoded.Role || role,
          accessToken,
          refreshToken,
          userStatus: 'ACTIVE' as any,
          phoneNumber: '',
        }

        return {
          statusCode,
          isSuccess: true,
          message,
          result: user,
        }
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.'
      return {
        statusCode: error.response?.status || 500,
        isSuccess: false,
        message,
        result: null as any,
      }
    }
  },
  register: async (payload: any) => {
    try {
      const res = await api.post('/api/auth/register', payload)
      return res.data
    } catch (e: any) {
      console.error('authService.register failed', e)
      if (e.response) console.error('response', e.response.data)
      throw e
    }
  },
  registerDriver: async (payload: any) => {
    try {
      // If payload is FormData (contains file), send multipart request
      if (typeof FormData !== 'undefined' && payload instanceof FormData) {
        const res = await api.post('/api/Auth/register-driver', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        return res.data
      }
      const res = await api.post('/api/Auth/register-driver', payload)
      return res.data
    } catch (e: any) {
      console.error('authService.registerDriver failed', e)
      if (e.response) console.error('response', e.response.data)
      throw e
    }
  },
  registerOwner: async (payload: any) => {
    try {
      if (typeof FormData !== 'undefined' && payload instanceof FormData) {
        const res = await api.post('/api/auth/register-owner', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        return res.data
      }
      const res = await api.post('/api/auth/register-owner', payload)
      return res.data
    } catch (e: any) {
      console.error('authService.registerOwner failed', e)
      if (e.response) console.error('response', e.response.data)
      throw e
    }
  },
  registerProvider: async (payload: any) => {
    try {
      if (typeof FormData !== 'undefined' && payload instanceof FormData) {
        const res = await api.post('/api/auth/register-provider', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        return res.data
      }
      const res = await api.post('/api/auth/register-provider', payload)
      return res.data
    } catch (e: any) {
      console.error('authService.registerProvider failed', e)
      if (e.response) console.error('response', e.response.data)
      throw e
    }
  },
  verifyEmail: async (userId: string, token: string): Promise<ResponseDTO<any>> => {
    try {
      const response = await api.get('/api/auth/verify-email', {
        params: { userId, token },
      })
      return response.data
    } catch (e: any) {
      console.error('authService.verifyEmail failed', e)
      if (e.response) console.error('response', e.response.data)
      throw e
    }
  },
}
