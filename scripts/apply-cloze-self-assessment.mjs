import { readFile, writeFile } from 'node:fs/promises';

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(search, replacement);
}

async function patchPracticeMode() {
  const path = 'src/components/PracticeMode.tsx';
  let text = await readFile(path, 'utf8');

  text = replaceOnce(
    text,
    `  canSubmitPracticeAnswer,\n  choiceLabel,\n  evaluatePracticeAnswer,`,
    `  canSubmitPracticeAnswer,\n  choiceLabel,\n  evaluatePracticeAnswer,\n  formatCorrectAnswer,`,
    'practiceEngine import'
  );
  text = replaceOnce(
    text,
    `import type { ExamTimerMinutes, PracticeSessionMode } from '../utils/practiceSets';`,
    `import type { ExamTimerMinutes, PracticeSessionMode } from '../utils/practiceSets';\nimport { classifyQuestion } from '../utils/questionCategories';`,
    'questionCategories import'
  );
  text = replaceOnce(
    text,
    `interface PracticeResponse {\n  answer: PracticeAnswer;\n  evaluation: PracticeEvaluation;\n}`,
    `interface PracticeResponse {\n  answer: PracticeAnswer;\n  evaluation: PracticeEvaluation;\n  result: LearningResult;\n}`,
    'PracticeResponse result'
  );
  text = replaceOnce(
    text,
    `  const [responses, setResponses] = useState<Map<string, PracticeResponse>>(() => new Map());\n  const [submitting, setSubmitting] = useState(false);`,
    `  const [responses, setResponses] = useState<Map<string, PracticeResponse>>(() => new Map());\n  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(() => new Set());\n  const [submitting, setSubmitting] = useState(false);`,
    'revealed answer state'
  );
  text = replaceOnce(
    text,
    `  const wrongQuestions = useMemo(\n    () => queue.filter((question) => responses.get(question.id)?.evaluation.correct === false),\n    [queue, responses]\n  );\n  const correctCount = useMemo(\n    () => [...responses.values()].filter((response) => response.evaluation.correct).length,\n    [responses]\n  );`,
    `  const wrongQuestions = useMemo(\n    () =>\n      queue.filter((question) => {\n        const response = responses.get(question.id);\n        return response ? response.result !== 'correct' : false;\n      }),\n    [queue, responses]\n  );\n  const correctCount = useMemo(\n    () => [...responses.values()].filter((response) => response.result === 'correct').length,\n    [responses]\n  );\n  const incorrectCount = useMemo(\n    () => [...responses.values()].filter((response) => response.result === 'incorrect').length,\n    [responses]\n  );\n  const uncertainCount = useMemo(\n    () => [...responses.values()].filter((response) => response.result === 'uncertain').length,\n    [responses]\n  );`,
    'practice result counts'
  );
  text = replaceOnce(
    text,
    `            <div><strong>{answeredCount - correctCount}</strong><span>不正解</span></div>\n            <div><strong>{accuracy}%</strong><span>正答率</span></div>`,
    `            <div><strong>{incorrectCount}</strong><span>不正解</span></div>\n            <div><strong>{uncertainCount}</strong><span>要復習</span></div>\n            <div><strong>{accuracy}%</strong><span>正答率</span></div>`,
    'practice summary uncertain count'
  );
  text = replaceOnce(
    text,
    `              間違えた{wrongQuestions.length}問を再挑戦`,
    `              正解以外の{wrongQuestions.length}問を再挑戦`,
    'retry label'
  );
  text = replaceOnce(
    text,
    `  const history = historyByQuestionId.get(currentQuestion.id);\n  const progress = ((index + 1) / queue.length) * 100;`,
    `  const history = historyByQuestionId.get(currentQuestion.id);\n  const isClozeSelfAssessment =\n    !isExam && classifyQuestion(currentQuestion) === 'common-cloze';\n  const clozeAnswerRevealed = revealedAnswers.has(currentQuestion.id);\n  const progress = ((index + 1) / queue.length) * 100;`,
    'cloze state derivation'
  );
  text = replaceOnce(
    text,
    `    const evaluation = evaluatePracticeAnswer(currentQuestion, answer);\n    setSubmitting(true);\n    try {\n      await onRecordResult(currentQuestion.id, evaluation.correct ? 'correct' : 'incorrect');\n      setResponses((current) => {\n        const updated = new Map(current);\n        updated.set(currentQuestion.id, { answer, evaluation });\n        return updated;\n      });`,
    `    const evaluation = evaluatePracticeAnswer(currentQuestion, answer);\n    const result: LearningResult = evaluation.correct ? 'correct' : 'incorrect';\n    setSubmitting(true);\n    try {\n      await onRecordResult(currentQuestion.id, result);\n      setResponses((current) => {\n        const updated = new Map(current);\n        updated.set(currentQuestion.id, { answer, evaluation, result });\n        return updated;\n      });`,
    'normal submit result'
  );
  text = replaceOnce(
    text,
    `  const submit = async () => {\n    if (isExam || response || !canSubmitPracticeAnswer(currentQuestion, answer)) return;\n    const evaluation = evaluatePracticeAnswer(currentQuestion, answer);\n    const result: LearningResult = evaluation.correct ? 'correct' : 'incorrect';\n    setSubmitting(true);\n    try {\n      await onRecordResult(currentQuestion.id, result);\n      setResponses((current) => {\n        const updated = new Map(current);\n        updated.set(currentQuestion.id, { answer, evaluation, result });\n        return updated;\n      });\n    } finally {\n      setSubmitting(false);\n    }\n  };`,
    `  const submit = async () => {\n    if (isExam || response || !canSubmitPracticeAnswer(currentQuestion, answer)) return;\n    const evaluation = evaluatePracticeAnswer(currentQuestion, answer);\n    const result: LearningResult = evaluation.correct ? 'correct' : 'incorrect';\n    setSubmitting(true);\n    try {\n      await onRecordResult(currentQuestion.id, result);\n      setResponses((current) => {\n        const updated = new Map(current);\n        updated.set(currentQuestion.id, { answer, evaluation, result });\n        return updated;\n      });\n    } finally {\n      setSubmitting(false);\n    }\n  };\n\n  const revealClozeAnswer = () => {\n    if (!isClozeSelfAssessment || response) return;\n    setRevealedAnswers((current) => new Set(current).add(currentQuestion.id));\n  };\n\n  const selfAssessCloze = async (result: LearningResult) => {\n    if (!isClozeSelfAssessment || response || !clozeAnswerRevealed) return;\n    const evaluation: PracticeEvaluation = {\n      correct: result === 'correct',\n      correctAnswerLabel: formatCorrectAnswer(currentQuestion)\n    };\n    const selfAssessmentAnswer: PracticeAnswer = { kind: 'text', value: '' };\n    setSubmitting(true);\n    try {\n      await onRecordResult(currentQuestion.id, result);\n      setResponses((current) => {\n        const updated = new Map(current);\n        updated.set(currentQuestion.id, {\n          answer: selfAssessmentAnswer,\n          evaluation,\n          result\n        });\n        return updated;\n      });\n    } finally {\n      setSubmitting(false);\n    }\n  };`,
    'cloze self assessment handlers'
  );
  text = replaceOnce(
    text,
    `        <PracticeAnswerInput\n          question={currentQuestion}\n          answer={answer}\n          disabled={submitting || (!isExam && response !== undefined)}\n          onChange={setAnswer}\n        />\n\n        {!isExam && !response && (\n          <button\n            type="button"\n            className="practice-submit"\n            disabled={submitting || !canSubmitPracticeAnswer(currentQuestion, answer)}\n            onClick={() => void submit()}\n          >\n            {submitting ? '判定中' : '回答を確定する'}\n          </button>\n        )}`,
    `        {isClozeSelfAssessment ? (\n          !response && (\n            <div className="cloze-self-assessment">\n              {!clozeAnswerRevealed ? (\n                <button\n                  type="button"\n                  className="practice-submit"\n                  disabled={submitting}\n                  onClick={revealClozeAnswer}\n                >\n                  答えを見る\n                </button>\n              ) : (\n                <>\n                  <div className="cloze-answer-reveal" role="status">\n                    <span>正答</span>\n                    <strong>{formatCorrectAnswer(currentQuestion)}</strong>\n                  </div>\n                  <div className="cloze-self-grade" aria-label="自己採点">\n                    <button\n                      type="button"\n                      disabled={submitting}\n                      onClick={() => void selfAssessCloze('correct')}\n                    >\n                      正解\n                    </button>\n                    <button\n                      type="button"\n                      disabled={submitting}\n                      onClick={() => void selfAssessCloze('incorrect')}\n                    >\n                      不正解\n                    </button>\n                    <button\n                      type="button"\n                      disabled={submitting}\n                      onClick={() => void selfAssessCloze('uncertain')}\n                    >\n                      要復習\n                    </button>\n                  </div>\n                </>\n              )}\n            </div>\n          )\n        ) : (\n          <PracticeAnswerInput\n            question={currentQuestion}\n            answer={answer}\n            disabled={submitting || (!isExam && response !== undefined)}\n            onChange={setAnswer}\n          />\n        )}\n\n        {!isExam && !isClozeSelfAssessment && !response && (\n          <button\n            type="button"\n            className="practice-submit"\n            disabled={submitting || !canSubmitPracticeAnswer(currentQuestion, answer)}\n            onClick={() => void submit()}\n          >\n            {submitting ? '判定中' : '回答を確定する'}\n          </button>\n        )}`,
    'practice answer UI'
  );
  text = replaceOnce(
    text,
    `            className={\`practice-feedback \${response.evaluation.correct ? 'correct' : 'incorrect'}\`}\n            role="status"\n          >\n            <strong>{response.evaluation.correct ? '正解' : '不正解'}</strong>`,
    `            className={\`practice-feedback \${response.result}\`}\n            role="status"\n          >\n            <strong>\n              {response.result === 'correct'\n                ? '正解'\n                : response.result === 'incorrect'\n                  ? '不正解'\n                  : '要復習'}\n            </strong>`,
    'feedback result label'
  );
  text = replaceOnce(
    text,
    `    setAnswers(new Map());\n    setResponses(new Map());\n    setExamCompletion(null);`,
    `    setAnswers(new Map());\n    setResponses(new Map());\n    setRevealedAnswers(new Set());\n    setExamCompletion(null);`,
    'restart reveal reset'
  );

  await writeFile(path, text);
}

