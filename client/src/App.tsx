import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
	import {
	  ArrowLeft,
	  ArrowRight,
	  BadgeCheck,
	  CheckCircle2,
	  ChevronDown,
	  ChevronLeft,
	  ChevronRight,
	  CircleHelp,
  Eye,
	  Clock3,
	  Cpu,
	  Facebook,
	  Filter,
	  FileUp,
	  Headphones,
	  Heart,
  Instagram,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  Search,
  Send,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
	  Truck,
	  Usb,
	  X,
	  Youtube,
	  Zap,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { ESPLoader, Transport } from "esptool-js";
import "./index.css";
import { submitOrderToAppsScript, trackOrder, type OrderPayload, type OrderTrackingResult } from "./orderIntegration";

type Variant = {
  variantId: string;
  productFamily: string;
  displayName: string;
  price: number;
  priceUnit: "per_piece" | "per_2_pieces";
  stockQuantity: number;
  availability: string;
  image: string;
  source_order: number;
  capacitance?: string;
  voltage?: string;
  resistance?: string;
  powerRating?: string;
  tolerance?: string;
  marking?: string;
};

type Product = {
  id: string;
  slug: string;
  name: string;
  nameBn?: string;
  price: number;
  priceDisplay?: string;
  oldPrice?: number | null;
  currency: string;
  category: string;
  sourceCategory?: string;
  sku?: string;
  brand: string;
  availability?: string;
  stockStatus?: string;
  preOrder?: string;
  sourceUrl?: string;
  image?: string;
  variants: Variant[];
  sourceOrder?: number;
  featured?: boolean;
  newArrival?: boolean;
  trending?: boolean;
  deal?: boolean;
  images: string[];
  shortDescription: string;
  shortDescriptionBn?: string;
  description: string;
  descriptionBn?: string;
  specifications: Record<string, string>;
  documentation?: Array<{ title: string; titleBn?: string; url: string }>;
  applications?: string[];
  applicationsBn?: string[];
  attention?: string;
  attentionBn?: string;
  projects?: Array<{ title: string; url: string }>;
  keywords?: string[];
  stock: boolean;
  backInStock?: boolean;
  shipping?: { available: boolean; courier: string };
};

type Brand = { name: string; slug: string; image: string };
type Language = "en" | "bn";

type SiteConfig = {
  storeName: string;
  tagline: string;
  logo?: string;
  whatsapp: string;
  whatsappInternational: string;
  address: string;
  siteUrl: string;
  social: { facebook: string; tiktok: string; youtube: string };
  socialIcons?: { facebook?: string; youtube?: string; tiktok?: string; whatsapp?: string };
  shipping: { couriers: Array<{ id: string; name: string; deliveryCharge: number; logo?: string; trackingUrl?: string }> };
  support: { hours: string; email: string };
  heroBanners?: string[];
  heroIntervalMs?: number;
};

type LocationData = {
  divisions: Array<{
    name: string;
    districts: Array<{
      name: string;
      upazilas: Array<{ name: string; postOffices: Array<{ name: string; postCode: string }> }>;
    }>;
  }>;
};

type CartLine = { productId: string; variantId?: string; qty: number };

type CheckoutForm = {
  fullName: string;
  mobile: string;
  altMobile: string;
  division: string;
  district: string;
  upazila: string;
  postOffice: string;
  postCode: string;
  fullAddress: string;
  area: string;
  note: string;
  courierId: string;
  couponCode: string;
  paymentMethod: string;
  paymentMobile: string;
  transactionId: string;
  email: string;
};

const COUPONS = [{ code: "ED10", label: "৳10 off", amount: 10 }, { code: "ED20", label: "৳20 off", amount: 20 }, { code: "ED30", label: "৳30 off", amount: 30 }, { code: "ED50", label: "৳50 off", amount: 50 }, { code: "ED75", label: "৳75 off", amount: 75 }, { code: "ED100", label: "৳100 off", amount: 100 }, { code: "EDFREESHIP", label: "Free shipping", freeShipping: true }];
const PAYMENT_METHODS = ["Cash on Delivery", "bKash", "Nagad", "Rocket"];

const FALLBACK_SITE: SiteConfig = {
  storeName: "Electronics Dokan",
  tagline: "Components for curious builders",
  whatsapp: "01938640733",
  whatsappInternational: "8801938640733",
  address: "Phultala, Khulna, Bangladesh",
  siteUrl: "",
  social: { facebook: "https://facebook.com/electronicsdokanin", tiktok: "https://tiktok.com/@electronicsdokan", youtube: "electronicsdokan" },
  socialIcons: { facebook: "/images/social/facebook.webp", youtube: "/images/social/youtube.webp", tiktok: "/images/social/tiktok.webp", whatsapp: "/images/social/whatsapp.webp" },
  shipping: { couriers: [{ id: "bangladesh-post-office", name: "Bangladesh Post Office", deliveryCharge: 20 }, { id: "steadfast", name: "Steadfast Courier", deliveryCharge: 120 }] },
  support: { hours: "Every day · 9:00 AM–10:00 PM", email: "hello@electronicsdokan.com" },
  heroBanners: ["/images/home/hero-banner.webp"],
  heroIntervalMs: 5000,
};

const formatBDT = (value: number) => `৳${new Intl.NumberFormat(document.documentElement.lang === "bn" ? "bn-BD" : "en-BD").format(value)}`;
const localizedProductName = (product: Product) => document.documentElement.lang === "bn" ? (product.nameBn || product.name) : product.name;
const localizedShortDescription = (product: Product) => document.documentElement.lang === "bn" ? (product.shortDescriptionBn || product.shortDescription) : product.shortDescription;
const localizedDescription = (product: Product) => document.documentElement.lang === "bn" ? (product.descriptionBn || product.description) : product.description;
const localizedApplications = (product: Product) => document.documentElement.lang === "bn" ? (product.applicationsBn || product.applications || []) : (product.applications || []);
const localizedAttention = (product: Product) => document.documentElement.lang === "bn" ? (product.attentionBn || product.attention || "") : (product.attention || "");
const priceUnitLabel = (unit: Variant["priceUnit"] | undefined) => unit === "per_2_pieces" ? "per 2 pieces" : "per piece";
const productPrice = (product: Product) => product.variants?.length ? Math.min(...product.variants.map((v) => v.price)) : product.price;
const imagePath = (filename?: string) => filename ? `/images/products/${filename}` : "/images/placeholders/product-placeholder.webp";
const imageFor = (product: Product, variantId?: string) => {
  const variant = product.variants?.find((v) => v.variantId === variantId);
  return variant ? imagePath(variant.image) : (product.images?.[0] || imagePath(product.image));
};
const percentOff = (product: Product) => product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
const slugToTitle = (slug: string) => slug.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
const isPreOrderProduct = (product: Product) => /^pre-order/i.test((product.preOrder || "").trim());
const isBackInStockProduct = (product: Product) => Boolean(product.backInStock);
const isSeasonalProduct = (product: Product) => /season|festival|gift|light|led|decor|christmas|eid/i.test(`${product.name} ${product.nameBn || ""} ${(product.keywords || []).join(" ")}`);
const productSearchText = (product: Product) => [product.name, product.nameBn, product.id, product.slug, product.sku, product.category, product.sourceCategory, product.brand, product.shortDescription, product.shortDescriptionBn, product.description, product.descriptionBn, product.attention, product.attentionBn, ...(product.applications || []), ...(product.applicationsBn || []), ...(product.keywords || []), ...(product.projects || []).flatMap((project) => [project.title, project.url]), ...(product.variants || []).flatMap((variant) => [variant.displayName, variant.productFamily, variant.resistance, variant.capacitance, variant.voltage, variant.powerRating, variant.tolerance, variant.marking])].filter(Boolean).join(" ").toLocaleLowerCase();

function usePath() {
  const readPath = () => {
    const redirected = new URLSearchParams(window.location.search).get("__route");
    if (redirected && redirected.startsWith("/")) {
      window.history.replaceState({}, "", redirected);
      return redirected;
    }
    return window.location.pathname + window.location.search;
  };
  const [path, setPath] = useState(readPath);
  useEffect(() => {
    const handler = () => setPath(readPath());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);
  const navigate = (next: string) => {
    window.history.pushState({}, "", next);
    setPath(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return { path, navigate };
}

function App() {
  const { path, navigate } = usePath();
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("electronics-dokan-language") as Language) || "en");
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [site, setSite] = useState<SiteConfig>(FALLBACK_SITE);
  const [imageManifest, setImageManifest] = useState<Record<string, unknown> | null>(null);
  const [locations, setLocations] = useState<LocationData | null>(null);
  const [cart, setCart] = useState<CartLine[]>(() => {
    try { return JSON.parse(localStorage.getItem("electronics-dokan-cart") || "[]"); } catch { return []; }
  });
  const [ready, setReady] = useState(false);
  const [routeLoading, setRouteLoading] = useState(true);
  const [cartFlight, setCartFlight] = useState<{ image: string; name: string; fromX: number; fromY: number; toX: number; toY: number } | null>(null);

  useEffect(() => {
    setRouteLoading(true);
    const timer = window.setTimeout(() => setRouteLoading(false), 380);
    return () => window.clearTimeout(timer);
  }, [path]);

  useEffect(() => {
    Promise.all([
      fetch("/data/products.json").then((r) => r.json()),
      fetch("/config/site.json").then((r) => r.json()),
      fetch("/data/bangladesh-locations.json").then((r) => r.json()),
      fetch("/data/image-manifest.json").then((r) => r.json()),
      fetch("/data/brands.json").then((r) => r.json()),
    ]).then(([productData, siteData, locationData, manifest, brandData]) => {
      setProducts(productData);
      setSite(siteData);
      setLocations(locationData);
      setImageManifest(manifest);
      setBrands(brandData);
      setReady(true);
    }).catch(() => {
      toast.error("Catalog could not be loaded. Please refresh the page.");
      setReady(true);
    });
  }, []);

  useEffect(() => { localStorage.setItem("electronics-dokan-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem("electronics-dokan-language", language); document.documentElement.lang = language === "bn" ? "bn" : "en"; }, [language]);
  useEffect(() => {
    const title = path.startsWith("/product/") ? `${slugToTitle(path.split("/")[2] || "Product")} · ${site.storeName}` : `${site.storeName} · ${site.tagline}`;
    document.title = title;
    const description = document.querySelector('meta[name="description"]') || document.createElement("meta");
    description.setAttribute("name", "description");
    description.setAttribute("content", "Shop dependable electronics, development boards, sensors and maker tools from Electronics Dokan in Bangladesh.");
    document.head.appendChild(description);
  }, [path, site]);

  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const addToCart = (productId: string, qty = 1, variantId?: string, source?: HTMLElement) => {
    const product = products.find((item) => item.id === productId);
    const variant = product?.variants?.find((item) => item.variantId === variantId);
    const key = `${productId}::${variantId || "base"}`;
    setCart((current) => {
      const existing = current.find((line) => `${line.productId}::${line.variantId || "base"}` === key);
      const max = variant ? (variant.priceUnit === "per_2_pieces" ? Math.floor(variant.stockQuantity / 2) : variant.stockQuantity) : 999;
      if (existing) return current.map((line) => `${line.productId}::${line.variantId || "base"}` === key ? { ...line, qty: Math.min(max, line.qty + qty) } : line);
      return [...current, { productId, variantId, qty: Math.min(max, qty) }];
    });
    if (product && source) {
      const sourceRect = source.getBoundingClientRect();
      const target = document.querySelector(".cart-button") as HTMLElement | null;
      const targetRect = target?.getBoundingClientRect();
      setCartFlight({ image: imageFor(product, variantId), name: localizedProductName(product), fromX: sourceRect.left + sourceRect.width / 2, fromY: sourceRect.top + sourceRect.height / 2, toX: targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth - 42, toY: targetRect ? targetRect.top + targetRect.height / 2 : 28 });
      window.setTimeout(() => setCartFlight(null), 760);
    }
    toast.success(`${product ? localizedProductName(product) : "Item"}${variant ? ` — ${variant.displayName}` : ""} added to cart`);
  };
  const updateQty = (productId: string, qty: number, variantId?: string) => setCart((current) => qty <= 0 ? current.filter((line) => !(line.productId === productId && line.variantId === variantId)) : current.map((line) => line.productId === productId && line.variantId === variantId ? { ...line, qty } : line));
  const removeFromCart = (productId: string, variantId?: string) => setCart((current) => current.filter((line) => !(line.productId === productId && line.variantId === variantId)));
  const clearCart = () => setCart([]);

  const renderPage = () => {
    if (!ready) return <LoadingState />;
    if (path === "/" || path === "") return <HomePage products={products} site={site} brands={brands} navigate={navigate} addToCart={addToCart} />;
    if (path === "/categories") return <CategoriesPage products={products} navigate={navigate} />;
    if (path === "/brands") return <BrandsPage brands={brands} products={products} navigate={navigate} />;
	    if (path === "/tracking") return <TrackingPage site={site} navigate={navigate} />;
	    if (path === "/offers") return <OffersPage navigate={navigate} />;
	    if (path === "/projects/xiaozhi-ai") return <XiaozhiProjectPage navigate={navigate} language={language} products={products} addToCart={addToCart} />;
    if (path === "/projects/chyon-ai-4wheel-robot") return <ChyonRobotProjectPage navigate={navigate} language={language} products={products} addToCart={addToCart} />;
	    if (path === "/projects") return <ProjectDirectoryPage navigate={navigate} language={language} />;
	    if (["/pre-order", "/blog", "/corporate"].includes(path)) return <ResourcePage path={path} navigate={navigate} />;
    if (path.startsWith("/products")) return <ProductsPage products={products} navigate={navigate} addToCart={addToCart} />;
    if (path.startsWith("/product/")) return <ProductPage products={products} navigate={navigate} addToCart={addToCart} />;
    if (path === "/cart") return <CartPage products={products} cart={cart} site={site} navigate={navigate} updateQty={updateQty} removeFromCart={removeFromCart} />;
    if (path === "/checkout") return <CheckoutPage products={products} cart={cart} site={site} locations={locations} navigate={navigate} clearCart={clearCart} />;
    if (["/shipping", "/returns", "/privacy", "/terms", "/contact"].includes(path)) return <InfoPage path={path} site={site} navigate={navigate} />;
    return <NotFoundPage navigate={navigate} />;
  };

  return <>
    <Toaster position="bottom-right" toastOptions={{ className: "toast-card" }} />
    {(routeLoading || !ready) && <SitePreloader site={site} />}
    <Header site={site} cartCount={cartCount} path={path} navigate={navigate} products={products} language={language} setLanguage={setLanguage} />
    {cartFlight && <CartFlight item={cartFlight} />}
    <main>{renderPage()}</main>
    <Footer site={site} navigate={navigate} />
    <WhatsAppFloat site={site} language={language} />
    <ScrollControls productPage={path.startsWith("/product/")} />
    <StickyFooterNav site={site} cartCount={cartCount} navigate={navigate} language={language} />
  </>;
}

function Header({ site, cartCount, path, navigate, products, language, setLanguage }: { site: SiteConfig; cartCount: number; path: string; navigate: (path: string) => void; products: Product[]; language: Language; setLanguage: (language: Language) => void }) {
  const [searchValue, setSearchValue] = useState(() => new URLSearchParams(window.location.search).get("search") || "");
  const [searchCategory, setSearchCategory] = useState(() => new URLSearchParams(window.location.search).get("category") || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchSticky, setSearchSticky] = useState(false);
  const categories = Array.from(new Set(products.map((product) => product.category))).sort();
  useEffect(() => { const params = new URLSearchParams(window.location.search); setSearchValue(params.get("search") || ""); setSearchCategory(params.get("category") || ""); }, [path]);
  useEffect(() => { const onScroll = () => setSearchSticky(window.scrollY > 80); onScroll(); window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll); }, []);
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set("search", searchValue.trim());
    if (searchCategory) params.set("category", searchCategory);
    navigate(`/products${params.toString() ? `?${params.toString()}` : ""}`);
    setMenuOpen(false);
  };
  return <>
    <div className="announcement"><div className="container announcement-inner"><span>{language === "bn" ? "Electronics Dokan-এর সঙ্গে ভবিষ্যৎ তৈরি করুন" : "Build the future with Electronics Dokan"}</span><span className="announcement-social"><SocialLinks site={site} /><span className="top-divider">|</span><a href={`tel:${site.whatsapp}`} aria-label="Call Electronics Dokan">Hotline: {site.whatsapp}</a><select className="language-select" value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label="Language"><option value="en">EN</option><option value="bn">বাংলা</option></select></span></div></div>
    <header className="site-header">
      <div className="container header-main">
        <button className={`brand ${site.logo ? "has-custom-logo" : ""}`} onClick={() => navigate("/")} aria-label="Go to Electronics Dokan home">{site.logo && <img className="custom-brand-logo" src={site.logo} alt="" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement?.classList.remove("has-custom-logo"); }} />}<span className="brand-mark"><Zap size={20} fill="currentColor" /></span><span><strong>electronics</strong><b>dokan</b><small>Build beyond ordinary</small></span></button>
        <form className={`search-form ${searchSticky ? "is-sticky" : ""}`} onSubmit={submitSearch}><Search size={19} /><input aria-label="Search products" value={searchValue} onChange={(event) => { const value = event.target.value; setSearchValue(value); if (path.startsWith("/products")) { const params = new URLSearchParams(); if (value.trim()) params.set("search", value.trim()); if (searchCategory) params.set("category", searchCategory); navigate(`/products${params.toString() ? `?${params.toString()}` : ""}`); } }} placeholder="Search products, brands, categories..." /><select className="search-category-select" aria-label="Filter search by category" value={searchCategory} onChange={(event) => { const value = event.target.value; setSearchCategory(value); const params = new URLSearchParams(); if (searchValue.trim()) params.set("search", searchValue.trim()); if (value) params.set("category", value); navigate(`/products${params.toString() ? `?${params.toString()}` : ""}`); }}><option value="">All</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select><kbd>⌘ K</kbd><button type="submit" aria-label="Search"><ArrowRight size={19} /></button></form>
        <div className="header-actions">
          <div className="category-menu-wrap"><button className="icon-button category-trigger" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}><Menu size={20} /><span className="hide-mobile">Categories</span><ChevronDown size={15} /></button>{menuOpen && <div className="category-menu"><button onClick={() => { navigate("/products"); setMenuOpen(false); }}>All products <span>{products.length}</span></button>{categories.map((category) => <button key={category} onClick={() => { navigate(`/products?category=${encodeURIComponent(category)}`); setMenuOpen(false); }}>{category}<span>{products.filter((product) => product.category === category).length}</span></button>)}</div>}</div>
          <button className="cart-button" onClick={() => navigate("/cart")} aria-label={`Cart with ${cartCount} items`}><ShoppingCart size={21} /><span className="hide-mobile">Cart</span>{cartCount > 0 && <b>{cartCount}</b>}</button>
          <button className="mobile-menu-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close menu" : "Open menu"}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {mobileOpen && <div className="mobile-nav container"><button onClick={() => { navigate("/products"); setMobileOpen(false); }}>{language === "bn" ? "সব পণ্য দেখুন" : "Shop all products"}</button>{categories.map((category) => <button key={category} onClick={() => { navigate(`/products?category=${encodeURIComponent(category)}`); setMobileOpen(false); }}>{category}</button>)}<a href={`https://wa.me/${site.whatsappInternational}`} target="_blank" rel="noreferrer">{language === "bn" ? "WhatsApp-এ কথা বলুন" : "Chat on WhatsApp"}</a></div>}
      <div className="container header-sub"><nav className="header-quick-links" aria-label="Explore Electronics Dokan"><button onClick={() => navigate("/projects")}>Projects</button><button onClick={() => navigate("/pre-order")}>Pre-order</button><button onClick={() => navigate("/blog")}>Blog</button><button onClick={() => navigate("/corporate")}>Corporate</button></nav><span className="header-sub-right">{site.support.hours}</span></div>
    </header>
  </>;
}

