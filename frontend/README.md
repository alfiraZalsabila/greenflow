# GREENFLOW Frontend

Panel web dan dashboard GREENFLOW (irigasi otomatis tanaman sawi).

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- React Router
- Berbasis [TailAdmin Free React](https://tailadmin.com/) v2.5.0 (lihat `LICENSE.md`)

## Perintah

```bash
npm run dev      # server pengembangan Vite (:5173, proxy /api ke :3000)
npm run build    # type-check + build produksi
npm run lint     # oxlint + eslint
```

Frontend tidak mengakses Firebase secara langsung. Semua data lewat API Express
di `../backend`. Panduan kontribusi template ada di `AGENTS.md`; aturan produk
utama ada di `../context/PRD.md` dan `../context/architecture.md`.
