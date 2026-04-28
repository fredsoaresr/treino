const DISTANCES = [50,100,150,200,300,400,500];

const TESTS = {
  custom: {label:"Pace customizado / T‑30 direto", kind:"custom"},
  test200: {label:"200 TEST — máximo esforço", kind:"max", distance:200, divisor:2, factor:0.8349},
  test300: {label:"300 TEST — máximo esforço", kind:"max", distance:300, divisor:3, factor:0.8812},
  test400: {label:"400 TEST — máximo esforço", kind:"max", distance:400, divisor:4, factor:0.8984},
  test500: {label:"500 TEST — máximo esforço", kind:"max", distance:500, divisor:5, factor:0.9036},
  avg200: {label:"200 AVG — média intervalada", kind:"avg", distance:200, redFactor:55/106.8},
  avg300: {label:"300 AVG — média intervalada", kind:"avg", distance:300, redFactor:55/161.1},
  avg400: {label:"400 AVG — média intervalada", kind:"avg", distance:400, redFactor:60/235.2},
  test2000: {label:"2000 TEST — T‑30 por 20 x 100", kind:"long", divisor:20},
  test3000: {label:"3000 TEST — T‑30 por 30 x 100", kind:"long", divisor:30}
};

const ZONES = [
  {key:"white", name:"WHITE", hr:"24–26", factors:{50:{op:"mul",v:25.7/55},100:{op:"mul",v:77.6/77},150:{op:"div",v:77/117.4},200:{op:"div",v:77/157.3},300:{op:"div",v:77/237.4},400:{op:"div",v:60/247.5},500:{op:"div",v:60/310.1}}},
  {key:"pink", name:"PINK", hr:"25–26", factors:{50:{op:"mul",v:34.7/77},100:{op:"mul",v:75.1/77},150:{op:"div",v:77/115.1},200:{op:"div",v:77/155.3},300:{op:"div",v:77/234.4},400:{op:"div",v:60/245},500:{op:"div",v:60/309.5}}},
  {key:"red", name:"RED", hr:"27–29", factors:{50:{op:"mul",v:39.9/90},100:{op:"mul",v:57.5/60},150:{op:"div",v:55/79.7},200:{op:"div",v:55/106.8},300:{op:"div",v:55/161.1},400:{op:"div",v:60/235.2},500:{op:"div",v:60/294.6}}},
  {key:"blue", name:"BLUE", hr:"28–29", factors:{50:{op:"mul",v:33/77},100:{op:"mul",v:71.3/77},150:{op:"div",v:77/109.4},200:{op:"div",v:77/147.5},300:{op:"div",v:77/222.6},400:{op:"div",v:60/232.8},500:{op:"div",v:60/291.9}}},
  {key:"purple", name:"PURPLE", hr:"30+", factors:{50:{op:"mul",v:0.413333},100:{op:"mul",v:80.4/90},150:{op:"div",v:90/123.3},200:{op:"div",v:90/166.3},300:{op:"div",v:90/251},400:{op:"div",v:90/336.7},500:{op:"div",v:90/425.3}}}
];

let currentResult = null;
let athletes = JSON.parse(localStorage.getItem("thresholdAthletes") || "[]");

