// Dipakai semua halaman: menu, banner peringatan, pengambilan data, SSE.
// shortcut: mode mock diatur manual di sini; ganti ke false saat endpoint backend siap.
const USE_MOCK = true;

const STATUS = {
  NORMAL: { label: "Normal", icon: "✓", rank: 2 },
  PENUH: { label: "Penuh", icon: "▲", rank: 0 },
  OVERWEIGHT: { label: "Overweight", icon: "⚖", rank: 0 },
  PENUH_OVERWEIGHT: { label: "Penuh + Overweight", icon: "‼", rank: 0 },
  OFFLINE: { label: "Offline", icon: "✕", rank: 1 }
};

const JENIS = {
  PENUH: { judul: "Tempat Sampah Penuh", icon: "▲" },
  OVERWEIGHT: { judul: "Berat Melebihi Batas Aman", icon: "⚖" }
};

const statusKey = (s) => (Object.hasOwn(STATUS, s) ? s : "OFFLINE");
const angka = (n) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: 1 });
const waktu = (iso) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
const volText = (b) => Math.round(b.persenVolume) + "%";
const beratText = (b) => angka(b.beratKg) + " kg / " + angka(b.batasBeratKg) + " kg";

function menitLalu(iso) {
  const m = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  return Number.isFinite(m) ? "diperbarui " + Math.max(0, m) + " menit lalu" : "waktu pembaruan tidak diketahui";
}

function badge(el, status) {
  const k = statusKey(status);
  el.className = "badge s-" + k;
  el.textContent = STATUS[k].icon + " " + STATUS[k].label;
}

// Peringatan aktif diturunkan dari status yang sudah dihitung backend (bukan dihitung ulang).
function peringatanDari(bin) {
  const out = [];
  if (bin.status === "PENUH" || bin.status === "PENUH_OVERWEIGHT")
    out.push({ bin, jenis: "PENUH", nilai: bin.jarakCm, batas: bin.batasJarakCm, waktu: bin.lastSeen });
  if (bin.status === "OVERWEIGHT" || bin.status === "PENUH_OVERWEIGHT")
    out.push({ bin, jenis: "OVERWEIGHT", nilai: bin.beratKg, batas: bin.batasBeratKg, waktu: bin.lastSeen });
  return out;
}

function nilaiVsBatas(p) {
  return p.jenis === "PENUH"
    ? "Jarak " + angka(p.nilai) + " cm (batas ≤ " + angka(p.batas) + " cm)"
    : "Berat " + angka(p.nilai) + " kg (batas " + angka(p.batas) + " kg)";
}

function buatSvg(paths) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const d of paths) {
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", d);
    svg.append(p);
  }
  return svg;
}

function buatBrand() {
  const wrap = document.createElement("div");
  wrap.className = "brand";
  const img = document.createElement("img");
  img.src = "assets/LogoUnpar.png";
  img.alt = "Logo UNPAR";
  const txt = document.createElement("div");
  txt.className = "brand-text";
  const t1 = document.createElement("strong");
  t1.textContent = "Monitoring Tempat Sampah";
  const t2 = document.createElement("span");
  t2.textContent = "UNPAR";
  txt.append(t1, t2);
  wrap.append(img, txt);
  return wrap;
}

// --- Menu navigasi ---
const PAGES = [
  ["index.html", "Dashboard", ["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h6v6h-6z"]],
  ["lokasi.html", "Lokasi", ["M12 11.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M12 3a6.5 6.5 0 0 1 6.5 6.5c0 4.2-6.5 9.5-6.5 9.5S5.5 13.7 5.5 9.5A6.5 6.5 0 0 1 12 3Z", "M5 21h14"]],
  ["peringatan.html", "Peringatan", ["M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 0 1-3.46 0"]],
  ["riwayat.html", "Riwayat", ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5", "M12 7v5l3 2"]]
];

const navCountEl = document.createElement("span");
navCountEl.className = "nav-count";
navCountEl.hidden = true;

{
  const here = location.pathname.split("/").pop() || "index.html";
  const topbar = document.createElement("header");
  topbar.className = "mobile-bar";
  topbar.append(buatBrand());

  const nav = document.createElement("nav");
  nav.className = "nav";
  nav.setAttribute("aria-label", "Menu utama");
  nav.append(buatBrand());

  for (const [href, label, paths] of PAGES) {
    const a = document.createElement("a");
    a.href = href;
    if (href === here) a.setAttribute("aria-current", "page");
    const t = document.createElement("span");
    t.textContent = label;
    a.append(buatSvg(paths), t);
    if (href === "peringatan.html") a.append(navCountEl);
    nav.append(a);
  }
  document.body.prepend(topbar, nav);
}

// --- Banner peringatan & pesan galat ---
const main = document.querySelector("main");
const banner = document.createElement("div");
banner.className = "banner";
banner.setAttribute("role", "status");
banner.hidden = true;
const bannerText = document.createElement("span");
const bannerLink = document.createElement("a");
bannerLink.href = "peringatan.html";
bannerLink.textContent = "Lihat peringatan →";
banner.append(bannerText, bannerLink);
const errorBox = document.createElement("div");
errorBox.className = "error";
errorBox.setAttribute("role", "alert");
errorBox.hidden = true;
main.prepend(banner, errorBox);

const bins = new Map();

function updateBanner() {
  let n = 0;
  for (const b of bins.values()) n += peringatanDari(b).length;
  banner.hidden = n === 0;
  bannerText.textContent = "⚠ " + n + " peringatan aktif memerlukan tindakan";
  navCountEl.hidden = n === 0;
  navCountEl.textContent = String(n);
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = !msg;
}

// --- Data ---
function getJson(url) {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  });
}

function startData(onBin, onLoaded) {
  const terima = (bin) => {
    bins.set(bin.id, bin);
    updateBanner();
    if (onBin) onBin(bin);
  };
  const awal = USE_MOCK ? Promise.resolve(MOCK.bins()) : getJson("/api/bins");
  awal
    .then((list) => {
      list.forEach(terima);
      if (onLoaded) onLoaded(list);
    })
    .catch((e) => showError("Gagal memuat data dari server (" + e.message + "). Coba muat ulang halaman."));

  if (USE_MOCK) return MOCK.stream(terima);
  const es = new EventSource("/api/stream");
  es.onmessage = (ev) => terima(JSON.parse(ev.data));
  es.onopen = () => showError("");
  es.onerror = () => showError("Koneksi pembaruan langsung terputus. Mencoba menyambung ulang…");
}

function getHistory(kind) {
  return USE_MOCK ? Promise.resolve(MOCK[kind]()) : getJson("/api/" + kind);
}

// Self-check
console.assert(angka(6.2) === "6,2", "Desimal harus pakai koma");
console.assert(peringatanDari({ status: "PENUH_OVERWEIGHT" }).length === 2, "PENUH_OVERWEIGHT = dua peringatan");
console.assert(statusKey("ANEH") === "OFFLINE" && statusKey("toString") === "OFFLINE", "Status tak dikenal");
