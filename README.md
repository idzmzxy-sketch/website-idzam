# Idzam — website

React + TypeScript + Vite + Tailwind. Login Google + database lewat **Firebase** (paket gratis Spark,
tanpa kartu). Tidak ada upload file; background dibagikan lewat **link**, atau lewat file di repo GitHub.
Tanpa Firebase situs tetap jalan (background bawaan + dari repo saja), tapi login dan berbagi link mati.

## 1. Jalankan di lokal

```bash
npm install
cp .env.example .env.local   # isi 4 nilai Firebase (langkah 2–5)
npm run dev
```

## 2. Buat project Firebase

1. Buka <https://console.firebase.google.com> → **Add project** → beri nama. Google Analytics boleh dimatikan.
2. Biarkan di paket **Spark** (gratis). Jangan upgrade ke Blaze.

## 3. Aktifkan login Google (tanpa perlu Client ID manual)

1. **Build → Authentication → Get started → Sign-in method → Google → Enable**.
2. Pilih email dukungan project → **Save**.
3. **Authentication → Settings → Authorized domains → Add domain**: tambahkan alamat Vercel-mu,
   misal `idzam.vercel.app` (`localhost` sudah ada).

## 4. Buat database Firestore + pasang aturan

1. **Build → Firestore Database → Create database**. Pilih lokasi terdekat (misal `asia-southeast1`,
   Singapura; lokasi tidak bisa diganti nanti) dan mulai dalam **production mode**.
2. Buka tab **Rules**, hapus isinya, tempel seluruh isi file `firestore.rules`, klik **Publish**.

## 5. Ambil konfigurasi web app

1. Klik ikon roda gigi → **Project settings → General**.
2. Di **Your apps** klik ikon **</>** (Web), beri nama, **Register app**.
3. Dari `firebaseConfig` salin 4 nilai ini ke `.env.local`:

```
VITE_FIREBASE_API_KEY=...        # apiKey
VITE_FIREBASE_AUTH_DOMAIN=...    # authDomain
VITE_FIREBASE_PROJECT_ID=...     # projectId
VITE_FIREBASE_APP_ID=...         # appId
```

(Nilai ini memang boleh publik; yang menjaga data adalah aturan di `firestore.rules`.)

## 6. Deploy lewat GitHub → Vercel

1. Push folder ini ke GitHub (repo baru).
2. <https://vercel.com> → **Add New → Project** → pilih repo.
3. Di **Environment Variables** isi 4 variabel `VITE_FIREBASE_...` yang sama → **Deploy**.
4. Setiap `git push` berikutnya otomatis ter-deploy.
5. **Langsung login sendiri dulu setelah deploy.** Akun Google pertama yang login jadi **admin**,
   semua setelahnya jadi member.

## AI Chat (API xkiro)

Menu **AI Chat** memanggil fungsi server `api/chat.ts` di Vercel. Kunci API **tidak pernah** ada di kode
browser maupun di repo; dia hanya hidup sebagai environment variable di Vercel.

1. Di Vercel → **Settings → Environment Variables**, tambahkan:
   - `XTROUTER_API_KEY` = kunci API xkiro kamu (jangan diawali `VITE_`)
   - opsional: `XTROUTER_BASE_URL` (bawaan `https://api.xkiro.com/v1`) dan `XTROUTER_MODEL` (bawaan `claude-opus-4.8`)
2. Redeploy. Fungsi ini juga memakai `VITE_FIREBASE_API_KEY` yang sudah ada untuk memeriksa login.
3. Hanya akun yang sudah login yang bisa chat, dibatasi 20 pesan per 10 menit per akun, supaya
   orang asing tidak menghabiskan kuota kunci APInya.
4. Mencoba di lokal: `npx vercel dev` (perintah `npm run dev` biasa tidak menjalankan folder `api/`).
5. Kalau chat selalu bilang "Please sign in again", isi juga `SITE_URL` (alamat situs Vercel-mu) di environment.

**Penting:** kunci API yang pernah ditempel di chat atau tempat umum sebaiknya dianggap bocor.
Buat kunci baru di dashboard xkiro, pakai yang baru di Vercel, dan hapus yang lama.

## Cara kerjanya

- **Start a project** → login Google. Setelah login jadi foto profil.
- **Our work**: tema bawaan, background dari repo ("From Idzam"), dan background yang dibagikan member
  lewat link. Tombol **Share** hanya muncul untuk admin. Admin bisa menyalakan
  "Let every signed-in member share backgrounds".
- Tombol palet di navbar: ganti background kapan saja. Pilihan tersimpan di browser,
  jadi saat masuk lagi tetap memakai background itu.
- Admin: **Set as default** di tiap kartu menentukan background untuk pengunjung yang belum memilih sendiri.
- Hapus: hanya akun yang menambahkannya, admin bisa menghapus semua.
- Nama pengunggah di kartu bisa diklik → halaman profil dan daftar uploadnya.

## Background dari repo (GitHub)

Taruh video di `public/backgrounds/` lalu daftarkan di `src/data/backgrounds.json`:

```json
{
  "default": "builtin:meadow",
  "items": [
    { "id": "langit", "title": "Langit Sore", "description": "Awan pelan.", "type": "video", "src": "/backgrounds/langit.mp4" }
  ]
}
```

`src` bisa file di folder tadi atau link https. Usahakan video di bawah ±10 MB. Setelah itu `git push`.
Catatan: "Set as default" dari admin (di Firestore) mengalahkan `default` di file ini.

## Catatan

- Kalau admin salah orang atau mau reset: di Firestore hapus dokumen `config/admin` dan ubah field
  `role` pada `users/<uid>` lewat console. (Orang berikutnya yang login saat `config/admin` tidak ada
  akan jadi admin, jadi lakukan ini hati-hati.)
- Our story memakai tombol Add yang tersimpan di browser saja.
- Form di Say hello masih contoh dan belum mengirim email.
- Kuota gratis Firestore: 50 ribu baca per hari; untuk situs kecil ini sangat cukup.
