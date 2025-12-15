import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "400px" };
const defaultCenter = { lat: -1.286389, lng: 36.817223 }; // Example coordinates

export default function Map({ coordinates = defaultCenter }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY",
  });

  if (!isLoaded) return <p>Loading Map...</p>;

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={coordinates} zoom={12}>
      <Marker position={coordinates} />
    </GoogleMap>
  );
}
