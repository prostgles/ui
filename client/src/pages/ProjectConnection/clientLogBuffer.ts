export type ClientLogBuffer = {
  logs: unknown[];
  sizes: number[];
  bytes: number;
};

type ClientLogLimits = {
  maxBytes: number;
  maxEntries: number;
};

const textEncoder = new TextEncoder();

export const getClientLogBytes = (value: string) =>
  textEncoder.encode(value).byteLength;

export const createClientLogBuffer = (
  logs: unknown[],
  limits: ClientLogLimits,
): ClientLogBuffer => {
  const sizes = logs.map((log) => getClientLogBytes(JSON.stringify(log)));
  const buffer = {
    logs,
    sizes,
    bytes: sizes.reduce((total, size) => total + size, 0),
  };
  trimClientLogBuffer(buffer, limits);
  return buffer;
};

export const appendClientLog = (
  buffer: ClientLogBuffer,
  serialisedLog: string,
  limits: ClientLogLimits,
) => {
  const bytes = getClientLogBytes(serialisedLog);
  buffer.logs.push(JSON.parse(serialisedLog));
  buffer.sizes.push(bytes);
  buffer.bytes += bytes;
  trimClientLogBuffer(buffer, limits);
};

const trimClientLogBuffer = (
  buffer: ClientLogBuffer,
  { maxBytes, maxEntries }: ClientLogLimits,
) => {
  let deleteCount = 0;
  let deletedBytes = 0;
  while (
    buffer.logs.length - deleteCount > maxEntries ||
    buffer.bytes - deletedBytes > maxBytes
  ) {
    const size = buffer.sizes[deleteCount];
    if (size === undefined) break;
    deletedBytes += size;
    deleteCount += 1;
  }
  if (!deleteCount) return;

  buffer.logs.splice(0, deleteCount);
  buffer.sizes.splice(0, deleteCount);
  buffer.bytes -= deletedBytes;
};
