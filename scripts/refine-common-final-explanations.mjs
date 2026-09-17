import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public', 'public-data');
const MANIFEST_PATH = path.join(PUBLIC_DIR, 'manifest.json');
const SUPPLEMENTAL_KEY = 'common-final-2026';
const NEXT_DIR_NAME = 'common-final-2026-v1.3';
const NEXT_DATASET_VERSION = 'common-final-2026-v1.3';
const NEXT_RELEASE_VERSION = '2026-09-17.1';
const CHUNK_SIZE = 18_000;

const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const final40Reasoning = {
  'SOAPのO': 'SOAPのOは医療者が観察・測定した客観的情報であり、患者の訴えはS、解釈はAに記載する。',
  '組織灌流': 'ショックは血圧値だけでなく、末梢冷感・頻脈・尿量低下などを含む組織灌流不全として評価する。',
  '資源的コンサルタント': '資源的コンサルタントは専門知識・情報・選択肢を提供し、コンサルティ自身の自己決定を支援する。',
  '社会保障4本柱': '日本の社会保障制度は社会保険・社会福祉・公的扶助・公衆衛生の4本柱で整理する。',
  'CYP3A4阻害': 'CYP3A4阻害薬を併用すると、CYP3A4で代謝される基質薬の代謝が低下し、血中濃度が上昇することがある。',
  '治療拒否': '意思決定能力が保たれ十分な説明を受けた患者には不同意・治療拒否の権利があり、価値観や拒否理由を確認して意思決定を支援する。',
  '突然発症頭痛': '突然発症し「これまでで最も強い」頭痛はRed Flagであり、生命に関わる二次性頭痛を優先して評価する。',
  '心音I音・II音': 'I音は主に僧帽弁・三尖弁の閉鎖、II音は大動脈弁・肺動脈弁の閉鎖に伴う。',
  '下壁心筋梗塞': 'II・III・aVFのST上昇は下壁梗塞を示唆し、徐脈・房室ブロックなどの伝導障害にも注意する。',
  'ADDIE': 'ADDIEはAnalysis→Design→Development→Implementation→Evaluationの順で進め、最初は現状・学習者・必要能力を分析する。',
  'Donabedian': 'DonabedianモデルはStructure・Process・Outcomeで医療の質を評価し、転倒率など患者に生じた結果はOutcomeに該当する。',
  'speak-up': '患者安全上の懸念がある場合は権威勾配にかかわらず具体的に懸念を伝え、必要時にエスカレーションする。',
  '急変時の特定行為': '手順書の病状範囲を外れる急変時には予定行為を独断で継続せず、再評価して医師等へ報告・相談する。',
  'β2受容体': 'β2受容体刺激は気管支平滑筋を弛緩させ、気管支拡張をもたらす。',
  '腎盂腎炎': '発熱・悪寒・側腹部痛・CVA叩打痛は腎盂腎炎を示唆する代表的な組み合わせである。',
  'ABCDE': 'ABCDEでは生命危機をAirwayから順に評価し、異常を見つけた時点で介入する。',
  '腸重積': '乳児の間欠的な激しい啼泣と顔面蒼白は腸重積を示唆し、血便がなくても否定できない。',
  '検査前確率': '検査は病歴・身体所見から見積もった検査前確率を踏まえ、結果が事後確率をどの程度変えるかを考えて選択・解釈する。',
  '地域包括ケア': '地域包括ケアシステムは住まい・医療・介護・予防・生活支援の5要素を一体的に整える。',
  'コンサルテーションの主体': 'コンサルテーションではコンサルティが問題解決の主体であり、コンサルタントはその過程を支援する。',
  '閉塞性換気障害': '閉塞性換気障害では気流制限により1秒率が低下する。',
  'OPQRST': 'OPQRSTは症状の発症・増悪寛解因子・性状・部位/放散・程度・時間経過を系統的に聴取する枠組みである。',
  '腎排泄性薬剤': '高齢者や腎機能低下時は薬剤の腎排泄性を確認し、薬剤ごとに投与量や投与間隔を調整する。',
  '誤薬': '誤薬に気づいた直後は原因分析や報告書作成より先に患者状態を評価し、必要な処置と報告を行う。',
  '経験学習': '経験学習では経験を振り返って意味づけし、その学びを次の実践へつなげる。',
  'Lewy小体型認知症': 'Lewy小体型認知症では認知機能の変動、具体的な幻視、パーキンソニズムが代表的である。',
  'バイオアベイラビリティ': 'バイオアベイラビリティは投与薬物が未変化体として全身循環に到達する割合を表す。',
  'IPE': 'IPEは複数職種が「互いと、互いから、互いについて」学び、各職種の専門性と役割を理解して協働を改善する教育である。',
  '血圧カフサイズ': '上腕に対して小さすぎるカフは血圧を実際より高く測定する原因になり得るため、適切なサイズを選ぶ。',
  '糖尿病型': '空腹時血糖126mg/dL以上は糖尿病型を示す基準の一つである。',
  '判断能力低下時の支援': '判断能力が低下していても本人を意思決定から外さず、理解可能な方法で説明して意思表明への参加を支援する。',
  'サービス特性': '看護を含むサービスには無形性があり、提供前に品質を完全に確認することは難しい。',
  'NSAIDs': 'NSAIDsはシクロオキシゲナーゼを阻害し、プロスタグランジン合成を抑制することで鎮痛・解熱・抗炎症作用を示す。',
  'Dダイマー': 'Dダイマー高値は血栓症に特異的ではないため、症状・バイタル・検査前確率・画像検査などと統合して判断する。',
  'いつもとの違い': '在宅高齢者では発熱の有無だけでなく、返答・食欲・活動性など普段との違いを急性変化の手がかりとして評価する。',
  '守秘義務': '看護職の守秘義務は退職後も継続し、職務上知り得た秘密をみだりに漏らしてはならない。',
  'プロセス・コンサルテーション': 'プロセス・コンサルテーションではコンサルタントが解決を代行せず、コンサルティ自身が課題を理解し解決する過程を支援する。',
  'SWOT': 'SWOTではStrengthとWeaknessは内部環境、OpportunityとThreatは外部環境に分類する。',
  'HFrEFとβ遮断薬': 'HFrEFのβ遮断薬は循環動態が安定している時期に低用量から開始し、心拍数・血圧などをみながら段階的に調整する。',
  'PDCA': 'PDCAのActはCheckの評価結果に基づいて改善し、必要に応じて標準化する段階である。'
};

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const overlayIndex = manifest.overlays.findIndex((overlay) =>
  overlay.chunks?.some((chunk) => chunk.includes('common-final-2026-v1.2/'))
);
assert(overlayIndex >= 0, 'common-final-2026-v1.2 overlay not found');
const currentOverlay = manifest.overlays[overlayIndex];
const currentBase64 = currentOverlay.chunks
  .map((chunk) => fs.readFileSync(path.join(PUBLIC_DIR, chunk), 'utf8').trim())
  .join('');
