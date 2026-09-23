import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
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
  description: string;
  specifications: Record<string, string>;
  keywords?: string[];
  stock: boolean;
  shipping?: { available: boolean; courier: string };
};

type SiteConfig = {
  storeName: string;
  tagline: string;
  whatsapp: string;
  whatsappInternational: string;
  address: string;
  siteUrl: string;
  social: { facebook: string; tiktok: string; youtube: string };
  shipping: { couriers: Array<{ id: string; name: string; deliveryCharge: number }> };
  support: { hours: string; email: string };
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
};

const FALLBACK_SITE: SiteConfig = {
  storeName: "Electronics Dokan",
  tagline: "Components for curious builders",
  whatsapp: "01938640733",
  whatsappInternational: "8801938640733",
  address: "Phultala, Khulna, Bangladesh",
  siteUrl: "",
  social: { facebook: "https://facebook.com/electronicsdokanin", tiktok: "https://tiktok.com/@electronicsdokan", youtube: "electronicsdokan" },
  shipping: { couriers: [{ id: "bangladesh-post-office", name: "Bangladesh Post Office", deliveryCharge: 20 }, { id: "steadfast", name: "Steadfast Courier", deliveryCharge: 120 }] },
  support: { hours: "Every day · 9:00 AM–10:00 PM", email: "hello@electronicsdokan.com" },
};

const formatBDT = (value: number) => `৳${new Intl.NumberFormat("en-BD").format(value)}`;
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
  const [products, setProducts] = useState<Product[]>([]);
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
    ]).then(([productData, siteData, locationData, manifest]) => {
      setProducts(productData);
      setSite(siteData);
      setLocations(locationData);
      setImageManifest(manifest);
      setReady(true);
    }).catch(() => {
      toast.error("Catalog could not be loaded. Please refresh the page.");
      setReady(true);
    });
  }, []);

  useEffect(() => { localStorage.setItem("electronics-dokan-cart", JSON.stringify(cart)); }, [cart]);
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
    toast.success(`${product?.name || "Item"}${variant ? ` — ${variant.displayName}` : ""} added to cart`);
  };
  const updateQty = (productId: string, qty: number, variantId?: string) => setCart((current) => qty <= 0 ? current.filter((line) => !(line.productId === productId && line.variantId === variantId)) : current.map((line) => line.productId === productId && line.variantId === variantId ? { ...line, qty } : line));
  const removeFromCart = (productId: string, variantId?: string) => setCart((current) => current.filter((line) => !(line.productId === productId && line.variantId === variantId)));

  const renderPage = () => {
    if (!ready) return <LoadingState />;
    if (path === "/" || path === "") return <HomePage products={products} navigate={navigate} addToCart={addToCart} />;
    if (path.startsWith("/products")) return <ProductsPage products={products} navigate={navigate} addToCart={addToCart} />;
    if (path.startsWith("/product/")) return <ProductPage products={products} navigate={navigate} addToCart={addToCart} />;
    if (path === "/cart") return <CartPage products={products} cart={cart} site={site} navigate={navigate} updateQty={updateQty} removeFromCart={removeFromCart} />;
    if (path === "/checkout") return <CheckoutPage products={products} cart={cart} site={site} locations={locations} navigate={navigate} />;
    if (["/shipping", "/returns", "/privacy", "/terms", "/contact"].includes(path)) return <InfoPage path={path} site={site} navigate={navigate} />;
    return <NotFoundPage navigate={navigate} />;
  };

  return <>
    <Toaster position="bottom-right" toastOptions={{ className: "toast-card" }} />
    <Header site={site} cartCount={cartCount} path={path} navigate={navigate} products={products} />
    <main>{renderPage()}</main>
    <Footer site={site} navigate={navigate} />
    <a className="whatsapp-float" href={`https://wa.me/${site.whatsappInternational}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"><MessageCircle size={22} /><span>Chat with us</span></a>
  </>;
}

function Header({ site, cartCount, path, navigate, products }: { site: SiteConfig; cartCount: number; path: string; navigate: (path: string) => void; products: Product[] }) {
  const [searchValue, setSearchValue] = useState(() => new URLSearchParams(window.location.search).get("search") || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const categories = Array.from(new Set(products.map((product) => product.category))).sort();
  useEffect(() => setSearchValue(new URLSearchParams(window.location.search).get("search") || ""), [path]);
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate(searchValue.trim() ? `/products?search=${encodeURIComponent(searchValue.trim())}` : "/products");
    setMenuOpen(false);
  };
  return <>
    <div className="announcement"><div className="container announcement-inner"><span>Build the future with Electronics Dokan</span><span className="announcement-social"><a href={site.social.facebook} aria-label="Facebook" target="_blank" rel="noreferrer"><Facebook size={15} /></a><a href={site.social.youtube.startsWith("http") ? site.social.youtube : `https://www.youtube.com/@${site.social.youtube}`} aria-label="YouTube" target="_blank" rel="noreferrer"><Youtube size={15} /></a><span className="top-divider">|</span><a href={`tel:${site.whatsapp}`} aria-label="Call Electronics Dokan">Hotline: {site.whatsapp}</a></span></div></div>
    <header className="site-header">
      <div className="container header-main">
        <button className="brand" onClick={() => navigate("/")} aria-label="Go to Electronics Dokan home"><span className="brand-mark"><Zap size={20} fill="currentColor" /></span><span><strong>electronics</strong><b>dokan</b><small>Build beyond ordinary</small></span></button>
        <form className="search-form" onSubmit={submitSearch}><Search size={19} /><input aria-label="Search products" value={searchValue} onChange={(event) => { setSearchValue(event.target.value); if (path.startsWith("/products")) navigate(event.target.value ? `/products?search=${encodeURIComponent(event.target.value)}` : "/products"); }} placeholder="Search products, brands, categories..." /><kbd>⌘ K</kbd><button type="submit" aria-label="Search"><ArrowRight size={19} /></button></form>
        <div className="header-actions">
          <div className="category-menu-wrap"><button className="icon-button category-trigger" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}><Menu size={20} /><span className="hide-mobile">Categories</span><ChevronDown size={15} /></button>{menuOpen && <div className="category-menu"><button onClick={() => { navigate("/products"); setMenuOpen(false); }}>All products <span>{products.length}</span></button>{categories.map((category) => <button key={category} onClick={() => { navigate(`/products?category=${encodeURIComponent(category)}`); setMenuOpen(false); }}>{category}<span>{products.filter((product) => product.category === category).length}</span></button>)}</div>}</div>
          <button className="cart-button" onClick={() => navigate("/cart")} aria-label={`Cart with ${cartCount} items`}><ShoppingCart size={21} /><span className="hide-mobile">Cart</span>{cartCount > 0 && <b>{cartCount}</b>}</button>
          <button className="mobile-menu-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open menu">{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {mobileOpen && <div className="mobile-nav container"><button onClick={() => { navigate("/products"); setMobileOpen(false); }}>Shop all products</button>{categories.map((category) => <button key={category} onClick={() => { navigate(`/products?category=${encodeURIComponent(category)}`); setMobileOpen(false); }}>{category}</button>)}<a href={`https://wa.me/${site.whatsappInternational}`} target="_blank" rel="noreferrer">Chat on WhatsApp</a></div>}
      <div className="container header-sub"><span><Truck size={15} /> Delivery across Bangladesh</span><span><BadgeCheck size={15} /> Quality checked components</span><span><MessageCircle size={15} /> Human support on WhatsApp</span><span className="header-sub-right">{site.support.hours}</span></div>
    </header>
  </>;
}

