const gridSizeMeters = 100;
const storageKey = "osaka-fill-game.visited-cells-100m-v2";
const visited = new Set(JSON.parse(localStorage.getItem(storageKey) || "[]"));
const cells = [];
const cellLayers = new Map();

let osakaMap = null;
let activeBoundary = null;
let boundarySource = "fallback";
let currentLocationMarker = null;

const mapElement = document.querySelector("#osakaMap");
const wardList = document.querySelector("#wardList");
const visitedCount = document.querySelector("#visitedCount");
const totalCount = document.querySelector("#totalCount");
const progressBar = document.querySelector("#progressBar");
const message = document.querySelector("#message");
const nextGoal = document.querySelector("#nextGoal");
const locateBtn = document.querySelector("#locateBtn");
const resetBtn = document.querySelector("#resetBtn");
const randomBtn = document.querySelector("#randomBtn");
const osakaCenter = [34.66, 135.505];

const fallbackBoundary = {
  name: "大阪市内",
  polygons: [
    [
      [34.760, 135.505],
      [34.752, 135.544],
      [34.728, 135.575],
      [34.689, 135.595],
      [34.640, 135.592],
      [34.604, 135.589],
      [34.587, 135.558],
      [34.589, 135.513],
      [34.603, 135.486],
      [34.626, 135.468],
      [34.646, 135.458],
      [34.662, 135.441],
      [34.680, 135.435],
      [34.693, 135.413],
      [34.716, 135.399],
      [34.737, 135.420],
      [34.748, 135.456],
    ],
    [
      [34.672, 135.382],
      [34.666, 135.414],
      [34.645, 135.423],
      [34.637, 135.395],
      [34.647, 135.373],
      [34.664, 135.369],
    ],
    [
      [34.642, 135.377],
      [34.636, 135.411],
      [34.618, 135.414],
      [34.611, 135.384],
      [34.622, 135.372],
      [34.637, 135.370],
    ],
    [
      [34.616, 135.400],
      [34.608, 135.454],
      [34.586, 135.456],
      [34.580, 135.414],
      [34.592, 135.396],
    ],
  ],
};

const landInclusionPolygons = [
  [
    [34.760, 135.505],
    [34.752, 135.544],
    [34.728, 135.575],
    [34.689, 135.595],
    [34.640, 135.592],
    [34.604, 135.589],
    [34.587, 135.558],
    [34.589, 135.513],
    [34.600, 135.486],
    [34.617, 135.466],
    [34.637, 135.453],
    [34.653, 135.439],
    [34.668, 135.431],
    [34.685, 135.418],
    [34.700, 135.398],
    [34.716, 135.392],
    [34.737, 135.420],
    [34.748, 135.456],
  ],
  [
    [34.674, 135.382],
    [34.669, 135.413],
    [34.648, 135.421],
    [34.638, 135.397],
    [34.647, 135.373],
    [34.664, 135.369],
  ],
  [
    [34.651, 135.379],
    [34.636, 135.411],
    [34.615, 135.414],
    [34.610, 135.384],
    [34.623, 135.371],
    [34.641, 135.372],
  ],
  [
    [34.618, 135.399],
    [34.609, 135.455],
    [34.586, 135.456],
    [34.580, 135.414],
    [34.592, 135.397],
  ],
  [
    [34.655, 135.395],
    [34.649, 135.425],
    [34.629, 135.428],
    [34.622, 135.401],
    [34.633, 135.384],
    [34.648, 135.384],
  ],
  [
    [34.638, 135.414],
    [34.630, 135.462],
    [34.607, 135.463],
    [34.601, 135.427],
    [34.615, 135.411],
  ],
  [
    [34.615, 135.445],
    [34.609, 135.484],
    [34.586, 135.486],
    [34.579, 135.452],
    [34.594, 135.440],
  ],
];

const waterExclusionPolygons = [
  [
    [34.714, 135.342],
    [34.707, 135.381],
    [34.686, 135.402],
    [34.666, 135.396],
    [34.649, 135.363],
    [34.660, 135.338],
  ],
  [
    [34.650, 135.340],
    [34.643, 135.377],
    [34.624, 135.372],
    [34.607, 135.383],
    [34.589, 135.399],
    [34.574, 135.389],
    [34.572, 135.340],
  ],
  [
    [34.671, 135.407],
    [34.661, 135.435],
    [34.653, 135.438],
    [34.649, 135.421],
    [34.655, 135.404],
  ],
  [
    [34.603, 135.410],
    [34.592, 135.443],
    [34.580, 135.442],
    [34.578, 135.412],
    [34.590, 135.398],
  ],
];

function getBoundaryBounds() {
  const points = activeBoundary.polygons.flat();
  return points.reduce(
    (bounds, [lat, lng]) => [
      [Math.min(bounds[0][0], lat), Math.min(bounds[0][1], lng)],
      [Math.max(bounds[1][0], lat), Math.max(bounds[1][1], lng)],
    ],
    [[Infinity, Infinity], [-Infinity, -Infinity]],
  );
}