function SocialLinks({ site }: { site: SiteConfig }) {
  const youtube = site.social.youtube.startsWith("http") ? site.social.youtube : `https://www.youtube.com/@${site.social.youtube}`;
  const links = [
    ["Facebook", site.social.facebook, site.socialIcons?.facebook, <Facebook size={14} />],
    ["YouTube", youtube, site.socialIcons?.youtube, <Youtube size={14} />],
    ["TikTok", site.social.tiktok, site.socialIcons?.tiktok, <span className="social-fallback-text">♪</span>],
    ["WhatsApp", `https://wa.me/${site.whatsappInternational}`, site.socialIcons?.whatsapp, <MessageCircle size={14} />],
  ] as const;
  return <span className="social-links">{links.map(([label, href, image, fallback]) => <a key={label} href={href} aria-label={label} target="_blank" rel="noreferrer"><span className="social-icon-fallback">{fallback}</span>{image && <img src={image} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />}</a>)}</span>;
}

function ScrollControls({ productPage }: { productPage: boolean }) {
  const [showTop, setShowTop] = useState(false);
  useEffect(() => { const onScroll = () => setShowTop(window.scrollY > 260); onScroll(); window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll); }, []);
  return <div className={`scroll-controls ${showTop || productPage ? "is-visible" : ""} ${productPage ? "product-scroll-controls" : ""}`}><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Scroll to top"><ChevronDown size={18} className="chevron-up" /></button>{productPage && <button onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })} aria-label="Scroll to bottom"><ChevronDown size={18} /></button>}</div>;
}

function playNotificationChime() { try { const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AudioContextClass) return; const context = new AudioContextClass(); const gain = context.createGain(); gain.gain.setValueAtTime(0.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.065, context.currentTime + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.58); gain.connect(context.destination); [880, 1174].forEach((frequency, index) => { const oscillator = context.createOscillator(); oscillator.type = "sine"; oscillator.frequency.value = frequency; oscillator.connect(gain); oscillator.start(context.currentTime + index * 0.13); oscillator.stop(context.currentTime + 0.28 + index * 0.13); }); window.setTimeout(() => context.close(), 900); } catch { /* Browser autoplay policy may block sound until the customer interacts. */ } }

