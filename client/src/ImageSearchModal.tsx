import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, FileUp, LoaderCircle, RefreshCw, Search, Upload, X } from "lucide-react";

export type ImageSearchProduct = {
  id: string;
  slug: string;
  name: string;
  nameBn?: string;
  price: number;
  priceDisplay?: string;
  category: string;
  brand?: string;
  sku?: string;
  image?: string;
  images?: string[];
  variants?: Array<{ variantId: string; displayName?: string; productFamily?: string; marking?: string; voltage?: string; capacitance?: string }>;
  stock?: boolean;
  keywords?: string[];
  tags?: string[];
  specifications?: Record<string, string>;
  shortDescription?: string;
  shortDescriptionBn?: string;
  description?: string;
};

type SearchResult = { product: ImageSearchProduct; score: number; evidence: string[] };

type Props = {
  open: boolean;
  products: ImageSearchProduct[];
  language: "en" | "bn";
  onClose: () => void;
  navigate: (path: string) => void;
  addToCart: (productId: string, variantId?: string, source?: HTMLElement) => void;
};

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_PROCESSING_DIMENSION = 1600;
const englishStopWords = new Set(["the", "and", "with", "for", "module", "board", "piece", "pcs", "electronics"]);

const normalize = (value: string) => value.toLocaleLowerCase().normalize("NFKC").replace(/[–—−]/g, "-").replace(/[^a-z0-9\u0980-\u09ff]+/g, " ").replace(/\s+/g, " ").trim();
const tokens = (value: string) => normalize(value).split(" ").filter((token) => token.length > 1 && !englishStopWords.has(token));
const compactModel = (value: string) => normalize(value).replace(/[^a-z0-9]+/g, "");
const imageFor = (product: ImageSearchProduct) => {
  const image = product.images?.[0] || product.image;
  if (!image) return "/images/placeholders/product-placeholder.webp";
  if (/^https?:\/\//i.test(image) || image.startsWith("/")) return image;
  return `/images/products/${image}`;
};
const priceLabel = (product: ImageSearchProduct) => product.priceDisplay || `৳${new Intl.NumberFormat("en-BD").format(product.price)}`;

function catalogueMatch(products: ImageSearchProduct[], query: string, language: "en" | "bn"): SearchResult[] {
  const queryNormalized = normalize(query);
  const queryTokens = tokens(query);
  if (!queryTokens.length) return [];
  return products.map((product) => {
    const searchable = normalize([
      product.name, product.nameBn, product.sku, product.category, product.brand,
      ...(product.keywords || []), ...(product.tags || []), product.shortDescription,
      product.shortDescriptionBn, product.description,
      ...Object.entries(product.specifications || {}).flatMap(([key, value]) => [key, value]),
      ...(product.variants || []).flatMap((variant) => [variant.displayName, variant.productFamily, variant.marking, variant.voltage, variant.capacitance]),
    ].filter(Boolean).join(" "));
    const compactSearchable = compactModel(searchable);
    const nameText = normalize(`${product.name} ${product.nameBn || ""}`);
    const skuText = normalize(product.sku || "");
    const categoryText = normalize(product.category);
    let score = 0;
    const evidence: string[] = [];
    if (queryNormalized.length >= 3 && skuText && (skuText === queryNormalized || skuText.includes(queryNormalized))) {
      score += 130;
      evidence.push(language === "bn" ? "মডেল/SKU মিল" : "Model/SKU match");
    }
    if (queryNormalized.length >= 3 && nameText.includes(queryNormalized)) {
      score += nameText.startsWith(queryNormalized) ? 90 : 65;
      evidence.push(language === "bn" ? "নামে মিল" : "Name match");
    }
    const compactQuery = compactModel(queryNormalized);
    if (compactQuery.length >= 4 && compactSearchable.includes(compactQuery) && !nameText.includes(queryNormalized)) {
      score += 115;
      evidence.push(language === "bn" ? "মডেল text মিল" : "Model text match");
    }
    let matchedTokens = 0;
    for (const token of queryTokens) {
      if (searchable.split(" ").includes(token)) matchedTokens += 1;
      else if (token.length >= 4 && searchable.includes(token)) matchedTokens += 0.6;
    }
    if (matchedTokens) {
      score += Math.round(matchedTokens * 18);
      evidence.push(language === "bn" ? "keyword মিল" : "Keyword match");
    }
    if (queryTokens.some((token) => categoryText.includes(token))) {
      score += 12;
      evidence.push(language === "bn" ? "category মিল" : "Category match");
    }
    return { product, score, evidence: Array.from(new Set(evidence)) };
  }).filter((result) => {
    // Do not turn one noisy OCR word such as “battery” into a misleading product match.
    const hasDirectIdentity = result.evidence.some((item) => item.includes("SKU") || item.includes("Name match") || item.includes("Model text") || item.includes("মডেল text") || item.includes("নামে"));
    const hasMultipleSignals = result.score >= 36 && result.evidence.some((item) => item.includes("keyword") || item.includes("মিল"));
    return hasDirectIdentity || hasMultipleSignals;
  }).sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name)).slice(0, 8);
}

