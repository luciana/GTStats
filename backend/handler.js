import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

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

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  },
  body: JSON.stringify(payload)
});

const parseBody = (event) => {
  if (!event.body) {
    return null;
  }
  const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf-8") : event.body;
  return JSON.parse(raw);
};

const normalizePath = (event) => {
  const rawPath = event.rawPath || event.path || "/";
  const stage = event.requestContext?.stage;
  if (stage && rawPath.startsWith(`/${stage}/`)) {
    return rawPath.slice(stage.length + 1);
  }
  return rawPath;
};

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || "GET";
  const path = normalizePath(event);

  if (method === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }

  try {
    if (method === "GET" && path === "/api/games") {
      console.log("Listing games from S3 bucket:", bucketName);
      const objects = await listGameObjects();
      const sorted = objects
        .filter((object) => object.Key?.endsWith(".json"))
        .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));
      const games = await Promise.all(sorted.map((object) => getGameFromKey(object.Key)));
      return jsonResponse(200, { games });
    }

    if (method === "GET" && path === "/api/games/latest") {
      console.log("Fetching latest game from S3 bucket:", bucketName);
      const objects = await listGameObjects();
      const latest = objects
        .filter((object) => object.Key?.endsWith(".json"))
        .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))[0];

      if (!latest?.Key) {
        return jsonResponse(200, { game: null });
      }

      const game = await getGameFromKey(latest.Key);
      return jsonResponse(200, { game });
    }

    if (method === "POST" && path === "/api/games") {
      console.log("Saving game to S3 bucket:", bucketName);
      const body = parseBody(event);
      console.log("Request payload keys:", Object.keys(body || {}));
      const timestamp = new Date().toISOString();
      const gameId = `${timestamp.replace(/[:.]/g, "-")}`;
      const game = {
        id: gameId,
        createdAt: timestamp,
        ...body
      };

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: `games/${gameId}.json`,
        Body: JSON.stringify(game, null, 2),
        ContentType: "application/json"
      });

      await s3Client.send(command);
      return jsonResponse(201, { game });
    }

    return jsonResponse(404, { error: "Not found." });
  } catch (error) {
    console.error("Request failed:", error);
    return jsonResponse(500, { error: "Unable to process request." });
  }
};