function Footer({ site, navigate }: { site: SiteConfig; navigate: (path: string) => void }) {
  const paymentMethods = [
    ["bKash", "/images/payment/bkash.webp"],
    ["Nagad", "/images/payment/nagad.webp"],
    ["Rocket", "/images/payment/rocket.webp"],
    ["NPSB", "/images/payment/npsb.webp"],
  ];
  return <footer className="footer"><div className="container footer-grid"><div className="footer-brand"><button className="brand footer-logo" onClick={() => navigate("/")}><span className="brand-mark"><Zap size={20} fill="currentColor" /></span><span><strong>electronics</strong><b>dokan</b></span></button><p>Thoughtful components, honest prices and friendly support for builders across Bangladesh.</p><div className="social-row"><a href={site.social.facebook} aria-label="Facebook" target="_blank" rel="noreferrer"><Facebook size={17} /></a><a href={`https://www.tiktok.com/@electronicsdokan`} aria-label="TikTok" target="_blank" rel="noreferrer"><span className="social-text">♪</span></a><a href={`https://www.youtube.com/@${site.social.youtube}`} aria-label="YouTube" target="_blank" rel="noreferrer"><Youtube size={17} /></a></div></div><div><h4>Shop</h4><button onClick={() => navigate("/products")}>All products</button><button onClick={() => navigate("/products?category=ESP32")}>ESP32 & ESP8266</button><button onClick={() => navigate("/products?category=Sensors")}>Sensors & modules</button><button onClick={() => navigate("/products?category=Tools")}>Tools & accessories</button></div><div><h4>Customer care</h4><button onClick={() => navigate("/shipping")}>Shipping information</button><button onClick={() => navigate("/returns")}>Return / refund</button><button onClick={() => navigate("/contact")}>Contact us</button><button onClick={() => navigate("/privacy")}>Privacy</button></div><div className="footer-contact"><h4>Need help?</h4><p><MapPin size={15} /> {site.address}</p><a href={`https://wa.me/${site.whatsappInternational}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> {site.whatsapp}</a><p><Clock3 size={15} /> {site.support.hours}</p><a href={`mailto:${site.support.email}`}><Send size={15} /> {site.support.email}</a><div className="payment-methods"><h4>Supported payment methods</h4><div className="payment-badges">{paymentMethods.map(([label, src]) => <span key={label}><img src={src} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.style.display = "none"; }} /><b>{label}</b></span>)}</div></div></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Electronics Dokan. All rights reserved.</span><span>Guest checkout · WhatsApp ordering · No account required</span></div></footer>;
}

function HomePage({ products, navigate, addToCart }: { products: Product[]; navigate: (path: string) => void; addToCart: (id: string, qty?: number) => void }) {
  const categories = Array.from(new Set(products.map((product) => product.category))).sort();
  const featured = products.filter((product) => product.featured).slice(0, 8);
  const newArrivals = products.filter((product) => product.newArrival).slice(0, 8);
  const trending = products.filter((product) => product.trending).slice(0, 8);
  const stocked = products.filter((product) => product.stock).slice(0, 8);
  const brands = Array.from(new Set(products.map((product) => product.brand).filter((brand) => brand && brand !== "Not specified"))).slice(0, 8);
  const shelf = (eyebrow: string, title: string, items: Product[], action: string, query: string) => <section className="reference-shelf container"><SectionHeading eyebrow={eyebrow} title={title} action={action} onAction={() => navigate(`/products?${query}`)} /><div className="shelf-track">{items.map((product) => <ProductCard key={product.id} product={product} navigate={navigate} addToCart={addToCart} />)}</div></section>;
  return <div className="reference-home">
    <section className="reference-hero"><div className="reference-hero-image" /><div className="container reference-hero-content"><div className="eyebrow"><span className="eyebrow-line" /> Electronics, modules & tools from Khulna</div><h1>Build something<br /><em>real.</em></h1><p>Practical components, fair prices and friendly WhatsApp support for students, makers, technicians and curious builders across Bangladesh.</p><div className="hero-actions"><button className="button button-primary" onClick={() => navigate('/products')}>Shop all products <ArrowRight size={17} /></button><a className="button button-light" href={`https://wa.me/${"8801938640733"}?text=${encodeURIComponent("Hello Electronics Dokan, please help me choose components.")}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Ask for help</a></div><div className="reference-hero-pills"><span><BadgeCheck size={15} /> {products.length} catalogue items</span><span><Truck size={15} /> Nationwide delivery</span><span><MessageCircle size={15} /> WhatsApp ordering</span></div></div></section>
    <div className="container promise-strip reference-promises"><div><span className="promise-icon"><Truck size={18} /></span><span><b>Delivery across Bangladesh</b><small>Bangladesh Post Office & Steadfast</small></span></div><div><span className="promise-icon"><BadgeCheck size={18} /></span><span><b>Quality checked components</b><small>Useful parts for real projects</small></span></div><div><span className="promise-icon"><ShoppingBag size={18} /></span><span><b>Guest checkout</b><small>No account required</small></span></div><div><span className="promise-icon"><MessageCircle size={18} /></span><span><b>Human support</b><small>From Phultala, Khulna</small></span></div></div>
    {shelf("Top picks", "Start with something good", featured, "View all", "sort=featured")}
    {shelf("Fresh on the bench", "New arrivals", newArrivals, "View new arrivals", "sort=new")}
    <section className="reference-category-band"><div className="container"><SectionHeading eyebrow="Browse the catalogue" title="Popular categories" action="View all categories" onAction={() => navigate('/products')} /><div className="reference-category-grid">{categories.slice(0, 8).map((category, index) => <button key={category} className={`reference-category reference-category-${index % 4}`} onClick={() => navigate(`/products?category=${encodeURIComponent(category)}`)}><span className="category-index">{String(index + 1).padStart(2, '0')}</span><span className="category-art"><CircuitIcon index={index} /></span><strong>{category}</strong><small>{products.filter((product) => product.category === category).length} products <ArrowRight size={13} /></small></button>)}</div></div></section>
    {shelf("Trending now", "Popular with builders", trending.length ? trending : stocked, "Shop trending", "sort=featured")}
    <section className="reference-brands section container"><SectionHeading eyebrow="Trusted parts, thoughtfully selected" title="Shop by brand" action="View all products" onAction={() => navigate('/products')} /><div className="brand-chip-grid">{(brands.length ? brands : ['ESP32', 'Arduino', 'TP4056', 'LM386', 'TDA2030', 'NE555']).map((brand, index) => <button key={brand} onClick={() => navigate(`/products?search=${encodeURIComponent(brand)}`)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{brand}</strong><ArrowRight size={15} className="arrow-diagonal" /></button>)}</div></section>
    <section className="reference-about"><div className="container reference-about-grid"><div><div className="eyebrow"><span className="eyebrow-line" /> Electronics Dokan</div><h2>Your local source for <em>better builds.</em></h2></div><div><p>Electronics Dokan is an online electronics shop from Phultala, Khulna. We bring together development boards, modules, sensors, components, tools and test equipment for school projects, prototypes, repairs and everyday maker work.</p><button className="text-link" onClick={() => navigate('/products')}>Explore the catalogue <ArrowRight size={15} /></button></div></div></section>
    <section className="reference-service-strip"><div className="container reference-service-grid"><div><BadgeCheck size={20} /><strong>Carefully selected</strong><span>Practical parts, clear pricing</span></div><div><Truck size={20} /><strong>Delivery nationwide</strong><span>Fixed courier options at checkout</span></div><div><MessageCircle size={20} /><strong>WhatsApp support</strong><span>Get help before you order</span></div><div><Zap size={20} /><strong>Build with confidence</strong><span>Beginner-friendly catalogue</span></div></div></section>
  </div>;
}
function CircuitIcon({ index }: { index: number }) { const icons = [<><circle cx="32" cy="32" r="18" /><path d="M14 32h-7M50 32h7M32 14V7M32 50v7" /><circle cx="32" cy="32" r="5" /></>, <><rect x="13" y="13" width="38" height="38" rx="4" /><path d="M20 7v6M28 7v6M36 7v6M44 7v6M20 51v6M28 51v6M36 51v6M44 51v6" /><circle cx="32" cy="32" r="8" /></>, <><path d="M11 42V22l21-11 21 11v20L32 53z" /><path d="M22 37h20M22 29h20M32 11v42" /></>, <><path d="M8 42h48M13 42V24h38v18M20 24V13h24v11M28 13v-6h8v6" /><circle cx="22" cy="33" r="3" /><circle cx="42" cy="33" r="3" /></>]; return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icons[index % icons.length]}</svg>; }
function ArrowUpRight() { return <ArrowRight size={15} className="arrow-diagonal" />; }

function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) { return <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> {eyebrow}</div><h2>{title}</h2></div>{action && <button className="text-link" onClick={onAction}>{action} <ArrowRight size={15} /></button>}</div>; }

