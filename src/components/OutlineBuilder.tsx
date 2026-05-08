import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DoorOpen,
  RectangleHorizontal,
  Columns3,
  ShoppingCart,
  LayoutGrid,
  Snowflake,
  Armchair,
  Package,
  Home,
  Box,
  Cpu,
  Trash2,
  Save,
} from "lucide-react";

export const OUTLINE_COLS = 24;
export const OUTLINE_ROWS = 16;

export type OutlineElementType =
  | "wall"
  | "door"
  | "aisle"
  | "checkout"
  | "shelving"
  | "fridge"
  | "fitting"
  | "storage"
  | "room"
  | "custom"
  | "tile";

export interface OutlineElement {
  id: string;
  type: OutlineElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  /** For type="tile" — references a registered tile number */
  tileNumber?: number;
}

interface ElementDef {
  type: OutlineElementType;
  label: string;
  icon: React.ElementType;
  /** Theme-aligned tint strength 0-1 (mixed with --acc) */
  tint: number;
}

export const OUTLINE_DEFS: ElementDef[] = [
  { type: "wall", label: "Wall", icon: RectangleHorizontal, tint: 0.55 },
  { type: "door", label: "Door", icon: DoorOpen, tint: 0.4 },
  { type: "aisle", label: "Aisle", icon: Columns3, tint: 0.18 },
  { type: "checkout", label: "Checkout", icon: ShoppingCart, tint: 0.32 },
  { type: "shelving", label: "Shelving", icon: LayoutGrid, tint: 0.22 },
  { type: "fridge", label: "Fridge", icon: Snowflake, tint: 0.26 },
  { type: "fitting", label: "Fitting", icon: Armchair, tint: 0.24 },
  { type: "storage", label: "Storage", icon: Package, tint: 0.2 },
  { type: "room", label: "Room", icon: Home, tint: 0.14 },
  { type: "custom", label: "Custom", icon: Box, tint: 0.28 },
  { type: "tile", label: "Tile", icon: Cpu, tint: 0.5 },
];

const elStyle = (def: ElementDef, selected = false): CSSProperties => ({
  background: `color-mix(in srgb, var(--acc) ${def.tint * 100}%, var(--surf2))`,
  border: `1.5px solid ${
    selected
      ? "var(--acc)"
      : `color-mix(in srgb, var(--acc) ${Math.min(90, def.tint * 100 + 30)}%, var(--bord2))`
  }`,
  color: "var(--text)",
});

const getDef = (t: OutlineElementType) => OUTLINE_DEFS.find((d) => d.type === t)!;

let idCounter = 0;
const genId = () => `el_${Date.now()}_${++idCounter}`;

interface RegisteredTile {
  tile_number: number;
  label: string | null;
}

interface Props {
  elements: OutlineElement[];
  onChange: (next: OutlineElement[]) => void;
  registeredTiles: RegisteredTile[];
  onSave?: () => void;
  saving?: boolean;
  readOnly?: boolean;
}

type DragMode =
  | { kind: "move"; id: string; offX: number; offY: number }
  | { kind: "resize"; id: string; handle: "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w"; startX: number; startY: number; startW: number; startH: number; anchorFx: number; anchorFy: number };

