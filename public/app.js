const state = {
  score: {
    pointsWon: 0,
    pointsLost: 0,
    gamesWon: 0,
    gamesLost: 0
  },
  rallyLength: 0,
  serve: {
    firstAttempt: 0,
    secondAttempt: 0,
    servePoints: 0,
    firstServeIn: 0,
    secondServeIn: 0,
    firstServeWon: 0,
    secondServeWon: 0
  },
  winners: {
    forehand: 0,
    backhand: 0,
    aces: 0
  },
  errors: {
    forehandLong: 0,
    forehandWide: 0,
    forehandNet: 0,
    backhandLong: 0,
    backhandWide: 0,
    backhandNet: 0
  },
  special: {
    doubleFault: 0,
    opponentDoubleFault: 0,
    opponentAce: 0,
    opponentWinner: 0
  },
  logs: [],
  shotCount: 0,
  serving: false,
  context: {
    serve: "-",
    winner: "-",
    miss: "-",
    doubleFault: "-",
    firstServeMissed: false
  },
  points: {
    won: 0,
    returnWon: 0,
    serveWon: 0
  }
};

const dom = {
  scoreGiulia: document.getElementById("score-giulia"),
  scoreOpponent: document.getElementById("score-opponent"),
  gamesWon: document.getElementById("games-won"),
  gamesLost: document.getElementById("games-lost"),
  rallyLength: document.getElementById("rally-length"),
  snapshotCards: document.getElementById("snapshot-cards"),
  logList: document.getElementById("log-list"),
  logSubtitle: document.getElementById("log-subtitle"),
  metricsList: document.getElementById("metrics-list"),
  metricsSubtitle: document.getElementById("metrics-subtitle"),
  gameSelect: document.getElementById("game-select"),
  servingToggle: document.getElementById("serving-toggle"),
  gameSummary: document.getElementById("game-summary"),
  gameMeta: document.getElementById("game-meta"),
  viewLogsButton: document.getElementById("view-logs"),
  viewMetricsButton: document.getElementById("view-metrics")
};

let charts = {};
let gamesCache = [];
const storageKey = "gtstats-session";

const pointLabels = ["0", "15", "30", "40"];

const formatPointScore = (pointsFor, pointsAgainst) => {
  if (pointsFor >= 3 && pointsAgainst >= 3) {
    if (pointsFor === pointsAgainst) {
      return "40";
    }
    if (pointsFor === pointsAgainst + 1) {
      return "AD";
    }
    if (pointsAgainst === pointsFor + 1) {
      return "";
    }
  }

  return pointLabels[Math.min(pointsFor, 3)];
};

const currentGameSnapshot = () => ({
  score: state.score,
  winners: state.winners,
  errors: state.errors,
  special: state.special,
  totals: {
    winners: state.winners.forehand + state.winners.backhand + state.winners.aces,
    errors:
      state.errors.forehandLong +
      state.errors.forehandWide +
      state.errors.forehandNet +
      state.errors.backhandLong +
      state.errors.backhandWide +
      state.errors.backhandNet
  }
});

const updateScoreboard = () => {
  dom.scoreGiulia.textContent = formatPointScore(state.score.pointsWon, state.score.pointsLost);
  dom.scoreOpponent.textContent = formatPointScore(state.score.pointsLost, state.score.pointsWon);
  dom.gamesWon.textContent = state.score.gamesWon;
  dom.gamesLost.textContent = state.score.gamesLost;
  dom.rallyLength.textContent = state.rallyLength;
  buildSnapshotCards(currentGameSnapshot());
};

const formatGameValue = (value) => (typeof value === "number" ? `Game:${value}` : value ?? "-");
const formatShotValue = (value) => (typeof value === "number" ? `Shot:${value}` : value ?? "-");
const formatServeValue = (value) => {
  if (!value || value === "-") {
    return "-";
  }
  return value.startsWith("Serve:") ? value : `Serve:${value}`;
};

const ensureGameStartLog = () => {
  if (state.logs.length) {
    return;
  }
  const serverLabel = state.serving ? "Giulia" : "Opponent";
  const note = state.serving ? "Giulia started serving" : "Opponent started serving";
  state.logs.unshift({
    game: 0,
    score: "0-0",
    shot: 0,
    rally: 0,
    point: "-",
    miss: "-",
    serve: note,
    server: serverLabel,
    winner: "-",
    doubleFault: "-"
  });
};

