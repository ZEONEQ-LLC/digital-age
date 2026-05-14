"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownEditorProps = {
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
};

export default function MarkdownEditor({ value, onChange, readOnly = false }: MarkdownEditorProps) {
  return (
    <>
      <style>{`
        .a-md-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          align-items: stretch;
        }
        .a-md-pane {
          background: var(--da-dark);
          border: 1px solid var(--da-border);
          border-radius: 6px;
          padding: 14px 16px;
          min-height: 360px;
        }
        .a-md-pane__label {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .a-md-textarea {
          width: 100%;
          min-height: 320px;
          background: transparent;
          border: none;
          color: var(--da-text);
          font-family: var(--da-font-mono);
          font-size: 13px;
          line-height: 1.65;
          outline: none;
          resize: vertical;
        }
        .a-md-preview { color: var(--da-text-strong); font-size: 15px; line-height: 1.7; }
        .a-md-preview h1, .a-md-preview h2, .a-md-preview h3 { font-family: var(--da-font-display); color: var(--da-text); margin: 18px 0 8px; }
        .a-md-preview h2 { font-size: 22px; }
        .a-md-preview h3 { font-size: 18px; }
        .a-md-preview p { margin: 0 0 12px; }
        .a-md-preview blockquote {
          border-left: 3px solid var(--da-green);
          padding-left: 14px;
          color: var(--da-text);
          font-style: italic;
          margin: 12px 0;
        }
        .a-md-preview code {
          background: rgba(220,214,247,0.12);
          color: var(--da-purple);
          padding: 1px 6px;
          border-radius: 3px;
          font-family: var(--da-font-mono);
          font-size: 0.9em;
        }
        .a-md-preview pre {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          padding: 12px;
          border-radius: 4px;
          overflow-x: auto;
        }
        .a-md-preview pre code { background: transparent; color: var(--da-text-strong); padding: 0; }
        .a-md-preview ul, .a-md-preview ol { padding-left: 22px; margin: 0 0 12px; }
        .a-md-preview li { margin-bottom: 4px; }
        .a-md-preview a { color: var(--da-green); text-decoration: underline; text-underline-offset: 3px; }
        @media (max-width: 768px) {
          .a-md-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <div className="a-md-grid">
        <div className="a-md-pane">
          <p className="a-md-pane__label">Markdown</p>
          <textarea
            className="a-md-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={"## Heading\n\nDein Text. **bold**, _italic_, [link](url)\n\n- Liste\n- Punkte"}
            spellCheck={false}
            readOnly={readOnly}
            style={readOnly ? { cursor: "not-allowed", opacity: 0.7 } : undefined}
          />
        </div>
        <div className="a-md-pane">
          <p className="a-md-pane__label">Vorschau</p>
          <div className="a-md-preview">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || "_Vorschau erscheint hier._"}</ReactMarkdown>
          </div>
        </div>
      </div>
    </>
  );
}
