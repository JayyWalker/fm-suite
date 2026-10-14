import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import * as staffApi from "../api/staffApi";
import { MAX_SCREENSHOT_BYTES, ScreenshotUpload } from "./ScreenshotUpload";

function oversizedFile(): File {
  const file = new File(["fake image bytes"], "huge.png", { type: "image/png" });
  Object.defineProperty(file, "size", { value: MAX_SCREENSHOT_BYTES + 1 });
  return file;
}

test("uploading a file calls parseScreenshot and forwards the result", async () => {
  const mockResult = { matched: { physiotherapy: 8 }, unmatched: [], lowConfidence: [] };
  vi.spyOn(staffApi, "parseScreenshot").mockResolvedValue(mockResult);
  const onResult = vi.fn();

  render(<ScreenshotUpload role="physio" label="Upload screenshot" onResult={onResult} />);

  const file = new File(["fake image bytes"], "screenshot.png", { type: "image/png" });
  const input = screen.getByLabelText("Upload screenshot");
  fireEvent.change(input, { target: { files: [file] } });

  await waitFor(() => expect(onResult).toHaveBeenCalledWith(mockResult));
  expect(staffApi.parseScreenshot).toHaveBeenCalledWith("physio", expect.any(String), undefined);
});

test("passes the panel prop through to parseScreenshot", async () => {
  vi.spyOn(staffApi, "parseScreenshot").mockResolvedValue({ nationEntries: [], unmatched: [], lowConfidence: [] });

  render(<ScreenshotUpload role="scout" panel="nationKnowledge" label="Upload nation screenshot" onResult={vi.fn()} />);

  const file = new File(["fake image bytes"], "screenshot.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Upload nation screenshot"), { target: { files: [file] } });

  await waitFor(() => expect(staffApi.parseScreenshot).toHaveBeenCalledWith("scout", expect.any(String), "nationKnowledge"));
});

test("shows an error message when parseScreenshot fails", async () => {
  vi.spyOn(staffApi, "parseScreenshot").mockRejectedValue(new Error("network error"));

  render(<ScreenshotUpload role="physio" label="Upload screenshot" onResult={vi.fn()} />);

  const file = new File(["fake image bytes"], "screenshot.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Upload screenshot"), { target: { files: [file] } });

  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Couldn't read that screenshot"));
});

test("rejects an oversized image locally, with its own message and no request", async () => {
  vi.spyOn(staffApi, "parseScreenshot").mockResolvedValue({ matched: {}, unmatched: [], lowConfidence: [] });

  render(<ScreenshotUpload role="physio" label="Upload screenshot" onResult={vi.fn()} />);

  fireEvent.change(screen.getByLabelText("Upload screenshot"), { target: { files: [oversizedFile()] } });

  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Image too large"));
  expect(staffApi.parseScreenshot).not.toHaveBeenCalled();
});

test("shows the too-large message when the server rejects the payload as too large", async () => {
  vi.spyOn(staffApi, "parseScreenshot").mockRejectedValue(
    Object.assign(new Error("Screenshot too large"), { code: "IMAGE_TOO_LARGE" }),
  );

  render(<ScreenshotUpload role="physio" label="Upload screenshot" onResult={vi.fn()} />);

  const file = new File(["fake image bytes"], "screenshot.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Upload screenshot"), { target: { files: [file] } });

  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Image too large"));
});