const renderMetrics = (game) => {
  if (!dom.metricsList) {
    return;
  }
  if (!game) {
    dom.metricsList.innerHTML = "<p>No game selected.</p>";
    return;
  }
  if (dom.metricsSubtitle) {
    dom.metricsSubtitle.textContent = game.matchDate || game.createdAt?.slice(0, 10) || "Selected Game";
  }
  const flattenMetrics = (label, obj) =>
    Object.entries(obj || {}).map(([key, value]) => ({
      label: `${label} · ${key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase())}`,
      value
    }));
  const metricItems = [
    ...flattenMetrics("Score", game.score),
    ...flattenMetrics("Serve", game.serve),
    ...flattenMetrics("Winners", game.winners),
    ...flattenMetrics("Errors", game.errors),
    ...flattenMetrics("Special", game.special),
    ...flattenMetrics("Totals", game.totals),
    ...flattenMetrics("Points", game.points),
    ...flattenMetrics("Metrics", game.metrics)
  ];
  dom.metricsList.innerHTML = "";
  metricItems.forEach((item) => {
    const div = document.createElement("div");
    div.className = "snapshot-card";
    div.innerHTML = `<strong>${item.label}</strong><p class="score-value">${item.value}</p>`;
    dom.metricsList.appendChild(div);
  });
};

const persistSession = () => {
  const session = {
    score: state.score,
    rallyLength: state.rallyLength,
    serve: state.serve,
    winners: state.winners,
    errors: state.errors,
    special: state.special,
    logs: state.logs,
    shotCount: state.shotCount,
    serving: state.serving,
    context: state.context,
    points: state.points
  };
  sessionStorage.setItem(storageKey, JSON.stringify(session));
};

const restoreSession = () => {
  const raw = sessionStorage.getItem(storageKey);
  if (!raw) {
    return;
  }
  const saved = JSON.parse(raw);
  if (saved?.score) {
    state.score = saved.score;
  }
  if (typeof saved?.rallyLength === "number") {
    state.rallyLength = saved.rallyLength;
  }
  if (saved?.serve) {
    state.serve = { ...state.serve, ...saved.serve };
  }
  if (saved?.winners) {
    state.winners = saved.winners;
  }
  if (saved?.errors) {
    state.errors = saved.errors;
  }
  if (saved?.special) {
    state.special = saved.special;
  }
  if (saved?.logs) {
    state.logs = saved.logs;
  }
  if (typeof saved?.shotCount === "number") {
    state.shotCount = saved.shotCount;
  }
  if (typeof saved?.serving === "boolean") {
    state.serving = saved.serving;
  }
  if (saved?.context) {
    state.context = { ...state.context, ...saved.context };
  }
  if (saved?.points) {
    state.points = { ...state.points, ...saved.points };
  }
};

const recordPointLog = (pointLabel) => {
  state.shotCount += 1;
  const gameNumber = state.score.gamesWon + state.score.gamesLost;
  const scoreValue = `${formatPointScore(state.score.pointsWon, state.score.pointsLost)}-${formatPointScore(
    state.score.pointsLost,
    state.score.pointsWon
  )}`;

  const serverLabel = state.serving ? "Giulia" : "Opponent";
  state.logs.unshift({
    game: gameNumber,
    score: scoreValue,
    shot: state.shotCount,
    rally: state.rallyLength,
    point: pointLabel,
    miss: state.context.miss,
    serve: state.context.serve,
    server: serverLabel,
    winner: state.context.winner,
    doubleFault: state.context.doubleFault
  });

  state.rallyLength = 0;
  state.context = {
    serve: "-",
    winner: "-",
    miss: "-",
    doubleFault: "-",
    firstServeMissed: false
  };

  renderLogs();
  updateScoreboard();
  persistSession();
};

