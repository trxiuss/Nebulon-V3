import { getRequestContext } from "@cloudflare/next-on-pages";
import { execute } from "@/lib/db";

const LOOKUP_TIMEOUT = 3500;

function header(request, name) {
  try {
    return request?.headers?.get(name) || "";
  } catch (err) {
    return "";
  }
}

function clientIp(request) {
  const raw =
    header(request, "cf-connecting-ip") ||
    header(request, "true-client-ip") ||
    header(request, "x-forwarded-for").split(",")[0].trim() ||
    header(request, "x-real-ip") ||
    request?.ip ||
    "";
  return String(raw).replace(/^::ffff:/i, "").trim();
}

function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === "::1" || ip === "127.0.0.1" || ip === "localhost") return true;
  if (/^(10\.|127\.|192\.168\.|169\.254\.|0\.)/.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true;
  if (/^(fc|fd|fe80)/i.test(ip)) return true;
  return false;
}

function getCf(request) {
  try {
    const ctx = getRequestContext();
    if (ctx?.cf && typeof ctx.cf === "object") return ctx.cf;
  } catch (err) {}
  if (request && typeof request === "object" && request.cf) return request.cf;
  return null;
}

function parseUserAgent(ua) {
  const value = String(ua || "");
  const result = { browser: "", browserVersion: "", os: "", deviceType: "", platform: "", engine: "" };
  if (!value) return result;

  const browsers = [
    ["Edge", /Edg(?:e|A|iOS)?\/([\d.]+)/],
    ["Opera", /(?:OPR|Opera)\/([\d.]+)/],
    ["Yandex", /YaBrowser\/([\d.]+)/],
    ["Samsung Internet", /SamsungBrowser\/([\d.]+)/],
    ["Vivaldi", /Vivaldi\/([\d.]+)/],
    ["Brave", /Brave\/([\d.]+)/],
    ["Chrome", /(?:Chrome|CriOS)\/([\d.]+)/],
    ["Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari/]
  ];
  for (const [name, regex] of browsers) {
    const match = value.match(regex);
    if (match) {
      result.browser = name;
      result.browserVersion = match[1] || "";
      break;
    }
  }

  const systems = [
    ["Windows 11/10", /Windows NT 10\.0/],
    ["Windows 8.1", /Windows NT 6\.3/],
    ["Windows 8", /Windows NT 6\.2/],
    ["Windows 7", /Windows NT 6\.1/],
    ["Android", /Android\s?([\d.]+)?/],
    ["iOS", /(?:iPhone|iPad|iPod).*OS\s([\d_]+)/],
    ["macOS", /Mac OS X\s?([\d_.]+)?/],
    ["Chrome OS", /CrOS/],
    ["Linux", /Linux/]
  ];
  for (const [name, regex] of systems) {
    const match = value.match(regex);
    if (match) {
      result.os = match[1] ? `${name} ${String(match[1]).replace(/_/g, ".")}` : name;
      break;
    }
  }

  if (/Bot|Crawler|Spider|curl|wget|python|axios|node-fetch/i.test(value)) result.deviceType = "bot";
  else if (/Mobile|iPhone|iPod|Android.*Mobile/i.test(value)) result.deviceType = "mobile";
  else if (/iPad|Tablet|Android/i.test(value)) result.deviceType = "tablet";
  else result.deviceType = "desktop";

  if (/Windows/i.test(value)) result.platform = "Windows";
  else if (/iPhone|iPad|iPod/i.test(value)) result.platform = "iOS";
  else if (/Macintosh|Mac OS/i.test(value)) result.platform = "macOS";
  else if (/Android/i.test(value)) result.platform = "Android";
  else if (/CrOS/i.test(value)) result.platform = "Chrome OS";
  else if (/Linux/i.test(value)) result.platform = "Linux";

  if (/Gecko\/\d/i.test(value) && /Firefox/i.test(value)) result.engine = "Gecko";
  else if (/AppleWebKit/i.test(value) && /Chrome|CriOS|Edg|OPR/i.test(value)) result.engine = "Blink";
  else if (/AppleWebKit/i.test(value)) result.engine = "WebKit";

  return result;
}

function countryName(code) {
  const key = String(code || "").toUpperCase();
  if (!key || key === "XX" || key === "T1") return key;
  try {
    return new Intl.DisplayNames(["tr"], { type: "region" }).of(key) || key;
  } catch (err) {
    return key;
  }
}

function pick(...values) {
  for (const value of values) {
    if (value === 0) return "0";
    if (value !== undefined && value !== null && value !== "" && value !== false) return String(value);
  }
  return "";
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "Nebulon-AuthLog/1.0" },
      cache: "no-store"
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function lookupIpWhoIs(ip) {
  const data = await fetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`);
  if (!data || data.success === false) return null;
  return {
    country: data.country,
    countryCode: data.country_code,
    region: data.region,
    regionCode: data.region_code,
    city: data.city,
    postalCode: data.postal,
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone?.id,
    utcOffset: data.timezone?.utc,
    asn: data.connection?.asn ? `AS${data.connection.asn}` : "",
    isp: data.connection?.isp,
    org: data.connection?.org,
    domain: data.connection?.domain,
    continent: data.continent,
    continentCode: data.continent_code,
    callingCode: data.calling_code,
    capital: data.capital,
    flag: data.flag?.emoji,
    ipType: data.type,
    isEu: data.is_eu
  };
}

async function lookupFreeIpApi(ip) {
  const data = await fetchJson(`https://freeipapi.com/api/json/${encodeURIComponent(ip)}`);
  if (!data || !data.countryCode) return null;
  return {
    country: data.countryName,
    countryCode: data.countryCode,
    region: data.regionName,
    city: data.cityName,
    postalCode: data.zipCode,
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: Array.isArray(data.timeZones) ? data.timeZones[0] : data.timeZone,
    continent: data.continent,
    continentCode: data.continentCode,
    isProxy: data.isProxy,
    ipVersion: data.ipVersion,
    currency: data.currency?.code
  };
}

function flagEmoji(code) {
  const key = String(code || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(key)) return "";
  return String.fromCodePoint(...[...key].map((char) => 127397 + char.charCodeAt(0)));
}

async function lookupIpapiIs(ip) {
  const data = await fetchJson(`https://api.ipapi.is/?q=${encodeURIComponent(ip)}`);
  if (!data || data.error || !data.location) return null;
  const loc = data.location || {};
  const asn = data.asn || {};
  const company = data.company || {};
  return {
    country: loc.country,
    countryCode: loc.country_code,
    region: loc.state,
    city: loc.city,
    district: "",
    postalCode: loc.zip,
    latitude: loc.latitude,
    longitude: loc.longitude,
    timezone: loc.timezone,
    currency: loc.currency,
    continent: loc.continent,
    asn: asn.asn ? `AS${asn.asn}` : "",
    asName: asn.descr,
    isp: company.name || asn.org,
    org: asn.org || company.name,
    reverseDns: data.rdns,
    isMobile: data.is_mobile,
    isProxy: Boolean(data.is_proxy || data.is_vpn || data.is_tor),
    isHosting: data.is_datacenter
  };
}

async function lookupIp(ip) {
  if (isPrivateIp(ip)) return { primary: null, secondary: null, tertiary: null };
  const [primary, secondary] = await Promise.all([lookupIpapiIs(ip), lookupIpWhoIs(ip)]);
  const tertiary = !primary && !secondary ? await lookupFreeIpApi(ip) : null;
  return { primary, secondary, tertiary };
}

async function collectGeo(request, ip) {
  const cf = getCf(request) || {};
  const geo = (request && typeof request === "object" && request.geo) || {};
  const { primary, secondary, tertiary } = await lookupIp(ip);
  const a = primary || {};
  const b = secondary || {};
  const c = tertiary || {};
  const countryCode = pick(cf.country, a.countryCode, b.countryCode, c.countryCode, geo.country, header(request, "cf-ipcountry")).toUpperCase();
  const asnRaw = pick(cf.asn ? `AS${cf.asn}` : "", a.asn, b.asn);

  return {
    country: pick(a.country, b.country, c.country, countryCode && countryName(countryCode)),
    countryCode,
    region: pick(a.region, cf.region, b.region, c.region, geo.region, header(request, "cf-region")),
    regionCode: pick(cf.regionCode, a.regionCode, b.regionCode),
    city: pick(a.city, cf.city, b.city, c.city, geo.city, header(request, "cf-ipcity")),
    district: pick(a.district, b.district),
    postalCode: pick(cf.postalCode, a.postalCode, b.postalCode, c.postalCode, header(request, "cf-postal-code")),
    latitude: pick(cf.latitude, a.latitude, b.latitude, c.latitude, geo.latitude, header(request, "cf-iplatitude")),
    longitude: pick(cf.longitude, a.longitude, b.longitude, c.longitude, geo.longitude, header(request, "cf-iplongitude")),
    timezone: pick(cf.timezone, a.timezone, b.timezone, c.timezone, header(request, "cf-timezone")),
    asn: asnRaw,
    isp: pick(a.isp, b.isp, cf.asOrganization),
    org: pick(a.org, b.org, cf.asOrganization),
    asName: pick(a.asName, cf.asOrganization),
    domain: pick(b.domain),
    reverseDns: pick(a.reverseDns),
    continent: pick(a.continent, b.continent, c.continent, cf.continent),
    continentCode: pick(cf.continent, a.continentCode, b.continentCode, c.continentCode),
    currency: pick(a.currency, c.currency),
    callingCode: pick(b.callingCode),
    capital: pick(b.capital),
    flag: pick(b.flag, flagEmoji(countryCode)),
    utcOffset: pick(b.utcOffset),
    ipType: pick(b.ipType, c.ipVersion ? `IPv${c.ipVersion}` : "", ip.includes(":") ? "IPv6" : ip ? "IPv4" : ""),
    isMobile: a.isMobile,
    isProxy: a.isProxy ?? c.isProxy,
    isHosting: a.isHosting,
    isEu: b.isEu ?? (cf.isEUCountry === "1" ? true : undefined),
    colo: pick(cf.colo),
    httpProtocol: pick(cf.httpProtocol),
    tlsVersion: pick(cf.tlsVersion),
    tlsCipher: pick(cf.tlsCipher),
    clientTcpRtt: pick(cf.clientTcpRtt),
    sources: [
      cf && Object.keys(cf).length ? "cloudflare" : "",
      primary ? "ipapi.is" : "",
      secondary ? "ipwho.is" : "",
      tertiary ? "freeipapi.com" : ""
    ].filter(Boolean)
  };
}

function requestScheme(request) {
  try {
    const url = new URL(request?.url || "");
    return url.protocol.replace(":", "").toUpperCase();
  } catch (err) {
    return (header(request, "x-forwarded-proto") || "").toUpperCase();
  }
}

export async function recordAuthEvent(request, options = {}) {
  try {
    const ip = clientIp(request);
    const userAgent = header(request, "user-agent");
    const ua = parseUserAgent(userAgent);
    const geo = await collectGeo(request, ip);
    const scheme = requestScheme(request);
    const protocol = [geo.httpProtocol, scheme].filter(Boolean).join(" / ") || null;

    const details = {
      ipVersion: geo.ipType,
      continent: geo.continent,
      continentCode: geo.continentCode,
      regionCode: geo.regionCode,
      capital: geo.capital,
      flag: geo.flag,
      callingCode: geo.callingCode,
      currency: geo.currency,
      utcOffset: geo.utcOffset,
      euMember: geo.isEu,
      organization: geo.org,
      asName: geo.asName,
      ispDomain: geo.domain,
      reverseDns: geo.reverseDns,
      mobileNetwork: geo.isMobile,
      proxyOrVpn: geo.isProxy,
      hostingOrDatacenter: geo.isHosting,
      edgeLocation: geo.colo,
      tlsVersion: geo.tlsVersion,
      tlsCipher: geo.tlsCipher,
      tcpRttMs: geo.clientTcpRtt,
      mapUrl: geo.latitude && geo.longitude ? `https://www.google.com/maps?q=${geo.latitude},${geo.longitude}` : "",
      browserEngine: ua.engine,
      acceptLanguage: header(request, "accept-language"),
      secChUa: header(request, "sec-ch-ua"),
      secPlatform: header(request, "sec-ch-ua-platform").replace(/"/g, ""),
      secMobile: header(request, "sec-ch-ua-mobile"),
      dnt: header(request, "dnt"),
      origin: header(request, "origin"),
      forwardedFor: header(request, "x-forwarded-for"),
      cfRay: header(request, "cf-ray"),
      requestMethod: request?.method || "",
      requestUrl: request?.url || "",
      geoSources: geo.sources.join(", "),
      ...(options.details || {})
    };

    Object.keys(details).forEach((key) => {
      const v = details[key];
      if (v === undefined || v === null || v === "") delete details[key];
    });

    await execute(
      `INSERT INTO auth_logs (
        user_id, username, event, status, ip, country, country_code, region, city, district,
        postal_code, latitude, longitude, timezone, asn, isp, browser, browser_version, os,
        device_type, platform, language, referer, protocol, user_agent, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        options.userId ?? null,
        options.username || null,
        options.event || "login",
        options.status || "success",
        ip || null,
        geo.country || null,
        geo.countryCode || null,
        geo.region || null,
        geo.city || null,
        geo.district || null,
        geo.postalCode || null,
        geo.latitude || null,
        geo.longitude || null,
        geo.timezone || null,
        geo.asn || null,
        geo.isp || null,
        ua.browser || null,
        ua.browserVersion || null,
        ua.os || null,
        ua.deviceType || null,
        ua.platform || null,
        header(request, "accept-language").split(",")[0] || null,
        header(request, "referer") || null,
        protocol,
        userAgent || null,
        JSON.stringify(details)
      ]
    );
  } catch (err) {
    console.warn("[nebulon] giris kaydi yazilamadi:", err?.message || err);
  }
}