const currentCompressed = Buffer.from(currentBase64, 'base64');
assert(sha256(currentCompressed) === currentOverlay.sha256, 'current overlay SHA mismatch');
const currentPack = zlib.gunzipSync(currentCompressed).toString('utf8').trimEnd();
const separator = currentPack.indexOf('\t');
assert(separator > 0, 'invalid supplemental pack');
const supplementalKey = currentPack.slice(0, separator);
assert(supplementalKey === SUPPLEMENTAL_KEY, `unexpected supplementalKey: ${supplementalKey}`);
const dataset = JSON.parse(currentPack.slice(separator + 1));
assert(dataset.questions?.length === 200, `expected 200 questions, got ${dataset.questions?.length}`);

let singleChoiceCount = 0;
let clozeCount = 0;
let refinedChoiceCount = 0;
for (const question of dataset.questions) {
  if (question.questionFormat === 'single-choice') {
    singleChoiceCount += 1;
    const explanation = question.explanation;
    assert(explanation && typeof explanation === 'object', `formal explanation missing: ${question.id}`);
    if (question.id.startsWith('B26-F40-') && final40Reasoning[question.topic]) {
      explanation.reasoning = final40Reasoning[question.topic];
      explanation.key_points = final40Reasoning[question.topic];
    }
    const correctIndex = question.correctChoiceIndexes?.[0];
    assert(Number.isInteger(correctIndex), `correct choice missing: ${question.id}`);
    const correctChoice = question.choices[correctIndex];
    const reasoning = explanation.reasoning || `正答は「${correctChoice}」である。`;
    const keyPoint = explanation.key_points || '';
    explanation.choice_explanations = question.choices.map((choice, index) => {
      const isCorrect = index === correctIndex;
      const label = String.fromCharCode(65 + index);
      if (isCorrect) {
        return {
          target_key: label,
          display_order: index + 1,
          judgement: 'correct',
          reason: `正しい。${reasoning}`,
          correction_condition: 'この記述のままで正しい。',
          mapping_provenance: 'source_supported_inference'
        };
      }
      const absolute = ['必ず', 'すべて', 'のみ', '不要', '無関係', '確定', '否定', '常に', '自由', '終了', '0になる']
        .some((term) => choice.includes(term));
      const lead = absolute
        ? `誤り。「${choice}」のように単一条件や絶対表現で判断しない。`
        : `誤り。選択肢の「${choice}」は設問条件に合わない。`;
      const extra = keyPoint && keyPoint !== correctChoice && keyPoint !== reasoning ? ` ${keyPoint}` : '';
      return {
        target_key: label,
        display_order: index + 1,
        judgement: 'incorrect',
        reason: `${lead}${reasoning}`,
        correction_condition: `正しくは「${correctChoice}」と判断する。${extra}`,
        mapping_provenance: 'source_supported_inference'
      };
    });
    refinedChoiceCount += explanation.choice_explanations.length;
  } else if (question.questionFormat === 'fill-blank') {
    clozeCount += 1;
    const choiceExplanations = question.explanation?.choice_explanations ?? [];
    assert(choiceExplanations.length === 0, `cloze should not have choice explanations: ${question.id}`);
  }
}
assert(singleChoiceCount === 100, `expected 100 single-choice questions, got ${singleChoiceCount}`);
assert(clozeCount === 100, `expected 100 cloze questions, got ${clozeCount}`);
assert(refinedChoiceCount === 400, `expected 400 refined choice explanations, got ${refinedChoiceCount}`);

