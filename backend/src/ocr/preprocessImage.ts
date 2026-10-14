import sharp from "sharp";

export async function preprocessImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .greyscale()
    .toColourspace("b-w")
    .normalise()
    .resize({ width: 2400 })
    .toBuffer();
}