function ProductGrid({ products, navigate, addToCart }: { products: Product[]; navigate: (path: string) => void; addToCart: (id: string, qty?: number) => void }) { return products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} navigate={navigate} addToCart={addToCart} />)}</div> : <EmptyState title="No products here yet" copy="Check back soon for fresh stock." />; }
function ProductCard({ product, navigate, addToCart }: { product: Product; navigate: (path: string) => void; addToCart: (id: string, qty?: number, variantId?: string) => void }) {
  const hasVariants = product.variants?.length > 0;
  const src = imageFor(product);
  return <article className="product-card"><button className="product-image-wrap" onClick={() => navigate(`/product/${product.slug}`)} aria-label={`View ${product.name}`}><div className="product-image-bg" /><img src={src} alt={product.name} loading="lazy" onError={(event) => { console.warn(`[Electronics Dokan] Missing image: ${src}`); event.currentTarget.src = "/images/placeholders/product-placeholder.webp"; }} /><span className="image-view">View details <ArrowUpRight /></span></button><div className="product-card-body"><div className="product-meta"><span>{product.category}</span><span className={product.stock ? "stock-in" : "stock-out"}><i />{product.stock ? (hasVariants ? `${product.variants.length} variants` : "In stock") : "Out of stock"}</span></div><button className="product-name" onClick={() => navigate(`/product/${product.slug}`)}>{product.name}</button><p className="product-short">{product.shortDescription}</p><div className="product-bottom"><div className="price-wrap"><strong>{hasVariants ? `Starting from ${formatBDT(productPrice(product))}` : formatBDT(product.price)}</strong>{hasVariants && <small className="unit-label">{priceUnitLabel(product.variants[0]?.priceUnit)}</small>}</div><button className="add-button" onClick={() => hasVariants ? navigate(`/product/${product.slug}`) : addToCart(product.id)} disabled={!product.stock} aria-label={hasVariants ? `Choose a variant of ${product.name}` : `Add ${product.name} to cart`}>{hasVariants ? <ArrowRight size={18} /> : <Plus size={18} />}</button></div></div></article>; }

