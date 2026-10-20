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

test("does not contrast-stretch the image (measured against real FM26 screenshots to be actively harmful)", async () => {
  // A narrow-range input: two greys close together, nowhere near black or
  // white. Contrast-stretching (sharp's .normalise()) would spread this out
  // to span close to 0-255; plain greyscale+resize leaves it untouched.
  const input = await sharp({
    create: { width: 100, height: 50, channels: 3, background: { r: 120, g: 120, b: 120 } },
  })
    .composite([
      {
        input: await sharp({
          create: { width: 50, height: 50, channels: 3, background: { r: 140, g: 140, b: 140 } },
        })
          .png()
          .toBuffer(),
        left: 50,
        top: 0,
      },
    ])
    .png()
    .toBuffer();

  const output = await preprocessImage(input);
  const stats = await sharp(output).stats();
  const [channel] = stats.channels;

  // Input spans roughly 120-140; stretched output would push max toward 255.
  expect(channel.max).toBeLessThan(160);
});
