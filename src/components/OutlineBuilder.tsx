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
  w: number;
  h: number;
  bg: string;
  border: string;
  text: string;
}

export const OUTLINE_DEFS: ElementDef[] = [
  { type: "wall", label: "Wall", icon: RectangleHorizontal, w: 1, h: 1, bg: "rgba(120,110,100,0.55)", border: "rgba(160,150,140,0.85)", text: "#cdbfb0" },
  { type: "door", label: "Door", icon: DoorOpen, w: 2, h: 1, bg: "rgba(80,160,120,0.35)", border: "rgba(80,200,140,0.9)", text: "#7fdab2" },
  { type: "aisle", label: "Aisle", icon: Columns3, w: 1, h: 4, bg: "rgba(80,140,220,0.20)", border: "rgba(120,170,240,0.7)", text: "#9fc2f5" },
  { type: "checkout", label: "Checkout", icon: ShoppingCart, w: 2, h: 2, bg: "rgba(230,160,70,0.30)", border: "rgba(245,180,90,0.85)", text: "#f0c389" },
  { type: "shelving", label: "Shelving", icon: LayoutGrid, w: 1, h: 3, bg: "rgba(150,110,210,0.22)", border: "rgba(170,130,230,0.7)", text: "#c0a3e8" },
  { type: "fridge", label: "Fridge", icon: Snowflake, w: 1, h: 3, bg: "rgba(70,180,200,0.22)", border: "rgba(100,200,220,0.7)", text: "#9adfeb" },
  { type: "fitting", label: "Fitting", icon: Armchair, w: 2, h: 2, bg: "rgba(190,110,210,0.22)", border: "rgba(210,130,230,0.7)", text: "#d3a3e8" },
  { type: "storage", label: "Storage", icon: Package, w: 3, h: 2, bg: "rgba(120,130,150,0.22)", border: "rgba(150,160,180,0.7)", text: "#bfc6d4" },
  { type: "room", label: "Room", icon: Home, w: 4, h: 4, bg: "rgba(220,120,170,0.15)", border: "rgba(230,140,180,0.55)", text: "#e9b3cd" },
  { type: "custom", label: "Custom", icon: Box, w: 2, h: 2, bg: "rgba(240,150,90,0.20)", border: "rgba(250,170,110,0.7)", text: "#f3c096" },
  { type: "tile", label: "Tile", icon: Cpu, w: 1, h: 1, bg: "rgba(200,168,118,0.30)", border: "rgba(220,188,138,0.95)", text: "#e8caa0" },
];

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

