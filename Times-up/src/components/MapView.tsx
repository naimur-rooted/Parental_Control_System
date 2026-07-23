/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef, useMap 
} from '@vis.gl/react-google-maps';
import { 
  MapPin, Compass, Navigation, History, Map as MapIcon, 
  RotateCw, ZoomIn, ZoomOut, AlertCircle, Crosshair, ExternalLink
} from 'lucide-react';
import { ActivityLog } from '../types';

interface MapViewProps {
  logs: ActivityLog[];
  childName: string;
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  'AIzaSyBeRR44oZQIaeiOkmSv-Pb5CQ75ylClaPc';

function MapPolyline({ path }: { path: Array<{ lat: number; lng: number }> }) {
  const map = useMap();

  useEffect(() => {
    if (!map || path.length < 2) return;

    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#ef4444',
      strokeOpacity: 0.85,
      strokeWeight: 4,
    });

    polyline.setMap(map);

    return () => {
      polyline.setMap(null);
    };
  }, [map, path]);

  return null;
}

function MapController({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    if (map && center) {
      map.panTo(center);
      map.setZoom(zoom);
    }
  }, [map, center, zoom]);

  return null;
}

function LocationMarker({
  log,
  isLatest,
  isSelected,
  onSelect,
}: {
  key?: string;
  log: ActivityLog;
  isLatest: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(isSelected);

  useEffect(() => {
    setOpen(isSelected);
  }, [isSelected]);

  const date = new Date(log.occurredAt);
  const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = date.toLocaleDateString();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: log.data.lat, lng: log.data.lng }}
        onClick={() => {
          setOpen(prev => !prev);
          onSelect();
        }}
        zIndex={isLatest ? 10 : 1}
      >
        <Pin
          background={isLatest ? '#ef4444' : '#3b82f6'}
          borderColor={isLatest ? '#b91c1c' : '#1d4ed8'}
          glyphColor="#ffffff"
          scale={isLatest ? 1.25 : 0.85}
        />
      </AdvancedMarker>

      {open && (
        <InfoWindow
          anchor={marker}
          onCloseClick={() => setOpen(false)}
        >
          <div className="p-1 text-slate-900 font-sans max-w-xs">
            <div className="font-bold text-xs flex items-center gap-1.5 text-slate-900">
              <span className={`w-2.5 h-2.5 rounded-full ${isLatest ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
              {isLatest ? 'Latest Location' : 'Breadcrumb Node'}
            </div>
            <div className="text-[11px] text-slate-700 mt-1 font-mono space-y-0.5">
              <div>Lat: <span className="font-semibold">{log.data.lat.toFixed(6)}</span></div>
              <div>Lng: <span className="font-semibold">{log.data.lng.toFixed(6)}</span></div>
              <div>Precision: <span className="text-emerald-700 font-semibold">±{log.data.accuracy || 15}m</span></div>
            </div>
            <div className="text-[10px] text-slate-500 border-t border-slate-200 mt-2 pt-1 font-medium">
              Recorded: {formattedDate} at {formattedTime}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function MapView({ logs, childName }: MapViewProps) {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');
  const [zoom, setZoom] = useState(15);

  // Filter for location logs sorted chronologically
  const locationLogs = logs
    .filter(l => l.logType === 'location' && l.data && typeof l.data.lat === 'number' && typeof l.data.lng === 'number')
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  const latestLocation = locationLogs[locationLogs.length - 1];

  // Default fallback center
  const fallbackCoords = { lat: 37.7749, lng: -122.4194, accuracy: 15 };
  const currentCoords = latestLocation ? latestLocation.data : fallbackCoords;

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: currentCoords.lat,
    lng: currentCoords.lng,
  });

  // Keep center updated if latest location changes and no node is manually selected
  useEffect(() => {
    if (latestLocation && !selectedLogId) {
      setMapCenter({ lat: latestLocation.data.lat, lng: latestLocation.data.lng });
    }
  }, [latestLocation, selectedLogId]);

  const handleRecenter = () => {
    if (latestLocation) {
      setSelectedLogId(latestLocation.id);
      setMapCenter({ lat: latestLocation.data.lat, lng: latestLocation.data.lng });
      setZoom(16);
    } else {
      setMapCenter({ lat: fallbackCoords.lat, lng: fallbackCoords.lng });
      setZoom(15);
    }
  };

  const polylinePath = locationLogs.map(l => ({ lat: l.data.lat, lng: l.data.lng }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 font-sans">
      
      {/* Location tracking details column */}
      <div className="xl:col-span-1 space-y-6">
        
        {/* Tracker Panel */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-red-500 font-bold text-sm uppercase tracking-wider">
              <Compass className="w-5 h-5 animate-pulse" />
              Live Google GPS Tracker
            </div>
            <button
              onClick={handleRecenter}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5" />
              Recenter
            </button>
          </div>
          
          <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 space-y-3.5">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-0.5">Target Device</span>
              <span className="text-sm text-white font-semibold">{childName}'s Phone</span>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-slate-900 pt-3">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-0.5">Latitude</span>
                <code className="text-xs text-red-400 font-mono font-semibold">{currentCoords.lat.toFixed(6)}</code>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-0.5">Longitude</span>
                <code className="text-xs text-red-400 font-mono font-semibold">{currentCoords.lng.toFixed(6)}</code>
              </div>
            </div>
            <div className="border-t border-slate-900 pt-3 flex justify-between items-center text-xs">
              <span className="text-slate-500">Signal Accuracy</span>
              <span className="text-emerald-400 font-semibold font-mono">±{currentCoords.accuracy || 15}m (High Accuracy)</span>
            </div>
            {latestLocation && (
              <div className="border-t border-slate-900 pt-3 flex justify-between items-center text-[11px] text-slate-400">
                <span>Last Updated:</span>
                <span className="font-mono text-slate-300">
                  {new Date(latestLocation.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Location Breadcrumbs List */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <History className="w-5 h-5 text-slate-400" />
              Location History Nodes
            </div>
            <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full font-semibold text-slate-300">
              {locationLogs.length} entries
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {locationLogs.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500">
                No location logs ingested yet. Start the companion app to stream coordinates.
              </div>
            ) : (
              // Show in reverse order (newest first)
              [...locationLogs].reverse().map((log, idx) => {
                const isLatest = idx === 0;
                const isSelected = selectedLogId === log.id;
                const date = new Date(log.occurredAt);

                return (
                  <button
                    key={log.id}
                    onClick={() => {
                      setSelectedLogId(log.id);
                      setMapCenter({ lat: log.data.lat, lng: log.data.lng });
                      setZoom(16);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-red-500/10 border-red-500/50 text-white shadow-md'
                        : 'bg-slate-950/40 hover:bg-slate-900 border-slate-850/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${
                        isLatest ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse' : 'bg-blue-500/80'
                      }`} />
                      <div>
                        <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                          {isLatest ? 'Current GPS Location' : `Node #${locationLogs.length - idx}`}
                          {isLatest && (
                            <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.2 rounded font-mono">LIVE</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {log.data.lat.toFixed(4)}, {log.data.lng.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[10px] text-slate-500 font-mono">
                      <div>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-emerald-500/80">±{log.data.accuracy || 15}m</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Google Maps Viewer Screen */}
      <div className="xl:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md flex flex-col min-h-[550px] relative">
        {/* Map Top controls */}
        <div className="flex items-center justify-between gap-4 mb-3 z-10 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400">
              <MapIcon className="w-4 h-4 text-red-400" />
            </span>
            <div>
              <span className="text-xs font-semibold text-white block">Interactive Google Map</span>
              <span className="text-[10px] text-slate-400 font-mono block">Powered by Google Maps Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Map Type Selector */}
            <select
              value={mapTypeId}
              onChange={(e) => setMapTypeId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer outline-none focus:border-slate-700"
            >
              <option value="roadmap">Default Map</option>
              <option value="satellite">Satellite</option>
              <option value="hybrid">Hybrid</option>
              <option value="terrain">Terrain</option>
            </select>

            <button
              onClick={handleRecenter}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              Focus Device
            </button>
          </div>
        </div>

        {/* GOOGLE MAP CANVAS STAGE */}
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl relative overflow-hidden min-h-[460px]">
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              mapId="TIMES_UP_PARENTAL_MAP"
              defaultCenter={{ lat: currentCoords.lat, lng: currentCoords.lng }}
              defaultZoom={zoom}
              mapTypeId={mapTypeId}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%', minHeight: '460px' }}
              gestureHandling="greedy"
              disableDefaultUI={false}
            >
              <MapController center={mapCenter} zoom={zoom} />
              
              {/* Draw polyline trail between historical location points */}
              {polylinePath.length > 1 && (
                <MapPolyline path={polylinePath} />
              )}

              {/* Render Markers for each location log */}
              {locationLogs.map((log, idx) => {
                const isLatest = idx === locationLogs.length - 1;
                const isSelected = selectedLogId ? selectedLogId === log.id : isLatest;

                return (
                  <LocationMarker
                    key={log.id}
                    log={log}
                    isLatest={isLatest}
                    isSelected={isSelected}
                    onSelect={() => {
                      setSelectedLogId(log.id);
                      setMapCenter({ lat: log.data.lat, lng: log.data.lng });
                    }}
                  />
                );
              })}
            </Map>
          </APIProvider>
        </div>

        {/* Map Footer Info */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Google Maps Engine Active</span>
          </div>
          <div className="font-mono text-[10px] text-slate-500">
            Coordinates: {mapCenter.lat.toFixed(6)}, {mapCenter.lng.toFixed(6)}
          </div>
        </div>
      </div>
    </div>
  );
}
