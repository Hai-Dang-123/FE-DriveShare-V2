import api from '@/config/api'
import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system'

const vehicleService = {
  getMyVehicles: async (params: {
    pageNumber: number
    pageSize: number
    search?: string
    sortBy?: string
    sortOrder?: string
    status?: string
  }) => {
    const queryParams = new URLSearchParams({
      pageNumber: params.pageNumber.toString(),
      pageSize: params.pageSize.toString(),
    })
    if (params.search) queryParams.append('search', params.search)
    if (params.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)
    if (params.status) queryParams.append('status', params.status)

    const res = await api.get(`api/vehicle/get-my-vehicles?${queryParams.toString()}`)
    return res.data
  },

  getVehicleById: async (id: string) => {
    const res = await api.get(`api/vehicle/${id}`)
    return res.data
  },
  // Upload one or multiple vehicle documents (front/back images + expiration)
  uploadVehicleDocument: async (payload: any) => {
    try {
      const form = new FormData()
      const getField = (pascal: string, camel: string) => payload[pascal] ?? payload[camel]

      const vehicleId = getField('VehicleId', 'vehicleId')
      if (!vehicleId) throw new Error('vehicleId is required')
      form.append('VehicleId', String(vehicleId))

      const documentsRaw: any[] = payload.Documents ?? payload.documents ?? (payload.document ? [payload.document] : [])
      for (let di = 0; di < documentsRaw.length; di++) {
        const doc = documentsRaw[di]
        const docPrefix = `Documents[${di}]`
        const getDocField = (name: string) => doc[name] ?? doc[name.charAt(0).toLowerCase() + name.slice(1)]

        const exp = getDocField('ExpirationDate')
        if (exp !== undefined && exp !== null) form.append(`${docPrefix}.ExpirationDate`, String(exp))

        const attachFile = async (fileObj: any, fieldName: string) => {
          if (!fileObj) return
          let uri: string | undefined
          if (typeof fileObj === 'string') uri = fileObj
          else if (typeof fileObj === 'object') uri = fileObj.uri ?? fileObj.vehicleImageURL ?? fileObj.imageURL ?? fileObj.url
          if (!uri) return

          if (uri.startsWith('data:')) {
            try {
              const resp = await fetch(uri)
              const blob = await resp.blob()
              // @ts-ignore
              form.append(`${docPrefix}.${fieldName}`, blob, `${fieldName}-${Date.now()}-${di}.jpg`)
            } catch (e) {
              console.warn('Failed to convert dataUrl to blob for document file', e)
            }
          } else if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/')) {
            // @ts-ignore
            form.append(`${docPrefix}.${fieldName}`, { uri, name: `${fieldName}-${Date.now()}-${di}.jpg`, type: 'image/jpeg' })
          } else {
            try {
              const resp = await fetch(uri)
              const blob = await resp.blob()
              // @ts-ignore
              form.append(`${docPrefix}.${fieldName}`, blob, `${fieldName}-${Date.now()}-${di}.jpg`)
            } catch (e) {
              console.warn('Unsupported document file URI, skipping:', uri, e)
            }
          }
        }

        await attachFile(getDocField('FrontFile'), 'FrontFile')
        await attachFile(getDocField('BackFile'), 'BackFile')
      }

      const res = await api.post('api/vehicle/upload-document', form)
      return res.data
    } catch (e: any) {
      console.error('uploadVehicleDocument failed', e)
      if (e.response) console.error('response', e.response.data)
      throw e
    }
  },
  getMyActiveVehicles: async (pageNumber = 1, pageSize = 20) => {
    const res = await api.get('api/vehicle/get-my-active-vehicles', {
      params: { pageNumber, pageSize },
    })
    return res.data
  },
  createVehicle: async (payload: any) => {
    try {
      const form = new FormData()
      const getField = (pascal: string, camel: string) => payload[pascal] ?? payload[camel]
      const appendIf = (k: string, v: any) => { if (v !== undefined && v !== null) form.append(k, String(v)) }

      appendIf('VehicleTypeId', getField('VehicleTypeId', 'vehicleTypeId') ?? '')
      appendIf('PlateNumber', getField('PlateNumber', 'plateNumber') ?? '')
      appendIf('Model', getField('Model', 'model') ?? '')
      appendIf('Brand', getField('Brand', 'brand') ?? '')
      appendIf('YearOfManufacture', getField('YearOfManufacture', 'yearOfManufacture') ?? 0)
      appendIf('Color', getField('Color', 'color') ?? '')
      appendIf('PayloadInKg', getField('PayloadInKg', 'payloadInKg') ?? 0)
      appendIf('VolumeInM3', getField('VolumeInM3', 'volumeInM3') ?? 0)
      // Features: array
      const features = getField('Features', 'features')
      if (Array.isArray(features)) features.forEach((f: any) => form.append('Features', String(f)))

      const imagesRaw: any[] = payload.VehicleImages ?? payload.vehicleImages ?? payload.images ?? []

      const dataUrlToBlob = async (dataUrl: string) => {
        try {
          const resp = await fetch(dataUrl)
          return await resp.blob()
        } catch (err) {
          try {
            const base64Marker = ';base64,'
            const parts = dataUrl.split(base64Marker)
            const contentType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'))
            const raw = atob(parts[1])
            const rawLength = raw.length
            const uInt8Array = new Uint8Array(rawLength)
            for (let i = 0; i < rawLength; ++i) uInt8Array[i] = raw.charCodeAt(i)
            return new Blob([uInt8Array], { type: contentType })
          } catch (e) {
            console.warn('dataUrlToBlob fallback failed', e)
            throw e
          }
        }
      }

      for (let i = 0; i < imagesRaw.length; i++) {
        const img = imagesRaw[i]
        const imgPrefix = `VehicleImages[${i}]`
        let uri: string | undefined
        if (typeof img === 'string') uri = img
        else if (typeof img === 'object') uri = img.uri ?? img.vehicleImageURL ?? img.imageURL ?? img.url
        if (!uri) continue

        // Append ImageType and Caption
        const imageType = img.ImageType ?? img.imageType ?? 0
        const caption = img.Caption ?? img.caption ?? ''
        form.append(`${imgPrefix}.ImageType`, String(imageType))
        if (caption) form.append(`${imgPrefix}.Caption`, caption)

        if (uri.startsWith('data:')) {
          try {
            const blob = await dataUrlToBlob(uri)
            // @ts-ignore
            form.append(`${imgPrefix}.ImageFile`, blob, `vehicle-${Date.now()}-${i}.jpg`)
          } catch (e) {
            console.warn('Failed to convert dataUrl to blob for vehicle image', e)
          }
        } else if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/')) {
          // @ts-ignore
          form.append(`${imgPrefix}.ImageFile`, { uri, name: `vehicle-${Date.now()}-${i}.jpg`, type: 'image/jpeg' })
        } else {
          try {
            const resp = await fetch(uri)
            const blob = await resp.blob()
            // @ts-ignore
            form.append(`${imgPrefix}.ImageFile`, blob, `vehicle-${Date.now()}-${i}.jpg`)
          } catch (e) {
            console.warn('Unsupported vehicle image URI, skipping:', uri, e)
          }
        }
      }

      // Documents[]: each document may have DocumentType, ExpirationDate (optional), FrontFile, BackFile
      const documentsRaw: any[] = payload.Documents ?? payload.documents ?? []
      for (let di = 0; di < documentsRaw.length; di++) {
        const doc = documentsRaw[di]
        const docPrefix = `Documents[${di}]`
        const getDocField = (name: string) => doc[name] ?? doc[name.charAt(0).toLowerCase() + name.slice(1)]
        // ExpirationDate (optional)
        const exp = getDocField('ExpirationDate')
        if (exp !== undefined && exp !== null) form.append(`${docPrefix}.ExpirationDate`, String(exp))

        const attachFile = async (fileObj: any, fieldName: string) => {
          if (!fileObj) return
          let uri: string | undefined
          if (typeof fileObj === 'string') uri = fileObj
          else if (typeof fileObj === 'object') uri = fileObj.uri ?? fileObj.vehicleImageURL ?? fileObj.imageURL ?? fileObj.url
          if (!uri) return

          if (uri.startsWith('data:')) {
            try {
              const blob = await dataUrlToBlob(uri)
              // @ts-ignore
              form.append(`${docPrefix}.${fieldName}`, blob, `${fieldName}-${Date.now()}-${di}.jpg`)
            } catch (e) {
              console.warn('Failed to convert dataUrl to blob for document file', e)
            }
          } else if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/')) {
            // @ts-ignore
            form.append(`${docPrefix}.${fieldName}`, { uri, name: `${fieldName}-${Date.now()}-${di}.jpg`, type: 'image/jpeg' })
          } else {
            try {
              const resp = await fetch(uri)
              const blob = await resp.blob()
              // @ts-ignore
              form.append(`${docPrefix}.${fieldName}`, blob, `${fieldName}-${Date.now()}-${di}.jpg`)
            } catch (e) {
              console.warn('Unsupported document file URI, skipping:', uri, e)
            }
          }
        }

        // FrontFile
        await attachFile(getDocField('FrontFile'), 'FrontFile')
        // BackFile
        await attachFile(getDocField('BackFile'), 'BackFile')
      }

      const res = await api.post('api/vehicle/create', form)
      return res.data
    } catch (e: any) {
      console.error('createVehicle failed', e)
      if (e.response) console.error('response', e.response.data)
      throw e
    }
  },

  // Add document to existing vehicle
  addVehicleDocument: async (vehicleId: string, documentData: {
    documentType: string
    expirationDate?: string
    frontFile: { uri?: string; base64?: string; fileName?: string; type?: string }
    backFile?: { uri?: string; base64?: string; fileName?: string; type?: string }
  }) => {
    try {
      const formData = new FormData()
      
      // Add DocumentType (required)
      formData.append('DocumentType', documentData.documentType)
      
      // Add ExpirationDate in ISO format (yyyy-MM-dd) if provided
      if (documentData.expirationDate) {
        // Convert dd/MM/yyyy to yyyy-MM-dd
        const parts = documentData.expirationDate.split('/')
        if (parts.length === 3) {
          const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}` // yyyy-MM-dd
          formData.append('ExpirationDate', isoDate)
          console.log(`ExpirationDate converted: ${documentData.expirationDate} → ${isoDate}`)
        } else {
          formData.append('ExpirationDate', documentData.expirationDate)
        }
      }
      
      // Helper to convert data URL to Blob (for WEB)
      const dataUrlToBlob = async (dataUrl: string) => {
        try {
          const resp = await fetch(dataUrl)
          return await resp.blob()
        } catch (err) {
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
      
      // Helper function to attach file - COPY TỪ ItemService
      const attachFile = async (fileObj: any, fieldName: string) => {
        if (!fileObj) return
        
        // Ưu tiên base64 nếu có (vì blob: URL không gửi được)
        let uri: string | undefined
        if (fileObj.base64) {
          uri = fileObj.base64.startsWith('data:') 
            ? fileObj.base64 
            : `data:image/jpeg;base64,${fileObj.base64}`
        } else if (fileObj.uri) {
          uri = fileObj.uri
        }
        
        if (!uri) {
          console.warn(`${fieldName}: No URI or base64 found`)
          return
        }
        
        console.log(`>>> [addVehicleDocument] Attaching ${fieldName}: ${uri.substring(0, 30)}...`)
        
        try {
          if (uri.startsWith('data:')) {
            // ===========================
            // === LUỒNG DATA: URL ===
            // ===========================
            
            if (Platform.OS === 'web') {
              // === WEB: Convert to Blob ===
              console.log(`>>> [addVehicleDocument] Web: Converting data:URL to Blob for ${fieldName}`)
              const blob = await dataUrlToBlob(uri)
              const fileName = fileObj.fileName || `${fieldName}-${Date.now()}.jpg`
              // @ts-ignore
              formData.append(fieldName, blob, fileName)
              
            } else {
              // === MOBILE: Write to temp file ===
              console.log(`>>> [addVehicleDocument] Mobile: Writing base64 to temp file for ${fieldName}`)
              
              const base64Data = uri.split(',')[1]
              const fileName = fileObj.fileName || `${fieldName}-${Date.now()}.jpg`
              const mimeType = fileObj.type || 'image/jpeg'
              
              const baseDir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory ?? ''
              const tempUri = baseDir + fileName
              
              await FileSystem.writeAsStringAsync(tempUri, base64Data, {
                encoding: (FileSystem as any).EncodingType?.Base64 ?? 'base64',
              })
              
              const rnFile: any = {
                uri: tempUri,
                name: fileName,
                type: mimeType,
              }
              
              // @ts-ignore
              formData.append(fieldName, rnFile)
            }
            
          } else if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/')) {
            // ===================================
            // === LUỒNG MOBILE (file:) ===
            // ===================================
            console.log(`>>> [addVehicleDocument] Mobile file:// for ${fieldName}`)
            
            const fileName = fileObj.fileName || `${fieldName}-${Date.now()}.jpg`
            const mimeType = fileObj.type || 'image/jpeg'
            
            const rnFile: any = {
              uri: uri,
              name: fileName,
              type: mimeType,
            }
            
            // @ts-ignore
            formData.append(fieldName, rnFile)
            
          } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
            // ===========================
            // === LUỒNG HTTP(S) URL ===
            // ===========================
            console.log(`>>> [addVehicleDocument] Fetching http(s):// for ${fieldName}`)
            const resp = await fetch(uri)
            const blob = await resp.blob()
            // @ts-ignore
            formData.append(fieldName, blob, `${fieldName}-${Date.now()}.jpg`)
            
          } else if (uri.startsWith('blob:')) {
            // ===========================
            // === LUỒNG BLOB: URL (WEB) ===
            // ===========================
            console.log(`>>> [addVehicleDocument] Web: Converting blob: URL for ${fieldName}`)
            const resp = await fetch(uri)
            const blob = await resp.blob()
            const fileName = fileObj.fileName || `${fieldName}-${Date.now()}.jpg`
            // @ts-ignore
            formData.append(fieldName, blob, fileName)
            
          } else {
            console.warn(`${fieldName}: Định dạng URI không được hỗ trợ: ${uri}`)
          }
        } catch (err) {
          console.warn(`Lỗi khi xử lý ${fieldName}:`, err)
        }
      }
      
      // Attach FrontFile (required)
      await attachFile(documentData.frontFile, 'FrontFile')
      
      // Attach BackFile (optional)
      if (documentData.backFile) {
        await attachFile(documentData.backFile, 'BackFile')
      }
      
      console.log('Sending FormData to API:', `api/VehicleDocument/add/${vehicleId}`)
      
      // Let axios auto-set Content-Type with boundary
      const res = await api.post(`api/VehicleDocument/add/${vehicleId}`, formData)
      return res.data
    } catch (e: any) {
      console.error('addVehicleDocument failed', e)
      if (e.response) {
        console.error('Response status:', e.response.status)
        console.error('Response data:', JSON.stringify(e.response.data, null, 2))
      }
      throw e
    }
  },
}

export default vehicleService
