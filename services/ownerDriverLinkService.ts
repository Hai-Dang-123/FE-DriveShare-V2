import api from '@/config/api'

export interface LinkedDriverDTO {
  ownerDriverLinkId: string
  driverId: string
  fullName: string
  phoneNumber?: string
  avatarUrl?: string
  licenseNumber?: string
  status: string
  requestedAt?: string
  approvedAt?: string
}

export interface PaginatedDTO<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

const ownerDriverLinkService = {
  async getMyDrivers(pageNumber = 1, pageSize = 10) {
    try {
      const res = await api.get(`api/OwnerDriverLink/my-drivers?pageNumber=${pageNumber}&pageSize=${pageSize}`)
      return res.data
    } catch (e: any) {
      if (e?.response?.data) return e.response.data
      throw e
    }
  }
}

export default ownerDriverLinkService
