import type { PROSTGLES_MCP_SERVER_CONFIGS } from "@common/prostglesMcp";
import type { JSONBObjectTypeIfDefined } from "../../ProstglesMCPServerTypes";
import * as ipaddr from "ipaddr.js";
import { lookup } from "node:dns/promises";

type IPAddress = ipaddr.IPv4 | ipaddr.IPv6;

type BlockedSubnet = {
  raw: string;
  network: IPAddress;
  prefixLength: number;
};

const normalize = (v: string) => v.trim().toLowerCase();

const parseUrl = (v: string): URL | undefined => {
  try {
    return new URL(v);
  } catch {
    return undefined;
  }
};

const hostMatches = (requestHost: string, token: string) => {
  return requestHost === token || requestHost.endsWith(`.${token}`);
};

const wildcardHostMatches = (requestHost: string, wildcardBase: string) => {
  return (
    requestHost === wildcardBase || requestHost.endsWith(`.${wildcardBase}`)
  );
};

const stripIpv6Brackets = (hostname: string) => {
  return hostname.startsWith("[") && hostname.endsWith("]") ?
      hostname.slice(1, -1)
    : hostname;
};

const normalizeAddress = (address: IPAddress): IPAddress => {
  if (
    address.kind() === "ipv6" &&
    (address as ipaddr.IPv6).isIPv4MappedAddress()
  ) {
    return (address as ipaddr.IPv6).toIPv4Address();
  }

  return address;
};

const normalizeSubnet = (
  network: IPAddress,
  prefixLength: number,
): Pick<BlockedSubnet, "network" | "prefixLength"> => {
  if (
    network.kind() === "ipv6" &&
    (network as ipaddr.IPv6).isIPv4MappedAddress() &&
    prefixLength >= 96
  ) {
    return {
      network: (network as ipaddr.IPv6).toIPv4Address(),
      prefixLength: prefixLength - 96,
    };
  }

  return { network, prefixLength };
};

const parseAddress = (value: string): IPAddress | undefined => {
  const normalized = stripIpv6Brackets(value.trim());

  if (!ipaddr.isValid(normalized)) return undefined;

  return normalizeAddress(ipaddr.parse(normalized));
};

const parseBlockedSubnet = (rawSubnet: string): BlockedSubnet | undefined => {
  const subnet = rawSubnet.trim();

  if (!subnet) return undefined;

  try {
    const [network, prefixLength] = ipaddr.parseCIDR(subnet);
    const normalizedSubnet = normalizeSubnet(network, prefixLength);

    return {
      raw: rawSubnet,
      ...normalizedSubnet,
    };
  } catch {
    throw new Error(
      `Invalid blocked subnet in MCP server configuration: ${rawSubnet}`,
    );
  }
};

const addressMatchesSubnet = (address: IPAddress, subnet: BlockedSubnet) => {
  if (address.kind() !== subnet.network.kind()) return false;

  return address.match(subnet.network, subnet.prefixLength);
};

const getBlockedSubnetForAddress = (
  address: IPAddress,
  blockedSubnets: BlockedSubnet[],
) => {
  return blockedSubnets.find((subnet) => addressMatchesSubnet(address, subnet));
};

const matchesPattern = (
  rawUrl: string,
  requestUrl: URL,
  rawPattern: string,
) => {
  const pattern = normalize(rawPattern);
  if (!pattern) return false;
  if (pattern === "*") return true;

  const requestHost = normalize(requestUrl.hostname);

  // "*.example.com"
  if (pattern.startsWith("*.")) {
    const base = pattern.slice(2);
    return !!base && wildcardHostMatches(requestHost, base);
  }

  // Full URL pattern, e.g. "https://*.gstatic.com/" or "https://example.com/docs"
  const patternUrl = parseUrl(pattern);
  if (patternUrl) {
    const patternHost = normalize(patternUrl.hostname);

    const hostOk =
      patternHost.startsWith("*.") ?
        wildcardHostMatches(requestHost, patternHost.slice(2))
      : hostMatches(requestHost, patternHost);

    if (!hostOk) return false;
    if (patternUrl.protocol && patternUrl.protocol !== requestUrl.protocol)
      return false;
    if (patternUrl.port && patternUrl.port !== requestUrl.port) return false;

    const patternPath = normalize(patternUrl.pathname);
    if (
      patternPath !== "/" &&
      !normalize(requestUrl.pathname).startsWith(patternPath)
    ) {
      return false;
    }

    return true;
  }

  // Plain host token, e.g. "example.com"
  const looksLikeHostToken =
    !pattern.includes("/") && !pattern.includes("?") && !pattern.includes("#");

  if (looksLikeHostToken) {
    if (pattern.includes(":")) {
      // host:port token
      return normalize(requestUrl.host) === pattern;
    }
    return hostMatches(requestHost, pattern);
  }

  // Compatibility fallback for legacy "substring" patterns
  return normalize(rawUrl).includes(pattern);
};

export const checkConfigAccess = async (
  url: string,
  config: JSONBObjectTypeIfDefined<
    (typeof PROSTGLES_MCP_SERVER_CONFIGS)["web"]
  >,
) => {
  if (config.access.mode === "unrestricted") return;

  const requestUrl = parseUrl(url);
  if (!requestUrl) {
    throw new Error(`Invalid URL: ${url}`);
  }

  const { urls, blockInternalSubnets, internalSubnets } = config.access;

  const blockedSubnets = blockInternalSubnets ? internalSubnets : undefined;

  const isMatch = urls.some((pattern) =>
    matchesPattern(url, requestUrl, pattern),
  );

  if (config.access.mode === "deny") {
    if (isMatch) {
      throw new Error(`Access to ${url} is denied by MCP server configuration`);
    }
  } else if (!isMatch) {
    throw new Error(
      `Access to ${url} is not allowed by MCP server configuration`,
    );
  }

  if (blockedSubnets?.length) {
    const subnets = blockedSubnets
      .map(parseBlockedSubnet)
      .filter((subnet): subnet is BlockedSubnet => !!subnet);

    if (subnets.length) {
      const blockedResult = await getBlockedSubnetForHostname(
        requestUrl.hostname,
        subnets,
      );

      if (blockedResult) {
        throw new Error(
          `Access to ${url} resolves to ${blockedResult.address} which is blocked by MCP server configuration (${blockedResult.subnet.raw})`,
        );
      }
    }
  }
};

const getBlockedSubnetForHostname = async (
  hostname: string,
  blockedSubnets: BlockedSubnet[],
) => {
  const normalizedHostname = stripIpv6Brackets(hostname);
  const directAddress = parseAddress(normalizedHostname);

  if (directAddress) {
    const subnet = getBlockedSubnetForAddress(directAddress, blockedSubnets);

    return (
      subnet && {
        address: directAddress.toString(),
        subnet,
      }
    );
  }

  const addresses = await resolveHostname(normalizedHostname);

  for (const address of addresses) {
    const subnet = getBlockedSubnetForAddress(address, blockedSubnets);

    if (subnet) {
      return {
        address: address.toString(),
        subnet,
      };
    }
  }
};

const resolveHostname = async (hostname: string): Promise<IPAddress[]> => {
  try {
    const addresses = await lookup(hostname, { all: true });

    return addresses.flatMap(({ address }) => {
      const parsedAddress = parseAddress(address);
      return parsedAddress ? [parsedAddress] : [];
    });
  } catch {
    return [];
  }
};
