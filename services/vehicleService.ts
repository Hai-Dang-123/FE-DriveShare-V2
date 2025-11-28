import api from '@/config/api'

const vehicleService = {
  getMyVehicles: async (pageNumber = 1, pageSize = 20) => {
    const res = await api.get('api/vehicle/get-my-vehicles', {
      params: { pageNumber, pageSize },
    })
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
        let uri: string | undefined
        if (typeof img === 'string') uri = img
        else if (typeof img === 'object') uri = img.uri ?? img.vehicleImageURL ?? img.imageURL ?? img.url
        if (!uri) continue

        if (uri.startsWith('data:')) {
          try {
            const blob = await dataUrlToBlob(uri)
            // @ts-ignore
            form.append('VehicleImages', blob, `vehicle-${Date.now()}-${i}.jpg`)
          } catch (e) {
            console.warn('Failed to convert dataUrl to blob for vehicle image', e)
          }
        } else if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/')) {
          // @ts-ignore
          form.append('VehicleImages', { uri, name: `vehicle-${Date.now()}-${i}.jpg`, type: 'image/jpeg' })
        } else {
          try {
            const resp = await fetch(uri)
            const blob = await resp.blob()
            // @ts-ignore
            form.append('VehicleImages', blob, `vehicle-${Date.now()}-${i}.jpg`)
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
}

export default vehicleService
