const gridSizeMeters = 100;
const claimRadiusMeters = 300;
const storageKey = "osaka-fill-game.visited-cells-100m-v2";
const playerIdKey = "osaka-fill-game.player-id";
const playerNameKey = "osaka-fill-game.player-name";
const leaderboardDayKey = "osaka-fill-game.leaderboard-day";
const visited = new Set(JSON.parse(localStorage.getItem(storageKey) || "[]"));
const cells = [];
const cellLayers = new Map();

let osakaMap = null;
let activeBoundary = null;
let boundarySource = "fallback";
let currentLocationMarker = null;
let recommendedSpotMarker = null;
let supabaseClient = null;
let playerId = localStorage.getItem(playerIdKey);
let playerNameValue = localStorage.getItem(playerNameKey) || "";
let testModeEnabled = false;
let characterVisible = false;

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
const playerForm = document.querySelector("#playerForm");
const playerName = document.querySelector("#playerName");
const shareStatus = document.querySelector("#shareStatus");
const leaderboard = document.querySelector("#leaderboard");
const syncBtn = document.querySelector("#syncBtn");
const testModeBtn = document.querySelector("#testModeBtn");
const testModePanel = document.querySelector("#testModePanel");
const testModeForm = document.querySelector("#testModeForm");
const testModePassword = document.querySelector("#testModePassword");
const testModeCancel = document.querySelector("#testModeCancel");
const walkingCharacter = document.querySelector("#walkingCharacter");
const walkingCharacterImage = document.querySelector("#walkingCharacterImage");
const osakaCenter = [34.66, 135.505];
const characterBaseFrame = "osaka-character.png";
const characterRightFrames = [
  "migi/2.png",
  "migi/3.png",
  "migi/4.png",
  "migi/5.png",
  "migi/6.png",
  "migi/7.png",
  "migi/8.png",
  "migi/9.png",
  "migi/10.png",
];
const characterWalkDurationMs = 28000;
const characterRightMoveRatio = 0.45;
const characterFrameDurationMs = 130;

if (!playerId) {
  playerId = createPlayerId();
  localStorage.setItem(playerIdKey, playerId);
}

