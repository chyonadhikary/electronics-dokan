import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Facebook,
  Filter,
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
  X,
  Youtube,
  Zap,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import "./index.css";

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
  documentation?: Array<{ title: string; url: string }>;
  applications?: string[];
  attention?: string;
  projects?: Array<{ title: string; url: string }>;
  keywords?: string[];
  stock: boolean;
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
const priceUnitLabel = (unit: Variant["priceUnit"] | undefined) => unit === "per_2_pieces" ? "per 2 pieces" : "per piece";
const productPrice = (product: Product) => product.variants?.length ? Math.min(...product.variants.map((v) => v.price)) : product.price;
const imagePath = (filename?: string) => filename ? `/images/products/${filename}` : "/images/placeholders/product-placeholder.webp";
const imageFor = (product: Product, variantId?: string) => {
  const variant = product.variants?.find((v) => v.variantId === variantId);
  return variant ? imagePath(variant.image) : (product.images?.[0] || imagePath(product.image));
};
const percentOff = (product: Product) => product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
const slugToTitle = (slug: string) => slug.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");

function usePath() {
  const [path, setPath] = useState(() => window.location.pathname + window.location.search);
  useEffect(() => {
    const handler = () => setPath(window.location.pathname + window.location.search);
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
  const addToCart = (productId: string, qty = 1, variantId?: string) => {
    const product = products.find((item) => item.id === productId);
    const variant = product?.variants?.find((item) => item.variantId === variantId);
    const key = `${productId}::${variantId || "base"}`;
    setCart((current) => {
      const existing = current.find((line) => `${line.productId}::${line.variantId || "base"}` === key);
      const max = variant ? (variant.priceUnit === "per_2_pieces" ? Math.floor(variant.stockQuantity / 2) : variant.stockQuantity) : 999;
      if (existing) return current.map((line) => `${line.productId}::${line.variantId || "base"}` === key ? { ...line, qty: Math.min(max, line.qty + qty) } : line);
      return [...current, { productId, variantId, qty: Math.min(max, qty) }];
    });
    toast.success(`${product ? localizedProductName(product) : "Item"}${variant ? ` — ${variant.displayName}` : ""} added to cart`);
  };
  const updateQty = (productId: string, qty: number, variantId?: string) => setCart((current) => qty <= 0 ? current.filter((line) => !(line.productId === productId && line.variantId === variantId)) : current.map((line) => line.productId === productId && line.variantId === variantId ? { ...line, qty } : line));
  const removeFromCart = (productId: string, variantId?: string) => setCart((current) => current.filter((line) => !(line.productId === productId && line.variantId === variantId)));

  const renderPage = () => {
    if (!ready) return <LoadingState />;
    if (path === "/" || path === "") return <HomePage products={products} site={site} brands={brands} navigate={navigate} addToCart={addToCart} />;
    if (path === "/categories") return <CategoriesPage products={products} navigate={navigate} />;
    if (path === "/brands") return <BrandsPage brands={brands} products={products} navigate={navigate} />;
    if (path === "/tracking") return <TrackingPage site={site} navigate={navigate} />;
    if (path === "/offers") return <OffersPage navigate={navigate} />;
    if (["/projects", "/pre-order", "/blog", "/corporate"].includes(path)) return <ResourcePage path={path} navigate={navigate} />;
    if (path.startsWith("/products")) return <ProductsPage products={products} navigate={navigate} addToCart={addToCart} />;
    if (path.startsWith("/product/")) return <ProductPage products={products} navigate={navigate} addToCart={addToCart} />;
    if (path === "/cart") return <CartPage products={products} cart={cart} site={site} navigate={navigate} updateQty={updateQty} removeFromCart={removeFromCart} />;
    if (path === "/checkout") return <CheckoutPage products={products} cart={cart} site={site} locations={locations} navigate={navigate} />;
    if (["/shipping", "/returns", "/privacy", "/terms", "/contact"].includes(path)) return <InfoPage path={path} site={site} navigate={navigate} />;
    return <NotFoundPage navigate={navigate} />;
  };

  return <>
    <Toaster position="bottom-right" toastOptions={{ className: "toast-card" }} />
    <Header site={site} cartCount={cartCount} path={path} navigate={navigate} products={products} language={language} setLanguage={setLanguage} />
    <main>{renderPage()}</main>
    <Footer site={site} navigate={navigate} />
    <WhatsAppFloat site={site} language={language} />
    <ScrollControls productPage={path.startsWith("/product/")} />
    <StickyFooterNav site={site} cartCount={cartCount} navigate={navigate} language={language} />
  </>;
}

function Header({ site, cartCount, path, navigate, products, language, setLanguage }: { site: SiteConfig; cartCount: number; path: string; navigate: (path: string) => void; products: Product[]; language: Language; setLanguage: (language: Language) => void }) {
  const [searchValue, setSearchValue] = useState(() => new URLSearchParams(window.location.search).get("search") || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchSticky, setSearchSticky] = useState(false);
  const categories = Array.from(new Set(products.map((product) => product.category))).sort();
  useEffect(() => setSearchValue(new URLSearchParams(window.location.search).get("search") || ""), [path]);
  useEffect(() => { const onScroll = () => setSearchSticky(window.scrollY > 80); onScroll(); window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll); }, []);
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate(searchValue.trim() ? `/products?search=${encodeURIComponent(searchValue.trim())}` : "/products");
    setMenuOpen(false);
  };
  return <>
    <div className="announcement"><div className="container announcement-inner"><span>{language === "bn" ? "Electronics Dokan-এর সঙ্গে ভবিষ্যৎ তৈরি করুন" : "Build the future with Electronics Dokan"}</span><span className="announcement-social"><SocialLinks site={site} /><span className="top-divider">|</span><a href={`tel:${site.whatsapp}`} aria-label="Call Electronics Dokan">Hotline: {site.whatsapp}</a><select className="language-select" value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label="Language"><option value="en">EN</option><option value="bn">বাংলা</option></select></span></div></div>
    <header className="site-header">
      <div className="container header-main">
        <button className={`brand ${site.logo ? "has-custom-logo" : ""}`} onClick={() => navigate("/")} aria-label="Go to Electronics Dokan home">{site.logo && <img className="custom-brand-logo" src={site.logo} alt="" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement?.classList.remove("has-custom-logo"); }} />}<span className="brand-mark"><Zap size={20} fill="currentColor" /></span><span><strong>electronics</strong><b>dokan</b><small>Build beyond ordinary</small></span></button>
        <form className={`search-form ${searchSticky ? "is-sticky" : ""}`} onSubmit={submitSearch}><Search size={19} /><input aria-label="Search products" value={searchValue} onChange={(event) => { setSearchValue(event.target.value); if (path.startsWith("/products")) navigate(event.target.value ? `/products?search=${encodeURIComponent(event.target.value)}` : "/products"); }} placeholder="Search products, brands, categories..." /><kbd>⌘ K</kbd><button type="submit" aria-label="Search"><ArrowRight size={19} /></button></form>
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
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>{bn ? "হোম" : "Home"}</button><ChevronRight size={14} /><span>{bn ? "অর্ডার ট্র্যাকিং" : "Order tracking"}</span></div><div className="container tracking-hero"><div className="eyebrow"><span className="eyebrow-line" /> {bn ? "আপনার অর্ডার কোথায়?" : "Where is your order?"}</div><h1>{bn ? "অর্ডার ট্র্যাক করুন" : "Track your order"}</h1><p>{bn ? "আপনার courier নির্বাচন করুন এবং official tracking page-এ গিয়ে consignment বা tracking number ব্যবহার করুন।" : "Choose your courier and use your consignment or tracking number on its official tracking page."}</p></div><section className="container courier-tracking-grid">{site.shipping.couriers.map((courier) => <article className="courier-tracking-card" key={courier.id}><div className="courier-logo-slot"><img src={courier.logo} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /><Truck size={30} /></div><div><h2>{courier.name}</h2><p>{courier.id === "bangladesh-post-office" ? (bn ? "বাংলাদেশ পোস্ট অফিসের parcel ও consignment tracking-এর জন্য official portal ব্যবহার করুন।" : "Use the official portal for Bangladesh Post Office parcel and consignment tracking.") : (bn ? "Steadfast shipment-এর current status ও delivery update দেখুন।" : "Check the current status and delivery updates for your Steadfast shipment.")}</p></div><a className="button button-primary" href={courier.trackingUrl} target="_blank" rel="noreferrer">{bn ? "Tracking খুলুন" : "Open tracking"} <ArrowUpRight /></a><small className="tracking-logo-hint">Logo path: {courier.logo}</small></article>)}</section><div className="container tracking-help"><MessageCircle size={19} /><p>{bn ? "Tracking number না পেলে WhatsApp-এ আমাদের order conversation-এর screenshot পাঠান।" : "If you cannot find your tracking number, send our team a screenshot of your order conversation on WhatsApp."}</p><a href={`https://wa.me/${site.whatsappInternational}`} target="_blank" rel="noreferrer">{bn ? "WhatsApp-এ সাহায্য নিন" : "Get help on WhatsApp"} <ArrowRight size={15} /></a></div></div>;
}

