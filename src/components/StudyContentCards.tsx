import { useEffect, useMemo, useState } from 'react';
import { contentRepository } from '../repositories/contentRepository';
import type {
  ExplanationPlacement,
  FormalExplanation,
  LearningHistory,
  LearningResult,
  Material,
  MediaRecord,
  Question
} from '../types/domain';
import { domTargetId } from '../utils/domTargetId';
import { LearningStateControls } from './LearningStateControls';
import { MaterialBodyView } from './MaterialBodyView';

export function QuestionCard({
  question,
  materials,
  media,
  history,
  targeted,
  onOpenMaterial,
  onRecord,
  onToggleFavorite,
  onToggleReview,
  onReset
}: {
  question: Question;
  materials: Material[];
  media: MediaRecord[];
  history: LearningHistory;
  targeted: boolean;
  onOpenMaterial: (materialId: string) => void;
  onRecord: (result: LearningResult) => void;
  onToggleFavorite: () => void;
  onToggleReview: () => void;
  onReset: () => void;
}) {
  const materialMap = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials]
  );
  const relatedMaterials = question.relatedMaterialIds
    .map((materialId) => materialMap.get(materialId))
    .filter((material): material is Material => material !== undefined);

  return (
    <article
      className={`panel question-card content-target${targeted ? ' targeted' : ''}`}
      id={domTargetId('question', question.id)}
      tabIndex={-1}
    >
      <div className="meta-row">
        <span>{question.sourceLabel}</span>
        <span>{question.importance}</span>
      </div>
      <h3>{question.prompt}</h3>
      <p className="muted">
        {question.id} / {question.subject} / {question.unit} / {question.questionFormat}
      </p>
      {'choices' in question && (
        <ol className="choice-list" type="A">
          {question.choices.map((choice) => (
            <li key={choice}>{choice}</li>
          ))}
        </ol>
      )}
      <LearningStateControls
        history={history}
        onRecord={onRecord}
        onToggleFavorite={onToggleFavorite}
        onToggleReview={onToggleReview}
        onReset={onReset}
      />
      {relatedMaterials.length > 0 && (
        <RelatedLinks title={`関連学習資料 ${relatedMaterials.length}件`}>
          {relatedMaterials.map((material) => (
            <button
              key={material.id}
              type="button"
              aria-label={`関連資料を開く: ${material.title}`}
              onClick={() => onOpenMaterial(material.id)}
            >
              <strong>{material.title}</strong>
              <span>{material.id}</span>
            </button>
          ))}
        </RelatedLinks>
      )}
      <details className="explanation-details">
        <summary>{question.tags.includes('answer-only') ? '解答を表示' : '解答解説を表示'}</summary>
        <FormalExplanationView question={question} media={media} />
      </details>
    </article>
  );
}

export function MaterialCard({
  material,
  questions,
  targeted,
  onOpenQuestion
}: {
  material: Material;
  questions: Question[];
  targeted: boolean;
  onOpenQuestion: (questionId: string) => void;
}) {
  const [bodyOpen, setBodyOpen] = useState(targeted);
  const questionMap = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions]
  );
  const relatedQuestions = material.relatedQuestionIds
    .map((questionId) => questionMap.get(questionId))
    .filter((question): question is Question => question !== undefined);
  const bodyId = `${domTargetId('material', material.id)}-body`;

  return (
    <article
      className={`panel material-card content-target${targeted ? ' targeted' : ''}`}
      id={domTargetId('material', material.id)}
      tabIndex={-1}
    >
      <div className="meta-row">
        <span>{material.subject}</span>
        <span>{material.importance}</span>
      </div>
      <div className="material-title-row">
        <div>
          <p className="material-id">{material.id}</p>
          <h3>{material.title}</h3>
        </div>
        <span className="link-count">関連問題 {relatedQuestions.length}件</span>
      </div>

      <button
        type="button"
        className="material-toggle"
        aria-expanded={bodyOpen}
        aria-controls={bodyId}
        onClick={() => setBodyOpen((open) => !open)}
      >
        {bodyOpen ? '資料本文を閉じる' : '資料本文を開く'}
      </button>
      {bodyOpen && (
        <div className="material-body-panel" id={bodyId}>
          <MaterialBodyView body={material.body} />
        </div>
      )}

      {relatedQuestions.length > 0 && (
        <RelatedLinks title={`関連問題 ${relatedQuestions.length}件`} compact>
          {relatedQuestions.map((question) => (
            <button
              key={question.id}
              type="button"
              aria-label={`関連問題を開く: ${question.id}`}
              onClick={() => onOpenQuestion(question.id)}
            >
              <strong>{question.id}</strong>
              <span>{question.topic}</span>
            </button>
          ))}
        </RelatedLinks>
      )}
    </article>
  );
}

function RelatedLinks({
  title,
  compact = false,
  children
}: {
  title: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`related-links${compact ? ' compact' : ''}`}>
      <h4>{title}</h4>
      <div className="related-link-list">{children}</div>
    </section>
  );
}

