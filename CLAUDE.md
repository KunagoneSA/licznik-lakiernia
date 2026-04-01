# CLAUDE.md — Instrukcje dla Claude

## Git workflow
- **Domyślny branch roboczy:** `develop` — zawsze pracuj na nim.
- **Release na produkcję:** gdy user powie "releasuj" / "release" / "na produkcję":
  1. Commit wszystkie zmiany na `develop`
  2. `git checkout master`
  3. `git merge develop`
  4. `git push origin master`
  5. `git checkout develop` — wróć na develop
- **Nigdy nie pushuj bezpośrednio na master** — tylko przez merge z develop.
- **Auto-push:** po każdej zmianie w kodzie — commituj i pushuj na `develop` automatycznie.
- **Deploy:** NIGDY nie deployuj samodzielnie (Netlify, produkcja). Deploy TYLKO na wyraźne polecenie usera ("releasuj", "deploy", "na produkcję").
- **Netlify deploy:** Netlify NIE jest podłączony do GitHuba — po release wykonaj `npx netlify deploy --prod --dir=dist` żeby wgrać nową wersję.
- **Po release:** zawsze podaj link do aplikacji: https://licznik-lakiernia.netlify.app
- **Wersja:** przy każdym deploy na Netlify automatycznie podbij numer wersji w `src/layouts/AppLayout.tsx` (format: `ver. X.YY`) i poinformuj usera jaki to numer.
- **Tagi stabilne:** przed większymi zmianami twórz tag `vX.XX-stable` na masterze i pushuj go (`git tag -a vX.XX-stable -m "opis" && git push origin vX.XX-stable`). W razie problemów cofamy do tagu.

## Powiadomienia
- Dźwięk `afplay /System/Library/Sounds/Hero.aiff` odtwarzaj **TYLKO jako ostatnią komendę** — po WSZYSTKICH operacjach (build, commit, push, odpowiedź tekstowa). Nigdy nie odtwarzaj dźwięku jeśli po nim jeszcze coś robisz.

## Supabase
- Gdy podajesz SQL do wykonania w Supabase, **zawsze dołącz link** do SQL Editor: https://supabase.com/dashboard/project/xbfafasiginpgvsnzgyz/sql/new

## Projekt
- Aplikacja: licznik lakiernia (React + Vite + Supabase)
- Język interfejsu: polski
- **Sortowanie list:** Zawsze sortuj elementy po `created_at` (ascending), nigdy po `id` (UUID jest losowy i nie zachowuje kolejności dodawania).
