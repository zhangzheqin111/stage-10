"use client";

import { useEffect, useState } from "react";

type DraftDebugSnapshot = {
  songTitle?: string;
  musicSelected?: boolean;
  audioUrl?: string;
  backgroundImageUrl?: string;
};

export function DebugBanner() {
  const [mounted, setMounted] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [musicSelected, setMusicSelected] = useState(false);
  const [audioSize, setAudioSize] = useState(0);
  const [imgSize, setImgSize] = useState(0);
  const [sessionFlowFlag, setSessionFlowFlag] = useState("");
  const [localFlowFlag, setLocalFlowFlag] = useState("");

  useEffect(() => {
    setMounted(true);

    function refresh() {
      try {
        const raw = window.localStorage.getItem("bloombeat-draft");
        if (raw) {
          const parsed = JSON.parse(raw) as DraftDebugSnapshot;
          setDraftTitle(parsed.songTitle ?? "");
          setMusicSelected(Boolean(parsed.musicSelected));
          setAudioSize(parsed.audioUrl?.length ?? 0);
          setImgSize(parsed.backgroundImageUrl?.length ?? 0);
        } else {
          setDraftTitle("");
          setMusicSelected(false);
          setAudioSize(0);
          setImgSize(0);
        }

        setSessionFlowFlag(window.sessionStorage.getItem("bloombeat-creation-flow") ?? "");
        setLocalFlowFlag(window.localStorage.getItem("bloombeat-auto-flow") ?? "");
      } catch {
        // Restricted mobile browsers may block storage; keep the page usable.
      }
    }

    refresh();
    const id = window.setInterval(refresh, 1500);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  const kb = (n: number) => `${(n / 1024).toFixed(1)}KB`;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: "4px 10px",
        fontSize: 11,
        lineHeight: 1.4,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        color: musicSelected ? "#0a4a2a" : "#5a2a2a",
        background: musicSelected ? "rgba(225, 247, 234, 0.95)" : "rgba(255, 230, 232, 0.95)",
        borderBottom: `1px solid ${musicSelected ? "#5ba879" : "#c99542"}`,
        backdropFilter: "blur(6px)"
      }}
    >
      <span>Song: </span>
      <strong>{draftTitle || "none"}</strong>
      <span style={{ marginLeft: 10 }}>Selected: </span>
      <strong>{musicSelected ? "yes" : "no"}</strong>
      <span style={{ marginLeft: 10 }}>Audio: </span>
      <strong>{audioSize ? kb(audioSize) : "none"}</strong>
      <span style={{ marginLeft: 10 }}>Image: </span>
      <strong>{imgSize ? kb(imgSize) : "none"}</strong>
      <span style={{ marginLeft: 10 }}>Flow S/L: </span>
      <strong>
        {sessionFlowFlag || "0"}/{localFlowFlag || "0"}
      </strong>
    </div>
  );
}
