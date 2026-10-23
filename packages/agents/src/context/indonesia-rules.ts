import type { Document } from '@anvia/core'

export const indonesiaRules: Document = {
  id: 'indonesia-hr-reference',
  text: `Referensi umum ketenagakerjaan Indonesia untuk simulasi HR PT Bisi.
Ini ringkasan awal, bukan penetapan hak individual atau pengganti naskah peraturan terbaru.
Periksa status aturan, pengecualian sektor, perjanjian kerja, dan peraturan perusahaan yang berlaku.

Waktu kerja:
- Pola umum: 8 jam per hari dan 40 jam per minggu untuk 5 hari kerja,
  atau 7 jam per hari dan 40 jam per minggu untuk 6 hari kerja.
- Ada pengaturan khusus untuk sektor tertentu. Lembur memerlukan pengaturan dan pembayaran sesuai ketentuan.
- Rujukan: PP Nomor 35 Tahun 2021.
  https://peraturan.bpk.go.id/Details/161904/pp-no-35-tahun-2021

Cuti tahunan:
- Gambaran umum: minimal 12 hari kerja setelah 12 bulan bekerja terus-menerus.
- Pelaksanaan dan hak yang lebih baik perlu diperiksa pada perjanjian kerja atau aturan perusahaan.
- Rujukan awal: penjelasan Kemnaker tentang waktu istirahat dan cuti; periksa perubahan aturan sebelum penerapan.
  https://jdih.kemnaker.go.id/berita/detail/waktu-istirahat-dan-cuti

THR keagamaan:
- Masa kerja minimal 12 bulan terus-menerus: umumnya 1 bulan upah.
- Masa kerja minimal 1 bulan tetapi kurang dari 12 bulan: proporsional,
  yaitu masa kerja dalam bulan / 12 x 1 bulan upah.
- Pembayaran paling lambat 7 hari sebelum hari raya keagamaan, penuh dan tidak dicicil.
- Komponen upah, pekerja harian, dan ketentuan yang lebih menguntungkan perlu diperiksa sebelum menghitung.
- Rujukan: penjelasan pemerintah atas edaran THR 2026.
  https://setneg.go.id/baca/index/terbitkan_edaran_thr_keagamaan_2026_menaker_harus_dibayar_penuh_tak_boleh_dicicil

Hari libur dan cuti bersama:
- Cuti bersama di perusahaan bersifat pilihan berdasarkan kesepakatan dan menjadi bagian cuti tahunan.
- Pekerja yang tetap bekerja pada cuti bersama menerima upah hari kerja biasa tanpa pengurangan cuti tahunan.
- Bedakan cuti bersama dengan hari libur nasional; bekerja pada hari libur nasional memiliki ketentuan tersendiri.
- Rujukan: SE Menaker M/6/HK.04/XII/2024.
  https://jdih.kemnaker.go.id/peraturan/detail/2612/surat-edaran-menteri-nomor-m-6-hk-04-xii-2024

Upah minimum dan BPJS:
- Jangan menggunakan satu angka upah minimum untuk seluruh Indonesia; tanyakan wilayah dan tahun lalu verifikasi sumber resmi.
- Arahkan pertanyaan kepesertaan BPJS ke HR; jangan mengarang nomor peserta, status aktif, atau tarif iuran.
- PHK, pesangon, dan persoalan kontrak memerlukan pemeriksaan kasus oleh HR.`,
  additionalProps: {
    source: 'public-indonesia-hr-reference',
    jurisdiction: 'Indonesia',
    status: 'summary-verify-before-use',
    referenceDate: '2026-10-16',
  },
}
