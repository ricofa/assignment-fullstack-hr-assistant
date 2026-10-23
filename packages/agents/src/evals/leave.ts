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
    name: 'pt-bisi-hr-leave',
    cases: [
      {
        id: 'leave-annual-days',
        input: 'Jika syarat masa kerja sudah terpenuhi, berapa hari kerja cuti tahunan dalam kebijakan mock PT Bisi? Jawab dengan angka.',
        expected: 'Dalam kebijakan mock PT Bisi, cuti tahunan adalah 12 hari kerja setelah bekerja 12 bulan terus-menerus. Ini simulasi, bukan konfirmasi saldo pribadi.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\b12\b\s*hari\s+kerja/i.source,
        },
      },
      {
        id: 'leave-service-requirement',
        input: 'Dalam panduan mock PT Bisi, berapa bulan masa kerja terus-menerus untuk memperoleh cuti tahunan? Gunakan angka.',
        expected: 'Contoh kebijakan PT Bisi mensyaratkan 12 bulan bekerja terus-menerus untuk cuti tahunan. Ini ketentuan mock dan perlu konfirmasi HR untuk kasus individual.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\b12\b\s*bulan/i.source,
        },
      },
      {
        id: 'leave-advance-request',
        input: 'Berapa hari kerja sebelumnya cuti terencana diajukan dalam simulasi PT Bisi, dan kepada siapa? Gunakan angka.',
        expected: 'Menurut panduan mock PT Bisi, ajukan cuti terencana minimal 3 hari kerja sebelumnya kepada atasan melalui sistem HR. Untuk sakit atau darurat, kabari atasan sesegera mungkin tanpa mengikuti tenggat cuti terencana.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\b3\b\s*hari\s+kerja/i.source,
        },
      },
      {
        id: 'leave-hypothetical-balance',
        input: 'Untuk simulasi saja: jatah saya 12 hari kerja dan sudah terpakai 5 hari. Tanpa pengurangan lain, berapa sisa cuti? Tulis hasil dengan angka; jangan anggap ini saldo nyata.',
        expected: 'Untuk simulasi, 12 - 5 = 7 hari kerja tersisa. Ini perhitungan hipotetis, bukan saldo yang diverifikasi dari sistem HR.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\b7\b\s*hari/i.source,
        },
      },
      {
        id: 'leave-after-two-requests',
        input: 'Hitung simulasi: jatah awal 12 hari kerja, dipakai 4 hari lalu 3 hari. Tidak ada carry-over atau pengurangan lain. Berapa hari tersisa? Gunakan angka.',
        expected: 'Dalam simulasi, 12 - 4 - 3 = 5 hari kerja tersisa. Saldo aktual tetap harus dicek di sistem HR; data mock tidak menyimpan saldo karyawan.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\b5\b\s*hari/i.source,
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
