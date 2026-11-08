# Northstar

Smartum International School uchun ingliz tili o'quv platformasi: head teacher, o'qituvchi, o'quvchi va ota-ona panellari.

- **Sayt:** https://beck65909-sys.github.io/northstar/
- **Backend:** Supabase loyihasi `northstar` (ref `fzrkdqbplzkovvggydid`, region ap-south-1)
- **Demo loginlar:** `demo.ustoz`, `demo.ali`, `demo.madina`, `demo.ota` — parol `Demo2026`

## Fayllar

| Fayl | Nima |
|---|---|
| `index.html` | Sahifa skeleti, supabase-js (CDN) va `app.js` ni yuklaydi |
| `app.js` | Butun ilova: login, 4 rol paneli, modallar, Daily Challenge |
| `style.css` | Dizayn tokenlari (brendbook: royal blue `#1746A2`, star gold `#F5B942`, Inter) |
| `sw.js`, `manifest.json`, `icon.svg` | PWA: telefonga ilova kabi o'rnatish |
| `supabase-schema.sql` | Asosiy baza: 33 jadval, RLS, triggerlar, viewlar |
| `supabase-additions.sql` | Keyin qo'shilganlar: streak triggeri, reyting funksiyalari, fikrlar jadvali |
| `supabase-create-user.ts` | Edge Function: login/parol yaratish (head teacher va o'qituvchi chaqiradi) |

## Qanday ishlaydi

- **Login:** foydalanuvchi `login` kiritadi, ilova uni `login@northstar.local` email sifatida Supabase Auth'ga yuboradi.
- **Akkaunt yaratish:** faqat `create-user` Edge Function orqali (service role). O'qituvchi faqat o'z guruhiga o'quvchi va o'z o'quvchisiga ota-ona qo'sha oladi.
- **Ruxsatlar (RLS):** head teacher hammasini ko'radi. O'qituvchi `class_teachers` orqali o'z sinflarini ko'radi. O'quvchi faqat o'zini va o'qituvchisining darslarini ko'radi. Ota-ona faqat `parent_students` dagi farzandini ko'radi.
- **Reyting:** `public.group_leaderboard(group_id)` va `public.my_student_scores()` jonli hisoblaydi: bajarilish 30%, sifat 30%, Daily Challenge 20%, faollik 20% + streak bonusi (maks. 100).
- **Streak:** `daily_challenges` ga yozuv qo'shilganda `private.bump_streak()` triggeri yangilaydi.
- **Baho:** `submission_grades` da. O'quvchi va ota-ona `my_grades` view orqali faqat tasdiqlangan bahoni ko'radi.

## Ishlab chiqish

Build yo'q: fayllarni o'zgartirib `main` ga push qilsangiz, GitHub Pages 1 daqiqada yangilaydi. Push qilganda `sw.js` ichidagi `CACHE` versiyasini oshiring (`northstar-v3`, ...), aks holda telefonlarda eski versiya qolishi mumkin.

Lokal sinash: `npx serve .` yoki `python3 -m http.server`, keyin `http://localhost:3000`.

## Qolgan ishlar

GitHub Issues'da. Asosiylari: profil va parol almashtirish, uz/en til, Unit 2–8 darslari, jonli darslar jadvali va davomat, e'lonlar, AI tekshiruv, Watching Time, nishonlar va Mystery Box, Telegram bot, APK.
