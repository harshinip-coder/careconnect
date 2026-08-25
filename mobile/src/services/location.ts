import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  location_address: string;
  error?: string;
}

export const getCurrentLocation = async (): Promise<LocationData> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return {
        latitude: 19.0760,
        longitude: 72.8777,
        location_address: "Location Permission Denied (Default Metro Area)",
        error: "Permission denied"
      };
    }

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const { latitude, longitude } = loc.coords;

    // Optional reverse geocode
    let location_address = `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (places && places.length > 0) {
        const p = places[0];
        location_address = [p.name, p.street, p.subregion, p.city].filter(Boolean).join(', ');
      }
    } catch {
      // ignore reverse geocode error
    }

    return {
      latitude,
      longitude,
      location_address
    };
  } catch (e: any) {
    return {
      latitude: 19.0760,
      longitude: 72.8777,
      location_address: "GPS Signal Unavailable (Metro Center)",
      error: e.message
    };
  }
};
