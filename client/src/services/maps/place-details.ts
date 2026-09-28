import { importLibrary } from '@googlemaps/js-api-loader';

/** The fields from Google's Place Details sample, plus a Maps link for the InfoWindow. */
export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  location: google.maps.LatLngLiteral;
  googleMapsUri: string | null;
}

export class PlaceDetailsError extends Error {
  readonly placeId: string;
  constructor(placeId: string, message: string) {
    super(message);
    this.name = 'PlaceDetailsError';
    this.placeId = placeId;
  }
}

type PlacesLib = Pick<google.maps.PlacesLibrary, 'Place'>;

// Only billed fields that the UI renders are requested.
const FIELDS = ['id', 'displayName', 'formattedAddress', 'location', 'googleMapsURI'];

/**
 * Place Details via the Places API (New): `new Place({ id }).fetchFields()`.
 * This replaces the legacy `PlacesService.getDetails()`, which Google no longer
 * offers to new customers. Results are cached per session and concurrent
 * requests for the same place share one network call.
 */
export function createPlaceDetailsClient(loadPlaces: () => Promise<PlacesLib> = () => importLibrary('places')) {
  const cache = new Map<string, Promise<PlaceDetails>>();

  async function fetchOnce(placeId: string): Promise<PlaceDetails> {
    let place: google.maps.places.Place;
    try {
      const { Place } = await loadPlaces();
      ({ place } = await new Place({ id: placeId }).fetchFields({ fields: FIELDS }));
    } catch (e) {
      throw new PlaceDetailsError(placeId, e instanceof Error ? e.message : 'Place Details request failed');
    }
    const loc = place.location;
    if (!loc) throw new PlaceDetailsError(placeId, 'Google returned no location for this place');
    return {
      placeId: place.id ?? placeId,
      name: place.displayName ?? '',
      formattedAddress: place.formattedAddress ?? '',
      location: { lat: loc.lat(), lng: loc.lng() },
      googleMapsUri: place.googleMapsURI ?? null,
    };
  }

  return {
    get(placeId: string): Promise<PlaceDetails> {
      let pending = cache.get(placeId);
      if (!pending) {
        pending = fetchOnce(placeId);
        // Failures are not cached, so a later click can retry.
        pending.catch(() => cache.delete(placeId));
        cache.set(placeId, pending);
      }
      return pending;
    },
  };
}