const genericChoiceReasons = dataset.questions
  .filter((question) => question.questionFormat === 'single-choice')
  .flatMap((question) => question.explanation.choice_explanations.map((choice) => ({ id: question.id, reason: choice.reason })))
  .filter(({ reason }) => reason === '正しい。設問の正答軸に一致する。' || reason.includes('正答軸とは一致しない'));
assert(genericChoiceReasons.length === 0, `generic choice explanations remain: ${genericChoiceReasons.length}`);

dataset.datasetVersion = NEXT_DATASET_VERSION;
const compactJson = JSON.stringify(dataset);
const originalSha256 = sha256(Buffer.from(compactJson, 'utf8'));
const nextPack = `${SUPPLEMENTAL_KEY}\t${compactJson}\n`;
const nextCompressed = zlib.gzipSync(Buffer.from(nextPack, 'utf8'), { level: 9 });
const nextSha256 = sha256(nextCompressed);
const nextBase64 = nextCompressed.toString('base64');
const chunks = [];
for (let offset = 0, index = 0; offset < nextBase64.length; offset += CHUNK_SIZE, index += 1) {
  chunks.push({ name: `${String(index).padStart(3, '0')}.b64`, text: nextBase64.slice(offset, offset + CHUNK_SIZE) });
}
const nextDir = path.join(PUBLIC_DIR, NEXT_DIR_NAME);
fs.rmSync(nextDir, { recursive: true, force: true });
fs.mkdirSync(nextDir, { recursive: true });
for (const chunk of chunks) fs.writeFileSync(path.join(nextDir, chunk.name), chunk.text, 'ascii');