function ProductsPage({ products, navigate, addToCart }: { products: Product[]; navigate: (path: string) => void; addToCart: (id: string, qty?: number) => void }) {
  const params = new URLSearchParams(window.location.search);
  const search = (params.get("search") || "").toLowerCase();
  const categoryParam = params.get("category") || "All products";
  const sortParam = params.get("sort") || "featured";
  const categories = ["All products", ...Array.from(new Set(products.map((p) => p.category))).sort()];
  const filtered = useMemo(() => products.filter((product) => {
    const matchesCategory = categoryParam === "All products" || product.category === categoryParam;
    const haystack = [product.name, product.id, product.sku, product.category, product.brand, product.description, product.shortDescription, ...(product.keywords || []), ...(product.variants || []).flatMap((v) => [v.displayName, v.resistance, v.capacitance, v.voltage, v.powerRating, v.tolerance, v.marking])].filter(Boolean).join(" ").toLowerCase();
    return matchesCategory && (!search || haystack.includes(search));
  }).sort((a, b) => sortParam === "price-low" ? a.price - b.price : sortParam === "price-high" ? b.price - a.price : sortParam === "new" ? Number(b.newArrival) - Number(a.newArrival) : sortParam === "deals" ? percentOff(b) - percentOff(a) : Number(b.featured) - Number(a.featured)), [products, search, categoryParam, sortParam]);
  const setFilter = (key: string, value: string) => { const next = new URLSearchParams(window.location.search); if (value && value !== "All products" && value !== "featured") next.set(key, value); else next.delete(key); navigate(`/products${next.toString() ? `?${next.toString()}` : ""}`); };
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><span>Shop all products</span></div><div className="container page-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> The complete workbench</div><h1>{categoryParam === "All products" ? "All products" : categoryParam}</h1><p>{search ? <>Showing results for <strong>“{search}”</strong></> : "Everything you need to go from first sketch to final build."}</p></div><span className="result-count">{filtered.length} {filtered.length === 1 ? "product" : "products"}</span></div><div className="container shop-layout"><aside className="shop-sidebar"><div className="sidebar-title"><span><SlidersHorizontal size={17} /> Filter by category</span><span className="sidebar-count">{products.length}</span></div>{categories.map((category) => <button key={category} className={categoryParam === category ? "active" : ""} onClick={() => setFilter("category", category)}>{category}<span>{products.filter((p) => category === "All products" || p.category === category).length}</span></button>)}<div className="sidebar-help"><CircleHelp size={17} /><div><b>Need a hand?</b><p>Message us with your project brief.</p><a href="https://wa.me/8801938640733" target="_blank" rel="noreferrer">Ask on WhatsApp <ArrowRight size={13} /></a></div></div></aside><div className="shop-results"><div className="shop-toolbar"><div className="mobile-filter-label"><Filter size={16} /> {categoryParam}</div><span className="toolbar-result">{search ? `Search results · ${filtered.length}` : `${filtered.length} items`}</span><label className="sort-select"><span>Sort by</span><select value={sortParam} onChange={(event) => setFilter("sort", event.target.value)}><option value="featured">Featured</option><option value="new">Newest first</option><option value="deals">Best deals</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select><ChevronDown size={15} /></label></div>{filtered.length ? <div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} navigate={navigate} addToCart={addToCart} />)}</div> : <EmptyState title="No matching products" copy="Try a broader search or browse another category." action="Clear filters" onAction={() => navigate("/products")} />}</div></div></div>;
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
${product.name}${selected ? ` — ${selected.displayName}` : ""}`;
  const buyNow = () => { addToCart(product.id, quantity, selectedId || undefined); navigate("/checkout"); };
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><button onClick={() => navigate(`/products?category=${encodeURIComponent(product.category)}`)}>{product.category}</button><ChevronRight size={14} /><span>{product.name}</span></div><section className="container product-detail"><div className="gallery"><div className="gallery-main"><div className="product-image-bg" /><img src={src} alt={`${product.name}${selected ? ` — ${selected.displayName}` : ""}`} onError={(event) => { console.warn(`[Electronics Dokan] Missing image: ${src}`); event.currentTarget.src = "/images/placeholders/product-placeholder.webp"; }} /></div></div><div className="detail-copy"><div className="product-meta"><span>{product.category} · {product.sku || product.id}</span><span className="stock-in"><i /> {product.stockStatus || "Available to order"}</span></div><h1>{product.name}</h1><p className="sku">SKU: <strong>{product.sku || "Not specified"}</strong> · {product.variants?.length || 0} selectable variants</p><div className="detail-price"><strong>{formatBDT(selected?.price ?? productPrice(product))}</strong><span className="unit-label">{priceUnitLabel(unit)}</span>{!selected && product.variants?.length > 0 && <small>Starting price</small>}</div><p className="detail-description">{product.description}</p>{product.variants?.length > 0 && <div className="variant-panel"><div className="variant-heading"><div><b>Choose a value or rating</b><small>{visible.length} of {product.variants.length} variants · duplicate source rows are preserved</small></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search value..." aria-label="Search variants" /></div><div className="variant-list">{visible.map((variant) => <button key={variant.variantId} className={`variant-option ${selectedId === variant.variantId ? "active" : ""}`} onClick={() => { setSelectedId(variant.variantId); setQuantity(1); }}><span><strong>{variant.displayName}</strong><small>{variant.resistance || variant.capacitance || variant.marking || ""}{variant.powerRating ? ` · ${variant.powerRating}` : ""}{variant.tolerance ? ` · ${variant.tolerance}` : ""}</small></span><span><b>{formatBDT(variant.price)}</b><small>{priceUnitLabel(variant.priceUnit)} · {variant.stockQuantity} pcs</small></span></button>)}</div></div>}<div className="detail-rule" /><div className="detail-actions"><div className="quantity-control"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={15} /></button><b>{quantity}</b><button onClick={() => setQuantity(Math.min(maxQty, quantity + 1))} disabled={quantity >= maxQty}><Plus size={15} /></button></div><button className="button button-secondary" disabled={Boolean(product.variants?.length && !selected)} onClick={() => addToCart(product.id, quantity, selectedId || undefined)}><ShoppingCart size={17} /> Add to cart</button><button className="button button-primary" disabled={Boolean(product.variants?.length && !selected)} onClick={buyNow}>Buy now <ArrowRight size={17} /></button></div><a className="ask-link" href={`https://wa.me/8801938640733?text=${encodeURIComponent(askMessage)}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Have a question? Ask on WhatsApp</a><div className="shipping-note"><div><Truck size={17} /><span><b>Delivery across Bangladesh</b><small>Choose a courier at checkout</small></span></div><div><PackageCheck size={17} /><span><b>Ships with care</b><small>Bangladesh Post Office / Steadfast</small></span></div></div></div></section><section className="container detail-lower"><div className="detail-panel"><div className="panel-heading"><h2>Specifications</h2><span>Technical details</span></div><div className="spec-grid"><div><span>Availability</span><b>{product.stockStatus || "Available to order"}</b></div><div><span>SKU</span><b>{product.sku || "Not specified"}</b></div><div><span>Source item</span><b>#{product.sourceOrder}</b></div>{selected && Object.entries(selected).filter(([key]) => ["capacitance","voltage","resistance","powerRating","tolerance","marking"].includes(key) && Boolean(selected[key as keyof Variant])).map(([key, value]) => <div key={key}><span>{key}</span><b>{String(value)}</b></div>)}</div></div></section>{related.length > 0 && <section className="section container related-section"><SectionHeading eyebrow="Keep building" title="You may also like" /><ProductGrid products={related} navigate={navigate} addToCart={addToCart} /></section>}</div>;
}