function OffersPage({ navigate }: { navigate: (path: string) => void }) {
  const bn = document.documentElement.lang === "bn";
  const offers = bn ? [{ tag: "শুরু করার কিট", title: "Maker starter picks", copy: "Arduino, sensor এবং prototyping essentials একসাথে বেছে নিন।", action: "Products দেখুন" }, { tag: "সাপ্তাহিক deal", title: "Build more, spend less", copy: "Featured components ও popular modules-এ নতুন stock ও deal দেখুন।", action: "সব পণ্য দেখুন" }, { tag: "নতুন project", title: "আজই আপনার build শুরু করুন", copy: "আপনার project-এর জন্য প্রয়োজনীয় part খুঁজে নিন—দ্রুত delivery ও human support সহ।", action: "Category দেখুন" }] : [{ tag: "Starter picks", title: "Maker starter picks", copy: "Pick Arduino, sensor and prototyping essentials for your next build.", action: "Browse products" }, { tag: "Weekly deal", title: "Build more, spend less", copy: "Explore featured components and popular modules with fresh stock and deals.", action: "Shop all products" }, { tag: "New project", title: "Start your build today", copy: "Find the parts for your project with fast delivery and human support.", action: "Browse categories" }];
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>{bn ? "হোম" : "Home"}</button><ChevronRight size={14} /><span>{bn ? "বিশেষ অফার" : "Special offers"}</span></div><div className="container page-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> {bn ? "আজকের catalogue highlights" : "Catalogue highlights"}</div><h1>{bn ? "বিশেষ অফার" : "Special offers"}</h1><p>{bn ? "আপনার পরের project-এর জন্য বেছে নেওয়া কিছু special picks।" : "A few special picks for your next project."}</p></div></div><section className="container offer-grid">{offers.map((offer, index) => <article className={`offer-card offer-card-${index}`} key={offer.title}><span>{offer.tag}</span><h2>{offer.title}</h2><p>{offer.copy}</p><button className="button button-light" onClick={() => navigate(index === 2 ? "/categories" : "/products")}>{offer.action} <ArrowRight size={16} /></button></article>)}</section></div>;
}

function ResourcePage({ path, navigate }: { path: string; navigate: (path: string) => void }) { const pages: Record<string, { eyebrow: string; title: string; intro: string; cards: Array<[string, string, string]> }> = { "/projects": { eyebrow: "Build with a clear starting point", title: "Projects", intro: "Practical project ideas, parts lists and guidance for your next electronics build.", cards: [["Smart home starter", "Build a simple sensor-led room monitor with an ESP board, display and reliable power.", "Explore modules"], ["Bench power toolkit", "Put together the essential tools and measurement parts for a safer, cleaner workbench.", "Shop tools"], ["Maker weekend", "A compact weekend build using sensors, LEDs and a microcontroller—great for learning by doing.", "Browse components"]] }, "/pre-order": { eyebrow: "Reserve upcoming stock", title: "Pre-order products", intro: "Reserve selected items before the next stock arrival. Our team confirms availability and timing with you.", cards: [["How pre-order works", "Choose a product marked Pre-order and send your enquiry through checkout. We confirm the advance, arrival and delivery details.", "View pre-order"], ["Clear confirmation", "No order is final until our team confirms the product, price, expected arrival and delivery charge with you.", "Ask on WhatsApp"], ["Need a specific part?", "Send us the model, board or component you need and we will check the next available shipment.", "Request a part"]] }, "/blog": { eyebrow: "Notes from the workbench", title: "Blog", intro: "Useful guides, build notes and practical electronics ideas for curious builders.", cards: [["Choosing the right module", "A quick way to compare voltage, current, interface and project fit before you buy.", "Read the guide"], ["From sketch to prototype", "A simple workflow for planning components, testing early and avoiding expensive rework.", "Read the guide"], ["Tools that earn their place", "The small set of tools that makes soldering, testing and repairs more comfortable.", "Read the guide"]] }, "/corporate": { eyebrow: "Reliable supply for teams", title: "Corporate", intro: "Need repeat supply, project components or a practical sourcing partner? Talk to Electronics Dokan.", cards: [["Project supply", "We can help prepare component lists for education, prototyping, repair and maker programmes.", "Start an enquiry"], ["Bulk requirements", "Share your part numbers, quantities and timeline so our team can check availability and pricing.", "Request a quote"], ["Human support", "Speak with a real person about delivery, substitutions and the best way to complete your order.", "Contact our team"]] } }; const page = pages[path]; return <div className="page-wrap resource-page"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><span>{page.title}</span></div><div className="container resource-hero"><div className="eyebrow"><span className="eyebrow-line" /> {page.eyebrow}</div><h1>{page.title}</h1><p>{page.intro}</p></div><section className="container resource-grid">{page.cards.map(([title, copy, action], index) => <article className={`resource-card resource-card-${index}`} key={title}><span className="resource-number">0{index + 1}</span><h2>{title}</h2><p>{copy}</p><button className="button button-primary" onClick={() => navigate(path === "/pre-order" && index === 0 ? "/products?sort=preorder" : path === "/projects" && index === 1 ? "/products?category=Tools" : "/contact")}>{action} <ArrowRight size={16} /></button></article>)}</section></div>; }