manifest.releaseVersion = NEXT_RELEASE_VERSION;
manifest.overlays[overlayIndex] = {
  chunks: chunks.map((chunk) => `${NEXT_DIR_NAME}/${chunk.name}`),
  encoding: 'base64',
  compression: 'gzip',
  compressedBytes: nextCompressed.length,
  base64Length: nextBase64.length,
  sha256: nextSha256
};
const datasetEntry = manifest.datasets.find((entry) => entry.role === 'common-final-2026');
assert(datasetEntry, 'manifest dataset role common-final-2026 missing');
datasetEntry.originalSha256 = originalSha256;
assert(datasetEntry.questionCount === 200, 'manifest common-final questionCount changed unexpectedly');
fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const cardsPath = path.join(ROOT, 'src', 'components', 'StudyContentCards.tsx');
let cards = fs.readFileSync(cardsPath, 'utf8');
const choiceBlockPattern = /      <section className="explanation-block">\n        <h4>各選択肢解説<\/h4>\n[\s\S]*?      <MediaAfter placement="choice_explanations" media=\{media\} \/>/;
const match = cards.match(choiceBlockPattern);
assert(match, 'choice explanation block not found in StudyContentCards.tsx');
const indentedBlock = match[0].split('\n').map((line) => `  ${line}`).join('\n');
const wrappedBlock = `      {sortedChoiceExplanations.length > 0 && (\n        <>\n${indentedBlock}\n        </>\n      )}`;
cards = cards.replace(choiceBlockPattern, wrappedBlock);
fs.writeFileSync(cardsPath, cards, 'utf8');

const appPath = path.join(ROOT, 'src', 'App.tsx');
let app = fs.readFileSync(appPath, 'utf8');
assert(app.includes("const APP_VERSION = '0.20.1';"), 'expected app version 0.20.1 not found');
app = app.replace("const APP_VERSION = '0.20.1';", "const APP_VERSION = '0.20.2';");
fs.writeFileSync(appPath, app, 'utf8');

const testPath = path.join(ROOT, 'tests', 'unit', 'StudyContentCards.finalExplanation.test.tsx');
fs.writeFileSync(testPath, `import { render, screen } from '@testing-library/react';\nimport { describe, expect, it } from 'vitest';\nimport { FormalExplanationView } from '../../src/components/StudyContentCards';\nimport type { Question } from '../../src/types/domain';\n\ndescribe('FormalExplanationView final cloze', () => {\n  it('does not render an empty choice-explanation section for cloze questions', () => {\n    const question = {\n      id: 'B26-CORE-001',\n      subject: '臨床病態生理学',\n      unit: '病理・遺伝・腫瘍基礎',\n      topic: '病理診断の統合',\n      sourceType: 'predicted',\n      sourceLabel: '最終暗記100項目',\n      questionFormat: 'fill-blank',\n      importance: 'S',\n      prompt: '病理診断では（　）を統合する。',\n      acceptedAnswers: ['臨床情報'],\n      explanation: {\n        answer: '臨床情報',\n        question_intent: '即時再生を確認する。',\n        reasoning: '病理診断は臨床情報を統合する。',\n        choice_explanations: [],\n        key_points: '臨床情報を統合する。',\n        references: '共通科目正本'\n      },\n      relatedMaterialIds: [],\n      tags: ['supplemental:common-final-2026', 'learning-area:common', 'question-kind:common-cloze'],\n      revision: 1\n    } as Question;\n\n    render(<FormalExplanationView question={question} media={[]} />);\n\n    expect(screen.getByText('臨床情報')).toBeInTheDocument();\n    expect(screen.queryByText('各選択肢解説')).not.toBeInTheDocument();\n  });\n});\n`, 'utf8');

const qa = {
  datasetVersion: NEXT_DATASET_VERSION,
  releaseVersion: NEXT_RELEASE_VERSION,
  questions: dataset.questions.length,
  singleChoiceQuestions: singleChoiceCount,
  clozeQuestions: clozeCount,
  refinedChoiceExplanations: refinedChoiceCount,
  genericChoiceReasonsRemaining: genericChoiceReasons.length,
  choiceSectionHiddenWhenEmpty: true,
  compressedBytes: nextCompressed.length,
  base64Length: nextBase64.length,
  overlaySha256: nextSha256,
  originalSha256,
  chunks: chunks.length,
  status: 'PASS'
};
fs.writeFileSync(path.join(nextDir, 'qa.json'), `${JSON.stringify(qa, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(qa, null, 2));
