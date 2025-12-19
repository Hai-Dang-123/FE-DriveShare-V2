/**
 * SimpleRouteSimulator - GPS Simulation Engine (Lightweight)
 * Giả lập xe chạy trên tuyến đường có sẵn
 * Hỗ trợ Pause/Resume và nhiều tài xế
 */

type Position = [number, number]; // [lng, lat]

export interface SimulatorLocation {
  latitude: number;
  longitude: number;
  heading: number; // bearing 0-360
  speed: number; // m/s
  timestamp: number;
}

export interface SimulatorConfig {
  route: Position[]; // Mảng tọa độ tuyến đường
  speedKmH?: number; // Tốc độ giả lập (km/h), default 40
  updateIntervalMs?: number; // Tần suất update (ms), default 3000
  onUpdate?: (location: SimulatorLocation) => void;
  onComplete?: () => void;
}

export class SimpleRouteSimulator {
  private route: Position[];
  private speedKmH: number;
  private updateIntervalMs: number;
  private onUpdate?: (location: SimulatorLocation) => void;
  private onComplete?: () => void;

  private currentIndex: number = 0;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private totalDistance: number = 0;
  private traveledDistance: number = 0;

  constructor(config: SimulatorConfig) {
    this.route = config.route;
    this.speedKmH = config.speedKmH || 40;
    this.updateIntervalMs = config.updateIntervalMs || 3000;
    this.onUpdate = config.onUpdate;
    this.onComplete = config.onComplete;

    // Tính tổng quãng đường
    this.totalDistance = this.calculateTotalDistance();
  }

  /**
   * Bắt đầu giả lập từ index cụ thể
   */
  public start(startIndex: number = 0): void {
    if (this.isRunning) {
      console.warn("[SimpleRouteSimulator] Already running");
      return;
    }

    if (startIndex >= this.route.length) {
      console.error("[SimpleRouteSimulator] Invalid startIndex");
      return;
    }

    this.currentIndex = startIndex;
    this.isRunning = true;

    // Tính quãng đường đã đi
    this.traveledDistance = this.calculateDistanceToIndex(startIndex);

    console.log(
      `[SimpleRouteSimulator] Started at index ${startIndex}/${this.route.length}`
    );

    // Emit vị trí đầu tiên ngay lập tức
    this.emitCurrentLocation();

    // Bắt đầu vòng lặp
    this.intervalId = setInterval(() => {
      this.tick();
    }, this.updateIntervalMs);
  }

