import type { Document } from '@anvia/core'

export const document: Document = {
  id: 'pt-bisi-mock-hr-policy',
  text: `DATA MOCK — Simulasi buku panduan HR PT Bisi.
Semua prosedur dan jadwal perusahaan berikut adalah contoh, bukan kebijakan resmi PT Bisi.

Jam kerja dan kehadiran:
- Contoh jadwal kantor: Senin–Jumat, 08.00–17.00 WIB, istirahat 12.00–13.00 WIB.
- Catat kehadiran pada awal dan akhir hari kerja melalui sistem absensi internal.
- Laporkan keterlambatan atau kendala absensi kepada atasan dan HR pada hari yang sama.

Cuti dan izin:
- Contoh hak cuti tahunan: 12 hari kerja setelah 12 bulan bekerja terus-menerus.
- Contoh prosedur cuti terencana: ajukan minimal 3 hari kerja sebelumnya kepada atasan melalui sistem HR.
- Untuk sakit atau keadaan darurat, kabari atasan sesegera mungkin; prosedur cuti terencana tidak berlaku.
- Dokumen pendukung sakit mengikuti kebutuhan HR tanpa membagikan diagnosis di percakapan ini.
- Cuti khusus, melahirkan, dan hak cuti lain mengikuti ketentuan yang berlaku dan konfirmasi HR.
- Saldo cuti individual tidak tersedia dalam data mock ini.

Lembur dan penggajian:
- Rencanakan lembur bersama atasan dan catat waktu serta persetujuan pekerja.
- Contoh tanggal pembayaran gaji: tanggal 25 setiap bulan; jika libur, hari kerja sebelumnya.
- Perbedaan slip gaji disampaikan kepada HR/payroll melalui kanal internal, bukan dengan mengirim rekening di chat.
- Besaran gaji, tunjangan, potongan, dan data rekening karyawan tidak tersedia.

THR, BPJS, dan layanan HR:
- THR mengikuti ketentuan Indonesia yang berlaku; tidak ada tanggal pembayaran khusus perusahaan dalam mock ini.
- Pertanyaan kepesertaan BPJS Kesehatan dan Ketenagakerjaan diarahkan ke HR.
- Perubahan data karyawan dan surat keterangan kerja diajukan melalui sistem HR internal.
- Kontak HR dan alamat portal nyata tidak disediakan; jangan mengarangnya.
- Prosedur mock tidak membatasi hak pekerja yang dijamin peraturan.`,
  additionalProps: {
    source: 'mock-company-policy',
    company: 'PT Bisi',
    status: 'mock-not-official',
  },
}
