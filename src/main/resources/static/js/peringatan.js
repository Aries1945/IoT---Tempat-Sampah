const ul = document.getElementById("alerts");
const tpl = document.getElementById("alert-tpl");

function render() {
  const list = [...bins.values()].flatMap(peringatanDari)
    .sort((a, b) => Date.parse(b.waktu) - Date.parse(a.waktu));
  ul.replaceChildren(...list.map((p) => {
    const el = tpl.content.firstElementChild.cloneNode(true);
    el.classList.add("alert-" + p.jenis);
    el.querySelector(".alert-icon").textContent = JENIS[p.jenis].icon;
    el.querySelector(".alert-judul").textContent = JENIS[p.jenis].judul;
    el.querySelector(".alert-bin").textContent = p.bin.nama + " — " + p.bin.lokasi;
    el.querySelector(".alert-nilai").textContent = nilaiVsBatas(p);
    el.querySelector(".alert-waktu").textContent = "Terukur " + waktu(p.waktu);
    return el;
  }));
  document.getElementById("kosong").hidden = list.length > 0;
}

startData(render, render);
