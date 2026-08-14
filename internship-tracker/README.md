# Evidencija stručne prakse

Ovo je web aplikacija za lakše praćenje stručne prakse. Napravljena je za studente i mentore.

Student može dodati podatke o svojoj praksi, voditi dnevnik i pratiti koliko je sati odradio. Na kraju može napraviti DOCX dokument sa svim podacima i zapisima.

Mentor dobiva poziv u aplikaciji. Može prihvatiti ili odbiti studenta te kasnije pregledati njegov dokument.

Poziv se ne šalje na pravi e-mail. Mentor se mora registrirati u aplikaciji s istom e-mail adresom koju je student upisao.

## Korištene tehnologije

- React i Vite
- Node.js i Express
- SQLite baza
- JWT za prijavu korisnika
- DOCX za izradu dokumenta

## Pokretanje aplikacije

Potreban je Node.js 22 ili noviji.

Prvo treba instalirati sve pakete:

```powershell
npm install
npm --prefix backend install
```

Zatim treba napraviti `.env` datoteku:

```powershell
Copy-Item backend\.env.example backend\.env
```

U `backend/.env` treba promijeniti `JWT_SECRET` i upisati neki dugi nasumični ključ.

Nakon toga se aplikacija može pokrenuti ovako:

```powershell
npm run build
npm start
```

Aplikacija se otvara na:

```text
http://localhost:3001
```

Baza i tablice naprave se automatski kod prvog pokretanja.

## Provjera koda

Prije commita mogu se pokrenuti ove dvije naredbe:

```powershell
npm run lint
npm run build
```