function CategoriesPage({ products, navigate }: { products: Product[]; navigate: (path: string) => void }) {
  const categories = Array.from(new Set(products.map((product) => product.category))).sort();
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><span>All categories</span></div><div className="container page-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> Browse the catalogue</div><h1>All categories</h1><p>Explore every product category in the Electronics Dokan catalogue.</p></div><span className="result-count">{categories.length} categories</span></div><section className="container catalogue-card-grid">{categories.map((category, index) => <button key={category} className={`catalogue-card catalogue-card-${index % 4}`} onClick={() => navigate(`/products?category=${encodeURIComponent(category)}`)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{category}</strong><small>{products.filter((product) => product.category === category).length} products <ArrowRight size={13} /></small></button>)}</section></div>;
}

function BrandsPage({ brands, products, navigate }: { brands: Brand[]; products: Product[]; navigate: (path: string) => void }) {
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><span>All brands</span></div><div className="container page-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> Trusted manufacturers</div><h1>All brands</h1><p>Browse brands available for future product assignment and catalogue filtering.</p></div><span className="result-count">{brands.length} brands</span></div><section className="container brand-catalogue-grid">{brands.map((brand) => { const count = products.filter((product) => product.brand === brand.name).length; return <button key={brand.slug} className="brand-catalogue-card" onClick={() => navigate(`/products?brand=${encodeURIComponent(brand.name)}`)}><span className="brand-logo-slot"><img src={brand.image} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></span><strong>{brand.name}</strong><small>{count ? `${count} products` : "No products assigned"} <ArrowRight size={13} /></small></button>; })}</section></div>;
}

