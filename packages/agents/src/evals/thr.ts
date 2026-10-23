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
    name: 'pt-bisi-hr-thr',
    cases: [
      {
        id: 'thr-full-year',
        input: 'Berdasarkan ringkasan THR dalam konteks, jika masa kerja sudah 12 bulan terus-menerus, THR umumnya berapa bulan upah? Gunakan angka.',
        expected: 'Secara umum, untuk masa kerja minimal 12 bulan terus-menerus, THR sebesar 1 bulan upah. Komponen upah, aturan terbaru, dan ketentuan yang lebih menguntungkan perlu diperiksa untuk hak individual.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\b1\b\s*bulan\s+upah/i.source,
        },
      },
      {
        id: 'thr-six-months',
        input: 'Simulasi THR: masa kerja 6 bulan, dasar 1 bulan upah Rp6.000.000, dan tidak ada ketentuan yang lebih menguntungkan. Berapa THR proporsional menurut rumus di konteks? Tulis nominal angka.',
        expected: 'Dalam simulasi, 6 / 12 x Rp6.000.000 = Rp3.000.000. Ini estimasi berdasarkan asumsi, bukan penetapan hak individual; HR perlu memverifikasi dasar upah dan aturan yang berlaku.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\bRp\.?\s*(?:(?:3[.]000[.]000|3000000)(?:,00)?|3\s*juta)\b(?!\d|[.,]\d)/i.source,
        },
      },
      {
        id: 'thr-three-months',
        input: 'Hitung simulasi THR dengan masa kerja 3 bulan dan dasar upah bulanan Rp8.000.000, tanpa ketentuan lain yang lebih baik. Gunakan rumus konteks dan nominal angka.',
        expected: 'Simulasi THR proporsional: 3 / 12 x Rp8.000.000 = Rp2.000.000. Nilai final perlu dikonfirmasi HR berdasarkan komponen upah dan ketentuan yang berlaku.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\bRp\.?\s*(?:(?:2[.]000[.]000|2000000)(?:,00)?|2\s*juta)\b(?!\d|[.,]\d)/i.source,
        },
      },
      {
        id: 'thr-nine-months',
        input: 'Untuk simulasi, masa kerja 9 bulan dan dasar 1 bulan upah Rp4.000.000. Tidak ada aturan lebih menguntungkan. Berapa THR menurut rumus proporsional di konteks? Sebutkan nominal angka.',
        expected: 'Dalam simulasi, THR = 9 / 12 x Rp4.000.000 = Rp3.000.000. Ini perhitungan berdasarkan asumsi; HR perlu memastikan dasar upah dan hak final.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\bRp\.?\s*(?:(?:3[.]000[.]000|3000000)(?:,00)?|3\s*juta)\b(?!\d|[.,]\d)/i.source,
        },
      },
      {
        id: 'thr-payment-deadline',
        input: 'Dalam referensi THR pada konteks, paling lambat berapa hari sebelum hari raya THR dibayar, dan bolehkah dicicil? Gunakan angka untuk jumlah hari.',
        expected: 'Menurut ringkasan edaran THR 2026 dalam konteks, THR dibayar penuh paling lambat 7 hari sebelum hari raya keagamaan dan tidak dicicil. Ini batas umum, bukan tanggal pembayaran khusus PT Bisi; verifikasi aturan terbaru.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\b7\b\s*hari/i.source,
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