function createPlayerId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `player-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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

const recommendedSpots = [
  {
    name: "大阪城公園",
    area: "中央区",
    center: [34.6873, 135.5262],
    description: "天守閣と広い公園を歩きながら、周辺のマスをまとめて狙いやすい定番スポット。",
  },
  {
    name: "中之島公園",
    area: "北区",
    center: [34.6922, 135.5048],
    description: "川沿いの散歩で東西に移動しやすく、梅田や淀屋橋方面の制圧にもつなげやすい場所。",
  },
  {
    name: "道頓堀",
    area: "中央区",
    center: [34.6687, 135.5013],
    description: "大阪らしい景色を楽しみながら、なんば周辺の密集エリアを塗りやすいスポット。",
  },
  {
    name: "新世界・通天閣",
    area: "浪速区",
    center: [34.6525, 135.5063],
    description: "天王寺方面へも日本橋方面へも伸ばしやすく、南側の陣地づくりに使いやすい場所。",
  },
  {
    name: "天王寺公園",
    area: "天王寺区",
    center: [34.6491, 135.5112],
    description: "駅から近く、動物園前や四天王寺方面にも歩いて広げやすい南大阪の拠点。",
  },
  {
    name: "長居公園",
    area: "東住吉区",
    center: [34.6127, 135.5172],
    description: "公園内を回るだけでもまとまった範囲を取りやすく、南部の制圧率を上げやすい場所。",
  },
  {
    name: "天保山・大阪港",
    area: "港区",
    center: [34.6546, 135.4295],
    description: "ベイエリアを狙うならここ。海沿いの移動とセットで西側の未制圧マスを埋めやすい。",
  },
  {
    name: "咲洲コスモスクエア",
    area: "住之江区",
    center: [34.6382, 135.4146],
    description: "咲洲の広い区画を取りに行く起点。大阪市西端の制圧を伸ばしたい時におすすめ。",
  },
  {
    name: "住吉大社",
    area: "住吉区",
    center: [34.6129, 135.4936],
    description: "南西側の住宅地へ展開しやすく、まだ塗れていない端のエリアを攻めやすいスポット。",
  },
  {
    name: "靱公園",
    area: "西区",
    center: [34.6843, 135.4932],
    description: "本町や阿波座の間にあり、中心部の細かい未制圧マスを拾いやすい公園。",
  },
  {
    name: "花博記念公園 鶴見緑地",
    area: "鶴見区",
    center: [34.7127, 135.5741],
    description: "大阪市の東側を広げるのに便利。園内を歩いてまとまったマスを狙える。",
  },
  {
    name: "毛馬桜之宮公園",
    area: "都島区",
    center: [34.7057, 135.5201],
    description: "大川沿いを歩きながら北東側へ伸ばせる、川沿い制圧向きのスポット。",
  },
];

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
    opacity: isVisited ? 0.9 : 0.18,
    weight: isVisited ? 1.2 : 0.45,
  };
}

function distanceMeters(from, to) {
  const earthRadius = 6371000;
  const fromLat = (from[0] * Math.PI) / 180;
  const toLat = (to[0] * Math.PI) / 180;
  const deltaLat = ((to[0] - from[0]) * Math.PI) / 180;
  const deltaLng = ((to[1] - from[1]) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
      color: "#dc2626",
      fillColor: "transparent",
      fillOpacity: 0,
      opacity: 0.9,
      weight: 3,
      interactive: false,
    }).addTo(osakaMap);
  });

  cells.forEach((cell) => {
    const layer = L.rectangle(cell.bounds, getCellStyle(visited.has(cell.id)))
      .on("click", () => claimCellByTestMode(cell.id))
      .addTo(osakaMap);

    cellLayers.set(cell.id, layer);
  });

  addOsakaHomeControl();
  addTestModeControl();
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

function addTestModeControl() {
  if (!testModeBtn) return;

  testModeBtn.addEventListener("click", () => {
    if (testModeEnabled) {
      disableTestMode();
      return;
    }

    openTestModePanel();
  });

  testModeCancel?.addEventListener("click", closeTestModePanel);

  testModePanel?.addEventListener("click", (event) => {
    if (event.target === testModePanel) closeTestModePanel();
  });

  testModeForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const password = testModePassword?.value.trim() || "";

    if (password === "kyara") {
      showWalkingCharacter();
      return;
    }

    if (password !== "aaa") {
      message.textContent = "パスワードが違います。";
      testModePassword?.select();
      return;
    }

    enableTestMode();
  });
}

function openTestModePanel() {
  if (!testModePanel || !testModePassword) return;
  testModePassword.value = "";
  testModePanel.hidden = false;
  window.setTimeout(() => testModePassword.focus(), 0);
}

function closeTestModePanel() {
  if (!testModePanel) return;
  testModePanel.hidden = true;
}

function enableTestMode() {
  testModeEnabled = true;
  hideWalkingCharacter();
  testModeBtn?.classList.add("active");
  testModeBtn?.setAttribute("aria-label", "テストモードを終了");
  closeTestModePanel();
  message.textContent = "テストモード中です。マスをタップして制圧できます。";
}

function disableTestMode() {
  testModeEnabled = false;
  testModeBtn?.classList.remove("active");
  testModeBtn?.setAttribute("aria-label", "テストモードを有効化");
  closeTestModePanel();
  message.textContent = "テストモードを終了しました。";
}

function showWalkingCharacter() {
  characterVisible = true;
  if (walkingCharacter) walkingCharacter.hidden = false;
  closeTestModePanel();
  message.textContent = "キャラクターを表示しました。";
}

function hideWalkingCharacter() {
  characterVisible = false;
  if (walkingCharacter) walkingCharacter.hidden = true;
}

function renderRecommendedSpots() {
  wardList.innerHTML = "";

  recommendedSpots.forEach((spot) => {
    const item = document.createElement("div");
    item.className = "spot-card";
    item.innerHTML = `
      <button type="button" class="spot-focus-button">
        <span>${spot.area}</span>
        <strong>${spot.name}</strong>
        <small>${spot.description}</small>
      </button>
      <a class="route-link" href="${getGoogleMapsRouteUrl(spot)}" target="_blank" rel="noopener noreferrer">経路を見る</a>
    `;
    item.querySelector(".spot-focus-button").addEventListener("click", () => focusRecommendedSpot(spot));
    wardList.append(item);
  });
}

function getGoogleMapsRouteUrl(spot) {
  const destination = encodeURIComponent(spot.center.join(","));
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking`;
}

