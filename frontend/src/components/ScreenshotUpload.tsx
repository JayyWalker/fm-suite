import { useState } from "react";
import { parseScreenshot, type ParseScreenshotResult } from "../api/staffApi";
import styles from "./ScreenshotUpload.module.css";

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
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setStatus("loading");
    try {
      const imageBase64 = await fileToBase64(file);
      const result = await parseScreenshot(role, imageBase64, panel);
      onResult(result);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <label className={styles.upload}>
      {label}
      <input
        type="file"
        accept="image/*"
        aria-label={label}
        onChange={handleChange}
        disabled={status === "loading"}
      />
      {status === "loading" && <span>Reading screenshot…</span>}
      {status === "error" && <span role="alert">Couldn't read that screenshot</span>}
    </label>
  );
}
