const cardsEl = document.getElementById("cards");
const tpl = document.getElementById("card-tpl");
const cards = new Map();
const rank = (b) => STATUS[statusKey(b.status)].rank;

function setBar(fill, p) {
  p = Math.max(0, Math.min(100, Math.round(p)));
  fill.style.width = p + "%";
  fill.parentElement.setAttribute("aria-valuenow", p);
}

function isiKartu(el, b) {
  const off = statusKey(b.status) === "OFFLINE";
  el.className = "card s-" + statusKey(b.status);
  el.querySelector(".nama").textContent = b.nama;
  badge(el.querySelector(".badge"), b.status);
  el.querySelector(".lokasi").textContent = b.lokasi;
  el.querySelector(".offline-msg").hidden = !off;
  el.querySelector(".metrics").hidden = off;
  if (!off) {
    const v = Math.max(0, Math.min(100, Math.round(b.persenVolume)));
    el.querySelector(".vol-text").textContent = volText(b);
    el.querySelector(".tank-pct").textContent = volText(b);
    el.querySelector(".tank-fill").style.height = v + "%";
    setBar(el.querySelector(".vol-fill"), v);
    el.querySelector(".berat-text").textContent = beratText(b);
    setBar(el.querySelector(".berat-fill"), (b.beratKg / b.batasBeratKg) * 100);
  }
  el.querySelector(".updated").textContent = menitLalu(b.lastSeen);
}

function letakkan(b, el) {
  const urut = [...bins.values()].sort((x, y) => rank(x) - rank(y) || x.nama.localeCompare(y.nama, "id"));
  const next = urut[urut.findIndex((x) => x.id === b.id) + 1];
  const nextEl = (next && cards.get(next.id)) || null;
  if (!el.parentNode || el.nextElementSibling !== nextEl) cardsEl.insertBefore(el, nextEl);
}

function ringkasan() {
  const n = { total: bins.size, PENUH: 0, OVERWEIGHT: 0, OFFLINE: 0, NORMAL: 0 };
  for (const b of bins.values()) {
    const k = statusKey(b.status);
    if (k === "PENUH_OVERWEIGHT") { n.PENUH++; n.OVERWEIGHT++; } else n[k]++;
  }
  for (const k in n) document.getElementById("n-" + k).textContent = n[k];
}

startData((b) => {
  let el = cards.get(b.id);
  if (!el) {
    el = tpl.content.firstElementChild.cloneNode(true);
    cards.set(b.id, el);
  }
  isiKartu(el, b);
  letakkan(b, el);
  ringkasan();
}, (list) => { document.getElementById("kosong").hidden = list.length > 0; });

setInterval(() => {
  for (const [id, el] of cards) el.querySelector(".updated").textContent = menitLalu(bins.get(id).lastSeen);
}, 30000);
