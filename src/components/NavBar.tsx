import { Link } from "@tanstack/react-router";
import { LogoMark } from "./LogoMark";
import type { ConnState } from "@/hooks/use-floor-data";
import { RefreshCw, Trash2 } from "lucide-react";

interface Props {
  conn: ConnState;
  lastUpdate: number | null;
  onRefresh: () => void;
  onClear: () => void;
  onLogout?: () => void;
}

const tabs = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/zones", label: "Tile Manager" },
  { to: "/history", label: "History" },
] as const;

function pillLabel(conn: ConnState, lastUpdate: number | null) {
  if (conn === "offline") return "offline";
  const t = lastUpdate ? new Date(lastUpdate).toISOString().slice(11, 19) : "--:--:--";
  return `${conn} · ${t}`;
}

export function NavBar({ conn, lastUpdate, onRefresh, onClear, onLogout }: Props) {
  const dotColor = conn === "offline" ? "#857363" : "#c8a876";
  return (
    <header
      className="sticky top-0 z-40 h-[58px] flex items-center px-6 gap-6 backdrop-blur"
      style={{ background: "rgba(30,26,21,0.85)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <Link to="/" className="flex items-center gap-2.5 select-none">
        <LogoMark size={24} />
        <span className="font-display text-text" style={{ fontSize: 16, fontWeight: 600, letterSpacing: 0.2 }}>
          Piezolytics
        </span>
      </Link>

      <nav className="flex items-center gap-1 ml-4">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="px-3.5 py-1.5 rounded-lg text-sm text-text2 hover:text-text hover:bg-surf2 transition-colors"
            activeOptions={{ exact: true }}
            activeProps={{ className: "px-3.5 py-1.5 rounded-lg text-sm text-text bg-surf2" }}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <div
          className="flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-full text-xs"
          style={{ background: "var(--surf2)", border: "1px solid var(--bord2)", color: "var(--text2)" }}
        >
          <span
            className={conn === "offline" ? "" : "pulse-dot"}
            style={{ width: 8, height: 8, borderRadius: 999, background: dotColor, display: "inline-block" }}
          />
          <span className="font-medium tracking-wide">{pillLabel(conn, lastUpdate)}</span>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text2 hover:text-text hover:bg-surf2 transition-colors"
          style={{ border: "1px solid var(--bord2)" }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text2 hover:text-text hover:bg-surf2 transition-colors"
          style={{ border: "1px solid var(--bord2)" }}
        >
          <Trash2 size={13} /> Clear
        </button>
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text2 hover:text-text hover:bg-surf2 transition-colors"
            style={{ border: "1px solid var(--bord2)" }}
          >
            Log out
          </button>
        )}
      </div>
    </header>
  );
}
