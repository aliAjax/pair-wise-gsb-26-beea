import { useMemo, useState } from "react";
import type { SafetyPlan } from "../data/types";
import { fmtDateTime } from "./format";
import type { PlanFields } from "../domain/ledger";

interface SafetyPlanPanelProps {
  plans: SafetyPlan[]; // 当前个案的全部版本（含旧版本）
  onSave: (fields: PlanFields, changeNote: string) => void;
}

const FIELD_LABELS: { key: keyof PlanFields; label: string }[] = [
  { key: "warningSigns", label: "预警信号" },
  { key: "copingStrategies", label: "应对策略" },
  { key: "supportContacts", label: "可信赖的人" },
  { key: "professionalResources", label: "专业资源" },
];

function PlanFieldsView({ plan }: { plan: SafetyPlan }) {
  return (
    <dl className="plan-fields">
      {FIELD_LABELS.map(({ key, label }) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd>{plan[key] || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SafetyPlanPanel({ plans, onSave }: SafetyPlanPanelProps) {
  const ordered = useMemo(() => [...plans].sort((a, b) => b.version - a.version), [plans]);
  const current = ordered[0];
  const oldVersions = ordered.slice(1);

  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [fields, setFields] = useState<PlanFields>({
    warningSigns: "",
    copingStrategies: "",
    supportContacts: "",
    professionalResources: "",
  });
  const [changeNote, setChangeNote] = useState("");

  const startEdit = () => {
    if (!current) return;
    setFields({
      warningSigns: current.warningSigns,
      copingStrategies: current.copingStrategies,
      supportContacts: current.supportContacts,
      professionalResources: current.professionalResources,
    });
    setChangeNote("");
    setEditing(true);
  };

  const save = () => {
    onSave(fields, changeNote);
    setEditing(false);
  };

  return (
    <section className="panel subpanel">
      <div className="subpanel-head">
        <div>
          <p className="kicker">安全计划</p>
          <h3>
            安全计划{current && <span className="version-chip">v{current.version} 当前版本</span>}
          </h3>
        </div>
        {current && !editing && <button onClick={startEdit}>修订（生成新版本）</button>}
      </div>

      {!current && <p className="empty-hint">尚未建立安全计划。</p>}

      {current && !editing && (
        <>
          <PlanFieldsView plan={current} />
          <p className="plan-meta">
            {fmtDateTime(current.createdAt)} 更新 · {current.changeNote}
          </p>
        </>
      )}

      {editing && (
        <div className="plan-editor">
          {FIELD_LABELS.map(({ key, label }) => (
            <label key={key}>
              <span>{label}</span>
              <textarea
                rows={2}
                value={fields[key]}
                onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
          <label>
            <span>变更说明</span>
            <input value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="本次修订原因" />
          </label>
          <div className="form-actions">
            <button onClick={() => setEditing(false)}>取消</button>
            <button className="primary-action" onClick={save}>
              保存为 v{current ? current.version + 1 : 1}
            </button>
          </div>
        </div>
      )}

      {oldVersions.length > 0 && (
        <div className="version-history">
          <button type="button" className="link-button" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? "收起" : "查看"}历史版本（{oldVersions.length}）
          </button>
          {showHistory &&
            oldVersions.map((p) => (
              <details key={p.id} className="old-version">
                <summary>
                  v{p.version} · {fmtDateTime(p.createdAt)} · {p.changeNote}
                </summary>
                <PlanFieldsView plan={p} />
              </details>
            ))}
        </div>
      )}
    </section>
  );
}
