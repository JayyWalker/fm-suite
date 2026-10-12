import { expect, test } from "vitest";
import { rawAttributeToStars } from "./starRating";

test("maps the lowest raw value (1) to 1 star", () => {
  expect(rawAttributeToStars(1)).toBe(1);
});

test("maps the highest raw value (8) to 5 stars", () => {
  expect(rawAttributeToStars(8)).toBe(5);
});

test("maps mid-range raw values consistently with the backend's 1-8 to 1-5 formula", () => {
  expect(rawAttributeToStars(4)).toBe(3);
  expect(rawAttributeToStars(5)).toBe(3);
  expect(rawAttributeToStars(6)).toBe(4);
  expect(rawAttributeToStars(7)).toBe(4);
});