export function OutlineBuilder({ elements, onChange, registeredTiles, onSave, saving, readOnly }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<OutlineElementType | null>(null);
  const [pickTileNum, setPickTileNum] = useState<number | null>(null);
  const [hover, setHover] = useState<{ col: number; row: number } | null>(null);
  const [drag, setDrag] = useState<DragMode | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const placedTileNums = useMemo(
    () => new Set(elements.filter((e) => e.type === "tile" && e.tileNumber != null).map((e) => e.tileNumber!)),
    [elements],
  );

  useEffect(() => {
    if (tool !== "tile") setPickTileNum(null);
  }, [tool]);

  const mouseToFractional = useCallback((cx: number, cy: number) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return null;
    const x = ((cx - r.left) / r.width) * OUTLINE_COLS;
    const y = ((cy - r.top) / r.height) * OUTLINE_ROWS;
    return { x: Math.max(0, Math.min(OUTLINE_COLS, x)), y: Math.max(0, Math.min(OUTLINE_ROWS, y)) };
  }, []);

  const mouseToGrid = useCallback((cx: number, cy: number) => {
    const f = mouseToFractional(cx, cy);
    if (!f) return null;
    return {
      col: Math.max(0, Math.min(OUTLINE_COLS - 1, Math.floor(f.x))),
      row: Math.max(0, Math.min(OUTLINE_ROWS - 1, Math.floor(f.y))),
    };
  }, [mouseToFractional]);

  const overlap = (a: { x: number; y: number; w: number; h: number }, b: OutlineElement) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const canPlace = (col: number, row: number, w: number, h: number, excludeId?: string) => {
    if (col < 0 || row < 0 || col + w > OUTLINE_COLS || row + h > OUTLINE_ROWS) return false;
    for (const el of elements) {
      if (el.id === excludeId) continue;
      if (overlap({ x: col, y: row, w, h }, el)) return false;
    }
    return true;
  };

  const handleCellClick = (col: number, row: number) => {
    if (readOnly || !tool) return;
    if (!canPlace(col, row, 1, 1)) return;
    if (tool === "tile") {
      if (pickTileNum == null || placedTileNums.has(pickTileNum)) return;
      const reg = registeredTiles.find((t) => t.tile_number === pickTileNum);
      onChange([
        ...elements,
        { id: genId(), type: "tile", x: col, y: row, w: 1, h: 1, name: reg?.label || `Tile ${pickTileNum}`, tileNumber: pickTileNum },
      ]);
      setPickTileNum(null);
      setTool(null);
      return;
    }
    const def = getDef(tool);
    const count = elements.filter((e) => e.type === tool).length + 1;
    onChange([
      ...elements,
      { id: genId(), type: tool, x: col, y: row, w: 1, h: 1, name: `${def.label} ${count}` },
    ]);
    setTool(null);
  };

  const startMove = (e: React.MouseEvent, el: OutlineElement) => {
    if (readOnly || tool) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(el.id);
    const f = mouseToFractional(e.clientX, e.clientY);
    if (!f) return;
    setDrag({ kind: "move", id: el.id, offX: f.x - el.x, offY: f.y - el.y });
  };

  const startResize = (e: React.MouseEvent, el: OutlineElement, handle: DragMode extends { kind: "resize"; handle: infer H } ? H : never) => {
    if (readOnly || tool) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(el.id);
    const f = mouseToFractional(e.clientX, e.clientY);
    if (!f) return;
    setDrag({
      kind: "resize",
      id: el.id,
      handle,
      startX: el.x,
      startY: el.y,
      startW: el.w,
      startH: el.h,
      anchorFx: f.x,
      anchorFy: f.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (drag) {
      const f = mouseToFractional(e.clientX, e.clientY);
      if (!f) return;
      const el = elements.find((x) => x.id === drag.id);
      if (!el) return;

      if (drag.kind === "move") {
        const nx = Math.max(0, Math.min(Math.round(f.x - drag.offX), OUTLINE_COLS - el.w));
        const ny = Math.max(0, Math.min(Math.round(f.y - drag.offY), OUTLINE_ROWS - el.h));
        if (nx === el.x && ny === el.y) return;
        if (!canPlace(nx, ny, el.w, el.h, el.id)) return;
        onChange(elements.map((x) => (x.id === el.id ? { ...x, x: nx, y: ny } : x)));
        return;
      }

      // resize
      const { handle, startX, startY, startW, startH } = drag;
      let nx = startX;
      let ny = startY;
      let nw = startW;
      let nh = startH;
      const right = startX + startW;
      const bottom = startY + startH;

      if (handle.includes("e")) nw = Math.max(1, Math.round(f.x) - startX);
      if (handle.includes("s")) nh = Math.max(1, Math.round(f.y) - startY);
      if (handle.includes("w")) {
        const newX = Math.min(right - 1, Math.round(f.x));
        nx = Math.max(0, newX);
        nw = right - nx;
      }
      if (handle.includes("n")) {
        const newY = Math.min(bottom - 1, Math.round(f.y));
        ny = Math.max(0, newY);
        nh = bottom - ny;
      }

      // Tiles stay 1x1
      if (el.type === "tile") {
        nw = 1;
        nh = 1;
      }

      // Bounds
      if (nx + nw > OUTLINE_COLS) nw = OUTLINE_COLS - nx;
      if (ny + nh > OUTLINE_ROWS) nh = OUTLINE_ROWS - ny;
      if (nw < 1 || nh < 1) return;

      if (nx === el.x && ny === el.y && nw === el.w && nh === el.h) return;
      if (!canPlace(nx, ny, nw, nh, el.id)) return;
      onChange(elements.map((x) => (x.id === el.id ? { ...x, x: nx, y: ny, w: nw, h: nh } : x)));
      return;
    }
    if (tool) {
      const g = mouseToGrid(e.clientX, e.clientY);
      if (g) setHover(g);
    }
  };

  const handleMouseUp = () => setDrag(null);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly) return;
    onChange(elements.filter((x) => x.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const hoverPreview =
    hover && tool
      ? {
          x: hover.col,
          y: hover.row,
          ok: canPlace(hover.col, hover.row, 1, 1),
        }
      : null;

  const selected = elements.find((e) => e.id === selectedId) || null;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="panel p-3 flex items-center gap-2 flex-wrap">
        <span className="text-text3 text-[11px] uppercase tracking-wider mr-1">Elements</span>
        {OUTLINE_DEFS.map((d) => {
          const Icon = d.icon;
          const active = tool === d.type;
          return (
            <button
              key={d.type}
              type="button"
              disabled={readOnly}
              onClick={() => setTool(active ? null : d.type)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors disabled:opacity-50"
              style={{
                background: active
                  ? `color-mix(in srgb, var(--acc) ${d.tint * 100}%, var(--surf2))`
                  : "var(--surf2)",
                border: `1px solid ${active ? "var(--acc)" : "var(--bord2)"}`,
                color: active ? "var(--text)" : "var(--text2)",
              }}
            >
              <Icon size={13} style={{ color: active ? "var(--acc)" : "var(--text3)" }} />
              {d.label}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          {elements.length > 0 && !readOnly && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-text2 hover:text-text"
              style={{ border: "1px solid var(--bord2)" }}
            >
              <Trash2 size={13} /> Clear all
            </button>
          )}
          {onSave && !readOnly && (
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50"
              style={{ background: "var(--acc)", color: "var(--bg)" }}
            >
              <Save size={13} /> {saving ? "Saving…" : "Save layout"}
            </button>
          )}
        </div>
      </div>

      {/* Tile picker */}
      {tool === "tile" && (
        <div className="panel p-3">
          <div className="text-text3 text-[11px] uppercase tracking-wider mb-2">
            Pick a registered tile to place
          </div>
          {registeredTiles.length === 0 ? (
            <div className="text-text3 text-sm">No tiles registered. Add some in Tile Manager first.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {registeredTiles.map((t) => {
                const placed = placedTileNums.has(t.tile_number);
                const active = pickTileNum === t.tile_number;
                return (
                  <button
                    key={t.tile_number}
                    type="button"
                    disabled={placed}
                    onClick={() => setPickTileNum(active ? null : t.tile_number)}
                    className="px-2.5 py-1.5 rounded-md text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: active ? "color-mix(in srgb, var(--acc) 25%, var(--surf2))" : "var(--surf2)",
                      border: `1px solid ${active ? "var(--acc)" : "var(--bord2)"}`,
                      color: active ? "var(--acc)" : "var(--text2)",
                    }}
                    title={placed ? "Already placed" : ""}
                  >
                    <span className="font-mono">#{t.tile_number}</span>
                    <span className="mx-1.5 text-text3">·</span>
                    {t.label || "Unlabeled"}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative rounded-lg overflow-hidden select-none"
        style={{
          aspectRatio: `${OUTLINE_COLS}/${OUTLINE_ROWS}`,
          background: "var(--surf)",
          border: "1px solid var(--bord2)",
          cursor: tool ? (tool === "tile" && pickTileNum == null ? "not-allowed" : "crosshair") : "default",
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHover(null);
          handleMouseUp();
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setSelectedId(null);
        }}
      >
        {/* Grid */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${OUTLINE_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${OUTLINE_ROWS}, 1fr)`,
          }}
        >
          {Array.from({ length: OUTLINE_ROWS }).map((_, r) =>
            Array.from({ length: OUTLINE_COLS }).map((_, c) => (
              <div
                key={`${c},${r}`}
                onMouseEnter={() => tool && setHover({ col: c, row: r })}
                onClick={() => handleCellClick(c, r)}
                style={{
                  borderRight: "1px solid color-mix(in srgb, var(--bord2) 40%, transparent)",
                  borderBottom: "1px solid color-mix(in srgb, var(--bord2) 40%, transparent)",
                }}
              />
            )),
          )}
        </div>

        {/* Hover preview */}
        {hoverPreview && (
          <div
            className="absolute pointer-events-none rounded"
            style={{
              left: `${(hoverPreview.x / OUTLINE_COLS) * 100}%`,
              top: `${(hoverPreview.y / OUTLINE_ROWS) * 100}%`,
              width: `${(1 / OUTLINE_COLS) * 100}%`,
              height: `${(1 / OUTLINE_ROWS) * 100}%`,
              background: hoverPreview.ok
                ? "color-mix(in srgb, var(--acc) 22%, transparent)"
                : "color-mix(in srgb, #c44 30%, transparent)",
              border: `1.5px dashed ${hoverPreview.ok ? "var(--acc)" : "#c44"}`,
            }}
          />
        )}

        {/* Placed elements */}
        {elements.map((el) => {
          const def = getDef(el.type);
          const Icon = def.icon;
          const isSelected = selectedId === el.id;
          const minDim = Math.min(el.w, el.h);
          const showLabel = isSelected && (el.w >= 3 || el.h >= 2);
          const iconSize = Math.max(10, Math.min(18, minDim * 10 + 4));
          return (
            <div
              key={el.id}
              onMouseDown={(e) => startMove(e, el)}
              onContextMenu={(e) => handleDelete(e, el.id)}
              className="absolute flex items-center justify-center group"
              style={{
                left: `${(el.x / OUTLINE_COLS) * 100}%`,
                top: `${(el.y / OUTLINE_ROWS) * 100}%`,
                width: `${(el.w / OUTLINE_COLS) * 100}%`,
                height: `${(el.h / OUTLINE_ROWS) * 100}%`,
                ...elStyle(def, isSelected),
                borderRadius: 4,
                cursor: readOnly ? "default" : tool ? "crosshair" : "grab",
                zIndex: isSelected ? 10 : 1,
              }}
              title={`${el.name}${el.type === "tile" && el.tileNumber != null ? ` · tile_${el.tileNumber}` : ""}`}
            >
              <Icon size={iconSize} style={{ color: "var(--acc)", opacity: 0.9 }} />
              {showLabel && (
                <span className="text-[10px] font-medium truncate px-1 ml-1" style={{ color: "var(--text)" }}>
                  {el.type === "tile" && el.tileNumber != null ? `#${el.tileNumber}` : el.name}
                </span>
              )}
              {el.type === "tile" && (el.w >= 1 && el.h >= 1) && el.tileNumber != null && !showLabel && (
                <span
                  className="absolute font-mono"
                  style={{
                    bottom: 1,
                    right: 2,
                    fontSize: 8,
                    color: "var(--acc)",
                    lineHeight: 1,
                  }}
                >
                  {el.tileNumber}
                </span>
              )}

              {/* Resize handles (only when selected & not a tile) */}
              {isSelected && !readOnly && el.type !== "tile" && (
                <>
                  {(["nw", "ne", "sw", "se", "n", "s", "e", "w"] as const).map((h) => {
                    const pos: CSSProperties = { position: "absolute", width: 8, height: 8, background: "var(--acc)", border: "1px solid var(--bg)", borderRadius: 2 };
                    const cur: Record<string, string> = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };
                    if (h.includes("n")) pos.top = -4;
                    if (h.includes("s")) pos.bottom = -4;
                    if (h.includes("w")) pos.left = -4;
                    if (h.includes("e")) pos.right = -4;
                    if (h === "n" || h === "s") { pos.left = "50%"; pos.transform = "translateX(-50%)"; }
                    if (h === "e" || h === "w") { pos.top = "50%"; pos.transform = "translateY(-50%)"; }
                    return (
                      <div
                        key={h}
                        onMouseDown={(e) => startResize(e, el, h)}
                        style={{ ...pos, cursor: cur[h], zIndex: 11 }}
                      />
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-text3 text-[11px]">
        Click a tool, then a cell to drop a 1×1 box. Click an element to select, then drag handles to resize. Right-click to delete.
      </p>
    </div>
  );
}
