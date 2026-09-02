# Data Schema 0.3

v0.7のTypeScript正式移行に合わせ、コード上の型と実行時Zod schemaを一致させます。

## Question common fields

- id
- subject
- unit
- topic
- sourceType
- sourceLabel
- questionFormat
- importance
- prompt
- explanation
- relatedMaterialIds[]
- tags[]
- revision

## Choice question

- choices[]
- correctChoiceIndexes[]

single-choice / true-false は正答1個、multiple-choiceは複数正答を許容します。

## Recall question

- acceptedAnswers[]

fill-blank / short-answerで使用します。

## Material

- id
- subject
- unit
- title
- importance
- body
- relatedQuestionIds[]
- tags[]
- revision

## Dataset envelope

- datasetVersion
- schemaVersion = `0.3`
- questions[]
- materials[]

## Automatic validation

- 必須項目
- enum値
- revision正整数
- 問題ID重複
- 資料ID重複
- 正答index範囲
- 単一選択の正答数
- 問題→資料参照切れ
- 資料→問題参照切れ