const renderLogs = (logs = state.logs, label = "Current Game") => {
  dom.logList.innerHTML = "";
  if (dom.logSubtitle) {
    dom.logSubtitle.textContent = label;
  }
  logs.slice(0, 50).forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatGameValue(entry.game)}</td>
      <td>${entry.score}</td>
      <td>${formatShotValue(entry.shot)}</td>
      <td>${entry.rally}</td>
      <td>${entry.point}</td>
      <td>${entry.miss}</td>
      <td>${formatServeValue(entry.serve)}</td>
      <td>${entry.server}</td>
      <td>${entry.winner}</td>
      <td>${entry.doubleFault}</td>
    `;
    dom.logList.appendChild(row);
  });
};

const resetState = () => {
  Object.assign(state.score, { pointsWon: 0, pointsLost: 0, gamesWon: 0, gamesLost: 0 });
  state.rallyLength = 0;
  state.shotCount = 0;
  state.context = {
    serve: "-",
    winner: "-",
    miss: "-",
    doubleFault: "-",
    firstServeMissed: false
  };
  Object.keys(state.serve).forEach((key) => (state.serve[key] = 0));
  Object.keys(state.winners).forEach((key) => (state.winners[key] = 0));
  Object.keys(state.errors).forEach((key) => (state.errors[key] = 0));
  Object.keys(state.special).forEach((key) => (state.special[key] = 0));
  state.logs = [];
  state.points.won = 0;
  state.points.returnWon = 0;
  updateScoreboard();
  ensureGameStartLog();
  renderLogs();
  persistSession();
};

const scorePoint = (winner) => {
  if (winner === "giulia") {
    state.score.pointsWon += 1;
  } else {
    state.score.pointsLost += 1;
  }

  const lead = state.score.pointsWon - state.score.pointsLost;
  if (state.score.pointsWon >= 4 || state.score.pointsLost >= 4) {
    if (Math.abs(lead) >= 2) {
      if (lead > 0) {
        state.score.gamesWon += 1;
      } else {
        state.score.gamesLost += 1;
      }
      state.score.pointsWon = 0;
      state.score.pointsLost = 0;
      state.serving = !state.serving;
      if (dom.servingToggle) {
        dom.servingToggle.checked = state.serving;
      }
    }
  }
  updateScoreboard();
};

const updateServeButtonsState = () => {
  const serveButtons = document.querySelectorAll(
    '[data-action="firstServeAttempt"],[data-action="secondServeAttempt"],[data-action="firstServeIn"],[data-action="secondServeIn"],[data-action="winnerAce"]'
  );
  serveButtons.forEach((button) => {
    button.disabled = !state.serving;
  });
};

const trackServePoint = (winner) => {
  if (!state.serving) {
    return;
  }
  state.serve.servePoints += 1;
  if (winner === "giulia") {
    if (state.context.firstServeMissed) {
      state.serve.secondServeWon += 1;
    } else {
      state.serve.firstServeWon += 1;
    }
  }
};

const handleAction = (action) => {
  switch (action) {
    case "rally":
      state.rallyLength += 1;
      updateScoreboard();
      break;
    case "resetRally":
      state.rallyLength = 0;
      updateScoreboard();
      break;
    case "firstServeAttempt":
      state.serve.firstAttempt += 1;
      state.context.serve = "Giulia attempted first serve and missed";
      state.context.firstServeMissed = true;
      break;
    case "secondServeAttempt":
      state.serve.secondAttempt += 1;
      state.context.serve = "Giulia attempted second serve and missed";
      state.context.firstServeMissed = true;
      state.special.doubleFault += 1;
      trackServePoint("opponent");
      scorePoint("opponent");
      state.context.doubleFault = "Giulia";
      recordPointLog("-");
      break;
    case "firstServeIn":
      state.serve.firstServeIn += 1;
      state.context.firstServeMissed = false;
      state.context.serve = "Giulia first serve in";
      break;
    case "secondServeIn":
      state.serve.secondServeIn += 1;
      state.context.firstServeMissed = true;
      state.context.serve = "Giulia second serve in";
      break;
    case "wonPoint":
      state.points.won += 1;
      if (!state.serving) {
        state.points.returnWon += 1;
      } else {
        state.points.serveWon += 1;
      }
      trackServePoint("giulia");
      scorePoint("giulia");
      state.context.serve = state.context.serve === "-" ? "Giulia won point" : state.context.serve;
      recordPointLog("won");
      break;
    case "winnerForehand":
      state.winners.forehand += 1;
      state.context.winner = "forehand";
      trackServePoint("giulia");
      scorePoint("giulia");
      recordPointLog("won");
      break;
    case "winnerBackhand":
      state.winners.backhand += 1;
      state.context.winner = "backhand";
      trackServePoint("giulia");
      scorePoint("giulia");
      recordPointLog("won");
      break;
    case "winnerAce":
      state.winners.aces += 1;
      trackServePoint("giulia");
      scorePoint("giulia");
      state.context.winner = "ace";
      recordPointLog("won");
      break;
    case "errorForehandLong":
      state.errors.forehandLong += 1;
      trackServePoint("opponent");
      scorePoint("opponent");
      state.context.miss = "forehand long";
      recordPointLog("-");
      break;
    case "errorForehandWide":
      state.errors.forehandWide += 1;
      trackServePoint("opponent");
      scorePoint("opponent");
      state.context.miss = "forehand wide";
      recordPointLog("-");
      break;
    case "errorForehandNet":
      state.errors.forehandNet += 1;
      trackServePoint("opponent");
      scorePoint("opponent");
      state.context.miss = "forehand net";
      recordPointLog("-");
      break;
    case "errorBackhandLong":
      state.errors.backhandLong += 1;
      trackServePoint("opponent");
      scorePoint("opponent");
      state.context.miss = "backhand long";
      recordPointLog("-");
      break;
    case "errorBackhandWide":
      state.errors.backhandWide += 1;
      trackServePoint("opponent");
      scorePoint("opponent");
      state.context.miss = "backhand wide";
      recordPointLog("-");
      break;
    case "errorBackhandNet":
      state.errors.backhandNet += 1;
      trackServePoint("opponent");
      scorePoint("opponent");
      state.context.miss = "backhand net";
      recordPointLog("-");
      break;
    case "doubleFault":
      state.special.doubleFault += 1;
      trackServePoint("opponent");
      scorePoint("opponent");
      state.context.doubleFault = "Giulia";
      recordPointLog("-");
      break;
    case "opponentDoubleFault":
      state.special.opponentDoubleFault += 1;
      trackServePoint("giulia");
      scorePoint("giulia");
      state.context.doubleFault = "opponent";
      recordPointLog("-");
      break;
    case "opponentAce":
      state.special.opponentAce += 1;
      trackServePoint("opponent");
      scorePoint("opponent");
      state.context.winner = "opponent ace";
      recordPointLog("-");
      break;
    case "opponentWinner":
      state.special.opponentWinner += 1;
      trackServePoint("opponent");
      scorePoint("opponent");
      state.context.winner = "opponent winner";
      recordPointLog("-");
      break;
    default:
      break;
  }
  persistSession();
};

const buildSnapshotCards = (game) => {
  if (!game) {
    dom.snapshotCards.innerHTML = "<p>No games recorded yet.</p>";
    return;
  }
  const cards = [
    { label: "Games Won", value: game.score?.gamesWon ?? 0 },
    { label: "Games Lost", value: game.score?.gamesLost ?? 0 },
    { label: "Winners", value: game.totals?.winners ?? 0 },
    { label: "Errors", value: game.totals?.errors ?? 0 },
    { label: "Aces", value: game.winners?.aces ?? 0 },
    { label: "Double Faults", value: game.special?.doubleFault ?? 0 },
    { label: "Opponent Double Faults", value: game.special?.opponentDoubleFault ?? 0 },
    { label: "Opponent Aces", value: game.special?.opponentAce ?? 0 },
    { label: "Opponent Winners", value: game.special?.opponentWinner ?? 0 }
  ];
  const flattenEntries = (label, obj) =>
    Object.entries(obj || {}).map(([key, value]) => ({
      label: `${label} · ${key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase())}`,
      value
    }));
  const metricsEntries = [
    ...flattenEntries("Score", game.score),
    ...flattenEntries("Serve", game.serve),
    ...flattenEntries("Winners", game.winners),
    ...flattenEntries("Errors", game.errors),
    ...flattenEntries("Special", game.special),
    ...flattenEntries("Totals", game.totals),
    ...flattenEntries("Points", game.points),
    ...flattenEntries("Metrics", game.metrics)
  ];

  dom.snapshotCards.innerHTML = "";
  [...cards, ...metricsEntries].forEach((card) => {
    const div = document.createElement("div");
    div.className = "snapshot-card";
    div.innerHTML = `<strong>${card.label}</strong><p class="score-value">${card.value}</p>`;
    dom.snapshotCards.appendChild(div);
  });
};

const resolveWonPointCount = (game) => {
  if (typeof game.points?.won === "number") {
    return game.points.won;
  }
  if (Array.isArray(game.logs)) {
    return game.logs.filter((entry) => entry.point === "won" || entry.point === "Point:won").length;
  }
  return 0;
};

const resolvePointBreakdown = (game) => {
  const pointsWon =
    (game.winners?.forehand ?? 0) +
    (game.winners?.backhand ?? 0) +
    (game.winners?.aces ?? 0) +
    resolveWonPointCount(game);
  const pointsLost =
    (game.errors?.forehandLong ?? 0) +
    (game.errors?.forehandWide ?? 0) +
    (game.errors?.forehandNet ?? 0) +
    (game.errors?.backhandLong ?? 0) +
    (game.errors?.backhandWide ?? 0) +
    (game.errors?.backhandNet ?? 0) +
    (game.special?.doubleFault ?? 0) +
    (game.special?.opponentWinner ?? 0) +
    (game.special?.opponentAce ?? 0);
  return { pointsWon, pointsLost };
};

const resolveServeStats = (game, pointsPlayed) => {
  const serve = game.serve || {};
  const totalServes =
    (serve.firstAttempt ?? 0) +
    (serve.secondAttempt ?? 0) +
    (serve.firstServeIn ?? 0) +
    (serve.secondServeIn ?? 0);
  const servePoints = totalServes || serve.servePoints || (game.serving ? pointsPlayed : 0);
  const firstServeIn = serve.firstServeIn ?? 0;
  const secondServeIn = serve.secondServeIn ?? 0;
  const firstServeWon = serve.firstServeWon ?? 0;
  const secondServeWon = serve.secondServeWon ?? 0;
  return {
    servePoints,
    firstServeIn,
    secondServeIn,
    firstServeWon,
    secondServeWon,
    firstServeInPercent: safePercent(firstServeIn, servePoints),
    secondServeInPercent: safePercent(secondServeIn, servePoints),
    firstServeWonPercent: safePercent(firstServeWon, servePoints),
    secondServeWonPercent: safePercent(secondServeWon, servePoints)
  };
};

const chartConfig = (labels, datasets, options = {}) => ({
  type: "bar",
  data: {
    labels,
    datasets
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: "bottom" }
    },
    ...options
  }
});

const renderGameMeta = (game) => {
  if (!dom.gameMeta) {
    return;
  }
  if (!game) {
    dom.gameMeta.innerHTML = "<p>No game selected.</p>";
    return;
  }

  const metaItems = [
    { label: "Date", value: game.matchDate || "-" },
    { label: "Opponent", value: game.opponent || "-" },
    { label: "Notes", value: game.notes || "-" }
  ];

  dom.gameMeta.innerHTML = metaItems
    .map((item) => `<div class="summary-item"><span>${item.label}</span><strong>${item.value}</strong></div>`)
    .join("");
};

const renderGameSummary = (game) => {
  if (!dom.gameSummary) {
    return;
  }
  if (!game) {
    dom.gameSummary.innerHTML = "<p>No game selected.</p>";
    return;
  }

  const { pointsWon, pointsLost } = resolvePointBreakdown(game);
  const totalPoints = pointsWon + pointsLost;
  const winnersTotal = game.totals?.winners ?? 0;
  const errorsTotal = game.totals?.errors ?? 0;
  const errorsPercent = safePercent(errorsTotal, totalPoints);
  const forehandErrors =
    (game.errors?.forehandLong ?? 0) +
    (game.errors?.forehandWide ?? 0) +
    (game.errors?.forehandNet ?? 0);
  const backhandErrors =
    (game.errors?.backhandLong ?? 0) +
    (game.errors?.backhandWide ?? 0) +
    (game.errors?.backhandNet ?? 0);

  const serveStats = resolveServeStats(game, totalPoints);
  const summaryItems = [
    { label: "Game Score", value: `${game.score?.gamesWon ?? 0} - ${game.score?.gamesLost ?? 0}` },
    { label: "Aces", value: game.winners?.aces ?? 0 },
    { label: "1st Serves In", value: `${serveStats.firstServeInPercent}%` },
    { label: "1st Serve Won", value: `${serveStats.firstServeWonPercent}%` },
    { label: "2nd Serve Won", value: `${serveStats.secondServeWonPercent}%` },
    { label: "Double Fault", value: game.special?.doubleFault ?? 0 },
    { label: "Winners", value: winnersTotal },
    { label: "Errors", value: `${errorsTotal} (${errorsPercent}%)` },
    { label: "Fore / Back Errors", value: `${forehandErrors} / ${backhandErrors}` },
    { label: "Total Points", value: totalPoints }
  ];

  dom.gameSummary.innerHTML = summaryItems
    .map(
      (item) =>
        `<div class="summary-item"><span>${item.label}</span><strong>${item.value}</strong></div>`
    )
    .join("");
};

const buildCharts = (games, selectedGame) => {
  if (!games.length) {
    return;
  }

  const labels = games.map((game) => game.matchDate || game.createdAt?.slice(0, 10));
  const pointsWonHistory = games.map((game) => game.metrics?.percentPointsWon ?? safePercent(
    game.score?.pointsWon ?? 0,
    (game.score?.pointsWon ?? 0) + (game.score?.pointsLost ?? 0)
  ));
  const forehandErrorsHistory = games.map((game) =>
    (game.errors?.forehandLong ?? 0) + (game.errors?.forehandWide ?? 0) + (game.errors?.forehandNet ?? 0)
  );
  const backhandErrorsHistory = games.map((game) =>
    (game.errors?.backhandLong ?? 0) + (game.errors?.backhandWide ?? 0) + (game.errors?.backhandNet ?? 0)
  );

  charts.pointsPie?.destroy();
  charts.winnersErrors?.destroy();
  charts.acesFaults?.destroy();
  charts.forehandBackhand?.destroy();
  charts.serveInPie?.destroy();
  charts.serviceReturn?.destroy();
  charts.pointsHistory?.destroy();
  charts.errorsHistory?.destroy();

  if (selectedGame) {
    const { pointsWon, pointsLost } = resolvePointBreakdown(selectedGame);
    const winnersTotal = selectedGame.totals?.winners ?? 0;
    const errorsTotal = selectedGame.totals?.errors ?? 0;
    const forehandErrors =
      (selectedGame.errors?.forehandLong ?? 0) +
      (selectedGame.errors?.forehandWide ?? 0) +
      (selectedGame.errors?.forehandNet ?? 0);
    const backhandErrors =
      (selectedGame.errors?.backhandLong ?? 0) +
      (selectedGame.errors?.backhandWide ?? 0) +
      (selectedGame.errors?.backhandNet ?? 0);

    charts.pointsPie = new Chart(document.getElementById("points-pie-chart"), {
      type: "doughnut",
      data: {
        labels: ["Points Won", "Points Lost"],
        datasets: [
          {
            data: [pointsWon, pointsLost],
            backgroundColor: ["#3b82f6", "#ef4444"]
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        cutout: "60%"
      },
      plugins: [
        {
          id: "pointsLabels",
          afterDatasetsDraw(chart) {
            const { ctx } = chart;
            const dataset = chart.data.datasets[0];
            const total = dataset.data.reduce((sum, value) => sum + value, 0) || 1;
            chart.getDatasetMeta(0).data.forEach((element, index) => {
              const value = dataset.data[index];
              const percent = Math.round((value / total) * 100);
              const { x, y } = element.tooltipPosition();
              ctx.save();
              ctx.fillStyle = "#111827";
              ctx.font = "12px Inter, sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(`${value} (${percent}%)`, x, y);
              ctx.restore();
            });
          }
        }
      ]
    });

    charts.winnersErrors = new Chart(
      document.getElementById("winners-errors-chart"),
      chartConfig(
        ["Winners", "Errors"],
        [
          {
            label: "Count",
            data: [winnersTotal, errorsTotal],
            backgroundColor: ["#22c55e", "#f97316"]
          }
        ]
      )
    );

    charts.acesFaults = new Chart(
      document.getElementById("aces-doublefaults-chart"),
      chartConfig(
        ["Aces", "Double Faults"],
        [
          {
            label: "Count",
            data: [selectedGame.winners?.aces ?? 0, selectedGame.special?.doubleFault ?? 0],
            backgroundColor: ["#6366f1", "#ef4444"]
          }
        ]
      )
    );

    charts.forehandBackhand = new Chart(
      document.getElementById("forehand-backhand-errors-chart"),
      chartConfig(
        ["Forehand", "Backhand"],
        [
          {
            label: "Errors",
            data: [forehandErrors, backhandErrors],
            backgroundColor: ["#f87171", "#fb7185"]
          }
        ],
        { indexAxis: "y" }
      )
    );

    const serveStats = resolveServeStats(selectedGame, pointsWon + pointsLost);
    charts.serveInPie = new Chart(document.getElementById("serve-in-pie-chart"), {
      type: "doughnut",
      data: {
        labels: ["1st Serve In", "2nd Serve In"],
        datasets: [
          {
            data: [serveStats.firstServeInPercent, serveStats.secondServeInPercent],
            backgroundColor: ["#34d399", "#facc15"]
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        cutout: "60%"
      }
    });

    charts.serviceReturn = new Chart(
      document.getElementById("service-return-points-chart"),
      chartConfig(
        ["Service Points Won", "Return Points Won"],
        [
          {
            label: "Count",
            data: [selectedGame.points?.serveWon ?? 0, selectedGame.points?.returnWon ?? 0],
            backgroundColor: ["#3b82f6", "#f97316"]
          }
        ]
      )
    );
  }

  charts.pointsHistory = new Chart(
    document.getElementById("points-history-chart"),
    chartConfig(
      labels,
      [
        {
          label: "% Points Won",
          data: pointsWonHistory,
          backgroundColor: "#3b82f6"
        }
      ],
      {
        scales: {
          y: { beginAtZero: true, max: 100 }
        }
      }
    )
  );

  charts.errorsHistory = new Chart(
    document.getElementById("errors-history-chart"),
    chartConfig(
      labels,
      [
        {
          label: "Forehand Errors",
          data: forehandErrorsHistory,
          backgroundColor: "#60a5fa"
        },
        {
          label: "Backhand Errors",
          data: backhandErrorsHistory,
          backgroundColor: "#f97316"
        }
      ],
      {
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true }
        }
      }
    )
  );
};

const safePercent = (numerator, denominator) => {
  if (!denominator) {
    return 0;
  }
  return Math.round((numerator / denominator) * 100);
};

const resolveStatePointTotals = () => {
  const pointsWon = state.points.won + state.winners.forehand + state.winners.backhand + state.winners.aces;
  const pointsLost =
    state.errors.forehandLong +
    state.errors.forehandWide +
    state.errors.forehandNet +
    state.errors.backhandLong +
    state.errors.backhandWide +
    state.errors.backhandNet +
    state.special.doubleFault +
    state.special.opponentWinner +
    state.special.opponentAce;
  return { pointsWon, pointsLost };
};

const buildMetrics = (matchDate, opponent, notes) => {
  const { pointsWon, pointsLost } = resolveStatePointTotals();
  const totalPoints = state.shotCount || pointsWon + pointsLost;
  const winnersTotal = state.winners.forehand + state.winners.backhand + state.winners.aces;
  const errorsTotal =
    state.errors.forehandLong +
    state.errors.forehandWide +
    state.errors.forehandNet +
    state.errors.backhandLong +
    state.errors.backhandWide +
    state.errors.backhandNet;

  const totalServes =
    state.serve.firstAttempt +
    state.serve.secondAttempt +
    state.serve.firstServeIn +
    state.serve.secondServeIn;
  const servePoints = totalServes || state.serve.servePoints;
  return {
    date: matchDate,
    description: notes || opponent,
    finalGameScore: `${formatPointScore(pointsWon, pointsLost)}-${formatPointScore(pointsLost, pointsWon)}`,
    gamesWon: state.score.gamesWon,
    gamesLost: state.score.gamesLost,
    gameWinStats: safePercent(state.score.gamesWon, state.score.gamesWon + state.score.gamesLost),
    pointsWon,
    totalPointsPlayed: totalPoints,
    percentPointsWon: safePercent(pointsWon, totalPoints),
    returnPointsWon: state.points.returnWon,
    returnPointsWonPercent: safePercent(state.points.returnWon, pointsWon),
    servePointsWon: state.points.serveWon,
    servePointsWonPercent: safePercent(state.points.serveWon, pointsWon),
    serveInBreakdown: {
      firstServeInPercent: safePercent(state.serve.firstServeIn, servePoints),
      secondServeInPercent: safePercent(state.serve.secondServeIn, servePoints)
    },
    winnerPercent: safePercent(winnersTotal, pointsWon),
    winnerShots: winnersTotal,
    winnerForehand: state.winners.forehand,
    forehandWinners: state.winners.forehand,
    winnerBackhand: state.winners.backhand,
    backhandWinners: state.winners.backhand,
    aces: state.winners.aces,
    totalAces: state.winners.aces,
    gameLossStats: safePercent(state.score.gamesLost, state.score.gamesWon + state.score.gamesLost),
    pointsLost,
    percentPointsLost: safePercent(pointsLost, totalPoints),
    unforcedForehand: state.errors.forehandLong + state.errors.forehandWide + state.errors.forehandNet,
    totalForehandErrors: state.errors.forehandLong + state.errors.forehandWide + state.errors.forehandNet,
    unforcedForehandLong: state.errors.forehandLong,
    unforcedForehandLongErrors: state.errors.forehandLong,
    unforcedForehandNet: state.errors.forehandNet,
    unforcedForehandNetErrors: state.errors.forehandNet,
    unforcedForehandWide: state.errors.forehandWide,
    unforcedForehandWideErrors: state.errors.forehandWide,
    unforcedBackhand: state.errors.backhandLong + state.errors.backhandWide + state.errors.backhandNet,
    totalBackhandErrors: state.errors.backhandLong + state.errors.backhandWide + state.errors.backhandNet,
    unforcedBackhandLong: state.errors.backhandLong,
    unforcedBackhandLongErrors: state.errors.backhandLong,
    unforcedBackhandNet: state.errors.backhandNet,
    unforcedBackhandNetErrors: state.errors.backhandNet,
    unforcedBackhandWide: state.errors.backhandWide,
    unforcedBackhandWideErrors: state.errors.backhandWide,
    firstServe: state.serve.firstAttempt,
    firstServeAttempted: state.serve.firstAttempt,
    firstServeInPercent: safePercent(state.serve.firstServeIn, servePoints),
    firstServeWonDescription: "-",
    firstServeWonPercent: safePercent(state.serve.firstServeWon, servePoints),
    firstServeWon: state.serve.firstServeWon,
    secondServe: state.serve.secondAttempt,
    secondServeAttempted: state.serve.secondAttempt,
    secondServeInPercent: safePercent(state.serve.secondServeIn, servePoints),
    secondServeWonPercent: safePercent(state.serve.secondServeWon, servePoints),
    secondServeWon: state.serve.secondServeWon,
    doubleFaults: state.special.doubleFault,
    winnerFromOpponent: state.special.opponentWinner,
    doubleFaultsFromOpponent: state.special.opponentDoubleFault
  };
};

const updateDashboard = (games) => {
  const sortedGames = [...games].sort((a, b) => {
    const dateA = a.matchDate || a.createdAt || "";
    const dateB = b.matchDate || b.createdAt || "";
    return dateB.localeCompare(dateA);
  });
  dom.gameSelect.innerHTML = "";
  sortedGames.forEach((game, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${game.matchDate || game.createdAt?.slice(0, 10)} · ${game.opponent || "Opponent"}`;
    dom.gameSelect.appendChild(option);
  });
  const selectedGame = sortedGames[0];
  renderGameMeta(selectedGame);
  renderGameSummary(selectedGame);
  buildCharts([...sortedGames].reverse(), selectedGame);
  renderMetrics(selectedGame);
  gamesCache = sortedGames;
};

