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

async function prepareImage(file: File, enhance = false): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PROCESSING_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable in this browser.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
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
  bitmap.close();
  return canvas;
}

async function recognizeLocally(file: File, onProgress: (message: string) => void): Promise<string> {
  const canvases = [await prepareImage(file), await prepareImage(file, true)];
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
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => catalogueMatch(products, ocrText, language), [products, ocrText, language]);
  const isBn = language === "bn";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  if (!open) return null;

  const acceptFile = async (candidate: File) => {
    if (!candidate.type.match(/^image\/(jpeg|png|webp)$/i)) {
      setError(isBn ? "JPG, PNG অথবা WEBP image দিন।" : "Please choose a JPG, PNG, or WEBP image.");
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
    setStatus("processing");
    setStatusMessage(isBn ? "আপনার device-এ image পড়া হচ্ছে…" : "Reading the image on your device…");
    try {
      const text = await recognizeLocally(candidate, setStatusMessage);
      setOcrText(text);
      setStatus("done");
      setStatusMessage(text ? (isBn ? "সম্ভাব্য model text পাওয়া গেছে" : "Possible model text found") : (isBn ? "কোনো পরিষ্কার label পাওয়া যায়নি" : "No clear label detected"));
    } catch (recognitionError) {
      console.error(recognitionError);
      setStatus("error");
      setStatusMessage("");
      setError(isBn ? "OCR চালু করা যায়নি। নিচে model number লিখে search করুন।" : "On-device OCR could not start. Enter a model number below to search.");
    }
  };
  const onInput = (event: ChangeEvent<HTMLInputElement>) => { const selected = event.target.files?.[0]; if (selected) void acceptFile(selected); event.target.value = ""; };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); const dropped = event.dataTransfer.files?.[0]; if (dropped) void acceptFile(dropped); };
  const reset = () => { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(""); setOcrText(""); setStatus("idle"); setStatusMessage(""); setError(""); };

  return <div className="image-search-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="image-search-modal" role="dialog" aria-modal="true" aria-labelledby="image-search-title">
      <div className="image-search-header"><div><span className="eyebrow"><span className="eyebrow-line" />{isBn ? "Privacy-first tool" : "Privacy-first tool"}</span><h2 id="image-search-title">{isBn ? "ছবি দিয়ে খুঁজুন" : "Search by Image"}</h2><p>{isBn ? "আপনার image এই device-এই process হবে—কোনো server-এ upload হবে না।" : "Your image is processed on your device and is not uploaded to our server."}</p></div><button className="image-search-close" onClick={onClose} aria-label={isBn ? "বন্ধ করুন" : "Close"}><X size={19} /></button></div>
      {!file ? <div className="image-search-picker">
        <div className={`image-dropzone ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
          <span className="image-dropzone-icon"><Search size={24} /></span><strong>{isBn ? "Electronics component-এর ছবি দিন" : "Add an electronics component photo"}</strong><small>{isBn ? "JPG, PNG, WEBP · সর্বোচ্চ 15 MB" : "JPG, PNG, WEBP · up to 15 MB"}</small>
          <div className="image-search-actions"><button className="button button-primary" onClick={() => inputRef.current?.click()}><Upload size={16} />{isBn ? "Upload image" : "Upload image"}</button><button className="button button-secondary" onClick={() => { if (inputRef.current) { inputRef.current.setAttribute("capture", "environment"); inputRef.current.click(); } }}><Camera size={16} />{isBn ? "ছবি তুলুন" : "Take photo"}</button></div>
          <span className="image-dropzone-hint"><FileUp size={14} />{isBn ? "অথবা এখানে drag & drop করুন" : "or drag & drop here"}</span>
        </div><input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={onInput} />
      </div> : <div className="image-search-workspace">
        <div className="image-search-preview-wrap"><img src={preview} alt={isBn ? "আপলোড করা image preview" : "Uploaded image preview"} /><button className="image-search-reset" onClick={reset}><RefreshCw size={14} />{isBn ? "অন্য image" : "Try another image"}</button></div>
        <div className="image-search-results-panel"><div className="image-search-status">{status === "processing" && <LoaderCircle className="spin" size={17} />}{status === "done" && <CheckCircle2 size={17} />}{status === "error" && <X size={17} />}{statusMessage || (isBn ? "Processing…" : "Processing…")}</div><p className="image-search-method-note">{isBn ? "এটি label/model text-ভিত্তিক match; পরিষ্কার model text না থাকলে কোনো product-কে নিশ্চিত match হিসেবে দেখানো হবে না।" : "Matches are based on readable label/model text; without a clear model, no product is presented as a certain visual match."}</p>
          <label className="image-search-field-label" htmlFor="ocr-text">{isBn ? "Detected text (প্রয়োজনে ঠিক করুন)" : "Detected text (edit if needed)"}</label><textarea id="ocr-text" value={ocrText} onChange={(event) => setOcrText(event.target.value)} placeholder={isBn ? "যেমন: L298N, TP4056, ESP32…" : "For example: L298N, TP4056, ESP32…"} rows={2} />
          {error && <div className="image-search-error">{error}</div>}
          {status !== "processing" && ocrText.trim() && results.length > 0 && <><div className="image-search-results-heading"><div><span className="eyebrow"><span className="eyebrow-line" />{isBn ? "Possible matches" : "Possible matches"}</span><h3>{isBn ? "সম্ভাব্য পণ্য" : "Possible products"}</h3></div><span>{results.length}</span></div><div className="image-search-result-grid">{results.map(({ product, evidence }) => <article className="image-search-result-card" key={product.id}><img src={imageFor(product)} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /><div className="image-search-result-copy"><small>{product.brand || "No Brand"} · {product.category}</small><h4>{isBn ? (product.nameBn || product.name) : product.name}</h4><b>{priceLabel(product)}</b><span className="image-search-evidence">{evidence.join(" · ")}</span><div className="image-search-result-actions"><button className="button button-secondary" onClick={() => { onClose(); navigate(`/product/${product.slug}`); }}>{isBn ? "দেখুন" : "View product"}</button>{(product.variants || []).length <= 1 && product.stock !== false && <button className="button button-primary" onClick={(event) => addToCart(product.id, product.variants?.[0]?.variantId, event.currentTarget)}>{isBn ? "Cart-এ দিন" : "Add to cart"}</button>}</div></div></article>)}</div></>}
          {status !== "processing" && ocrText.trim() && !results.length && <div className="image-search-empty"><strong>{isBn ? "Exact product শনাক্ত করা যায়নি" : "We couldn’t identify an exact product."}</strong><p>{isBn ? "Detected text পরিবর্তন করে আবার চেষ্টা করুন, অথবা normal search ব্যবহার করুন।" : "Edit the detected text and try again, or use the normal product search."}</p></div>}
          {status === "done" && !ocrText.trim() && <div className="image-search-empty"><strong>{isBn ? "কোনো পরিষ্কার model label পাওয়া যায়নি" : "No clear model label was found."}</strong><p>{isBn ? "ছবিতে লেখা model number থাকলে নিচের box-এ লিখে Possible matches দেখুন।" : "If you can read a model number in the photo, enter it above to see catalogue matches."}</p></div>}
        </div>
      </div>}
      <footer className="image-search-footer"><span><CheckCircle2 size={14} />{isBn ? "লোকাল browser processing · API key নেই · paid service নেই" : "Local browser processing · no API key · no paid service"}</span>{file && <button onClick={() => inputRef.current?.click()}>{isBn ? "নতুন ছবি" : "Choose another"}</button>}</footer>
    </section>
  </div>;
}
