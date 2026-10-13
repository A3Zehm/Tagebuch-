# Die App aufs iPhone bringen

Du machst das **einmal**. Danach startest du die App wie jede andere über ihr Icon, auch ohne Internet.

> **Zur Sicherheit vorweg:** Online liegt nur das *leere Programm*. Deine Einträge werden ausschließlich
> auf deinem iPhone gespeichert und nirgendwohin geschickt.

---

## Teil A – Kostenlos online stellen (GitHub Pages, ca. 10 Minuten am PC)

1. **Konto anlegen:** Auf <https://github.com> auf *Sign up* gehen und ein kostenloses Konto erstellen.
   Dein Benutzername taucht später in der Adresse der App auf.

2. **E-Mail-Adresse schützen (empfohlen):** Unter *Settings → Emails* den Haken bei
   **„Keep my email addresses private“** setzen. Dort steht dann eine Adresse der Form
   `12345+name@users.noreply.github.com`. Gib sie Claude, damit sie in den Commits steht und
   nicht deine echte E-Mail-Adresse (die Commits sind öffentlich sichtbar).

3. **Neues Repository anlegen:** Oben rechts auf **+ → New repository**.
   - Repository name: `tagebuch`
   - **Public** auswählen (nötig für die kostenlose Veröffentlichung)
   - Sonst nichts ankreuzen, dann **Create repository**

4. **Code hochladen:** Im Ordner `Ausbildungstagebuch` diese zwei Befehle ausführen
   (oder Claude bitten, das zu tun). `DEINNAME` durch deinen GitHub-Namen ersetzen:

   ```
   git remote add origin https://github.com/DEINNAME/tagebuch.git
   git push -u origin main
   ```

   Beim ersten Mal öffnet sich ein Fenster zum Anmelden bei GitHub. Melde dich dort an.

5. **Veröffentlichen:** Im Repository auf GitHub auf **Settings → Pages** gehen.
   - Unter *Build and deployment → Source*: **Deploy from a branch**
   - Branch: **main**, Ordner: **/ (root)** → **Save**

   Nach 1–2 Minuten steht oben auf der Seite die Adresse, z. B.
   `https://DEINNAME.github.io/tagebuch/`

---

## Teil B – Aufs iPhone holen (2 Minuten)

1. Die Adresse in **Safari** öffnen.
2. Unten auf das **Teilen-Symbol** tippen (Quadrat mit Pfeil nach oben).
3. Nach unten scrollen und **„Zum Home-Bildschirm“** wählen.
   Falls angeboten, „Als Web-App öffnen“ eingeschaltet lassen, dann **Hinzufügen**.
4. Fertig: Auf dem Homescreen ist jetzt das gelbe Dreieck „Tagebuch“.

**Wichtig:**
- **Öffne die App ab jetzt immer über das Icon, nicht über Safari.** Das iPhone speichert die Daten
  der Homescreen-App getrennt von Safari. Einträge, die du in Safari machst, siehst du in der App nicht.
- **Offline testen:** Flugmodus an, App öffnen, einen Test-Eintrag machen. Das sollte funktionieren.
- **Löschst du das Icon vom Homescreen, sind auch die Einträge weg.** Vorher also ein Backup machen.

---

## Teil C – Backup

- **Backup erstellen:** In der App unten auf **Mehr → Backup erstellen**. Im Teilen-Menü
  **„In Dateien sichern“** wählen, am besten in **iCloud Drive**. Alternativ schickst du die Datei per Mail an dich selbst.
- Die App erinnert dich auf der Startseite, wenn das letzte Backup über zwei Wochen her ist.
- **Handywechsel:** Auf dem neuen iPhone die App wie in Teil B installieren, dann
  **Mehr → Backup einspielen** und die gesicherte Datei auswählen.

---

## Teil D – Später etwas an der App ändern

1. Am PC ändern und mit `Starten.cmd` testen (öffnet die App unter <http://localhost:8080>).
2. Änderung committen und hochladen:
   ```
   git add -A
   git commit -m "Was ich geändert habe"
   git push
   ```
3. Nach 1–2 Minuten ist die neue Version online. Auf dem iPhone die App **zweimal** öffnen:
   Beim ersten Mal lädt sie die neue Version im Hintergrund, beim zweiten Mal siehst du sie.
   Deine Einträge bleiben dabei erhalten.
