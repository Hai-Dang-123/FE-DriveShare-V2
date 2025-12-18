/**
 * SignalR Tracking Service
 * Real-time Location Tracking với SignalR Hub
 * Hỗ trợ Driver (Publisher) và Viewer (Subscriber)
 */

import * as SignalR from '@microsoft/signalr';
import { getToken } from '@/utils/token';

export interface LocationUpdate {
  lat: number;
  lng: number;
  bearing: number;
  speed: number;
  driverName?: string;
  updatedAt?: string;
}

export interface SignalRConfig {
  baseURL: string; // Base API URL (e.g., http://192.168.100.49:5246/)
  onReceiveLocation?: (location: LocationUpdate) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: any) => void;
  disabled?: boolean; // Disable SignalR for simulation-only testing
}

class SignalRTrackingService {
  private connection: SignalR.HubConnection | null = null;
  private baseURL: string = '';
  private onReceiveLocation?: (location: LocationUpdate) => void;
  private onConnectionChange?: (connected: boolean) => void;
  private onError?: (error: any) => void;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  /**
   * Initialize SignalR Connection
   */
  public async init(config: SignalRConfig): Promise<void> {
    if (config.disabled) {
      console.log('[SignalR] Disabled - Simulation mode only');
      return;
    }

    if (this.connection) {
      console.warn('[SignalR] Already initialized');
      return;
    }

    this.baseURL = config.baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.onReceiveLocation = config.onReceiveLocation;
    this.onConnectionChange = config.onConnectionChange;
    this.onError = config.onError;

    try {
      const token = await getToken();
      
      const hubURL = `${this.baseURL}/hubs/tracking`;
      console.log('[SignalR] Connecting to:', hubURL);

      this.connection = new SignalR.HubConnectionBuilder()
        .withUrl(hubURL, {
          accessTokenFactory: () => token || '',
          transport: SignalR.HttpTransportType.WebSockets | SignalR.HttpTransportType.LongPolling,
          skipNegotiation: false,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 2s, 4s, 8s, 16s, 32s
            if (retryContext.previousRetryCount >= this.maxReconnectAttempts) {
              console.error('[SignalR] Max reconnect attempts reached');
              return null; // Stop reconnecting
            }
            return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 32000);
          },
        })
        .configureLogging(SignalR.LogLevel.Information)
        .build();

      // Event handlers
      this.connection.onclose((error) => {
        console.warn('[SignalR] Connection closed:', error?.message);
        if (this.onConnectionChange) {
          this.onConnectionChange(false);
        }
      });

      this.connection.onreconnecting((error) => {
        console.log('[SignalR] Reconnecting...', error?.message);
        this.reconnectAttempts++;
      });

      this.connection.onreconnected((connectionId) => {
        console.log('[SignalR] Reconnected. ConnectionId:', connectionId);
        this.reconnectAttempts = 0;
        if (this.onConnectionChange) {
          this.onConnectionChange(true);
        }
      });

      // Listen for location updates from server
      this.connection.on('ReceiveLocation', (data: LocationUpdate) => {
        console.log('[SignalR] ReceiveLocation:', data);
        if (this.onReceiveLocation) {
          this.onReceiveLocation(data);
        }
      });

      // Start connection
      await this.connection.start();
      console.log('[SignalR] Connected successfully. ConnectionId:', this.connection.connectionId);
      
      if (this.onConnectionChange) {
        this.onConnectionChange(true);
      }
    } catch (error: any) {
      console.error('[SignalR] Connection failed:', error);
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Join Trip Group (Both Driver & Viewer)
   */
  public async joinTripGroup(tripId: string): Promise<any> {
    if (!this.connection || this.connection.state !== SignalR.HubConnectionState.Connected) {
      throw new Error('[SignalR] Not connected');
    }

    try {
      console.log('[SignalR] Joining trip group:', tripId);
      const result = await this.connection.invoke('JoinTripGroup', tripId);
      console.log('[SignalR] Joined trip group:', tripId, 'Result:', result);
      return result;
    } catch (error: any) {
      console.error('[SignalR] Failed to join trip group:', error);
      throw error;
    }
  }

  /**
   * Leave Trip Group
   */
  public async leaveTripGroup(tripId: string): Promise<void> {
    if (!this.connection || this.connection.state !== SignalR.HubConnectionState.Connected) {
      console.warn('[SignalR] Not connected, cannot leave group');
      return;
    }

    try {
      console.log('[SignalR] Leaving trip group:', tripId);
      await this.connection.invoke('LeaveTripGroup', tripId);
      console.log('[SignalR] Left trip group:', tripId);
    } catch (error: any) {
      console.error('[SignalR] Failed to leave trip group:', error);
    }
  }

  /**
   * Send Location Update (Driver Only)
   */
  public async sendLocationUpdate(
    tripId: string,
    lat: number,
    lng: number,
    bearing: number,
    speed: number
  ): Promise<void> {
    if (!this.connection || this.connection.state !== SignalR.HubConnectionState.Connected) {
      // Silent skip if not connected (normal in simulation-only mode)
      return;
    }

    try {
      await this.connection.invoke('SendLocationUpdate', tripId, lat, lng, bearing, speed);
      console.log(`[SignalR] Sent location: ${lat}, ${lng}, bearing: ${bearing}, speed: ${speed}`);
    } catch (error: any) {
      console.error('[SignalR] Failed to send location:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  /**
   * Get connection state
   */
  public getState(): string {
    if (!this.connection) return 'Disconnected';
    return SignalR.HubConnectionState[this.connection.state];
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.connection?.state === SignalR.HubConnectionState.Connected;
  }

  /**
   * Disconnect and cleanup
   */
  public async disconnect(): Promise<void> {
    if (!this.connection) return;

    try {
      console.log('[SignalR] Disconnecting...');
      await this.connection.stop();
      this.connection = null;
      console.log('[SignalR] Disconnected');
      
      if (this.onConnectionChange) {
        this.onConnectionChange(false);
      }
    } catch (error: any) {
      console.error('[SignalR] Error during disconnect:', error);
    }
  }

  /**
   * Manual reconnect
   */
  public async reconnect(): Promise<void> {
    if (this.connection && this.connection.state === SignalR.HubConnectionState.Connected) {
      console.log('[SignalR] Already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('[SignalR] Already reconnecting...');
      return;
    }

    this.isConnecting = true;

    try {
      if (this.connection) {
        await this.connection.start();
        console.log('[SignalR] Reconnected successfully');
        
        if (this.onConnectionChange) {
          this.onConnectionChange(true);
        }
      }
    } catch (error: any) {
      console.error('[SignalR] Reconnect failed:', error);
      if (this.onError) {
        this.onError(error);
      }
    } finally {
      this.isConnecting = false;
    }
  }
}

// Export singleton instance
export const signalRTrackingService = new SignalRTrackingService();