async function patchPracticeSetBuilder() {
  const path = 'src/components/PracticeSetBuilder.tsx';
  let text = await readFile(path, 'utf8');

  text = replaceOnce(
    text,
    `  const selectedCount = limit === 'all' ? presetCount : Math.min(presetCount, limit);\n\n  const selectArea = (area: LearningArea) => {\n    setLearningArea(area);\n    setQuestionKinds([...QUESTION_KINDS_BY_AREA[area]]);\n  };`,
    `  const selectedCount = limit === 'all' ? presetCount : Math.min(presetCount, limit);\n  const hasSelfAssessmentCloze =\n    questionKinds.includes('common-cloze') && kindCounts['common-cloze'] > 0;\n\n  const selectArea = (area: LearningArea) => {\n    setLearningArea(area);\n    setQuestionKinds([...QUESTION_KINDS_BY_AREA[area]]);\n    if (area === 'common' && kindCounts['common-cloze'] > 0) {\n      setMode('practice');\n      setTimerMinutes(0);\n    }\n  };`,
    'cloze exam guard state'
  );
  text = replaceOnce(
    text,
    `  const toggleKind = (kind: QuestionKind) => {\n    setQuestionKinds((current) =>\n      current.includes(kind) ? current.filter((value) => value !== kind) : [...current, kind]\n    );\n  };`,
    `  const toggleKind = (kind: QuestionKind) => {\n    setQuestionKinds((current) => {\n      const adding = !current.includes(kind);\n      if (kind === 'common-cloze' && adding) {\n        setMode('practice');\n        setTimerMinutes(0);\n      }\n      return current.includes(kind)\n        ? current.filter((value) => value !== kind)\n        : [...current, kind];\n    });\n  };`,
    'toggle cloze resets exam'
  );
  text = replaceOnce(
    text,
    `                value="exam"\n                checked={mode === 'exam'}\n                onChange={() => setMode('exam')}\n              />\n              <span>\n                <strong>試験モード</strong>\n                <small>終了まで正誤・正答・解説を非表示</small>`,
    `                value="exam"\n                checked={mode === 'exam'}\n                disabled={hasSelfAssessmentCloze}\n                onChange={() => setMode('exam')}\n              />\n              <span>\n                <strong>試験モード</strong>\n                <small>\n                  {hasSelfAssessmentCloze\n                    ? '穴抜き問題を含むセットでは利用できません'\n                    : '終了まで正誤・正答・解説を非表示'}\n                </small>`,
    'disable exam radio'
  );
  text = replaceOnce(
    text,
    `      <div className="panel">\n        <fieldset className="practice-set-fieldset">\n          <legend>演習する問題</legend>`,
    `      {hasSelfAssessmentCloze && (\n        <div className="panel warning-panel" role="note">\n          <strong>穴抜き問題は自己採点方式です</strong>\n          <p>「答えを見る」で正答を確認した後、「正解」「不正解」「要復習」から自己採点します。そのため試験モードは利用できません。</p>\n        </div>\n      )}\n\n      <div className="panel">\n        <fieldset className="practice-set-fieldset">\n          <legend>演習する問題</legend>`,
    'cloze mode note'
  );

  await writeFile(path, text);
}

