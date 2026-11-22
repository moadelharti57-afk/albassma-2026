# Albassma Filme 2026 · Billetterie

Site de billetterie de l'événement cinéma du club **Mohandiss Al Bassma** :
inscription en ligne, billet numérique avec QR code (PDF + email Gmail),
et espace staff pour scanner les entrées.

- **Installation et mise en ligne :** voir [GUIDE-INSTALLATION.md](GUIDE-INSTALLATION.md)
- **Textes de l'événement** (date, lieu, programme, FAQ) : `src/config/event.ts`

## Développement local

```powershell
npm install
copy .env.example .env   # puis remplir les valeurs Supabase
npm run dev
```

Stack : Vite, React, TypeScript, Tailwind, Supabase, three.js, GSAP, Lenis.