type VisualFeature = { product: ImageSearchProduct; pixels: number[]; edges: number[] };

function featureFromCanvas(canvas: HTMLCanvasElement): Omit<VisualFeature, "product"> {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable in this browser.");
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const grayscale: number[] = [];
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] / 255;
    const green = pixels[index + 1] / 255;
    const blue = pixels[index + 2] / 255;
    grayscale.push(red * 0.299 + green * 0.587 + blue * 0.114);
  }
  const mean = grayscale.reduce((sum, value) => sum + value, 0) / Math.max(1, grayscale.length);
  const deviation = Math.sqrt(grayscale.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / Math.max(1, grayscale.length)) || 0.25;
  const normalized = grayscale.map((value) => Math.max(0, Math.min(1, ((value - mean) / (deviation * 2)) + 0.5)));
  const width = canvas.width;
  const edges = normalized.map((value, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const right = x < width - 1 ? normalized[index + 1] : value;
    const below = y < canvas.height - 1 ? normalized[index + width] : value;
    return Math.min(1, Math.abs(right - value) + Math.abs(below - value));
  });
  return { pixels: normalized, edges };
}

async function loadVisualFeature(product: ImageSearchProduct): Promise<VisualFeature | null> {
  try {
    const image = new Image();
    image.decoding = "async";
    const loaded = new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("image")); });
    image.src = imageFor(product);
    await loaded;
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, 32, 32);
    const scale = Math.min(32 / image.naturalWidth, 32 / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.drawImage(image, (32 - width) / 2, (32 - height) / 2, width, height);
    return { product, ...featureFromCanvas(canvas) };
  } catch {
    return null;
  }
}

function compareFeatures(left: Omit<VisualFeature, "product">, right: Omit<VisualFeature, "product">) {
  const pixelError = left.pixels.reduce((total, value, index) => total + Math.abs(value - right.pixels[index]), 0) / Math.max(1, left.pixels.length);
  const edgeError = left.edges.reduce((total, value, index) => total + Math.abs(value - right.edges[index]), 0) / Math.max(1, left.edges.length);
  return Math.max(0, Math.min(100, Math.round((1 - (pixelError * 0.55 + edgeError * 0.45)) * 100)));
}

async function visualCatalogueMatch(file: File, products: ImageSearchProduct[], onProgress: (message: string) => void): Promise<SearchResult[]> {
  const sourceCanvas = await prepareImage(file);
  const uploadedCanvas = document.createElement("canvas");
  uploadedCanvas.width = 32;
  uploadedCanvas.height = 32;
  const uploadedContext = uploadedCanvas.getContext("2d");
  if (!uploadedContext) throw new Error("Canvas is unavailable in this browser.");
  uploadedContext.fillStyle = "#fff";
  uploadedContext.fillRect(0, 0, 32, 32);
  const scale = Math.min(32 / sourceCanvas.width, 32 / sourceCanvas.height);
  const width = Math.max(1, Math.round(sourceCanvas.width * scale));
  const height = Math.max(1, Math.round(sourceCanvas.height * scale));
  uploadedContext.drawImage(sourceCanvas, (32 - width) / 2, (32 - height) / 2, width, height);
  const uploaded = featureFromCanvas(uploadedCanvas);
  const matches: SearchResult[] = [];
  for (let index = 0; index < products.length; index += 1) {
    const feature = await loadVisualFeature(products[index]);
    if (feature) {
      const similarity = compareFeatures(uploaded, feature);
      matches.push({ product: feature.product, score: similarity, evidence: [`Visual similarity · ${similarity}%`] });
    }
    if (index % 12 === 0 || index === products.length - 1) onProgress(`Comparing catalogue photos… ${Math.round(((index + 1) / products.length) * 100)}%`);
  }
  const ranked = matches.sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const runnerUp = ranked[1];
  const minimumScore = 82;
  const minimumMargin = 7;
  if (!best || best.score < minimumScore || (runnerUp && best.score - runnerUp.score < minimumMargin && best.score < 92)) return [];
  return ranked.slice(0, 3);
}

