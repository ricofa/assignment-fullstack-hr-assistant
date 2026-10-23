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
    name: 'pt-bisi-hr-payroll',
    cases: [
      {
        id: 'payroll-regular-date',
        input: 'Dalam contoh kebijakan PT Bisi, gaji dibayar tanggal berapa jika tanggal itu hari kerja biasa? Gunakan angka.',
        expected: 'Dalam kebijakan mock PT Bisi, contoh tanggal pembayaran gaji adalah tanggal 25 setiap bulan. Ini bukan tanggal resmi yang sudah dikonfirmasi perusahaan.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\btanggal\s+25\b/i.source,
        },
      },
      {
        id: 'payroll-saturday',
        input: 'Simulasi kalender: tanggal 25 jatuh Sabtu, tanggal 24 Jumat adalah hari kerja, dan tidak ada libur lain. Menurut kebijakan mock, gaji dibayar tanggal berapa? Gunakan angka.',
        expected: 'Dalam simulasi kebijakan PT Bisi, gaji dibayar tanggal 24, Jumat, sebagai hari kerja sebelum tanggal pembayaran yang jatuh pada hari libur.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\btanggal\s+24\b/i.source,
        },
      },
      {
        id: 'payroll-sunday',
        input: 'Simulasi kalender: tanggal 25 jatuh Minggu, tanggal 23 Jumat hari kerja, dan tanggal 24 Sabtu libur. Tidak ada libur lain. Tanggal berapa gaji dibayar dalam kebijakan mock? Gunakan angka.',
        expected: 'Berdasarkan simulasi kebijakan PT Bisi, gaji dibayar tanggal 23, Jumat, hari kerja sebelumnya. Ini perhitungan kalender hipotetis.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\btanggal\s+23\b/i.source,
        },
      },
      {
        id: 'payroll-monday-holiday',
        input: 'Simulasi: Senin tanggal 25 adalah libur nasional, akhir pekan 23–24 libur, dan Jumat tanggal 22 hari kerja. Menurut mock PT Bisi, gaji dibayar tanggal berapa? Gunakan angka.',
        expected: 'Dalam simulasi kebijakan PT Bisi, pembayaran dimajukan ke tanggal 22, Jumat, sebagai hari kerja sebelumnya. Ini bukan kalender pembayaran resmi.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\btanggal\s+22\b/i.source,
        },
      },
      {
        id: 'holiday-work-no-leave-deduction',
        input: 'Menurut ringkasan dalam konteks, jika saya tetap bekerja pada cuti bersama, berapa hari cuti tahunan dikurangi untuk hari itu dan bagaimana upahnya? Sebutkan pengurangan dengan angka.',
        expected: 'Pengurangannya 0 hari cuti tahunan; pekerja yang tetap bekerja pada cuti bersama mendapat upah hari kerja biasa. Cuti bersama berbeda dari hari libur nasional; penerapannya mengikuti kesepakatan dan ketentuan terkait.',
        metadata: {
          // Store the regex as text because evaluation metadata must be JSON.
          numberPattern: /\b0\b\s*hari/i.source,
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
