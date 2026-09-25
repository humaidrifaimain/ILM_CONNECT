export const dynamic = 'force-dynamic';

const COUNTRY_HEADERS = [
  'x-vercel-ip-country',
  'cf-ipcountry',
  'cloudfront-viewer-country',
  'x-country-code',
  'x-appengine-country',
];

export async function GET(request: Request) {
  const country = COUNTRY_HEADERS
    .map((header) => request.headers.get(header))
    .find((value) => value && value !== 'XX');

  return Response.json({
    country: country?.toUpperCase() || null,
  });
}
