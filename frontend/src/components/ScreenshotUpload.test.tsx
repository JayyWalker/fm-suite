import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import * as staffApi from "../api/staffApi";
import { ScreenshotUpload } from "./ScreenshotUpload";

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
