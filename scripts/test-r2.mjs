import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";

config();

const client = new S3Client({
  region: "auto",
  endpoint: process.env.STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.STORAGE_BUCKET;

try {
  // 1. List
  const list = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
  console.log("✓ List bucket — OK (keyCount:", list.KeyCount ?? 0, ")");

  // 2. Upload a test file
  const key = `test/r2-connection-check-${Date.now()}.txt`;
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: "R2 connection test",
    ContentType: "text/plain",
    ServerSideEncryption: "AES256",
  }));
  console.log("✓ Upload — OK (key:", key, ")");

  // 3. Delete the test file
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  console.log("✓ Delete — OK");

  console.log("\nAll R2 checks passed — storage is configured correctly.");
} catch (e) {
  console.error("\n✗ R2 test FAILED:", e.message);
  process.exit(1);
}
