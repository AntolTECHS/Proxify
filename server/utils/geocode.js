// utils/geocode.js
export async function geocodeAddress(address) {
  if (!address || !process.env.OPENCAGE_API_KEY) return null;

  const url = new URL("https://api.opencagedata.com/geocode/v1/json");
  url.searchParams.set("q", address);
  url.searchParams.set("key", process.env.OPENCAGE_API_KEY);
  url.searchParams.set("limit", "1");

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const first = data?.results?.[0];
  if (!first?.geometry) return null;

  const lat = Number(first.geometry.lat);
  const lng = Number(first.geometry.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    formatted: first.formatted || "",
  };
}