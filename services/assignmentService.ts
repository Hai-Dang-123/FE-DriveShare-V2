import api from '@/config/api'

export interface CreateAssignmentPayload {
  tripId: string
  driverId: string
  type: number // 0 PRIMARY, 1 SECONDARY
  baseAmount: number
  bonusAmount?: number
  startLocation: { address: string; latitude: number; longitude: number }
  endLocation: { address: string; latitude: number; longitude: number }
}

export interface CreateAssignmentByPostTripDTO {
  postTripId: string
  postTripDetailId: string
  startLocation: string | null | { address: string; latitude: number; longitude: number }
  endLocation: string | null | { address: string; latitude: number; longitude: number }
}

const assignmentService = {
  async assignDriverByOwner(payload: CreateAssignmentPayload) {
    try {
      const res = await api.post('api/TripDriverAssignments/assign-driver-by-owner', {
        tripId: payload.tripId,
        driverId: payload.driverId,
        type: payload.type,
        baseAmount: payload.baseAmount,
        bonusAmount: payload.bonusAmount,
        // Backend expects StartLocation/EndLocation as strings (address).
        StartLocation: (payload.startLocation && typeof payload.startLocation === 'string') ? payload.startLocation : (payload.startLocation?.address ?? ''),
        EndLocation: (payload.endLocation && typeof payload.endLocation === 'string') ? payload.endLocation : (payload.endLocation?.address ?? '')
      })
      return res.data
    } catch (e: any) {
      if (e?.response?.data) return e.response.data
      throw e
    }
  }
  ,
  async applyByPostTrip(payload: CreateAssignmentByPostTripDTO) {
    try {
      // Handle custom locations: null means use backend default, string means custom address
      let startLoc = null
      let endLoc = null
      
      if (payload.startLocation) {
        if (typeof payload.startLocation === 'string') {
          startLoc = payload.startLocation
        } else if ((payload.startLocation as any).address) {
          startLoc = (payload.startLocation as any).address
        }
      }
      
      if (payload.endLocation) {
        if (typeof payload.endLocation === 'string') {
          endLoc = payload.endLocation
        } else if ((payload.endLocation as any).address) {
          endLoc = (payload.endLocation as any).address
        }
      }
      
      const res = await api.post('api/TripDriverAssignments/apply-post-trip', {
        postTripId: payload.postTripId,
        postTripDetailId: payload.postTripDetailId,
        StartLocation: startLoc,
        EndLocation: endLoc
      })
      return res.data
    } catch (e: any) {
      if (e?.response?.data) return e.response.data
      throw e
    }
  }
}

export default assignmentService
