import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import { classifyImage as classifyWithClient, type ClassifyEnv } from '../src/lib/classify-client';

const env: ClassifyEnv = {
  INFERSHUB_API_KEY: process.env.INFERSHUB_API_KEY,
  INFERSHUB_BASE_URL: process.env.INFERSHUB_BASE_URL,
  CLASSIFY_MODEL_MAIN: process.env.CLASSIFY_MODEL_MAIN,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};

const PHOTOS_DIR = path.join(process.cwd(), 'public/photos');
const MANIFEST_PATH = path.join(process.cwd(), 'src/data/media-classification.json');

function fileToBase64(filePath: string): string {
  return fs.readFileSync(filePath).toString('base64');
}

async function classifyImage(fileName: string, retryCount = 0) {
  const filePath = path.join(PHOTOS_DIR, fileName);
  const base64Data = fileToBase64(filePath);

  try {
    const text = await classifyWithClient(base64Data, "image/jpeg", env);
    return JSON.parse(text);
  } catch (error: any) {
    if ((error.status === 503 || error.status === 429) && retryCount < 3) {
      console.log(`Retrying ${fileName} due to ${error.status}... (Attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
      return classifyImage(fileName, retryCount + 1);
    }
    console.error(`Error classifying ${fileName}:`, error);
    return null;
  }
}

async function main() {
  const files = fs.readdirSync(PHOTOS_DIR)
    .filter(f => f.endsWith('_thumb.jpg'))
    .sort();

  console.log(`Found ${files.length} images to process.`);

  let manifest: Record<string, any> = {};
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  }

  const limit = pLimit(5); // Process 5 images concurrently
  let count = 0;
  let skipped = 0;

  const tasks = files.map(file => limit(async () => {
    // Also skip the full resolution file if we process the thumbnail
    const fullFileName = file.replace('_thumb.jpg', '.jpg');

    if (manifest[file]) {
      skipped++;
      return;
    }

    const result = await classifyImage(file);
    if (result) {
      manifest[file] = result;
      // Mirror to full resolution file
      if (fs.existsSync(path.join(PHOTOS_DIR, fullFileName))) {
        manifest[fullFileName] = result;
      }

      count++;
      if (count % 10 === 0) {
        console.log(`Processed ${count} new images...`);
        fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
      }
    }

    // Safety delay to avoid hitting rate limits too hard
    await new Promise(resolve => setTimeout(resolve, 500));
  }));

  await Promise.all(tasks);

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Finished! Processed: ${count}, Skipped: ${skipped}`);
}

main().catch(console.error);
