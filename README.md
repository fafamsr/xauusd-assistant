# XAUUSD FAFA 9.3 — Advanced Analysis

Version mobile-first de l'assistant d'analyse XAUUSD. Elle ne passe aucun ordre.

## Ce que fait réellement cette version

- Interface noire/or adaptée aux petits écrans, avec graphique large.
- Analyse des bougies clôturées M5, M15 et M30 ; H1 est agrégé depuis M30.
- EMA 20/50/200, RSI 14, MACD, ADX, ATR et structure swing simplifiée.
- Contrôle du tick, de l'âge des cotations, de la cohérence prix/bougies et du spread.
- Contrôle du calendrier US à fort impact fourni par Biquote ; calendrier indisponible = blocage du CALL.
- Distinction entre biais directionnel et CALL confirmé BUY/SELL ; les setups non confirmés restent en attente.
- Entrée, SL et TP1/TP2/TP3 indicatifs calculés à partir de l’ATR et de niveaux structurels ; R/R affiché pour chaque objectif.
- Un CALL confirmé exige un R/R TP1 d’au moins 1,5, un déclencheur M5 clôturé et les confirmations de structure, tendance et momentum.
- Score technique plafonné à 100 et distinct d’une probabilité de gain.
- Journal local sur l'appareil.
- Proxy Cloudflare Pages Function pour éviter les appels cross-origin directs au fournisseur.

## Déploiement requis pour activer le backend gratuit

Le ZIP contient les fichiers du site et une Cloudflare Pages Function dans `functions/api/[[path]].js`.

1. Décompresse cette archive.
2. Crée un dépôt GitHub dédié ou remplace les fichiers de ton dépôt avec le contenu de l'archive (les fichiers `index.html`, `app.js`, `styles.css`, `functions/`, etc. doivent être à la racine).
3. Dans Cloudflare, ouvre **Workers & Pages → Create → Pages → Connect to Git**.
4. Sélectionne le dépôt GitHub.
5. Framework preset : **None**. Build command : vide. Build output directory : `/`.
6. Déploie. La fonction `/api/*` est alors exécutée côté Cloudflare et relaie les endpoints autorisés de Biquote.
7. Ouvre l'URL Cloudflare Pages et teste les diagnostics. GitHub Pages seul n'exécute pas le dossier `functions/` : l'API proxy nécessite Cloudflare Pages.

Le proxy n'ajoute pas de fournisseur de données premium et ne garantit pas la disponibilité de Biquote. Le plan gratuit a des quotas et limites d'exécution. Vérifier les conditions actuelles de Cloudflare avant déploiement.

## Tests réalisés dans le package

- Vérification syntaxique JavaScript de `app.js` et de la Pages Function.
- Vérification de l'intégrité de l'archive.
- Vérification statique des routes proxy autorisées et des contrôles de décision.

## Limites techniques à connaître

- Le flux de prix et de bougies est Biquote ; il peut différer du broker MT5 de l'utilisateur.
- Le graphique intégré est TradingView OANDA:XAUUSD et sert de référence visuelle : il ne partage pas nécessairement le même flux que le moteur.
- H1 est synthétisé à partir de M30, pas reçu comme une série H1 native.
- La détection BOS/liquidité est une heuristique de swings, pas une identification institutionnelle certifiée des Order Blocks/FVG.
- Le score /100 est un score technique interne, jamais une probabilité de gain.
- Le calendrier Biquote peut être incomplet. En cas d'indisponibilité ou de format inattendu, aucun CALL confirmé n'est émis.
- Aucun backtest robuste, test de slippage, ni validation hors échantillon n'est fourni dans cette archive. Le journal est local et ne suit pas automatiquement les TP/SL.
- Pas d'entraînement ML, pas de flux CME temps réel, pas de notification Telegram dans cette version.
- Tester en démo avant tout usage réel. Un signal confirmé n'est pas une garantie de résultat.

## Données

- Biquote API : `https://biquote.io/api`
- TradingView : widget OANDA:XAUUSD (visualisation uniquement)
