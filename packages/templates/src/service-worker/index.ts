import { staticServiceWorkerTemplate } from "./static.js";
import { spaServiceWorkerTemplate } from "./spa.js";
import { ssrServiceWorkerTemplate } from "./ssr.js";
import { wordpressServiceWorkerTemplate } from "./wordpress.js";
import { phpServiceWorkerTemplate } from "./php.js";
import { laravelSpaServiceWorkerTemplate } from "./laravel-spa.js";
import { laravelSsrServiceWorkerTemplate } from "./laravel-ssr.js";
import { laravelApiServiceWorkerTemplate } from "./laravel-api.js";
import { symfonySpaServiceWorkerTemplate } from "./symfony-spa.js";
import { symfonyApiServiceWorkerTemplate } from "./symfony-api.js";
import { djangoSpaServiceWorkerTemplate } from "./django-spa.js";
import { djangoApiServiceWorkerTemplate } from "./django-api.js";
import { flaskSpaServiceWorkerTemplate } from "./flask-spa.js";
import { flaskApiServiceWorkerTemplate } from "./flask-api.js";
import { nextSsrServiceWorkerTemplate } from "./next-ssr.js";
import { nuxtSsrServiceWorkerTemplate } from "./nuxt-ssr.js";
import { remixSsrServiceWorkerTemplate } from "./remix-ssr.js";
import { svelteKitSsrServiceWorkerTemplate } from "./sveltekit-ssr.js";

export type ServiceWorkerTemplateType =
  | "static"
  | "spa"
  | "ssr"
  | "wordpress"
  | "php"
  | "laravel-spa"
  | "laravel-ssr"
  | "laravel-api"
  | "symfony-spa"
  | "symfony-api"
  | "django-spa"
  | "django-api"
  | "flask-spa"
  | "flask-api"
  | "next-ssr"
  | "nuxt-ssr"
  | "remix-ssr"
  | "sveltekit-ssr";

export interface ServiceWorkerTemplate {
  type: ServiceWorkerTemplateType;
  content: string;
}

/**
 * Récupère le template de service worker selon le type
 */
export function getServiceWorkerTemplate(
  type: ServiceWorkerTemplateType,
): ServiceWorkerTemplate {
  const templates: Record<ServiceWorkerTemplateType, string> = {
    static: staticServiceWorkerTemplate,
    spa: spaServiceWorkerTemplate,
    ssr: ssrServiceWorkerTemplate,
    wordpress: wordpressServiceWorkerTemplate,
    php: phpServiceWorkerTemplate,
    "laravel-spa": laravelSpaServiceWorkerTemplate,
    "laravel-ssr": laravelSsrServiceWorkerTemplate,
    "laravel-api": laravelApiServiceWorkerTemplate,
    "symfony-spa": symfonySpaServiceWorkerTemplate,
    "symfony-api": symfonyApiServiceWorkerTemplate,
    "django-spa": djangoSpaServiceWorkerTemplate,
    "django-api": djangoApiServiceWorkerTemplate,
    "flask-spa": flaskSpaServiceWorkerTemplate,
    "flask-api": flaskApiServiceWorkerTemplate,
    "next-ssr": nextSsrServiceWorkerTemplate,
    "nuxt-ssr": nuxtSsrServiceWorkerTemplate,
    "remix-ssr": remixSsrServiceWorkerTemplate,
    "sveltekit-ssr": svelteKitSsrServiceWorkerTemplate,
  };

  const content = templates[type];

  if (!content) {
    throw new Error(`Unknown service worker template type: ${type}`);
  }

  return {
    type,
    content: content.trim(),
  };
}

/**
 * Liste tous les types de templates disponibles
 */
export function getAvailableTemplateTypes(): ServiceWorkerTemplateType[] {
  return [
    "static",
    "spa",
    "ssr",
    "wordpress",
    "php",
    "laravel-spa",
    "laravel-ssr",
    "laravel-api",
    "symfony-spa",
    "symfony-api",
    "django-spa",
    "django-api",
    "flask-spa",
    "flask-api",
    "next-ssr",
    "nuxt-ssr",
    "remix-ssr",
    "sveltekit-ssr",
  ];
}

