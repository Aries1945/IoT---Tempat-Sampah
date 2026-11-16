// shortcut: pusat awal kampus UNPAR, diganti fitBounds setelah data dimuat
const map = L.map("map").setView([-6.8745, 107.604], 17);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap"
}).addTo(map);

const listEl = document.getElementById("list");
const markers = new Map();
const items = new Map();

// Isi html statis (tanpa data); bentuk diatur CSS lewat kelas status.
const icon = (s) => L.divIcon({ className: "pin pin-" + statusKey(s), html: "<span></span>", iconSize: [28, 28] });

function popup(b) {
  const d = document.createElement("div");
  const h = document.createElement("strong");
  h.textContent = b.nama;
  const s = document.createElement("span");
  badge(s, b.status);
  const info = document.createElement("p");
  info.textContent = statusKey(b.status) === "OFFLINE"
    ? "Sensor tidak merespons"
    : "Volume " + volText(b) + " · Berat " + beratText(b);
  d.append(h, document.createElement("br"), s, info);
  return d;
}

startData((b) => {
  let m = markers.get(b.id);
  if (!m) {
    m = L.marker([b.lat, b.lng], { title: b.nama, alt: b.nama }).addTo(map).bindPopup("");
    markers.set(b.id, m);
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bin-item";
    btn.append(document.createElement("span"), document.createElement("span"));
    btn.addEventListener("click", () => {
      const cur = bins.get(b.id);
      document.getElementById("map").scrollIntoView({ behavior: "smooth", block: "center" });
      map.setView([cur.lat, cur.lng], 18);
      m.openPopup();
    });
    li.append(btn);
    listEl.append(li);
    items.set(b.id, btn);
  }
  m.setLatLng([b.lat, b.lng]);
  m.setIcon(icon(b.status));
  m.setPopupContent(popup(b));
  const btn = items.get(b.id);
  btn.firstChild.textContent = b.nama;
  badge(btn.lastChild, b.status);
}, (list) => {
  if (list.length) map.fitBounds(list.map((b) => [b.lat, b.lng]), { padding: [30, 30], maxZoom: 18 });
});
