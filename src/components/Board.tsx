import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { TIER_POINTS, TIERS, type Tier } from "@contracts/tiers";
import type { BoardMap, ModelCard } from "../lib/types";

const POOL = "pool";

function Chip({
  model,
  selected,
  onSelect,
}: {
  model: ModelCard;
  selected: boolean;
  onSelect: (slug: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: model.slug,
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      className={`chip${selected ? " is-selected" : ""}${isDragging ? " is-dragging" : ""}`}
      style={{ transform: CSS.Translate.toString(transform) }}
      title={`${model.name} · ${model.lab}`}
      onClick={() => onSelect(model.slug)}
      {...listeners}
      {...attributes}
    >
      <span className="chip-name">{model.name}</span>
      <span className="chip-lab">{model.lab}</span>
    </button>
  );
}

function ReadChip({ model }: { model: ModelCard }) {
  return (
    <Link to={`/models/${model.slug}`} className="chip" title={`${model.name} · ${model.lab}`}>
      <span className="chip-name">{model.name}</span>
      <span className="chip-lab">{model.lab}</span>
    </Link>
  );
}

function DropLane({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`tier-lane${isOver ? " is-over-lane" : ""}`}>
      {children}
    </div>
  );
}

export function Board({
  models,
  board,
  onChange,
  readOnly = false,
}: {
  models: ModelCard[];
  board: BoardMap;
  onChange: (next: BoardMap) => void;
  readOnly?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const bySlug = useMemo(() => new Map(models.map((m) => [m.slug, m])), [models]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const rows: Record<Tier | typeof POOL, ModelCard[]> = {
      "S+": [],
      S: [],
      A: [],
      B: [],
      C: [],
      D: [],
      F: [],
      pool: [],
    };
    for (const m of models) {
      const tier = board[m.slug];
      if (tier) rows[tier].push(m);
      else rows.pool.push(m);
    }
    return rows;
  }, [models, board]);

  function place(slug: string, dest: Tier | typeof POOL) {
    const next = { ...board };
    if (dest === POOL) delete next[slug];
    else next[slug] = dest;
    onChange(next);
    setSelected(null);
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const dest = event.over?.id;
    if (!dest) return;
    const slug = String(event.active.id);
    if (dest === POOL || TIERS.includes(dest as Tier)) {
      place(slug, dest as Tier | typeof POOL);
    }
  }

  function onRowClick(tier: Tier | typeof POOL) {
    if (readOnly || !selected) return;
    place(selected, tier);
  }

  const active = activeId ? bySlug.get(activeId) : null;

  function chips(list: ModelCard[]) {
    return list.map((m) =>
      readOnly ? (
        <ReadChip key={m.slug} model={m} />
      ) : (
        <Chip key={m.slug} model={m} selected={selected === m.slug} onSelect={setSelected} />
      ),
    );
  }

  const spine = (
    <div className="sheet" id="tier-sheet">
      {TIERS.map((tier) => (
        <div key={tier} className="tier-row" onClick={() => onRowClick(tier)}>
          <div className={`tier-title${tier === "S+" || tier === "S" ? " is-gold" : ""}`}>
            <strong>{tier}</strong>
            <span>{TIER_POINTS[tier]}</span>
          </div>
          <DropLane id={tier}>{chips(grouped[tier])}</DropLane>
        </div>
      ))}
    </div>
  );

  const pool = (
    <div className="pool">
      <div className="pool-head">
        <h2>Unplaced · {grouped.pool.length}</h2>
        <p className="note">
          {readOnly ? "No leftover models" : selected ? "Click a title row" : "Drag or click, then a title row"}
        </p>
      </div>
      <div className="sheet">
        <div className="tier-row" onClick={() => onRowClick(POOL)}>
          <div className="tier-title">
            <strong> - </strong>
            <span>list</span>
          </div>
          <DropLane id={POOL}>{chips(grouped.pool)}</DropLane>
        </div>
      </div>
    </div>
  );

  if (readOnly) {
    return (
      <>
        {spine}
        {pool}
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {spine}
      {pool}
      <DragOverlay>
        {active ? (
          <div className="chip is-selected">
            <span className="chip-name">{active.name}</span>
            <span className="chip-lab">{active.lab}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
