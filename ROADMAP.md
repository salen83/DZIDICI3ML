# DZIDICI3 – Master Roadmap (kompletna verzija)

## 0. Opšti princip
- Svaki screen ima jasno definisanu odgovornost.
- Nijedan screen ne računa tuđu logiku.
- Podaci teku jednosmerno: **Screen1/Screen3 → Screen2/Screen2Liga → Stats/Models → Predikcija → Final**.
- Svi izračuni koriste **globalni kontekst** (`MatchesContext`).
- Novi feature ili statistika se dodaje u roadmap pre implementacije.

---

## 1. Input Layer

### Screen1 – Results (Rezultati)
- Ulaz: istorijski mečevi (Excel ili manualni unos)
- Izlaz: `rows` (globalni kontekst)
- Funkcionalnosti:
  - Dodavanje/brisanje mečeva
  - Editabilna polja
  - Automatsko sortiranje po datumu (najnoviji na vrhu)
  - Bojenje liga po koloni "Liga"
  - Virtualizacija table (za veliki broj mečeva)

### Screen3 – Future Matches (Ponuda)
- Ulaz: budući mečevi (Excel ili manualni unos)
- Izlaz: `futureMatches` (globalni kontekst)
- Funkcionalnosti:
  - Dodavanje/brisanje mečeva
  - Editabilna polja
  - Automatsko sortiranje po datumu (najnoviji na vrhu)
  - Bojenje liga po koloni "Liga"

---

## 2. Stats Layer

### Screen2 – Team Stats (Statistika timova)
- Ulaz: `rows` iz Screen1
- Funkcionalnosti:
  - Suma svih mečeva po timu
  - GG, NG, 2+, 7+, Prosek golova, Golovi dati/primljeni
  - Breakdown po ligama (popover)
  - Sortiranje po ukupnom broju odigranih mečeva (najviše na vrhu)
  - Kompaktni prikaz za mobilni
  - NEMA editabilnih polja
  - NEMA dugmeta "Dodaj tim"
  - NEMA bojenja liga po redu

### Screen2Liga – League Stats
- Ulaz: `rows` iz Screen1
- Funkcionalnosti:
  - GG, NG, 2+, 7+, avg golova po ligi
  - Sortiranje po ligi i prosečnim vrednostima
  - Kompaktni prikaz za mobilni

---

## 3. Poisson Layer (novi)

### Screen10 – PoissonStats
- Ulaz: `rows` (Screen1), `teamStats` (Screen2), `leagueStats` (Screen2Liga)
- Funkcionalnosti:
  - Računa λ (lambda) za golove domaćina i gosta
  - Računa Poisson verovatnoće za 0,1,2,3,... golova
  - Mogućnost agregacije po ligi i domaćem/gostujućem učinku
  - Kompaktna tabela po timovima

---

## 4. Model Layer

### Screen4 – Hybrid Model
- Ulaz:
  - `teamStats` (Screen2)
  - `leagueStats` (Screen2Liga)
  - `futureMatches` (Screen3)
  - `h2hMap` (iz Screen1)
  - `ticketInfluence` (komponenta/koncept tiketa)
- Funkcionalnosti:
  - Računa predikcije za GG%, NG%, 2+, 7+ koristeći:
    - Forma tima
    - Statistika lige
    - H2H
    - Uticaj tiketa
  - Prikaz tabela sa predikcijama po meču
  - H2H modal za klik na tim

### Screen11 – Hybrid + Poisson Prediction
- Ulaz:
  - Predikcije iz Screen4
  - Verovatnoće iz Screen10 (Poisson)
- Funkcionalnosti:
  - Kombinuje hibrid predikcije + Poisson
  - Računa finalne šanse za GG, NG, 2+, 7+, ili bilo koji tip igre
  - Prikaz tabela po meču sa svim komponentama
  - Pruža transparentnost: vidi se doprinos svakog faktora

---

## 5. Selection Layer (Rang i Tiketi)

### Screen5 – Rang GG
### Screen6 – Rang NG
### Screen7 – Rang 2+
### Screen8 – Rang 7+
- Ulaz: Screen11 output (finalne verovatnoće)
- Funkcionalnosti:
  - Rangira mečeve po najvećoj verovatnoći za tip igre
  - Obojiti red u zeleno ako verovatnoća ≥75%
  - Klik na meč dodaje ga u tiket (screen9)
  - Mečevi koji su već ubačeni u tiket u **bilo kojem od screenova 5–8** postaju crveni i ne mogu se ponovo dodati
  - Prikaz dodatnih informacija po potrebi
  - Kompaktni prikaz za mobilni

### Screen9 – Tiketi
- Ulaz: izbor mečeva iz screenova 5–8
- Funkcionalnosti:
  - Dodavanje mečeva iz screenova 5–8
  - Provera tiketa: čim jedan meč ne prođe → tiket se odmah prebacuje u gubitne
  - Rezultati ostalih mečeva u tiketu se i dalje ažuriraju dok se poslednji meč ne završi
  - Transparentno praćenje stanja tiketa

---

## 6. Final Layer

### Screen12 – Final Mixer
- Ulaz: Screen11 output
- Funkcionalnosti:
  - Vizualizacija verovatnoća
  - Potencijalni filter/tiket generator
  - Može koristiti dodatne statistike za live ažuriranje

---

## 7. Pravila
1. Nijedan screen ne sme direktno čitati Excel osim Screen1/Screen3.
2. Svi izračuni koriste globalni kontekst ili output prethodnog screen-a.
3. Novi tip statistike ili funkcionalnosti mora biti unapred definisan u roadmap.md.
4. Verzije:
   - Screen1–3: input layer
   - Screen2–2Liga: stats layer
   - Screen4: predikcija (hybrid)
   - Screen10: poisson stats
   - Screen11: final hybrid+poisson
   - Screen5–8: rangovi i selekcija tiketa
   - Screen9: tiket panel
   - Screen12: final visual + filter/tiket
