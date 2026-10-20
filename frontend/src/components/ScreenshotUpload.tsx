import { useState } from "react";
import { parseScreenshot, type ParseScreenshotResult } from "../api/staffApi";
import styles from "./ScreenshotUpload.module.css";

/**
 * Base64 inflates an image by a third, and the server's body limit for this
 * route is 20 MB, so refuse anything that clearly won't fit before uploading.
 */
export const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

const MAX_SCREENSHOT_MB = Math.round(MAX_SCREENSHOT_BYTES / (1024 * 1024));

function isTooLargeError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "IMAGE_TOO_LARGE";
}

interface ScreenshotUploadProps {
  role: string;
  panel?: "attributes" | "nationKnowledge";
  label: string;
  onResult: (result: ParseScreenshotResult) => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ScreenshotUpload({ role, panel, label, onResult }: ScreenshotUploadProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "tooLarge">("idle");

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_SCREENSHOT_BYTES) {
      setStatus("tooLarge");
      return;
    }

    setStatus("loading");
    try {
      const imageBase64 = await fileToBase64(file);
      const result = await parseScreenshot(role, imageBase64, panel);
      onResult(result);
      setStatus("idle");
    } catch (error) {
      setStatus(isTooLargeError(error) ? "tooLarge" : "error");
    }
  }

  const isLoading = status === "loading";

  return (
    <div className={styles.wrapper}>
      <label className={isLoading ? `${styles.button} ${styles.buttonDisabled}` : styles.button}>
        {isLoading ? "Reading screenshot…" : label}
        <input
          type="file"
          accept="image/*"
          aria-label={label}
          onChange={handleChange}
          disabled={isLoading}
          className={styles.input}
        />
      </label>
      {status === "error" && <span role="alert" className={styles.error}>Couldn't read that screenshot</span>}
      {status === "tooLarge" && (
        <span role="alert" className={styles.error}>
          Image too large — please upload a screenshot under {MAX_SCREENSHOT_MB} MB
        </span>
      )}
    </div>
  );
}