function WhatsAppFloat({ site, language }: { site: SiteConfig; language: Language }) {
  const [notice, setNotice] = useState(false);
  useEffect(() => { const timer = window.setInterval(() => setNotice(true), 60000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (notice) playNotificationChime(); }, [notice]);
  return <div className="whatsapp-float-wrap">{notice && <button className="whatsapp-notice" onClick={() => setNotice(false)} aria-label="Dismiss WhatsApp notice">{language === "bn" ? "সমস্যা হলে মেসেজ করুন" : "Message us if you need help"}<span>×</span></button>}<a className="whatsapp-float" href={`https://wa.me/${site.whatsappInternational}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">{site.socialIcons?.whatsapp ? <img src={site.socialIcons.whatsapp} alt="WhatsApp" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <MessageCircle size={22} />}<span>{language === "bn" ? "WhatsApp-এ কথা বলুন" : "Chat with us"}</span></a></div>;
}

function StickyFooterNav({ site, cartCount, navigate, language }: { site: SiteConfig; cartCount: number; navigate: (path: string) => void; language: Language }) {
  const labels = language === "bn" ? { home: "হোম", category: "ক্যাটাগরি", cart: "কার্ট", offer: "অফার", tracking: "ট্র্যাকিং" } : { home: "Home", category: "Category", cart: "Cart", offer: "Offer", tracking: "Tracking" };
  return <nav className="sticky-footer-nav" aria-label="Quick navigation"><button onClick={() => navigate("/")}><span><Zap size={18} /></span><small>{labels.home}</small></button><button onClick={() => navigate("/categories")}><span><Menu size={18} /></span><small>{labels.category}</small></button><button onClick={() => navigate("/cart")}><span className="sticky-cart-icon"><ShoppingCart size={18} />{cartCount > 0 && <b>{cartCount}</b>}</span><small>{labels.cart}</small></button><button onClick={() => navigate("/offers")}><span><TagIcon /></span><small>{labels.offer}</small></button><button onClick={() => navigate("/tracking")}><span><Truck size={18} /></span><small>{labels.tracking}</small></button></nav>;
}

function TagIcon() { return <span className="tag-icon">%</span>; }

function Footer({ site, navigate }: { site: SiteConfig; navigate: (path: string) => void }) {
  const paymentMethods = [
    ["bKash", "/images/payment/bkash.webp"],
    ["Nagad", "/images/payment/nagad.webp"],
    ["Rocket", "/images/payment/rocket.webp"],
    ["NPSB", "/images/payment/npsb.webp"],
  ];
  return <footer className="footer"><div className="container footer-grid"><div className="footer-brand"><button className={`brand footer-logo ${site.logo ? "has-custom-logo" : ""}`} onClick={() => navigate("/")}>{site.logo && <img className="custom-brand-logo" src={site.logo} alt="" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement?.classList.remove("has-custom-logo"); }} />}<span className="brand-mark"><Zap size={20} fill="currentColor" /></span><span><strong>electronics</strong><b>dokan</b></span></button><p>Thoughtful components, honest prices and friendly support for builders across Bangladesh.</p><div className="social-row footer-social-images"><a href={site.social.facebook} aria-label="Facebook" target="_blank" rel="noreferrer"><img src={site.socialIcons?.facebook} alt="Facebook" onError={(event) => { event.currentTarget.style.display = "none"; }} /><Facebook size={16} /></a><a href={site.social.tiktok} aria-label="TikTok" target="_blank" rel="noreferrer"><img src={site.socialIcons?.tiktok} alt="TikTok" onError={(event) => { event.currentTarget.style.display = "none"; }} /><span className="social-text">♪</span></a><a href={`https://www.youtube.com/@${site.social.youtube}`} aria-label="YouTube" target="_blank" rel="noreferrer"><img src={site.socialIcons?.youtube} alt="YouTube" onError={(event) => { event.currentTarget.style.display = "none"; }} /><Youtube size={16} /></a></div></div><div><h4>Shop</h4><button onClick={() => navigate("/products")}>All products</button><button onClick={() => navigate("/brands")}>Brands</button><button onClick={() => navigate("/categories")}>Categories</button><button onClick={() => navigate("/products?category=Tools")}>Tools & accessories</button></div><div><h4>Customer care</h4><button onClick={() => navigate("/shipping")}>Shipping information</button><button onClick={() => navigate("/returns")}>Return / refund</button><button onClick={() => navigate("/contact")}>Contact us</button><button onClick={() => navigate("/privacy")}>Privacy</button></div><div className="footer-contact"><h4>Delivery partners</h4><div className="footer-courier-logos">{site.shipping.couriers.map((courier) => <a key={courier.id} href={courier.trackingUrl} target="_blank" rel="noreferrer" title={courier.name}><img src={courier.logo} alt={courier.name} onError={(event) => { event.currentTarget.style.display = "none"; }} /><span>{courier.name}</span></a>)}</div><h4>Need help?</h4><p><MapPin size={15} /> {site.address}</p><a href={`https://wa.me/${site.whatsappInternational}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> {site.whatsapp}</a><p><Clock3 size={15} /> {site.support.hours}</p><a href={`mailto:${site.support.email}`}><Send size={15} /> {site.support.email}</a><div className="payment-methods"><h4>Supported payment methods</h4><div className="payment-badges">{paymentMethods.map(([label, src]) => <span key={label}><img src={src} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.style.display = "none"; }} /><b>{label}</b></span>)}</div></div></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Electronics Dokan. All rights reserved.</span><span>Guest checkout · WhatsApp ordering · No account required</span></div></footer>;
}

function TrackingPage({ site, navigate }: { site: SiteConfig; navigate: (path: string) => void }) {
  const bn = document.documentElement.lang === "bn";
  const [lookup, setLookup] = useState(() => new URLSearchParams(window.location.search).get("order") || new URLSearchParams(window.location.search).get("tracking") || "");
  const [order, setOrder] = useState<OrderTrackingResult["order"] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const statuses = ["Pending", "Confirmed", "Processing", "Packed", "Shipped", "In Transit", "Delivered"];
  const statusIndex = order ? statuses.indexOf(order.status) : -1;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = lookup.trim();
    if (!value) { setOrder(null); setError(bn ? "Order ID অথবা Tracking Number দিন" : "Enter an Order ID or tracking number"); return; }
    setLoading(true); setError("");
    const result = await trackOrder(value);
    setOrder(result.order || null);
    setError(result.ok ? "" : (bn ? "এই Order ID পাওয়া যায়নি।" : result.error || "Order not found."));
    setLoading(false);
  };
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>{bn ? "হোম" : "Home"}</button><ChevronRight size={14} /><span>{bn ? "অর্ডার ট্র্যাকিং" : "Order tracking"}</span></div><div className="container tracking-hero"><div className="eyebrow"><span className="eyebrow-line" /> {bn ? "আপনার অর্ডার কোথায়?" : "Your order, clearly tracked"}</div><h1>{bn ? "অর্ডার ট্র্যাক করুন" : "Track your order"}</h1><p>{bn ? "Order ID অথবা courier tracking number দিয়ে সর্বশেষ update দেখুন।" : "Use your Order ID or courier tracking number to see the latest update."}</p></div><section className="container order-track-panel"><article className="order-track-card"><h2>{bn ? "Order ID / Tracking Number" : "Find an order"}</h2><p>{bn ? "আপনার confirmation বা courier message-এ থাকা identifier ব্যবহার করুন।" : "Use the identifier from your order confirmation or courier message."}</p><form className="order-track-form" onSubmit={submit}><input value={lookup} onChange={(event) => setLookup(event.target.value)} placeholder={bn ? "যেমন: ED-20260924-0001 বা BD12345" : "e.g. ED-20260924-0001 or BD12345"} aria-label={bn ? "Order ID বা tracking number" : "Order ID or tracking number"} /><button className="button button-primary" type="submit" disabled={loading}>{loading ? (bn ? "খোঁজা হচ্ছে…" : "Checking…") : (bn ? "অর্ডার দেখুন" : "Track order")} <ArrowRight size={16} /></button></form><div className="tracking-lookup-hints"><span>{bn ? "দ্রুত খুঁজুন:" : "Quick lookup:"}</span><button type="button" onClick={() => setLookup(new URLSearchParams(window.location.search).get("order") || "")}>{bn ? "Order ID" : "Order ID"}</button><button type="button" onClick={() => setLookup("")}>{bn ? "নতুন সার্চ" : "Clear"}</button></div>{error && <div className="order-track-result error">{error}</div>}{order && <div className="order-track-result"><div className="order-track-result-head"><div><small className="result-kicker">{bn ? "অর্ডার পাওয়া গেছে" : "ORDER FOUND"}</small><strong>{order.orderId}</strong></div><span className="order-status-pill">{order.status}</span></div><div className="order-track-row"><span>{bn ? "তারিখ" : "Placed"}</span><b>{order.dateTime}</b></div><div className="order-track-row"><span>{bn ? "পণ্য" : "Items"}</span><b>{order.itemSummary} · {order.quantity}</b></div><div className="order-track-row"><span>{bn ? "মোট" : "Total"}</span><b>{formatBDT(order.total)}</b></div><div className="order-track-row"><span>{bn ? "পেমেন্ট স্ট্যাটাস" : "Payment status"}</span><b>{order.paymentStatus}</b></div><div className="order-track-row"><span>{bn ? "ডেলিভারি" : "Delivery"}</span><b>{order.deliveryMethod}{order.carrier ? ` · ${order.carrier}` : ""}</b></div>{order.trackingNumber && <div className="order-track-row"><span>{bn ? "Tracking Number" : "Tracking number"}</span><b>{order.trackingNumber}</b></div>}{order.trackingNumber && order.carrier && site.shipping.couriers.some((courier) => order.carrier.toLowerCase().includes(courier.name.toLowerCase().split(" ")[0])) && <a className="button button-primary" href={site.shipping.couriers.find((courier) => order.carrier.toLowerCase().includes(courier.name.toLowerCase().split(" ")[0]))?.trackingUrl} target="_blank" rel="noreferrer">Track shipment <ArrowUpRight /></a>}</div>}</article><aside className="order-track-card"><h2>{bn ? "Status timeline" : "Order timeline"}</h2><p>{bn ? "আপনার status update Sheet থেকে সরাসরি এখানে দেখা যাবে।" : "Status updates made by our team appear here from the order dashboard."}</p><div className="order-track-timeline">{statuses.map((status, index) => <span key={status} className={statusIndex >= index ? "active" : ""}>{status}</span>)}</div><div className="tracking-help" style={{ margin: "22px 0 0" }}><MessageCircle size={18} /><p>{bn ? "সাহায্য লাগলে WhatsApp-এ যোগাযোগ করুন।" : "Need help with your order? Contact us on WhatsApp."}</p><a href={`https://wa.me/${site.whatsappInternational}`} target="_blank" rel="noreferrer">WhatsApp <ArrowUpRight /></a></div></aside></section><section className="container courier-tracking-grid">{site.shipping.couriers.map((courier) => <article className="courier-tracking-card" key={courier.id}><div className="courier-logo-slot"><img src={courier.logo} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /><Truck size={30} /></div><div><h2>{courier.name}</h2><p>{bn ? "Courier tracking number পেলে official portal-এ আরও বিস্তারিত tracking করুন।" : "Once you receive a courier tracking number, use the official portal for detailed shipment tracking."}</p></div><a className="button button-primary" href={courier.trackingUrl} target="_blank" rel="noreferrer">{bn ? "Courier tracking" : "Open courier tracking"} <ArrowUpRight /></a></article>)}</section></div>;
}

function OffersPage({ navigate }: { navigate: (path: string) => void }) {
  const bn = document.documentElement.lang === "bn";
  const offers = bn ? [{ tag: "শুরু করার কিট", title: "Maker starter picks", copy: "Arduino, sensor এবং prototyping essentials একসাথে বেছে নিন।", action: "Products দেখুন" }, { tag: "সাপ্তাহিক deal", title: "Build more, spend less", copy: "Featured components ও popular modules-এ নতুন stock ও deal দেখুন।", action: "সব পণ্য দেখুন" }, { tag: "নতুন project", title: "আজই আপনার build শুরু করুন", copy: "আপনার project-এর জন্য প্রয়োজনীয় part খুঁজে নিন—দ্রুত delivery ও human support সহ।", action: "Category দেখুন" }] : [{ tag: "Starter picks", title: "Maker starter picks", copy: "Pick Arduino, sensor and prototyping essentials for your next build.", action: "Browse products" }, { tag: "Weekly deal", title: "Build more, spend less", copy: "Explore featured components and popular modules with fresh stock and deals.", action: "Shop all products" }, { tag: "New project", title: "Start your build today", copy: "Find the parts for your project with fast delivery and human support.", action: "Browse categories" }];
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>{bn ? "হোম" : "Home"}</button><ChevronRight size={14} /><span>{bn ? "বিশেষ অফার" : "Special offers"}</span></div><div className="container page-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> {bn ? "আজকের catalogue highlights" : "Catalogue highlights"}</div><h1>{bn ? "বিশেষ অফার" : "Special offers"}</h1><p>{bn ? "আপনার পরের project-এর জন্য বেছে নেওয়া কিছু special picks।" : "A few special picks for your next project."}</p></div></div><section className="container offer-grid">{offers.map((offer, index) => <article className={`offer-card offer-card-${index}`} key={offer.title}><span>{offer.tag}</span><h2>{offer.title}</h2><p>{offer.copy}</p><button className="button button-light" onClick={() => navigate(index === 2 ? "/categories" : "/products")}>{offer.action} <ArrowRight size={16} /></button></article>)}</section></div>;
}

function ProjectDirectoryPage({ navigate, language }: { navigate: (path: string) => void; language: Language }) {
  const bn = language === "bn";
  const projects = bn ? [
    ["01", "XiaoZhi AI voice assistant", "ESP32-S3, OLED face, I2S voice input/output এবং browser-based local firmware flasher-সহ voice assistant build।", "XIAOZHI AI · PRO", "/projects/xiaozhi-ai"],
    ["02", "Chyon AI 4-wheel robot", "Camera vision, voice AI, OLED, obstacle protection, RGB status panel এবং four-wheel motor control-সহ সম্পূর্ণ robot build।", "CHYON AI · ROBOT", "/projects/chyon-ai-4wheel-robot"],
  ] : [
    ["01", "XiaoZhi AI voice assistant", "An ESP32-S3 voice assistant with an OLED face, I2S audio and a local browser firmware flasher.", "XIAOZHI AI · PRO", "/projects/xiaozhi-ai"],
    ["02", "Chyon AI 4-wheel robot", "Camera vision, voice AI, OLED, obstacle protection, RGB status feedback and four-wheel motor control.", "CHYON AI · ROBOT", "/projects/chyon-ai-4wheel-robot"],
  ];
  return <div className="page-wrap project-directory-page"><div className="container breadcrumb"><button onClick={() => navigate("/")}>{bn ? "হোম" : "Home"}</button><ChevronRight size={14} /><span>{bn ? "সব project" : "All projects"}</span></div><div className="container project-directory-hero"><div className="eyebrow"><span className="eyebrow-line" /> {bn ? "Build with a clear starting point" : "Build with a clear starting point"}</div><h1>{bn ? <>আপনার পরের <em>electronics build</em> শুরু করুন।</> : <>Start your next <em>electronics build.</em></>}</h1><p>{bn ? "Source-ভিত্তিক parts list, wiring, firmware এবং setup guide-সহ Electronics Dokan-এর project library।" : "A focused project library with source-based parts lists, wiring, firmware and setup guidance from Electronics Dokan."}</p></div><section className="container project-directory-grid">{projects.map(([number, title, copy, tag, route], index) => <article className={`project-directory-card project-directory-card-${index}`} key={route}><span className="resource-number">{number}</span><span className="project-directory-tag">{tag}</span><h2>{title}</h2><p>{copy}</p><div className="project-directory-footer"><span>{bn ? "পূর্ণ guide, parts ও flasher" : "Full guide, parts and flasher"}</span><button className="button button-primary" onClick={() => navigate(route)}>{bn ? "Project খুলুন" : "Open project"} <ArrowRight size={16} /></button></div></article>)}</section></div>;
}
function ResourcePage({ path, navigate }: { path: string; navigate: (path: string) => void }) { const pages: Record<string, { eyebrow: string; title: string; intro: string; cards: Array<[string, string, string]> }> = { "/projects": { eyebrow: "Build with a clear starting point", title: "Projects", intro: "Practical project ideas, parts lists and guidance for your next electronics build.", cards: [["Smart home starter", "Build a simple sensor-led room monitor with an ESP board, display and reliable power.", "Explore modules"], ["Bench power toolkit", "Put together the essential tools and measurement parts for a safer, cleaner workbench.", "Shop tools"], ["Maker weekend", "A compact weekend build using sensors, LEDs and a microcontroller—great for learning by doing.", "Browse components"], ["XiaoZhi AI voice assistant", "Build an ESP32-S3 voice chatbot with an animated OLED face and browser-based firmware installation.", "Open project"], ["Chyon AI 4-wheel robot", "Build a voice-controlled ESP32-S3 robot with camera, OLED, obstacle protection, RGB panel and L298N motor control.", "Open project"]] }, "/pre-order": { eyebrow: "Reserve upcoming stock", title: "Pre-order products", intro: "Reserve selected items before the next stock arrival. Our team confirms availability and timing with you.", cards: [["How pre-order works", "Choose a product marked Pre-order and send your enquiry through checkout. We confirm the advance, arrival and delivery details.", "View pre-order"], ["Clear confirmation", "No order is final until our team confirms the product, price, expected arrival and delivery charge with you.", "Ask on WhatsApp"], ["Need a specific part?", "Send us the model, board or component you need and we will check the next available shipment.", "Request a part"]] }, "/blog": { eyebrow: "Notes from the workbench", title: "Blog", intro: "Useful guides, build notes and practical electronics ideas for curious builders.", cards: [["Choosing the right module", "A quick way to compare voltage, current, interface and project fit before you buy.", "Read the guide"], ["From sketch to prototype", "A simple workflow for planning components, testing early and avoiding expensive rework.", "Read the guide"], ["Tools that earn their place", "The small set of tools that makes soldering, testing and repairs more comfortable.", "Read the guide"]] }, "/corporate": { eyebrow: "Reliable supply for teams", title: "Corporate", intro: "Need repeat supply, project components or a practical sourcing partner? Talk to Electronics Dokan.", cards: [["Project supply", "We can help prepare component lists for education, prototyping, repair and maker programmes.", "Start an enquiry"], ["Bulk requirements", "Share your part numbers, quantities and timeline so our team can check availability and pricing.", "Request a quote"], ["Human support", "Speak with a real person about delivery, substitutions and the best way to complete your order.", "Contact our team"]] } }; const page = pages[path]; return <div className="page-wrap resource-page"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><span>{page.title}</span></div><div className="container resource-hero"><div className="eyebrow"><span className="eyebrow-line" /> {page.eyebrow}</div><h1>{page.title}</h1><p>{page.intro}</p></div><section className="container resource-grid">{page.cards.map(([title, copy, action], index) => <article className={`resource-card resource-card-${index % 3}`} key={title}><span className="resource-number">0{index + 1}</span><h2>{title}</h2><p>{copy}</p><button className="button button-primary" onClick={() => navigate(path === "/pre-order" && index === 0 ? "/products?sort=preorder" : path === "/projects" && index === 1 ? "/products?category=Tools" : path === "/projects" && index === 3 ? "/projects/xiaozhi-ai" : path === "/projects" && index === 4 ? "/projects/chyon-ai-4wheel-robot" : "/contact")}>{action} <ArrowRight size={16} /></button></article>)}</section></div>; }

function XiaozhiFlasher({ firmwarePath = "/firmware/xiaozhi/xiaozhi-pro-esp32-s3-v1.0.0.bin", firmwareParts = [], flashFreq = "40m", flashSize = "keep", firmwareLabel = "local firmware" }: { firmwarePath?: string; firmwareParts?: Array<{ path: string; address: number }>; flashFreq?: string; flashSize?: string; firmwareLabel?: string }) {
  const [status, setStatus] = useState("No port selected");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [chip, setChip] = useState("");
  const [error, setError] = useState("");
  const [eraseAll, setEraseAll] = useState(true);
  const [openAfterFlash, setOpenAfterFlash] = useState(true);
  const [resetAfterFlash, setResetAfterFlash] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [ports, setPorts] = useState<any[]>([]);
  const [selectedPortIndex, setSelectedPortIndex] = useState(0);
  const [monitorExpanded, setMonitorExpanded] = useState(false);
  const monitorReaderRef = useRef<any>(null);
  const monitorPortRef = useRef<any>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const serial = () => {
    if (!("serial" in navigator)) throw new Error("Web Serial is unavailable. Use Chrome or Edge on desktop HTTPS.");
    return (navigator as Navigator & { serial: { requestPort: () => Promise<any>; getPorts: () => Promise<any[]> } }).serial;
  };
  const addLog = (message: string) => {
    const clean = message.replace(/\r/g, "").trim();
    if (clean) setLogs((current) => [...current.slice(-199), clean]);
  };
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);
  useEffect(() => { serial().getPorts().then(setPorts).catch(() => undefined); }, []);
  const portLabel = (port: any, index: number) => {
    const info = port.getInfo?.() || {};
    const vendor = info.usbVendorId ? `VID ${info.usbVendorId.toString(16).toUpperCase().padStart(4, "0")}` : "USB";
    const product = info.usbProductId ? `PID ${info.usbProductId.toString(16).toUpperCase().padStart(4, "0")}` : "serial";
    return `Authorized port ${index + 1} · ${vendor} / ${product}`;
  };
  const refreshPorts = async () => {
    try {
      const list = await serial().getPorts();
      setPorts(list);
      if (!list.length) { setStatus("No port authorized for Electronics Dokan"); addLog("No authorized serial port found for this website origin."); }
      else { setStatus(`${list.length} authorized port${list.length > 1 ? "s" : ""} found`); addLog(`Found ${list.length} authorized port${list.length > 1 ? "s" : ""}. Select the board below.`); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not read authorized ports."); }
  };
  const authorizePort = async () => {
    setError("");
    try {
      const port = await serial().requestPort();
      const list = await serial().getPorts();
      const index = Math.max(0, list.indexOf(port));
      setPorts(list); setSelectedPortIndex(index); setStatus("Port authorized and selected"); addLog(`${portLabel(port, index)} selected for Electronics Dokan.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No port was authorized.";
      setError(message); setStatus("Authorization cancelled"); addLog(`ERROR: ${message}`);
    }
  };
  const selectedPort = ports[selectedPortIndex];
  const stopMonitor = async () => {
    const reader = monitorReaderRef.current;
    monitorReaderRef.current = null;
    if (reader) { try { await reader.cancel(); } catch { /* already closed */ } try { reader.releaseLock(); } catch { /* released */ } }
    const port = monitorPortRef.current;
    monitorPortRef.current = null;
    if (port) { try { await port.close(); } catch { /* already closed */ } }
    setMonitoring(false);
  };
  const pulseReset = async (port: any) => {
    if (!port) throw new Error("Select an authorized port first.");
    await stopMonitor();
    if (!port.readable && !port.writable) await port.open({ baudRate: 115200 });
    if (!port.setSignals) throw new Error("This USB serial adapter does not expose hardware reset signals.");
    addLog("Sending hardware reset signal to the board…");
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await new Promise((resolve) => setTimeout(resolve, 120));
    await port.setSignals({ dataTerminalReady: true, requestToSend: false });
    await new Promise((resolve) => setTimeout(resolve, 120));
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await new Promise((resolve) => setTimeout(resolve, 300));
    setStatus("Board reset · ready"); addLog("Board reset complete. Firmware should now be running.");
  };
  const resetBoard = async () => {
    if (busy) return;
    setError("");
    try { await pulseReset(selectedPort); if (openAfterFlash) await startMonitor(selectedPort); }
    catch (caught) { const message = caught instanceof Error ? caught.message : "The board could not be reset."; setError(message); setStatus("Reset failed"); addLog(`ERROR: ${message}`); }
  };
  const startMonitor = async (port: any) => {
    if (!port) throw new Error("Select an authorized port first.");
    if (!port.readable && !port.writable) await port.open({ baudRate: 115200 });
    if (!port.readable) throw new Error("The selected port opened, but has no readable serial stream.");
    monitorPortRef.current = port; setMonitoring(true); setStatus("Serial monitor connected"); addLog("--- Serial monitor connected · 115200 baud ---");
    const reader = port.readable.getReader(); monitorReaderRef.current = reader; const decoder = new TextDecoder();
    (async () => { try { while (true) { const { value, done } = await reader.read(); if (done) break; if (value) addLog(decoder.decode(value, { stream: true })); } } catch (caught) { if (monitorReaderRef.current === reader) addLog(`Monitor stopped: ${caught instanceof Error ? caught.message : "connection closed"}`); } finally { try { reader.releaseLock(); } catch { /* released */ } if (monitorReaderRef.current === reader) { monitorReaderRef.current = null; setMonitoring(false); } } })();
  };
  const connectMonitor = async () => {
    if (busy) return; setError("");
    try { await startMonitor(selectedPort); } catch (caught) { const message = caught instanceof Error ? caught.message : "The serial monitor could not connect."; setError(message); setStatus("Monitor stopped"); addLog(`ERROR: ${message}`); }
  };
  const flash = async () => {
    if (busy) return;
    if (!selectedPort) { setError("Authorize this website and select the ESP32-S3 port before flashing."); setStatus("No port selected"); return; }
    setBusy(true); setError(""); setProgress(0); setChip("");
    let transport: Transport | null = null;
    try {
      await stopMonitor();
      if (selectedPort.readable || selectedPort.writable) { try { await selectedPort.close(); } catch { /* loader will report a locked port */ } }
      transport = new Transport(selectedPort, false); setStatus("Connecting to bootloader…"); addLog(`Connecting to the selected port for ${firmwareLabel}. If this fails, hold BOOT while reconnecting the board.`);
      const loader = new ESPLoader({ transport, baudrate: 460800, romBaudrate: 115200, terminal: { clean: () => undefined, writeLine: (data: string) => { setStatus(data); addLog(data); }, write: (data: string) => { setStatus(data); addLog(data); }, } as never });
      const detected = await loader.main(); setChip(detected); addLog(`Detected chip: ${detected}`);
      const parts = firmwareParts.length ? firmwareParts : [{ path: firmwarePath, address: 0 }];
      const files = await Promise.all(parts.map(async (part) => {
        const response = await fetch(part.path); if (!response.ok) throw new Error(`Firmware part failed (${response.status}): ${part.path}`);
        const data = new Uint8Array(await response.arrayBuffer());
        addLog(`Loaded ${part.path} → 0x${part.address.toString(16)} (${(data.byteLength / 1024).toFixed(1)} KB)`);
        return { data, address: part.address };
      }));
      const totalBytes = files.reduce((sum, file) => sum + file.data.byteLength, 0);
      addLog(`${firmwareLabel} ready: ${files.length} flash parts · ${(totalBytes / 1024 / 1024).toFixed(2)} MB payload`);
      setStatus(eraseAll ? "Erasing complete flash…" : "Preparing flash…"); addLog(eraseAll ? "Erase enabled: complete flash erase requested." : "Erase disabled: existing flash is not being fully erased.");
      await loader.writeFlash({ fileArray: files, flashMode: "dio" as never, flashFreq: flashFreq as never, flashSize: flashSize as never, eraseAll, compress: true, reportProgress: (fileIndex, written, total) => { const prior = files.slice(0, fileIndex).reduce((sum, file) => sum + file.data.byteLength, 0); const percent = Math.round(((prior + Math.min(written, total)) / totalBytes) * 100); setProgress(percent); setStatus(`Writing flash map… ${percent}%`); } });
      await loader.after("hard_reset"); try { await transport.disconnect(); } catch { /* already closed */ } transport = null;
      setProgress(100); setStatus("Flash written · resetting board…"); addLog("Flash write complete. Preparing board reset…");
      if (resetAfterFlash) await pulseReset(selectedPort);
      setStatus("Flash complete · board ready"); addLog("Flash complete and board reset. Firmware should now be running.");
      if (openAfterFlash) { await new Promise((resolve) => setTimeout(resolve, 700)); await startMonitor(selectedPort); }
    } catch (caught) { const message = caught instanceof Error ? caught.message : "The board could not be flashed."; setError(message); setStatus("Flash stopped"); addLog(`ERROR: ${message}`); try { if (transport) await transport.disconnect(); } catch { /* cleanup */ } } finally { setBusy(false); }
  };
  return <div className="custom-flasher"><div className="flasher-port-manager"><div className="flasher-port-heading"><b>1 · Select this website's port</b><button type="button" onClick={refreshPorts} disabled={busy}>Refresh</button></div><p>Chrome does not expose the COM number to websites. Do not use the first port automatically—select the authorized USB VID/PID that belongs to your ESP32-S3.</p>{ports.length ? <div className="flasher-port-list">{ports.map((port, index) => <label key={index}><input type="radio" name="xiaozhi-port" checked={selectedPortIndex === index} onChange={() => { setSelectedPortIndex(index); setStatus("Port selected"); }} disabled={busy} /><span>{portLabel(port, index)}</span></label>)}</div> : <div className="flasher-no-port">No Electronics Dokan port authorized yet.</div>}<button type="button" className="button button-flasher-secondary" onClick={authorizePort} disabled={busy}>Authorize port once</button></div><div className="flasher-controls"><button className="button button-primary flasher-activate" onClick={flash} disabled={busy || monitoring || !selectedPort}>{busy ? "Flashing…" : "Flash local firmware"}</button><button className="button button-flasher-secondary" onClick={monitoring ? stopMonitor : connectMonitor} disabled={busy || !selectedPort}>{monitoring ? "Disconnect monitor" : "Connect serial monitor"}</button><button className="button button-flasher-secondary" onClick={resetBoard} disabled={busy || !selectedPort}>Reset board</button></div><div className="flasher-options"><label><input type="checkbox" checked={eraseAll} onChange={(event) => setEraseAll(event.target.checked)} disabled={busy} /> Erase complete flash before install</label><label><input type="checkbox" checked={resetAfterFlash} onChange={(event) => setResetAfterFlash(event.target.checked)} disabled={busy} /> Reset board after flash</label><label><input type="checkbox" checked={openAfterFlash} onChange={(event) => setOpenAfterFlash(event.target.checked)} disabled={busy} /> Open compact monitor after reset</label></div><div className="custom-flasher-status"><span>{status}</span>{chip && <b>{chip}</b>}</div>{(busy || progress > 0) && <div className="flasher-progress"><i style={{ width: `${progress}%` }} /></div>}<div className="serial-monitor"><div className="serial-monitor-heading"><b>Serial monitor</b><button type="button" onClick={() => setMonitorExpanded((value) => !value)}>{monitorExpanded ? "Collapse" : "Expand"}</button><button type="button" onClick={() => setLogs([])}>Clear</button><small>115200 baud</small></div><div ref={logRef} className={`serial-monitor-log${monitorExpanded ? " expanded" : ""}`}>{logs.length ? logs.map((line, index) => <div key={`${index}-${line}`}>{line}</div>) : <span className="serial-monitor-empty">Compact log appears here after connecting the selected port.</span>}</div></div>{error && <p className="flasher-error">{error}</p>}</div>;
}

function XiaozhiProjectPage({ navigate, language, products, addToCart }: { navigate: (path: string) => void; language: Language; products: Product[]; addToCart: (productId: string, qty?: number, variantId?: string, source?: HTMLElement) => void }) {
  const bn = language === "bn";
  const text = bn ? {
    crumb: "XiaoZhi AI", eyebrow: "XiaoZhi voice assistant build", title: <>Build your own <em>AI voice assistant.</em></>,
    hero: "ESP32-S3, animated OLED face, INMP441 microphone এবং MAX98357A audio output—একটি সম্পূর্ণ XiaoZhi AI voice assistant project।",
    guideButton: "সম্পূর্ণ guide দেখুন", flashButton: "Firmware flash করুন", controller: "ESP32-S3", controllerSmall: "Voice / Wi-Fi / AI", audio: "I2S voice audio", audioSmall: "INMP441 + MAX98357A", setup: "Local browser flasher", setupSmall: "No IDE or remote firmware",
    overviewTitle: "এই project-এ কী আছে", overviewTag: "XiaoZhi AI Pro v1.0.0", overview: "এই build-এ ESP32-S3-এর সঙ্গে INMP441 microphone, MAX98357A mono amplifier, 3W 4Ω speaker এবং 0.96-inch 128×64 OLED যুক্ত করে cloud-connected voice assistant তৈরি করা হয়।",
    features: ["Animated OLED face and pairing display", "Multilingual voice conversations", "Custom wake-word capable ESP32-S3 build", "NTP time and Wi-Fi diagnostics"],
    partsTitle: "যা যা লাগবে", partsTag: "Build checklist", parts: ["Source-compatible ESP32-S3 board", "INMP441 I2S microphone", "MAX98357A I2S amplifier + 3W 4Ω mono speaker", "0.96-inch SSD1306 128×64 I2C OLED", "Breadboard, jumper wires and USB data cable"],
    flashEyebrow: "Verified local firmware", flashTitle: "XiaoZhi AI firmware flash করুন।", flashCopy: <>এই page-এ repository-এর local <code>manifest.json</code> অনুযায়ী ESP32-S3-এর জন্য সম্পূর্ণ merged image লেখা হবে; remote flasher বা guessed binary ব্যবহার করা হবে না।</>, flashNotes: ["ESP32-S3 target", "Local merged image · offset 0x000000", "115200 baud monitor"],
    guideEyebrow: "Electronics Dokan XiaoZhi guide", guideTitle: "Wire carefully, flash locally, configure once.", guideIntro: "Firmware manifest, hardware checklist, first boot এবং troubleshooting এক জায়গায় রাখা হয়েছে।", flashSection: "01 · FLASHING", flashHeading: "Use the local XiaoZhi firmware package", flashSteps: ["Desktop Chrome বা Edge এবং data-capable USB cable ব্যবহার করুন।", "ESP32-S3 port authorize করে তালিকা থেকে সঠিক port select করুন।", "Clean install-এর জন্য Erase complete flash চালু রাখুন।", "Local merged firmware offset 0x000000-এ লিখুন এবং progress শেষ হওয়া পর্যন্ত অপেক্ষা করুন।", "Flash complete হলে reset করুন এবং serial monitor-এ 115200 baud boot log দেখুন।"], flashCallout: <>এই package-এর manifest-এ একটি complete merged image আছে। এটিকে অন্য board-এর firmware দিয়ে প্রতিস্থাপন করবেন না এবং physical board যাচাই ছাড়া successful boot ধরে নেবেন না।</>,
    wiringSection: "02 · HARDWARE & WIRING", wiringHeading: "Use the source board wiring—not a guessed pin map", wiringCopy: <>XiaoZhi build-এ board-specific pin map source documentation অনুযায়ী মিলিয়ে নিন। এখানে generic ESP32 pin guess করা হয়নি; 3.3V logic, common ground এবং board-এর I2S/OLED labels যাচাই করে তারপর power দিন।</>, wiringRows: [["ESP32-S3", "Source-compatible board · data-capable USB"], ["INMP441", "I2S microphone · voice input"], ["MAX98357A", "I2S mono amplifier · voice output"], ["SSD1306 OLED", "128×64 I2C display · face and pairing"], ["3W 4Ω speaker", "Connect to amplifier speaker output; observe polarity"]], wiringCallout: "Amplifier, speaker and OLED-এর supply voltage board/source documentation-এর সঙ্গে মিলিয়ে নিন। Motor বা অন্য high-current load এই voice build-এর power rail-এ যুক্ত করবেন না।",
    firstBootSection: "03 · FIRST BOOT", firstBootHeading: "Connect the XiaoZhi setup hotspot", firstBootSteps: ["Flash শেষ হলে serial monitor-এ boot এবং Wi-Fi config message দেখুন।", "Phone-এর Wi-Fi list refresh করে XiaoZhi-XXXX hotspot খুঁজুন।", <>AP-তে connect করে <code>http://192.168.4.1</code> খুলুন।</>, "Wi-Fi Config-এ 2.4GHz router select করে password save করুন; 5GHz-only network supported নয়।", "OLED-এ pairing code এলে XiaoZhi account/console-এ device pair করুন।"], firstBootCallout: "AP না দেখা গেলে প্রথমে data cable, correct board, erase-and-flash এবং serial boot log পরীক্ষা করুন। পুরনো credential থাকলে source-supported BOOT/config procedure অনুসরণ করুন।",
    personalizeSection: "04 · ACCOUNT & PERSONA", personalizeHeading: "Pair the assistant and make it yours", personalizeSteps: ["XiaoZhi account-এ sign in বা নতুন account তৈরি করুন।", "OLED-এ দেখানো pairing code ব্যবহার করুন।", "Language, voice এবং personality নির্বাচন করুন।", "ছোট একটি voice conversation দিয়ে microphone ও speaker পরীক্ষা করুন।", "Custom wake word source build-এ enabled থাকলে সেটি configure করুন।"],
    commandSection: "05 · VOICE & UPDATES", commandHeading: "Try the assistant", commands: [["What time is it?", "NTP time"], ["What’s my Wi-Fi strength?", "Network diagnostics"], ["Show only your face.", "OLED display mode"], ["Set volume to 50%.", "Audio control"], ["Reboot yourself.", "Remote restart"]], commandCallout: "OTA theme বা asset update চলাকালে board powered রাখুন এবং update শেষ না হওয়া পর্যন্ত USB/power disconnect করবেন না।",
    troubleSection: "06 · TROUBLESHOOTING", troubleHeading: "If the assistant does not flash or boot", troubles: [["No serial port", "Data cable ব্যবহার করুন, Arduino/serial tools বন্ধ করুন এবং USB port বদলে দেখুন."], ["Flash fails", "Correct ESP32-S3 port select করুন, erase চালু রেখে retry করুন এবং প্রয়োজনে BOOT ধরে reconnect করুন."], ["No XiaoZhi AP", "115200 baud boot log দেখুন; board/application boot না করলে manifest-এর local image দিয়ে আবার flash করুন."], ["No audio", "INMP441 I2S wiring, MAX98357A supply, speaker polarity এবং common ground পরীক্ষা করুন."]]
  } : {
    crumb: "XiaoZhi AI", eyebrow: "XiaoZhi voice assistant build", title: <>Build your own <em>AI voice assistant.</em></>,
    hero: "A complete XiaoZhi AI voice assistant with an ESP32-S3, animated OLED face, INMP441 microphone and MAX98357A audio output.",
    guideButton: "Read the full guide", flashButton: "Flash firmware", controller: "ESP32-S3", controllerSmall: "Voice / Wi-Fi / AI", audio: "I2S voice audio", audioSmall: "INMP441 + MAX98357A", setup: "Local browser flasher", setupSmall: "No IDE or remote firmware",
    overviewTitle: "What this project includes", overviewTag: "XiaoZhi AI Pro v1.0.0", overview: "This build combines an ESP32-S3 with an INMP441 microphone, MAX98357A mono amplifier, 3W 4Ω speaker and 0.96-inch 128×64 OLED for a cloud-connected voice assistant.",
    features: ["Animated OLED face and pairing display", "Multilingual voice conversations", "Custom wake-word capable ESP32-S3 build", "NTP time and Wi-Fi diagnostics"],
    partsTitle: "Required hardware", partsTag: "Build checklist", parts: ["Source-compatible ESP32-S3 board", "INMP441 I2S microphone", "MAX98357A I2S amplifier + 3W 4Ω mono speaker", "0.96-inch SSD1306 128×64 I2C OLED", "Breadboard, jumper wires and USB data cable"],
    flashEyebrow: "Verified local firmware", flashTitle: "Flash the XiaoZhi AI firmware.", flashCopy: <>This page writes the complete local merged image from the repository <code>manifest.json</code> for ESP32-S3; it does not use a remote flasher or guessed binary.</>, flashNotes: ["ESP32-S3 target", "Local merged image · offset 0x000000", "115200 baud monitor"],
    guideEyebrow: "Electronics Dokan XiaoZhi guide", guideTitle: "Wire carefully, flash locally, configure once.", guideIntro: "The firmware manifest, hardware checklist, first boot and troubleshooting steps are collected here.", flashSection: "01 · FLASHING", flashHeading: "Use the local XiaoZhi firmware package", flashSteps: ["Use desktop Chrome or Edge with a data-capable USB cable.", "Authorize the ESP32-S3 port and explicitly select the correct port.", "Keep Erase complete flash enabled for a clean install.", "Write the local merged firmware at offset 0x000000 and wait for progress to finish.", "After flashing, reset the board and read the 115200 baud boot log in the serial monitor."], flashCallout: <>The manifest contains one complete merged image. Do not replace it with firmware for another board, and do not claim a successful boot without checking the physical board.</>,
    wiringSection: "02 · HARDWARE & WIRING", wiringHeading: "Use the source board wiring—not a guessed pin map", wiringCopy: <>Match the board-specific wiring to the source documentation before connecting power. No generic ESP32 pin guess is presented here; verify 3.3V logic, common ground and the board's I2S/OLED labels first.</>, wiringRows: [["ESP32-S3", "Source-compatible board · data-capable USB"], ["INMP441", "I2S microphone · voice input"], ["MAX98357A", "I2S mono amplifier · voice output"], ["SSD1306 OLED", "128×64 I2C display · face and pairing"], ["3W 4Ω speaker", "Connect to amplifier speaker output; observe polarity"]], wiringCallout: "Match amplifier, speaker and OLED supply voltage to the board/source documentation. Do not attach motors or other high-current loads to this voice build's power rail.",
    firstBootSection: "03 · FIRST BOOT", firstBootHeading: "Connect the XiaoZhi setup hotspot", firstBootSteps: ["After flashing, watch the serial monitor for boot and Wi-Fi config messages.", "Refresh your phone's Wi-Fi list and look for XiaoZhi-XXXX.", <>Connect to the AP and open <code>http://192.168.4.1</code>.</>, "Select a 2.4GHz router in Wi-Fi Config and save its password; 5GHz-only networks are not supported.", "When the OLED shows a pairing code, pair the device in the XiaoZhi account/console."], firstBootCallout: "If the AP does not appear, check the data cable, correct board, erase-and-flash flow and serial boot log first. If credentials are stale, follow the source-supported BOOT/config procedure.",
    personalizeSection: "04 · ACCOUNT & PERSONA", personalizeHeading: "Pair the assistant and make it yours", personalizeSteps: ["Sign in to XiaoZhi or create an account.", "Use the pairing code shown on the OLED.", "Choose the language, voice and personality.", "Test the microphone and speaker with a short conversation.", "Configure a custom wake word if it is enabled in the source build."],
    commandSection: "05 · VOICE & UPDATES", commandHeading: "Try the assistant", commands: [["What time is it?", "NTP time"], ["What’s my Wi-Fi strength?", "Network diagnostics"], ["Show only your face.", "OLED display mode"], ["Set volume to 50%.", "Audio control"], ["Reboot yourself.", "Remote restart"]], commandCallout: "Keep the board powered during OTA theme or asset updates and do not disconnect USB/power until the update finishes.",
    troubleSection: "06 · TROUBLESHOOTING", troubleHeading: "If the assistant does not flash or boot", troubles: [["No serial port", "Use a data cable, close Arduino/serial tools and try another USB port."], ["Flash fails", "Select the correct ESP32-S3 port, keep erase enabled, retry and hold BOOT while reconnecting if needed."], ["No XiaoZhi AP", "Read the 115200 baud boot log; if the board/application did not boot, flash the local manifest image again."], ["No audio", "Check INMP441 I2S wiring, MAX98357A supply, speaker polarity and common ground."]]
  };
  return <div className="page-wrap project-detail-page xiaozhi-project-page"><div className="container breadcrumb"><button onClick={() => navigate("/")}>{bn ? "হোম" : "Home"}</button><ChevronRight size={14} /><button onClick={() => navigate("/projects")}>{bn ? "প্রজেক্ট" : "Projects"}</button><ChevronRight size={14} /><span>{text.crumb}</span></div>
    <section className="container project-hero"><div className="project-hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> {text.eyebrow}</div><h1>{text.title}</h1><p>{text.hero}</p><div className="project-hero-actions"><button className="button button-primary" onClick={() => document.getElementById("xiaozhi-guide")?.scrollIntoView({ behavior: "smooth" })}>{text.guideButton} <ArrowRight size={16} /></button><button className="button button-ghost-dark" onClick={() => document.getElementById("xiaozhi-flasher")?.scrollIntoView({ behavior: "smooth" })}>{text.flashButton} <ArrowRight size={16} /></button></div></div><div className="project-hero-art"><div className="project-orbit project-orbit-one" /><div className="project-orbit project-orbit-two" /><div className="project-chip"><Cpu size={44} /><span>ESP32-S3</span><small>VOICE / WIFI / AI</small></div><div className="project-art-label project-art-label-one">OLED face</div><div className="project-art-label project-art-label-two">2.4 GHz Wi-Fi</div></div></section>
    <section className="container project-stat-grid"><div><Cpu size={18} /><span><b>{text.controller}</b><small>{text.controllerSmall}</small></span></div><div><Headphones size={18} /><span><b>{text.audio}</b><small>{text.audioSmall}</small></span></div><div><Usb size={18} /><span><b>{text.setup}</b><small>{text.setupSmall}</small></span></div><div><CheckCircle2 size={18} /><span><b>{bn ? "সম্পূর্ণ build guide" : "Complete build guide"}</b><small>{bn ? "Parts, setup ও troubleshooting" : "Parts, setup and troubleshooting"}</small></span></div></section>
    <section className="container project-content-grid"><article className="project-panel"><div className="panel-heading"><h2>{text.overviewTitle}</h2><span>{text.overviewTag}</span></div><p>{text.overview}</p><div className="project-feature-list">{text.features.map((item) => <span key={item}><CheckCircle2 size={15} /> {item}</span>)}</div></article><article className="project-panel project-parts-panel"><div className="panel-heading"><h2>{text.partsTitle}</h2><span>{text.partsTag}</span></div><ul>{text.parts.map((item) => <li key={item}>{item}</li>)}</ul></article></section>
    <ProjectMatchProducts products={products} navigate={navigate} addToCart={addToCart} language={language} matchIds={["inmp441-i2s-mems-microphone-module", "max98357a-i2s-digital-audio-amplifier-module", "ssd1306-096-inch-128x64-i2c-oled-display", "3w-4-ohm-mono-speaker"]} missing={[bn ? "Source-compatible ESP32-S3 board" : "Source-compatible ESP32-S3 board"]} />
    <section id="xiaozhi-flasher" className="container project-flasher"><div className="project-flasher-copy"><div className="eyebrow"><span className="eyebrow-line" /> {text.flashEyebrow}</div><h2>{text.flashTitle}</h2><p>{text.flashCopy}</p><div className="flasher-notes">{text.flashNotes.map((item) => <span key={item}><CheckCircle2 size={15} /> {item}</span>)}</div></div><div className="flasher-card"><XiaozhiFlasher firmwareParts={[{ path: "/firmware/xiaozhi/xiaozhi-pro-esp32-s3-v1.0.0.bin", address: 0x0 }]} firmwareLabel="XiaoZhi AI Pro ESP32-S3 · local merged image" /><small>Local manifest · ESP32-S3 · firmware package v1.0.0</small></div></section>
    <section id="xiaozhi-guide" className="container project-guide"><div className="project-guide-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> {text.guideEyebrow}</div><h2>{text.guideTitle}</h2><p>{text.guideIntro}</p></div><span className="guide-badge">XIAOZHI AI · PRO</span></div><div className="guide-section-grid">
      <article className="guide-section guide-wide"><span className="resource-number">{text.flashSection}</span><h3>{text.flashHeading}</h3><ol>{text.flashSteps.map((item) => <li key={item}>{item}</li>)}</ol><p className="guide-callout">{text.flashCallout}</p></article>
      <article className="guide-section guide-wide"><span className="resource-number">{text.wiringSection}</span><h3>{text.wiringHeading}</h3><p>{text.wiringCopy}</p><div className="guide-table">{text.wiringRows.map(([title, copy]) => <div key={title}><b>{title}</b><span>{copy}</span></div>)}</div><p className="guide-callout">{text.wiringCallout}</p></article>
      <article className="guide-section guide-wide"><span className="resource-number">{text.firstBootSection}</span><h3>{text.firstBootHeading}</h3><ol>{text.firstBootSteps.map((item, index) => <li key={index}>{item}</li>)}</ol><p className="guide-callout">{text.firstBootCallout}</p></article>
      <article className="guide-section"><span className="resource-number">{text.personalizeSection}</span><h3>{text.personalizeHeading}</h3><ol>{text.personalizeSteps.map((item) => <li key={item}>{item}</li>)}</ol></article>
      <article className="guide-section"><span className="resource-number">{text.commandSection}</span><h3>{text.commandHeading}</h3><div className="command-grid">{text.commands.map(([command, copy]) => <span key={command}><code>{command}</code><small>{copy}</small></span>)}</div><p className="guide-callout">{text.commandCallout}</p></article>
      <article className="guide-section guide-wide"><span className="resource-number">{text.troubleSection}</span><h3>{text.troubleHeading}</h3><div className="troubleshooting-grid">{text.troubles.map(([title, copy]) => <span key={title}><b>{title}</b>{copy}</span>)}</div></article>
    </div></section>
  </div>;
}
function ProjectMatchProducts({ products, navigate, addToCart, language, matchIds, missing = [], bundleMode = false }: { products: Product[]; navigate: (path: string) => void; addToCart: (productId: string, qty?: number, variantId?: string, source?: HTMLElement) => void; language: Language; matchIds: string[]; missing?: string[]; bundleMode?: boolean }) {
  const bn = language === "bn";
  const matches = matchIds.map((id) => products.find((product) => product.id === id)).filter(Boolean) as Product[];
  const [selected, setSelected] = useState<Record<string, boolean>>(() => Object.fromEntries(matches.map((product) => [product.id, true])));
  const selectedMatches = matches.filter((product) => selected[product.id]);
  const addPackage = () => {
    selectedMatches.forEach((product) => addToCart(product.id));
    toast.success(`${selectedMatches.length} ${bn ? "টি parts cart-এ যোগ হয়েছে" : "parts added to cart"}`);
  };
  const toggleAll = () => setSelected(Object.fromEntries(matches.map((product) => [product.id, selectedMatches.length !== matches.length])));
  return <section className="container project-shop-section"><div className="project-guide-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> {bn ? "Electronics Dokan parts match" : "Electronics Dokan parts match"}</div><h2>{bn ? "এই project-এর parts এখান থেকে নিন" : "Shop the parts for this build."}</h2><p>{bn ? "সব প্রয়োজনীয় product ডিফল্টভাবে নির্বাচিত থাকে। চাইলে যেকোনো part বাদ দিয়ে আপনার মতো package বানাতে পারবেন।" : "Every matched part starts selected as one build package. Untick anything you already have and customise the package before adding it to your cart."}</p></div><span className="guide-badge">{matches.length} {bn ? "টি match" : "catalogue matches"}</span></div>
    {bundleMode && <div className="project-bundle-toolbar"><label className="project-bundle-toggle"><input type="checkbox" checked={selectedMatches.length === matches.length} onChange={toggleAll} /><span><b>{bn ? "Build package" : "Build package"}</b><small>{selectedMatches.length}/{matches.length} {bn ? "টি selected" : "parts selected"}</small></span></label><button className="button button-primary" onClick={addPackage} disabled={!selectedMatches.length}><ShoppingCart size={16} /> {bn ? "Selected parts cart-এ নিন" : "Add selected package to cart"}</button></div>}
    <div className="project-shop-grid">{matches.map((product) => { const isSelected = selected[product.id] !== false; const isPreOrder = isPreOrderProduct(product); return <article className={`project-shop-card ${bundleMode && isSelected ? "bundle-selected" : ""} ${bundleMode && !isSelected ? "bundle-unselected" : ""}`} key={product.id}>
      <div className="project-shop-select-row">{bundleMode && <label className="project-shop-select"><input type="checkbox" checked={isSelected} onChange={() => setSelected((current) => ({ ...current, [product.id]: !isSelected }))} /><span>{isSelected ? (bn ? "প্যাকেজে আছে" : "Selected") : (bn ? "বাদ দেওয়া" : "Not selected")}</span></label>}<span className={`project-availability ${product.stock ? "ready" : isPreOrder ? "preorder" : "unavailable"}`}>{product.stock ? (bn ? "শিপের জন্য প্রস্তুত" : "Ready to ship") : isPreOrder ? (bn ? "প্রি-অর্ডার" : "Pre-order") : (bn ? "স্টকে নেই" : "Out of stock")}</span></div>
      <button className="project-shop-image" onClick={() => navigate(`/product/${product.slug}`)}><img src={imageFor(product)} alt="" /></button><div className="project-shop-copy"><span>{product.category}</span><h3>{language === "bn" ? product.nameBn || product.name : product.name}</h3><p>{language === "bn" ? product.shortDescriptionBn || product.shortDescription : product.shortDescription}</p><div className="project-shop-actions"><strong>{product.stock ? formatBDT(product.price) : (product.priceDisplay || "Out of stock")}</strong><button className={`button ${product.stock ? "button-primary" : "button-secondary"}`} disabled={!product.stock && !isPreOrder} onClick={(event) => addToCart(product.id, 1, undefined, event.currentTarget)}>{product.stock ? (bn ? "কার্টে নিন" : "Add to cart") : isPreOrder ? (bn ? "প্রি-অর্ডার করুন" : "Pre-order") : (bn ? "স্টকে নেই" : "Out of stock")}</button></div></div></article>; })}</div>{missing.length > 0 && <div className="project-missing-parts"><h3>{bn ? "যেসব exact part এখনো catalogue-এ নেই" : "Exact parts not currently in the catalogue"}</h3><div>{missing.map((item) => <span key={item}>{item}</span>)}</div><button className="text-link" onClick={() => navigate("/contact")}>{bn ? "এই parts-এর stock চাইতে যোগাযোগ করুন" : "Ask us to stock these parts"} <ArrowRight size={15} /></button></div>}</section>;
}
function ChyonRobotProjectPage({ navigate, language, products, addToCart }: { navigate: (path: string) => void; language: Language; products: Product[]; addToCart: (productId: string, qty?: number, variantId?: string, source?: HTMLElement) => void }) {
  const bn = language === "bn";
  const text = bn ? {
    crumb: "Chyon AI Robot", eyebrow: "Chyon AI robotics build", title: <>Voice-controlled <em>4-wheel robot.</em></>, hero: "ESP32-S3 N16R8, USB camera, OLED, voice AI, ultrasonic obstacle guard এবং L298N motor control—একটি সম্পূর্ণ robot project।", guideButton: "Robot guide দেখুন", flashButton: "Robot firmware flash করুন", camera: "USB-UVC camera", cameraSmall: "Native camera/host Type-C port", drive: "Four-wheel drive", driveSmall: "L298N digital motor control", safety: "Obstacle guard", safetySmall: "Forward stop below 25 cm", overviewTitle: "এই project-এ কী আছে", overviewTag: "Source package v2.5.0", overview: "এই source project থেকে build করা merged firmware-এ Chyon AI voice assistant, USB camera, SSD1306 OLED, INMP441 microphone, MAX98357A amplifier এবং চার চাকার robot control একসঙ্গে আছে।", features: ["XiaoZhi MCP-এর মাধ্যমে voice command", "Native USB host-এ camera vision", "8-pixel WS2812 status panel", "1–5 সেকেন্ড সীমিত movement"], partsTitle: "যা যা লাগবে", partsTag: "Build checklist", parts: ["Native USB host-সহ ESP32-S3 N16R8 board", "USB-UVC camera এবং 0.96-inch SSD1306 OLED", "INMP441 microphone + MAX98357A amplifier", "CS100A ultrasonic sensor", "WS2812 ×8 panel + L298N + চারটি BO motor", "আলাদা regulated 5V logic এবং motor battery supply"], flashEyebrow: "Verified complete image", flashTitle: "Chyon AI robot firmware flash করুন।", flashCopy: <>এই page-এ ZIP-এর <code>build/flasher_args.json</code> অনুযায়ী পাঁচটি verified binary exact offset-এ লেখা হবে—partial app বা guessed merged image নয়।</>, flashNotes: ["ESP32-S3 · 16MB flash", "DIO · 80MHz", "Flash-এর পরে reset"], guideEyebrow: "Electronics Dokan robot guide", guideTitle: "সঠিকভাবে wire করুন, একবার flash করুন, ধাপে ধাপে test করুন।", guideIntro: "আপনার ZIP-এর source config, build metadata এবং safety notes এক জায়গায় দেওয়া হলো।", flashSection: "01 · FLASHING", flashHeading: "Exact five-part flash map ব্যবহার করুন", flashSteps: ["Data-capable USB cable-সহ desktop Chrome বা Edge ব্যবহার করুন।", "ESP32-S3 port authorize করে Electronics Dokan-এর port select করুন।", "Erase complete flash এবং Reset board after flash চালু রাখুন।", "16MB / DIO / 80MHz settings-এ exact five-part flash map লিখুন।", "‘Flash complete · board ready’ দেখা পর্যন্ত অপেক্ষা করে 115200 baud boot log পড়ুন।"], flashCallout: <>শুধু <code>xiaozhi.bin</code> flash করবেন না। Source manifest-এ bootloader, app, partition table, OTA data এবং assets আলাদা offset-এ আছে; এই page exact পাঁচটি file original offset-এ লিখবে।</>, diagramSection: "02 · CIRCUIT DIAGRAM", diagramHeading: "Chyon board source অনুযায়ী exact wiring", diagramCopy: <>এই diagram-টি ZIP-এর <code>config.h</code>, board implementation এবং audio/display initialization থেকে তৈরি। লাল power line-এ motor battery সরাসরি ESP32-তে দেবেন না।</>, echoCallout: <>CS100A Echo অবশ্যই voltage divider দিয়ে GPIO2-এ দিন: sensor Echo → 10kΩ → GPIO2, GPIO2 → 20kΩ → GND। Echo-তে সরাসরি 5V দিলে ESP32-S3 নষ্ট হতে পারে।</>, audioSection: "03 · AUDIO & DISPLAY", audioHeading: "Core voice hardware", audioRows: [["INMP441", "WS GPIO4 · SCK GPIO5 · DIN GPIO6"], ["MAX98357A", "DOUT GPIO7 · BCLK GPIO15 · LRCK GPIO18"], ["SSD1306 OLED", "I2C SDA GPIO40 · SCL GPIO42 · 128×64"], ["Camera", "Native USB D− GPIO19 · D+ GPIO20 · 5V host port"]], robotSection: "04 · ROBOT CONTROL", robotHeading: "Motor, sensor এবং LED pins", robotRows: [["CS100A", "TRIG → GPIO1 · ECHO → GPIO2 through 10kΩ/20kΩ divider"], ["WS2812 ×8", "DIN → GPIO3 · 5V external supply · common GND"], ["L298N ENA/ENB", "ENA → GPIO8 · ENB → GPIO13"], ["L298N direction", "IN1 → GPIO9 · IN2 → GPIO10 · IN3 → GPIO11 · IN4 → GPIO12"], ["Motor safety", "25cm-এর কম হলে forward blocked; movement সর্বোচ্চ 5 সেকেন্ড"]], powerSection: "05 · POWER & SAFE TEST", powerHeading: "ধাপে ধাপে robot চালু করুন", powerSteps: ["Motor battery ছাড়া ESP32, OLED, microphone, amplifier এবং camera boot করুন।", "Serial boot output এবং Chyon AI-XXXX setup AP নিশ্চিত করুন।", "Echo voltage divider বসান; GPIO2 5V tolerant নয়।", "সম্ভব হলে WS2812-এ level shifter এবং 470–1000µF capacitor দিন।", "L298N-এর motor power আলাদা রাখুন; সব ground common করুন।", "Forward/backward/left/right test-এর সময় wheel মাটি থেকে তুলে রাখুন।"], powerCallout: "Camera, amplifier, LED এবং motor brownout ঘটাতে পারে। Logic/audio/camera-র জন্য প্রায় 2A regulated 5V এবং L298N-এর জন্য আলাদা motor battery ব্যবহার করুন।", wifiSection: "06 · WI-FI FIRST BOOT", wifiHeading: "Wi-Fi network কোথায় পাবেন?", wifiIntro: <>এই firmware-এর setup AP হলো <b>Chyon AI-XXXX</b>—পুরনো XiaoZhi নাম নয়। XXXX হলো board-এর Wi-Fi MAC address-এর শেষ দুই byte; প্রতিটি board-এ নাম আলাদা হতে পারে।</>, wifiSteps: ["Flash শেষ হলে serial monitor-এ WiFi config mode entered বা একই ধরনের message আসা পর্যন্ত অপেক্ষা করুন।", "Phone-এর Wi-Fi list refresh করে Chyon AI-XXXX খুঁজুন। Android-এ Wi-Fi scanning refresh করুন; iPhone-এ Wi-Fi page বন্ধ করে আবার খুলুন।", <>AP-তে connect করে <code>http://192.168.4.1</code> খুলুন; password না থাকলে সরাসরি connect হবে।</>, "Wi-Fi Config-এ 2.4GHz router select করে password save করুন; 5GHz-only network কাজ করবে না।", "আগে ভুল Wi-Fi save থাকলে startup-এর সময় BOOT button একবার চাপুন—source code অনুযায়ী config mode আবার শুরু হবে।"], wifiCallout: <>AP একেবারেই না দেখা গেলে serial monitor-এ boot log দেখুন। <code>ChyonS3Robot</code>, OLED initialization এবং Wi-Fi config log না এলে application boot করেনি; erase complete flash, data cable এবং যথেষ্ট 5V power দিয়ে আবার চেষ্টা করুন।</>, commandSection: "07 · AI COMMANDS", commandHeading: "Available robot tools", commands: [["self.robot.move", "forward, backward, left, right"], ["self.robot.stop", "চারটি motor সঙ্গে সঙ্গে stop"], ["self.robot.get_distance", "distance cm-এ পড়ুন"], ["self.robot.set_led", "সব 8টি RGB pixel set করুন"]], troubleSection: "08 · TROUBLESHOOTING", troubleHeading: "Robot boot না করলে", troubles: [["No flash", "Arduino/serial tools বন্ধ করে correct port authorize করুন এবং reconnect-এর সময় BOOT ধরে রাখুন।"], ["No Wi-Fi AP", "Chyon AI-XXXX খুঁজুন; serial monitor-এ config mode log না এলে erase করে আবার flash করুন।"], ["No camera", "UART-only port নয়—native USB host/camera Type-C port ব্যবহার করুন।"], ["Brownout/reset", "Motor power আলাদা করুন, 5V wiring ছোট করুন এবং amplifier/LED current পরীক্ষা করুন।"]]
  } : {
    crumb: "Chyon AI Robot", eyebrow: "Chyon AI robotics build", title: <>Voice-controlled <em>4-wheel robot.</em></>, hero: "A complete Chyon AI robot built around an ESP32-S3 N16R8 with USB-UVC camera, OLED, voice AI, ultrasonic obstacle protection and four-wheel L298N control.", guideButton: "Read robot guide", flashButton: "Flash robot firmware", camera: "USB-UVC camera", cameraSmall: "Native camera/host Type-C port", drive: "Four-wheel drive", driveSmall: "L298N digital motor control", safety: "Obstacle guard", safetySmall: "Forward stop below 25 cm", overviewTitle: "What this project includes", overviewTag: "Source package v2.5.0", overview: "The supplied source project combines the Chyon AI voice assistant, USB-UVC camera, SSD1306 OLED, INMP441 microphone, MAX98357A amplifier and four-wheel robot control in one firmware image.", features: ["Voice commands through XiaoZhi MCP", "Camera vision on native USB host", "8-pixel WS2812 status panel", "Bounded 1–5 second movement"], partsTitle: "Required hardware", partsTag: "Build checklist", parts: ["ESP32-S3 N16R8 board with native USB host", "USB-UVC camera and 0.96-inch SSD1306 OLED", "INMP441 microphone + MAX98357A amplifier", "CS100A ultrasonic sensor", "WS2812 ×8 panel + L298N + four BO motors", "Separate regulated 5V logic and motor battery supply"], flashEyebrow: "Verified complete image", flashTitle: "Flash the Chyon AI robot firmware.", flashCopy: <>This page uses the ZIP's exact five-file <code>build/flasher_args.json</code> map—not a partial app binary or guessed merged image—and writes every artifact at its original ESP-IDF offset.</>, flashNotes: ["ESP32-S3 · 16MB flash", "DIO · 80MHz", "Reset after flash"], guideEyebrow: "Electronics Dokan robot guide", guideTitle: "Wire safely, flash once, test in stages.", guideIntro: "The source config, build metadata and safety notes from your ZIP are collected here.", flashSection: "01 · FLASHING", flashHeading: "Use the exact five-part flash map", flashSteps: ["Use desktop Chrome or Edge with a data-capable USB cable.", "Authorize and select the ESP32-S3 port for Electronics Dokan.", "Keep Erase complete flash and Reset board after flash enabled.", "Write the exact five-part flash map using 16MB / DIO / 80MHz settings.", "Wait for ‘Flash complete · board ready’, then read the boot log at 115200 baud."], flashCallout: <>Do not flash <code>xiaozhi.bin</code> alone. The source manifest places bootloader, app, partition table, OTA data and assets at different offsets; this page writes all five files at their original offsets.</>, diagramSection: "02 · CIRCUIT DIAGRAM", diagramHeading: "Exact wiring from the Chyon board source", diagramCopy: <>This diagram is derived from the ZIP's <code>config.h</code>, board implementation and audio/display initialization. Never connect the motor battery directly to the ESP32.</>, echoCallout: <>Connect CS100A Echo through a voltage divider: sensor Echo → 10kΩ → GPIO2, GPIO2 → 20kΩ → GND. Do not put 5V directly into an ESP32-S3 GPIO.</>, audioSection: "03 · AUDIO & DISPLAY", audioHeading: "Core voice hardware", audioRows: [["INMP441", "WS GPIO4 · SCK GPIO5 · DIN GPIO6"], ["MAX98357A", "DOUT GPIO7 · BCLK GPIO15 · LRCK GPIO18"], ["SSD1306 OLED", "I2C SDA GPIO40 · SCL GPIO42 · 128×64"], ["Camera", "Native USB D− GPIO19 · D+ GPIO20 · 5V host port"]], robotSection: "04 · ROBOT CONTROL", robotHeading: "Motor, sensor and LED pins", robotRows: [["CS100A", "TRIG → GPIO1 · ECHO → GPIO2 through 10kΩ/20kΩ divider"], ["WS2812 ×8", "DIN → GPIO3 · 5V external supply · common GND"], ["L298N ENA/ENB", "ENA → GPIO8 · ENB → GPIO13"], ["L298N direction", "IN1 → GPIO9 · IN2 → GPIO10 · IN3 → GPIO11 · IN4 → GPIO12"], ["Motor safety", "Forward blocked below 25cm; movement max 5 seconds"]], powerSection: "05 · POWER & SAFE TEST", powerHeading: "Bring the robot up in stages", powerSteps: ["Boot the ESP32, OLED, microphone, amplifier and camera without motor battery.", "Confirm serial boot output and the Chyon AI-XXXX setup AP.", "Install the Echo voltage divider; GPIO2 is not 5V tolerant.", "Use a level shifter for WS2812 where possible and add a 470–1000µF capacitor.", "Use separate motor power for L298N; keep all grounds common.", "Lift the wheels before testing forward, backward, left and right."], powerCallout: "A camera, amplifier, LEDs and motors can cause brownouts. Use regulated 5V around 2A for logic/audio/camera and a separate motor battery for L298N.", wifiSection: "06 · WI-FI FIRST BOOT", wifiHeading: "Where is the Wi-Fi network?", wifiIntro: <>This firmware's setup AP is <b>Chyon AI-XXXX</b>—not the old XiaoZhi name. XXXX is the last two bytes of the board Wi-Fi MAC address, so each board can have a different suffix.</>, wifiSteps: ["After flashing, wait for WiFi config mode entered or a similar config message in the serial monitor.", "Refresh the phone Wi-Fi list and look for Chyon AI-XXXX. Refresh Wi-Fi scanning on Android; close and reopen the Wi-Fi page on iPhone.", <>Connect to the AP and open <code>http://192.168.4.1</code>; no password is required.</>, "In Wi-Fi Config, select a 2.4GHz router and save its password; 5GHz-only networks will not work.", "If old credentials were saved, press BOOT once during startup; the source enters config mode again."], wifiCallout: <>If the AP never appears, read the boot log first. If <code>ChyonS3Robot</code>, OLED initialization and Wi-Fi config logs are absent, the application did not boot; erase completely and retry with a data cable and adequate 5V power.</>, commandSection: "07 · AI COMMANDS", commandHeading: "Available robot tools", commands: [["self.robot.move", "forward, backward, left, right"], ["self.robot.stop", "stop all four motors"], ["self.robot.get_distance", "read distance in cm"], ["self.robot.set_led", "set all 8 RGB pixels"]], troubleSection: "08 · TROUBLESHOOTING", troubleHeading: "If the robot does not boot", troubles: [["No flash", "Close Arduino/serial tools, authorize the correct port and hold BOOT while reconnecting."], ["No Wi-Fi AP", "Look for Chyon AI-XXXX; if config mode is absent in serial, erase and flash again."], ["No camera", "Use the native USB host/camera Type-C port, not the UART-only port."], ["Brownout/reset", "Separate motor power, shorten 5V wiring and check amplifier/LED current."]]
  };
  return <div className="page-wrap project-detail-page robot-project-page"><div className="container breadcrumb"><button onClick={() => navigate("/")}>{bn ? "হোম" : "Home"}</button><ChevronRight size={14} /><button onClick={() => navigate("/projects")}>{bn ? "প্রজেক্ট" : "Projects"}</button><ChevronRight size={14} /><span>{text.crumb}</span></div>
    <section className="container project-hero"><div className="project-hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> {text.eyebrow}</div><h1>{text.title}</h1><p>{text.hero}</p><div className="project-hero-actions"><button className="button button-primary" onClick={() => document.getElementById("robot-guide")?.scrollIntoView({ behavior: "smooth" })}>{text.guideButton} <ArrowRight size={16} /></button><button className="button button-ghost-dark" onClick={() => document.getElementById("robot-flasher")?.scrollIntoView({ behavior: "smooth" })}>{text.flashButton} <ArrowRight size={16} /></button></div></div><div className="project-hero-art"><div className="project-orbit project-orbit-one" /><div className="project-orbit project-orbit-two" /><div className="project-chip"><Cpu size={44} /><span>ESP32-S3</span><small>CAMERA / AI / ROBOT</small></div><div className="project-art-label project-art-label-one">4-wheel drive</div><div className="project-art-label project-art-label-two">25 cm safety stop</div></div></section>
    <section className="container project-stat-grid"><div><Cpu size={18} /><span><b>ESP32-S3 N16R8</b><small>16MB flash · octal PSRAM</small></span></div><div><Cpu size={18} /><span><b>{text.camera}</b><small>{text.cameraSmall}</small></span></div><div><Cpu size={18} /><span><b>{text.drive}</b><small>{text.driveSmall}</small></span></div><div><CheckCircle2 size={18} /><span><b>{text.safety}</b><small>{text.safetySmall}</small></span></div></section>
    <section className="container project-content-grid"><article className="project-panel"><div className="panel-heading"><h2>{text.overviewTitle}</h2><span>{text.overviewTag}</span></div><p>{text.overview}</p><div className="project-feature-list">{text.features.map((item) => <span key={item}><CheckCircle2 size={15} /> {item}</span>)}</div></article><article className="project-panel project-parts-panel"><div className="panel-heading"><h2>{text.partsTitle}</h2><span>{text.partsTag}</span></div><ul>{text.parts.map((item) => <li key={item}>{item}</li>)}</ul></article></section>
    <ProjectMatchProducts products={products} navigate={navigate} addToCart={addToCart} language={language} matchIds={["max98357a-i2s-digital-audio-amplifier-module", "chyon-esp32-s3-n16r8-uvc-oled-custom-board", "inmp441-i2s-mems-microphone-module", "ssd1306-096-inch-128x64-i2c-oled-display", "cs100a-ultrasonic-distance-sensor", "l298n-dual-h-bridge-motor-driver-module", "ws2812-8-pixel-rgb-led-panel", "bo-motor-four-wheel-robot-set", "usb-uvc-camera-module-native-usb-host", "3w-4-ohm-mono-speaker"]} missing={[]} bundleMode />
    <section id="robot-flasher" className="container project-flasher"><div className="project-flasher-copy"><div className="eyebrow"><span className="eyebrow-line" /> {text.flashEyebrow}</div><h2>{text.flashTitle}</h2><p>{text.flashCopy}</p><div className="flasher-notes">{text.flashNotes.map((item) => <span key={item}><CheckCircle2 size={15} /> {item}</span>)}</div></div><div className="flasher-card"><XiaozhiFlasher firmwareParts={[{ path: "/firmware/chyon-robot/bootloader.bin", address: 0x0 }, { path: "/firmware/chyon-robot/partition-table.bin", address: 0x8000 }, { path: "/firmware/chyon-robot/ota_data_initial.bin", address: 0xd000 }, { path: "/firmware/chyon-robot/xiaozhi.bin", address: 0x20000 }, { path: "/firmware/chyon-robot/generated_assets.bin", address: 0x800000 }]} flashFreq="80m" flashSize="16MB" firmwareLabel={bn ? "Chyon AI robot firmware · exact 5-part map" : "Chyon AI robot firmware · exact 5-part map"} /><small>Exact 5-part ESP-IDF map · ESP32-S3 N16R8 · v2.5.0</small></div></section>
    <section id="robot-guide" className="container project-guide"><div className="project-guide-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> {text.guideEyebrow}</div><h2>{text.guideTitle}</h2><p>{text.guideIntro}</p></div><span className="guide-badge">CHYON AI · ROBOT</span></div><div className="guide-section-grid">
      <article className="guide-section guide-wide"><span className="resource-number">{text.flashSection}</span><h3>{text.flashHeading}</h3><ol>{text.flashSteps.map((item) => <li key={item}>{item}</li>)}</ol><p className="guide-callout">{text.flashCallout}</p></article>
      <article className="guide-section guide-wide robot-diagram-section"><span className="resource-number">{text.diagramSection}</span><h3>{text.diagramHeading}</h3><p>{text.diagramCopy}</p><img className="robot-wiring-diagram" src="/diagrams/chyon-ai-robot-wiring.png" alt={bn ? "Chyon AI ESP32-S3 চার চাকার robot wiring diagram" : "Chyon AI ESP32-S3 four-wheel robot wiring diagram"} /><p className="guide-callout">{text.echoCallout}</p></article>
      <article className="guide-section"><span className="resource-number">{text.audioSection}</span><h3>{text.audioHeading}</h3><div className="guide-table">{text.audioRows.map(([title, copy]) => <div key={title}><b>{title}</b><span>{copy}</span></div>)}</div></article>
      <article className="guide-section"><span className="resource-number">{text.robotSection}</span><h3>{text.robotHeading}</h3><div className="guide-table">{text.robotRows.map(([title, copy]) => <div key={title}><b>{title}</b><span>{copy}</span></div>)}</div></article>
      <article className="guide-section guide-wide"><span className="resource-number">{text.powerSection}</span><h3>{text.powerHeading}</h3><ol>{text.powerSteps.map((item) => <li key={item}>{item}</li>)}</ol><p className="guide-callout">{text.powerCallout}</p></article>
      <article className="guide-section guide-wide"><span className="resource-number">{text.wifiSection}</span><h3>{text.wifiHeading}</h3><p>{text.wifiIntro}</p><ol>{text.wifiSteps.map((item, index) => <li key={index}>{item}</li>)}</ol><p className="guide-callout">{text.wifiCallout}</p></article>
      <article className="guide-section"><span className="resource-number">{text.commandSection}</span><h3>{text.commandHeading}</h3><div className="command-grid">{text.commands.map(([command, copy]) => <span key={command}><code>{command}</code><small>{copy}</small></span>)}</div></article>
      <article className="guide-section"><span className="resource-number">{text.troubleSection}</span><h3>{text.troubleHeading}</h3><div className="troubleshooting-grid">{text.troubles.map(([title, copy]) => <span key={title}><b>{title}</b>{copy}</span>)}</div></article>
    </div></section>
  </div>;
}
function CategoriesPage({ products, navigate }: { products: Product[]; navigate: (path: string) => void }) {
  const categories = Array.from(new Set(products.map((product) => product.category))).sort();
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><span>All categories</span></div><div className="container page-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> Browse the catalogue</div><h1>All categories</h1><p>Explore every product category in the Electronics Dokan catalogue.</p></div><span className="result-count">{categories.length} categories</span></div><section className="container catalogue-card-grid">{categories.map((category, index) => <button key={category} className={`catalogue-card catalogue-card-${index % 4}`} onClick={() => navigate(`/products?category=${encodeURIComponent(category)}`)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{category}</strong><small>{products.filter((product) => product.category === category).length} products <ArrowRight size={13} /></small></button>)}</section></div>;
}

function BrandsPage({ brands, products, navigate }: { brands: Brand[]; products: Product[]; navigate: (path: string) => void }) {
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><span>All brands</span></div><div className="container page-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> Trusted manufacturers</div><h1>All brands</h1><p>Browse brands available for future product assignment and catalogue filtering.</p></div><span className="result-count">{brands.length} brands</span></div><section className="container brand-catalogue-grid">{brands.map((brand) => { const count = products.filter((product) => product.brand === brand.name).length; return <button key={brand.slug} className="brand-catalogue-card" onClick={() => navigate(`/products?brand=${encodeURIComponent(brand.name)}`)}><span className="brand-logo-slot"><img src={brand.image} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></span><strong>{brand.name}</strong><small>{count ? `${count} products` : "No products assigned"} <ArrowRight size={13} /></small></button>; })}</section></div>;
}

function HomePage({ products, site, brands, navigate, addToCart }: { products: Product[]; site: SiteConfig; brands: Brand[]; navigate: (path: string) => void; addToCart: (id: string, qty?: number) => void }) {
  const categories = Array.from(new Set(products.map((product) => product.category))).sort();
  const topSelling = useMemo(() => products.filter((product) => product.featured), [products]);
  const preOrder = products.filter(isPreOrderProduct);
  const newArrivals = products.filter((product) => product.newArrival);
  const trending = products.filter((product) => product.trending);
  const backInStock = products.filter(isBackInStockProduct);
  const seasonal = products.filter(isSeasonalProduct);
  const productBrands = Array.from(new Set(products.map((product) => product.brand).filter((brand) => brand && brand !== "Not specified"))).slice(0, 8);
  const shelf = (eyebrow: string, title: string, items: Product[], action: string, query: string) => <section className="reference-shelf container"><SectionHeading eyebrow={eyebrow} title={title} action={action} onAction={() => navigate(`/products?${query}`)} /><div className="shelf-track">{items.map((product) => <ProductCard key={product.id} product={product} navigate={navigate} addToCart={addToCart} />)}</div></section>;
  const banners = site.heroBanners?.length ? site.heroBanners : ["/images/home/hero-banner.webp"];
  const [activeBanner, setActiveBanner] = useState(0);
  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => setActiveBanner((current) => (current + 1) % banners.length), Math.max(3000, site.heroIntervalMs || 5000));
    return () => window.clearInterval(timer);
  }, [banners.length, site.heroIntervalMs]);
  return <div className="reference-home">
    <section className="reference-hero focused-banner"><div className="focused-banner-slides">{banners.map((banner, index) => <img key={`${banner}-${index}`} className={`focused-banner-slide ${index === activeBanner ? "is-active" : ""}`} src={banner} alt={`Electronics Dokan banner ${index + 1}`} onError={(event) => { event.currentTarget.style.display = "none"; }} />)}</div>{banners.length > 1 && <><button className="focused-banner-arrow focused-banner-arrow-left" onClick={() => setActiveBanner((activeBanner - 1 + banners.length) % banners.length)} aria-label="Previous banner"><ChevronLeft size={20} /></button><button className="focused-banner-arrow focused-banner-arrow-right" onClick={() => setActiveBanner((activeBanner + 1) % banners.length)} aria-label="Next banner"><ChevronRight size={20} /></button><div className="focused-banner-dots">{banners.map((banner, index) => <button key={`${banner}-dot`} className={index === activeBanner ? "is-active" : ""} onClick={() => setActiveBanner(index)} aria-label={`Show banner ${index + 1}`} />)}</div></>}</section>
    <div className="focused-banner-actions container"><button className="button button-primary" onClick={() => navigate('/products')}>Shop all products <ArrowRight size={17} /></button><button className="button button-light" onClick={() => navigate("/projects")}><ArrowRight size={17} /> Show all projects</button></div>
    <div className="focused-banner-stats container"><span><BadgeCheck size={15} /> {products.length} catalogue items</span><span><ShoppingBag size={15} /> {categories.length} categories</span><span><Truck size={15} /> Nationwide delivery</span><span><MessageCircle size={15} /> WhatsApp ordering</span></div>
    <div className="container promise-strip reference-promises"><div><span className="promise-icon"><Truck size={18} /></span><span><b>Delivery across Bangladesh</b><small>Bangladesh Post Office & Steadfast</small></span></div><div><span className="promise-icon"><BadgeCheck size={18} /></span><span><b>Quality checked products</b><small>Useful parts for real projects</small></span></div><div><span className="promise-icon"><ShoppingBag size={18} /></span><span><b>Guest checkout</b><small>No account required</small></span></div><div><span className="promise-icon"><MessageCircle size={18} /></span><span><b>Human support</b><small>From Phultala, Khulna</small></span></div></div>
    {topSelling.length > 0 && shelf("Popular with builders", "Top Selling 🏆", topSelling, "View top sellers", "sort=top-selling")}
    {newArrivals.length > 0 && shelf("Fresh on the bench", "New Arrivals 🆕", newArrivals, "View new arrivals", "sort=new")}
    {backInStock.length > 0 && shelf("Recently available", "Back in Stock 🔄", backInStock, "View available products", "sort=back")}
    <section className="reference-category-band"><div className="container"><SectionHeading eyebrow="Browse the catalogue" title="Popular categories" action="View all categories" onAction={() => navigate('/categories')} /><CategoryMarquee categories={categories} products={products} navigate={navigate} /></div></section>
    {seasonal.length > 0 && shelf("Seasonal picks", "Seasonal Products", seasonal, "Shop seasonal picks", "sort=seasonal")}
    {trending.length > 0 && shelf("Trending now", "Trending Now 📈", trending, "Shop trending", "sort=trending")}
    {preOrder.length > 0 && shelf("Made to order", "Pre Order Products", preOrder, "View pre-order", "sort=preorder")}
    <section className="reference-brands section container"><SectionHeading eyebrow="Trusted parts, thoughtfully selected" title="Shop by Brand 🏷" action="View all brands" onAction={() => navigate('/brands')} /><BrandMarquee brands={brands} productBrands={productBrands} navigate={navigate} /></section>
    <section className="reference-about"><div className="container reference-about-grid"><div><div className="eyebrow"><span className="eyebrow-line" /> Electronics Dokan</div><h2>Your local source for <em>better builds.</em></h2></div><div><p>Electronics Dokan is an online electronics shop from Phultala, Khulna. We bring together development boards, modules, sensors, components, tools and test equipment for school projects, prototypes, repairs and everyday maker work.</p><button className="text-link" onClick={() => navigate('/products')}>Explore the catalogue <ArrowRight size={15} /></button></div></div></section>
    <section className="reference-service-strip"><div className="container reference-service-grid"><div><BadgeCheck size={20} /><strong>Carefully selected</strong><span>Practical parts, clear pricing</span></div><div><Truck size={20} /><strong>Delivery nationwide</strong><span>Fixed courier options at checkout</span></div><div><MessageCircle size={20} /><strong>WhatsApp support</strong><span>Get help before you order</span></div><div><Zap size={20} /><strong>Build with confidence</strong><span>Beginner-friendly catalogue</span></div></div></section>
  </div>;
}
function categoryImagePath(category: string) { return `/images/categories/${category.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.webp`; }
function CircuitIcon({ index }: { index: number }) { const icons = [<><circle cx="32" cy="32" r="18" /><path d="M14 32h-7M50 32h7M32 14V7M32 50v7" /><circle cx="32" cy="32" r="5" /></>, <><rect x="13" y="13" width="38" height="38" rx="4" /><path d="M20 7v6M28 7v6M36 7v6M44 7v6M20 51v6M28 51v6M36 51v6M44 51v6" /><circle cx="32" cy="32" r="8" /></>, <><path d="M11 42V22l21-11 21 11v20L32 53z" /><path d="M22 37h20M22 29h20M32 11v42" /></>, <><path d="M8 42h48M13 42V24h38v18M20 24V13h24v11M28 13v-6h8v6" /><circle cx="22" cy="33" r="3" /><circle cx="42" cy="33" r="3" /></>]; return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icons[index % icons.length]}</svg>; }
function ArrowUpRight() { return <ArrowRight size={15} className="arrow-diagonal" />; }

function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) { return <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> {eyebrow}</div><h2>{title}</h2></div>{action && <button className="text-link" onClick={onAction}>{action} <ArrowRight size={15} /></button>}</div>; }

function AutoScrollRow({ children, className, label }: { children: ReactNode; className: string; label: string }) { const row = useRef<HTMLDivElement>(null); const drag = useRef({ x: 0, scroll: 0 }); const [dragging, setDragging] = useState(false); const startDrag = (event: React.PointerEvent<HTMLDivElement>) => { if (!row.current) return; drag.current = { x: event.clientX, scroll: row.current.scrollLeft }; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); }; const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => { if (!dragging || !row.current) return; row.current.scrollLeft = drag.current.scroll - (event.clientX - drag.current.x) * 1.8; }; const endDrag = (event: React.PointerEvent<HTMLDivElement>) => { setDragging(false); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }; return <div ref={row} className={`${className} ${dragging ? "is-dragging" : ""}`} aria-label={label} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><div className={`${className}-track`}>{children}<div aria-hidden="true" className="marquee-copy">{children}</div></div></div>; }

function CategoryMarquee({ categories, products, navigate }: { categories: string[]; products: Product[]; navigate: (path: string) => void }) { const items = categories.slice(0, 8).map((category, index) => <button key={category} className={`reference-category reference-category-${index % 4}`} onClick={() => navigate(`/products?category=${encodeURIComponent(category)}`)}><span className="category-index">{String(index + 1).padStart(2, "0")}</span><span className="category-art"><img src={categoryImagePath(category)} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /><CircuitIcon index={index} /></span><strong>{category}</strong><small>{products.filter((product) => product.category === category).length} products <ArrowRight size={13} /></small></button>); return <AutoScrollRow className="category-marquee" label="Popular categories">{items}</AutoScrollRow>; }

function BrandMarquee({ brands, productBrands, navigate }: { brands: Brand[]; productBrands: string[]; navigate: (path: string) => void }) { const source = brands.length ? brands.slice(0, 8) : productBrands.map((name) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), image: "" })); const items = source.map((brand, index) => <button key={brand.slug} onClick={() => navigate(`/products?brand=${encodeURIComponent(brand.name)}`)}><span className="brand-marquee-image"><img src={brand.image} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /><Zap size={16} /></span><strong>{brand.name}</strong><ArrowRight size={15} className="arrow-diagonal" /></button>); return <AutoScrollRow className="brand-marquee" label="Shop by brand">{items}</AutoScrollRow>; }

function ProductGrid({ products, navigate, addToCart }: { products: Product[]; navigate: (path: string) => void; addToCart: (id: string, qty?: number) => void }) { return products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} navigate={navigate} addToCart={addToCart} />)}</div> : <EmptyState title="No products here yet" copy="Check back soon for fresh stock." />; }
function ProductCard({ product, navigate, addToCart }: { product: Product; navigate: (path: string) => void; addToCart: (id: string, qty?: number, variantId?: string, source?: HTMLElement) => void }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const hasVariants = product.variants?.length > 0;
  const src = imageFor(product);
  return <>
    <article className="product-card"><button className="product-image-wrap" onClick={() => navigate(`/product/${product.slug}`)} aria-label={`View ${localizedProductName(product)}`}><div className="product-image-bg" /><img src={src} alt={localizedProductName(product)} loading="lazy" onError={(event) => { console.warn(`[Electronics Dokan] Missing image: ${src}`); event.currentTarget.src = "/images/placeholders/product-placeholder.webp"; }} /><span className="image-view">View details <ArrowUpRight /></span></button><button type="button" className="quick-view-button" onClick={() => setQuickViewOpen(true)} aria-label={`Quick view ${localizedProductName(product)}`}><Eye size={15} /><span>Quick view</span></button><div className="product-card-body"><div className="product-meta"><span>{product.brand && product.brand !== "Not specified" ? product.brand : "Brand not selected"}</span><span className={product.stock ? "stock-in" : "stock-out"}><i />{product.stock ? (hasVariants ? `${product.variants.length} variants` : "In stock") : (isPreOrderProduct(product) ? "Pre-order" : "Out of stock")}</span></div><button className="product-name" onClick={() => navigate(`/product/${product.slug}`)}>{localizedProductName(product)}</button><p className="product-short">{localizedShortDescription(product)}</p><div className="product-bottom"><div className="price-wrap"><strong>{!product.stock ? (product.priceDisplay || "Out of stock") : hasVariants ? `Starting from ${formatBDT(productPrice(product))}` : formatBDT(product.price)}</strong>{hasVariants && <small className="unit-label">{priceUnitLabel(product.variants[0]?.priceUnit)}</small>}</div><button className="add-button" onClick={(event) => hasVariants ? navigate(`/product/${product.slug}`) : addToCart(product.id, 1, undefined, event.currentTarget)} disabled={!product.stock} aria-label={hasVariants ? `Choose a variant of ${localizedProductName(product)}` : `Add ${localizedProductName(product)} to cart`}>{hasVariants ? <ArrowRight size={18} /> : <Plus size={18} />}</button></div></div></article>
    {quickViewOpen && <QuickViewModal product={product} navigate={navigate} addToCart={addToCart} onClose={() => setQuickViewOpen(false)} />}
  </>;
}

function QuickViewModal({ product, navigate, addToCart, onClose }: { product: Product; navigate: (path: string) => void; addToCart: (id: string, qty?: number, variantId?: string, source?: HTMLElement) => void; onClose: () => void }) {
  const hasVariants = product.variants?.length > 0;
  const bn = document.documentElement.lang === "bn";
  return <div className="quick-view-modal" role="dialog" aria-modal="true" aria-label={bn ? "দ্রুত product view" : "Quick product view"} onClick={onClose}><div className="quick-view-card" onClick={(event) => event.stopPropagation()}><button type="button" className="quick-view-close" onClick={onClose} aria-label="Close quick view"><X size={18} /></button><div className="quick-view-image"><div className="product-image-bg" /><img src={imageFor(product)} alt={localizedProductName(product)} /></div><div className="quick-view-copy"><span className="eyebrow"><span className="eyebrow-line" /> {bn ? "দ্রুত দেখা" : "Quick view"}</span><h2>{localizedProductName(product)}</h2><p>{localizedShortDescription(product)}</p><strong className="quick-view-price">{product.stock ? (hasVariants ? `Starting from ${formatBDT(productPrice(product))}` : formatBDT(product.price)) : (product.priceDisplay || (bn ? "স্টকে নেই" : "Out of stock"))}</strong>{hasVariants && <small className="quick-view-variants">{product.variants.length} {bn ? "টি variant · detail page-এ নির্বাচন করুন" : "variants · choose on detail page"}</small>}<div className="quick-view-actions"><button type="button" className="button button-light" onClick={() => { onClose(); navigate(`/product/${product.slug}`); }}>{bn ? "বিস্তারিত দেখুন" : "View details"} <ArrowRight size={15} /></button>{!hasVariants && <button type="button" className="button button-primary" disabled={!product.stock} onClick={(event) => { addToCart(product.id, 1, undefined, event.currentTarget); onClose(); }}>{bn ? "কার্টে নিন" : "Add to cart"} <ShoppingCart size={15} /></button>}</div></div></div></div>;
}

function CartFlight({ item }: { item: { image: string; name: string; fromX: number; fromY: number; toX: number; toY: number } }) {
  const style = { "--from-x": `${item.fromX}px`, "--from-y": `${item.fromY}px`, "--to-x": `${item.toX}px`, "--to-y": `${item.toY}px` } as React.CSSProperties;
  return <div className="cart-flight" style={style} aria-hidden="true"><span className="cart-flight-spark">✦</span><img src={item.image} alt="" /><span className="cart-flight-label">{item.name}</span></div>;
}

function ProductsPage({ products, navigate, addToCart }: { products: Product[]; navigate: (path: string) => void; addToCart: (id: string, qty?: number) => void }) {
  const params = new URLSearchParams(window.location.search);
  const search = (params.get("search") || "").toLocaleLowerCase();
  const categoryParam = params.get("category") || "All products";
  const brandParam = params.get("brand") || "";
  const sortParam = params.get("sort") || "all";
  const categories = ["All products", ...Array.from(new Set(products.map((p) => p.category))).sort()];
  const brands = ["All brands", ...Array.from(new Set(products.map((p) => p.brand || "Not specified"))).sort()];
  const filtered = useMemo(() => products.filter((product) => {
    const matchesCategory = categoryParam === "All products" || product.category === categoryParam;
    const matchesBrand = !brandParam || product.brand === brandParam;
    const matchesShelf = sortParam === "top-selling" ? product.featured : sortParam === "new" ? product.newArrival : sortParam === "back" ? isBackInStockProduct(product) : sortParam === "seasonal" ? isSeasonalProduct(product) : sortParam === "trending" ? product.trending : sortParam === "preorder" ? isPreOrderProduct(product) : true;
    return matchesCategory && matchesBrand && matchesShelf && (!search || productSearchText(product).includes(search));
  }).sort((a, b) => sortParam === "price-low" ? a.price - b.price : sortParam === "price-high" ? b.price - a.price : sortParam === "new" ? Number(b.newArrival) - Number(a.newArrival) : sortParam === "top-selling" ? Number(b.featured) - Number(a.featured) : sortParam === "trending" ? Number(b.trending) - Number(a.trending) : sortParam === "deals" ? percentOff(b) - percentOff(a) : 0), [products, search, categoryParam, brandParam, sortParam]);
  const setFilter = (key: string, value: string) => { const next = new URLSearchParams(window.location.search); if (value && value !== "All products" && value !== "all") next.set(key, value); else next.delete(key); navigate(`/products${next.toString() ? `?${next.toString()}` : ""}`); };
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><span>Shop all products</span></div><div className="container page-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> The complete workbench</div><h1>{brandParam || (categoryParam === "All products" ? "All products" : categoryParam)}</h1><p>{search ? <>Showing results for <strong>“{search}”</strong></> : brandParam ? `Products assigned to ${brandParam}.` : "Everything you need to go from first sketch to final build."}</p></div><span className="result-count">{filtered.length} {filtered.length === 1 ? "product" : "products"}</span></div><div className="container shop-layout"><aside className="shop-sidebar"><div className="sidebar-title"><span><SlidersHorizontal size={17} /> Filter by category</span><span className="sidebar-count">{products.length}</span></div>{categories.map((category) => <button key={category} className={categoryParam === category ? "active" : ""} onClick={() => setFilter("category", category)}>{category}<span>{products.filter((p) => category === "All products" || p.category === category).length}</span></button>)}<div className="sidebar-title brand-filter-title"><span><SlidersHorizontal size={17} /> Filter by brand</span><span className="sidebar-count">{brands.length - 1}</span></div>{brands.map((brand) => <button key={brand} className={(!brandParam && brand === "All brands") || brandParam === brand ? "active" : ""} onClick={() => setFilter("brand", brand === "All brands" ? "" : brand)}>{brand}<span>{products.filter((p) => brand === "All brands" ? true : (p.brand || "Not specified") === brand).length}</span></button>)}<div className="sidebar-help"><CircleHelp size={17} /><div><b>Need a hand?</b><p>Message us with your project brief.</p><a href="https://wa.me/8801938640733" target="_blank" rel="noreferrer">Ask on WhatsApp <ArrowRight size={13} /></a></div></div></aside><div className="shop-results"><div className="shop-toolbar"><div className="mobile-filter-label"><Filter size={16} /> {brandParam || categoryParam}</div><span className="toolbar-result">{search ? `Search results · ${filtered.length}` : `${filtered.length} items`}</span><label className="sort-select"><span>Sort by</span><select value={sortParam} onChange={(event) => setFilter("sort", event.target.value)}><option value="all">All products</option><option value="top-selling">Top sellers</option><option value="preorder">Pre-order</option><option value="new">New arrivals</option><option value="back">Back in stock</option><option value="seasonal">Seasonal</option><option value="trending">Trending now</option><option value="deals">Best deals</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select><ChevronDown size={15} /></label></div>{filtered.length ? <div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} navigate={navigate} addToCart={addToCart} />)}</div> : <EmptyState title="No matching products" copy="Try a broader search or browse another category." action="Clear filters" onAction={() => navigate("/products")} />}</div></div></div>;
}

function ProductZoomModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(2);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  const reset = () => { setScale(2); setOffset({ x: 0, y: 0 }); };
  const beginDrag = (event: React.PointerEvent<HTMLImageElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: offset.x, originY: offset.y };
    setDragging(true);
  };
  const moveDrag = (event: React.PointerEvent<HTMLImageElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY });
  };
  const endDrag = (event: React.PointerEvent<HTMLImageElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    setDragging(false);
  };
  return <div className="image-zoom-modal" role="dialog" aria-modal="true" aria-label="Zoomed product image" onClick={onClose}>
    <div className="image-zoom-stage" onClick={(event) => event.stopPropagation()}>
      <div className="image-zoom-toolbar" aria-label="Image zoom controls">
        <button type="button" onClick={() => setScale((value) => Math.max(1, Number((value - .25).toFixed(2))))} aria-label="Zoom out"><Minus size={17} /></button>
        <span>{Math.round(scale * 100)}%</span>
        <button type="button" onClick={() => setScale((value) => Math.min(4, Number((value + .25).toFixed(2))))} aria-label="Zoom in"><Plus size={17} /></button>
        <button type="button" className="image-zoom-reset" onClick={reset}>Reset</button>
      </div>
      <button className="image-zoom-close" type="button" onClick={onClose} aria-label="Close zoomed image"><X size={20} /></button>
      <div className={`image-zoom-viewport ${dragging ? "is-dragging" : ""}`}>
        <img src={src} alt={alt} draggable={false} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})` }} />
      </div>
      <small className="image-zoom-hint">Drag to inspect · pinch or use + / − to zoom</small>
    </div>
  </div>;
}

function ProductPage({ products, navigate, addToCart }: { products: Product[]; navigate: (path: string) => void; addToCart: (id: string, qty?: number, variantId?: string, source?: HTMLElement) => void }) {
  const slug = window.location.pathname.split("/").pop();
  const product = products.find((item) => item.slug === slug);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(product?.variants?.[0]?.variantId || "");
  const [quantity, setQuantity] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  if (!product) return <NotFoundPage navigate={navigate} />;
  const selected = product.variants?.find((v) => v.variantId === selectedId);
  const visible = (product.variants || []).filter((v) => [v.displayName, v.resistance, v.capacitance, v.voltage, v.powerRating, v.tolerance, v.marking].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase()));
  const maxQty = selected ? (selected.priceUnit === "per_2_pieces" ? Math.floor(selected.stockQuantity / 2) : selected.stockQuantity) : 999;
  const unit = selected?.priceUnit;
  const src = imageFor(product, selectedId);
  const related = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4);
  const askMessage = `Hello Electronics Dokan, I have a question about:
${localizedProductName(product)}${selected ? ` — ${selected.displayName}` : ""}`;
  const buyNow = () => { addToCart(product.id, quantity, selectedId || undefined); navigate("/checkout"); };
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><button onClick={() => navigate(`/products?category=${encodeURIComponent(product.category)}`)}>{product.category}</button><ChevronRight size={14} /><span>{localizedProductName(product)}</span></div><section className="container product-detail"><div className="gallery"><div className="gallery-main"><div className="product-image-bg" /><img src={src} alt={`${localizedProductName(product)}${selected ? ` — ${selected.displayName}` : ""}`} onError={(event) => { console.warn(`[Electronics Dokan] Missing image: ${src}`); event.currentTarget.src = "/images/placeholders/product-placeholder.webp"; }} /><button className="image-zoom-control" type="button" onClick={() => setZoomOpen(true)} aria-label="Magnify product image" title="Zoom product image"><Search size={18} /></button>{zoomOpen && <ProductZoomModal src={src} alt={`${localizedProductName(product)} enlarged`} onClose={() => setZoomOpen(false)} />}</div></div><div className="detail-copy"><div className="product-meta"><span>{product.category} · {product.sku || product.id}</span><span className={product.stock ? "stock-in" : "stock-out"}><i /> {product.stockStatus || (product.stock ? "Available to order" : "Out of stock")}</span></div><h1>{localizedProductName(product)}</h1><p className="sku">SKU: <strong>{product.sku || "Not specified"}</strong> · {product.variants?.length || 0} selectable variants</p><div className="detail-price"><strong>{product.stock ? formatBDT(selected?.price ?? productPrice(product)) : (product.priceDisplay || "Out of stock")}</strong>{product.stock && <span className="unit-label">{priceUnitLabel(unit)}</span>}{!selected && product.stock && product.variants?.length > 0 && <small>Starting price</small>}</div><p className="detail-description">{localizedDescription(product)}</p>{product.variants?.length > 0 && <div className="variant-panel"><div className="variant-heading"><div><b>Choose a value or rating</b><small>{visible.length} of {product.variants.length} variants · duplicate source rows are preserved</small></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search value..." aria-label="Search variants" /></div><div className="variant-list">{visible.map((variant) => <button key={variant.variantId} className={`variant-option ${selectedId === variant.variantId ? "active" : ""}`} onClick={() => { setSelectedId(variant.variantId); setQuantity(1); }}><span><strong>{variant.displayName}</strong><small>{variant.resistance || variant.capacitance || variant.marking || ""}{variant.powerRating ? ` · ${variant.powerRating}` : ""}{variant.tolerance ? ` · ${variant.tolerance}` : ""}</small></span><span><b>{formatBDT(variant.price)}</b><small>{priceUnitLabel(variant.priceUnit)} · {variant.stockQuantity} pcs</small></span></button>)}</div></div>}<div className="detail-rule" /><div className="detail-actions"><div className="quantity-control"><button disabled={!product.stock} onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={15} /></button><b>{quantity}</b><button onClick={() => setQuantity(Math.min(maxQty, quantity + 1))} disabled={!product.stock || quantity >= maxQty}><Plus size={15} /></button></div><button className="button button-secondary" disabled={!product.stock || Boolean(product.variants?.length && !selected)} onClick={(event) => addToCart(product.id, quantity, selectedId || undefined, event.currentTarget)}><ShoppingCart size={17} /> Add to cart</button><button className="button button-primary" disabled={!product.stock || Boolean(product.variants?.length && !selected)} onClick={buyNow}>Buy now <ArrowRight size={17} /></button></div><a className="ask-link" href={`https://wa.me/8801938640733?text=${encodeURIComponent(askMessage)}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Have a question? Ask on WhatsApp</a><div className="shipping-note"><div><Truck size={17} /><span><b>Delivery across Bangladesh</b><small>Choose a courier at checkout</small></span></div><div><PackageCheck size={17} /><span><b>Ships with care</b><small>Bangladesh Post Office / Steadfast</small></span></div></div></div></section><section className="container detail-lower"><div className="detail-panel"><div className="panel-heading"><h2>Specifications</h2><span>Technical details</span></div><div className="spec-grid"><div><span>Availability</span><b>{product.stockStatus || "Available to order"}</b></div><div><span>SKU</span><b>{product.sku || "Not specified"}</b></div><div><span>Source item</span><b>#{product.sourceOrder}</b></div>{selected && Object.entries(selected).filter(([key]) => ["capacitance","voltage","resistance","powerRating","tolerance","marking"].includes(key) && Boolean(selected[key as keyof Variant])).map(([key, value]) => <div key={key}><span>{key}</span><b>{String(value)}</b></div>)}</div></div><div className="detail-panel product-resources"><div className="panel-heading"><h2>Documentation</h2><span>Files & useful links</span></div>{product.documentation?.length ? <div className="resource-link-list">{product.documentation.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer"><span>{document.documentElement.lang === "bn" ? (item.titleBn || item.title) : item.title}</span><ArrowUpRight /></a>)}</div> : <p className="resource-empty">No documents added yet. Add documentation entries to this product in the catalogue data.</p>}<div className="resource-subsection"><h3>Best projects</h3>{product.projects?.length ? product.projects.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.title} <ArrowUpRight /></a>) : <p className="resource-empty">Project links can be added for this product.</p>}</div><div className="resource-subsection"><h3>Application</h3><p>{localizedApplications(product).join(" · ") || (document.documentElement.lang === "bn" ? "এই product-এর application information যোগ করা হবে।" : "Add application ideas and recommended use cases for this product.")}</p></div><div className="attention-note"><b>{document.documentElement.lang === "bn" ? "সতর্কতা" : "Attention"}</b><p>{localizedAttention(product) || (document.documentElement.lang === "bn" ? "সংযোগের আগে voltage, polarity, stock status এবং compatibility যাচাই করুন।" : "Check voltage, polarity, stock status and compatibility before connecting this product.")}</p></div></div></section>{related.length > 0 && <section className="section container related-section"><SectionHeading eyebrow="Keep building" title="You may also like" /><ProductGrid products={related} navigate={navigate} addToCart={addToCart} /></section>}</div>;
}

