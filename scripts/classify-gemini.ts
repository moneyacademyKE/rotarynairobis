import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pLimit from 'p-limit';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

const PHOTOS_DIR = path.join(process.cwd(), 'public/photos');
const MANIFEST_PATH = path.join(process.cwd(), 'src/data/media-classification.json');

const PROMPT = `
You are a high-fidelity visual auditor for the Rotary Club of Nairobi South. 
Your task is to classify images into one of four distinct categories based on their visual content.

Categories:
1. EVENT_POSTER: This is an upcoming event announcement flyer. It MUST have explicit markers for "Date" and "Venue"/"Location".
2. BIRTHDAY: This is a birthday celebration graphic. It MUST explicitly contain the word "Birthday".
3. EVENT_RECAP: This is a retrospective summary of a past event. It is usually a collage of photos or a "Moments" / "Highlights" graphic. It should NOT be an upcoming announcement.
4. PHOTO: This is regular, raw photography of people, meetings, or club fellowship. It is not a designed graphic.

Instructions:
- Analyze the image carefully.
- Extract any key text visible in the image as a "snippet" (max 100 characters).
- Assign the category based on the rules above.

Output format (strict JSON):
{
  "type": "CATEGORY_NAME",
  "snippet": "visible text..."
}
`;

function fileToBase64(filePath: string): string {
  return fs.readFileSync(filePath).toString('base64');
}

async function classifyImage(fileName: string, retryCount = 0) {
  const filePath = path.join(PHOTOS_DIR, fileName);
  const base64Data = fileToBase64(filePath);

  try {
    const result = await model.generateContent([
      PROMPT,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg"
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    const cleanText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanText);
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