function parseTime(input){
  const raw = String(input || "").trim().replace(",", ".");
  if(!raw) return NaN;
  if(raw.includes(":")){
    const parts = raw.split(":").map(Number);
    if(parts.some(Number.isNaN)) return NaN;
    if(parts.length === 2) return parts[0]*60 + parts[1];
    if(parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
  }
  const n = Number(raw);
  if(Number.isNaN(n)) return NaN;
  if(n >= 100){
    const minutes = Math.floor(n/100);
    const seconds = n - minutes*100;
    return minutes*60 + seconds;
  }
  return n;
}

function formatTime(seconds){
  if(!Number.isFinite(seconds)) return "—";
  const m = Math.floor(seconds/60);
  const s = seconds - m*60;
  if(m <= 0) return s.toFixed(2);
  return `${m}:${s.toFixed(2).padStart(5,"0")}`;
}

function thresholdSeconds(testKey, inputSeconds){
  const t = TESTS[testKey];
  if(t.kind === "custom") return inputSeconds;
  if(t.kind === "long") return inputSeconds / t.divisor;
  if(t.kind === "max") return (inputSeconds / t.divisor) / t.factor;
  if(t.kind === "avg") return inputSeconds * t.redFactor;
  return inputSeconds;
}

function zoneDistanceSeconds(threshold, zone, distance){
  const f = zone.factors[distance];
  return f.op === "mul" ? threshold * f.v : threshold / f.v;
}

function calculate(){
  const testKey = document.getElementById("testType").value;
  const input = document.getElementById("time").value;
  const inputSeconds = parseTime(input);
  if(!Number.isFinite(inputSeconds) || inputSeconds <= 0){
    alert("Informe um tempo válido. Exemplos: 3:52.00, 352, 31:21, 3121 ou 1:05.5.");
    return null;
  }
  const threshold = thresholdSeconds(testKey, inputSeconds);
  const rows = ZONES.map(z => ({
    zone:z.name,
    key:z.key,
    hr:z.hr,
    values:Object.fromEntries(DISTANCES.map(d => [d, zoneDistanceSeconds(threshold, z, d)]))
  }));
  currentResult = {
    name:document.getElementById("name").value.trim() || "Atleta",
    stroke:document.getElementById("stroke").value,
    pool:document.getElementById("pool").value,
    testKey,
    testLabel:TESTS[testKey].label,
    input,
    inputSeconds,
    threshold,
    rows
  };
  renderResult(currentResult);
  return currentResult;
}

function renderResult(result){
  document.getElementById("kpiName").textContent = `${result.name} · ${result.stroke}/${result.pool}`;
  document.getElementById("kpiPace").textContent = formatTime(result.threshold);
  document.getElementById("kpiType").textContent = result.testLabel;
  document.getElementById("kpiSeconds").textContent = result.threshold.toFixed(3);

  const thead = document.querySelector("#paceTable thead");
  thead.innerHTML = `<tr><th>Zona</th><th>FC 10s</th>${DISTANCES.map(d=>`<th>${d}</th>`).join("")}</tr>`;
  const tbody = document.querySelector("#paceTable tbody");
  tbody.innerHTML = result.rows.map(r => `
    <tr class="zone-${r.key}">
      <td>${r.zone}</td><td>${r.hr}</td>
      ${DISTANCES.map(d=>`<td>${formatTime(r.values[d])}</td>`).join("")}
    </tr>`).join("");
}

function addAthlete(){
  const r = calculate();
  if(!r) return;
  athletes.push({
    name:r.name, stroke:r.stroke, pool:r.pool, testLabel:r.testLabel, input:r.input,
    threshold:r.threshold,
    white100:r.rows.find(x=>x.zone==="WHITE").values[100],
    red100:r.rows.find(x=>x.zone==="RED").values[100],
    purple100:r.rows.find(x=>x.zone==="PURPLE").values[100],
    timestamp:new Date().toISOString()
  });
  localStorage.setItem("thresholdAthletes", JSON.stringify(athletes));
  renderAthletes();
}

function renderAthletes(){
  const tbody = document.querySelector("#athletesTable tbody");
  tbody.innerHTML = athletes.map(a => `
    <tr>
      <td>${a.name}</td><td>${a.stroke}/${a.pool}</td><td>${a.testLabel}</td><td>${a.input}</td>
      <td>${formatTime(a.threshold)}</td><td>${formatTime(a.white100)}</td><td>${formatTime(a.red100)}</td><td>${formatTime(a.purple100)}</td>
    </tr>`).join("");
}

function exportCsv(){
  if(!currentResult) calculate();
  if(!currentResult) return;
  const lines = [];
  lines.push(["Nome",currentResult.name]);
  lines.push(["Estilo",currentResult.stroke]);
  lines.push(["Piscina",currentResult.pool]);
  lines.push(["Teste",currentResult.testLabel]);
  lines.push(["Entrada",currentResult.input]);
  lines.push(["T-30 pace / 100",formatTime(currentResult.threshold)]);
  lines.push([]);
  lines.push(["Zona","FC 10s",...DISTANCES]);
  currentResult.rows.forEach(r => lines.push([r.zone,r.hr,...DISTANCES.map(d=>formatTime(r.values[d]))]));
  const csv = lines.map(row => row.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "threshold-paces.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function boot(){
  const select = document.getElementById("testType");
  select.innerHTML = Object.entries(TESTS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join("");
  document.getElementById("calculate").addEventListener("click", calculate);
  document.getElementById("addAthlete").addEventListener("click", addAthlete);
  document.getElementById("clear").addEventListener("click", () => {
    athletes = [];
    localStorage.removeItem("thresholdAthletes");
    renderAthletes();
  });
  document.getElementById("exportCsv").addEventListener("click", exportCsv);
  document.getElementById("time").addEventListener("keydown", e => { if(e.key === "Enter") calculate(); });
  document.getElementById("name").value = "Atleta";
  document.getElementById("time").value = "3:52.00";
  document.getElementById("testType").value = "test400";
  calculate();
  renderAthletes();
}
boot();
