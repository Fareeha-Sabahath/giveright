import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  CheckCircle2,
  Clock,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  Truck,
} from 'lucide-react';
import { DELIVERY_STAGES, useApp } from '../context/AppContext';
import { DeliveryRecord, DeliveryStage } from '../types';
import { StatusLabel } from './StatusText';

interface DeliveryMapProps {
  delivery: DeliveryRecord;
  canUpdateStage: boolean;
  canConfirmReceipt: boolean;
}

function makeMarkerIcon(label: string, colorHex: string) {
  return L.divIcon({
    className: 'giveright-leaflet-marker',
    html: `<div style="display:flex;align-items:center;gap:6px;background:${colorHex};color:#fff;padding:4px 9px;border-radius:6px;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.28);white-space:nowrap;border:2px solid #fff;">${label}</div>`,
    iconSize: [120, 28],
    iconAnchor: [60, 14],
  });
}

export const DeliveryMapPanel: React.FC<DeliveryMapProps> = ({
  delivery,
  canUpdateStage,
  canConfirmReceipt,
}) => {
  const { updateDeliveryStage, updateDeliveryGPS, acceptAllocation } = useApp();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  const [gpsFeedback, setGpsFeedback] = useState<string>('');
  const [gpsError, setGpsError] = useState<string>('');
  const [stageNote, setStageNote] = useState<string>('');
  const [simRunning, setSimRunning] = useState<boolean>(false);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [delivery.currentLat, delivery.currentLng],
      zoom: 12,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layersRef.current = group;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layersRef.current = null;
    };
  }, []);

  // Update markers and route polylines whenever delivery changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const pickupLatLng: L.LatLngTuple = [delivery.pickupLat, delivery.pickupLng];
    const currentLatLng: L.LatLngTuple = [delivery.currentLat, delivery.currentLng];
    const dropLatLng: L.LatLngTuple = [delivery.dropLat, delivery.dropLng];

    // Completed segment (Pickup -> Current)
    L.polyline([pickupLatLng, currentLatLng], {
      color: '#059669',
      weight: 4,
      opacity: 0.9,
    }).addTo(group);

    // Remaining route segment (Current -> Destination)
    L.polyline([currentLatLng, dropLatLng], {
      color: '#113828',
      weight: 3,
      dashArray: '8, 8',
      opacity: 0.75,
    }).addTo(group);

    L.marker(pickupLatLng, {
      icon: makeMarkerIcon('PICKUP', '#113828'),
    })
      .bindPopup(
        `<strong>Donor Pickup</strong><br/>${delivery.donorName}<br/>${delivery.pickupLocation}`
      )
      .addTo(group);

    L.marker(dropLatLng, {
      icon: makeMarkerIcon('NGO DROP', '#059669'),
    })
      .bindPopup(
        `<strong>NGO Destination</strong><br/>${delivery.ngoName}<br/>${delivery.dropLocation}`
      )
      .addTo(group);

    const vehicleLabel =
      delivery.gpsSource === 'REAL_BROWSER_GPS'
        ? 'LIVE GPS'
        : delivery.stage === 'Awaiting NGO Acceptance'
        ? 'PICKUP HUB'
        : 'SIMULATED GPS';
    const positionDesc =
      delivery.gpsSource === 'REAL_BROWSER_GPS'
        ? 'Live Browser GPS'
        : delivery.stage === 'Awaiting NGO Acceptance'
        ? 'Initial Pickup Hub (Awaiting Acceptance)'
        : 'Simulated Demo GPS';
    L.marker(currentLatLng, {
      icon: makeMarkerIcon(vehicleLabel, '#D97706'),
    })
      .bindPopup(
        `<strong>Courier Position (${positionDesc})</strong><br/>Stage: ${delivery.stage}<br/>Lat: ${delivery.currentLat.toFixed(
          4
        )}, Lng: ${delivery.currentLng.toFixed(4)}`
      )
      .addTo(group);

    const bounds = L.latLngBounds([pickupLatLng, currentLatLng, dropLatLng]);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [delivery]);

  // Request real browser Geolocation API with explicit user action
  const handleUseRealGPS = () => {
    setGpsError('');
    setGpsFeedback('Requesting browser geolocation permission...');
    if (!('geolocation' in navigator)) {
      setGpsFeedback('');
      setGpsError(
        'Browser Geolocation API is not supported in this browser. Use Simulated Demo GPS instead.'
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateDeliveryGPS(delivery.id, latitude, longitude, 'REAL_BROWSER_GPS');
        setGpsFeedback(
          `Live browser GPS updated (${latitude.toFixed(4)}, ${longitude.toFixed(4)}).`
        );
      },
      (err) => {
        setGpsFeedback('');
        setGpsError(
          `Geolocation permission unavailable (${err.message}). You can run Simulated Demo GPS below.`
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Simulated GPS demo stepper along pickup -> destination corridor
  const handleSimulateStep = () => {
    setGpsError('');
    const currentIdx = DELIVERY_STAGES.indexOf(delivery.stage);
    const nextStage: DeliveryStage =
      currentIdx < DELIVERY_STAGES.length - 2
        ? DELIVERY_STAGES[currentIdx + 1]
        : 'Delivered';

    updateDeliveryStage(
      delivery.id,
      nextStage,
      `Simulated Demo GPS progression to ${nextStage}.`,
      undefined,
      'SIMULATED_DEMO_GPS'
    );
    setGpsFeedback(`Simulated Demo GPS moved vehicle to stage: ${nextStage}.`);
  };

  const handleAutoSimulateRoute = () => {
    if (simRunning) return;
    setSimRunning(true);
    setGpsError('');
    setGpsFeedback('Running simulated demo transit along Hyderabad corridor...');
    const targetStages: DeliveryStage[] = ['Picked Up', 'In Transit', 'Near Destination', 'Delivered'];
    const currentIdx = DELIVERY_STAGES.indexOf(delivery.stage);
    const remainingStages = targetStages.filter(
      (s) => DELIVERY_STAGES.indexOf(s) > currentIdx
    );

    if (remainingStages.length === 0) {
      setSimRunning(false);
      setGpsFeedback('Simulated route already reached destination.');
      return;
    }

    remainingStages.forEach((st, idx) => {
      window.setTimeout(() => {
        updateDeliveryStage(
          delivery.id,
          st,
          `Simulated Demo GPS auto-transit checkpoint: ${st}.`,
          undefined,
          'SIMULATED_DEMO_GPS'
        );
        if (idx === remainingStages.length - 1) {
          setSimRunning(false);
          setGpsFeedback('Simulated Demo GPS completed delivery arrival.');
        }
      }, (idx + 1) * 1400);
    });
  };

  const currentStageIndex = DELIVERY_STAGES.indexOf(delivery.stage);

  return (
    <div className="space-y-6">
      {/* Top Status & GPS Source Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              {delivery.itemName} ({delivery.quantity} {delivery.unit})
            </h2>
            <StatusLabel
              label={delivery.stage}
              tone={
                delivery.stage === 'Receipt Confirmed' || delivery.stage === 'Delivered'
                  ? 'emerald'
                  : delivery.stage === 'Awaiting NGO Acceptance'
                  ? 'amber'
                  : 'forest'
              }
              icon={
                delivery.stage === 'Receipt Confirmed'
                  ? 'check'
                  : delivery.stage === 'Awaiting NGO Acceptance'
                  ? 'alert'
                  : 'truck'
              }
            />
          </div>
          <div className="text-sm text-slate-600 flex flex-wrap items-center gap-2">
            <span>From: {delivery.donorName}</span>
            <span aria-hidden="true">·</span>
            <span>To: {delivery.ngoName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-nums text-xs">
              {delivery.distanceKm} km remaining
              {delivery.estimatedMinutes > 0
                ? ` (~${delivery.estimatedMinutes} min)`
                : ''}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {delivery.gpsSource === 'REAL_BROWSER_GPS' ? (
            <StatusLabel
              label="LIVE BROWSER GPS"
              tone="emerald"
              icon="check"
            />
          ) : delivery.stage === 'Awaiting NGO Acceptance' ? (
            <StatusLabel
              label="PICKUP HUB COORDINATES"
              tone="amber"
              icon="alert"
            />
          ) : (
            <StatusLabel
              label="SIMULATED DEMO GPS"
              tone="amber"
              icon="alert"
            />
          )}
          <span className="text-xs text-slate-500 font-mono-nums">
            Updated {new Date(delivery.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Interactive Leaflet Map + Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <MapPin className="w-4 h-4 text-[#059669]" />
              <span>OpenStreetMap Route View</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {delivery.stage !== 'Awaiting NGO Acceptance' && (
                <button
                  type="button"
                  onClick={handleUseRealGPS}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#113828] text-white hover:bg-[#0B261B] transition-colors cursor-pointer"
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                  <span>Share Real Browser GPS</span>
                </button>
              )}
              {canUpdateStage &&
                delivery.stage !== 'Awaiting NGO Acceptance' &&
                delivery.stage !== 'Receipt Confirmed' && (
                <>
                  <button
                    type="button"
                    onClick={handleSimulateStep}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Step Simulated GPS</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoSimulateRoute}
                    disabled={simRunning}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>{simRunning ? 'Simulating...' : 'Simulate Full Transit'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div ref={mapContainerRef} className="w-full h-[380px] sm:h-[430px]" />

          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <span>
              Coordinates:{' '}
              <strong className="font-mono-nums text-slate-900">
                {delivery.currentLat.toFixed(5)}, {delivery.currentLng.toFixed(5)}
              </strong>{' '}
              (
              {delivery.gpsSource === 'REAL_BROWSER_GPS'
                ? 'Verified Browser Geolocation'
                : delivery.stage === 'Awaiting NGO Acceptance'
                ? 'Donor Pickup Hub — Delivery Not Started'
                : 'Simulated Demo Coordinates — Not Live Hardware Telemetry'}
              )
            </span>
            {gpsFeedback && (
              <span className="text-emerald-700 font-medium">{gpsFeedback}</span>
            )}
            {gpsError && (
              <span className="text-rose-700 font-medium">{gpsError}</span>
            )}
          </div>
        </div>

        {/* 7-Stage Delivery Timeline & Controls */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Delivery Stage Progress
            </h3>
            <ol className="space-y-3">
              {DELIVERY_STAGES.map((stage, idx) => {
                const done = idx <= currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                const logEntry = [...delivery.timeline]
                  .reverse()
                  .find((t) => t.stage === stage);

                return (
                  <li key={stage} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                        done
                          ? 'bg-[#059669] text-white'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm font-semibold ${
                          isCurrent
                            ? 'text-[#113828]'
                            : done
                            ? 'text-slate-900'
                            : 'text-slate-400'
                        }`}
                      >
                        {stage}
                      </div>
                      {logEntry && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          <span className="font-mono-nums">
                            {new Date(logEntry.timestamp).toLocaleString()}
                          </span>
                          {' · '}
                          <span>{logEntry.note}</span>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-3">
            {delivery.stage === 'Awaiting NGO Acceptance' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  Awaiting NGO acceptance. Once <strong>{delivery.ngoName}</strong> accepts this allocation, pickup scheduling and live delivery tracking will begin.
                </div>
                {canConfirmReceipt && (
                  <button
                    type="button"
                    onClick={() => acceptAllocation(delivery.matchId)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[#059669] hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept Allocation</span>
                  </button>
                )}
              </div>
            )}

            {canUpdateStage &&
              delivery.stage !== 'Awaiting NGO Acceptance' &&
              delivery.stage !== 'Receipt Confirmed' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Update Delivery Stage
                </label>
                <input
                  type="text"
                  value={stageNote}
                  onChange={(e) => setStageNote(e.target.value)}
                  placeholder="Optional dispatch note (e.g. Van TS09-GR-412 departed)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <div className="flex flex-wrap gap-2">
                  {currentStageIndex < DELIVERY_STAGES.length - 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = DELIVERY_STAGES[currentStageIndex + 1];
                        updateDeliveryStage(
                          delivery.id,
                          next,
                          stageNote || undefined,
                          undefined,
                          delivery.gpsSource
                        );
                        setStageNote('');
                      }}
                      className="flex-1 px-3 py-2 text-xs font-semibold bg-[#113828] hover:bg-[#0B261B] text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Advance to: {DELIVERY_STAGES[currentStageIndex + 1]}
                    </button>
                  )}
                  {delivery.stage !== 'Delivered' && (
                    <button
                      type="button"
                      onClick={() => {
                        updateDeliveryStage(
                          delivery.id,
                          'Delivered',
                          stageNote || 'Arrived at NGO receiving center.',
                          { lat: delivery.dropLat, lng: delivery.dropLng },
                          delivery.gpsSource
                        );
                        setStageNote('');
                      }}
                      className="px-3 py-2 text-xs font-semibold border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Mark Delivered
                    </button>
                  )}
                </div>
              </div>
            )}

            {canConfirmReceipt &&
              (delivery.stage === 'Delivered' ||
                delivery.stage === 'Near Destination') && (
                <button
                  type="button"
                  onClick={() => {
                    updateDeliveryStage(
                      delivery.id,
                      'Receipt Confirmed',
                      'NGO verified item counts and confirmed receipt.',
                      { lat: delivery.dropLat, lng: delivery.dropLng },
                      delivery.gpsSource
                    );
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[#059669] hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Donation Receipt</span>
                </button>
              )}

            {delivery.stage === 'Receipt Confirmed' && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Delivery completed and receipt confirmed by {delivery.ngoName}.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Route Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500">Pickup Origin</div>
          <div className="font-semibold text-slate-900">{delivery.donorName}</div>
          <div className="text-slate-600">{delivery.pickupLocation}</div>
          <div className="font-mono-nums text-xs text-slate-500">
            {delivery.pickupLat.toFixed(4)}, {delivery.pickupLng.toFixed(4)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500">NGO Destination</div>
          <div className="font-semibold text-slate-900">{delivery.ngoName}</div>
          <div className="text-slate-600">{delivery.dropLocation}</div>
          <div className="font-mono-nums text-xs text-slate-500">
            {delivery.dropLat.toFixed(4)}, {delivery.dropLng.toFixed(4)}
          </div>
        </div>
      </div>
    </div>
  );
};
