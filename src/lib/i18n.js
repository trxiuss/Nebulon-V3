import { ADMIN_I18N } from "@/lib/i18n.admin";
import { API_MESSAGES } from "@/lib/api-messages";

export const LOCALES = ["tr", "en"];

export const LOCALE_META = {
  tr: { code: "tr", label: "Türkçe", short: "TR", flag: "https://flagcdn.com/w80/tr.png" },
  en: { code: "en", label: "English", short: "EN", flag: "https://flagcdn.com/w80/gb.png" }
};

const DEFAULT_LOCALE = "en";

const I18N = {
  tr: {
    "nav.home": "Ana Sayfa",
    "nav.projects": "Projeler",
    "nav.team": "Ekibimiz",
    "nav.contact": "İletişim",
    "hero.desc": "Minecraft eklentilerinden web yazılımlarına kadar farklı alanlarda ürünler geliştiriyoruz. Performans ve güvenliği ön planda tutarak stabil, sorunsuz deneyim sunuyoruz. Güncel ve ölçeklenebilir çözümlerimizle projelerinizi güvenle büyütmenize yardımcı oluyoruz.",
    "stat.projects": "Aktif Proje",
    "stat.support": "Destek",
    "stat.downloads": "Toplam İndirme",
    "stat.team": "Yetkili",
    "hero.btnProjects": "Projeleri İncele",
    "hero.btnDiscord": "Discord'a Katıl",
    "why.title": "Neden Bizi Seçmelisiniz?",
    "why.sub": "Kalite, güvenlik ve topluluk odaklı geliştirme.",
    "why.f1t": "Tamamen Ücretsiz",
    "why.f1d": "Premium kalitede eklenti ve projeleri hiçbir ücret veya gizli maliyet olmadan sunuyoruz.",
    "why.f2t": "Yüksek Performans",
    "why.f2d": "Optimize kod yapısı ile lag sorunlarını unutturan, akıcı ve stabil deneyim.",
    "why.f3t": "Güvenli Altyapı",
    "why.f3d": "Açık kaynak felsefesi; zararlı yazılımlardan arındırılmış, test edilmiş projeler.",
    "why.f4t": "Mutlu Topluluk",
    "why.f4d": "Sunucu sahiplerinin geri dönüşleri ve Discord topluluğumuz kalitemizin kanıtı.",
    "faq.title": "Sıkça Sorulan Sorular",
    "faq.q1": "Ürünlerde lisans sistemi var mı?",
    "faq.q2": "Destek alabilir miyim?",
    "faq.q3": "Ürünleri nasıl indiririm?",
    "faq.q4": "Zararlı yazılım var mı?",
    "faq.a1": "Hayır. Ürünlerimizde lisans sistemi yoktur; açık kaynaklı ve özgürce kullanılabilir.",
    "faq.a2": "Evet. Discord sunucumuza katılarak ekibimizden birebir yardım alabilirsiniz.",
    "faq.a3": "Üst menüden \u201cProjeler\u201de giderek istediğiniz ürünü ücretsiz indirebilirsiniz.",
    "faq.a4": "Hayır. Tüm projeler şeffaflık ilkesiyle geliştirilir ve yayın öncesi güvenlik taramasından geçer.",
    "footer.text": "Nebulon Project, Minecraft eklentilerinden web yazılımlarına kadar farklı alanlarda ürünler geliştiren bir kuruluştur. Performans ve güvenliği ön planda tutuyoruz.",
    "footer.copy": "Tüm hakları saklıdır. \u00a9 2026",
    "projects.title": "Proje Kategorileri",
    "projects.sub": "İncelemek istediğiniz alanı seçin.",
    "cat.goList": "Listeye Git",
    "cat.soon": "Yakında...",
    "plugins.back": "Kategorilere Dön",
    "plugins.free": "Ücretsiz",
    "plugins.paid": "Ücretli",
    "plugins.download": "İndir",
    "plugins.view": "Görüntüle",
    "plugins.purchase": "Satın Al",
    "plugins.github": "GitHub",
    "team.title": "Geliştirici Ekibi",
    "team.sub": "Projeleri hayata geçiren ekibimizle tanışın.",
    "team.founder": "Kurucu",
    "team.admin": "Yönetici",
    "team.devlead": "Geliştirici Lideri",
    "contact.title": "İletişim Bilgilerimiz",
    "contact.sub": "Destek almak ve önerilerinizi paylaşmak için aşağıdaki iletişim bilgilerimizden bize ulaşabilirsiniz.",
    "contact.cardTitle": "İletişim",
    "contact.cardDesc": "",
    "contact.join": "Bağlantıya Git",
    "contact.empty": "Henüz iletişim bilgisi eklenmedi.",
    "err.title": "Evrende Kayboldun!",
    "err.desc": "Aradığın sayfa bir kara delik tarafından yutulmuş olabilir. Ana gemiye dönmek için aşağıdaki butonu kullan.",
    "err.home": "Ana Sayfaya Işınlan",
    "search.placeholder": "İsme göre ara...",
    "search.clear": "Aramayı temizle",
    "sort.label": "Sırala",
    "sort.nameAsc": "İsim (A-Z)",
    "sort.nameDesc": "İsim (Z-A)",
    "sort.downloadsDesc": "İndirme (Çok-Az)",
    "sort.downloadsAsc": "İndirme (Az-Çok)",
    "search.noResultsTitle": "Sonuç bulunamadı",
    "search.noResultsDesc": "aramasına uyan bir ürün yok. Farklı bir kelime dene.",
    "search.resultsCount": "ürün listeleniyor",
    "search.resetBtn": "Filtreleri sıfırla",
    "downloads.label": "indirme",
    "projects.noCategoriesTitle": "Kategori bulunamadı",
    "projects.noCategoriesDesc": "Henüz hiç kategori eklenmemiş. Daha sonra tekrar kontrol edin.",
    "products.noneTitle": "Ürün bulunamadı",
    "products.noneDesc": "Bu kategoride henüz yayınlanmış bir ürün yok.",
  },
  en: {
    "nav.home": "Home",
    "nav.projects": "Projects",
    "nav.team": "Our Team",
    "nav.contact": "Contact",
    "hero.desc": "We build products across multiple areas, from Minecraft plugins to web software. Performance and security first \u2014 stable, seamless experience. With up-to-date, scalable solutions, we help you grow your projects with confidence.",
    "stat.projects": "Active Projects",
    "stat.support": "Support",
    "stat.downloads": "Total Downloads",
    "stat.team": "Staff",
    "hero.btnProjects": "Browse Projects",
    "hero.btnDiscord": "Join Discord",
    "why.title": "Why Choose Us?",
    "why.sub": "Quality, security and community-focused development.",
    "why.f1t": "Completely Free",
    "why.f1d": "Premium-quality plugins and projects with no fees or hidden costs.",
    "why.f2t": "High Performance",
    "why.f2d": "Optimized code that keeps your server smooth and lag-free.",
    "why.f3t": "Secure Stack",
    "why.f3d": "Open-source philosophy: cleaned, tested projects free of malware.",
    "why.f4t": "Happy Community",
    "why.f4d": "Feedback from server owners and our Discord community proves our quality.",
    "faq.title": "Frequently Asked Questions",
    "faq.q1": "Is there a license system?",
    "faq.q2": "Can I get support?",
    "faq.q3": "How do I download products?",
    "faq.q4": "Is there any malware?",
    "faq.a1": "No. Our products have no license system; they are open-source and free to use.",
    "faq.a2": "Yes. Join our Discord server for direct help from the team.",
    "faq.a3": "Go to \u201cProjects\u201d in the top menu and download any product for free.",
    "faq.a4": "No. All projects are developed transparently and scanned before release.",
    "footer.text": "Nebulon Project builds products across multiple areas, from Minecraft plugins to web software. Performance and security come first.",
    "footer.copy": "All rights reserved. \u00a9 2026",
    "projects.title": "Project Categories",
    "projects.sub": "Choose the area you want to explore.",
    "cat.goList": "View List",
    "cat.soon": "Coming soon...",
    "plugins.back": "Back to Categories",
    "plugins.free": "Free",
    "plugins.paid": "Paid",
    "plugins.download": "Download",
    "plugins.view": "View",
    "plugins.purchase": "Buy",
    "plugins.github": "GitHub",
    "team.title": "Developer Team",
    "team.sub": "Meet the team behind the projects.",
    "team.founder": "Founder",
    "team.admin": "Admin",
    "team.devlead": "Lead Developer",
    "contact.title": "Our Contact Information",
    "contact.sub": "Reach us through the contact details below for support or to share your suggestions.",
    "contact.cardTitle": "Contact",
    "contact.cardDesc": "",
    "contact.join": "Open Link",
    "contact.empty": "No contact information has been added yet.",
    "err.title": "Lost in the Universe!",
    "err.desc": "The page you're looking for may have been swallowed by a black hole. Use the button below to return to the mothership.",
    "err.home": "Beam to Home",
    "search.placeholder": "Search by name...",
    "search.clear": "Clear search",
    "sort.label": "Sort",
    "sort.nameAsc": "Name (A-Z)",
    "sort.nameDesc": "Name (Z-A)",
    "sort.downloadsDesc": "Downloads (High-Low)",
    "sort.downloadsAsc": "Downloads (Low-High)",
    "search.noResultsTitle": "No results found",
    "search.noResultsDesc": "No product matches your search. Try a different keyword.",
    "search.resultsCount": "products listed",
    "search.resetBtn": "Reset filters",
    "downloads.label": "downloads",
    "projects.noCategoriesTitle": "No categories found",
    "projects.noCategoriesDesc": "No categories have been added yet. Please check back later.",
    "products.noneTitle": "No products found",
    "products.noneDesc": "There are no published products in this category yet."

  }
};

Object.assign(I18N.tr, ADMIN_I18N.tr);
Object.assign(I18N.en, ADMIN_I18N.en);

export function translate(locale, key) {
  const dict = I18N[locale] || I18N[DEFAULT_LOCALE];
  return dict[key] != null ? dict[key] : key;
}

export function translateStoredMessage(locale, message) {
  if (!message) return "";
  for (const key of Object.keys(I18N.tr)) {
    if (message === I18N.tr[key] || message === I18N.en[key]) return translate(locale, key);
  }
  for (const key of Object.keys(API_MESSAGES.tr)) {
    if (message === API_MESSAGES.tr[key] || message === API_MESSAGES.en[key]) {
      return API_MESSAGES[locale]?.[key] || API_MESSAGES.tr[key];
    }
  }
  return message;
}
