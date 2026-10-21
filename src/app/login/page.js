import LoginPageClient from "@/routes/Login/LoginPageClient";
import { getGeoLocale } from "@/lib/seo";
import { getTurnstileConfig } from "@/lib/turnstile";

export const runtime = "edge";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getGeoLocale();
  return {
    title: locale === "tr" ? "Giriş | Nebulon Project" : "Login | Nebulon Project",
    description: "Nebulon Project administration login.",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true }
    }
  };
}

export default async function LoginPage() {
  const turnstile = await getTurnstileConfig();
  return <LoginPageClient turnstileSiteKey={turnstile.enabled ? turnstile.siteKey : ""} />;
}
