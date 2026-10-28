'use strict';
const $ = id => document.getElementById(id);
const API = 'https://biquote.io/api';
const VERSION = 'FAFA-8.3.0';
const NEWS_API = `${API}/calendar/upcoming?limit=100&importance=high&countries=US`;
const NEWS_BLOCK_BEFORE_MIN = 30;
const NEWS_BLOCK_AFTER_MIN = 15;
const fmt = n => Number.isFinite(n) ? n.toFixed(2) : '—';
const num = v => v !== null && v !== '' && Number.isFinite(Number(v));
function ema(a,n){if(a.length<n)return null;let x=a.slice(0,n).reduce((s,v)=>s+v,0)/n,k=2/(n+1);for(let i=n;i<a.length;i++)x=a[i]*k+x*(1-k);return x;}
function rsi(a,n=14){if(a.length<=n)return null;let g=0,l=0;for(let i=1;i<=n;i++){const d=a[i]-a[i-1];if(d>0)g+=d;else l-=d;}g/=n;l/=n;for(let i=n+1;i<a.length;i++){const d=a[i]-a[i-1];g=(g*(n-1)+Math.max(0,d))/n;l=(l*(n-1)+Math.max(0,-d))/n;}return l===0?100:100-100/(1+g/l);}
function atr(b,n=14){if(b.length<n+1)return null;const tr=[];for(let i=1;i<b.length;i++)tr.push(Math.max(b[i].high-b[i].low,Math.abs(b[i].high-b[i-1].close),Math.abs(b[i].low-b[i-1].close)));return tr.slice(-n).reduce((s,v)=>s+v,0)/Math.min(n,tr.length);}
function timeOf(x){const t=x.openTime??x.time??x.timestamp??x.date;const d=typeof t==='number'?new Date(t<1e12?t*1000:t):new Date(t);return Number.isFinite(d.getTime())?d:null;}
function normalizeBars(payload,tf){let raw=Array.isArray(payload)?payload:(payload?.bars||payload?.data||payload?.candles);if(!Array.isArray(raw))throw Error(`Format de bougies ${tf} inconnu.`);const all=raw.filter(x=>x&&[x.open,x.high,x.low,x.close].every(num)&&timeOf(x)).map(x=>({time:timeOf(x).toISOString(),open:+x.open,high:+x.high,low:+x.low,close:+x.close,isOpen:x.isOpen===true||x.isOpen==='true'})).filter(x=>x.high>=Math.max(x.open,x.close,x.low)&&x.low<=Math.min(x.open,x.close,x.high));const seen=new Map();for(const b of all)seen.set(b.time,b);const bars=[...seen.values()].sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));const closed=bars.filter(x=>!x.isOpen);if(closed.length<55)throw Error(`Seulement ${closed.length} bougies clôturées valides en ${tf}; 55 minimum.`);for(let i=1;i<closed.length;i++){if(Date.parse(closed[i].time)<=Date.parse(closed[i-1].time))throw Error(`Ordre temporel incohérent en ${tf}.`);}return closed;}
async function fetchJSON(url){const r=await fetch(url,{cache:'no-store',headers:{'Accept':'application/json'}});if(!r.ok)throw Error(`HTTP ${r.status} sur la source de données.`);return r.json();}
async function getBars(tf){const d=await fetchJSON(`${API}/XAUUSD/ohlc?interval=${tf}&limit=220&v=${Date.now()}`);const b=normalizeBars(d,tf);const mins={ '5m':5,'15m':15,'30m':30 }[tf];const age=(Date.now()-Date.parse(b.at(-1).time))/60000;if(age>mins*3+3)throw Error(`Bougies ${tf} trop anciennes (${Math.round(age)} min depuis la dernière clôture). NO TRADE.`);return b;}
async function getTick(){try{const d=await fetchJSON(`${API}/XAUUSD?allowStale=false&v=${Date.now()}`);const mid=Number(d.mid),age=Number(d.quoteAgeSeconds);if(!Number.isFinite(mid)||mid<=0||d.stale===true||!Number.isFinite(age)||age>300)throw Error('Cotations invalides ou périmées.');if(num(d.bid)&&num(d.ask)&&Number(d.ask)<Number(d.bid))throw Error('Bid/ask incohérents.');return d;}catch(e){return null;}}
async function getNews(){
  const payload=await fetchJSON(`${NEWS_API}&v=${Date.now()}`);
  const rows=Array.isArray(payload)?payload:(payload?.data||payload?.events||payload?.results);
  if(!Array.isArray(rows))throw Error('Le calendrier économique a renvoyé un format inconnu. NO TRADE.');
  const now=Date.now();
  const events=rows.map(x=>{
    const raw=x.scheduledAt||x.date||x.datetime||x.time||x.timestamp||x.releaseTime;
    if(!raw)return null;
    const d=typeof raw==='number'?new Date(raw<1e12?raw*1000:raw):new Date(raw);
    if(!Number.isFinite(d.getTime()))return null;
    const impact=String(x.importance||x.impact||x.impactLevel||'').toLowerCase();
    const high=impact==='high'||impact==='3'||impact==='high impact'||impact==='3.0';
    const country=String(x.countryCode||x.country||x.currency||x.currencyCode||'').toUpperCase();
    const title=String(x.eventName||x.event||x.name||x.title||'Annonce économique');
    return {at:d.getTime(),time:d.toISOString(),impact,high,country,title};
  }).filter(Boolean);
  if(!Array.isArray(rows)||rows.length===0)throw Error('Calendrier vide ou indisponible : impossible de confirmer les annonces. NO TRADE.');
  if(events.length===0)throw Error('Calendrier reçu mais aucun horaire exploitable. NO TRADE.');
  const relevant=events.filter(e=>(e.country==='US'||e.country==='USD'||e.country==='UNITED STATES'||e.country==='UNITED STATES OF AMERICA')&&e.high);
  if(relevant.length===0)throw Error('Aucune annonce américaine à fort impact n’a pu être confirmée dans la réponse. Le calendrier peut être incomplet ou son format a changé : NO TRADE.');
  const blocked=relevant.filter(e=>now>=e.at-NEWS_BLOCK_BEFORE_MIN*60000&&now<=e.at+NEWS_BLOCK_AFTER_MIN*60000);
  return {events:relevant,blocked,checkedAt:now,source:'biquote.io economic calendar'};
}
function renderNews(news){
  const el=$('newsStatus'); if(!el)return;
  if(!news){el.textContent='Calendrier non vérifié : signaux bloqués par sécurité.';return;}
  if(news.blocked.length){el.innerHTML='<strong>Fenêtre d’actualité à risque — signal bloqué</strong><ul>'+news.blocked.map(e=>`<li>${safeText(e.title)} · ${new Date(e.at).toLocaleString('fr-FR')}</li>`).join('')+'</ul>';return;}
  const upcoming=news.events.filter(e=>e.at>news.checkedAt).slice(0,5);
  el.innerHTML=`Calendrier interrogé · ${news.events.length} annonce(s) US à fort impact retournée(s). Aucune annonce détectée dans la fenêtre de blocage actuelle.`+(upcoming.length?'<ul>'+upcoming.map(e=>`<li>${safeText(e.title)} · ${new Date(e.at).toLocaleString('fr-FR')}</li>`).join('')+'</ul>':'');
}
function structure(b){const x=b.slice(-21,-1);if(x.length<10)return {support:null,resistance:null,hh:false,hl:false,lh:false,ll:false,sweepHigh:false,sweepLow:false};const highs=x.map(z=>z.high),lows=x.map(z=>z.low),last=b.at(-1),prev=b.at(-2);const mid=Math.floor(x.length/2);const h1=Math.max(...highs.slice(0,mid)),h2=Math.max(...highs.slice(mid)),l1=Math.min(...lows.slice(0,mid)),l2=Math.min(...lows.slice(mid));return {support:Math.min(...lows),resistance:Math.max(...highs),hh:h2>h1,hl:l2>l1,lh:h2<h1,ll:l2<l1,sweepHigh:last.high>Math.max(...highs)&&last.close<Math.max(...highs),sweepLow:last.low<Math.min(...lows)&&last.close>Math.min(...lows),prev, last};}
function calc(tf,b){const c=b.map(x=>x.close),last=c.at(-1),e20=ema(c,20),e50=ema(c,50),rr=rsi(c),aa=atr(b),st=structure(b);const trend=last>e20&&e20>e50?'HAUSSIÈRE':last<e20&&e20<e50?'BAISSIÈRE':'NEUTRE';let points=0;points+=trend==='HAUSSIÈRE'?2:trend==='BAISSIÈRE'?-2:0;points+=rr>=55?1:rr<=45?-1:0;points+=st.hh&&st.hl?1:st.lh&&st.ll?-1:0;let signal=points>=3?'BUY':points<=-3?'SELL':'NEUTRAL';return {tf,b,last,e20,e50,rr,aa,st,trend,points,signal,closedAt:b.at(-1).time};}
function safeText(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function card(x){return `<article class="frame"><h3>${x.tf}</h3><div class="grid"><div class="metric"><small>Dernière clôture</small><strong>${fmt(x.last)}</strong></div><div class="metric"><small>Tendance EMA</small><strong>${x.trend}</strong></div><div class="metric"><small>EMA 20 / 50</small><strong>${fmt(x.e20)} / ${fmt(x.e50)}</strong></div><div class="metric"><small>RSI 14</small><strong>${fmt(x.rr)}</strong></div><div class="metric"><small>ATR 14</small><strong>${fmt(x.aa)}</strong></div><div class="metric"><small>Structure / score</small><strong>${x.points>0?'+':''}${x.points} · ${x.signal}</strong></div><div class="metric"><small>Support récent</small><strong>${fmt(x.st.support)}</strong></div><div class="metric"><small>Résistance récente</small><strong>${fmt(x.st.resistance)}</strong></div></div><p class="muted">Bougie clôturée : ${new Date(x.closedAt).toLocaleString('fr-FR')}</p></article>`;}
async function loadPrice(){const t=await getTick();if(t){$('price').textContent=`${fmt(+t.mid)} USD`;$('freshness').textContent=`Cours en direct · âge ${Math.round(+t.quoteAgeSeconds)} s · ${t.source||'source API'}`;$('updated').textContent='Dernier tick : '+(t.timestamp?new Date(t.timestamp).toLocaleString('fr-FR'):'horodatage non fourni');return;}try{const b=await getBars('5m'),last=b.at(-1);$('price').textContent=`${fmt(last.close)} USD`;$('freshness').textContent='DERNIÈRE CLÔTURE M5 — PAS UN PRIX EN DIRECT. Signaux bloqués.';$('updated').textContent='Bougie clôturée : '+new Date(last.time).toLocaleString('fr-FR');}catch(e){$('price').textContent='Cours indisponible';$('freshness').textContent='Tick indisponible et bougies de secours non vérifiables : '+e.message;}}
function renderFailure(e){$('result').hidden=false;$('result').innerHTML=`<h2>Analyse interrompue</h2><div class="decision none">NO TRADE</div><p>${safeText(e.message)}</p><p>Aucun prix, signal ou niveau n'a été inventé. Réessaie uniquement lorsque les données sont disponibles et cohérentes.</p>`;$('status').textContent='Échec du contrôle qualité : aucun signal émis.';}
async function analyze(){const btn=$('analyze');btn.disabled=true;btn.textContent='VÉRIFICATION ET ANALYSE…';$('status').textContent='Contrôle du cours et des bougies clôturées…';$('result').hidden=false;$('result').innerHTML='<p>Contrôle de la qualité des données en cours…</p>';try{const [tick,b5,b15,b30,news]=await Promise.all([getTick(),getBars('5m'),getBars('15m'),getBars('30m'),getNews()]);
renderNews(news);const xs=[calc('M5',b5),calc('M15',b15),calc('M30',b30)];const [m5,m15,m30]=xs;const mid=tick?+tick.mid:m5.last;if(tick){const mismatch=Math.abs(m5.last-mid);const maxGap=Math.max(5*(m5.aa||0),mid*0.003);if(mismatch>maxGap)throw Error(`Incohérence prix/bougie : tick ${fmt(mid)} vs dernière clôture M5 ${fmt(m5.last)} (écart ${fmt(mismatch)}). Seuil de contrôle dépassé; vérifier la source avant tout signal.`);}
let decision='NO TRADE',why=[];const newsKnown=true;if(!tick)why.push('Tick temps réel indisponible chez le fournisseur. Affichage en mode historique sur la dernière clôture M5 ; BUY/SELL et SL/TP sont bloqués tant que le prix exécutable n’est pas vérifié.');
if(m30.signal==='BUY'&&m15.signal==='BUY'&&m5.signal==='BUY'){decision='BUY';why.push('M30, M15 et M5 sont haussiers selon le score de confluence.');}
else if(m30.signal==='SELL'&&m15.signal==='SELL'&&m5.signal==='SELL'){decision='SELL';why.push('M30, M15 et M5 sont baissiers selon le score de confluence.');}
else {why.push(`Confluence insuffisante : M30 ${m30.signal}, M15 ${m15.signal}, M5 ${m5.signal}.`);}
if(!newsKnown){decision='NO TRADE';why.push('Calendrier économique non vérifié : filtre actualités incomplet.');}
if(news.blocked.length){decision='NO TRADE';why.push('Annonce(s) américaine(s) à fort impact dans la fenêtre de sécurité : '+news.blocked.map(e=>e.title).join(', ')+'.');}
const spread=tick?(num(tick.spread)?+tick.spread:(num(tick.ask)&&num(tick.bid)?+tick.ask-+tick.bid:NaN)):NaN;if(!tick||!Number.isFinite(spread)||spread<0||spread>Math.max(1.5,(m5.aa||0)*0.2)){decision='NO TRADE';if(tick)why.push('Spread manquant ou trop élevé par rapport à la volatilité.');}
let entry=null,sl=null,tp1=null,tp2=null,tp3=null,rr='—';
if(decision!=='NO TRADE'){
  entry=decision==='BUY'?(num(tick.ask)?+tick.ask:mid):(num(tick.bid)?+tick.bid:mid);
  const atr5=m5.aa, buffer=Math.max(atr5*0.20,spread*2);
  if(!(atr5>0)||![m5.st.support,m5.st.resistance,m15.st.support,m15.st.resistance,m30.st.support,m30.st.resistance].every(Number.isFinite)){
    decision='NO TRADE';why.push('ATR ou niveaux structurels manquants : niveaux de risque refusés.');entry=null;
  } else {
    if(decision==='BUY'){
      const structuralSL=m5.st.support-buffer;
      sl=Math.min(structuralSL,entry-1.2*atr5);
      const risk=entry-sl;
      if(!(sl<entry)||!Number.isFinite(risk)||risk>2.5*atr5){decision='NO TRADE';why.push('Stop technique trop éloigné ou incohérent (> 2,5 ATR) : aucun trade.');entry=sl=tp1=tp2=tp3=null;}
      else {
        const obstacles=[m5.st.resistance,m15.st.resistance,m30.st.resistance].filter(x=>Number.isFinite(x)&&x>entry+spread).sort((a,b)=>a-b);
        const clean=obstacles.map(x=>x-buffer).filter(x=>x>entry);
        const raw=[entry+1.5*risk,entry+2*risk,entry+3*risk];
        const targets=raw.map((t,i)=>{const obstacle=clean[i];return obstacle===undefined?t:Math.min(t,obstacle);});
        if(targets[0]-entry<1.2*risk||targets[1]<=targets[0]||targets[2]<=targets[1]){decision='NO TRADE';why.push('Résistance proche : aucun ensemble de TP ne respecte les critères de rendement et d’ordre des objectifs.');entry=sl=tp1=tp2=tp3=null;}
        else {[tp1,tp2,tp3]=targets;rr=`TP1 ${((tp1-entry)/risk).toFixed(2)}R`;}
      }
    } else {
      const structuralSL=m5.st.resistance+buffer;
      sl=Math.max(structuralSL,entry+1.2*atr5);
      const risk=sl-entry;
      if(!(sl>entry)||!Number.isFinite(risk)||risk>2.5*atr5){decision='NO TRADE';why.push('Stop technique trop éloigné ou incohérent (> 2,5 ATR) : aucun trade.');entry=sl=tp1=tp2=tp3=null;}
      else {
        const obstacles=[m5.st.support,m15.st.support,m30.st.support].filter(x=>Number.isFinite(x)&&x<entry-spread).sort((a,b)=>b-a);
        const clean=obstacles.map(x=>x+buffer).filter(x=>x<entry);
        const raw=[entry-1.5*risk,entry-2*risk,entry-3*risk];
        const targets=raw.map((t,i)=>{const obstacle=clean[i];return obstacle===undefined?t:Math.max(t,obstacle);});
        if(entry-targets[0]<1.2*risk||targets[1]>=targets[0]||targets[2]>=targets[1]){decision='NO TRADE';why.push('Support proche : aucun ensemble de TP ne respecte les critères de rendement et d’ordre des objectifs.');entry=sl=tp1=tp2=tp3=null;}
        else {[tp1,tp2,tp3]=targets;rr=`TP1 ${((entry-tp1)/risk).toFixed(2)}R`;}
      }
    }
  }
}
const cls=decision==='BUY'?'buy':decision==='SELL'?'sell':'none';$('result').innerHTML=`<h2>Analyse ${VERSION}</h2><div class="warn">Signal technique expérimental, pas une probabilité de gain. Le graphique TradingView utilise OANDA:XAUUSD, tandis que les calculs utilisent le flux Biquote : les cotations peuvent différer. Le calendrier doit renvoyer des événements US à fort impact exploitables ; sinon l’analyse est bloquée. Sa disponibilité et son exhaustivité ne sont pas garanties.</div><div class="decision ${cls}">${decision}</div><p>${why.map(safeText).join('<br>')}</p><div class="grid"><div class="metric"><small>Cours mid</small><strong>${fmt(mid)} USD</strong></div><div class="metric"><small>Spread</small><strong>${fmt(spread)}</strong></div><div class="metric"><small>Entrée indicative</small><strong>${fmt(entry)}</strong></div><div class="metric"><small>Stop-loss</small><strong>${fmt(sl)}</strong></div><div class="metric"><small>TP1</small><strong>${fmt(tp1)}</strong></div><div class="metric"><small>TP2 / TP3</small><strong>${fmt(tp2)} / ${fmt(tp3)}</strong></div><div class="metric"><small>Rendement/risque TP1</small><strong>${rr}</strong></div><div class="metric"><small>Qualité données</small><strong>Contrôles internes réussis</strong></div><div class="metric"><small>Filtre actualités</small><strong>${news.blocked.length?'Blocage actif':'Calendrier reçu'}</strong></div></div><h2>Analyse par timeframe</h2><div class="frames">${xs.map(card).join('')}</div><h2>Contrôles et limites</h2><ul><li>Prix comparé à la dernière clôture M5.</li><li>Uniquement les bougies marquées clôturées sont utilisées.</li><li>Le spread est vérifié avant toute entrée.</li><li>SL limité à 2,5 ATR ; TP ajustés aux obstacles structurels M5/M15/M30. Si le rendement minimal ou l’ordre des objectifs n’est pas respecté, le signal est rétrogradé en NO TRADE.</li><li>Calendrier US haute importance vérifié au moment de l’analyse; blocage ±${NEWS_BLOCK_BEFORE_MIN}/${NEWS_BLOCK_AFTER_MIN} min autour des annonces connues.</li><li>La source peut différer du broker MT5.</li></ul>`;$('status').textContent=`${VERSION} · ${decision} · données, spread et calendrier contrôlés`;  $('price').textContent=`${fmt(mid)} USD`;$('freshness').textContent=tick?`Âge du tick : ${Math.round(+tick.quoteAgeSeconds)} s · ${tick.source||'API'}`:'Mode historique : dernière clôture M5 uniquement. Aucun signal exécutable.';$('updated').textContent='Analyse : '+new Date().toLocaleString('fr-FR');}catch(e){renderFailure(e);}finally{btn.disabled=false;btn.textContent='ANALYSER XAUUSD';}}
$('analyze').addEventListener('click',analyze);loadPrice();setInterval(loadPrice,60000);if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js?v=8.3.0').catch(()=>{});
