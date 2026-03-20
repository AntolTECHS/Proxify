// client/src/utils/mapboxClient.js
import mbxGeocoding from "@mapbox/mapbox-sdk/services/geocoding";

// Use Vite env variable
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

if (!mapboxToken) {
  throw new Error("Mapbox token missing. Add VITE_MAPBOX_TOKEN in .env");
}

export const geocodingClient = mbxGeocoding({ accessToken: mapboxToken });