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
    secondAttempt: 0
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
    opponentWinner: 0
  },
  logs: []
};

const dom = {
  scoreGiulia: document.getElementById("score-giulia"),
  scoreOpponent: document.getElementById("score-opponent"),
  gamesWon: document.getElementById("games-won"),
  gamesLost: document.getElementById("games-lost"),
  rallyLength: document.getElementById("rally-length"),
  snapshotCards: document.getElementById("snapshot-cards"),
  logList: document.getElementById("log-list"),
  gameSelect: document.getElementById("game-select")
};

let charts = {};
let gamesCache = [];

const pointLabels = ["0", "15", "30", "40"];

const formatPointScore = (pointsFor, pointsAgainst) => {
  if (pointsFor >= 3 && pointsAgainst >= 3) {
    if (pointsFor === pointsAgainst) {
      return "40";
    }
    if (pointsFor === pointsAgainst + 1) {
      return "in";
    }
    if (pointsAgainst === pointsFor + 1) {
      return "out";
    }
  }

  return pointLabels[Math.min(pointsFor, 3)];
};

const updateScoreboard = () => {
  dom.scoreGiulia.textContent = formatPointScore(state.score.pointsWon, state.score.pointsLost);
  dom.scoreOpponent.textContent = formatPointScore(state.score.pointsLost, state.score.pointsWon);
  dom.gamesWon.textContent = state.score.gamesWon;
  dom.gamesLost.textContent = state.score.gamesLost;
  dom.rallyLength.textContent = state.rallyLength;
};

const addLog = (message) => {
  const timestamp = new Date().toLocaleTimeString();
  state.logs.unshift(`${timestamp} · ${message}`);
  renderLogs();
};

const renderLogs = () => {
  dom.logList.innerHTML = "";
  state.logs.slice(0, 30).forEach((log) => {
    const item = document.createElement("li");
    item.textContent = log;
    dom.logList.appendChild(item);
  });
};

const resetState = () => {
  Object.assign(state.score, { pointsWon: 0, pointsLost: 0, gamesWon: 0, gamesLost: 0 });
  state.rallyLength = 0;
  Object.keys(state.serve).forEach((key) => (state.serve[key] = 0));
  Object.keys(state.winners).forEach((key) => (state.winners[key] = 0));
  Object.keys(state.errors).forEach((key) => (state.errors[key] = 0));
  Object.keys(state.special).forEach((key) => (state.special[key] = 0));
  state.logs = [];
  updateScoreboard();
  renderLogs();
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
    }
  }
  updateScoreboard();
};

const handleAction = (action) => {
  switch (action) {
    case "rally":
      state.rallyLength += 1;
      addLog("Rally hit added.");
      break;
    case "resetRally":
      state.rallyLength = 0;
      addLog("Rally reset.");
      break;
    case "firstServeAttempt":
      state.serve.firstAttempt += 1;
      addLog("1st serve attempted (missed).");
      break;
    case "secondServeAttempt":
      state.serve.secondAttempt += 1;
      addLog("2nd serve attempted (missed).");
      break;
    case "wonOnServe":
      scorePoint("giulia");
      addLog("Won on serve.");
      break;
    case "returnWon":
      scorePoint("giulia");
      addLog("Return won.");
      break;
    case "winnerForehand":
      state.winners.forehand += 1;
      addLog("Forehand winner.");
      break;
    case "winnerBackhand":
      state.winners.backhand += 1;
      addLog("Backhand winner.");
      break;
    case "winnerAce":
      state.winners.aces += 1;
      scorePoint("giulia");
      addLog("Ace winner.");
      break;
    case "errorForehandLong":
      state.errors.forehandLong += 1;
      scorePoint("opponent");
      addLog("Forehand error (long). Point to opponent.");
      break;
    case "errorForehandWide":
      state.errors.forehandWide += 1;
      scorePoint("opponent");
      addLog("Forehand error (wide). Point to opponent.");
      break;
    case "errorForehandNet":
      state.errors.forehandNet += 1;
      scorePoint("opponent");
      addLog("Forehand error (net). Point to opponent.");
      break;
    case "errorBackhandLong":
      state.errors.backhandLong += 1;
      scorePoint("opponent");
      addLog("Backhand error (long). Point to opponent.");
      break;
    case "errorBackhandWide":
      state.errors.backhandWide += 1;
      scorePoint("opponent");
      addLog("Backhand error (wide). Point to opponent.");
      break;
    case "errorBackhandNet":
      state.errors.backhandNet += 1;
      scorePoint("opponent");
      addLog("Backhand error (net). Point to opponent.");
      break;
    case "doubleFault":
      state.special.doubleFault += 1;
      scorePoint("opponent");
      addLog("Double fault. Point to opponent.");
      break;
    case "opponentDoubleFault":
      state.special.opponentDoubleFault += 1;
      scorePoint("giulia");
      addLog("Opponent double fault. Point to Giulia.");
      break;
    case "opponentWinner":
      state.special.opponentWinner += 1;
      scorePoint("opponent");
      addLog("Opponent winner. Point to opponent.");
      break;
    default:
      break;
  }
  updateScoreboard();
};

