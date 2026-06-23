import Link from "next/link";

export function AppHeader({ step }: { step?: string }) {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <strong>BloomBeat</strong>
        <span>花律 · 互动音乐礼物</span>
      </Link>
      {step ? <span className="hint">{step}</span> : null}
    </header>
  );
}
