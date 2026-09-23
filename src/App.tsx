import { useState } from "react";
import "./styles.css";
import { project } from "./data/project";
import { useLedger, useNowTick } from "./state/useLedger";
import { MetricsBar } from "./ui/MetricsBar";
import { CaseList } from "./ui/CaseList";
import { CaseDetail } from "./ui/CaseDetail";
import { exportLedger } from "./storage/ledgerStore";

function App() {
  const {
    ledger,
    error,
    loadError,
    createCase,
    createSession,
    logAttempt,
    approveDowngrade,
    persistSafetyPlan,
    close,
    reset,
    dismissError,
  } = useLedger();
  const nowIso = useNowTick();
  const [selectedId, setSelectedId] = useState<string | null>(
    () => ledger.cases[0]?.id ?? null
  );

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">
            {project.id} · port {project.port}
          </p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
          <p className="storage-note">{project.storageNote}</p>
        </div>
        <div className="stack-card">
          <span>技术栈</span>
          <strong>{project.stack}</strong>
          <span>分层：资料 / 判断 / 本地保存 / 页面</span>
          <div className="btn-row">
            <button onClick={() => exportLedger(ledger)}>导出台账</button>
            <button
              onClick={() => {
                if (window.confirm("将清空本机数据并恢复为示例台账，确定吗？")) {
                  reset();
                  setSelectedId(null);
                }
              }}
            >
              恢复示例数据
            </button>
          </div>
        </div>
      </section>

      {loadError && (
        <div className="banner banner-danger">
          <span>{loadError}</span>
          <button
            onClick={() => {
              if (window.confirm("恢复为示例数据？损坏的本地数据将被覆盖。")) reset();
            }}
          >
            恢复示例数据
          </button>
        </div>
      )}
      {error && (
        <div className="banner banner-warn" onClick={dismissError}>
          <span>{error}</span>
          <button>知道了</button>
        </div>
      )}

      <MetricsBar ledger={ledger} nowIso={nowIso} />

      <section className="workspace workspace-ledger">
        <CaseList
          ledger={ledger}
          nowIso={nowIso}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={createCase}
        />
        {selectedId ? (
          <CaseDetail
            ledger={ledger}
            caseId={selectedId}
            nowIso={nowIso}
            onCreateSession={(caseId, input) => createSession(caseId, input) !== null}
            onAddAttempt={logAttempt}
            onConfirmDowngrade={approveDowngrade}
            onSavePlan={persistSafetyPlan}
            onClose={close}
          />
        ) : (
          <section className="panel detail-empty">
            <h2>从左侧选择或新建一个个案</h2>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
