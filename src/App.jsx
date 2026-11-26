import React, { useMemo, useState } from 'react';
import MathText from './components/MathText.jsx';

const mistakeModules = import.meta.glob('./data/mistakes/*.json', { eager: true });
const ALL_MISTAKES = Object.values(mistakeModules).map((m) => m.default || m);

const STORAGE_KEY_PREFIX = 'ctb_progress_v1_';

function getRouteFromUrl() {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  let path = window.location.pathname;
  if (base && path.startsWith(base)) {
    path = path.slice(base.length);
  }
  const parts = path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  return {
    studentId: parts[0] || null,
    questionId: parts[1] || null,
  };
}

function loadProgress(studentId) {
  if (!studentId) return {};
  try {
    return JSON.parse(localStorage.getItem(`${STORAGE_KEY_PREFIX}${studentId}`) || '{}');
  } catch {
    return {};
  }
}

function saveProgress(studentId, data) {
  if (!studentId) return;
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${studentId}`, JSON.stringify(data));
}

function normalizeAnswer(val) {
  return String(val || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function checkShortAnswer(input, acceptedList = []) {
  const norm = normalizeAnswer(input);
  if (!norm) return false;
  return acceptedList.some((ans) => normalizeAnswer(ans) === norm);
}

export default function App() {
  const [{ studentId, questionId: initialQuestionId }] = useState(() => getRouteFromUrl());
  const studentMistakes = useMemo(
    () => (studentId ? ALL_MISTAKES.filter((m) => m.student === studentId) : []),
    [studentId]
  );

  const [progress, setProgress] = useState(() => loadProgress(studentId));
  const [selectedId, setSelectedId] = useState(initialQuestionId);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [chapterFilter, setChapterFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const navigateTo = (qId) => {
    setSelectedId(qId);
    const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
    const nextUrl = `${base}/${studentId}${qId ? `/${qId}` : ''}`;
    window.history.pushState(null, '', nextUrl);
  };

  React.useEffect(() => {
    const onPopState = () => {
      const { questionId } = getRouteFromUrl();
      setSelectedId(questionId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (!studentId) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <h1 style={{ margin: '0 0 8px' }}>错题本 CTB</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            请使用你的个人专属链接访问错题本。
          </p>
        </div>
      </div>
    );
  }

  const grades = useMemo(
    () => Array.from(new Set(studentMistakes.map((m) => m.grade).filter(Boolean))),
    [studentMistakes]
  );

  const subjects = useMemo(
    () => Array.from(new Set(studentMistakes.map((m) => m.subject).filter(Boolean))),
    [studentMistakes]
  );

  const chapters = useMemo(
    () => Array.from(new Set(studentMistakes.map((m) => m.chapter))),
    [studentMistakes]
  );

  const filtered = useMemo(() => {
    return studentMistakes.filter((m) => {
      const status = progress[m.id]?.mastered ? 'mastered' : 'review';
      if (gradeFilter !== 'all' && m.grade !== gradeFilter) return false;
      if (subjectFilter !== 'all' && m.subject !== subjectFilter) return false;
      if (chapterFilter !== 'all' && m.chapter !== chapterFilter) return false;
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      return true;
    });
  }, [studentMistakes, gradeFilter, subjectFilter, chapterFilter, statusFilter, progress]);

  const current = studentMistakes.find((m) => m.id === selectedId);

  const updateStatus = (id, mastered) => {
    const next = {
      ...progress,
      [id]: { mastered, lastReviewed: new Date().toISOString().slice(0, 10) },
    };
    setProgress(next);
    saveProgress(studentId, next);
  };

  if (current) {
    const currentIdx = filtered.findIndex((m) => m.id === current.id);
    const prevItem = currentIdx > 0 ? filtered[currentIdx - 1] : null;
    const nextItem = currentIdx >= 0 && currentIdx < filtered.length - 1 ? filtered[currentIdx + 1] : null;
    return (
      <MistakeDetail
        key={current.id}
        item={current}
        isMastered={Boolean(progress[current.id]?.mastered)}
        onToggleMastered={(val) => updateStatus(current.id, val)}
        onBack={() => navigateTo(null)}
        onPrev={prevItem ? () => navigateTo(prevItem.id) : null}
        onNext={nextItem ? () => navigateTo(nextItem.id) : null}
      />
    );
  }

  const masteredCount = studentMistakes.filter((m) => progress[m.id]?.mastered).length;

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>错题本 · 一次订正，一点进步</h1>
          <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            共 {studentMistakes.length} 道错题 · 已巩固 {masteredCount} 道
          </div>
        </div>
      </div>

      <div className="filters">
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
          <option value="all">全部年级</option>
          {grades.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
          <option value="all">全部学科</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select value={chapterFilter} onChange={(e) => setChapterFilter(e.target.value)}>
          <option value="all">全部章节</option>
          {chapters.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">全部状态</option>
          <option value="review">待巩固</option>
          <option value="mastered">已巩固</option>
        </select>
      </div>

      {filtered.map((m) => {
        const mastered = Boolean(progress[m.id]?.mastered);
        return (
          <div
            key={m.id}
            className="card card-clickable"
            onClick={() => navigateTo(m.id)}
          >
            <div className="badges">
              <span className={`badge ${mastered ? 'badge-mastered' : 'badge-review'}`}>
                {mastered ? '已巩固' : '待巩固'}
              </span>
              <span className="badge">{m.date}</span>
              <span className="badge">{m.chapter}</span>
              <span className="badge badge-mistake">{m.mistake.type}</span>
            </div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.title}</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>{m.source}</div>
          </div>
        );
      })}
    </div>
  );
}

function MistakeDetail({ item, isMastered, onToggleMastered, onBack, onPrev, onNext }) {
  const [isRedoing, setIsRedoing] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [singleInput, setSingleInput] = useState('');
  const [singleResult, setSingleResult] = useState(null);
  const [subInputs, setSubInputs] = useState({});
  const [subResults, setSubResults] = useState({});

  const startRedo = () => {
    setIsRedoing(true);
    setShowSolution(false);
    setSingleInput('');
    setSingleResult(null);
    setSubInputs({});
    setSubResults({});
  };

  const handleCheckSingle = () => {
    setSingleResult(checkShortAnswer(singleInput, item.accepted_answers));
  };

  const handleCheckSub = (idx, accepted) => {
    setSubResults((prev) => ({
      ...prev,
      [idx]: checkShortAnswer(subInputs[idx], accepted),
    }));
  };

  return (
    <div className="container">
      <div className="header">
        <button className="btn" onClick={onBack}>← 返回列表</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${isMastered ? 'btn-success' : ''}`}
            onClick={() => onToggleMastered(!isMastered)}
          >
            {isMastered ? '✓ 已巩固' : '标记为已巩固'}
          </button>
          <button className="btn btn-primary" onClick={startRedo}>
            {isRedoing ? '重新清空重做' : '重做本题 (Redo)'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="badges">
          <span className="badge">{item.date}</span>
          <span className="badge">{item.subject}</span>
          <span className="badge">{item.chapter}</span>
          <span className="badge">{item.source}</span>
        </div>
        <h2 style={{ margin: '6px 0 12px', fontSize: '1.2rem' }}>{item.title}</h2>

        <div style={{ marginBottom: 12 }}>
          <MathText text={item.question} />
        </div>

        {item.svg && (
          <div className="svg-box" dangerouslySetInnerHTML={{ __html: item.svg }} />
        )}

        {!item.subquestions && !isRedoing && item.wrong_answer && (
          <div className="feedback-err" style={{ marginTop: 10 }}>
            <strong>原卷错解：</strong>
            <MathText text={item.wrong_answer} />
          </div>
        )}

        {/* Single-question redo */}
        {!item.subquestions && isRedoing && (
          <div className="subq-item">
            {item.answer_mode === 'short_answer' ? (
              <>
                <div style={{ fontWeight: 500 }}>请输入你的答案：</div>
                <div className="input-row">
                  <input
                    value={singleInput}
                    onChange={(e) => setSingleInput(e.target.value)}
                    placeholder="输入答案..."
                  />
                  <button className="btn btn-primary" onClick={handleCheckSingle}>
                    检查答案
                  </button>
                </div>
                {singleResult === true && <div className="feedback-ok">回答正确！</div>}
                {singleResult === false && <div className="feedback-err">再想想，或查看下方解析。</div>}
              </>
            ) : (
              <div style={{ color: 'var(--muted)' }}>
                请在草稿纸上完成化简/计算，然后点击下方“查看思路与解析”核对答案。
              </div>
            )}
          </div>
        )}

        {/* Subquestions */}
        {item.subquestions && (
          <div style={{ marginTop: 14 }}>
            {item.subquestions.map((sq, idx) => (
              <div key={idx} className="subq-item">
                <div>
                  <strong>{sq.label} </strong>
                  <MathText text={sq.prompt} />
                </div>

                {/* When NOT redoing: show right-subquestion answer so student can skip */}
                {!isRedoing && sq.is_correct && (
                  <div className="feedback-ok">
                    原卷已做对（可跳过）：<MathText text={sq.answer} />
                  </div>
                )}

                {!isRedoing && !sq.is_correct && (
                  <div className="feedback-err">
                    {sq.wrong_answer ? (
                      <>
                        <strong>原卷错解：</strong>
                        <MathText text={sq.wrong_answer} />
                      </>
                    ) : (
                      '原卷错题（建议点击右上角“重做本题”练习）'
                    )}
                  </div>
                )}

                {/* When redoing: hide all pre-filled answers and show input for every subquestion */}
                {isRedoing && (
                  <div className="input-row">
                    <input
                      value={subInputs[idx] || ''}
                      onChange={(e) =>
                        setSubInputs((prev) => ({ ...prev, [idx]: e.target.value }))
                      }
                      placeholder={`输入 ${sq.label} 答案...`}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={() => handleCheckSub(idx, sq.accepted_answers)}
                    >
                      检查
                    </button>
                  </div>
                )}
                {isRedoing && subResults[idx] === true && (
                  <div className="feedback-ok">回答正确！</div>
                )}
                {isRedoing && subResults[idx] === false && (
                  <div className="feedback-err">再检查一下计算或符号。</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mistake Analysis */}
      <div className="card">
        <h3 className="section-title">错因分析</h3>
        <div className="badges">
          <span className="badge badge-mistake">{item.mistake.type}</span>
        </div>
        <p style={{ margin: 0 }}>
          <MathText text={item.mistake.description} />
        </p>
      </div>

      {/* Solution & Thinking Procedure */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="section-title" style={{ margin: 0 }}>解题思路与详解</h3>
          <button className="btn" onClick={() => setShowSolution((s) => !s)}>
            {showSolution ? '收起解析' : '查看思路与解析'}
          </button>
        </div>

        {showSolution && (
          <div style={{ marginTop: 14 }}>
            {item.solution.tip && (
              <div
                style={{
                  background: 'var(--warn-bg)',
                  color: '#92400e',
                  padding: '8px 12px',
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: '0.92rem',
                }}
              >
                <strong>答题技巧：</strong>
                <MathText text={item.solution.tip} />
              </div>
            )}
            <div style={{ fontWeight: 600, marginBottom: 6 }}>思维过程：</div>
            <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
              {item.solution.thinking_procedure.map((step, i) => {
                const rawText = typeof step === 'string' ? step : step.text;
                const isSub = /^\s*-\s+/.test(rawText);
                const text = isSub ? rawText.replace(/^\s*-\s+/, '') : rawText;
                const svg = typeof step === 'string' ? null : step.svg;
                return (
                  <li
                    key={i}
                    style={{
                      marginBottom: 8,
                      ...(isSub ? { marginLeft: 20, listStyleType: 'circle' } : {}),
                    }}
                  >
                    <MathText text={text} />
                    {svg && (
                      <div
                        className="svg-box"
                        style={{ display: 'block', width: 'fit-content', marginTop: 6 }}
                        dangerouslySetInnerHTML={{ __html: svg }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>详细解答：</div>
            <p style={{ whiteSpace: 'pre-line', margin: '0 0 10px' }}>
              <MathText text={item.solution.explanation} />
            </p>
            <div className="feedback-ok">
              <strong>参考答案：</strong>
              <MathText text={item.solution.answer} />
            </div>
          </div>
        )}
      </div>

      {/* Similar Questions */}
      {item.similar_questions?.length > 0 && (
        <div className="card">
          <h3 className="section-title">举一反三 · 策略与巩固练习</h3>
          {item.similar_questions.map((sim, i) => (
            <SimilarQuestionBox key={sim.id || i} sim={sim} index={i + 1} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <button className="btn" disabled={!onPrev} onClick={onPrev} style={!onPrev ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>
          ← 上一题
        </button>
        <button className="btn" disabled={!onNext} onClick={onNext} style={!onNext ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>
          下一题 →
        </button>
      </div>
    </div>
  );
}

function SimilarQuestionBox({ sim, index }) {
  const [chosen, setChosen] = useState({});

  const shuffledSteps = useMemo(() => {
    return (sim.strategy_steps || []).map((st) => {
      const items = st.options.map((opt, idx) => ({
        opt,
        isCorrect: idx === st.correct_index,
      }));
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return { ...st, shuffledOptions: items };
    });
  }, [sim]);

  return (
    <div className="subq-item" style={{ background: '#fff' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        变式题 {index}：<MathText text={sim.question} />
      </div>

      {sim.svg && (
        <div className="svg-box" dangerouslySetInnerHTML={{ __html: sim.svg }} />
      )}

      {shuffledSteps.map((st, sIdx) => {
        const picked = chosen[sIdx];
        return (
          <div key={sIdx} className="strategy-step">
            <div style={{ fontWeight: 500 }}>
              <MathText text={st.prompt} />
            </div>
            <div className="strategy-options">
              {st.shuffledOptions.map((item, oIdx) => {
                let cls = 'strategy-opt';
                if (picked !== undefined) {
                  if (item.isCorrect) cls += ' selected-ok';
                  else if (oIdx === picked) cls += ' selected-err';
                }
                return (
                  <button
                    key={oIdx}
                    className={cls}
                    onClick={() => setChosen((p) => ({ ...p, [sIdx]: oIdx }))}
                  >
                    <MathText text={item.opt} />
                  </button>
                );
              })}
            </div>
            {picked !== undefined && (
              <div className={st.shuffledOptions[picked]?.isCorrect ? 'feedback-ok' : 'feedback-err'}>
                <MathText text={st.feedback} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
