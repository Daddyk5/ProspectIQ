import { describe, expect, it, vi } from 'vitest';
import { createPlaceDetailsClient, PlaceDetailsError } from './place-details';

// Google's sample Place ID (Google Sydney).
const PLACE_ID = 'ChIJN1t_tDeuEmsRUsoyG83frY4';

function fakePlaces(fetchFields: (opts: { fields: string[] }) => Promise<unknown>) {
  const ctor = vi.fn(function (this: { fetchFields: typeof fetchFields }) {
    this.fetchFields = fetchFields;
  });
  return { load: vi.fn(async () => ({ Place: ctor as unknown as typeof google.maps.places.Place })), ctor };
}

const googlePlace = {
  id: PLACE_ID,
  displayName: 'Google Sydney',
  formattedAddress: '48 Pirrama Rd, Pyrmont NSW 2009, Australia',
  location: { lat: () => -33.866, lng: () => 151.196 },
  googleMapsURI: 'https://maps.google.com/?cid=10281119596374313554',
};

describe('createPlaceDetailsClient', () => {
  it('fetches the sample fields with the new Place API and maps them', async () => {
    const fetchFields = vi.fn(async () => ({ place: googlePlace }));
    const { load, ctor } = fakePlaces(fetchFields);
    const details = await createPlaceDetailsClient(load).get(PLACE_ID);

    expect(ctor).toHaveBeenCalledWith({ id: PLACE_ID });
    expect(fetchFields).toHaveBeenCalledWith({ fields: ['id', 'displayName', 'formattedAddress', 'location', 'googleMapsURI'] });
    expect(details).toEqual({
      placeId: PLACE_ID,
      name: 'Google Sydney',
      formattedAddress: '48 Pirrama Rd, Pyrmont NSW 2009, Australia',
      location: { lat: -33.866, lng: 151.196 },
      googleMapsUri: googlePlace.googleMapsURI,
    });
  });

  it('shares one request between concurrent callers and caches the result', async () => {
    const fetchFields = vi.fn(async () => ({ place: googlePlace }));
    const client = createPlaceDetailsClient(fakePlaces(fetchFields).load);
    await Promise.all([client.get(PLACE_ID), client.get(PLACE_ID)]);
    await client.get(PLACE_ID);
    expect(fetchFields).toHaveBeenCalledTimes(1);
  });

  it('wraps failures in PlaceDetailsError and allows a retry', async () => {
    const fetchFields = vi
      .fn()
      .mockRejectedValueOnce(new Error('PERMISSION_DENIED: Places API (New) is not enabled'))
      .mockResolvedValueOnce({ place: googlePlace });
    const client = createPlaceDetailsClient(fakePlaces(fetchFields).load);

    const err = await client.get(PLACE_ID).catch((e) => e);
    expect(err).toBeInstanceOf(PlaceDetailsError);
    expect(err.message).toMatch(/Places API \(New\) is not enabled/);
    await expect(client.get(PLACE_ID)).resolves.toMatchObject({ name: 'Google Sydney' });
  });

  it('rejects places without a location', async () => {
    const client = createPlaceDetailsClient(fakePlaces(async () => ({ place: { ...googlePlace, location: null } })).load);
    await expect(client.get(PLACE_ID)).rejects.toThrow('no location');
  });
});
