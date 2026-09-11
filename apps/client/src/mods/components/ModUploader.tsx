import { useRef, useState } from "react";
import type { ModEntityFile } from "@astral-archive/core";

interface Props {
  onAddMod: (manifestRaw: string, entityFiles: ModEntityFile[]) => void;
}

/**
 * ブラウザのフォルダ選択(webkitdirectory)でMODフォルダをアップロードする。
 * ここで読み込むのはテキストとしてのJSONファイルのみであり、
 * 実行可能なコード（JS等）は一切評価しない。
 */
export function ModUploader({ onAddMod }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList).filter((f) => f.name.endsWith(".json"));
    if (files.length === 0) {
      setLocalError("JSONファイルが見つかりませんでした。");
      return;
    }

    const firstPath = files[0]!.webkitRelativePath || files[0]!.name;
    const rootFolder = firstPath.includes("/") ? firstPath.split("/")[0]! : "";

    let manifestRaw: string | null = null;
    const entityFiles: ModEntityFile[] = [];

    for (const file of files) {
      const fullPath = file.webkitRelativePath || file.name;
      const relPath = rootFolder ? fullPath.slice(rootFolder.length + 1) : fullPath;

      if (relPath === "manifest.json") {
        manifestRaw = await file.text();
      } else {
        entityFiles.push({ path: relPath, content: await file.text() });
      }
    }

    if (!manifestRaw) {
      setLocalError("manifest.json がフォルダのルートに見つかりませんでした。");
      return;
    }

    setLocalError(null);
    onAddMod(manifestRaw, entityFiles);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="aa-panel">
      <h2 style={{ fontSize: "1rem", marginTop: 0 }}>MODフォルダを読み込む</h2>
      <p style={{ fontSize: "0.78rem", color: "var(--aa-text-dim)" }}>
        <code className="aa-mono">manifest.json</code> と <code className="aa-mono">entities/</code>{" "}
        を含むMODフォルダを選択してください。JSON以外のファイル（画像・音声等）はここでは無視されます。
        実行可能なコードは読み込みません。
      </p>
      <input
        ref={inputRef}
        type="file"
        // @ts-expect-error webkitdirectory は標準化されていないが主要ブラウザで広く対応している
        webkitdirectory=""
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        style={{ fontSize: "0.8rem" }}
      />
      {localError && <p style={{ color: "var(--aa-signal-rose)", fontSize: "0.78rem" }}>{localError}</p>}
    </div>
  );
}