function CartPage({ products, cart, site, navigate, updateQty, removeFromCart }: { products: Product[]; cart: CartLine[]; site: SiteConfig; navigate: (path: string) => void; updateQty: (id: string, qty: number, variantId?: string) => void; removeFromCart: (id: string, variantId?: string) => void }) {
  const lines = cart.map((line) => ({ ...line, product: products.find((product) => product.id === line.productId), variant: products.find((product) => product.id === line.productId)?.variants?.find((v) => v.variantId === line.variantId) })).filter((line) => line.product) as Array<CartLine & { product: Product; variant: Variant | undefined }>;
  const subtotal = lines.reduce((sum, line) => sum + (line.variant?.price ?? line.product.price) * line.qty, 0);
  const delivery = 0;
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><span>Your cart</span></div><div className="container page-intro cart-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> Ready when you are</div><h1>Your cart</h1><p>{lines.length ? "Review your components before heading to checkout." : "Your next project starts here."}</p></div><span className="result-count">{cart.reduce((sum, line) => sum + line.qty, 0)} items</span></div>{!lines.length ? <div className="container"><EmptyState title="Your cart is waiting for a good idea" copy="Browse the collection and add the parts that bring your project to life." action="Start shopping" onAction={() => navigate("/products")} /></div> : <div className="container cart-layout"><div className="cart-lines">{lines.map(({ product, variant, qty }) => <div className="cart-line" key={`${product.id}-${variant?.variantId || "base"}`}><button className="cart-line-image" onClick={() => navigate(`/product/${product.slug}`)}><img src={imageFor(product, variant?.variantId)} alt="" /></button><div className="cart-line-copy"><div className="product-meta"><span>{product.category}</span><span className="stock-in"><i /> In stock</span></div><button className="cart-line-name" onClick={() => navigate(`/product/${product.slug}`)}>{localizedProductName(product)}{variant && <small>— {variant.displayName}</small>}</button><span className="cart-line-price">{formatBDT(variant?.price ?? product.price)} · {priceUnitLabel(variant?.priceUnit)}</span><small>{variant ? `SKU ${variant.variantId}` : product.sku || product.id}</small></div><div className="quantity-control"><button onClick={() => updateQty(product.id, qty - 1, variant?.variantId)}><Minus size={14} /></button><b>{qty}</b><button onClick={() => updateQty(product.id, qty + 1, variant?.variantId)} disabled={Boolean(variant && qty >= (variant.priceUnit === "per_2_pieces" ? Math.floor(variant.stockQuantity / 2) : variant.stockQuantity))}><Plus size={14} /></button></div><strong className="cart-line-total">{formatBDT((variant?.price ?? product.price) * qty)}</strong><button className="remove-line" onClick={() => removeFromCart(product.id, variant?.variantId)} aria-label="Remove item"><X size={17} /></button></div>)}<button className="continue-shopping" onClick={() => navigate("/products")}><ArrowLeft size={15} /> Continue shopping</button></div><OrderSummary subtotal={subtotal} delivery={delivery} site={site} navigate={navigate} /></div>}</div>;
}