function CartPage({ products, cart, site, navigate, updateQty, removeFromCart }: { products: Product[]; cart: CartLine[]; site: SiteConfig; navigate: (path: string) => void; updateQty: (id: string, qty: number, variantId?: string) => void; removeFromCart: (id: string, variantId?: string) => void }) {
  const lines = cart.map((line) => ({ ...line, product: products.find((product) => product.id === line.productId), variant: products.find((product) => product.id === line.productId)?.variants?.find((v) => v.variantId === line.variantId) })).filter((line) => line.product) as Array<CartLine & { product: Product; variant: Variant | undefined }>;
  const subtotal = lines.reduce((sum, line) => sum + (line.variant?.price ?? line.product.price) * line.qty, 0);
  const delivery = 0;
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><span>Your cart</span></div><div className="container page-intro cart-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> Ready when you are</div><h1>Your cart</h1><p>{lines.length ? "Review your components before heading to checkout." : "Your next project starts here."}</p></div><span className="result-count">{cart.reduce((sum, line) => sum + line.qty, 0)} items</span></div>{!lines.length ? <div className="container"><EmptyState title="Your cart is waiting for a good idea" copy="Browse the collection and add the parts that bring your project to life." action="Start shopping" onAction={() => navigate("/products")} /></div> : <div className="container cart-layout"><div className="cart-lines">{lines.map(({ product, variant, qty }) => <div className="cart-line" key={`${product.id}-${variant?.variantId || "base"}`}><button className="cart-line-image" onClick={() => navigate(`/product/${product.slug}`)}><img src={imageFor(product, variant?.variantId)} alt="" /></button><div className="cart-line-copy"><div className="product-meta"><span>{product.category}</span><span className="stock-in"><i /> In stock</span></div><button className="cart-line-name" onClick={() => navigate(`/product/${product.slug}`)}>{product.name}{variant && <small>— {variant.displayName}</small>}</button><span className="cart-line-price">{formatBDT(variant?.price ?? product.price)} · {priceUnitLabel(variant?.priceUnit)}</span><small>{variant ? `SKU ${variant.variantId}` : product.sku || product.id}</small></div><div className="quantity-control"><button onClick={() => updateQty(product.id, qty - 1, variant?.variantId)}><Minus size={14} /></button><b>{qty}</b><button onClick={() => updateQty(product.id, qty + 1, variant?.variantId)} disabled={Boolean(variant && qty >= (variant.priceUnit === "per_2_pieces" ? Math.floor(variant.stockQuantity / 2) : variant.stockQuantity))}><Plus size={14} /></button></div><strong className="cart-line-total">{formatBDT((variant?.price ?? product.price) * qty)}</strong><button className="remove-line" onClick={() => removeFromCart(product.id, variant?.variantId)} aria-label="Remove item"><X size={17} /></button></div>)}<button className="continue-shopping" onClick={() => navigate("/products")}><ArrowLeft size={15} /> Continue shopping</button></div><OrderSummary subtotal={subtotal} delivery={delivery} site={site} navigate={navigate} /></div>}</div>;
}

