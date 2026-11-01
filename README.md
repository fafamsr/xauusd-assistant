# XAUUSD FAFA — v8.4.0

Application web mobile statique, conçue pour GitHub Pages et iPhone/iPad. Elle produit des analyses indicatives uniquement : elle n’envoie aucun ordre.

## Évolutions v8.4.0
- Contexte supérieur H1 synthétisé à partir de paires de bougies M30 clôturées.
- Analyse H1 / M30 / M15 / M5.
- Indicateurs : EMA 20/50/200 (si historique suffisant), RSI 14, MACD, ADX 14 et ATR 14.
- Structure de marché : supports/résistances récents, séquences de sommets/creux et balayages de liquidité simplifiés. Ce n’est pas une détection institutionnelle certifiée des Order Blocks/FVG.
- Filtre d’extension : bloque une vente si RSI M5/M15 est en survente et un achat en surachat, en demandant un pullback/rejet.
- Contrôle du stop (2,5 ATR), des obstacles structurels et d’un TP1 minimal (1,2R).
- Justification explicite de NO TRADE et affichage de la session de marché.
- Journal local des analyses (100 dernières), sans prétendre mesurer un win rate.
- Tick indisponible : affichage éventuel de la dernière clôture, mais aucun signal exécutable.
- Service worker et version des ressources actualisés.

## Installation
1. Décompresser l’archive.
2. Remplacer les fichiers existants à la racine du dépôt GitHub Pages par les fichiers de l’archive.
3. Attendre la publication GitHub Pages, puis actualiser le site.
4. Vérifier que l’en-tête indique v8.4.0. Sur iPhone, fermer/réouvrir l’onglet si l’ancienne version reste en cache.

## Sources et limites
- Bougies et tick : API publique Biquote (`https://biquote.io/api`).
- Calendrier : endpoint public Biquote, annonces US classées haute importance. Il peut être incomplet ou indisponible ; dans ce cas l’analyse s’interrompt.
- Graphique embarqué : TradingView OANDA:XAUUSD, qui peut différer du flux Biquote.
- H1 est agrégé localement à partir de bougies M30 clôturées et n’est pas une cotation H1 native.
- Le score technique n’est pas une probabilité de gain. Aucun backtest robuste ni validation hors échantillon n’est fourni. Tester en démo avant tout usage réel.
- Le journal local stocke des décisions sur le navigateur, sans synchronisation entre appareils et sans suivi automatique des TP/SL.
- Pas de promesse de rendement ni de taux de réussite.
