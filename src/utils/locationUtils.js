export function latToRegion(lat) {
  if (lat >= 52.5) return 'Noord';
  if (lat >= 51.5) return 'Midden';
  return 'Zuid';
}