function OrderSummary({ subtotal, delivery, site, navigate, checkout = true }: { subtotal: number; delivery: number; site: SiteConfig; navigate: (path: string) => void; checkout?: boolean }) { return <aside className="order-summary"><div className="summary-heading"><h2>Order summary</h2><span>BDT</span></div><div className="summary-row"><span>Subtotal</span><b>{formatBDT(subtotal)}</b></div><div className="summary-row"><span>Delivery <small>Select courier at checkout</small></span><b>{delivery ? formatBDT(delivery) : "—"}</b></div><div className="summary-rule" /><div className="summary-row summary-total"><span>Total</span><b>{formatBDT(subtotal + delivery)}</b></div><p className="summary-note"><Truck size={15} /> Courier and delivery charge are selected at checkout.</p>{checkout && <button className="button button-primary summary-button" onClick={() => navigate("/checkout")}>Go to checkout <ArrowRight size={17} /></button>}<p className="summary-trust"><BadgeCheck size={14} /> Secure guest checkout · No account required</p></aside>; }

function CheckoutPage({ products, cart, site, locations, navigate, clearCart }: { products: Product[]; cart: CartLine[]; site: SiteConfig; locations: LocationData | null; navigate: (path: string) => void; clearCart: () => void }) {
  const lines = cart.map((line) => ({ ...line, product: products.find((product) => product.id === line.productId), variant: products.find((product) => product.id === line.productId)?.variants?.find((v) => v.variantId === line.variantId) })).filter((line) => line.product) as Array<CartLine & { product: Product; variant: Variant | undefined }>;
  const subtotal = lines.reduce((sum, line) => sum + (line.variant?.price ?? line.product.price) * line.qty, 0);
  const [form, setForm] = useState<CheckoutForm>({ fullName: "", mobile: "", altMobile: "", division: "", district: "", upazila: "", postOffice: "", postCode: "", fullAddress: "", area: "", note: "", courierId: "", couponCode: "", paymentMethod: "Cash on Delivery", paymentMobile: "", transactionId: "", email: "" });
  const [error, setError] = useState("");
  const divisionData = locations?.divisions.find((item) => item.name === form.division);
  const districtData = divisionData?.districts.find((item) => item.name === form.district);
  const upazilaData = districtData?.upazilas.find((item) => item.name === form.upazila);
  const selectedCourier = site.shipping.couriers.find((courier) => courier.id === form.courierId);
  const selectedCoupon = COUPONS.find((coupon) => coupon.code === form.couponCode.trim().toUpperCase());
  const delivery = selectedCoupon?.freeShipping ? 0 : (selectedCourier?.deliveryCharge || 0);
  const discount = selectedCoupon && "amount" in selectedCoupon ? Math.min(selectedCoupon.amount ?? 0, subtotal) : 0;
  const total = Math.max(0, subtotal + delivery - discount);
  const orderNumber = useMemo(() => {
    const date = new Date();
    const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    return `ED-${ymd}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<string | null>(null);
  const bn = document.documentElement.lang === "bn";
  const setField = (key: keyof CheckoutForm, value: string) => setForm((current) => ({ ...current, [key]: value, ...(key === "division" ? { district: "", upazila: "", postOffice: "", postCode: "" } : {}), ...(key === "district" ? { upazila: "", postOffice: "", postCode: "" } : {}), ...(key === "upazila" ? { postOffice: "", postCode: "" } : {}), ...(key === "postOffice" ? { postCode: upazilaData?.postOffices.find((office) => office.name === value)?.postCode || "" } : {}) }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const required: Array<keyof CheckoutForm> = ["fullName", "mobile", "division", "district", "upazila", "postOffice", "postCode", "area", "courierId", "paymentMethod"];
    if (form.paymentMethod !== "Cash on Delivery") required.push("paymentMobile", "transactionId");
    if (required.some((key) => !form[key].trim())) { setError("Please complete all required delivery details before continuing."); return; }
    if (!/^01\d{9}$/.test(form.mobile.replace(/\s+/g, ""))) { setError("Please enter a valid Bangladesh mobile number, for example 01912345678."); return; }
    const itemPayload = lines.map((line) => {
      const unitPrice = line.variant?.price ?? line.product.price;
      return { productName: localizedProductName(line.product), productId: line.product.id, sku: line.variant?.variantId || line.product.sku || line.product.id, quantity: line.qty, unitPrice, subtotal: unitPrice * line.qty };
    });
    const payload: OrderPayload = {
      clientRequestId: orderNumber,
      customer: { name: form.fullName.trim(), phone: form.mobile.trim(), whatsapp: form.altMobile.trim() || form.mobile.trim(), email: form.email.trim(), address: (form.fullAddress.trim() || form.area.trim()), district: form.district.trim(), area: form.area.trim(), division: form.division.trim(), postOffice: form.postOffice.trim(), postCode: form.postCode.trim() },
      items: itemPayload,
      subtotal, deliveryCharge: delivery, discount, total,
      courier: selectedCourier?.name || "", paymentMethod: form.paymentMethod, paymentMobile: form.paymentMobile.trim(), transactionId: form.transactionId.trim(), customerNote: form.note.trim(), couponCode: form.couponCode.trim().toUpperCase(), source: window.location.origin,
    };
    const linesText = itemPayload.map((item, index) => `${index + 1}. ${item.productName} — ${item.sku}\nQty: ${item.quantity}\nPrice: ${formatBDT(item.unitPrice)}\nSubtotal: ${formatBDT(item.subtotal)}`).join("\n\n");
    const message = `NEW ORDER — ELECTRONICS DOKAN\nOrder Number: ${orderNumber}\n\nORDER ITEMS\n${linesText}\n\n-------------------------\nCourier: ${selectedCourier?.name || "—"}\nPayment: ${form.paymentMethod}\nPayment number: ${form.paymentMethod === "Cash on Delivery" ? "—" : "01576951669"}\nPayment mobile: ${form.paymentMobile || "—"}\nTransaction ID: ${form.transactionId || "—"}\nCoupon: ${form.couponCode || "—"}\nDiscount: ${formatBDT(discount)}\nDelivery Charge: ${formatBDT(delivery)}\nSubtotal: ${formatBDT(subtotal)}\nTOTAL: ${formatBDT(total)}\n-------------------------\n\nCUSTOMER INFORMATION\nName: ${form.fullName}\nMobile: ${form.mobile}\nAlternative Mobile: ${form.altMobile || "—"}\nEmail: ${form.email || "—"}\nDivision: ${form.division}\nDistrict: ${form.district}\nUpazila: ${form.upazila}\nPost Office: ${form.postOffice}\nPost Code: ${form.postCode}\nArea / Village / Road / House: ${form.area}\nFull Address: ${form.fullAddress}\nCustomer Note: ${form.note || "—"}`;
    setError("");
    setSubmitting(true);
    try {
      const result = await submitOrderToAppsScript(payload);
      const finalOrderId = result.orderId || orderNumber;
      setSubmittedOrder(finalOrderId);
      window.open(`https://wa.me/${site.whatsappInternational}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    } catch {
      setError("Order submit করা যায়নি। Please check your internet connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };
  if (!lines.length) return <div className="page-wrap"><div className="container"><EmptyState title="Your cart is empty" copy="Add a product before starting checkout." action="Browse products" onAction={() => navigate("/products")} /></div></div>;
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/cart")}>Cart</button><ChevronRight size={14} /><span>Guest checkout</span></div><div className="container page-intro checkout-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> One simple step</div><h1>Checkout</h1><p>Enter your delivery details. We’ll open WhatsApp with your order ready to send.</p></div><span className="checkout-safe"><BadgeCheck size={17} /> No account needed</span></div><div className="container checkout-delivery-animation" aria-label={bn ? "Electronics Dokan থেকে customer delivery" : "Electronics Dokan to customer delivery"}><div className="checkout-route-point checkout-route-store"><span className="checkout-route-icon"><ShoppingBag size={17} /></span><span><b>electronics dokan</b><small>{bn ? "আপনার order প্রস্তুত করছে" : "Preparing your order"}</small></span></div><span className="checkout-route-line"><i /><i /><i /></span><div className="checkout-route-package"><PackageCheck size={20} /><span>{bn ? "ready to ship" : "ready to ship"}</span></div><span className="checkout-route-line"><i /><i /><i /></span><div className="checkout-route-point checkout-route-customer"><span className="checkout-route-icon"><Truck size={17} /></span><span><b>{bn ? "আপনার কাছে" : "to customer"}</b><small>{bn ? "নিরাপদ delivery" : "careful delivery"}</small></span></div></div><form className="container checkout-layout" onSubmit={submit}><div className="checkout-form"><section className="form-section"><div className="form-heading"><span>01</span><div><h2>Your details</h2><p>How can we reach you?</p></div></div><div className="form-grid two"><Field label="Full name" required value={form.fullName} onChange={(value) => setField("fullName", value)} placeholder="e.g. Rahim Ahmed" /><Field label="Mobile number" required value={form.mobile} onChange={(value) => setField("mobile", value)} placeholder="01XXXXXXXXX" type="tel" /><Field label="Alternative mobile" value={form.altMobile} onChange={(value) => setField("altMobile", value)} placeholder="Optional" type="tel" /><Field label="Email" value={form.email} onChange={(value) => setField("email", value)} placeholder="Optional" type="email" /></div></section><section className="form-section"><div className="form-heading"><span>02</span><div><h2>Delivery address</h2><p>Select your location from the local Bangladesh dataset.</p></div></div><div className="form-grid two"><SelectField label="Division" required value={form.division} onChange={(value) => setField("division", value)} options={locations?.divisions.map((item) => item.name) || []} placeholder="Select division" /><SelectField label="District" required value={form.district} onChange={(value) => setField("district", value)} options={divisionData?.districts.map((item) => item.name) || []} placeholder="Select district" disabled={!form.division} /><SelectField label="Upazila / Thana" required value={form.upazila} onChange={(value) => setField("upazila", value)} options={districtData?.upazilas.map((item) => item.name) || []} placeholder="Select upazila" disabled={!form.district} /><SelectField label="Post office" required value={form.postOffice} onChange={(value) => setField("postOffice", value)} options={upazilaData?.postOffices.map((item) => item.name) || []} placeholder="Select post office" disabled={!form.upazila} /><Field label="Post code" required value={form.postCode} onChange={(value) => setField("postCode", value)} placeholder="Auto-filled from post office" readOnly /><Field label="Area / Village / Road / House" required value={form.area} onChange={(value) => setField("area", value)} placeholder="House, road, landmark and useful directions" wide textarea /></div></section><section className="form-section"><div className="form-heading"><span>03</span><div><h2>{bn ? "কুরিয়ার নির্বাচন করুন" : "Choose courier"}</h2><p>{bn ? "একটি ডেলিভারি সার্ভিস বেছে নিন। চার্জ সারা দেশে নির্ধারিত।" : "Select one delivery service. Charges are fixed nationwide."}</p></div></div><div className="courier-options">{site.shipping.couriers.map((courier) => <label className={`courier-option ${form.courierId === courier.id ? "selected" : ""}`} key={courier.id}><input type="radio" name="courier" value={courier.id} checked={form.courierId === courier.id} onChange={() => setField("courierId", courier.id)} /><span className="courier-option-copy"><span className="courier-option-logo"><img src={courier.logo} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /><Truck size={18} /></span><span><b>{courier.name}</b><small>Fixed nationwide delivery charge</small></span></span><strong>{formatBDT(courier.deliveryCharge)}</strong></label>)}</div></section><section className="form-section"><div className="form-heading"><span>04</span><div><h2>{bn ? "কুপন ও পেমেন্ট" : "Coupon & payment"}</h2><p>{bn ? "কুপন ঐচ্ছিক। আপনার পছন্দের পেমেন্ট পদ্ধতি বেছে নিন।" : "Coupon is optional. Choose how you prefer to pay."}</p></div></div><div className="form-grid two"><Field label="Coupon code" value={form.couponCode} onChange={(value) => setField("couponCode", value.toUpperCase())} placeholder="e.g. ED20 or EDFREESHIP" /><SelectField label="Payment method" required value={form.paymentMethod} onChange={(value) => setField("paymentMethod", value)} options={PAYMENT_METHODS} placeholder="Choose payment method" /></div>{form.couponCode && !selectedCoupon && <div className="form-error">Coupon not recognised. Check the code and try again.</div>}{selectedCoupon && <p className="coupon-success">Applied: {selectedCoupon.label}</p>}{form.paymentMethod !== "Cash on Delivery" && <><div className="payment-reference-box"><strong>{bn ? "পেমেন্ট নম্বর: 01576951669" : "Send payment to: 01576951669"}</strong><span>{bn ? `অর্ডার রেফারেন্স: ${orderNumber} ব্যবহার করুন। পেমেন্টের পর নিচের তথ্য দিন।` : `Use ${orderNumber} as your payment reference. After payment, provide the details below.`}</span></div><div className="form-grid two payment-detail-fields"><Field label={bn ? "পেমেন্ট করা মোবাইল নম্বর" : "Payment mobile number"} required value={form.paymentMobile} onChange={(value) => setField("paymentMobile", value)} placeholder="01XXXXXXXXX" type="tel" /><Field label={bn ? "Transaction ID" : "Transaction ID"} required value={form.transactionId} onChange={(value) => setField("transactionId", value)} placeholder="e.g. 8A7B6C5D" /></div></>}</section><section className="form-section"><div className="form-heading"><span>05</span><div><h2>{bn ? "অতিরিক্ত তথ্য" : "Anything else?"}</h2><p>{bn ? "আমাদের জন্য অতিরিক্ত কোনো নোট থাকলে লিখুন।" : "Optional note for our team."}</p></div></div><Field label="Customer note" value={form.note} onChange={(value) => setField("note", value)} placeholder="Delivery preference, project context, or a question" textarea />{error && <div className="form-error">{error}</div>}<button className="button button-whatsapp submit-order" type="submit" disabled={submitting}><MessageCircle size={18} /> {submitting ? "Submitting order…" : (bn ? "WhatsApp-এ অর্ডার পাঠান" : "Place order via WhatsApp")} <ArrowRight size={17} /></button><p className="form-disclaimer">Your information is used only to prepare this WhatsApp order and is not saved by the website.</p></section></div><aside className="checkout-side"><div className="checkout-summary"><div className="summary-heading"><h2>{bn ? "আপনার অর্ডার" : "Your order"}</h2><button type="button" onClick={() => navigate("/cart")}>{bn ? "কার্ট এডিট করুন" : "Edit cart"}</button></div>{lines.map((line) => <div className="checkout-line" key={`${line.product.id}-${line.variant?.variantId || "base"}`}><span className="checkout-line-thumb"><img src={imageFor(line.product, line.variant?.variantId)} alt="" /><b>{line.qty}</b></span><span>{localizedProductName(line.product)}{line.variant && <small> — {line.variant.displayName}</small>}</span><strong>{formatBDT((line.variant?.price ?? line.product.price) * line.qty)}</strong></div>)}<div className="summary-rule" /><div className="summary-row"><span>Subtotal</span><b>{formatBDT(subtotal)}</b></div><div className="summary-row"><span>Delivery <small>{selectedCourier?.name || "Select courier"}</small></span><b>{formatBDT(delivery)}</b></div><div className="summary-row"><span>Discount <small>{selectedCoupon?.label || "No coupon"}</small></span><b>-{formatBDT(discount)}</b></div><div className="summary-row summary-total"><span>Total</span><b>{formatBDT(total)}</b></div></div><div className="checkout-benefits"><div><ShieldIcon /><span><b>Guest checkout</b><small>No login or account required</small></span></div><div><MessageCircle size={18} /><span><b>Direct to WhatsApp</b><small>Your order opens ready to send</small></span></div><div><Truck size={18} /><span><b>Tracked delivery</b><small>Bangladesh Post Office / Steadfast</small></span></div></div></aside></form>{submittedOrder && <div className="order-confirmation" role="dialog" aria-modal="true"><div className="order-confirmation-card"><span className="order-confirmation-icon">✓</span><h2>Order Placed Successfully</h2><p>আপনার order সফলভাবে গ্রহণ করা হয়েছে।</p><strong>Order ID: {submittedOrder}</strong><small>এই Order ID ব্যবহার করে পরবর্তীতে order status track করা যাবে।</small><button className="button button-primary" type="button" onClick={() => { clearCart(); navigate("/"); }}>Continue shopping</button></div></div>}</div>;
}

function ShieldIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z" /><path d="m8.5 12 2.2 2.2 4.8-4.8" /></svg>; }
function Field({ label, required, value, onChange, placeholder, type = "text", textarea = false, wide = false, readOnly = false }: { label: string; required?: boolean; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; textarea?: boolean; wide?: boolean; readOnly?: boolean }) { return <label className={`field ${wide ? "field-wide" : ""}`}><span>{label}{required && <b>*</b>}</span>{textarea ? <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} /> : <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} readOnly={readOnly} />}</label>; }
function SelectField({ label, required, value, onChange, options, placeholder, disabled }: { label: string; required?: boolean; value: string; onChange: (value: string) => void; options: string[]; placeholder: string; disabled?: boolean }) { return <label className="field"><span>{label}{required && <b>*</b>}</span><span className="select-wrap"><select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown size={15} /></span></label>; }

function InfoPage({ path, site, navigate }: { path: string; site: SiteConfig; navigate: (path: string) => void }) { const pages: Record<string, { title: string; eyebrow: string; intro: string; sections: Array<[string, string]> }> = { "/shipping": { title: "Shipping information", eyebrow: "Delivery, clearly explained", intro: "We deliver electronics across Bangladesh with a simple, transparent process.", sections: [["Delivery charges", `Bangladesh Post Office: ${formatBDT(site.shipping.couriers[0]?.deliveryCharge || 20)}. Steadfast Courier: ${formatBDT(site.shipping.couriers[1]?.deliveryCharge || 120)}. The selected courier and fixed nationwide charge are shown before you place your WhatsApp order.`], ["How it works", "Choose your products, complete the guest checkout form, and your order opens in WhatsApp. Our team confirms availability and dispatch details there."], ["Courier partners", "Bangladesh Post Office and Steadfast Courier are the available delivery services. The charge depends only on the selected courier, not on your division, district or address."]] }, "/returns": { title: "Return & refund", eyebrow: "A fair way to make it right", intro: "If something arrives damaged or doesn’t match your order, please contact us promptly.", sections: [["Contact us first", "Send a photo and your order conversation to our WhatsApp number within 48 hours of delivery so we can understand what happened."], ["Eligible situations", "We review damaged-on-arrival items, incorrect items and demonstrably faulty components. Please keep the packaging and the item until the review is complete."], ["Resolution", "Depending on the situation, we may arrange a replacement, exchange or refund. Final decisions are made after a quick inspection and confirmation with you."]] }, "/privacy": { title: "Privacy", eyebrow: "Simple by design", intro: "Electronics Dokan is a static storefront. We do not create customer accounts or keep an order database.", sections: [["What the site uses", "Your cart is held in your browser’s localStorage so it survives a refresh. Checkout details stay in the page while you prepare an order and are passed to WhatsApp only when you choose to open it."], ["What we don’t do", "We do not sell, rent or permanently store checkout information through this website. WhatsApp has its own privacy practices once you leave the site."], ["Questions", `For questions about this policy, contact ${site.whatsapp} on WhatsApp or email ${site.support.email}.`]] }, "/terms": { title: "Terms", eyebrow: "A clear agreement", intro: "By using this website, you agree to use it to browse products and prepare genuine purchase enquiries.", sections: [["Product information", "We work to keep prices, availability and specifications accurate. Availability is confirmed by our team before dispatch."], ["Orders", "A WhatsApp order is an enquiry until our team confirms the products, delivery charge and timing with you."], ["Use of the website", "Please do not misuse the site, attempt to disrupt it or submit someone else’s personal information without permission."]] }, "/contact": { title: "Contact us", eyebrow: "A real person is nearby", intro: "Send us your project, your question or a photo of the part you’re looking for.", sections: [["WhatsApp", `Chat with us at ${site.whatsapp}. We’re available ${site.support.hours}.`], ["Where we are", site.address], ["Social", "Follow Electronics Dokan on Facebook, TikTok and YouTube for new stock, build ideas and updates."]] } }; const page = pages[path]; return <div className="page-wrap info-page"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><span>{page.title}</span></div><div className="container info-hero"><div className="eyebrow"><span className="eyebrow-line" /> {page.eyebrow}</div><h1>{page.title}</h1><p>{page.intro}</p></div><div className="container info-content">{page.sections.map(([title, copy]) => <section key={title}><h2>{title}</h2><p>{copy}</p></section>)}<a className="button button-primary" href={`https://wa.me/${site.whatsappInternational}`} target="_blank" rel="noreferrer">Chat on WhatsApp <ArrowRight size={17} /></a></div></div>; }
function EmptyState({ title, copy, action, onAction }: { title: string; copy: string; action?: string; onAction?: () => void }) { return <div className="empty-state"><span className="empty-icon"><ShoppingBag size={25} /></span><h2>{title}</h2><p>{copy}</p>{action && <button className="button button-primary" onClick={onAction}>{action} <ArrowRight size={16} /></button>}</div>; }
function SitePreloader({ site }: { site: SiteConfig }) { return <div className="preloader-screen" role="status" aria-live="polite"><div className="preloader-card">{site.logo ? <img className="preloader-logo" src={site.logo} alt="Electronics Dokan" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span className="preloader-mark"><Zap size={28} fill="currentColor" /></span>}<strong>electronics dokan</strong><span>{document.documentElement.lang === "bn" ? "আপনার workbench প্রস্তুত হচ্ছে" : "Preparing your workbench"}</span><i className="preloader-progress" /></div></div>; }
function LoadingState() { return <SitePreloader site={FALLBACK_SITE} />; }
function NotFoundPage({ navigate }: { navigate: (path: string) => void }) { return <div className="page-wrap"><div className="container not-found"><span className="not-found-number">404</span><div className="eyebrow"><span className="eyebrow-line" /> That path is empty</div><h1>Nothing to see<br /><em>here.</em></h1><p>The page you’re looking for may have moved, or the build needs a fresh start.</p><button className="button button-primary" onClick={() => navigate("/")}>Back to home <ArrowRight size={16} /></button></div></div>; }

export default App;
