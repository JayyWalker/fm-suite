import { expect, test } from "vitest";
import sharp from "sharp";
import { preprocessImage } from "./preprocessImage";

test("returns a valid, greyscale, wider image", async () => {
  const input = await sharp({
    create: { width: 100, height: 50, channels: 3, background: { r: 10, g: 20, b: 200 } },
  })
    .png()
    .toBuffer();

  const output = await preprocessImage(input);
  const metadata = await sharp(output).metadata();

  expect(metadata.width).toBe(2400);
  expect(metadata.channels).toBe(1);
});
