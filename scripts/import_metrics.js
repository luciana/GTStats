import fs from "node:fs/promises";

const parseNumber = (value) => {
  if (!value) {
    return 0;
  }
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned) {
    return 0;
  }
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const parsePercent = (value) => {
  if (!value) {
    return 0;
  }
  const match = String(value).match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return 0;
  }
  return Math.round(Number(match[1]));
};

const parseDate = (value) => {
  if (!value) {
    return "";
  }
  const [month, day, year] = String(value).split(/[/-]/).map((part) => part.trim());
  if (!year || !month || !day) {
    return "";
  }
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const parseFinalScore = (value) => {
  if (!value) {
    return { gamesWon: 0, gamesLost: 0, label: "0-0" };
  }
  const parts = String(value)
    .replace(/\s+/g, " ")
    .split(/[-–]/)
    .map((part) => parseNumber(part));
  if (parts.length < 2) {
    return { gamesWon: 0, gamesLost: 0, label: "0-0" };
  }
  return { gamesWon: parts[0], gamesLost: parts[1], label: `${parts[0]}-${parts[1]}` };
};

const parseRow = (row, index) => {
  const columns = row.split("\t");
  const date = parseDate(columns[0]);
  const description = columns[1] || "";
  const finalScore = parseFinalScore(columns[2]);

  const pointsWon = parseNumber(columns[6]);
  const totalPointsPlayed = parseNumber(columns[7]);
  const pointsLost = parseNumber(columns[19]);
  const totalPoints = totalPointsPlayed || pointsWon + pointsLost;

  const winnersTotal = parseNumber(columns[10]);
  const forehandWinners = parseNumber(columns[12]);
  const backhandWinners = parseNumber(columns[14]);
  const aces = parseNumber(columns[15]);

  const forehandErrors = parseNumber(columns[21]);
  const backhandErrors = parseNumber(columns[29]);
  const totalErrors = forehandErrors + backhandErrors;

  const forehandLong = parseNumber(columns[23]);
  const forehandNet = parseNumber(columns[25]);
  const forehandWide = parseNumber(columns[27]);
  const backhandLong = parseNumber(columns[31]);
  const backhandNet = parseNumber(columns[33]);
  const backhandWide = parseNumber(columns[35]);

  const firstServeAttempted = parseNumber(columns[38]);
  const firstServeInPercent = parsePercent(columns[39]);
  const firstServeWonPercent = parsePercent(columns[41]);
  const firstServeWon = parseNumber(columns[42]);
  const firstServeReturnWon = parseNumber(columns[43]);

  const secondServeAttempted = parseNumber(columns[45]);
  const secondServeWonPercent = parsePercent(columns[46]);
  const secondServeWon = parseNumber(columns[47]);
  const secondServeReturnWon = parseNumber(columns[48]);

  const doubleFaults = parseNumber(columns[49]);
  const opponentWinners = parseNumber(columns[50]);
  const opponentDoubleFaults = parseNumber(columns[51]);

  const createdAt = new Date().toISOString();
  const baseId = date ? `${date}-${index + 1}` : `unknown-date-${index + 1}`;

  return {
    id: baseId,
    createdAt,
    matchDate: date,
    opponent: "",
    notes: description,
    score: {
      pointsWon,
      pointsLost,
      gamesWon: finalScore.gamesWon,
      gamesLost: finalScore.gamesLost
    },
    rallyLength: 0,
    serve: {
      firstAttempt: firstServeAttempted,
      secondAttempt: secondServeAttempted
    },
    winners: {
      forehand: forehandWinners,
      backhand: backhandWinners,
      aces
    },
    errors: {
      forehandLong,
      forehandWide,
      forehandNet,
      backhandLong,
      backhandWide,
      backhandNet
    },
    special: {
      doubleFault: doubleFaults,
      opponentDoubleFault: opponentDoubleFaults,
      opponentWinner: opponentWinners
    },
    totals: {
      winners: winnersTotal,
      errors: totalErrors
    },
    metrics: {
      date,
      description,
      finalGameScore: finalScore.label,
      gamesWon: finalScore.gamesWon,
      gamesLost: finalScore.gamesLost,
      gameWinStats: parsePercent(columns[5]),
      pointsWon,
      totalPointsPlayed: totalPoints,
      percentPointsWon: parsePercent(columns[8]),
      winnerPercent: parsePercent(columns[9]),
      winnerShots: winnersTotal,
      winnerForehand: parseNumber(columns[11]),
      forehandWinners,
      winnerBackhand: parseNumber(columns[13]),
      backhandWinners,
      aces,
      totalAces: parseNumber(columns[16]),
      gameLossStats: parsePercent(columns[18]),
      pointsLost,
      percentPointsLost: parsePercent(columns[20]),
      unforcedForehand: parseNumber(columns[21]),
      totalForehandErrors: forehandErrors,
      unforcedForehandLong: parseNumber(columns[23]),
      unforcedForehandLongErrors: parseNumber(columns[24]),
      unforcedForehandNet: parseNumber(columns[25]),
      unforcedForehandNetErrors: parseNumber(columns[26]),
      unforcedForehandWide: parseNumber(columns[27]),
      unforcedForehandWideErrors: parseNumber(columns[28]),
      unforcedBackhand: parseNumber(columns[29]),
      totalBackhandErrors: backhandErrors,
      unforcedBackhandLong: parseNumber(columns[31]),
      unforcedBackhandLongErrors: parseNumber(columns[32]),
      unforcedBackhandNet: parseNumber(columns[33]),
      unforcedBackhandNetErrors: parseNumber(columns[34]),
      unforcedBackhandWide: parseNumber(columns[35]),
      unforcedBackhandWideErrors: parseNumber(columns[36]),
      firstServe: parseNumber(columns[37]),
      firstServeAttempted,
      firstServeInPercent,
      firstServeWonDescription: columns[40] || "-",
      firstServeWonPercent,
      firstServeWon,
      firstServeReturnWon,
      secondServe: parseNumber(columns[44]),
      secondServeAttempted,
      secondServeWonPercent,
      secondServeWon,
      secondServeReturnWon,
      doubleFaults,
      winnerFromOpponent: opponentWinners,
      doubleFaultsFromOpponent: opponentDoubleFaults
    },
    logs: []
  };
};

const run = async () => {
  const [inputPath, outputDir] = process.argv.slice(2);
  if (!inputPath || !outputDir) {
    console.error("Usage: node scripts/import_metrics.js <input.tsv> <output-dir>");
    process.exit(1);
  }

  const raw = await fs.readFile(inputPath, "utf-8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  const rows = lines.slice(1);
  const games = rows.map((row, index) => parseRow(row, index));

  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all(
    games.map((game) =>
      fs.writeFile(`${outputDir}/${game.id}.json`, JSON.stringify(game, null, 2))
    )
  );
  console.log(`Wrote ${games.length} games to ${outputDir}`);
};

run();
