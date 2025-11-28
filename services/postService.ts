import api from '@/config/api'

interface ResponseDTO<T = any> {
  statusCode: number
  message?: string
  isSuccess: boolean
  result?: T
}

const postService = {
  async getMyPosts(pageNumber = 1, pageSize = 10) {
    try {
      const res = await api.get('api/PostPackage/get-my-posts', { params: { pageNumber, pageSize } })
      return res.data as ResponseDTO
    } catch (e: any) {
      console.error('getMyPosts failed', e)
      if (e.response) console.error('response', e.response.data)
      throw e
    }
  },
  async createProviderPostPackage(payload: any) {
    try {
      const res = await api.post('api/PostPackage/create-provider-post-package', payload)
      return res.data as ResponseDTO
    } catch (e: any) {
      console.error('createProviderPostPackage failed', e)
      if (e.response) console.error('response', e.response.data)
      throw e
    }
  },
  async getPostPackageDetails(postPackageId: string) {
    try {
      const res = await api.get(`api/PostPackage/get-details/${postPackageId}`)
      return res.data as ResponseDTO
    } catch (e: any) {
      console.error('getPostPackageDetails failed', e)
      if (e.response) console.error('response', e.response.data)
      throw e
    }
  },
  async getOpenPosts(pageNumber = 1, pageSize = 10) {
    try {
      const res = await api.get('api/PostPackage/get-open', { params: { pageNumber, pageSize } })
      return res.data as ResponseDTO
    } catch (e: any) {
      console.error('getOpenPosts failed', e)
      if (e.response) console.error('response', e.response.data)
      throw e
    }
  },
  async updatePostStatus(postPackageId: string, newStatus: string) {
    try {
      // Backend endpoint expects ChangePostPackageStatusDTO:
      // { PostPackageId: Guid, NewStatus: PostStatus }
      const payload = { PostPackageId: postPackageId, NewStatus: newStatus }
      const res = await api.put('api/PostPackage/change-post-package-status', payload)
      return res.data as ResponseDTO
    } catch (e: any) {
      console.error('updatePostStatus failed', e)
      if (e.response) console.error('response', e.response.data)
      throw e
    }
  },
}

export default postService
