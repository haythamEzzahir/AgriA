import React, { useEffect, useRef } from 'react';
import Globe from 'globe.gl';

const LOCATIONS = [
  { lat: 31.5, lng: -7.0, label: 'Marrakech-Safi', color: '#059669' },
  { lat: 34.0, lng: -5.0, label: 'Fès-Meknès', color: '#059669' },
  { lat: 33.5, lng: -7.5, label: 'Casablanca', color: '#059669' },
  { lat: 30.4, lng: -9.5, label: 'Souss-Massa', color: '#059669' },
  { lat: 35.2, lng: -5.3, label: 'Tanger-Tétouan', color: '#059669' },
  { lat: 29.7, lng: -7.9, label: 'Drâa-Tafilalet', color: '#059669' },
  { lat: 32.3, lng: -6.3, label: 'Béni Mellal', color: '#059669' },
  { lat: 34.3, lng: -2.2, label: 'Oriental', color: '#059669' },
];

export default function GlobeMap() {
  const containerRef = useRef(null);
  const globeRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const globe = Globe({ rendererConfig: { alpha: true } })
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundColor('rgba(0,0,0,0)')
      .width(containerRef.current.offsetWidth)
      .height(containerRef.current.offsetHeight)
      .pointsData(LOCATIONS)
      .pointLat('lat')
      .pointLng('lng')
      .pointColor(() => '#059669')
      .pointAltitude(0.05)
      .pointRadius(0.25)
      .pointLabel('label')
      .atmosphereColor('#059669')
      .atmosphereAltitude(0.15);

    globe(containerRef.current);
    globeRef.current = globe;

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.6;
    globe.pointOfView({ lat: 28, lng: -7, altitude: 2.5 }, 0);

    const handleResize = () => {
      if (containerRef.current) {
        globe.width(containerRef.current.offsetWidth);
        globe.height(containerRef.current.offsetHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
    />
  );
}