const fetchGames = async () => {
  const response = await fetch("/api/games");
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return data.games || [];
};

const fetchLatest = async () => {
  const response = await fetch("/api/games/latest");
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return data.game;
};

const saveGame = async () => {
  const matchDate = document.getElementById("match-date").value;
  const opponent = document.getElementById("match-opponent").value;
  const notes = document.getElementById("match-notes").value;

  const metrics = buildMetrics(matchDate, opponent, notes);
  const totals = {
    winners: state.winners.forehand + state.winners.backhand + state.winners.aces,
    errors:
      state.errors.forehandLong +
      state.errors.forehandWide +
      state.errors.forehandNet +
      state.errors.backhandLong +
      state.errors.backhandWide +
      state.errors.backhandNet
  };

  const payload = {
    matchDate,
    opponent,
    notes,
    score: state.score,
    rallyLength: state.rallyLength,
    serve: state.serve,
    winners: state.winners,
    errors: state.errors,
    special: state.special,
    points: state.points,
    totals,
    metrics,
    logs: state.logs
  };

  const response = await fetch("/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    alert("Unable to save game. Check server connection.");
    return;
  }

  resetState();
  await refreshData();
  sessionStorage.removeItem(storageKey);
};

const refreshData = async () => {
  gamesCache = await fetchGames();
  buildSnapshotCards(currentGameSnapshot());
  updateDashboard(gamesCache);
};