async function prepareImage(file: File, enhance = false): Promise<HTMLCanvasElement> {
  let source: { width: number; height: number; close?: () => void; draw: (context: CanvasRenderingContext2D, width: number, height: number) => void };
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    source = { width: bitmap.width, height: bitmap.height, close: () => bitmap.close(), draw: (context, width, height) => context.drawImage(bitmap, 0, 0, width, height) };
  } else {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("This image could not be decoded by the browser."));
        image.src = objectUrl;
      });
      source = { width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(objectUrl), draw: (context, width, height) => context.drawImage(image, 0, 0, width, height) };
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }
  const maxDimension = typeof window !== "undefined" && window.innerWidth <= 720 ? 1050 : MAX_PROCESSING_DIMENSION;
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable in this browser.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  source.draw(context, canvas.width, canvas.height);
  if (enhance) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const gray = Math.round(pixels.data[index] * 0.299 + pixels.data[index + 1] * 0.587 + pixels.data[index + 2] * 0.114);
      const contrast = Math.max(0, Math.min(255, Math.round((gray - 128) * 1.55 + 128)));
      pixels.data[index] = contrast;
      pixels.data[index + 1] = contrast;
      pixels.data[index + 2] = contrast;
    }
    context.putImageData(pixels, 0, 0);
  }
  source.close?.();
  return canvas;
}

async function recognizeLocally(file: File, onProgress: (message: string) => void): Promise<string> {
  const isSmallScreen = typeof window !== "undefined" && window.innerWidth <= 720;
  const canvases = isSmallScreen ? [await prepareImage(file)] : [await prepareImage(file), await prepareImage(file, true)];
  onProgress("Loading on-device OCR…");
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr",
    langPath: "/ocr",
    workerBlobURL: false,
    cachePath: "electronics-dokan-ocr",
    gzip: false,
    logger: (message: { status?: string; progress?: number }) => {
      if (message.status === "recognizing text" && typeof message.progress === "number") onProgress(`Reading label… ${Math.round(message.progress * 100)}%`);
      else if (message.status) onProgress(`${message.status}…`);
    },
  });
  try {
    const texts: string[] = [];
    for (let index = 0; index < canvases.length; index += 1) {
      onProgress(index === 0 ? "Reading label…" : "Enhancing label…");
      const result = await worker.recognize(canvases[index]);
      const text = result.data.text.replace(/\s+/g, " ").trim();
      if (text) texts.push(text);
    }
    return Array.from(new Set(texts.join(" ").split(" "))).join(" ").trim();
  } finally {
    await worker.terminate();
  }
}

