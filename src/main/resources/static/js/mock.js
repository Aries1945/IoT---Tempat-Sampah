// Data simulasi. Status & persenVolume di sini meniru aturan backend (hanya untuk mock).
const MOCK = (() => {
  const TINGGI = 80, BATAS_JARAK = 10, BATAS_BERAT = 8;
  const menit = (m) => new Date(Date.now() - m * 60000).toISOString();

  function hitung(b) {
    const penuh = b.jarakCm <= b.batasJarakCm;
    const berat = b.beratKg >= b.batasBeratKg;
    const p = ((b.tinggiCm - b.jarakCm) / (b.tinggiCm - b.batasJarakCm)) * 100;
    b.persenVolume = Math.round(Math.max(0, Math.min(100, p)) * 10) / 10;
    b.status = penuh && berat ? "PENUH_OVERWEIGHT" : penuh ? "PENUH" : berat ? "OVERWEIGHT" : "NORMAL";
    return b;
  }

  const bin = (id, nama, lokasi, lat, lng, jarakCm, beratKg, m) => hitung({
    id, nama, lokasi, lat, lng, jarakCm, tinggiCm: TINGGI, beratKg,
    batasJarakCm: BATAS_JARAK, batasBeratKg: BATAS_BERAT, lastSeen: menit(m)
  });

  const data = [
    bin(1, "Gedung 9 Lt. 1", "Lobi Gedung 9", -6.87445, 107.60455, 7, 5.4, 2),
    bin(2, "Kantin Gedung 2", "Area kantin", -6.87510, 107.60460, 40, 9.3, 4),
    bin(3, "Perpustakaan Pusat", "Pintu masuk perpustakaan", -6.87400, 107.60350, 9, 8.6, 1),
    bin(4, "Gedung Rektorat", "Selasar rektorat", -6.87480, 107.60320, 52, 2.1, 3),
    bin(5, "Gedung 10", "Lantai dasar", -6.87430, 107.60500, 30, 6.2, 6),
    bin(6, "Gerbang Utama", "Jl. Ciumbuleuit", -6.87560, 107.60420, 48, 2.1, 45)
  ];
  data[5].status = "OFFLINE"; // tidak ada data > 15 menit

  function stream(cb) {
    return setInterval(() => {
      const aktif = data.filter((b) => b.status !== "OFFLINE");
      const b = aktif[Math.floor(Math.random() * aktif.length)];
      if (b.jarakCm <= 5 || b.beratKg >= 10) {
        b.jarakCm = 75; // diangkut petugas
        b.beratKg = 0.4;
      } else {
        b.jarakCm = Math.max(3, b.jarakCm - Math.round(Math.random() * 4));
        b.beratKg = Math.round((b.beratKg + Math.random() * 0.6) * 10) / 10;
      }
      b.lastSeen = new Date().toISOString();
      cb({ ...hitung(b) });
    }, 5000);
  }

  // 72 jam terakhir, satu pembacaan per jam per bin, pola terisi lalu dikosongkan.
  function readings() {
    const out = [];
    for (const b of data) {
      for (let h = 0; h < 72; h++) {
        const siklus = 23 - ((h + b.id * 5) % 24);
        const r = hitung({
          tinggiCm: TINGGI, batasJarakCm: BATAS_JARAK, batasBeratKg: BATAS_BERAT,
          jarakCm: Math.max(4, 76 - siklus * 3),
          beratKg: Math.round(siklus * (2 + b.id) * 0.6) / 10
        });
        out.push({ waktu: menit(h * 60 + 60 + b.id), binId: b.id, nama: b.nama,
          jarakCm: r.jarakCm, beratKg: r.beratKg, persenVolume: r.persenVolume });
      }
    }
    return out;
  }

  function alerts() {
    const out = [];
    const prev = {};
    const rs = readings().sort((a, z) => Date.parse(a.waktu) - Date.parse(z.waktu));
    for (const r of rs) {
      const p = prev[r.binId] || {};
      const now = { PENUH: r.jarakCm <= BATAS_JARAK, OVERWEIGHT: r.beratKg >= BATAS_BERAT };
      for (const jenis of ["PENUH", "OVERWEIGHT"]) {
        if (now[jenis] && !p[jenis]) out.push({
          waktu: r.waktu, binId: r.binId, nama: r.nama, jenis,
          nilai: jenis === "PENUH" ? r.jarakCm : r.beratKg,
          batas: jenis === "PENUH" ? BATAS_JARAK : BATAS_BERAT, aktif: false
        });
      }
      prev[r.binId] = now;
    }
    for (const b of data) {
      const s = b.status;
      if (s === "PENUH" || s === "PENUH_OVERWEIGHT") out.push({ waktu: b.lastSeen, binId: b.id, nama: b.nama, jenis: "PENUH", nilai: b.jarakCm, batas: BATAS_JARAK, aktif: true });
      if (s === "OVERWEIGHT" || s === "PENUH_OVERWEIGHT") out.push({ waktu: b.lastSeen, binId: b.id, nama: b.nama, jenis: "OVERWEIGHT", nilai: b.beratKg, batas: BATAS_BERAT, aktif: true });
    }
    return out;
  }

  console.assert(hitung({ tinggiCm: 80, batasJarakCm: 10, batasBeratKg: 8, jarakCm: 10, beratKg: 8 }).status === "PENUH_OVERWEIGHT", "Mock: batas inklusif");
  console.assert(hitung({ tinggiCm: 80, batasJarakCm: 10, batasBeratKg: 8, jarakCm: 3, beratKg: 1 }).persenVolume === 100, "Mock: volume maks 100");

  return { bins: () => data.map((b) => ({ ...b })), stream, readings, alerts };
})();
