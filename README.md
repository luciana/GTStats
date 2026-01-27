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

## Importing existing history

If you have a tab-separated export of your historical stats (matching the spreadsheet columns), you can convert it into the JSON format that the app saves in S3.

1. Save the export as a tab-separated file (TSV).
2. Run the import script:

```bash
node scripts/import_metrics.js path/to/history.tsv path/to/output-dir
```

The output is a set of `<match-date>-<row>.json` files ready to upload to your S3 bucket under `games/<id>.json` keys.