const buildSnapshotCards = (game) => {
  if (!game) {
    dom.snapshotCards.innerHTML = "<p>No games recorded yet.</p>";
    return;
  }
  const cards = [
    {
      label: "Final Score",
      value: `${formatPointScore(game.score?.pointsWon ?? 0, game.score?.pointsLost ?? 0)} - ${formatPointScore(
        game.score?.pointsLost ?? 0,
        game.score?.pointsWon ?? 0
      )}`
    },
    { label: "Games Won", value: game.score?.gamesWon ?? 0 },
    { label: "Games Lost", value: game.score?.gamesLost ?? 0 },
    { label: "Winners", value: game.totals?.winners ?? 0 },
    { label: "Errors", value: game.totals?.errors ?? 0 },
    { label: "Aces", value: game.winners?.aces ?? 0 },
    { label: "Double Faults", value: game.special?.doubleFault ?? 0 },
    { label: "Opponent Winners", value: game.special?.opponentWinner ?? 0 }
  ];

  dom.snapshotCards.innerHTML = "";
  cards.forEach((card) => {
    const div = document.createElement("div");
    div.className = "snapshot-card";
    div.innerHTML = `<strong>${card.label}</strong><p class="score-value">${card.value}</p>`;
    dom.snapshotCards.appendChild(div);
  });
};

const chartConfig = (labels, data, label, color) => ({
  type: "bar",
  data: {
    labels,
    datasets: [{
      label,
      data,
      backgroundColor: color
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: "bottom" }
    }
  }
});

const buildCharts = (games) => {
  if (!games.length) {
    return;
  }
  const labels = games.map((game) => game.matchDate || game.createdAt?.slice(0, 10));
  const pointsWon = games.map((game) => game.score?.pointsWon ?? 0);
  const pointsLost = games.map((game) => game.score?.pointsLost ?? 0);
  const winners = games.map((game) => game.totals?.winners ?? 0);
  const errors = games.map((game) => game.totals?.errors ?? 0);
  const aces = games.map((game) => game.winners?.aces ?? 0);
  const doubleFaults = games.map((game) => game.special?.doubleFault ?? 0);

  charts.points?.destroy();
  charts.winners?.destroy();
  charts.errors?.destroy();
  charts.serve?.destroy();

  charts.points = new Chart(
    document.getElementById("points-chart"),
    {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Points Won",
            data: pointsWon,
            borderColor: "#2f6fed",
            backgroundColor: "rgba(47, 111, 237, 0.2)",
            tension: 0.3
          },
          {
            label: "Points Lost",
            data: pointsLost,
            borderColor: "#e64646",
            backgroundColor: "rgba(230, 70, 70, 0.2)",
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" }
        }
      }
    }
  );

  charts.winners = new Chart(
    document.getElementById("winners-chart"),
    chartConfig(labels, winners, "Total Winners", "#21a675")
  );

  charts.errors = new Chart(
    document.getElementById("errors-chart"),
    chartConfig(labels, errors, "Total Errors", "#f59e0b")
  );

  charts.serve = new Chart(
    document.getElementById("serve-chart"),
    {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Aces",
            data: aces,
            backgroundColor: "#6366f1"
          },
          {
            label: "Double Faults",
            data: doubleFaults,
            backgroundColor: "#ef4444"
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" }
        }
      }
    }
  );
};

const updateDashboard = (games) => {
  dom.gameSelect.innerHTML = "";
  games.forEach((game, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${game.matchDate || game.createdAt?.slice(0, 10)} · ${game.opponent || "Opponent"}`;
    dom.gameSelect.appendChild(option);
  });
  buildCharts(games);
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
    totals,
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
  addLog("Game saved to S3.");
};

const refreshData = async () => {
  gamesCache = await fetchGames();
  const latest = gamesCache[0] || null;
  buildSnapshotCards(latest);
  updateDashboard(gamesCache);
};

const initTabs = () => {
  const buttons = document.querySelectorAll(".tab-button");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((btn) => btn.classList.remove("active"));
      panels.forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.tab).classList.add("active");
    });
  });
};

const bindEvents = () => {
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });

  document.getElementById("reset-game").addEventListener("click", () => {
    resetState();
  });

  document.getElementById("record-game").addEventListener("click", () => {
    saveGame();
  });

  dom.gameSelect.addEventListener("change", (event) => {
    const selected = gamesCache[Number(event.target.value)];
    if (selected) {
      buildSnapshotCards(selected);
    }
  });
};

const init = async () => {
  initTabs();
  bindEvents();
  updateScoreboard();
  renderLogs();
  await refreshData();
};

init();
