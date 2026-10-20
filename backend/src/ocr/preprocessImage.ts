import sharp from "sharp";

export async function preprocessImage(input: Buffer): Promise<Buffer> {
  // Deliberately NOT calling .normalise() here (sharp's contrast-stretch).
  // Measured against 11 real FM26 screenshots (2026-10-20): adding it back
  // drops correct attribute matches from 57/64 to 47/64 and loses the
  // staff member's name entirely on some screenshots that read fine
  // without it. Don't re-add it without re-measuring against real images.
  return sharp(input).greyscale().toColourspace("b-w").resize({ width: 2400 }).toBuffer();
}