const setActiveTab = (tabId) => {
  const buttons = document.querySelectorAll(".tab-button");
  const panels = document.querySelectorAll(".tab-panel");
  buttons.forEach((btn) => btn.classList.remove("active"));
  panels.forEach((panel) => panel.classList.remove("active"));
  document.querySelector(`.tab-button[data-tab="${tabId}"]`)?.classList.add("active");
  document.getElementById(tabId)?.classList.add("active");
};

const initTabs = () => {
  const buttons = document.querySelectorAll(".tab-button");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.tab);
    });
  });
};

const bindEvents = () => {
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      handleAction(button.dataset.action);
      button.classList.remove("is-pressed");
      requestAnimationFrame(() => {
        button.classList.add("is-pressed");
      });
      window.setTimeout(() => {
        button.classList.remove("is-pressed");
      }, 220);
    });
  });
  if (dom.servingToggle) {
    dom.servingToggle.addEventListener("change", (event) => {
      state.serving = event.target.checked;
      ensureGameStartLog();
      renderLogs();
      updateServeButtonsState();
      persistSession();
    });
  }

  document.getElementById("reset-game").addEventListener("click", () => {
    resetState();
    if (dom.servingToggle) {
      dom.servingToggle.checked = false;
      state.serving = false;
    }
    updateServeButtonsState();
  });

  document.getElementById("record-game").addEventListener("click", () => {
    saveGame();
  });

  dom.gameSelect.addEventListener("change", (event) => {
    const selected = gamesCache[Number(event.target.value)];
    if (selected) {
      renderGameMeta(selected);
      renderGameSummary(selected);
      buildCharts([...gamesCache].reverse(), selected);
      renderMetrics(selected);
    }
  });

  if (dom.viewLogsButton) {
    dom.viewLogsButton.addEventListener("click", () => {
      const selected = gamesCache[Number(dom.gameSelect.value)];
      const label = selected
        ? `${selected.matchDate || selected.createdAt?.slice(0, 10)} · ${selected.opponent || "Opponent"}`
        : "Selected Game";
      renderLogs(selected?.logs || [], label);
      setActiveTab("logs");
    });
  }

  if (dom.viewMetricsButton) {
    dom.viewMetricsButton.addEventListener("click", () => {
      const selected = gamesCache[Number(dom.gameSelect.value)];
      renderMetrics(selected);
      setActiveTab("metrics");
    });
  }
};

const toLocalDateString = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
};

const init = async () => {
  restoreSession();
  initTabs();
  bindEvents();
  updateScoreboard();
  renderLogs();
  if (dom.servingToggle) {
    dom.servingToggle.checked = state.serving;
  }
  updateServeButtonsState();
  const matchDateInput = document.getElementById("match-date");
  if (matchDateInput && !matchDateInput.value) {
    matchDateInput.value = toLocalDateString();
  }
  await refreshData();
};

init();