export function FormalExplanationView({ question, media }: { question: Question; media: MediaRecord[] }) {
  if (question.tags.includes('answer-only') && 'acceptedAnswers' in question) {
    return (
      <div className="explanation-stack">
        <section className="explanation-block">
          <h4>解答</h4>
          <p>{question.acceptedAnswers.join(' / ')}</p>
        </section>
      </div>
    );
  }

  if (typeof question.explanation === 'string') {
    return (
      <div className="explanation-stack">
        <div className="explanation-block warning-panel" role="alert">
          <h4>旧Schemaの解答解説</h4>
          <p>この問題は正式Explanation Template v1.0へ未変換です。Schema 0.5 Deliveryデータを再投入してください。</p>
        </div>
      </div>
    );
  }

  const explanation: FormalExplanation = question.explanation;
  const sortedChoiceExplanations = [...explanation.choice_explanations].sort(
    (a, b) => a.display_order - b.display_order
  );

  return (
    <div className="explanation-stack">
      <ExplanationTextBlock title="解答" value={explanation.answer} placement="answer" media={media} />
      <ExplanationTextBlock
        title="この問題で問われていること"
        value={explanation.question_intent}
        placement="question_intent"
        media={media}
      />
      <ExplanationTextBlock
        title="正解に至る考え方"
        value={explanation.reasoning}
        placement="reasoning"
        media={media}
      />

      <section className="explanation-block">
        <h4>各選択肢解説</h4>
        <div className="choice-explanation-list">
          {sortedChoiceExplanations.map((choice) => (
            <article className="choice-explanation" key={choice.target_key}>
              <div className="choice-explanation-heading">
                <strong>{choice.target_key}</strong>
                <span className={`judgement ${choice.judgement}`}>
                  {choice.judgement === 'correct' ? '正答' : '誤答'}
                </span>
              </div>
              <dl>
                <div>
                  <dt>正誤理由</dt>
                  <dd>{choice.reason}</dd>
                </div>
                <div>
                  <dt>誤答選択肢が正しくなる条件</dt>
                  <dd>{choice.correction_condition}</dd>
                </div>
                {choice.corrected_statement && (
                  <div>
                    <dt>正しい文への修正</dt>
                    <dd>{choice.corrected_statement}</dd>
                  </div>
                )}
                {choice.differential_notes && (
                  <div>
                    <dt>鑑別・混同しやすい点</dt>
                    <dd>{choice.differential_notes}</dd>
                  </div>
                )}
                {choice.clinical_caution && (
                  <div>
                    <dt>臨床上の注意点</dt>
                    <dd>{choice.clinical_caution}</dd>
                  </div>
                )}
              </dl>
            </article>
          ))}
        </div>
      </section>
      <MediaAfter placement="choice_explanations" media={media} />

      <ExplanationTextBlock
        title="関連する周辺知識"
        value={explanation.surrounding_knowledge}
        placement="surrounding_knowledge"
        media={media}
      />
      <ExplanationTextBlock
        title="臨床現場での注意点"
        value={explanation.clinical_notes}
        placement="clinical_notes"
        media={media}
      />
      <ExplanationTextBlock
        title="関連法規・ガイドライン"
        value={explanation.laws_guidelines}
        placement="laws_guidelines"
        media={media}
      />
      <ExplanationTextBlock
        title="試験で覚える要点"
        value={explanation.key_points}
        placement="key_points"
        media={media}
      />
      <ExplanationTextBlock
        title="覚え方"
        value={explanation.mnemonic}
        placement="mnemonic"
        media={media}
      />
      <ExplanationTextBlock
        title="参考文献・根拠"
        value={explanation.references}
        placement="references"
        media={media}
      />
    </div>
  );
}

function ExplanationTextBlock({
  title,
  value,
  placement,
  media
}: {
  title: string;
  value: string | undefined;
  placement: ExplanationPlacement;
  media: MediaRecord[];
}) {
  if (!value) return null;
  return (
    <>
      <section className="explanation-block">
        <h4>{title}</h4>
        <p>{value}</p>
      </section>
      <MediaAfter placement={placement} media={media} />
    </>
  );
}

function MediaAfter({ placement, media }: { placement: ExplanationPlacement; media: MediaRecord[] }) {
  const records = useMemo(
    () =>
      media
        .filter((record) => record.placement_after === placement)
        .sort((a, b) => a.display_order - b.display_order),
    [media, placement]
  );

  if (records.length === 0) return null;
  return (
    <div className="media-list" aria-label={`${placement}の関連MEDIA`}>
      {records.map((record) => (
        <MediaItem key={record.media_id} media={record} />
      ))}
    </div>
  );
}

function MediaItem({ media }: { media: MediaRecord }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    void contentRepository.getMediaBlob(media.media_id).then((blob) => {
      if (!active || !blob) return;
      createdUrl = URL.createObjectURL(blob);
      setObjectUrl(createdUrl);
    });

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [media.media_id]);

  return (
    <figure className="media-card">
      {objectUrl && media.media_type !== 'table' ? (
        <img src={objectUrl} alt={media.alt_text} />
      ) : (
        <div className="media-placeholder" role="img" aria-label={media.alt_text}>
          <strong>{media.media_type.toUpperCase()}</strong>
          <span>{media.alt_text}</span>
        </div>
      )}
      <figcaption>
        {media.caption ?? media.alt_text}
        <small>{media.file_name_or_blob_ref}</small>
      </figcaption>
    </figure>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <p>{text}</p>
    </div>
  );
}
