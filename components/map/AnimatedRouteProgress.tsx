import React, { useEffect, useState } from 'react';
import { ShapeSource } from '@vietmap/vietmap-gl-react-native';
import { RouteSimulator } from '../../utils/RouteSimulator';
import PulseCircleLayer from './PulseCircleLayer';

type RouteSimulatorFeature = GeoJSON.Feature<
  GeoJSON.Point,
  { distance: number; nearestIndex: number }
>;

interface AnimatedRouteProgressProps {
  route: GeoJSON.Feature<GeoJSON.LineString> | null;
  isSimulating?: boolean;
  speed?: number;
  onPositionUpdate?: (position: RouteSimulatorFeature) => void;
  usePulse?: boolean;
  simulatorRef?: React.MutableRefObject<RouteSimulator | null>;
}

export const AnimatedRouteProgress: React.FC<AnimatedRouteProgressProps> = ({
  route,
  isSimulating = false,
  speed = 0.04,
  onPositionUpdate,
  usePulse = true,
  simulatorRef,
}) => {
  const [currentPoint, setCurrentPoint] = useState<RouteSimulatorFeature | null>(null);
  const [simulator, setSimulator] = useState<RouteSimulator | null>(null);

  useEffect(() => {
    if (!route || !isSimulating) {
      if (simulator) {
        simulator.stop();
        setSimulator(null);
        if (simulatorRef) {
          simulatorRef.current = null;
        }
      }
      setCurrentPoint(null);
      return;
    }

    const routeSimulator = new RouteSimulator(route, speed);

    routeSimulator.addListener((point: RouteSimulatorFeature) => {
      setCurrentPoint(point);
      onPositionUpdate?.(point);
    });

    routeSimulator.start();
    setSimulator(routeSimulator);
    
    // Store ref for external control
    if (simulatorRef) {
      simulatorRef.current = routeSimulator;
    }

    return () => {
      routeSimulator.stop();
    };
  }, [route, isSimulating, speed]);

  if (!currentPoint) {
    return null;
  }

  if (usePulse) {
    return <PulseCircleLayer shape={currentPoint} />;
  }

  return (
    <ShapeSource id="animatedPositionSource" shape={currentPoint}>
      {/* Simple circle without pulse */}
    </ShapeSource>
  );
};
