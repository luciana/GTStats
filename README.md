# GTStats

GTStats is a Node.js + Express app that captures Giulia's tennis match stats, stores each match in an AWS S3 bucket, and renders interactive charts for snapshots and history.

## Features

- **Entry page** for live stat tracking (serve attempts, winners, errors, rallies, and special events).
- **Last Game Snapshot** to review key metrics immediately after saving.
- **Game Dashboard** with interactive charts powered by Chart.js.
- **Logs** for play-by-play notes stored with each match.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create an `.env` file in the project root:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=your_bucket_name
PORT=3000
```

3. Start the server:

```bash
npm start
```

Visit `http://localhost:3000`.

## Data format

Each game is stored in S3 under `games/<timestamp>.json` with fields for scores, serve stats, winners, errors, special events, and logs.

## Metrics and button mapping

The UI buttons update the following metrics in the saved game payload:

### Serve tracking
- **1st Miss** → `serve.firstAttempt` (first-serve miss count), and logs a serve miss note. (`public/app.js` action: `firstServeAttempt`)
- **2nd Miss** → `serve.secondAttempt`, `special.doubleFault`, and a point lost (opponent wins the point). (`secondServeAttempt`)
- **1st In** → `serve.firstServeIn` (first-serve in count), notes “Giulia first serve in”. (`firstServeIn`)
- **2nd In** → `serve.secondServeIn` (second-serve in count), notes “Giulia second serve in”. (`secondServeIn`)
- **ACE** (Serves box) → `winners.aces`, point won, and serve win tracking. (`winnerAce`)

Serve percentage metrics:
- `firstServeInPercent` = `firstServeIn / totalServes`
- `secondServeInPercent` = `secondServeIn / totalServes`
- `firstServeWonPercent` = `firstServeWon / totalServes`
- `secondServeWonPercent` = `secondServeWon / totalServes`
- `totalServes` = `firstAttempt + secondAttempt + firstServeIn + secondServeIn`

### Points & winners
- **Won** → `points.won`, point won. (`wonPoint`)
- **FH** → `winners.forehand`, point won. (`winnerForehand`)
- **BH** → `winners.backhand`, point won. (`winnerBackhand`)
- **Return Points Won** → increments `points.returnWon` when **Won** is clicked while **Serving** is unchecked.
- **Serve Points Won** → increments `points.serveWon` when **Won** is clicked while **Serving** is checked.

### Errors (points lost)
- **Forehand/Backhand Long/Wide/Net** → increments corresponding `errors.*` field and counts as a point lost. (`errorForehandLong`, `errorForehandWide`, `errorForehandNet`, `errorBackhandLong`, `errorBackhandWide`, `errorBackhandNet`)
- **2nd Miss** → `special.doubleFault` and counts as a point lost. (`secondServeAttempt`)

### Opponent actions
- **DF** → `special.opponentDoubleFault` and counts as a point won. (`opponentDoubleFault`)
- **ACE** → `special.opponentAce` and counts as a point lost. (`opponentAce`)
- **Winner** → `special.opponentWinner` and counts as a point lost. (`opponentWinner`)

### Derived metrics (game dashboard)
- **Points Won** = `points.won + winners.forehand + winners.backhand + winners.aces`
- **Points Lost** = all errors + `special.doubleFault + special.opponentWinner + special.opponentAce`
- **Total Points Played** = `shotCount` (fallback to points won + points lost if needed)
- **Winner %** = winning shots (`winners.forehand + winners.backhand`) divided by points won
- **Return Points Won %** = `points.returnWon / pointsWon`
- **Serve Points Won %** = `points.serveWon / pointsWon`

### Logs
- Logs store numeric `game` and `shot` values and raw serve notes (e.g., “Giulia won point”). The UI renders prefixes like `Game:`, `Shot:`, and `Serve:` for display.

## Importing existing history

If you have a tab-separated export of your historical stats (matching the spreadsheet columns), you can convert it into the JSON format that the app saves in S3.

1. Save the export as a tab-separated file (TSV).
2. Run the import script:

```bash
node scripts/import_metrics.js path/to/history.tsv path/to/output-dir
```

The output is a set of `<match-date>-<row>.json` files ready to upload to your S3 bucket under `games/<id>.json` keys.