function OrderSummary({ subtotal, delivery, site, navigate, checkout = true }: { subtotal: number; delivery: number; site: SiteConfig; navigate: (path: string) => void; checkout?: boolean }) { return <aside className="order-summary"><div className="summary-heading"><h2>Order summary</h2><span>BDT</span></div><div className="summary-row"><span>Subtotal</span><b>{formatBDT(subtotal)}</b></div><div className="summary-row"><span>Delivery <small>Select courier at checkout</small></span><b>{delivery ? formatBDT(delivery) : "—"}</b></div><div className="summary-rule" /><div className="summary-row summary-total"><span>Total</span><b>{formatBDT(subtotal + delivery)}</b></div><p className="summary-note"><Truck size={15} /> Courier and delivery charge are selected at checkout.</p>{checkout && <button className="button button-primary summary-button" onClick={() => navigate("/checkout")}>Go to checkout <ArrowRight size={17} /></button>}<p className="summary-trust"><BadgeCheck size={14} /> Secure guest checkout · No account required</p></aside>; }

function CheckoutPage({ products, cart, site, locations, navigate }: { products: Product[]; cart: CartLine[]; site: SiteConfig; locations: LocationData | null; navigate: (path: string) => void }) {
  const lines = cart.map((line) => ({ ...line, product: products.find((product) => product.id === line.productId), variant: products.find((product) => product.id === line.productId)?.variants?.find((v) => v.variantId === line.variantId) })).filter((line) => line.product) as Array<CartLine & { product: Product; variant: Variant | undefined }>;
  const subtotal = lines.reduce((sum, line) => sum + (line.variant?.price ?? line.product.price) * line.qty, 0);
  const [form, setForm] = useState<CheckoutForm>({ fullName: "", mobile: "", altMobile: "", division: "", district: "", upazila: "", postOffice: "", postCode: "", fullAddress: "", area: "", note: "", courierId: "" });
  const [error, setError] = useState("");
  const divisionData = locations?.divisions.find((item) => item.name === form.division);
  const districtData = divisionData?.districts.find((item) => item.name === form.district);
  const upazilaData = districtData?.upazilas.find((item) => item.name === form.upazila);
  const selectedCourier = site.shipping.couriers.find((courier) => courier.id === form.courierId);
  const delivery = selectedCourier?.deliveryCharge || 0;
  const setField = (key: keyof CheckoutForm, value: string) => setForm((current) => ({ ...current, [key]: value, ...(key === "division" ? { district: "", upazila: "", postOffice: "", postCode: "" } : {}), ...(key === "district" ? { upazila: "", postOffice: "", postCode: "" } : {}), ...(key === "upazila" ? { postOffice: "", postCode: "" } : {}), ...(key === "postOffice" ? { postCode: upazilaData?.postOffices.find((office) => office.name === value)?.postCode || "" } : {}) }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const required: Array<keyof CheckoutForm> = ["fullName", "mobile", "division", "district", "upazila", "postOffice", "postCode", "fullAddress", "area", "courierId"];
    if (required.some((key) => !form[key].trim())) { setError("Please complete all required delivery details before continuing."); return; }
    if (!/^01\d{9}$/.test(form.mobile.replace(/\s+/g, ""))) { setError("Please enter a valid Bangladesh mobile number, for example 01912345678."); return; }
    const linesText = lines.map((line, index) => `${index + 1}. ${line.product.name}${line.variant ? ` — ${line.variant.displayName}` : ""}\nVariant ID: ${line.variant?.variantId || line.product.sku || line.product.id}\nQty: ${line.qty}\nPrice: ${formatBDT(line.variant?.price ?? line.product.price)} (${priceUnitLabel(line.variant?.priceUnit)})\nSubtotal: ${formatBDT((line.variant?.price ?? line.product.price) * line.qty)}`).join("\n\n");
    const message = `NEW ORDER — ELECTRONICS DOKAN\n\nORDER ITEMS\n${linesText}\n\n-------------------------\nCourier: ${selectedCourier?.name || "—"}\nDelivery Charge: ${formatBDT(delivery)}\nSubtotal: ${formatBDT(subtotal)}\nDelivery: ${formatBDT(delivery)}\nTOTAL: ${formatBDT(subtotal + delivery)}\n-------------------------\n\nCUSTOMER INFORMATION\nName: ${form.fullName}\nMobile: ${form.mobile}\nAlternative Mobile: ${form.altMobile || "—"}\nDivision: ${form.division}\nDistrict: ${form.district}\nUpazila: ${form.upazila}\nPost Office: ${form.postOffice}\nPost Code: ${form.postCode}\nArea / Village / Road / House: ${form.area}\nFull Address: ${form.fullAddress}\nCustomer Note: ${form.note || "—"}`;
    window.open(`https://wa.me/${site.whatsappInternational}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };
  if (!lines.length) return <div className="page-wrap"><div className="container"><EmptyState title="Your cart is empty" copy="Add a product before starting checkout." action="Browse products" onAction={() => navigate("/products")} /></div></div>;
  return <div className="page-wrap"><div className="container breadcrumb"><button onClick={() => navigate("/cart")}>Cart</button><ChevronRight size={14} /><span>Guest checkout</span></div><div className="container page-intro checkout-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> One simple step</div><h1>Checkout</h1><p>Enter your delivery details. We’ll open WhatsApp with your order ready to send.</p></div><span className="checkout-safe"><BadgeCheck size={17} /> No account needed</span></div><form className="container checkout-layout" onSubmit={submit}><div className="checkout-form"><section className="form-section"><div className="form-heading"><span>01</span><div><h2>Your details</h2><p>How can we reach you?</p></div></div><div className="form-grid two"><Field label="Full name" required value={form.fullName} onChange={(value) => setField("fullName", value)} placeholder="e.g. Rahim Ahmed" /><Field label="Mobile number" required value={form.mobile} onChange={(value) => setField("mobile", value)} placeholder="01XXXXXXXXX" type="tel" /><Field label="Alternative mobile" value={form.altMobile} onChange={(value) => setField("altMobile", value)} placeholder="Optional" type="tel" /></div></section><section className="form-section"><div className="form-heading"><span>02</span><div><h2>Delivery address</h2><p>Select your location from the local Bangladesh dataset.</p></div></div><div className="form-grid two"><SelectField label="Division" required value={form.division} onChange={(value) => setField("division", value)} options={locations?.divisions.map((item) => item.name) || []} placeholder="Select division" /><SelectField label="District" required value={form.district} onChange={(value) => setField("district", value)} options={divisionData?.districts.map((item) => item.name) || []} placeholder="Select district" disabled={!form.division} /><SelectField label="Upazila / Thana" required value={form.upazila} onChange={(value) => setField("upazila", value)} options={districtData?.upazilas.map((item) => item.name) || []} placeholder="Select upazila" disabled={!form.district} /><SelectField label="Post office" required value={form.postOffice} onChange={(value) => setField("postOffice", value)} options={upazilaData?.postOffices.map((item) => item.name) || []} placeholder="Select post office" disabled={!form.upazila} /><Field label="Post code" required value={form.postCode} onChange={(value) => setField("postCode", value)} placeholder="Auto-filled from post office" readOnly /><Field label="Area / Village / Road / House" required value={form.area} onChange={(value) => setField("area", value)} placeholder="e.g. College Road, Ward 4" /><Field label="Full address" required value={form.fullAddress} onChange={(value) => setField("fullAddress", value)} placeholder="House, road, landmark and any useful directions" wide textarea /></div></section><section className="form-section"><div className="form-heading"><span>03</span><div><h2>Choose courier</h2><p>Select one delivery service. Charges are fixed nationwide.</p></div></div><div className="courier-options">{site.shipping.couriers.map((courier) => <label className={`courier-option ${form.courierId === courier.id ? "selected" : ""}`} key={courier.id}><input type="radio" name="courier" value={courier.id} checked={form.courierId === courier.id} onChange={() => setField("courierId", courier.id)} /><span><b>{courier.name}</b><small>Fixed nationwide delivery charge</small></span><strong>{formatBDT(courier.deliveryCharge)}</strong></label>)}</div></section><section className="form-section"><div className="form-heading"><span>04</span><div><h2>Anything else?</h2><p>Optional note for our team.</p></div></div><Field label="Customer note" value={form.note} onChange={(value) => setField("note", value)} placeholder="Delivery preference, project context, or a question" textarea />{error && <div className="form-error">{error}</div>}<button className="button button-whatsapp submit-order" type="submit"><MessageCircle size={18} /> Place order via WhatsApp <ArrowRight size={17} /></button><p className="form-disclaimer">Your information is used only to prepare this WhatsApp order and is not saved by the website.</p></section></div><aside className="checkout-side"><div className="checkout-summary"><div className="summary-heading"><h2>Your order</h2><button type="button" onClick={() => navigate("/cart")}>Edit cart</button></div>{lines.map((line) => <div className="checkout-line" key={`${line.product.id}-${line.variant?.variantId || "base"}`}><span className="checkout-line-thumb"><img src={imageFor(line.product, line.variant?.variantId)} alt="" /><b>{line.qty}</b></span><span>{line.product.name}{line.variant && <small> — {line.variant.displayName}</small>}</span><strong>{formatBDT((line.variant?.price ?? line.product.price) * line.qty)}</strong></div>)}<div className="summary-rule" /><div className="summary-row"><span>Subtotal</span><b>{formatBDT(subtotal)}</b></div><div className="summary-row"><span>Delivery <small>{selectedCourier?.name || "Select courier"}</small></span><b>{formatBDT(delivery)}</b></div><div className="summary-row summary-total"><span>Total</span><b>{formatBDT(subtotal + delivery)}</b></div></div><div className="checkout-benefits"><div><ShieldIcon /><span><b>Guest checkout</b><small>No login or account required</small></span></div><div><MessageCircle size={18} /><span><b>Direct to WhatsApp</b><small>Your order opens ready to send</small></span></div><div><Truck size={18} /><span><b>Tracked delivery</b><small>Bangladesh Post Office / Steadfast</small></span></div></div></aside></form></div>;
}

function ShieldIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z" /><path d="m8.5 12 2.2 2.2 4.8-4.8" /></svg>; }
function Field({ label, required, value, onChange, placeholder, type = "text", textarea = false, wide = false, readOnly = false }: { label: string; required?: boolean; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; textarea?: boolean; wide?: boolean; readOnly?: boolean }) { return <label className={`field ${wide ? "field-wide" : ""}`}><span>{label}{required && <b>*</b>}</span>{textarea ? <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} /> : <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} readOnly={readOnly} />}</label>; }
function SelectField({ label, required, value, onChange, options, placeholder, disabled }: { label: string; required?: boolean; value: string; onChange: (value: string) => void; options: string[]; placeholder: string; disabled?: boolean }) { return <label className="field"><span>{label}{required && <b>*</b>}</span><span className="select-wrap"><select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown size={15} /></span></label>; }

function InfoPage({ path, site, navigate }: { path: string; site: SiteConfig; navigate: (path: string) => void }) { const pages: Record<string, { title: string; eyebrow: string; intro: string; sections: Array<[string, string]> }> = { "/shipping": { title: "Shipping information", eyebrow: "Delivery, clearly explained", intro: "We deliver electronics across Bangladesh with a simple, transparent process.", sections: [["Delivery charges", `Bangladesh Post Office: ${formatBDT(site.shipping.couriers[0]?.deliveryCharge || 20)}. Steadfast Courier: ${formatBDT(site.shipping.couriers[1]?.deliveryCharge || 120)}. The selected courier and fixed nationwide charge are shown before you place your WhatsApp order.`], ["How it works", "Choose your products, complete the guest checkout form, and your order opens in WhatsApp. Our team confirms availability and dispatch details there."], ["Courier partners", "Bangladesh Post Office and Steadfast Courier are the available delivery services. The charge depends only on the selected courier, not on your division, district or address."]] }, "/returns": { title: "Return & refund", eyebrow: "A fair way to make it right", intro: "If something arrives damaged or doesn’t match your order, please contact us promptly.", sections: [["Contact us first", "Send a photo and your order conversation to our WhatsApp number within 48 hours of delivery so we can understand what happened."], ["Eligible situations", "We review damaged-on-arrival items, incorrect items and demonstrably faulty components. Please keep the packaging and the item until the review is complete."], ["Resolution", "Depending on the situation, we may arrange a replacement, exchange or refund. Final decisions are made after a quick inspection and confirmation with you."]] }, "/privacy": { title: "Privacy", eyebrow: "Simple by design", intro: "Electronics Dokan is a static storefront. We do not create customer accounts or keep an order database.", sections: [["What the site uses", "Your cart is held in your browser’s localStorage so it survives a refresh. Checkout details stay in the page while you prepare an order and are passed to WhatsApp only when you choose to open it."], ["What we don’t do", "We do not sell, rent or permanently store checkout information through this website. WhatsApp has its own privacy practices once you leave the site."], ["Questions", `For questions about this policy, contact ${site.whatsapp} on WhatsApp or email ${site.support.email}.`]] }, "/terms": { title: "Terms", eyebrow: "A clear agreement", intro: "By using this website, you agree to use it to browse products and prepare genuine purchase enquiries.", sections: [["Product information", "We work to keep prices, availability and specifications accurate. Availability is confirmed by our team before dispatch."], ["Orders", "A WhatsApp order is an enquiry until our team confirms the products, delivery charge and timing with you."], ["Use of the website", "Please do not misuse the site, attempt to disrupt it or submit someone else’s personal information without permission."]] }, "/contact": { title: "Contact us", eyebrow: "A real person is nearby", intro: "Send us your project, your question or a photo of the part you’re looking for.", sections: [["WhatsApp", `Chat with us at ${site.whatsapp}. We’re available ${site.support.hours}.`], ["Where we are", site.address], ["Social", "Follow Electronics Dokan on Facebook, TikTok and YouTube for new stock, build ideas and updates."]] } }; const page = pages[path]; return <div className="page-wrap info-page"><div className="container breadcrumb"><button onClick={() => navigate("/")}>Home</button><ChevronRight size={14} /><span>{page.title}</span></div><div className="container info-hero"><div className="eyebrow"><span className="eyebrow-line" /> {page.eyebrow}</div><h1>{page.title}</h1><p>{page.intro}</p></div><div className="container info-content">{page.sections.map(([title, copy]) => <section key={title}><h2>{title}</h2><p>{copy}</p></section>)}<a className="button button-primary" href={`https://wa.me/${site.whatsappInternational}`} target="_blank" rel="noreferrer">Chat on WhatsApp <ArrowRight size={17} /></a></div></div>; }
function EmptyState({ title, copy, action, onAction }: { title: string; copy: string; action?: string; onAction?: () => void }) { return <div className="empty-state"><span className="empty-icon"><ShoppingBag size={25} /></span><h2>{title}</h2><p>{copy}</p>{action && <button className="button button-primary" onClick={onAction}>{action} <ArrowRight size={16} /></button>}</div>; }
function LoadingState() { return <div className="loading-state"><span className="loader-mark"><Zap size={20} fill="currentColor" /></span><p>Setting up your workbench…</p></div>; }
function NotFoundPage({ navigate }: { navigate: (path: string) => void }) { return <div className="page-wrap"><div className="container not-found"><span className="not-found-number">404</span><div className="eyebrow"><span className="eyebrow-line" /> That path is empty</div><h1>Nothing to see<br /><em>here.</em></h1><p>The page you’re looking for may have moved, or the build needs a fresh start.</p><button className="button button-primary" onClick={() => navigate("/")}>Back to home <ArrowRight size={16} /></button></div></div>; }

export default App;
