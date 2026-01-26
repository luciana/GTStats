# GTStats

GTStats is a monorepo that captures Giulia's tennis match stats, stores each match in an AWS S3 bucket, and renders interactive charts for snapshots and history. The frontend is static and deploys to Amplify (or S3/CloudFront), while the backend runs as an AWS Lambda API.

## Features

- **Entry page** for live stat tracking (serve attempts, winners, errors, rallies, and special events).
- **Last Game Snapshot** to review key metrics immediately after saving.
- **Game Dashboard** with interactive charts powered by Chart.js.
- **Logs** for play-by-play notes stored with each match.

## Repository layout

- `frontend/` — static site assets (deploy to Amplify Hosting).
- `backend/` — Lambda handler for the `/api/*` routes.
- `scripts/` — data import utilities for historical stats.

## Setup

1. Install backend dependencies:

```bash
cd backend
npm install
```

2. Configure backend environment variables (in Lambda or a local `.env` file):

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=your_bucket_name
```

3. Deploy:

- **Frontend:** Deploy `frontend/public/` via Amplify Hosting.
- **Backend:** Deploy `backend/handler.js` as a Lambda function behind API Gateway.
Set your frontend to call the API Gateway URL (for example, `https://<id>.execute-api.<region>.amazonaws.com`). Because the frontend uses relative `/api` calls, configure an Amplify rewrite rule to proxy `/api/*` to the API Gateway base URL or replace the fetch base URL in `frontend/public/app.js`.

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
