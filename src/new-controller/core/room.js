export function getRoomId() {
  const url = new URL(location.href);
  return url.searchParams.get("room") || "default";
}
