const SITE_URL = "https://nebulonproject.com";

export default function robots() {
  return {
    rules: [
      { userAgent: "HTTrack", disallow: "/" },
      { userAgent: "WebCopier", disallow: "/" },
      { userAgent: "WebZIP", disallow: "/" },
      { userAgent: "Teleport", disallow: "/" },
      { userAgent: "SiteSucker", disallow: "/" },
      { userAgent: "Offline Explorer", disallow: "/" },
      { userAgent: "WebReaper", disallow: "/" },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/login", "/login/", "/dashboard", "/dashboard/", "/api/"]
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