  /**
   * Tạm dừng và trả về index hiện tại
   */
  public pause(): number {
    if (!this.isRunning) {
      console.warn("[SimpleRouteSimulator] Not running");
      return this.currentIndex;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    console.log(`[SimpleRouteSimulator] Paused at index ${this.currentIndex}`);
    return this.currentIndex;
  }

  /**
   * Dừng hoàn toàn
   */
  public stop(): void {
    this.pause();
    this.currentIndex = 0;
    this.traveledDistance = 0;
    console.log("[SimpleRouteSimulator] Stopped");
  }

  /**
   * Tìm điểm gần nhất trên route so với vị trí cho trước
   * Dùng khi Resume để snap xe về đường
   */
  public findNearestIndex(lat: number, lng: number): number {
    let minDistance = Infinity;
    let nearestIndex = 0;

    for (let i = 0; i < this.route.length; i++) {
      const [routeLng, routeLat] = this.route[i];
      const distance = this.haversineDistance(lat, lng, routeLat, routeLng);

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    console.log(
      `[SimpleRouteSimulator] Nearest point: index ${nearestIndex}, distance ${minDistance.toFixed(
        2
      )}m`
    );
    return nearestIndex;
  }

  /**
   * Get trạng thái hiện tại
   */
  public getState() {
    return {
      isRunning: this.isRunning,
      currentIndex: this.currentIndex,
      totalPoints: this.route.length,
      progress: (this.traveledDistance / this.totalDistance) * 100,
      remainingKm: (this.totalDistance - this.traveledDistance) / 1000,
    };
  }

  // ============ PRIVATE METHODS ============

  private tick(): void {
    if (!this.isRunning) return;

    // Tính khoảng cách xe có thể đi được trong 1 interval
    const distancePerUpdate =
      ((this.speedKmH * 1000) / 3600) * (this.updateIntervalMs / 1000); // meters

    console.log(
      `[Simulation:TICK] Distance to travel: ${distancePerUpdate.toFixed(
        2
      )}m at ${this.speedKmH} km/h`
    );

    // Tăng traveled distance
    this.traveledDistance += distancePerUpdate;

    // Di chuyển currentIndex đến đúng vị trí dựa trên traveledDistance
    let accumulatedDistance = 0;
    for (let i = 0; i < this.route.length - 1; i++) {
      const [lng1, lat1] = this.route[i];
      const [lng2, lat2] = this.route[i + 1];
      const segmentDist = this.haversineDistance(lat1, lng1, lat2, lng2);

      if (accumulatedDistance + segmentDist >= this.traveledDistance) {
        // Xe đang ở trong segment i->i+1
        this.currentIndex = i;
        console.log(
          `[Simulation:TICK] 📍 Current segment: ${i}->${
            i + 1
          }, traveled: ${this.traveledDistance.toFixed(
            2
          )}m/${this.totalDistance.toFixed(2)}m`
        );
        break;
      }

      accumulatedDistance += segmentDist;
    }

    // Kiểm tra đã đến đích chưa
    if (
      this.traveledDistance >= this.totalDistance ||
      this.currentIndex >= this.route.length - 1
    ) {
      console.log("[SimpleRouteSimulator] Reached destination");
      this.pause();
      if (this.onComplete) {
        this.onComplete();
      }
      return;
    }

    this.emitCurrentLocation();
  }

  private emitCurrentLocation(): void {
    if (this.currentIndex >= this.route.length) return;

    const current = this.route[this.currentIndex];
    const next =
      this.currentIndex < this.route.length - 1
        ? this.route[this.currentIndex + 1]
        : current;

    // Tính khoảng cách đã đi từ điểm current
    const distanceToCurrentIndex = this.calculateDistanceToIndex(
      this.currentIndex
    );
    const distanceInSegment = this.traveledDistance - distanceToCurrentIndex;

    // Khoảng cách của segment hiện tại
    const segmentDistance = this.haversineDistance(
      current[1],
      current[0],
      next[1],
      next[0]
    );

    // Tỷ lệ nội suy (0-1) trong segment
    const fraction =
      segmentDistance > 0
        ? Math.min(distanceInSegment / segmentDistance, 1)
        : 0;

    // Nội suy vị trí thực tế giữa current và next
    const interpolatedLat = current[1] + (next[1] - current[1]) * fraction;
    const interpolatedLng = current[0] + (next[0] - current[0]) * fraction;

    const heading = this.calculateBearing(
      current[1],
      current[0],
      next[1],
      next[0]
    );

    const location: SimulatorLocation = {
      latitude: interpolatedLat, // ✅ Vị trí nội suy (thay đổi liên tục)
      longitude: interpolatedLng, // ✅ Vị trí nội suy (thay đổi liên tục)
      heading: heading,
      speed: (this.speedKmH * 1000) / 3600, // Convert to m/s
      timestamp: Date.now(),
    };

    console.log(
      `[Tracking:SIMULATION] Sent: ${interpolatedLat.toFixed(
        6
      )}, ${interpolatedLng.toFixed(6)}, ${this.speedKmH.toFixed(1)} km/h`
    );

    if (this.onUpdate) {
      this.onUpdate(location);
    }
  }

  /**
   * Tính khoảng cách Haversine (meters)
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Tính bearing/heading từ điểm A -> B (0-360 độ)
   */
  private calculateBearing(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLon = this.toRadians(lon2 - lon1);
    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    let bearing = Math.atan2(y, x);
    bearing = this.toDegrees(bearing);
    return (bearing + 360) % 360;
  }

  /**
   * Tính tổng quãng đường của route
   */
  private calculateTotalDistance(): number {
    let total = 0;
    for (let i = 0; i < this.route.length - 1; i++) {
      const [lng1, lat1] = this.route[i];
      const [lng2, lat2] = this.route[i + 1];
      total += this.haversineDistance(lat1, lng1, lat2, lng2);
    }
    return total;
  }

  /**
   * Tính quãng đường từ đầu đến index
   */
  private calculateDistanceToIndex(index: number): number {
    let total = 0;
    for (let i = 0; i < Math.min(index, this.route.length - 1); i++) {
      const [lng1, lat1] = this.route[i];
      const [lng2, lat2] = this.route[i + 1];
      total += this.haversineDistance(lat1, lng1, lat2, lng2);
    }
    return total;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }
}
