import { createWorker } from "tesseract.js";

export interface OcrLine {
  text: string;
  confidence: number;
}

export async function runOcr(input: Buffer): Promise<OcrLine[]> {
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(input, {}, { blocks: true });
    const lines: OcrLine[] = [];
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          lines.push({ text: line.text, confidence: line.confidence });
        }
      }
    }
    return lines;
  } finally {
    await worker.terminate();
  }
}
