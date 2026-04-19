/*! AgroPrix status.js - generated from status.js.src on 2026-04-19 - DO NOT EDIT; edit the .src file and run `python build_js.py` */
(function(AP){'use strict';var UR_API='https://api.uptimerobot.com/v2/getMonitors';var STATUS_LABELS={0:{txt:'En pause',bg:'#E5E7EB',fg:'#374151'},1:{txt:'En attente',bg:'#FEF3C7',fg:'#92400E'},2:{txt:'En ligne',bg:'#D1FAE5',fg:'#065F46'},8:{txt:'Instable',bg:'#FED7AA',fg:'#9A3412'},9:{txt:'Hors ligne',bg:'#FEE2E2',fg:'#991B1B'},};function fetchStatus(){if(!AP.UPTIMEROBOT_READONLY_KEY){return Promise.resolve(null);}
var body='api_key='+encodeURIComponent(AP.UPTIMEROBOT_READONLY_KEY)
+'&format=json&logs=0&response_times=0';return fetch(UR_API,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Cache-Control':'no-cache'},body:body}).then(function(r){return r.ok?r.json():null;}).then(function(data){if(!data||data.stat!=='ok'||!Array.isArray(data.monitors))return null;return data.monitors.map(function(m){return{name:m.friendly_name,url:m.url,status:m.status,uptime_ratio:m.all_time_uptime_ratio};});}).catch(function(){return null;});}
function renderBadge(container){if(!container)return;if(!AP.UPTIMEROBOT_READONLY_KEY){container.style.display='none';return;}
container.innerHTML='<div style="font-size:12px;opacity:0.6">Statut des services...</div>';fetchStatus().then(function(monitors){if(!monitors){container.innerHTML='<div style="font-size:12px;opacity:0.6">Statut indisponible</div>';return;}
var worst=Math.max.apply(null,monitors.map(function(m){return m.status;}));var label=STATUS_LABELS[worst]||STATUS_LABELS[1];var linkPart=AP.UPTIMEROBOT_PUBLIC_STATUS_URL?' <a href="'+AP.UPTIMEROBOT_PUBLIC_STATUS_URL+'" target="_blank" rel="noopener"'
+' style="margin-left:8px;font-size:11px;color:inherit;text-decoration:underline;opacity:0.7">voir details</a>':'';container.innerHTML='<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;'
+'border-radius:999px;background:'+label.bg+';color:'+label.fg+';'
+'font-size:12px;font-weight:600">'
+'<span style="width:8px;height:8px;border-radius:50%;background:'+label.fg+';display:inline-block"></span>'
+'Services: '+label.txt
+'</span>'+linkPart;});}
function renderDetail(container){if(!container)return;if(!AP.UPTIMEROBOT_READONLY_KEY){container.innerHTML='<div style="padding:16px;border-radius:12px;background:#F3F4F6;color:#4B5563;font-size:14px">'
+'Monitoring public non configure. L\'administrateur peut renseigner '
+'<code>UPTIMEROBOT_READONLY_KEY</code> dans <code>config.js</code> pour afficher le statut live.'
+'</div>';return;}
container.innerHTML='<div style="opacity:0.6">Chargement du statut...</div>';fetchStatus().then(function(monitors){if(!monitors){container.innerHTML='<div style="padding:16px;border-radius:12px;background:#FEF3C7;color:#92400E;font-size:14px">'
+'Impossible de joindre UptimeRobot. Le service est probablement OK (on verifie toutes les 5 min cote externe), '
+'mais le widget ne peut pas confirmer.</div>';return;}
if(!monitors.length){container.innerHTML='<div style="padding:16px;border-radius:12px;background:#F3F4F6;color:#4B5563;font-size:14px">'
+'Aucun monitor configure chez UptimeRobot. Ajouter au moins un monitor '
+'(ex: https://web-production-46fb2.up.railway.app/api/ping) pour alimenter ce widget.</div>';return;}
var rows=monitors.map(function(m){var label=STATUS_LABELS[m.status]||STATUS_LABELS[1];var pct=m.uptime_ratio?parseFloat(m.uptime_ratio).toFixed(2):'—';return('<div style="display:flex;justify-content:space-between;align-items:center;'
+'padding:12px;border-bottom:1px solid #E5E7EB">'
+'<div>'
+'<div style="font-weight:600;font-size:14px">'+m.name+'</div>'
+'<div style="font-size:12px;color:#6B7280;word-break:break-all">'+m.url+'</div>'
+'</div>'
+'<div style="text-align:right">'
+'<span style="padding:4px 10px;border-radius:999px;background:'+label.bg+';color:'+label.fg+';font-size:12px;font-weight:600">'
+label.txt
+'</span>'
+'<div style="font-size:11px;color:#6B7280;margin-top:4px">Uptime (total): '+pct+'%</div>'
+'</div>'
+'</div>');}).join('');var linkFooter=AP.UPTIMEROBOT_PUBLIC_STATUS_URL?'<div style="padding:12px;font-size:12px"><a href="'+AP.UPTIMEROBOT_PUBLIC_STATUS_URL
+'" target="_blank" rel="noopener">Ouvrir la status page publique</a></div>':'';container.innerHTML='<div style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;background:#fff">'
+rows+linkFooter
+'</div>';});}
AP.status={fetchStatus:fetchStatus,renderBadge:renderBadge,renderDetail:renderDetail};})(window.AgroPrix);