async function patchStyles() {
  const path = 'src/styles.css';
  let text = await readFile(path, 'utf8');
  if (!text.includes('.cloze-self-assessment')) {
    text += `\n\n/* Common cloze self-assessment */\n.cloze-self-assessment { display: grid; gap: 14px; }\n.cloze-answer-reveal { margin-top: 16px; padding: 18px; border: 1px solid #b9c9d8; border-radius: 14px; background: #f6f9fc; display: grid; gap: 6px; }\n.cloze-answer-reveal span { color: #667b8f; font-size: .8rem; font-weight: 800; }\n.cloze-answer-reveal strong { font-size: 1.2rem; line-height: 1.6; white-space: pre-wrap; }\n.cloze-self-grade { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }\n.cloze-self-grade button { min-height: 52px; }\n.practice-feedback.uncertain { border-color: #e4ca83; background: #fff9e8; color: #775b13; }\n.practice-result-grid { grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); }\n@media (max-width: 560px) { .cloze-self-grade { grid-template-columns: 1fr; } }\n`;
  }
  await writeFile(path, text);
}

async function writeTests() {
  const path = 'tests/unit/PracticeMode.clozeSelfAssessment.test.tsx';
  const content = `import { fireEvent, render, screen, waitFor } from '@testing-library/react';\nimport { describe, expect, it, vi } from 'vitest';\nimport { PracticeMode } from '../../src/components/PracticeMode';\nimport { PracticeSetBuilder } from '../../src/components/PracticeSetBuilder';\nimport type { Question } from '../../src/types/domain';\n\nconst clozeQuestion: Question = {\n  id: 'CLOZE-TEST-001',\n  subject: '共通科目',\n  unit: '穴抜き',\n  topic: '自己採点',\n  sourceType: 'other',\n  sourceLabel: 'non-formal test fixture',\n  questionFormat: 'fill-blank',\n  importance: 'A',\n  prompt: 'インスリンは（　　　）から分泌される。',\n  acceptedAnswers: ['膵β細胞', '膵臓のβ細胞'],\n  explanation: {\n    answer: '膵β細胞',\n    question_intent: 'test fixture',\n    reasoning: 'test fixture',\n    choice_explanations: [],\n    key_points: 'test fixture',\n    references: 'test fixture'\n  },\n  relatedMaterialIds: [],\n  tags: ['supplemental:common-cloze'],\n  revision: 1\n};\n\nconst history = new Map();\n\nfunction renderPractice(onRecordResult = vi.fn().mockResolvedValue(undefined)) {\n  render(\n    <PracticeMode\n      questions={[clozeQuestion]}\n      historyByQuestionId={history}\n      onRecordResult={onRecordResult}\n      onToggleFavorite={vi.fn().mockResolvedValue(undefined)}\n      onToggleReview={vi.fn().mockResolvedValue(undefined)}\n      onExit={vi.fn()}\n      renderExplanation={() => null}\n    />\n  );\n  return onRecordResult;\n}\n\ndescribe('common cloze self assessment', () => {\n  it('reveals the answer without a text input and records uncertain as review', async () => {\n    const onRecordResult = renderPractice();\n\n    expect(screen.queryByText('回答を入力')).not.toBeInTheDocument();\n    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();\n    fireEvent.click(screen.getByRole('button', { name: '答えを見る' }));\n\n    expect(screen.getByRole('status')).toHaveTextContent('正答');\n    expect(screen.getByRole('status')).toHaveTextContent('膵β細胞');\n    expect(screen.getByRole('button', { name: '正解', exact: true })).toBeInTheDocument();\n    expect(screen.getByRole('button', { name: '不正解', exact: true })).toBeInTheDocument();\n    expect(screen.getByRole('button', { name: '要復習', exact: true })).toBeInTheDocument();\n\n    fireEvent.click(screen.getByRole('button', { name: '要復習', exact: true }));\n    await waitFor(() =>\n      expect(onRecordResult).toHaveBeenCalledWith('CLOZE-TEST-001', 'uncertain')\n    );\n    expect(screen.getByRole('status')).toHaveTextContent('要復習');\n    expect(screen.getByRole('status')).toHaveTextContent('正答：膵β細胞 / 膵臓のβ細胞');\n  });\n\n  it('disables exam mode while a cloze category is selected', () => {\n    render(\n      <PracticeSetBuilder\n        questions={[clozeQuestion]}\n        historyByQuestionId={history}\n        sourceLabel="test"\n        onStart={vi.fn()}\n        onCancel={vi.fn()}\n      />\n    );\n\n    expect(screen.getByRole('radio', { name: /試験モード/ })).toBeDisabled();\n    expect(screen.getByRole('note')).toHaveTextContent('穴抜き問題は自己採点方式です');\n  });\n});\n`;
  await writeFile(path, content);
}

await patchPracticeMode();
await patchPracticeSetBuilder();
await patchStyles();
await writeTests();
console.log('cloze self-assessment patch applied');
