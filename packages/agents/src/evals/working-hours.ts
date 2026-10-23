import { answerRelevancy, contains, gEval as gEvals, runEvalCli, selectPromptOutput } from '@anvia/core/evals'
import { runAgent } from '../agent.js'
import { document } from '../context/document.js'
import { indonesiaRules } from '../context/indonesia-rules.js'
import { getModel } from '../models.js'
import { lens } from '../lens.js'

const model = getModel()
const reporter = lens.evalReporter({ includePayloads: true })

try {
  await runEvalCli({
    name: 'pt-bisi-hr-working-hours',
    cases: [
      {
        id: 'hours-office-days',
        input: 'Menurut panduan mock PT Bisi, kantor bekerja berapa hari seminggu dan pada hari apa saja? Gunakan angka untuk jumlah harinya.',
        expected: 'Dalam simulasi PT Bisi, kantor bekerja 5 hari per minggu, Senin sampai Jumat. Ini kebijakan mock, bukan kebijakan resmi.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\b5\b\s*hari/i.source,
        },
      },
      {
        id: 'hours-office-schedule',
        input: 'Sebutkan jam masuk dan pulang kantor dalam panduan mock PT Bisi menggunakan format angka jam dan menit.',
        expected: 'Jadwal kantor mock PT Bisi adalah 08.00–17.00 WIB, Senin–Jumat. Ini contoh kebijakan, bukan aturan resmi perusahaan.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /^(?=[\s\S]*\b0?8[.:]00\b)(?=[\s\S]*\b17[.:]00\b)/i.source,
        },
      },
      {
        id: 'hours-office-break',
        input: 'Dalam panduan mock PT Bisi, istirahat siang mulai dan selesai jam berapa? Tuliskan jam dan menit dengan angka.',
        expected: 'Dalam simulasi PT Bisi, istirahat siang adalah 12.00–13.00 WIB. Jadwal ini merupakan data mock.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /^(?=[\s\S]*\b12[.:]00\b)(?=[\s\S]*\b13[.:]00\b)/i.source,
        },
      },
      {
        id: 'hours-five-day-week',
        input: 'Berdasarkan ringkasan Indonesia dalam konteks, berapa jam kerja umum per hari dan per minggu untuk pola 5 hari kerja? Gunakan angka.',
        expected: 'Pola umum 5 hari kerja adalah 8 jam per hari dan 40 jam per minggu menurut PP 35 Tahun 2021. Ada pengecualian sektor; ringkasan ini perlu diverifikasi sebelum penerapan individual.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /^(?=[\s\S]*\b8\b\s*jam)(?=[\s\S]*\b40\b\s*jam)/i.source,
        },
      },
      {
        id: 'hours-six-day-week',
        input: 'Menurut ringkasan Indonesia dalam konteks, berapa jam kerja umum per hari dan total per minggu untuk pola 6 hari kerja? Gunakan angka.',
        expected: 'Pola umum 6 hari kerja adalah 7 jam per hari dan 40 jam per minggu menurut PP 35 Tahun 2021. Jangan menghitung 7 x 6 sebagai ketentuan 42 jam; periksa pengaturan dan pengecualian yang berlaku.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /^(?=[\s\S]*\b7\b\s*jam)(?=[\s\S]*\b40\b\s*jam)/i.source,
        },
      },
    ],
    target: async (input) => {
      const stream = runAgent({ messages: [{ role: 'user', content: input }] })
      const result = await stream.result
      if (result.type !== 'response') {
        throw new Error(`Expected an HR answer, received ${result.type}`)
      }
      // Keep the trace ID so Lens can link metric results to the agent run.
      return result
    },
    metrics: [
      // 1. Correctness: compare the answer with the reference and HR context.
      gEvals({
        name: 'correctness',
        model,
        threshold: 0.8,
        evaluationParams: ['input', 'actualOutput', 'expectedOutput', 'context'],
        context: [document.text, indonesiaRules.text],
        evaluationSteps: [
          'Compare the answer with the expected answer and PT Bisi HR context. Accept equivalent Indonesian wording.',
          'Check every requested number, unit, time, eligibility condition, and calculation. Repeating numbers from the question is not enough.',
          'Require mock/simulation labeling for company policies. Distinguish general legal rules from individual entitlements and acknowledge limits on current verification.',
          'Penalize invented rules, balances, approvals, or employee records. Hypothetical calculations must not be presented as verified personal entitlements.',
        ],
        // Scores of 8–10 pass: the SDK converts this 0–10 rubric to 0–1.
        rubric: [
          { scoreRange: [0, 2], expectedOutcome: 'Wrong answer, invented policy or records, or materially incorrect numbers.' },
          { scoreRange: [3, 5], expectedOutcome: 'Partly correct but missing essential facts, units, or eligibility conditions.' },
          { scoreRange: [6, 7], expectedOutcome: 'Mostly correct, with a relevant omission or unclear mock/legal distinction.' },
          { scoreRange: [8, 9], expectedOutcome: 'Correct numbers and reasoning, grounded in context, with appropriate qualifications.' },
          { scoreRange: [10, 10], expectedOutcome: 'Complete, precise answer satisfying every expected fact and qualification.' },
        ],
      }),

      // 2. Relevancy: does the answer address the employee's question?
      answerRelevancy({
        name: 'answerRelevancy',
        model,
        threshold: 0.8,
      }),

      // 3. Numbers: check the regex written in each case's metadata.
      contains({
        name: 'contains',
        // Ignore Markdown emphasis, e.g. **12** hari.
        actual: (args) => selectPromptOutput(args).replace(/[*_`]/g, ''),
        expected: ({ case: testCase }) => new RegExp(String(testCase.metadata?.numberPattern), 'i'),
      }),
    ],
    reporters: [reporter],
    concurrency: 1,
    exitCode: true,
  })
} finally {
  await lens.close()
}
