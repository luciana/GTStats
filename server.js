import express from "express";
import dotenv from "dotenv";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const bucketName = process.env.S3_BUCKET;
const region = process.env.AWS_REGION;

if (!bucketName) {
  console.warn("S3_BUCKET is not set. API calls will fail until configured.");
}

const s3Client = new S3Client({
  region,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    : undefined
});

app.use(express.json());
app.use(express.static("public"));

const streamToString = async (stream) => {
  if (stream instanceof Readable) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
  }
  return "";
};

const listGameObjects = async () => {
  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: "games/"
  });
  const response = await s3Client.send(command);
  return response.Contents ?? [];
};

const getGameFromKey = async (key) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key
  });
  const response = await s3Client.send(command);
  const body = await streamToString(response.Body);
  return JSON.parse(body);
};

app.get("/api/games", async (_req, res) => {
  try {
    const objects = await listGameObjects();
    const sorted = objects
      .filter((object) => object.Key?.endsWith(".json"))
      .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));
    const games = await Promise.all(sorted.map((object) => getGameFromKey(object.Key)));
    res.json({ games });
  } catch (error) {
    res.status(500).json({ error: "Unable to load games." });
  }
});

app.get("/api/games/latest", async (_req, res) => {
  try {
    const objects = await listGameObjects();
    const latest = objects
      .filter((object) => object.Key?.endsWith(".json"))
      .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))[0];

    if (!latest?.Key) {
      res.json({ game: null });
      return;
    }

    const game = await getGameFromKey(latest.Key);
    res.json({ game });
  } catch (error) {
    res.status(500).json({ error: "Unable to load latest game." });
  }
});

app.post("/api/games", async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const gameId = `${timestamp.replace(/[:.]/g, "-")}`;
    const game = {
      id: gameId,
      createdAt: timestamp,
      ...req.body
    };

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `games/${gameId}.json`,
      Body: JSON.stringify(game, null, 2),
      ContentType: "application/json"
    });

    await s3Client.send(command);
    res.status(201).json({ game });
  } catch (error) {
    res.status(500).json({ error: "Unable to save game." });
  }
});

app.listen(port, () => {
  console.log(`GTStats listening on port ${port}`);
});