function HomePage({ products, site, brands, navigate, addToCart }: { products: Product[]; site: SiteConfig; brands: Brand[]; navigate: (path: string) => void; addToCart: (id: string, qty?: number) => void }) {
  const categories = Array.from(new Set(products.map((product) => product.category))).sort();
  const featuredPool = products.filter((product) => product.featured && product.stock);
  const topSelling = useMemo(() => [...(featuredPool.length ? featuredPool : products.filter((product) => product.stock))].sort(() => Math.random() - 0.5).slice(0, 8), [products]);
  const preOrder = products.filter((product) => product.preOrder && product.preOrder !== "—").slice(0, 8);
  const newArrivals = products.filter((product) => product.newArrival).slice(0, 8);
  const trending = products.filter((product) => product.trending).slice(0, 8);
  const backInStock = products.filter((product) => product.stock && !product.featured && !product.newArrival).slice(0, 8);
  const seasonal = products.filter((product) => `${product.name} ${(product.keywords || []).join(" ")}`.match(/season|festival|gift|light|led|decor|christmas|eid/i)).slice(0, 8);
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
    <div className="focused-banner-actions container"><button className="button button-primary" onClick={() => navigate('/products')}>Shop all products <ArrowRight size={17} /></button><a className="button button-light" href={`https://wa.me/${site.whatsappInternational}?text=${encodeURIComponent("Hello Electronics Dokan, please help me choose components.")}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Ask for help</a></div>
    <div className="focused-banner-stats container"><span><BadgeCheck size={15} /> {products.length} catalogue items</span><span><ShoppingBag size={15} /> {categories.length} categories</span><span><Truck size={15} /> Nationwide delivery</span><span><MessageCircle size={15} /> WhatsApp ordering</span></div>
    <div className="container promise-strip reference-promises"><div><span className="promise-icon"><Truck size={18} /></span><span><b>Delivery across Bangladesh</b><small>Bangladesh Post Office & Steadfast</small></span></div><div><span className="promise-icon"><BadgeCheck size={18} /></span><span><b>Quality checked products</b><small>Useful parts for real projects</small></span></div><div><span className="promise-icon"><ShoppingBag size={18} /></span><span><b>Guest checkout</b><small>No account required</small></span></div><div><span className="promise-icon"><MessageCircle size={18} /></span><span><b>Human support</b><small>From Phultala, Khulna</small></span></div></div>
    {shelf("Popular with builders", "Top Selling 🏆", topSelling, "View top sellers", "sort=featured")}
    {shelf("Fresh on the bench", "New Arrivals 🆕", newArrivals.length ? newArrivals : topSelling, "View new arrivals", "sort=new")}
    {shelf("Recently available", "Back in Stock 🔄", backInStock.length ? backInStock : topSelling, "View available products", "sort=back")}
    <section className="reference-category-band"><div className="container"><SectionHeading eyebrow="Browse the catalogue" title="Popular categories" action="View all categories" onAction={() => navigate('/categories')} /><CategoryMarquee categories={categories} products={products} navigate={navigate} /></div></section>
    {shelf("Seasonal picks", "Seasonal Products", seasonal.length ? seasonal : topSelling.slice(0, 6), "Shop seasonal picks", "sort=seasonal")}
    {shelf("Trending now", "Trending Now 📈", trending.length ? trending : topSelling, "Shop trending", "sort=featured")}
    {shelf("Made to order", "Pre Order Products", preOrder.length ? preOrder : topSelling.slice(0, 4), "View pre-order", "sort=preorder")}
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
function ProductCard({ product, navigate, addToCart }: { product: Product; navigate: (path: string) => void; addToCart: (id: string, qty?: number, variantId?: string) => void }) {
  const hasVariants = product.variants?.length > 0;
  const src = imageFor(product);
  return <article className="product-card"><button className="product-image-wrap" onClick={() => navigate(`/product/${product.slug}`)} aria-label={`View ${localizedProductName(product)}`}><div className="product-image-bg" /><img src={src} alt={localizedProductName(product)} loading="lazy" onError={(event) => { console.warn(`[Electronics Dokan] Missing image: ${src}`); event.currentTarget.src = "/images/placeholders/product-placeholder.webp"; }} /><span className="image-view">View details <ArrowUpRight /></span></button><div className="product-card-body"><div className="product-meta"><span>{product.brand && product.brand !== "Not specified" ? product.brand : "Brand not selected"}</span><span className={product.stock ? "stock-in" : "stock-out"}><i />{product.stock ? (hasVariants ? `${product.variants.length} variants` : "In stock") : "Out of stock"}</span></div><button className="product-name" onClick={() => navigate(`/product/${product.slug}`)}>{localizedProductName(product)}</button><p className="product-short">{localizedShortDescription(product)}</p><div className="product-bottom"><div className="price-wrap"><strong>{hasVariants ? `Starting from ${formatBDT(productPrice(product))}` : formatBDT(product.price)}</strong>{hasVariants && <small className="unit-label">{priceUnitLabel(product.variants[0]?.priceUnit)}</small>}</div><button className="add-button" onClick={() => hasVariants ? navigate(`/product/${product.slug}`) : addToCart(product.id)} disabled={!product.stock} aria-label={hasVariants ? `Choose a variant of ${localizedProductName(product)}` : `Add ${localizedProductName(product)} to cart`}>{hasVariants ? <ArrowRight size={18} /> : <Plus size={18} />}</button></div></div></article>; }

function ProductsPage({ products, navigate, addToCart }: { products: Product[]; navigate: (path: string) => void; addToCart: (id: string, qty?: number) => void }) {
  const params = new URLSearchParams(window.location.search);
  const search = (params.get("search") || "").toLowerCase();
  const categoryParam = params.get("category") || "All products";
  const brandParam = params.get("brand") || "";
  const sortParam = params.get("sort") || "featured";
  const categories = ["All products", ...Array.from(new Set(products.map((p) => p.category))).sort()];
  const brands = ["All brands", ...Array.from(new Set(products.map((p) => p.brand || "Not specified"))).sort()];
  const filtered = useMemo(() => products.filter((product) => {
    const matchesCategory = categoryParam === "All products" || product.category === categoryParam;
    const matchesBrand = !brandParam || product.brand === brandParam;
    const haystack = [localizedProductName(product), product.id, product.sku, product.category, product.brand, localizedDescription(product), localizedShortDescription(product), ...(product.keywords || []), ...(product.variants || []).flatMap((v) => [v.displayName, v.resistance, v.capacitance, v.voltage, v.powerRating, v.tolerance, v.marking])].filter(Boolean).join(" ").toLowerCase();
    return matchesCategory && matchesBrand && (!search || haystack.includes(search));
  }).sort((a, b) => sortParam === "price-low" ? a.price - b.price : sortParam === "price-high" ? b.price - a.price : sortParam === "new" ? Number(b.newArrival) - Number(a.newArrival) : sortParam === "preorder" ? Number(Boolean(b.preOrder && b.preOrder !== "—")) - Number(Boolean(a.preOrder && a.preOrder !== "—")) : sortParam === "back" ? Number(b.stock && !b.featured && !b.newArrival) - Number(a.stock && !a.featured && !a.newArrival) : sortParam === "seasonal" ? Number(/season|festival|gift|light|led|decor|christmas|eid/i.test(`${b.name} ${(b.keywords || []).join(" ")}`)) - Number(/season|festival|gift|light|led|decor|christmas|eid/i.test(`${a.name} ${(a.keywords || []).join(" ")}`)) : sortParam === "deals" ? percentOff(b) - percentOff(a) : Number(b.featured) - Number(a.featured)), [products, search, categoryParam, brandParam, sortParam]);
  const setFilter = (key: string, value: string) => { const next = new URLSearchParams(window.location.search); if (value && value !== "All products" && value !== "featured") next.set(key, value); else next.delete(key); navigate(`/products${next.toString() ? `?${next.toString()}` : ""}`); };
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><span>Shop all products</span></div><div className="container page-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> The complete workbench</div><h1>{brandParam || (categoryParam === "All products" ? "All products" : categoryParam)}</h1><p>{search ? <>Showing results for <strong>“{search}”</strong></> : brandParam ? `Products assigned to ${brandParam}.` : "Everything you need to go from first sketch to final build."}</p></div><span className="result-count">{filtered.length} {filtered.length === 1 ? "product" : "products"}</span></div><div className="container shop-layout"><aside className="shop-sidebar"><div className="sidebar-title"><span><SlidersHorizontal size={17} /> Filter by category</span><span className="sidebar-count">{products.length}</span></div>{categories.map((category) => <button key={category} className={categoryParam === category ? "active" : ""} onClick={() => setFilter("category", category)}>{category}<span>{products.filter((p) => category === "All products" || p.category === category).length}</span></button>)}<div className="sidebar-title brand-filter-title"><span><SlidersHorizontal size={17} /> Filter by brand</span><span className="sidebar-count">{brands.length - 1}</span></div>{brands.map((brand) => <button key={brand} className={(!brandParam && brand === "All brands") || brandParam === brand ? "active" : ""} onClick={() => setFilter("brand", brand === "All brands" ? "" : brand)}>{brand}<span>{products.filter((p) => brand === "All brands" ? true : (p.brand || "Not specified") === brand).length}</span></button>)}<div className="sidebar-help"><CircleHelp size={17} /><div><b>Need a hand?</b><p>Message us with your project brief.</p><a href="https://wa.me/8801938640733" target="_blank" rel="noreferrer">Ask on WhatsApp <ArrowRight size={13} /></a></div></div></aside><div className="shop-results"><div className="shop-toolbar"><div className="mobile-filter-label"><Filter size={16} /> {brandParam || categoryParam}</div><span className="toolbar-result">{search ? `Search results · ${filtered.length}` : `${filtered.length} items`}</span><label className="sort-select"><span>Sort by</span><select value={sortParam} onChange={(event) => setFilter("sort", event.target.value)}><option value="featured">Featured</option><option value="preorder">Pre-order</option><option value="new">Newest first</option><option value="seasonal">Seasonal</option><option value="back">Back in stock</option><option value="deals">Best deals</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select><ChevronDown size={15} /></label></div>{filtered.length ? <div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} navigate={navigate} addToCart={addToCart} />)}</div> : <EmptyState title="No matching products" copy="Try a broader search or browse another category." action="Clear filters" onAction={() => navigate("/products")} />}</div></div></div>;
}

function ProductPage({ products, navigate, addToCart }: { products: Product[]; navigate: (path: string) => void; addToCart: (id: string, qty?: number, variantId?: string) => void }) {
  const slug = window.location.pathname.split("/").pop();
  const product = products.find((item) => item.slug === slug);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(product?.variants?.[0]?.variantId || "");
  const [quantity, setQuantity] = useState(1);
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
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><button onClick={() => navigate(`/products?category=${encodeURIComponent(product.category)}`)}>{product.category}</button><ChevronRight size={14} /><span>{localizedProductName(product)}</span></div><section className="container product-detail"><div className="gallery"><div className="gallery-main"><div className="product-image-bg" /><img src={src} alt={`${localizedProductName(product)}${selected ? ` — ${selected.displayName}` : ""}`} onError={(event) => { console.warn(`[Electronics Dokan] Missing image: ${src}`); event.currentTarget.src = "/images/placeholders/product-placeholder.webp"; }} /><button className="image-zoom-control" type="button" onClick={() => window.open(src, "_blank", "noopener,noreferrer")} aria-label="Magnify product image" title="View larger image"><Search size={18} /></button></div></div><div className="detail-copy"><div className="product-meta"><span>{product.category} · {product.sku || product.id}</span><span className="stock-in"><i /> {product.stockStatus || "Available to order"}</span></div><h1>{localizedProductName(product)}</h1><p className="sku">SKU: <strong>{product.sku || "Not specified"}</strong> · {product.variants?.length || 0} selectable variants</p><div className="detail-price"><strong>{formatBDT(selected?.price ?? productPrice(product))}</strong><span className="unit-label">{priceUnitLabel(unit)}</span>{!selected && product.variants?.length > 0 && <small>Starting price</small>}</div><p className="detail-description">{localizedDescription(product)}</p>{product.variants?.length > 0 && <div className="variant-panel"><div className="variant-heading"><div><b>Choose a value or rating</b><small>{visible.length} of {product.variants.length} variants · duplicate source rows are preserved</small></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search value..." aria-label="Search variants" /></div><div className="variant-list">{visible.map((variant) => <button key={variant.variantId} className={`variant-option ${selectedId === variant.variantId ? "active" : ""}`} onClick={() => { setSelectedId(variant.variantId); setQuantity(1); }}><span><strong>{variant.displayName}</strong><small>{variant.resistance || variant.capacitance || variant.marking || ""}{variant.powerRating ? ` · ${variant.powerRating}` : ""}{variant.tolerance ? ` · ${variant.tolerance}` : ""}</small></span><span><b>{formatBDT(variant.price)}</b><small>{priceUnitLabel(variant.priceUnit)} · {variant.stockQuantity} pcs</small></span></button>)}</div></div>}<div className="detail-rule" /><div className="detail-actions"><div className="quantity-control"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={15} /></button><b>{quantity}</b><button onClick={() => setQuantity(Math.min(maxQty, quantity + 1))} disabled={quantity >= maxQty}><Plus size={15} /></button></div><button className="button button-secondary" disabled={Boolean(product.variants?.length && !selected)} onClick={() => addToCart(product.id, quantity, selectedId || undefined)}><ShoppingCart size={17} /> Add to cart</button><button className="button button-primary" disabled={Boolean(product.variants?.length && !selected)} onClick={buyNow}>Buy now <ArrowRight size={17} /></button></div><a className="ask-link" href={`https://wa.me/8801938640733?text=${encodeURIComponent(askMessage)}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Have a question? Ask on WhatsApp</a><div className="shipping-note"><div><Truck size={17} /><span><b>Delivery across Bangladesh</b><small>Choose a courier at checkout</small></span></div><div><PackageCheck size={17} /><span><b>Ships with care</b><small>Bangladesh Post Office / Steadfast</small></span></div></div></div></section><section className="container detail-lower"><div className="detail-panel"><div className="panel-heading"><h2>Specifications</h2><span>Technical details</span></div><div className="spec-grid"><div><span>Availability</span><b>{product.stockStatus || "Available to order"}</b></div><div><span>SKU</span><b>{product.sku || "Not specified"}</b></div><div><span>Source item</span><b>#{product.sourceOrder}</b></div>{selected && Object.entries(selected).filter(([key]) => ["capacitance","voltage","resistance","powerRating","tolerance","marking"].includes(key) && Boolean(selected[key as keyof Variant])).map(([key, value]) => <div key={key}><span>{key}</span><b>{String(value)}</b></div>)}</div></div><div className="detail-panel product-resources"><div className="panel-heading"><h2>Documentation</h2><span>Files & useful links</span></div>{product.documentation?.length ? <div className="resource-link-list">{product.documentation.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer"><span>{item.title}</span><ArrowUpRight /></a>)}</div> : <p className="resource-empty">No documents added yet. Add documentation entries to this product in the catalogue data.</p>}<div className="resource-subsection"><h3>Best projects</h3>{product.projects?.length ? product.projects.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.title} <ArrowUpRight /></a>) : <p className="resource-empty">Project links can be added for this product.</p>}</div><div className="resource-subsection"><h3>Application</h3><p>{product.applications?.join(" · ") || "Add application ideas and recommended use cases for this product."}</p></div><div className="attention-note"><b>Attention</b><p>{product.attention || "Check voltage, polarity, stock status and compatibility before connecting this product."}</p></div></div></section>{related.length > 0 && <section className="section container related-section"><SectionHeading eyebrow="Keep building" title="You may also like" /><ProductGrid products={related} navigate={navigate} addToCart={addToCart} /></section>}</div>;
}

function CartPage({ products, cart, site, navigate, updateQty, removeFromCart }: { products: Product[]; cart: CartLine[]; site: SiteConfig; navigate: (path: string) => void; updateQty: (id: string, qty: number, variantId?: string) => void; removeFromCart: (id: string, variantId?: string) => void }) {
  const lines = cart.map((line) => ({ ...line, product: products.find((product) => product.id === line.productId), variant: products.find((product) => product.id === line.productId)?.variants?.find((v) => v.variantId === line.variantId) })).filter((line) => line.product) as Array<CartLine & { product: Product; variant: Variant | undefined }>;
  const subtotal = lines.reduce((sum, line) => sum + (line.variant?.price ?? line.product.price) * line.qty, 0);
  const delivery = 0;
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><span>Your cart</span></div><div className="container page-intro cart-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> Ready when you are</div><h1>Your cart</h1><p>{lines.length ? "Review your components before heading to checkout." : "Your next project starts here."}</p></div><span className="result-count">{cart.reduce((sum, line) => sum + line.qty, 0)} items</span></div>{!lines.length ? <div className="container"><EmptyState title="Your cart is waiting for a good idea" copy="Browse the collection and add the parts that bring your project to life." action="Start shopping" onAction={() => navigate("/products")} /></div> : <div className="container cart-layout"><div className="cart-lines">{lines.map(({ product, variant, qty }) => <div className="cart-line" key={`${product.id}-${variant?.variantId || "base"}`}><button className="cart-line-image" onClick={() => navigate(`/product/${product.slug}`)}><img src={imageFor(product, variant?.variantId)} alt="" /></button><div className="cart-line-copy"><div className="product-meta"><span>{product.category}</span><span className="stock-in"><i /> In stock</span></div><button className="cart-line-name" onClick={() => navigate(`/product/${product.slug}`)}>{localizedProductName(product)}{variant && <small>— {variant.displayName}</small>}</button><span className="cart-line-price">{formatBDT(variant?.price ?? product.price)} · {priceUnitLabel(variant?.priceUnit)}</span><small>{variant ? `SKU ${variant.variantId}` : product.sku || product.id}</small></div><div className="quantity-control"><button onClick={() => updateQty(product.id, qty - 1, variant?.variantId)}><Minus size={14} /></button><b>{qty}</b><button onClick={() => updateQty(product.id, qty + 1, variant?.variantId)} disabled={Boolean(variant && qty >= (variant.priceUnit === "per_2_pieces" ? Math.floor(variant.stockQuantity / 2) : variant.stockQuantity))}><Plus size={14} /></button></div><strong className="cart-line-total">{formatBDT((variant?.price ?? product.price) * qty)}</strong><button className="remove-line" onClick={() => removeFromCart(product.id, variant?.variantId)} aria-label="Remove item"><X size={17} /></button></div>)}<button className="continue-shopping" onClick={() => navigate("/products")}><ArrowLeft size={15} /> Continue shopping</button></div><OrderSummary subtotal={subtotal} delivery={delivery} site={site} navigate={navigate} /></div>}</div>;
}

function OrderSummary({ subtotal, delivery, site, navigate, checkout = true }: { subtotal: number; delivery: number; site: SiteConfig; navigate: (path: string) => void; checkout?: boolean }) { return <aside className="order-summary"><div className="summary-heading"><h2>Order summary</h2><span>BDT</span></div><div className="summary-row"><span>Subtotal</span><b>{formatBDT(subtotal)}</b></div><div className="summary-row"><span>Delivery <small>Select courier at checkout</small></span><b>{delivery ? formatBDT(delivery) : "—"}</b></div><div className="summary-rule" /><div className="summary-row summary-total"><span>Total</span><b>{formatBDT(subtotal + delivery)}</b></div><p className="summary-note"><Truck size={15} /> Courier and delivery charge are selected at checkout.</p>{checkout && <button className="button button-primary summary-button" onClick={() => navigate("/checkout")}>Go to checkout <ArrowRight size={17} /></button>}<p className="summary-trust"><BadgeCheck size={14} /> Secure guest checkout · No account required</p></aside>; }

function CheckoutPage({ products, cart, site, locations, navigate }: { products: Product[]; cart: CartLine[]; site: SiteConfig; locations: LocationData | null; navigate: (path: string) => void }) {
  const lines = cart.map((line) => ({ ...line, product: products.find((product) => product.id === line.productId), variant: products.find((product) => product.id === line.productId)?.variants?.find((v) => v.variantId === line.variantId) })).filter((line) => line.product) as Array<CartLine & { product: Product; variant: Variant | undefined }>;
  const subtotal = lines.reduce((sum, line) => sum + (line.variant?.price ?? line.product.price) * line.qty, 0);
  const [form, setForm] = useState<CheckoutForm>({ fullName: "", mobile: "", altMobile: "", division: "", district: "", upazila: "", postOffice: "", postCode: "", fullAddress: "", area: "", note: "", courierId: "", couponCode: "", paymentMethod: "Cash on Delivery", paymentMobile: "", transactionId: "" });
  const [error, setError] = useState("");
  const divisionData = locations?.divisions.find((item) => item.name === form.division);
  const districtData = divisionData?.districts.find((item) => item.name === form.district);
  const upazilaData = districtData?.upazilas.find((item) => item.name === form.upazila);
  const selectedCourier = site.shipping.couriers.find((courier) => courier.id === form.courierId);
  const selectedCoupon = COUPONS.find((coupon) => coupon.code === form.couponCode.trim().toUpperCase());
  const delivery = selectedCoupon?.freeShipping ? 0 : (selectedCourier?.deliveryCharge || 0);
  const discount = selectedCoupon && "amount" in selectedCoupon ? Math.min(selectedCoupon.amount ?? 0, subtotal) : 0;
  const total = Math.max(0, subtotal + delivery - discount);
  const orderNumber = useMemo(() => `ED${String(Math.floor(100000 + Math.random() * 900000))}`, []);
  const bn = document.documentElement.lang === "bn";
  const setField = (key: keyof CheckoutForm, value: string) => setForm((current) => ({ ...current, [key]: value, ...(key === "division" ? { district: "", upazila: "", postOffice: "", postCode: "" } : {}), ...(key === "district" ? { upazila: "", postOffice: "", postCode: "" } : {}), ...(key === "upazila" ? { postOffice: "", postCode: "" } : {}), ...(key === "postOffice" ? { postCode: upazilaData?.postOffices.find((office) => office.name === value)?.postCode || "" } : {}) }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const required: Array<keyof CheckoutForm> = ["fullName", "mobile", "division", "district", "upazila", "postOffice", "postCode", "area", "courierId", "paymentMethod"];
    if (form.paymentMethod !== "Cash on Delivery") required.push("paymentMobile", "transactionId");
    if (required.some((key) => !form[key].trim())) { setError("Please complete all required delivery details before continuing."); return; }
    if (!/^01\d{9}$/.test(form.mobile.replace(/\s+/g, ""))) { setError("Please enter a valid Bangladesh mobile number, for example 01912345678."); return; }
    const linesText = lines.map((line, index) => `${index + 1}. ${localizedProductName(line.product)}${line.variant ? ` — ${line.variant.displayName}` : ""}\nVariant ID: ${line.variant?.variantId || line.product.sku || line.product.id}\nQty: ${line.qty}\nPrice: ${formatBDT(line.variant?.price ?? line.product.price)} (${priceUnitLabel(line.variant?.priceUnit)})\nSubtotal: ${formatBDT((line.variant?.price ?? line.product.price) * line.qty)}`).join("\n\n");
    const message = `NEW ORDER — ELECTRONICS DOKAN\nOrder Number: ${orderNumber}\n\nORDER ITEMS\n${linesText}\n\n-------------------------\nCourier: ${selectedCourier?.name || "—"}\nPayment: ${form.paymentMethod}\nPayment number: ${form.paymentMethod === "Cash on Delivery" ? "—" : "01576951669"}\nPayment mobile: ${form.paymentMobile || "—"}\nTransaction ID: ${form.transactionId || "—"}\nCoupon: ${form.couponCode || "—"}\nDiscount: ${formatBDT(discount)}\nDelivery Charge: ${formatBDT(delivery)}\nSubtotal: ${formatBDT(subtotal)}\nTOTAL: ${formatBDT(total)}\n-------------------------\n\nCUSTOMER INFORMATION\nName: ${form.fullName}\nMobile: ${form.mobile}\nAlternative Mobile: ${form.altMobile || "—"}\nDivision: ${form.division}\nDistrict: ${form.district}\nUpazila: ${form.upazila}\nPost Office: ${form.postOffice}\nPost Code: ${form.postCode}\nArea / Village / Road / House: ${form.area}\nCustomer Note: ${form.note || "—"}`;
    window.open(`https://wa.me/${site.whatsappInternational}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };
  if (!lines.length) return <div className="page-wrap"><div className="container"><EmptyState title="Your cart is empty" copy="Add a product before starting checkout." action="Browse products" onAction={() => navigate("/products")} /></div></div>;
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/cart")}>Cart</button><ChevronRight size={14} /><span>Guest checkout</span></div><div className="container page-intro checkout-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> One simple step</div><h1>Checkout</h1><p>Enter your delivery details. We’ll open WhatsApp with your order ready to send.</p></div><span className="checkout-safe"><BadgeCheck size={17} /> No account needed</span></div><form className="container checkout-layout" onSubmit={submit}><div className="checkout-form"><section className="form-section"><div className="form-heading"><span>01</span><div><h2>Your details</h2><p>How can we reach you?</p></div></div><div className="form-grid two"><Field label="Full name" required value={form.fullName} onChange={(value) => setField("fullName", value)} placeholder="e.g. Rahim Ahmed" /><Field label="Mobile number" required value={form.mobile} onChange={(value) => setField("mobile", value)} placeholder="01XXXXXXXXX" type="tel" /><Field label="Alternative mobile" value={form.altMobile} onChange={(value) => setField("altMobile", value)} placeholder="Optional" type="tel" /></div></section><section className="form-section"><div className="form-heading"><span>02</span><div><h2>Delivery address</h2><p>Select your location from the local Bangladesh dataset.</p></div></div><div className="form-grid two"><SelectField label="Division" required value={form.division} onChange={(value) => setField("division", value)} options={locations?.divisions.map((item) => item.name) || []} placeholder="Select division" /><SelectField label="District" required value={form.district} onChange={(value) => setField("district", value)} options={divisionData?.districts.map((item) => item.name) || []} placeholder="Select district" disabled={!form.division} /><SelectField label="Upazila / Thana" required value={form.upazila} onChange={(value) => setField("upazila", value)} options={districtData?.upazilas.map((item) => item.name) || []} placeholder="Select upazila" disabled={!form.district} /><SelectField label="Post office" required value={form.postOffice} onChange={(value) => setField("postOffice", value)} options={upazilaData?.postOffices.map((item) => item.name) || []} placeholder="Select post office" disabled={!form.upazila} /><Field label="Post code" required value={form.postCode} onChange={(value) => setField("postCode", value)} placeholder="Auto-filled from post office" readOnly /><Field label="Area / Village / Road / House" required value={form.area} onChange={(value) => setField("area", value)} placeholder="House, road, landmark and useful directions" wide textarea /></div></section><section className="form-section"><div className="form-heading"><span>03</span><div><h2>{bn ? "কুরিয়ার নির্বাচন করুন" : "Choose courier"}</h2><p>{bn ? "একটি ডেলিভারি সার্ভিস বেছে নিন। চার্জ সারা দেশে নির্ধারিত।" : "Select one delivery service. Charges are fixed nationwide."}</p></div></div><div className="courier-options">{site.shipping.couriers.map((courier) => <label className={`courier-option ${form.courierId === courier.id ? "selected" : ""}`} key={courier.id}><input type="radio" name="courier" value={courier.id} checked={form.courierId === courier.id} onChange={() => setField("courierId", courier.id)} /><span className="courier-option-copy"><span className="courier-option-logo"><img src={courier.logo} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /><Truck size={18} /></span><span><b>{courier.name}</b><small>Fixed nationwide delivery charge</small></span></span><strong>{formatBDT(courier.deliveryCharge)}</strong></label>)}</div></section><section className="form-section"><div className="form-heading"><span>04</span><div><h2>{bn ? "কুপন ও পেমেন্ট" : "Coupon & payment"}</h2><p>{bn ? "কুপন ঐচ্ছিক। আপনার পছন্দের পেমেন্ট পদ্ধতি বেছে নিন।" : "Coupon is optional. Choose how you prefer to pay."}</p></div></div><div className="form-grid two"><Field label="Coupon code" value={form.couponCode} onChange={(value) => setField("couponCode", value.toUpperCase())} placeholder="e.g. ED20 or EDFREESHIP" /><SelectField label="Payment method" required value={form.paymentMethod} onChange={(value) => setField("paymentMethod", value)} options={PAYMENT_METHODS} placeholder="Choose payment method" /></div>{form.couponCode && !selectedCoupon && <div className="form-error">Coupon not recognised. Check the code and try again.</div>}{selectedCoupon && <p className="coupon-success">Applied: {selectedCoupon.label}</p>}{form.paymentMethod !== "Cash on Delivery" && <><div className="payment-reference-box"><strong>{bn ? "পেমেন্ট নম্বর: 01576951669" : "Send payment to: 01576951669"}</strong><span>{bn ? `অর্ডার রেফারেন্স: ${orderNumber} ব্যবহার করুন। পেমেন্টের পর নিচের তথ্য দিন।` : `Use ${orderNumber} as your payment reference. After payment, provide the details below.`}</span></div><div className="form-grid two payment-detail-fields"><Field label={bn ? "পেমেন্ট করা মোবাইল নম্বর" : "Payment mobile number"} required value={form.paymentMobile} onChange={(value) => setField("paymentMobile", value)} placeholder="01XXXXXXXXX" type="tel" /><Field label={bn ? "Transaction ID" : "Transaction ID"} required value={form.transactionId} onChange={(value) => setField("transactionId", value)} placeholder="e.g. 8A7B6C5D" /></div></>}</section><section className="form-section"><div className="form-heading"><span>05</span><div><h2>{bn ? "অতিরিক্ত তথ্য" : "Anything else?"}</h2><p>{bn ? "আমাদের জন্য অতিরিক্ত কোনো নোট থাকলে লিখুন।" : "Optional note for our team."}</p></div></div><Field label="Customer note" value={form.note} onChange={(value) => setField("note", value)} placeholder="Delivery preference, project context, or a question" textarea />{error && <div className="form-error">{error}</div>}<button className="button button-whatsapp submit-order" type="submit"><MessageCircle size={18} /> {bn ? "WhatsApp-এ অর্ডার পাঠান" : "Place order via WhatsApp"} <ArrowRight size={17} /></button><p className="form-disclaimer">Your information is used only to prepare this WhatsApp order and is not saved by the website.</p></section></div><aside className="checkout-side"><div className="checkout-summary"><div className="summary-heading"><h2>{bn ? "আপনার অর্ডার" : "Your order"}</h2><button type="button" onClick={() => navigate("/cart")}>{bn ? "কার্ট এডিট করুন" : "Edit cart"}</button></div>{lines.map((line) => <div className="checkout-line" key={`${line.product.id}-${line.variant?.variantId || "base"}`}><span className="checkout-line-thumb"><img src={imageFor(line.product, line.variant?.variantId)} alt="" /><b>{line.qty}</b></span><span>{localizedProductName(line.product)}{line.variant && <small> — {line.variant.displayName}</small>}</span><strong>{formatBDT((line.variant?.price ?? line.product.price) * line.qty)}</strong></div>)}<div className="summary-rule" /><div className="summary-row"><span>Subtotal</span><b>{formatBDT(subtotal)}</b></div><div className="summary-row"><span>Delivery <small>{selectedCourier?.name || "Select courier"}</small></span><b>{formatBDT(delivery)}</b></div><div className="summary-row"><span>Discount <small>{selectedCoupon?.label || "No coupon"}</small></span><b>-{formatBDT(discount)}</b></div><div className="summary-row summary-total"><span>Total</span><b>{formatBDT(total)}</b></div></div><div className="checkout-benefits"><div><ShieldIcon /><span><b>Guest checkout</b><small>No login or account required</small></span></div><div><MessageCircle size={18} /><span><b>Direct to WhatsApp</b><small>Your order opens ready to send</small></span></div><div><Truck size={18} /><span><b>Tracked delivery</b><small>Bangladesh Post Office / Steadfast</small></span></div></div></aside></form></div>;
}

function ShieldIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z" /><path d="m8.5 12 2.2 2.2 4.8-4.8" /></svg>; }
function Field({ label, required, value, onChange, placeholder, type = "text", textarea = false, wide = false, readOnly = false }: { label: string; required?: boolean; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; textarea?: boolean; wide?: boolean; readOnly?: boolean }) { return <label className={`field ${wide ? "field-wide" : ""}`}><span>{label}{required && <b>*</b>}</span>{textarea ? <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} /> : <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} readOnly={readOnly} />}</label>; }
function SelectField({ label, required, value, onChange, options, placeholder, disabled }: { label: string; required?: boolean; value: string; onChange: (value: string) => void; options: string[]; placeholder: string; disabled?: boolean }) { return <label className="field"><span>{label}{required && <b>*</b>}</span><span className="select-wrap"><select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown size={15} /></span></label>; }

function InfoPage({ path, site, navigate }: { path: string; site: SiteConfig; navigate: (path: string) => void }) { const pages: Record<string, { title: string; eyebrow: string; intro: string; sections: Array<[string, string]> }> = { "/shipping": { title: "Shipping information", eyebrow: "Delivery, clearly explained", intro: "We deliver electronics across Bangladesh with a simple, transparent process.", sections: [["Delivery charges", `Bangladesh Post Office: ${formatBDT(site.shipping.couriers[0]?.deliveryCharge || 20)}. Steadfast Courier: ${formatBDT(site.shipping.couriers[1]?.deliveryCharge || 120)}. The selected courier and fixed nationwide charge are shown before you place your WhatsApp order.`], ["How it works", "Choose your products, complete the guest checkout form, and your order opens in WhatsApp. Our team confirms availability and dispatch details there."], ["Courier partners", "Bangladesh Post Office and Steadfast Courier are the available delivery services. The charge depends only on the selected courier, not on your division, district or address."]] }, "/returns": { title: "Return & refund", eyebrow: "A fair way to make it right", intro: "If something arrives damaged or doesn’t match your order, please contact us promptly.", sections: [["Contact us first", "Send a photo and your order conversation to our WhatsApp number within 48 hours of delivery so we can understand what happened."], ["Eligible situations", "We review damaged-on-arrival items, incorrect items and demonstrably faulty components. Please keep the packaging and the item until the review is complete."], ["Resolution", "Depending on the situation, we may arrange a replacement, exchange or refund. Final decisions are made after a quick inspection and confirmation with you."]] }, "/privacy": { title: "Privacy", eyebrow: "Simple by design", intro: "Electronics Dokan is a static storefront. We do not create customer accounts or keep an order database.", sections: [["What the site uses", "Your cart is held in your browser’s localStorage so it survives a refresh. Checkout details stay in the page while you prepare an order and are passed to WhatsApp only when you choose to open it."], ["What we don’t do", "We do not sell, rent or permanently store checkout information through this website. WhatsApp has its own privacy practices once you leave the site."], ["Questions", `For questions about this policy, contact ${site.whatsapp} on WhatsApp or email ${site.support.email}.`]] }, "/terms": { title: "Terms", eyebrow: "A clear agreement", intro: "By using this website, you agree to use it to browse products and prepare genuine purchase enquiries.", sections: [["Product information", "We work to keep prices, availability and specifications accurate. Availability is confirmed by our team before dispatch."], ["Orders", "A WhatsApp order is an enquiry until our team confirms the products, delivery charge and timing with you."], ["Use of the website", "Please do not misuse the site, attempt to disrupt it or submit someone else’s personal information without permission."]] }, "/contact": { title: "Contact us", eyebrow: "A real person is nearby", intro: "Send us your project, your question or a photo of the part you’re looking for.", sections: [["WhatsApp", `Chat with us at ${site.whatsapp}. We’re available ${site.support.hours}.`], ["Where we are", site.address], ["Social", "Follow Electronics Dokan on Facebook, TikTok and YouTube for new stock, build ideas and updates."]] } }; const page = pages[path]; return <div className="page-wrap info-page"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><span>{page.title}</span></div><div className="container info-hero"><div className="eyebrow"><span className="eyebrow-line" /> {page.eyebrow}</div><h1>{page.title}</h1><p>{page.intro}</p></div><div className="container info-content">{page.sections.map(([title, copy]) => <section key={title}><h2>{title}</h2><p>{copy}</p></section>)}<a className="button button-primary" href={`https://wa.me/${site.whatsappInternational}`} target="_blank" rel="noreferrer">Chat on WhatsApp <ArrowRight size={17} /></a></div></div>; }
function EmptyState({ title, copy, action, onAction }: { title: string; copy: string; action?: string; onAction?: () => void }) { return <div className="empty-state"><span className="empty-icon"><ShoppingBag size={25} /></span><h2>{title}</h2><p>{copy}</p>{action && <button className="button button-primary" onClick={onAction}>{action} <ArrowRight size={16} /></button>}</div>; }
function LoadingState() { return <div className="loading-state"><span className="loader-mark"><Zap size={20} fill="currentColor" /></span><p>Setting up your workbench…</p></div>; }
function NotFoundPage({ navigate }: { navigate: (path: string) => void }) { return <div className="page-wrap"><div className="container not-found"><span className="not-found-number">404</span><div className="eyebrow"><span className="eyebrow-line" /> That path is empty</div><h1>Nothing to see<br /><em>here.</em></h1><p>The page you’re looking for may have moved, or the build needs a fresh start.</p><button className="button button-primary" onClick={() => navigate("/")}>Back to home <ArrowRight size={16} /></button></div></div>; }

export default App;