/**
 * Détermine le type de template à partir de l'architecture et du framework.
 * Point unique de mapping framework → template SW ; le paramètre framework est normalisé en minuscules.
 *
 * Valeurs de framework attendues (scan) → type de template :
 * - wordpress, woocommerce → wordpress
 * - drupal, joomla, magento, shopify, prestashop → php
 * - symfony + spa → symfony-spa ; symfony + ssr/static → symfony-api
 * - laravel + spa → laravel-spa ; laravel + ssr → laravel-ssr ; laravel + static → laravel-api
 * - codeigniter, cakephp, yii, laminas → php
 * - django + spa → django-spa ; django + ssr/static → django-api
 * - flask + spa → flask-spa ; flask + ssr/static → flask-api
 * - nextjs + ssr → next-ssr ; nuxt + ssr → nuxt-ssr ; remix + ssr → remix-ssr ; sveltekit + ssr → sveltekit-ssr ; astro + ssr → ssr
 * - sinon : architecture seule → spa | ssr | static
 */
export function determineTemplateType(
  architecture: "spa" | "ssr" | "static",
  framework?: string | null,
): ServiceWorkerTemplateType {
  const f = framework?.toLowerCase() ?? "";

  // Framework specific
  if (f === "wordpress" || f === "woocommerce") {
    return "wordpress";
  }

  // CMS & E-commerce
  if (
    f === "drupal" ||
    f === "joomla" ||
    f === "magento" ||
    f === "shopify" ||
    f === "prestashop"
  ) {
    return "php";
  }

  if (f === "symfony") {
    return architecture === "spa" ? "symfony-spa" : "symfony-api";
  }

  // PHP frameworks
  if (f === "codeigniter" || f === "cakephp" || f === "yii" || f === "laminas") {
    return "php";
  }

  if (f === "laravel") {
    if (architecture === "spa") return "laravel-spa";
    if (architecture === "ssr") return "laravel-ssr";
    return "laravel-api";
  }

  // Python frameworks
  if (f === "django") {
    return architecture === "spa" ? "django-spa" : "django-api";
  }
  if (f === "flask") {
    return architecture === "spa" ? "flask-spa" : "flask-api";
  }

  // JS/TS SSR frameworks — templates dédiés (scan retourne : nextjs, nuxt, remix, sveltekit, astro)
  if (f === "nextjs" && architecture === "ssr") return "next-ssr";
  if (f === "nuxt" && architecture === "ssr") return "nuxt-ssr";
  if (f === "remix" && architecture === "ssr") return "remix-ssr";
  if (f === "sveltekit" && architecture === "ssr") return "sveltekit-ssr";
  // Astro : pas de template dédié, fallback ssr
  if (f === "astro" && architecture === "ssr") return "ssr";

  // Architecture
  if (architecture === "spa") return "spa";
  if (architecture === "ssr") return "ssr";
  return "static";
}

// Export des templates individuels
export { staticServiceWorkerTemplate } from "./static.js";
export { spaServiceWorkerTemplate } from "./spa.js";
export { ssrServiceWorkerTemplate } from "./ssr.js";
export { wordpressServiceWorkerTemplate } from "./wordpress.js";
export { phpServiceWorkerTemplate } from "./php.js";
export { laravelSpaServiceWorkerTemplate } from "./laravel-spa.js";
export { laravelSsrServiceWorkerTemplate } from "./laravel-ssr.js";
export { laravelApiServiceWorkerTemplate } from "./laravel-api.js";
export { symfonySpaServiceWorkerTemplate } from "./symfony-spa.js";
export { symfonyApiServiceWorkerTemplate } from "./symfony-api.js";
export { djangoSpaServiceWorkerTemplate } from "./django-spa.js";
export { djangoApiServiceWorkerTemplate } from "./django-api.js";
export { flaskSpaServiceWorkerTemplate } from "./flask-spa.js";
export { flaskApiServiceWorkerTemplate } from "./flask-api.js";
export { nextSsrServiceWorkerTemplate } from "./next-ssr.js";
export { nuxtSsrServiceWorkerTemplate } from "./nuxt-ssr.js";
export { remixSsrServiceWorkerTemplate } from "./remix-ssr.js";
export { svelteKitSsrServiceWorkerTemplate } from "./sveltekit-ssr.js";