function save() {
  localStorage.setItem(storageKey, JSON.stringify([...visited]));
}

function getDisplayPercent(count = visited.size) {
  const percent = cells.length ? (count / cells.length) * 100 : 0;
  return percent < 10 && percent > 0 ? percent.toFixed(1) : Math.round(percent).toString();
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

function claimCellByTestMode(id) {
  if (!testModeEnabled) return;
  const wasVisited = visited.has(id);

  toggleCell(id, true);
  message.textContent = wasVisited ? "このマスはすでに制圧済みです。" : "テストモードで1マス制圧しました。";
  syncPlayer()
    .then(() => loadLeaderboard())
    .catch(() => setShareStatus("ランキング同期に失敗しました。"));
}

function claimCellsAround(latitude, longitude) {
  const position = [latitude, longitude];
  const claimedCells = cells.filter((cell) => distanceMeters(position, cell.center) <= claimRadiusMeters);
  const newClaimCount = claimedCells.filter((cell) => !visited.has(cell.id)).length;

  claimedCells.forEach((cell) => visited.add(cell.id));
  save();
  renderState();
  syncPlayer();

  return newClaimCount;
}

function renderState() {
  const count = visited.size;
  const percent = cells.length ? (count / cells.length) * 100 : 0;
  const displayPercent = getDisplayPercent(count);
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
    message.textContent = "現在地を取得した場所から半径300m以内の100mマスに色がつきます。";
  } else {
    message.textContent = `現在の制圧率は${displayPercent}%です。海上のマスは生成しない設定です。`;
  }
}

function initSharing() {
  playerName.value = playerNameValue;

  const config = window.SUPABASE_CONFIG || {};
  if (!config.url || !config.anonKey || !window.supabase) {
    setShareStatus("Supabase未設定です。名前と制圧状況はこの端末だけに保存されます。");
    renderLeaderboard([]);
    return;
  }

  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  setShareStatus("ランキングに接続しています。");
  checkDailyReset()
    .then(() => loadRemotePlayer())
    .then(() => syncPlayer())
    .then(() => loadLeaderboard())
    .catch(() => setShareStatus("ランキングに接続できませんでした。"));
}

function setShareStatus(text) {
  shareStatus.textContent = text;
}

async function loadRemotePlayer() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("players")
    .select("name, claimed_cells")
    .eq("id", playerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return;

  if (!playerNameValue && data.name) {
    playerNameValue = data.name;
    playerName.value = data.name;
    localStorage.setItem(playerNameKey, data.name);
  }

  if (Array.isArray(data.claimed_cells)) {
    data.claimed_cells.forEach((id) => visited.add(id));
    save();
    renderState();
  }
}

async function checkDailyReset() {
  const today = getJapanDateKey();

  if (localStorage.getItem(leaderboardDayKey) !== today) {
    visited.clear();
    save();
    renderState();
    localStorage.setItem(leaderboardDayKey, today);
  }

  if (!supabaseClient) return;

  const { error } = await supabaseClient.rpc("reset_daily_leaderboard", {
    reset_day: today,
    cell_total: cells.length,
  });

  if (error) {
    console.warn("Daily leaderboard reset failed", error);
    setShareStatus("日次リセット確認に失敗しました。Supabase SQLを更新してください。");
  }
}

function getJapanDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

