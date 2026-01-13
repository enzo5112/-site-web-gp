/* ========================================
   LIVE RACE – SIMULATION COMPLETE
   ======================================== */

const canvas = document.getElementById("circuitCanvas");
const ctx = canvas.getContext("2d");

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

/* =========================
   PILOTES
   ========================= */
const drivers = [
  { name: "Verstappen", color: "#1e5bc6", speed: 320, progress: 0 },
  { name: "Hamilton", color: "#00d2be", speed: 315, progress: 0 },
  { name: "Leclerc", color: "#dc0000", speed: 318, progress: 0 },
  { name: "Norris", color: "#ff8700", speed: 314, progress: 0 }
];

let selectedDriver = drivers[0];

/* =========================
   TELEMETRIE SELECT
   ========================= */
const telemetryBox = document.getElementById("telemetry-data");

telemetryBox.innerHTML = `
<select class="telemetry-select" id="driverSelect">
  ${drivers.map(d => `<option>${d.name}</option>`).join("")}
</select>
<div class="data-item"><span class="data-label">Vitesse</span><span id="speed">-- km/h</span></div>
<div class="data-item"><span class="data-label">RPM</span><span id="rpm">--</span></div>
<div class="data-item"><span class="data-label">Rapport</span><span id="gear">--</span></div>
`;

document.getElementById("driverSelect").addEventListener("change", e => {
  selectedDriver = drivers.find(d => d.name === e.target.value);
});

/* =========================
   CIRCUIT SPA (FORME REALISTE)
   ========================= */
const track = [
  { x: 200, y: 500 }, // La Source
  { x: 300, y: 420 },
  { x: 450, y: 300 }, // Eau Rouge
  { x: 600, y: 200 },
  { x: 850, y: 180 }, // Kemmel
  { x: 1050, y: 260 },
  { x: 950, y: 360 }, // Les Combes
  { x: 700, y: 420 },
  { x: 500, y: 460 },
  { x: 350, y: 480 }
];

/* =========================
   DESSIN CIRCUIT
   ========================= */
function drawTrack() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.moveTo(track[0].x, track[0].y);
  track.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 4;
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 15;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/* =========================
   INTERPOLATION POSITION
   ========================= */
function getPosition(progress) {
  const total = track.length;
  const i = Math.floor(progress) % total;
  const next = (i + 1) % total;
  const t = progress - i;

  return {
    x: track[i].x + (track[next].x - track[i].x) * t,
    y: track[i].y + (track[next].y - track[i].y) * t
  };
}

/* =========================
   ANIMATION
   ========================= */
let lap = 1;

function animate() {
  drawTrack();

  drivers.forEach(driver => {
    driver.progress += driver.speed / 50000;

    if (driver.progress >= track.length) {
      driver.progress = 0;
      if (driver === drivers[0]) lap++;
    }

    const pos = getPosition(driver.progress);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = driver.color;
    ctx.shadowColor = driver.color;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  updateUI();
  requestAnimationFrame(animate);
}

/* =========================
   UI LIVE
   ========================= */
function updateUI() {
  document.getElementById("current-lap").textContent = `${lap}/44`;
  document.getElementById("race-leader").textContent =
    drivers.sort((a, b) => b.progress - a.progress)[0].name;

  document.getElementById("speed").textContent =
    Math.floor(selectedDriver.speed + Math.random() * 5) + " km/h";
  document.getElementById("rpm").textContent =
    Math.floor(11000 + Math.random() * 800);
  document.getElementById("gear").textContent =
    Math.floor(6 + Math.random() * 2);
}

/* =========================
   DEMARRAGE
   ========================= */
function connectAPI() {
  document.getElementById("race-info").innerHTML = `
    <div class="race-info-item"><div class="label">Circuit</div><div class="value">Spa</div></div>
    <div class="race-info-item"><div class="label">Tours</div><div class="value">44</div></div>
    <div class="race-info-item"><div class="label">Statut</div><div class="value">EN COURSE</div></div>
  `;
  animate();
}

window.connectAPI = connectAPI;