export function OutlineBuilder({ elements, onChange, registeredTiles, onSave, saving, readOnly }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<OutlineElementType | null>(null);
  const [pickTileNum, setPickTileNum] = useState<number | null>(null);
  const [hover, setHover] = useState<{ col: number; row: number } | null>(null);
  const [dragging, setDragging] = useState<{ id: string; offX: number; offY: number } | null>(null);

  // Tiles already placed on the canvas
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
      // tiles are allowed to overlap nothing — keep simple: no overlap at all
      if (overlap({ x: col, y: row, w, h }, el)) return false;
    }
    return true;
  };

  const handleCellClick = (col: number, row: number) => {
    if (readOnly || !tool) return;
    const def = getDef(tool);
    const startCol = Math.max(0, Math.min(col, OUTLINE_COLS - def.w));
    const startRow = Math.max(0, Math.min(row, OUTLINE_ROWS - def.h));
    if (!canPlace(startCol, startRow, def.w, def.h)) return;
    if (tool === "tile") {
      if (pickTileNum == null) return;
      if (placedTileNums.has(pickTileNum)) return;
      const reg = registeredTiles.find((t) => t.tile_number === pickTileNum);
      const name = reg?.label || `Tile ${pickTileNum}`;
      onChange([
        ...elements,
        { id: genId(), type: "tile", x: startCol, y: startRow, w: 1, h: 1, name, tileNumber: pickTileNum },
      ]);
      setPickTileNum(null);
      setTool(null);
      return;
    }
    const count = elements.filter((e) => e.type === tool).length + 1;
    onChange([
      ...elements,
      { id: genId(), type: tool, x: startCol, y: startRow, w: def.w, h: def.h, name: `${def.label} ${count}` },
    ]);
    setTool(null);
  };

  const handleDragStart = (e: React.MouseEvent, el: OutlineElement) => {
    if (readOnly || tool) return;
    e.preventDefault();
    e.stopPropagation();
    const f = mouseToFractional(e.clientX, e.clientY);
    if (!f) return;
    setDragging({ id: el.id, offX: f.x - el.x, offY: f.y - el.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const f = mouseToFractional(e.clientX, e.clientY);
      if (!f) return;
      const el = elements.find((x) => x.id === dragging.id);
      if (!el) return;
      const nx = Math.max(0, Math.min(Math.round(f.x - dragging.offX), OUTLINE_COLS - el.w));
      const ny = Math.max(0, Math.min(Math.round(f.y - dragging.offY), OUTLINE_ROWS - el.h));
      if (nx === el.x && ny === el.y) return;
      if (!canPlace(nx, ny, el.w, el.h, el.id)) return;
      onChange(elements.map((x) => (x.id === el.id ? { ...x, x: nx, y: ny } : x)));
      return;
    }
    if (tool) {
      const g = mouseToGrid(e.clientX, e.clientY);
      if (g) setHover(g);
    }
  };

  const handleMouseUp = () => setDragging(null);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly) return;
    onChange(elements.filter((x) => x.id !== id));
  };

  const hoverDef = tool ? getDef(tool) : null;
  const hoverPreview =
    hover && hoverDef
      ? {
          x: Math.max(0, Math.min(hover.col, OUTLINE_COLS - hoverDef.w)),
          y: Math.max(0, Math.min(hover.row, OUTLINE_ROWS - hoverDef.h)),
          w: hoverDef.w,
          h: hoverDef.h,
          ok: canPlace(
            Math.max(0, Math.min(hover.col, OUTLINE_COLS - hoverDef.w)),
            Math.max(0, Math.min(hover.row, OUTLINE_ROWS - hoverDef.h)),
            hoverDef.w,
            hoverDef.h,
          ),
        }
      : null;

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
                background: active ? d.bg : "var(--surf2)",
                border: `1px solid ${active ? d.border : "var(--bord2)"}`,
                color: active ? d.text : "var(--text2)",
              }}
            >
              <Icon size={13} style={{ color: d.text }} />
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
              style={{ background: "var(--acc)", color: "#1a1611" }}
            >
              <Save size={13} /> {saving ? "Saving…" : "Save layout"}
            </button>
          )}
        </div>
      </div>

      {/* Tile picker (when placing a tile) */}
      {tool === "tile" && (
        <div className="panel p-3">
          <div className="text-text3 text-[11px] uppercase tracking-wider mb-2">
            Pick a registered tile to place
          </div>
          {registeredTiles.length === 0 ? (
            <div className="text-text3 text-sm">
              No tiles registered. Add some in Tile Manager first.
            </div>
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
                      background: active ? "rgba(200,168,118,0.25)" : "var(--surf2)",
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
                  borderRight: "1px solid rgba(255,255,255,0.04)",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
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
              width: `${(hoverPreview.w / OUTLINE_COLS) * 100}%`,
              height: `${(hoverPreview.h / OUTLINE_ROWS) * 100}%`,
              background: hoverPreview.ok ? "rgba(120,200,140,0.18)" : "rgba(220,90,90,0.20)",
              border: `1.5px dashed ${hoverPreview.ok ? "rgba(120,200,140,0.7)" : "rgba(220,90,90,0.7)"}`,
            }}
          />
        )}

        {/* Placed elements */}
        {elements.map((el) => {
          const def = getDef(el.type);
          const Icon = def.icon;
          return (
            <div
              key={el.id}
              onMouseDown={(e) => handleDragStart(e, el)}
              onContextMenu={(e) => handleDelete(e, el.id)}
              className="absolute flex items-center justify-center gap-1 group"
              style={
                {
                  left: `${(el.x / OUTLINE_COLS) * 100}%`,
                  top: `${(el.y / OUTLINE_ROWS) * 100}%`,
                  width: `${(el.w / OUTLINE_COLS) * 100}%`,
                  height: `${(el.h / OUTLINE_ROWS) * 100}%`,
                  background: def.bg,
                  border: `1.5px solid ${def.border}`,
                  borderRadius: 4,
                  color: def.text,
                  cursor: readOnly ? "default" : tool ? "crosshair" : "grab",
                } as CSSProperties
              }
              title={`${el.name}${el.type === "tile" && el.tileNumber != null ? ` · tile_${el.tileNumber}` : ""} (right-click to delete)`}
            >
              <Icon size={Math.min(14, Math.min(el.w, el.h) * 8 + 6)} />
              {(el.w >= 2 || el.h >= 2 || el.type === "tile") && (
                <span className="text-[10px] font-medium truncate px-1">
                  {el.type === "tile" && el.tileNumber != null ? `#${el.tileNumber}` : el.name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-text3 text-[11px]">
        Click a tool, then click the canvas to place. Drag to reposition. Right-click to delete.
      </p>
    </div>
  );
}
