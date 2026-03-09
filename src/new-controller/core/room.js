export function getRoomId() {
  const url = new URL(location.href);
  return url.searchParams.get("room") || "default";
}

export function getRoomShareUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("room", getRoomId());
  url.hash = "";
  return url.toString();
}
