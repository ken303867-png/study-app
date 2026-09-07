export function shouldShowAdminTools(
  locationLike: Pick<Location, 'hostname' | 'search'>
): boolean {
  const params = new URLSearchParams(locationLike.search);
  const explicit = params.get('admin');

  if (explicit === '1') return true;
  if (explicit === '0') return false;

  return locationLike.hostname === 'localhost' || locationLike.hostname === '127.0.0.1';
}
