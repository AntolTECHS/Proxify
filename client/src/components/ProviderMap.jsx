// src/components/ProviderMap.jsx
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function ProviderMap({ lat = 51.505, lng = -0.09, zoom = 13, onLocationChange }) {
  const [position, setPosition] = useState([lat, lng]);
  const [mapKey, setMapKey] = useState(Date.now());

  // Force remount the map on mount (prevents "already initialized" error)
  useEffect(() => {
    setMapKey(Date.now());
  }, []);

  const handleDragEnd = (e) => {
    const marker = e.target;
    const newPos = [marker.getLatLng().lat, marker.getLatLng().lng];
    setPosition(newPos);
    if (onLocationChange) onLocationChange(newPos);
  };

  return (
    <div className="w-full h-full">
      <MapContainer
        key={mapKey}
        center={position}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} draggable={true} eventHandlers={{ dragend: handleDragEnd }}>
          <Popup>Drag to set your location</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}