# XAUUSD FAFA v8.0.0

## Installation
1. Sauvegarde le dépôt GitHub actuel.
2. Décompresse cette archive. Les fichiers sont directement à la racine de l'archive : téléverse leur contenu à la racine du dépôt configuré pour GitHub Pages, sans créer un dossier parent.
3. Remplace les fichiers existants et valide le commit.
4. Ouvre https://fafamsr.github.io/xauusd-assistant/ et lance « ANALYSER XAUUSD ».
5. Compare les cours et heures affichés avec ton flux MT5 avant toute interprétation.

## Fonctionnalités
- Cotation XAUUSD et bougies M5/M15/M30 depuis l'API publique biquote.
- Contrôles de fraîcheur du cours, cohérence OHLC, bougies clôturées, ordre temporel et écart entre cours et dernière clôture M5.
- EMA20/50, RSI14, ATR14, support/résistance simples et score technique expérimental.
- Filtre calendrier économique public biquote, événements US à fort impact ; si le flux ne peut pas être vérifié ou renvoie un format incohérent, l’analyse est bloquée. Une réponse vide valide est traitée comme absence d’événements retournés par la source, pas comme une garantie d’absence d’annonces. Fenêtre configurée : 30 minutes avant et 15 minutes après.
- Contrôle du spread, SL/TP indicatifs si une confluence est détectée, sinon NO TRADE.
- Pas d'exécution automatique d'ordres.
- Cache statique versionné et chargement réseau prioritaire des fichiers de code.

## Limites importantes
Cette application est un outil d'analyse expérimental, pas un système de trading validé. Les signaux BUY/SELL ne doivent pas être utilisés avec de l'argent réel avant : tests en direct des API/CORS depuis GitHub Pages, comparaison avec le courtier, backtests sans fuite de données futures avec spread/slippage, tests hors échantillon et validation prolongée en démo. Les prix peuvent différer du courtier. Le calendrier peut être incomplet ou retardé. GitHub Pages ne fournit pas d'exécution serveur ni de notifications fiables en arrière-plan sur iOS.

## Version préparée pour les tests utilisateur
- Syntaxe JavaScript locale : app.js et sw.js.
- Vérification des chemins d’assets, archive ZIP et fichiers présents.
- Amélioration du traitement du calendrier : une réponse vide valide ne bloque pas automatiquement le moteur ; un format incohérent reste bloquant.
- Vérifications réseau en direct, disponibilité CORS, calendrier, correspondance avec le broker et site publié non confirmés depuis cet environnement.
- Cette version est prête à être installée pour des tests contrôlés, mais pas certifiée pour le trading réel. Ne pas considérer les signaux comme validés avant une phase de démonstration et un journal des résultats.


## Correction des niveaux (v8.2)
- SL technique combinant structure M5 et ATR, avec refus si la distance dépasse 2,5 ATR.
- TP ajustés aux obstacles structurels détectés en M5/M15/M30.
- Si le TP1 ne conserve pas au moins 1,2R, ou si les objectifs ne sont pas ordonnés correctement, le signal devient NO TRADE.
- Ces règles sont expérimentales et doivent être validées en backtest puis en démo. Elles ne garantissent pas un taux de réussite.
