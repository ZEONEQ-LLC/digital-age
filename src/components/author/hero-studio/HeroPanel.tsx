"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { HeroEngine, HeroEffective, HeroOptionValue, HeroSpec } from "@/lib/hero-studio/vendor";

type ChipItem = { v: HeroOptionValue; label: string; swatch?: { bg: string; cols: string[] }; tag?: string };

type Props = {
  engine: HeroEngine;
  spec: HeroSpec;
  eff: HeroEffective;
  title: string;
  why: string;
  check: { state: "ok" | "warn"; text: string };
  motifsOpen: boolean;
  onMotifsOpen: (v: boolean) => void;
  defaultText: string;
  onOverride: (k: string, v: HeroOptionValue, live?: boolean) => void;
  onText: (v: string) => void;
  onRoll: () => void;
  onReset: () => void;
};

function Chips({ items, current, onPick }: { items: ChipItem[]; current: HeroOptionValue | undefined; onPick: (v: HeroOptionValue) => void }) {
  return (
    <div className="hs-chips">
      {items.map((it) => (
        <button key={String(it.v)} type="button" className="hs-chip" aria-pressed={String(it.v) === String(current)} onClick={() => onPick(it.v)}>
          {it.swatch && (
            <span className="hs-sw3" style={{ background: it.swatch.bg }} aria-hidden="true">
              {it.swatch.cols.map((c, i) => <i key={i} style={{ background: c }} />)}
            </span>
          )}
          {it.label}
          {it.tag ? <small>{it.tag}</small> : null}
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string | null; children: React.ReactNode }) {
  return (
    <div className="hs-field">
      <span className="hs-sub-lbl">{label}</span>
      {children}
      {hint ? <p className="hs-hint">{hint}</p> : null}
    </div>
  );
}

// Symbolsuche (Linie): Treffer als kleine Thumbnails aus der Engine.
function IconSearch({ engine, onPick }: { engine: HeroEngine; onPick: (iconName: string) => void }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      const s = q.trim();
      if (!s) { setNames([]); setSearched(false); return; }
      setNames(engine.searchIcons(s, 18));
      setSearched(true);
    }, 160);
    return () => clearTimeout(t);
  }, [q, engine]);
  return (
    <div className="hs-isearch">
      <input type="text" id={id} value={q} placeholder="z. B. Gehirn, Bank, rocket" autoComplete="off" spellCheck={false} aria-label="Symbol suchen" onChange={(e) => setQ(e.target.value)} />
      <div className="hs-icon-results">
        {searched && !names.length && <p className="hs-hint">Kein Symbol gefunden. Englische Begriffe treffen oft besser.</p>}
        {names.map((n) => (
          <button key={n} type="button" className="hs-icon-hit" title={n} onClick={() => onPick(n)}>
            <canvas
              width={72} height={72}
              ref={(c) => { if (c) engine.drawMotifThumb(c, engine.motifData("icon:" + n, "", 0), "#32ff7e", null); }}
            />
            <span>{engine.ICON_DE[n] || engine.EN_DE[n] || engine.iconLabel(n)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const C_D = "#1c1c1e";

export default function HeroPanel({ engine, spec, eff, title, why, check, motifsOpen, onMotifsOpen, defaultText, onOverride, onText, onRoll, onReset }: Props) {
  const textId = useId();
  const sliderBase = useId();
  const e = eff;
  const isLine = spec.engine === "line";
  const textValue = spec.text != null ? spec.text : defaultText;
  const textRef = useRef<HTMLInputElement | null>(null);

  // Motiv-Chips (Linie)
  let motifField: React.ReactNode = null;
  let morphField: React.ReactNode = null;
  if (isLine) {
    const { top, rest, matched } = engine.motifTop(spec);
    const topList = [...top];
    const restList = [...rest];
    const cur = String(e.motif ?? "");
    if (!topList.includes(cur) && engine.motifInfo(spec, cur)) {
      topList.unshift(cur);
      const i = restList.indexOf(cur);
      if (i >= 0) restList.splice(i, 1);
    }
    const list = motifsOpen ? topList.concat(restList) : topList;
    const items: ChipItem[] = [];
    for (const id of list) {
      const info = engine.motifInfo(spec, id);
      if (!info) continue;
      items.push({ v: id, label: info.name, tag: info.ki ? "KI" : matched.has(id) ? "passt" : id === "dabot" ? "Marke" : "" });
    }
    motifField = (
      <Field label="Motiv" hint={matched.size ? "«passt» heisst: Stichwort im Beitrag gefunden." : null}>
        <div className="hs-chips">
          <Chips items={items} current={cur} onPick={(v) => onOverride("motif", v)} />
          <button type="button" className="hs-chip more" onClick={() => onMotifsOpen(!motifsOpen)}>
            {motifsOpen ? "Weniger zeigen" : `Alle Motive · ${restList.length}`}
          </button>
        </div>
      </Field>
    );
    if (e.anim === "morph") {
      const ids = topList.concat(restList).filter((id) => id !== cur);
      const shown = ids.slice(0, motifsOpen ? ids.length : 8);
      morphField = (
        <Field label="Morph zu">
          <Chips items={shown.map((id) => ({ v: id, label: engine.motifInfo(spec, id)?.name ?? id }))} current={String(e.motif2 ?? "")} onPick={(v) => onOverride("motif2", v)} />
        </Field>
      );
    }
  }

  const colorItems: ChipItem[] = Object.keys(engine.SCHEMES).map((id) => {
    const c = engine.SCHEMES[id];
    return { v: id, label: c.name, swatch: { bg: c.bg || C_D, cols: [c.main, c.second, c.signal] } };
  });

  const textInput = (placeholder: string) => (
    <input
      type="text" id={textId} ref={textRef} maxLength={30} value={textValue} placeholder={placeholder}
      onChange={(ev) => onText(ev.target.value)}
    />
  );

  return (
    <div className="hs-panel">
      <div className="hs-sel-head">
        <div className="hs-card-tags"><span className="hs-tag">{isLine ? "Linie" : "Typo"}</span></div>
        <h3 className="hs-sel-title">{title}</h3>
        <p className="hs-sel-why">{why}</p>
        <p className="hs-check" data-state={check.state}>{check.text}</p>
      </div>
      <div className="hs-row-actions">
        <button type="button" className="hs-btn line" onClick={onRoll}>Neu würfeln</button>
        {Object.keys(spec.overrides || {}).length > 0 && spec.source !== "ki" && (
          <button type="button" className="hs-btn" onClick={onReset}>Zurücksetzen</button>
        )}
      </div>
      <div className="hs-more-body" style={{ paddingTop: 0 }}>
        {isLine ? (
          <>
            {motifField}
            <Field label="Symbol suchen">
              <IconSearch engine={engine} onPick={(n) => onOverride("motif", engine.iconMotifId(n))} />
            </Field>
            <Field label="Animation">
              <Chips items={Object.entries(engine.ANIMS).map(([k, a]) => ({ v: k, label: a.name }))} current={String(e.anim ?? "")} onPick={(v) => onOverride("anim", v)} />
            </Field>
            {morphField}
            <Field label="Schlagwort">{textInput("Erscheint unter der Zeichnung oder handgeschrieben")}</Field>
          </>
        ) : (
          <>
            <Field label="Text">{textInput("1 bis 3 Wörter, höchstens 20 Zeichen")}</Field>
            <Field label="Bewegung" hint={(engine.MODES[String(e.motion)]?.desc ?? "") + "."}>
              <Chips items={Object.entries(engine.MODES).map(([k, m]) => ({ v: k, label: m.name }))} current={String(e.motion ?? "")} onPick={(v) => onOverride("motion", v)} />
            </Field>
          </>
        )}
        <Field label="Farbklang">
          <Chips items={colorItems} current={String(e.color ?? "")} onPick={(v) => onOverride("color", v)} />
        </Field>
      </div>
      <details className="hs-more">
        <summary>Mehr Einstellungen</summary>
        <div className="hs-more-body">
          {engine.options(spec).map((o) => {
            if (o.type === "chips") {
              return (
                <Field key={o.k} label={o.label}>
                  <Chips items={(o.opts ?? []).map(([v, label]) => ({ v, label }))} current={e[o.k] as HeroOptionValue | undefined} onPick={(v) => onOverride(o.k, v)} />
                </Field>
              );
            }
            const val = Number(e[o.k] ?? o.min ?? 0);
            const fmt = o.fmt ?? ((v: number) => String(v));
            const sid = `${sliderBase}-${o.k}`;
            return (
              <Field key={o.k} label={o.label}>
                <div className="hs-slider">
                  <input
                    type="range" id={sid} min={o.min} max={o.max} step={o.step} value={val} aria-label={o.label}
                    onChange={(ev) => onOverride(o.k, Number(ev.target.value), true)}
                  />
                  <output htmlFor={sid}>{fmt(val)}</output>
                </div>
              </Field>
            );
          })}
        </div>
      </details>
    </div>
  );
}
