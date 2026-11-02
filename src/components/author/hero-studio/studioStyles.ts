// Stile des Hero Studio, portiert aus quellen/hero/template.html des Prototyps.
// Farben auf die Admin-Tokens gemappt (--da-dark, --da-darker, --da-card,
// --da-border, --da-muted, --da-text, --da-green, --da-orange). Praefix hs-.

export const HERO_STUDIO_CSS = `
.hs{--hs-bg:var(--da-dark);--hs-surface:var(--da-darker);--hs-raised:var(--da-card);--hs-line:var(--da-border);--hs-line-soft:var(--da-border-soft);
  --hs-fg:var(--da-text);--hs-fg-2:var(--da-text-strong);--hs-muted:var(--da-muted);--hs-faint:var(--da-faint);
  --hs-accent:var(--da-green);--hs-accent-ink:#0e1610;--hs-orange:var(--da-orange);--hs-warn:#ffb27a;
  --hs-f-display:var(--da-font-display);--hs-f-body:var(--da-font-body);--hs-f-mono:var(--da-font-mono);
  --hs-r-sm:4px;--hs-r-md:6px;--hs-r-lg:10px;--hs-r-pill:999px;
  color:var(--hs-fg);font-family:var(--hs-f-body);font-size:14px;line-height:1.5;display:grid;gap:28px;min-width:0;container-type:inline-size}
.hs *,.hs *::before,.hs *::after{box-sizing:border-box}
.hs button,.hs input,.hs select,.hs textarea{font:inherit;color:inherit}
.hs :focus-visible{outline:2px solid var(--hs-accent);outline-offset:2px}
.hs h2,.hs h3{margin:0;font-family:var(--hs-f-display);font-weight:500;text-wrap:balance}
.hs-intro{display:flex;justify-content:space-between;gap:12px 20px;flex-wrap:wrap;align-items:baseline;margin:-8px 0 -12px}
.hs-intro .hs-hint a{color:var(--hs-faint);text-decoration:underline}
.hs-loading{padding:48px 0;color:var(--hs-muted);font-size:13px;text-align:center}
.hs-step{display:grid;gap:14px;min-width:0;scroll-margin-top:96px}
.hs-step-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px 16px;flex-wrap:wrap}
.hs-step-head h2{font-size:22px;line-height:1.15;display:flex;align-items:baseline;gap:12px}
.hs-step-no{font-family:var(--hs-f-mono);font-size:12px;color:var(--hs-accent);letter-spacing:.08em}
.hs-note{font-size:13px;color:var(--hs-muted);margin:0;min-height:1.5em;max-width:78ch}
.hs-note[data-tone="ok"]{color:var(--hs-fg-2)}
.hs-note[data-tone="warn"]{color:var(--hs-warn)}
.hs-note[data-tone="busy"]{color:var(--hs-accent)}
.hs-note[data-tone="busy"]::before{content:"";display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--hs-accent);margin-right:8px;animation:hs-pulse 1s ease-in-out infinite alternate}
@keyframes hs-pulse{to{opacity:.25}}
.hs-hint{font-size:12px;color:var(--hs-faint);margin:0;line-height:1.45}
.hs-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:38px;padding:0 14px;border-radius:var(--hs-r-md);border:1px solid var(--hs-line);background:var(--hs-raised);color:var(--hs-fg);cursor:pointer;font-weight:500;font-size:13px;white-space:nowrap}
.hs-btn:hover{border-color:var(--hs-faint)}
.hs-btn:disabled{opacity:.5;cursor:default}
.hs-btn.primary{background:var(--hs-accent);border-color:var(--hs-accent);color:var(--hs-accent-ink);font-weight:600}
.hs-btn.primary:hover{filter:brightness(1.06)}
.hs-btn.line{border-color:var(--hs-accent);color:var(--hs-accent);background:transparent}
.hs-btn.small{height:30px;padding:0 10px;font-size:12px}
.hs-btn.ghost{background:transparent}
.hs-btn small{font-family:var(--hs-f-mono);font-size:10.5px;color:var(--hs-faint);font-weight:400}
.hs-field{display:grid;gap:6px;min-width:0}
.hs-field>label,.hs-sub-lbl{font-size:12px;color:var(--hs-muted)}
.hs input[type=text],.hs textarea,.hs select{width:100%;background:var(--hs-raised);border:1px solid var(--hs-line);border-radius:var(--hs-r-md);padding:9px 11px;color:var(--hs-fg);min-width:0}
.hs textarea{resize:vertical;min-height:70px;line-height:1.45}
.hs input[type=text]:focus,.hs textarea:focus,.hs select:focus{border-color:var(--hs-accent);outline:none;box-shadow:0 0 0 1px var(--hs-accent)}

.hs-segs{display:inline-flex;flex-wrap:wrap;gap:4px;padding:3px;border:1px solid var(--hs-line);border-radius:var(--hs-r-md);background:var(--hs-surface)}
.hs-seg{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:4px;border:0;background:transparent;color:var(--hs-muted);cursor:pointer;font-size:13px;white-space:nowrap}
.hs-seg small{font-family:var(--hs-f-mono);font-size:10px;color:var(--hs-faint)}
.hs-seg[aria-pressed="true"]{background:var(--hs-fg);color:#111}
.hs-seg[aria-pressed="true"] small{color:#555}

.hs-ki{display:grid;gap:12px;justify-items:start;padding:14px 16px;border:1px solid var(--hs-line-soft);border-radius:var(--hs-r-lg);background:var(--hs-surface)}
.hs-ki[data-state="none"]{border-color:color-mix(in srgb,var(--hs-accent) 45%,var(--hs-line-soft));background:color-mix(in srgb,var(--hs-accent) 6%,var(--hs-surface))}
.hs-ki .hs-note{min-height:0}
.hs-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.hs-card{display:grid;grid-template-rows:auto 1fr;border:1px solid var(--hs-line-soft);border-radius:var(--hs-r-lg);background:var(--hs-surface);overflow:hidden;min-width:0}
.hs-card[aria-current="true"]{border-color:var(--hs-accent);box-shadow:0 0 0 1px var(--hs-accent)}
.hs-card-pick{display:block;padding:0;border:0;background:#000;cursor:pointer;width:100%}
.hs-card-cv{display:block;width:100%;aspect-ratio:16/9;max-width:100%}
.hs-card-meta{display:grid;gap:6px;padding:12px 14px 14px;align-content:start}
.hs-card-tags{display:flex;gap:6px}
.hs-tag{font-family:var(--hs-f-mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:2px 7px;border-radius:var(--hs-r-sm);border:1px solid var(--hs-line);color:var(--hs-muted)}
.hs-tag-line{border-color:color-mix(in srgb,var(--hs-accent) 60%,transparent);color:var(--hs-accent)}
.hs-tag-typo{border-color:color-mix(in srgb,var(--hs-orange) 60%,transparent);color:var(--hs-orange)}
.hs-tag-ki,.hs-tag-saved{border-color:var(--hs-fg-2);color:var(--hs-fg-2)}
.hs-card-title{font-size:16px;line-height:1.25}
.hs-card-why{margin:0;font-size:12.5px;line-height:1.45;color:var(--hs-muted)}
.hs-card-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.hs-btn.use{background:var(--hs-accent);border-color:var(--hs-accent);color:var(--hs-accent-ink);font-weight:600}
.hs-btn.use:hover{filter:brightness(1.06)}
.hs-btn.use[aria-pressed="true"]{background:transparent;color:var(--hs-accent);font-weight:500}

.hs-detail{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:20px;align-items:start}
.hs-stage{display:grid;gap:12px;min-width:0;position:sticky;top:70px}
.hs-stage-wrap{display:flex;justify-content:center;min-width:0}
.hs-stage-cv{display:block;max-width:100%;border-radius:2px;box-shadow:0 0 0 1px var(--hs-line-soft),0 24px 60px rgba(0,0,0,.45);background:#1c1c1e}
.hs-transport{display:flex;align-items:center;gap:10px}
.hs-transport input{flex:1;min-width:0;accent-color:var(--hs-accent)}
.hs-time{font-family:var(--hs-f-mono);font-size:12px;color:var(--hs-muted);font-variant-numeric:tabular-nums;white-space:nowrap;min-width:9ch;text-align:right}
.hs-icon-btn{width:38px;height:38px;display:inline-flex;align-items:center;justify-content:center;border-radius:var(--hs-r-md);border:1px solid var(--hs-line);background:var(--hs-raised);cursor:pointer;font-size:11px}
.hs-panel{display:grid;gap:16px;min-width:0;padding:16px;border:1px solid var(--hs-line-soft);border-radius:var(--hs-r-lg);background:var(--hs-surface)}
.hs-sel-head{display:grid;gap:6px}
.hs-sel-title{font-size:19px;line-height:1.2}
.hs-sel-why{margin:0;font-size:12.5px;color:var(--hs-muted);line-height:1.45}
.hs-check{font-size:12.5px;line-height:1.4;margin:0;display:flex;gap:8px;align-items:flex-start;color:var(--hs-muted)}
.hs-check::before{content:"";flex:none;width:8px;height:8px;border-radius:2px;margin-top:5px;background:var(--hs-faint)}
.hs-check[data-state="ok"]::before{background:var(--hs-accent)}
.hs-check[data-state="warn"]{color:var(--hs-warn)}
.hs-check[data-state="warn"]::before{background:var(--hs-warn)}
.hs-row-actions{display:flex;gap:8px;flex-wrap:wrap}
.hs-row-actions .hs-btn{flex:1}
.hs-chips{display:flex;flex-wrap:wrap;gap:6px}
.hs-chip{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 10px;border-radius:var(--hs-r-pill);border:1px solid var(--hs-line);background:var(--hs-raised);cursor:pointer;font-size:12px;white-space:nowrap}
.hs-chip:hover{border-color:var(--hs-faint)}
.hs-chip[aria-pressed="true"]{border-color:var(--hs-fg-2);background:var(--hs-fg);color:#111}
.hs-chip small{font-family:var(--hs-f-mono);font-size:10px;color:var(--hs-faint);letter-spacing:.04em}
.hs-chip[aria-pressed="true"] small{color:#555}
.hs-chip.more{border-style:dashed;color:var(--hs-muted);background:transparent}
.hs-sw3{display:inline-flex;gap:2px;padding:2px;border-radius:3px;flex:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)}
.hs-sw3 i{display:block;width:4px;height:10px;border-radius:1px}
.hs-slider{display:grid;grid-template-columns:1fr 54px;align-items:center;gap:10px}
.hs-slider input{accent-color:var(--hs-accent);width:100%;min-width:0}
.hs-slider output{font-family:var(--hs-f-mono);font-size:11px;color:var(--hs-muted);text-align:right;font-variant-numeric:tabular-nums}
.hs-more{border-top:1px solid var(--hs-line-soft);padding-top:12px}
.hs-more>summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;font-size:13px;color:var(--hs-fg-2)}
.hs-more>summary::-webkit-details-marker{display:none}
.hs-more>summary::after{content:"+";font-family:var(--hs-f-mono);color:var(--hs-faint)}
.hs-more[open]>summary::after{content:"\\2013"}
.hs-more-body{display:grid;gap:14px;padding-top:14px}
.hs-isearch{display:grid;gap:8px}
.hs-icon-results{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}
.hs-icon-results:empty{display:none}
.hs-icon-results .hs-hint{grid-column:1/-1}
.hs-icon-hit{display:grid;justify-items:center;gap:4px;padding:8px 4px 6px;border:1px solid var(--hs-line);border-radius:var(--hs-r-sm);background:var(--hs-raised);color:var(--hs-muted);font-size:10.5px;line-height:1.2;cursor:pointer;min-width:0}
.hs-icon-hit canvas{width:32px;height:32px}
.hs-icon-hit span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.hs-take-box{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px 24px;align-items:center;padding:18px;border:1px solid var(--hs-line-soft);border-radius:var(--hs-r-lg);background:var(--hs-surface)}
.hs-switch{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;align-items:center;cursor:pointer}
.hs-switch input{appearance:none;width:42px;height:24px;border-radius:var(--hs-r-pill);background:var(--hs-line);position:relative;margin:0;cursor:pointer;transition:background .15s}
.hs-switch input::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--hs-fg);transition:transform .15s}
.hs-switch input:checked{background:var(--hs-accent)}
.hs-switch input:checked::after{transform:translateX(18px);background:var(--hs-accent-ink)}
.hs-switch input:disabled{opacity:.5;cursor:default}
.hs-switch b{font-weight:600;font-size:14px}
.hs-switch .hs-note{grid-column:2}
.hs-bar{height:3px;border-radius:2px;background:var(--hs-line-soft);overflow:hidden;grid-column:1/-1}
.hs-bar span{display:block;height:100%;width:0;background:var(--hs-accent);transition:width .2s}
.hs-take-foot{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:8px 16px;flex-wrap:wrap}
.hs-take-foot .hs-note{min-height:0;flex:1 1 280px}
.hs-take-what{grid-column:1/-1;display:grid;gap:8px;padding-top:14px;border-top:1px solid var(--hs-line-soft)}
.hs-result{display:grid;gap:18px}
.hs-result[data-stale="true"]>:not(.hs-stale){opacity:.5}
.hs-stale{margin:0;padding:12px 14px;border:1px solid color-mix(in srgb,var(--hs-warn) 55%,transparent);border-radius:var(--hs-r-md);background:color-mix(in srgb,var(--hs-warn) 8%,transparent);color:var(--hs-warn);font-size:13px;line-height:1.45}
.hs-dl-head{scroll-margin-top:80px;outline:none}
.hs-flow{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.hs-flow li{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border:1px solid var(--hs-line-soft);border-radius:var(--hs-r-lg);background:var(--hs-surface);min-width:0}
.hs-flow-no{flex:none;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;border:1px solid var(--hs-line);font-family:var(--hs-f-mono);font-size:11.5px;color:var(--hs-muted)}
.hs-flow-txt{display:grid;gap:3px;min-width:0}
.hs-flow-txt b{font-size:13.5px;font-weight:600}
.hs-flow-txt small{font-size:12px;color:var(--hs-faint);line-height:1.4}
.hs-flow li[data-state="now"]{border-color:color-mix(in srgb,var(--hs-accent) 55%,var(--hs-line-soft))}
.hs-flow li[data-state="now"] .hs-flow-no{border-color:var(--hs-accent);color:var(--hs-accent)}
.hs-flow li[data-state="done"] .hs-flow-no{background:var(--hs-accent);border-color:var(--hs-accent);color:var(--hs-accent-ink)}

.hs-ctx-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.hs-ctx{margin:0;display:grid;gap:8px;min-width:0}
.hs-ctx-lbl{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--hs-muted)}
.hs-ctx-lbl em{font-style:normal;font-family:var(--hs-f-mono);font-size:10.5px;color:var(--hs-faint);letter-spacing:.04em}
.hs-mock{border:1px solid var(--hs-line-soft);border-radius:var(--hs-r-md);background:#0f0f11;padding:12px;min-width:0}
.hs-mock img,.hs-mock video{display:block;width:100%;height:auto;border-radius:3px}
.hs-mock-spot{display:grid;grid-template-columns:1.4fr 1fr;gap:12px;align-items:center}
.hs-mock-spot .rub{font-family:var(--hs-f-mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--hs-accent)}
.hs-mock-spot h4{margin:4px 0;font-family:var(--hs-f-display);font-weight:500;font-size:15px;line-height:1.2;text-wrap:balance}
.hs-mock-spot .m{font-size:11px;color:var(--hs-faint)}
.hs-mock-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.hs-mock-list .c{display:grid;gap:6px;align-content:start}
.hs-mock-list .c h5{margin:0;font-family:var(--hs-f-display);font-weight:500;font-size:11.5px;line-height:1.25}
.hs-mock-list .ghost .img{aspect-ratio:16/9;border-radius:3px;background:var(--hs-raised)}
.hs-mock-list .ghost .ln{height:7px;border-radius:2px;background:var(--hs-raised)}
.hs-mock-list .ghost .ln.s{width:60%}
.hs-mock-share{border:1px solid var(--hs-line);border-radius:8px;overflow:hidden;background:var(--hs-surface);padding:0}
.hs-mock-share img{border-radius:0}
.hs-mock-share .t{padding:8px 10px;display:grid;gap:2px}
.hs-mock-share .t span{font-size:10.5px;color:var(--hs-faint)}
.hs-mock-share .t b{font-size:12px;font-weight:600;line-height:1.3}
.hs-mock-article{display:grid;gap:8px}
.hs-mock-article h4{margin:0;font-family:var(--hs-f-display);font-weight:500;font-size:15px;line-height:1.2}
.hs-mock-article .ln{height:6px;border-radius:2px;background:var(--hs-raised)}
.hs-out-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}
.hs-out-grid>.hs-field{align-content:start;gap:8px}
.hs-sub-h{font-family:var(--hs-f-mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--hs-faint);margin:0}
.hs-sub-h span{color:var(--hs-faint);text-transform:none;letter-spacing:0;font-family:var(--hs-f-body);font-size:12px;margin-left:6px}
.hs-dl-tree{list-style:none;margin:2px 0 0;padding:0;display:grid;gap:3px;font-size:12.5px;color:var(--hs-muted);line-height:1.45}
.hs-dl-tree li{display:grid;grid-template-columns:92px minmax(0,1fr);gap:8px}
.hs-dl-tree code{font-family:var(--hs-f-mono);font-size:11.5px;color:var(--hs-accent)}
.hs-dl{display:grid;gap:14px}
.hs-dl-pack{display:flex;align-items:center;justify-content:space-between;gap:12px 20px;flex-wrap:wrap;padding:16px 18px;border:1px solid color-mix(in srgb,var(--hs-accent) 45%,var(--hs-line-soft));border-radius:var(--hs-r-lg);background:color-mix(in srgb,var(--hs-accent) 6%,var(--hs-surface))}
.hs-dl-pack-txt{display:grid;gap:4px;min-width:0;flex:1 1 320px}
.hs-dl-pack-txt b{font-family:var(--hs-f-display);font-weight:500;font-size:17px}
.hs-dl-pack .hs-note{flex-basis:100%;max-width:none;min-height:0}
.hs-dl-pack .hs-note:empty{display:none}
.hs-dl-opt{display:grid;grid-template-columns:auto 1fr;align-items:center;column-gap:8px;font-size:12.5px;color:var(--hs-fg-2);cursor:pointer;margin-top:6px}
.hs-dl-opt input{accent-color:var(--hs-accent);width:16px;height:16px;margin:0}
.hs-dl-opt em{grid-column:2;font-style:normal;color:var(--hs-faint)}
.hs-btn.prog{position:relative;overflow:hidden;isolation:isolate}
.hs-btn.prog::before{content:"";position:absolute;inset:0;width:calc(var(--p,0) * 100%);background:color-mix(in srgb,var(--hs-accent) 22%,transparent);z-index:-1;transition:width .2s}
.hs-btn.primary.prog::before{background:rgba(0,0,0,.18)}
.hs-btn.prog[data-busy="true"]{cursor:progress}
.hs-dl-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.hs-dl-group{display:grid;gap:10px;align-content:start;min-width:0}
.hs-dl-items{display:grid;gap:10px}
.hs-dl-item{display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;align-items:center;padding:10px;border:1px solid var(--hs-line-soft);border-radius:var(--hs-r-md);background:var(--hs-surface)}
.hs-dl-thumb{display:flex;align-items:center;justify-content:center;width:96px;height:72px;background:#0f0f11;border-radius:3px;overflow:hidden}
.hs-dl-thumb img{max-width:100%;max-height:100%;display:block}
.hs-dl-info{display:grid;gap:6px;min-width:0}
.hs-dl-info b{font-size:13.5px;font-weight:600}
.hs-dl-info small{font-size:11.5px;color:var(--hs-faint);line-height:1.35}
.hs-dl-btns{display:flex;flex-wrap:wrap;gap:6px}
.hs-dl-btns .hs-btn{height:30px;padding:0 10px;font-size:12px}
.hs-post-ctl{display:flex;gap:6px;align-items:center}
.hs-post-ctl select{width:auto;padding:5px 8px;font-size:12px}
.hs-posts{display:grid;gap:8px}

/* Container-Queries statt Media-Queries: im Admin liegt das Studio neben der Sidebar (bei 1024 px Viewport bleiben 704 px). */
@container (max-width:980px){
  .hs-detail{grid-template-columns:minmax(0,1fr)}
  .hs-stage{position:static}
}
@container (max-width:720px){
  .hs-ctx-grid,.hs-out-grid,.hs-dl-groups{grid-template-columns:minmax(0,1fr)}
  .hs-flow{grid-template-columns:minmax(0,1fr);gap:6px}
  .hs-flow li{padding:9px 12px;align-items:center}
  .hs-flow li:not([data-state="now"]) small{display:none}
  .hs-take-box{grid-template-columns:minmax(0,1fr)}
  .hs-mock-spot{grid-template-columns:minmax(0,1fr)}
}
@container (max-width:640px){
  .hs-cards{grid-template-columns:minmax(0,1fr)}
}
@media (prefers-reduced-motion:reduce){ .hs-note[data-tone="busy"]::before{animation:none} }
`;
