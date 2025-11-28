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
  startLocation: { address: string; latitude: number; longitude: number }
  endLocation: { address: string; latitude: number; longitude: number }
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
      const res = await api.post('api/TripDriverAssignments/apply-post-trip', {
        postTripId: payload.postTripId,
        postTripDetailId: payload.postTripDetailId,
        StartLocation: (payload.startLocation && (payload.startLocation as any).address) ? (payload.startLocation as any).address : (String(payload.startLocation) ?? ''),
        EndLocation: (payload.endLocation && (payload.endLocation as any).address) ? (payload.endLocation as any).address : (String(payload.endLocation) ?? '')
      })
      return res.data
    } catch (e: any) {
      if (e?.response?.data) return e.response.data
      throw e
    }
  }
}

export default assignmentService
