# Antrian Rumah Sakit (pweb-ts-p01-2026)

Bagian Orang 1: `login.html` + `index.html` (Dashboard Admin).

## Menjalankan
1. `npm install`, lalu `npm run watch` (atau `npx tsc --watch`) untuk kompilasi `src/` ke `dist/`.
2. Buka folder dengan Live Server, mulai dari `login.html`. Akun uji: `emilys` / `emilyspass` (admin).

## Isi bagian Orang 1
- `src/auth.ts`: login ke dummyjson, simpan token/role/firstName, auth guard + role guard, logout
- `src/login.ts`: form login, loading state, error handling, redirect per role
- `src/admin.ts`: CRUD jenis antrian, tiket manual, reset, navbar
- `src/queue.ts`: bagian jenis antrian, `issue`, `reset`, `counts` (Orang 2 menambah fungsi panggil di file ini)
- `src/store.ts`, `src/types.ts`, `src/ui.ts`: dipakai bersama semua orang

## Yang belum ada (tugas Orang 2 dan 3)
- `operator.html` (Orang 2): user biasa yang login diarahkan ke sini, jadi sementara masih 404.
- `layar.html`, `ambil-antrian.html` (Orang 3).
- Tautan ke halaman-halaman itu di navbar `index.html` (lihat komentar TODO).
