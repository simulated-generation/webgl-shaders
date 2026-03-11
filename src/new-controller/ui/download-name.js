export function makeArrivalTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

export function makeMediaFilename({
  prefix = "pixelor",
  kind = "image",
  extension = "bin",
  arrivedAt = new Date(),
} = {}) {
  const ts = makeArrivalTimestamp(arrivedAt);
  return `${prefix}-${kind}-${ts}.${extension}`;
}