function metersToLatDegrees(meters) {
  return meters / 111320;
}

function metersToLngDegrees(meters, latitude) {
  return meters / (111320 * Math.cos((latitude * Math.PI) / 180));
}

function pointInRing(point, ring) {
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lngI] = ring[i];
    const [latJ, lngJ] = ring[j];
    const intersects = lngI > lng !== lngJ > lng && lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInCity(point) {
  return activeBoundary.polygons.some((polygon) => pointInRing(point, polygon));
}

function pointInLand(point) {
  return landInclusionPolygons.some((polygon) => pointInRing(point, polygon));
}

function pointInWater(point) {
  return waterExclusionPolygons.some((polygon) => pointInRing(point, polygon));
}

function pointInPlayableArea(point) {
  return pointInCity(point) && pointInLand(point) && !pointInWater(point);
}

function getCellStyle(isVisited) {
  return {
    color: isVisited ? "#b83225" : "#277c74",
    fillColor: isVisited ? "#e95f3f" : "#f7e4b6",
    fillOpacity: isVisited ? 0.58 : 0.09,
    opacity: isVisited ? 0.9 : 0.38,
    weight: isVisited ? 1.2 : 0.7,
  };
}

function generateCells() {
  cells.length = 0;
  const [[south, west], [north, east]] = getBoundaryBounds();
  const latStep = metersToLatDegrees(gridSizeMeters);
  let row = 0;

  for (let lat = south; lat < north; lat += latStep) {
    const cellNorth = Math.min(lat + latStep, north);
    const centerLat = (lat + cellNorth) / 2;
    const lngStep = metersToLngDegrees(gridSizeMeters, centerLat);
    let col = 0;

    for (let lng = west; lng < east; lng += lngStep) {
      const cellEast = Math.min(lng + lngStep, east);
      const center = [centerLat, (lng + cellEast) / 2];

      if (pointInPlayableArea(center)) {
        cells.push({
          id: `cell-${row}-${col}`,
          bounds: [[lat, lng], [cellNorth, cellEast]],
          center,
        });
      }

      col += 1;
    }

    row += 1;
  }
}

