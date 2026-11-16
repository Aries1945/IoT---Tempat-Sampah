const PER_HALAMAN = 10;

// shortcut: filter & paginasi di browser; pindah ke query backend jika data riwayat besar.
function tabel(suffix, sel) {
  const tbody = document.getElementById("body-" + suffix);
  const pager = document.getElementById("pager-" + suffix);
  const kosong = document.getElementById("kosong-" + suffix);
  const kolom = [...tbody.closest("table").querySelectorAll("th")].map((th) => th.textContent);
  const prev = document.createElement("button");
  const next = document.createElement("button");
  const info = document.createElement("span");
  prev.type = next.type = "button";
  prev.textContent = "‹ Sebelumnya";
  next.textContent = "Berikutnya ›";
  pager.append(prev, info, next);
  let rows = [], page = 0;

  function draw() {
    const pages = Math.max(1, Math.ceil(rows.length / PER_HALAMAN));
    page = Math.min(Math.max(0, page), pages - 1);
    tbody.replaceChildren(...rows.slice(page * PER_HALAMAN, (page + 1) * PER_HALAMAN).map((r) => {
      const tr = document.createElement("tr");
      sel(r).forEach((v, i) => {
        const td = document.createElement("td");
        td.dataset.label = kolom[i];
        td.textContent = v;
        tr.append(td);
      });
      return tr;
    }));
    info.textContent = "Halaman " + (page + 1) + " dari " + pages;
    prev.disabled = page === 0;
    next.disabled = page >= pages - 1;
    kosong.hidden = rows.length > 0;
    pager.hidden = rows.length === 0;
  }
  prev.addEventListener("click", () => { page--; draw(); });
  next.addEventListener("click", () => { page++; draw(); });
  return (r) => { rows = r; page = 0; draw(); };
}

const terbaru = (a, b) => Date.parse(b.waktu) - Date.parse(a.waktu);

const setBaca = tabel("baca", (r) => [waktu(r.waktu), r.nama, angka(r.jarakCm), angka(r.beratKg), String(Math.round(r.persenVolume))]);
const setAlert = tabel("alert", (r) => [
  waktu(r.waktu), r.nama,
  JENIS[r.jenis] ? JENIS[r.jenis].icon + " " + JENIS[r.jenis].judul : String(r.jenis),
  nilaiVsBatas(r),
  r.aktif ? "● Aktif" : "✓ Selesai"
]);

const fBin = document.getElementById("f-bin");
const fDari = document.getElementById("f-dari");
const fSampai = document.getElementById("f-sampai");
let bacaan = [];

function filter() {
  const id = fBin.value;
  const dari = fDari.value ? new Date(fDari.value + "T00:00").getTime() : -Infinity;
  const sampai = fSampai.value ? new Date(fSampai.value + "T23:59:59.999").getTime() : Infinity;
  setBaca(bacaan.filter((r) => {
    const t = Date.parse(r.waktu);
    return (!id || String(r.binId) === id) && t >= dari && t <= sampai;
  }));
}
const form = document.getElementById("filter");
form.addEventListener("change", filter);
form.addEventListener("submit", (e) => e.preventDefault());

const gagal = (e) => showError("Gagal memuat riwayat (" + e.message + "). Coba muat ulang halaman.");
getHistory("readings").then((d) => {
  bacaan = d.sort(terbaru);
  for (const [id, nama] of new Map(d.map((r) => [r.binId, r.nama]))) fBin.append(new Option(nama, id));
  filter();
}).catch(gagal);
getHistory("alerts").then((d) => setAlert(d.sort(terbaru))).catch(gagal);

const tabs = document.querySelectorAll('[role="tab"]');
tabs.forEach((t) => t.addEventListener("click", () => tabs.forEach((x) => {
  const on = x === t;
  x.setAttribute("aria-selected", String(on));
  document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
})));

startData();
