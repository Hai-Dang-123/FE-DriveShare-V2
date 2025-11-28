import api from '@/config/api'

const userService = {
  async checkCCCDStatus() {
    try {
      const res = await api.get('api/UserDocument/check-cccd-status')
      return res.data
    } catch (e: any) {
      if (e?.response?.data) return e.response.data
      throw e
    }
  }
  ,
  async getMyProfile() {
    try {
      const res = await api.get('api/user/me')
      return res.data
    } catch (e: any) {
      if (e?.response?.data) return e.response.data
      throw e
    }
  }
}

export default userService