async function syncPlayer() {
  if (!supabaseClient) return;

  const name = getPlayerName();
  const claimedCount = visited.size;
  const percent = cells.length ? Number(((claimedCount / cells.length) * 100).toFixed(2)) : 0;

  const { error } = await supabaseClient.from("players").upsert({
    id: playerId,
    name,
    claimed_cells: [...visited],
    claimed_count: claimedCount,
    total_cells: cells.length,
    percent,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
  setShareStatus("ランキングを同期しました。");
}

async function loadLeaderboard() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("players")
    .select("id, name, claimed_count, total_cells, percent, updated_at")
    .order("percent", { ascending: false })
    .order("claimed_count", { ascending: false })
    .limit(20);

  if (error) throw error;
  renderLeaderboard(data || []);
}

function getPlayerName() {
  return playerNameValue || "名無しの武将";
}

function renderLeaderboard(rows) {
  leaderboard.innerHTML = "";

  if (!rows.length) {
    const item = document.createElement("li");
    item.className = "leaderboard-empty";
    item.textContent = supabaseClient ? "まだランキングがありません。" : "Supabase設定後に表示されます。";
    leaderboard.append(item);
    return;
  }

  rows.forEach((row, index) => {
    const item = document.createElement("li");
    item.className = row.id === playerId ? "leaderboard-row current-player" : "leaderboard-row";

    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = `${index + 1}`;

    const name = document.createElement("strong");
    name.textContent = row.name || "名無しの武将";

    const score = document.createElement("span");
    score.className = "leaderboard-score";
    score.textContent = `${Number(row.percent || 0).toFixed(1)}%`;

    item.append(rank, name, score);
    leaderboard.append(item);
  });
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

      const claimedCount = claimCellsAround(latitude, longitude);
      message.textContent =
        claimedCount > 0 ? `${claimedCount}マスを新しく制圧しました。` : "この周辺はすでに制圧済みです。";
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
  const spot = recommendedSpots[Math.floor(Math.random() * recommendedSpots.length)];
  focusRecommendedSpot(spot);
}

function focusRecommendedSpot(spot) {
  message.textContent = `${spot.name}: ${spot.description}`;
  updateRecommendedSpotMarker(spot);
  if (osakaMap) osakaMap.flyTo(spot.center, 15, { duration: 0.55 });
}

function updateRecommendedSpotMarker(spot) {
  if (!osakaMap) return;

  if (recommendedSpotMarker) {
    recommendedSpotMarker.setLatLng(spot.center);
    recommendedSpotMarker.setTooltipContent(spot.name);
  } else {
    recommendedSpotMarker = L.circleMarker(spot.center, {
      radius: 12,
      color: "#ffffff",
      fillColor: "#dc2626",
      fillOpacity: 0.95,
      weight: 4,
      opacity: 1,
    })
      .bindTooltip(spot.name, { permanent: true, direction: "top", offset: [0, -12] })
      .addTo(osakaMap);
  }

  recommendedSpotMarker.bringToFront();
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
  renderRecommendedSpots();
  renderState();
  initSharing();
}

function animateWalkingCharacterFrame(timestamp = 0) {
  if (!walkingCharacterImage) return;

  if (characterVisible) {
    const walkTime = timestamp % characterWalkDurationMs;
    const isMovingRight = walkTime < characterWalkDurationMs * characterRightMoveRatio;
    const nextFrame = isMovingRight
      ? characterRightFrames[Math.floor(timestamp / characterFrameDurationMs) % characterRightFrames.length]
      : characterBaseFrame;

    if (!walkingCharacterImage.src.endsWith(nextFrame)) {
      walkingCharacterImage.src = nextFrame;
    }
  }

  window.requestAnimationFrame(animateWalkingCharacterFrame);
}

locateBtn.addEventListener("click", locate);
randomBtn.addEventListener("click", suggestRandomCell);
resetBtn.addEventListener("click", () => {
  visited.clear();
  save();
  renderState();
  syncPlayer()
    .then(() => loadLeaderboard())
    .catch(() => setShareStatus("ランキング同期に失敗しました。"));
});

playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  playerNameValue = playerName.value.trim().slice(0, 18);
  localStorage.setItem(playerNameKey, playerNameValue);
  syncPlayer()
    .then(() => loadLeaderboard())
    .catch(() => setShareStatus("名前の保存に失敗しました。"));
});

syncBtn.addEventListener("click", () => {
  syncPlayer()
    .then(() => loadLeaderboard())
    .catch(() => setShareStatus("ランキング同期に失敗しました。"));
});

bootstrap();
window.requestAnimationFrame(animateWalkingCharacterFrame);
