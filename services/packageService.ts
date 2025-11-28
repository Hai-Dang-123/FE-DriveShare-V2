import api from '@/config/api'

interface ResponseDTO<T = any> {
  isSuccess: boolean
  statusCode: number
  message?: string
  result?: T
}

const packageService = {
  async createPackage(payload: any) {
    try {
      const form = new FormData()

      // helper to read both PascalCase and camelCase
      const getField = (pascal: string, camel: string) => payload[pascal] ?? payload[camel]

      // Append scalar fields expected by PackageCreateDTO
      const appendIf = (key: string, val: any) => {
        if (val !== undefined && val !== null) form.append(key, String(val))
      }

      appendIf('PackageCode', getField('PackageCode', 'packageCode') ?? '')
      appendIf('Title', getField('Title', 'title') ?? '')
      appendIf('Description', getField('Description', 'description') ?? '')
      appendIf('Quantity', getField('Quantity', 'quantity') ?? 0)
      appendIf('Unit', getField('Unit', 'unit') ?? '')
      appendIf('WeightKg', getField('WeightKg', 'weightKg') ?? 0)
      appendIf('VolumeM3', getField('VolumeM3', 'volumeM3') ?? 0)
      appendIf('OtherRequirements', getField('OtherRequirements', 'otherRequirements') ?? '')
      appendIf('OwnerId', getField('OwnerId', 'ownerId') ?? '')
      appendIf('ProviderId', getField('ProviderId', 'providerId') ?? '')
      appendIf('ItemId', getField('ItemId', 'itemId') ?? '')
      appendIf('PostPackageId', getField('PostPackageId', 'postPackageId') ?? '')
      appendIf('TripId', getField('TripId', 'tripId') ?? '')

      // HandlingAttributes: array of strings -> append each
      const handling = getField('HandlingAttributes', 'handlingAttributes')
      if (Array.isArray(handling)) {
        handling.forEach((h) => form.append('HandlingAttributes', String(h)))
      }

      // Images: accept payload.PackageImages (string[] or objects) or payload.images
      const imagesRaw: any[] = payload.PackageImages ?? payload.images ?? []

      const dataUrlToBlob = async (dataUrl: string) => {
        // Try fetch first (works in browser)
        try {
          const resp = await fetch(dataUrl)
          return await resp.blob()
        } catch (err) {
          // Fallback: decode base64 manually (some RN/web envs)
          try {
            const base64Marker = ';base64,'
            const parts = dataUrl.split(base64Marker)
            const contentType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'))
            const raw = atob(parts[1])
            const rawLength = raw.length
            const uInt8Array = new Uint8Array(rawLength)
            for (let i = 0; i < rawLength; ++i) {
              uInt8Array[i] = raw.charCodeAt(i)
            }
            return new Blob([uInt8Array], { type: contentType })
          } catch (e) {
            console.warn('dataUrlToBlob fallback failed', e)
            throw e
          }
        }
      }

      for (let i = 0; i < imagesRaw.length; i++) {
        const img = imagesRaw[i]
        let uri: string | undefined
        if (typeof img === 'string') uri = img
        else if (typeof img === 'object') uri = img.uri ?? img.packageImageURL ?? img.url
        if (!uri) continue

        if (uri.startsWith('data:')) {
          try {
            const blob = await dataUrlToBlob(uri)
            // @ts-ignore
            form.append('PackageImages', blob, `package-${Date.now()}-${i}.jpg`)
          } catch (e) {
            console.warn('Failed to convert dataUrl to blob for package image', e)
          }
        } else if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/')) {
          // React Native file URI -> append file-like object (axios RN handles this shape)
          // @ts-ignore
          form.append('PackageImages', { uri, name: `package-${Date.now()}-${i}.jpg`, type: 'image/jpeg' })
        } else if (uri.startsWith('http') || uri.startsWith('blob:')) {
          try {
            const resp = await fetch(uri)
            const blob = await resp.blob()
            // @ts-ignore
            form.append('PackageImages', blob, `package-${Date.now()}-${i}.jpg`)
          } catch (e) {
            console.warn('Failed to fetch remote package image', e)
          }
        } else {
          // Fallback: try fetch for other URI schemes (e.g., blob: or unknown web URIs)
          try {
            const resp = await fetch(uri)
            const blob = await resp.blob()
            // @ts-ignore
            form.append('PackageImages', blob, `package-${Date.now()}-${i}.jpg`)
          } catch (e) {
            console.warn('Unsupported package image URI, skipping:', uri, e)
          }
        }
      }

      // Debug: log appended entries for PackageImages (help debug missing files)
      try {
        let appended = 0
        if ((form as any).entries) {
          for (const pair of (form as any).entries()) {
            const [name, value] = pair
            if (name === 'PackageImages') appended++
          }
        } else if ((form as any)._parts) {
          // react-native FormData variant exposes _parts
          for (const p of (form as any)._parts) {
            if (Array.isArray(p) && p[0] === 'PackageImages') appended++
          }
        }
        console.debug('packageService.createPackage - appended PackageImages count:', appended)
      } catch (e) {
        console.warn('Could not inspect FormData entries', e)
      }

      const res = await api.post('api/package/provider-create-package', form)
      return res.data as ResponseDTO
    } catch (e: any) {
      console.error('createPackage failed', e)
      if (e.response) console.error('response', e.response.data)
      throw e
    }
  },
  async getPackagesByUserId(pageNumber = 1, pageSize = 10) {
    try {
      const res = await api.get('api/package/get-packages-by-user', { params: { pageNumber, pageSize } })
      return res.data
    } catch (e: any) {
      console.error('getPackagesByUserId failed', e)
      if (e.response) console.error('response', e.response.data)
      throw e
    }
  },
  async getMyPendingPackages(pageNumber = 1, pageSize = 10) {
    try {
      const res = await api.get('api/package/get-my-pending-packages', { params: { pageNumber, pageSize } })
      return res.data
    } catch (e: any) {
      console.error('getMyPendingPackages failed', e)
      if (e.response) console.error('response', e.response.data)
      throw e
    }
  },
}

export default packageService