export function ImageSearchModal({ open, products, language, onClose, navigate, addToCart }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [visualResults, setVisualResults] = useState<SearchResult[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const processingIdRef = useRef(0);
  const textResults = useMemo(() => catalogueMatch(products, ocrText, language), [products, ocrText, language]);
  const results = useMemo(() => {
    const byId = new Map(visualResults.map((result) => [result.product.id, result]));
    textResults.forEach((result) => {
      const visual = byId.get(result.product.id);
      byId.set(result.product.id, visual ? { ...result, score: result.score + visual.score, evidence: Array.from(new Set([...result.evidence, ...visual.evidence])) } : result);
    });
    return Array.from(byId.values()).sort((left, right) => right.score - left.score).slice(0, 8);
  }, [textResults, visualResults]);
  const isBn = language === "bn";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      processingIdRef.current += 1;
      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview("");
      setOcrText("");
      setStatus("idle");
      setStatusMessage("");
      setError("");
      setVisualResults([]);
      setDragging(false);
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, preview]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const closeModal = () => {
    processingIdRef.current += 1;
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setOcrText("");
    setStatus("idle");
    setStatusMessage("");
    setError("");
    setVisualResults([]);
    setDragging(false);
    onClose();
  };

  if (!open) return null;

  const acceptFile = async (candidate: File) => {
    const extension = candidate.name.split(".").pop()?.toLowerCase() || "";
    const acceptedExtension = ["jpg", "jpeg", "png", "webp"].includes(extension);
    const acceptedMime = ["image/jpeg", "image/png", "image/webp"].includes(candidate.type.toLowerCase());
    if (!(acceptedMime || acceptedExtension)) {
      setError(isBn ? "JPG, PNG, WEBP অথবা ফোনের camera image দিন।" : "Please choose a JPG, PNG, WEBP, or phone-camera image.");
      return;
    }
    if (candidate.size > MAX_IMAGE_BYTES) {
      setError(isBn ? "Image সর্বোচ্চ 15 MB হতে পারবে।" : "Images must be smaller than 15 MB.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
    setError("");
    setOcrText("");
    setVisualResults([]);
    setStatus("processing");
    setStatusMessage(isBn ? "আপনার device-এ image পড়া হচ্ছে…" : "Reading the image on your device…");
    const processingId = ++processingIdRef.current;
    try {
      const text = await recognizeLocally(candidate, setStatusMessage);
      if (processingId !== processingIdRef.current) return;
      setOcrText(text);
      setStatusMessage(isBn ? "ছবির সঙ্গে catalogue মিলানো হচ্ছে…" : "Comparing the photo with catalogue images…");
      const visualMatches = await visualCatalogueMatch(candidate, products, setStatusMessage);
      if (processingId !== processingIdRef.current) return;
      setVisualResults(visualMatches);
      setStatus("done");
      setStatusMessage(text ? (isBn ? "সম্ভাব্য model text পাওয়া গেছে" : "Possible model text found") : (isBn ? "কোনো পরিষ্কার label পাওয়া যায়নি" : "No clear label detected"));
    } catch (recognitionError) {
      if (processingId !== processingIdRef.current) return;
      console.error(recognitionError);
      setStatus("error");
      setStatusMessage("");
      setError(isBn ? "OCR চালু করা যায়নি। নিচে model number লিখে search করুন।" : "On-device OCR could not start. Enter a model number below to search.");
    }
  };
  const onInput = (event: ChangeEvent<HTMLInputElement>) => { const selected = event.target.files?.[0]; if (selected) void acceptFile(selected); event.target.value = ""; };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); const dropped = event.dataTransfer.files?.[0]; if (dropped) void acceptFile(dropped); };
  const reset = () => { processingIdRef.current += 1; if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(""); setOcrText(""); setVisualResults([]); setStatus("idle"); setStatusMessage(""); setError(""); setDragging(false); };

  return <div className="image-search-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
    <section className="image-search-modal" role="dialog" aria-modal="true" aria-labelledby="image-search-title">
      <div className="image-search-header"><div><span className="eyebrow"><span className="eyebrow-line" />{isBn ? "Privacy-first tool" : "Privacy-first tool"}</span><h2 id="image-search-title">{isBn ? "ছবি দিয়ে খুঁজুন" : "Search by Image"}</h2><p>{isBn ? "আপনার image এই device-এই process হবে—কোনো server-এ upload হবে না।" : "Your image is processed on your device and is not uploaded to our server."}</p></div><button type="button" className="image-search-close" onClick={closeModal} aria-label={isBn ? "বন্ধ করুন" : "Close"}><X size={19} /></button></div>
      {!file ? <div className="image-search-picker">
        <div className={`image-dropzone ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
          <span className="image-dropzone-icon"><Search size={24} /></span><strong>{isBn ? "Electronics component-এর ছবি দিন" : "Add an electronics component photo"}</strong><small>{isBn ? "JPG, PNG, WEBP · সর্বোচ্চ 15 MB" : "JPG, PNG, WEBP · up to 15 MB"}</small>
          <div className="image-search-actions"><button type="button" className="button button-primary" onClick={() => uploadInputRef.current?.click()}><Upload size={16} />{isBn ? "Upload image" : "Upload image"}</button><button type="button" className="button button-secondary" onClick={() => cameraInputRef.current?.click()}><Camera size={16} />{isBn ? "ছবি তুলুন" : "Take photo"}</button></div>
          <span className="image-dropzone-hint"><FileUp size={14} />{isBn ? "অথবা এখানে drag & drop করুন" : "or drag & drop here"}</span>
        </div><input ref={uploadInputRef} className="visually-hidden" type="file" accept="image/*" onChange={onInput} /><input ref={cameraInputRef} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={onInput} />
      </div> : <div className="image-search-workspace">
        <div className="image-search-preview-wrap"><img src={preview} alt={isBn ? "আপলোড করা image preview" : "Uploaded image preview"} /><button type="button" className="image-search-reset" onClick={reset}><RefreshCw size={14} />{isBn ? "অন্য image" : "Try another image"}</button></div>
        <div className="image-search-results-panel"><div className="image-search-status">{status === "processing" && <LoaderCircle className="spin" size={17} />}{status === "done" && <CheckCircle2 size={17} />}{status === "error" && <X size={17} />}{statusMessage || (isBn ? "Processing…" : "Processing…")}</div><p className="image-search-method-note">{isBn ? "লেখা পাওয়া গেলে OCR/model match এবং না পাওয়া গেলে catalogue photo similarity—দুইভাবে সম্ভাব্য product খোঁজা হয়।" : "The search combines readable label OCR with real catalogue-photo similarity when no model text is available."}</p>
          <label className="image-search-field-label" htmlFor="ocr-text">{isBn ? "Detected text (প্রয়োজনে ঠিক করুন)" : "Detected text (edit if needed)"}</label><textarea id="ocr-text" value={ocrText} onChange={(event) => setOcrText(event.target.value)} placeholder={isBn ? "যেমন: L298N, TP4056, ESP32…" : "For example: L298N, TP4056, ESP32…"} rows={2} />
          {error && <div className="image-search-error">{error}</div>}
          {status !== "processing" && (ocrText.trim() || visualResults.length > 0) && results.length > 0 && <><div className="image-search-results-heading"><div><span className="eyebrow"><span className="eyebrow-line" />{isBn ? "Possible matches" : "Possible matches"}</span><h3>{isBn ? "সম্ভাব্য পণ্য" : "Possible products"}</h3></div><span>{results.length}</span></div><div className="image-search-result-grid">{results.map(({ product, evidence }) => <article className="image-search-result-card" key={product.id}><img src={imageFor(product)} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /><div className="image-search-result-copy"><small>{product.brand || "No Brand"} · {product.category}</small><h4>{isBn ? (product.nameBn || product.name) : product.name}</h4><b>{priceLabel(product)}</b><span className="image-search-evidence">{evidence.join(" · ")}</span><div className="image-search-result-actions"><button type="button" className="button button-secondary" onClick={() => { closeModal(); navigate(`/product/${product.slug}`); }}>{isBn ? "দেখুন" : "View product"}</button>{(product.variants || []).length <= 1 && product.stock !== false && <button type="button" className="button button-primary" onClick={(event) => addToCart(product.id, product.variants?.[0]?.variantId, event.currentTarget)}>{isBn ? "Cart-এ দিন" : "Add to cart"}</button>}</div></div></article>)}</div></>}
          {status !== "processing" && (ocrText.trim() || visualResults.length > 0) && !results.length && <div className="image-search-empty"><strong>{isBn ? "Exact product শনাক্ত করা যায়নি" : "We couldn’t identify an exact product."}</strong><p>{isBn ? "Detected text পরিবর্তন করে আবার চেষ্টা করুন, অথবা normal search ব্যবহার করুন।" : "Edit the detected text and try again, or use the normal product search."}</p></div>}
          {status === "done" && !ocrText.trim() && !visualResults.length && <div className="image-search-empty"><strong>{isBn ? "কোনো পরিষ্কার model label বা visual match পাওয়া যায়নি" : "No clear model label or visual match was found."}</strong><p>{isBn ? "আরও পরিষ্কার, কাছ থেকে component-এর ছবি দিয়ে আবার চেষ্টা করুন।" : "Try a clearer, closer photo of the component."}</p></div>}
        </div>
      </div>}
      <footer className="image-search-footer"><span><CheckCircle2 size={14} />{isBn ? "লোকাল browser processing · API key নেই · paid service নেই" : "Local browser processing · no API key · no paid service"}</span>{file && <button type="button" onClick={() => uploadInputRef.current?.click()}>{isBn ? "নতুন ছবি" : "Choose another"}</button>}</footer>
    </section>
  </div>;
}