function initMap() {
  if (!window.L) {
    mapElement.classList.add("map-fallback");
    mapElement.textContent = "OpenStreetMapのライブラリを読み込めませんでした。ネットワーク接続を確認してください。";
    return;
  }

  osakaMap = L.map("osakaMap", {
    center: osakaCenter,
    zoom: 12,
    minZoom: 5,
    maxZoom: 18,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(osakaMap);

  const osakaBounds = L.latLngBounds(...getBoundaryBounds());
  osakaMap.fitBounds(osakaBounds, { padding: [16, 16] });

  activeBoundary.polygons.forEach((polygon) => {
    L.polygon(polygon, {
      color: "#202124",
      fillColor: "transparent",
      fillOpacity: 0,
      opacity: 0.32,
      weight: 1.4,
      dashArray: "5 5",
      interactive: false,
    }).addTo(osakaMap);
  });

  cells.forEach((cell) => {
    const layer = L.rectangle(cell.bounds, getCellStyle(visited.has(cell.id)))
      .bindTooltip("現在地でのみ制圧できます", { sticky: true })
      .addTo(osakaMap);

    cellLayers.set(cell.id, layer);
  });

  addOsakaHomeControl();
}

function addOsakaHomeControl() {
  const control = L.control({ position: "topright" });

  control.onAdd = () => {
    const button = L.DomUtil.create("button", "osaka-home-control");
    button.type = "button";
    button.title = "大阪市中心に戻る";
    button.setAttribute("aria-label", "大阪市中心に戻る");
    button.textContent = "大阪";

    L.DomEvent.disableClickPropagation(button);
    L.DomEvent.on(button, "click", () => {
      osakaMap.setView(osakaCenter, 12);
    });

    return button;
  };

  control.addTo(osakaMap);
}

function drawStats() {
  wardList.innerHTML = "";

  [
    ["単位", "100mマス"],
    ["対象", activeBoundary.name],
    ["方式", boundarySource === "osm" ? "OSM境界+陸地判定" : "陸地マスク判定"],
    ["除外", "境界外と海面"],
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "stat-chip";
    item.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    wardList.append(item);
  });
}

function save() {
  localStorage.setItem(storageKey, JSON.stringify([...visited]));
}

function toggleCell(id, forceVisited = null) {
  const cell = cells.find((item) => item.id === id);
  if (!cell) return;

  const shouldVisit = forceVisited ?? true;
  if (shouldVisit) {
    visited.add(id);
    message.textContent = "100mマスを塗りました。";
  } else {
    visited.delete(id);
    message.textContent = "100mマスを未訪問に戻しました。";
  }

  save();
  renderState();
}

function renderState() {
  const count = visited.size;
  const percent = cells.length ? (count / cells.length) * 100 : 0;
  const displayPercent = percent < 10 && percent > 0 ? percent.toFixed(1) : Math.round(percent).toString();
  visitedCount.textContent = `${displayPercent}%`;
  totalCount.textContent = "制圧率";
  progressBar.style.width = `${percent}%`;

  cells.forEach((cell) => {
    const layer = cellLayers.get(cell.id);
    if (layer) layer.setStyle(getCellStyle(visited.has(cell.id)));
  });

  if (count === cells.length) {
    nextGoal.textContent = "大阪市制覇";
    message.textContent = "大阪市内の100mマスをすべて塗れました。";
    return;
  }

  const nextPercent = Math.min(100, Math.max(1, Math.ceil(percent + 1)));
  nextGoal.textContent = `${nextPercent}%まであと${Math.max(0, nextPercent - percent).toFixed(1)}%`;

  if (count === 0) {
    message.textContent = "現在地を取得した場所の100mマスだけ色がつきます。";
  } else {
    message.textContent = `現在の制圧率は${displayPercent}%です。海上のマスは生成しない設定です。`;
  }
}

function findCellByPosition(latitude, longitude) {
  if (!pointInPlayableArea([latitude, longitude])) return null;

  return cells.find((cell) => {
    const [[south, west], [north, east]] = cell.bounds;
    return latitude >= south && latitude <= north && longitude >= west && longitude <= east;
  });
}

function updateCurrentLocationMarker(latitude, longitude) {
  if (!osakaMap) return;

  const position = [latitude, longitude];
  if (currentLocationMarker) {
    currentLocationMarker.setLatLng(position);
  } else {
    currentLocationMarker = L.circleMarker(position, {
      radius: 9,
      color: "#ffffff",
      fillColor: "#2563eb",
      fillOpacity: 1,
      weight: 3,
      opacity: 1,
    })
      .bindTooltip("現在地", { permanent: true, direction: "top", offset: [0, -10] })
      .addTo(osakaMap);
  }

  currentLocationMarker.bringToFront();
}

function locate() {
  if (!navigator.geolocation) {
    message.textContent = "このブラウザでは現在地を使えません。";
    return;
  }

  locateBtn.disabled = true;
  locateBtn.textContent = "取得中";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const cell = findCellByPosition(latitude, longitude);

      locateBtn.disabled = false;
      locateBtn.textContent = "現在地で塗る";

      if (osakaMap) {
        updateCurrentLocationMarker(latitude, longitude);
        osakaMap.setView([latitude, longitude], Math.max(osakaMap.getZoom(), 14));
      }

      if (!cell) {
        message.textContent = "現在地が大阪市内の100mマスとして判定できませんでした。";
        return;
      }

      toggleCell(cell.id, true);
    },
    () => {
      locateBtn.disabled = false;
      locateBtn.textContent = "現在地で塗る";
      message.textContent = "位置情報を取得できませんでした。";
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
  );
}

function suggestRandomCell() {
  const remaining = cells.filter((cell) => !visited.has(cell.id));
  if (!remaining.length) {
    message.textContent = "すべて塗れています。";
    return;
  }

  const cell = remaining[Math.floor(Math.random() * remaining.length)];
  message.textContent = "未制圧の候補マスへ移動しました。塗るには現地で現在地取得が必要です。";
  if (osakaMap) osakaMap.flyTo(cell.center, 15, { duration: 0.55 });
}

function geoJsonToRings(geoJson) {
  const coordinates =
    geoJson.type === "Polygon"
      ? [geoJson.coordinates]
      : geoJson.type === "MultiPolygon"
        ? geoJson.coordinates
        : [];

  return coordinates
    .map((polygon) => polygon[0].map(([lng, lat]) => [lat, lng]))
    .filter((ring) => ring.length >= 3);
}

async function loadOsakaBoundary() {
  const params = new URLSearchParams({
    q: "大阪市, 大阪府, 日本",
    format: "jsonv2",
    polygon_geojson: "1",
    limit: "1",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  if (!response.ok) throw new Error("Boundary request failed");

  const results = await response.json();
  const result = results.find((item) => item.geojson);
  if (!result) throw new Error("Boundary not found");

  const polygons = geoJsonToRings(result.geojson);
  if (!polygons.length) throw new Error("Boundary geometry is empty");

  activeBoundary = {
    name: result.display_name?.split(",")[0] || "大阪市内",
    polygons,
  };
  boundarySource = "osm";
}

async function bootstrap() {
  message.textContent = "大阪市境界を読み込んでいます。";

  try {
    await loadOsakaBoundary();
  } catch {
    activeBoundary = fallbackBoundary;
    boundarySource = "fallback";
    message.textContent = "大阪市境界を取得できなかったため、内蔵マスクで表示しています。";
  }

  generateCells();
  initMap();
  drawStats();
  renderState();
}

locateBtn.addEventListener("click", locate);
randomBtn.addEventListener("click", suggestRandomCell);
resetBtn.addEventListener("click", () => {
  visited.clear();
  save();
  renderState();
});

bootstrap();
