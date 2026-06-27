/*! AgroPrix institution.js - generated from institution.js.src on 2026-06-27 - DO NOT EDIT; edit the .src file and run `python build_js.py` */
(function(AP){'use strict';var DIM_LABELS={profil_agricole:"Profil d'exploitation",sante_climat:"Santé & résilience climatique",capacite_financiere:"Capacité financière",activite_commerciale:"Activité commerciale vérifiable"};var STATUS_LABELS={pending:'En attente',reviewing:'En cours',accepted:'Accepté',refused:'Refusé'};var STATUS_COLORS={pending:'#92400E',reviewing:'#1E40AF',accepted:'#2D6A4F',refused:'#b91c1c'};var _state={tab:'applicants',me:null};function apiBase(){return(AP.API_BASE||'').replace(/\/$/,'');}
function apiFetch(path,opts){opts=opts||{};opts.credentials='include';opts.headers=Object.assign({'Content-Type':'application/json'},opts.headers||{});return fetch(apiBase()+'/api/institution-portal'+path,opts).then(function(r){if(r.status===401)throw{code:401};if(r.status===403)throw{code:403};return r.json().then(function(body){if(!r.ok)throw{code:r.status,detail:(body&&body.detail)||'Erreur'};return body;});});}
function icons(){if(window.lucide)try{window.lucide.createIcons();}catch(e){}}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fcfa(n){return(n==null)?'—':Number(n).toLocaleString('fr-FR')+' FCFA';}
function container(){return document.getElementById('institutionContent');}
function applyRole(user){var isInst=user&&user.role==='institution';var nav=document.getElementById('navInstitution');if(nav)nav.style.display=isInst?'':'none';if(isInst&&window.showView){try{window.showView('institution',nav);}catch(e){}}}
function init(){var c=container();if(!c)return;c.innerHTML='<div style="text-align:center;padding:32px;color:var(--text-light);">Chargement…</div>';apiFetch('/me').then(function(me){_state.me=me;render();}).catch(function(err){renderError(err);});}
function renderError(err){var c=container();if(!c)return;var msg=(err&&err.code===401)?"Connectez-vous avec un compte institution pour accéder à cet espace.":(err&&err.code===403)?"Cet espace est réservé aux comptes institution (banque, microfinance, assureur).":"Espace institution indisponible : "+((err&&err.detail)||'erreur');c.innerHTML='<div class="card" style="padding:24px;text-align:center;">'
+'<div style="font-size:40px;margin-bottom:8px;"><i data-lucide="landmark" class="lc"></i></div>'
+'<p style="color:var(--text-light);">'+esc(msg)+'</p></div>';icons();}
function render(){var c=container();if(!c)return;var inst=(_state.me&&_state.me.institution)||{};var acc=(_state.me&&_state.me.account)||{};var name=inst.institution_name||acc.name||'Institution';var tabs=[['applicants','Demandeurs','users'],['criteria','Critères','sliders-horizontal'],['financials','Données financières','upload'],['account','Mon compte','building-2']];var tabBar=tabs.map(function(t){var active=_state.tab===t[0];return'<button data-action="inst-tab" data-tab="'+t[0]+'" '
+'style="flex:1;min-width:120px;padding:10px 8px;border:none;border-bottom:3px solid '
+(active?'var(--primary)':'transparent')+';background:'+(active?'#F0FDF4':'transparent')
+';color:'+(active?'var(--primary)':'var(--text-light)')+';font-weight:'+(active?'700':'500')
+';font-size:12px;cursor:pointer;border-radius:8px 8px 0 0;">'
+'<i data-lucide="'+t[2]+'" class="lc" style="width:14px;height:14px;vertical-align:-2px;"></i> '+t[1]+'</button>';}).join('');var html='<div style="margin-bottom:8px;">'
+'<h3 style="margin:0;color:var(--primary);"><i data-lucide="landmark" class="lc"></i> '+esc(name)+'</h3>'
+'<p style="font-size:12px;color:var(--text-light);margin:2px 0 0;">Espace institution — vos demandeurs, vos critères, vos données.</p>'
+'</div>'
+'<div style="display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--border);margin-bottom:14px;">'+tabBar+'</div>'
+'<div id="instTabContent"></div>';c.innerHTML=html;icons();renderTab();}
function renderTab(){var el=document.getElementById('instTabContent');if(!el)return;if(_state.tab==='applicants')return renderApplicants(el);if(_state.tab==='criteria')return renderCriteria(el);if(_state.tab==='financials')return renderFinancials(el);if(_state.tab==='account')return renderAccount(el);}
function renderApplicants(el){el.innerHTML='<div style="text-align:center;padding:24px;color:var(--text-light);">Chargement des demandeurs…</div>';apiFetch('/applicants').then(function(res){var list=res.applicants||[];if(!list.length){el.innerHTML='<div class="card" style="padding:24px;text-align:center;color:var(--text-light);">'
+'<i data-lucide="inbox" class="lc" style="width:32px;height:32px;"></i>'
+'<p style="margin-top:8px;">Aucun producteur n\'a encore demandé de financement chez vous.</p>'
+'<p style="font-size:11px;">Les demandeurs apparaissent ici dès qu\'un producteur vous sollicite (opt-in).</p></div>';icons();return;}
el.innerHTML='<div style="font-size:12px;color:var(--text-light);margin-bottom:8px;">'+list.length+' demandeur(s)</div>'
+list.map(applicantCard).join('');icons();}).catch(function(err){el.innerHTML=errorBox(err);icons();});}
function applicantCard(a){var sc=a.score||{};var elig=sc.eligible;var badgeColor=(elig===true)?'#2D6A4F':(elig===false)?'#b91c1c':'#94a3b8';var st=a.status||'pending';return'<div class="card" style="padding:14px;margin-bottom:10px;cursor:pointer;" '
+'data-action="inst-applicant-detail" data-uid="'+a.user_id+'">'
+'<div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">'
+'<div><div style="font-weight:700;"><i data-lucide="user" class="lc"></i> '+esc(a.name||('#'+a.user_id))+'</div>'
+'<div style="font-size:11px;color:var(--text-light);">'+esc(a.country||'—')
+' · demandé le '+esc((a.applied_at||'').substring(0,10))+'</div>'
+'<span style="display:inline-block;margin-top:4px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;'
+'background:'+(STATUS_COLORS[st]||'#666')+'22;color:'+(STATUS_COLORS[st]||'#666')+';">'
+(STATUS_LABELS[st]||st)+'</span></div>'
+'<div style="text-align:right;">'
+'<div style="font-size:22px;font-weight:800;color:'+badgeColor+';">'+(sc.total_score!=null?sc.total_score:'—')+'</div>'
+'<div style="font-size:9px;color:var(--text-light);">/1000</div>'
+'<div style="font-size:10px;font-weight:700;color:'+badgeColor+';">'
+(elig===true?'✓ Éligible':elig===false?'✗ Non éligible':'—')+'</div>'
+'</div></div></div>';}
function showApplicantDetail(uid){var el=document.getElementById('instTabContent');if(!el)return;el.innerHTML='<div style="text-align:center;padding:24px;color:var(--text-light);">Chargement du dossier…</div>';apiFetch('/applicants/'+uid).then(function(d){var sc=d.score||{};var dims=sc.dimensions||{};var prof=d.profile||{};var app=d.application||{};var st=app.status||'pending';var dimRows=Object.keys(DIM_LABELS).map(function(k){var dd=dims[k]||{};if(dd.excluded){return'<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">'
+'<span style="font-size:12px;">'+DIM_LABELS[k]+'</span>'
+'<span style="font-size:11px;color:#94a3b8;font-style:italic;">Non fourni</span></div>';}
var raw=dd.raw!=null?dd.raw:'—';var col=(dd.passes_min===false)?'#b91c1c':'#2D6A4F';return'<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">'
+'<span style="font-size:12px;">'+DIM_LABELS[k]+'<br><span style="font-size:9px;color:var(--text-light);">poids '+Math.round((dd.weight||0)*100)+'%</span></span>'
+'<span style="font-weight:700;color:'+col+';">'+raw+'<span style="font-size:9px;color:#999;">/1000</span></span></div>';}).join('');var statusSelect='<select data-action-change="inst-status-change" data-uid="'+uid+'" '
+'style="padding:8px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:12px;">'
+['pending','reviewing','accepted','refused'].map(function(s){return'<option value="'+s+'"'+(s===st?' selected':'')+'>'+STATUS_LABELS[s]+'</option>';}).join('')+'</select>';el.innerHTML='<button class="action-btn" data-action="inst-tab" data-tab="applicants" style="font-size:12px;margin-bottom:12px;">← Retour aux demandeurs</button>'
+'<div class="card" style="padding:16px;margin-bottom:12px;border-top:4px solid '+(sc.eligible?'#2D6A4F':'#b91c1c')+';">'
+'<div style="display:flex;justify-content:space-between;align-items:center;">'
+'<div><h3 style="margin:0;"><i data-lucide="user" class="lc"></i> '+esc(prof.name||('#'+uid))+'</h3>'
+'<div style="font-size:11px;color:var(--text-light);">'+esc(prof.country||'—')
+(prof.superficie?' · '+esc(prof.superficie)+' ha':'')
+(prof.type_exploitation?' · '+esc(prof.type_exploitation):'')+'</div></div>'
+'<div style="text-align:right;"><div style="font-size:30px;font-weight:900;color:'+(sc.eligible?'#2D6A4F':'#b91c1c')+';">'+(sc.total_score!=null?sc.total_score:'—')+'</div>'
+'<div style="font-size:10px;color:var(--text-light);">/1000 · seuil '+(sc.min_total_score!=null?sc.min_total_score:'—')+'</div></div></div>'
+'<div style="margin-top:8px;display:flex;gap:16px;flex-wrap:wrap;font-size:12px;">'
+'<span><b>Éligibilité :</b> '+(sc.eligible?'<span style="color:#2D6A4F;font-weight:700;">✓ Éligible</span>':'<span style="color:#b91c1c;font-weight:700;">✗ Non éligible</span>')+'</span>'
+'<span><b>Prêt max :</b> '+fcfa(sc.max_loan_fcfa)+'</span></div></div>'
+'<div class="card" style="padding:16px;margin-bottom:12px;">'
+'<div class="card-title"><span class="icon"><i data-lucide="layout-grid" class="lc"></i></span> Détail du score (4 blocs)</div>'
+dimRows+'</div>'
+(app.message?'<div class="card" style="padding:14px;margin-bottom:12px;"><div style="font-size:11px;color:var(--text-light);">Message du producteur</div><div style="font-size:13px;">'+esc(app.message)+'</div></div>':'')
+'<div class="card" style="padding:16px;"><div class="card-title"><span class="icon"><i data-lucide="check-circle" class="lc"></i></span> Statut de la demande</div>'
+'<div style="display:flex;align-items:center;gap:10px;">'+statusSelect
+'<span style="font-size:11px;color:var(--text-light);">demandé le '+esc((app.applied_at||'').substring(0,10))+'</span></div>'
+'<p style="font-size:11px;color:var(--text-light);margin-top:10px;font-style:italic;">Indicateur de profilage — la décision de financement reste à l\'institution.</p></div>';icons();}).catch(function(err){el.innerHTML=errorBox(err);icons();});}
function setStatus(uid,status){apiFetch('/applicants/'+uid,{method:'PATCH',body:JSON.stringify({status:status})}).then(function(){}).catch(function(err){alert('Mise à jour du statut impossible : '+((err&&err.detail)||'erreur'));});}
function renderCriteria(el){var crit=((_state.me&&_state.me.institution&&_state.me.institution.criteria)||{});var dims=crit.dimensions||{};function dimInput(k){var w=(dims[k]&&dims[k].weight!=null)?dims[k].weight:'';var m=(dims[k]&&dims[k].min_score!=null)?dims[k].min_score:'';return'<div style="display:grid;grid-template-columns:1fr 90px 90px;gap:8px;align-items:center;margin-bottom:8px;">'
+'<label style="font-size:12px;">'+DIM_LABELS[k]+'</label>'
+'<input type="number" id="crit_w_'+k+'" step="0.05" min="0" max="1" value="'+w+'" placeholder="poids" style="padding:8px;border:1px solid var(--border);border-radius:8px;font-family:inherit;">'
+'<input type="number" id="crit_m_'+k+'" step="10" min="0" max="1000" value="'+m+'" placeholder="seuil" style="padding:8px;border:1px solid var(--border);border-radius:8px;font-family:inherit;">'
+'</div>';}
el.innerHTML='<div class="card" style="padding:16px;">'
+'<div class="card-title"><span class="icon"><i data-lucide="sliders-horizontal" class="lc"></i></span> Vos critères de scoring</div>'
+'<p style="font-size:11px;color:var(--text-light);margin-bottom:10px;">Pondérez les 4 blocs (poids 0–1, renormalisés) et fixez un seuil minimal par bloc. Le score est recalculé pour chaque demandeur avec vos critères.</p>'
+'<div style="display:grid;grid-template-columns:1fr 90px 90px;gap:8px;font-size:10px;color:var(--text-light);font-weight:700;margin-bottom:4px;"><span>Bloc</span><span>Poids</span><span>Seuil mini</span></div>'
+Object.keys(DIM_LABELS).map(dimInput).join('')
+'<hr style="border:none;border-top:1px solid var(--border);margin:12px 0;">'
+'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
+'<div><label style="font-size:12px;">Score total minimum</label><input type="number" id="crit_min_total" min="0" max="1000" value="'+(crit.min_total_score!=null?crit.min_total_score:500)+'" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;font-family:inherit;box-sizing:border-box;"></div>'
+'<div><label style="font-size:12px;">Prêt maximum (FCFA)</label><input type="number" id="crit_max_loan" min="0" step="50000" value="'+(crit.max_loan_fcfa!=null?crit.max_loan_fcfa:'')+'" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;font-family:inherit;box-sizing:border-box;"></div>'
+'</div>'
+'<button class="btn-analyse" data-action="inst-save-criteria" style="width:100%;margin-top:14px;padding:12px;"><i data-lucide="save" class="lc"></i> Enregistrer mes critères</button>'
+'<div id="instCriteriaMsg" style="font-size:12px;margin-top:8px;"></div>'
+'</div>';icons();}
function saveCriteria(){var dims={};Object.keys(DIM_LABELS).forEach(function(k){var w=parseFloat((document.getElementById('crit_w_'+k)||{}).value);var m=parseInt((document.getElementById('crit_m_'+k)||{}).value,10);dims[k]={weight:isNaN(w)?0:w,min_score:isNaN(m)?0:m};});var minTotal=parseInt((document.getElementById('crit_min_total')||{}).value,10);var maxLoan=parseInt((document.getElementById('crit_max_loan')||{}).value,10);var criteria={dimensions:dims,min_total_score:isNaN(minTotal)?500:minTotal};if(!isNaN(maxLoan))criteria.max_loan_fcfa=maxLoan;var msg=document.getElementById('instCriteriaMsg');if(msg)msg.textContent='Enregistrement…';apiFetch('/me/criteria',{method:'PUT',body:JSON.stringify({criteria:criteria})}).then(function(){if(_state.me&&_state.me.institution)_state.me.institution.criteria=criteria;if(msg){msg.style.color='#2D6A4F';msg.textContent='✓ Critères enregistrés.';}}).catch(function(err){if(msg){msg.style.color='#b91c1c';msg.textContent='Erreur : '+((err&&err.detail)||'échec');}});}
function renderFinancials(el){el.innerHTML='<div class="card" style="padding:16px;">'
+'<div class="card-title"><span class="icon"><i data-lucide="upload" class="lc"></i></span> Import des données financières (CSV)</div>'
+'<p style="font-size:11px;color:var(--text-light);margin-bottom:10px;">Alimente le bloc « Capacité financière ». Collez votre CSV (en-têtes en 1ère ligne) et indiquez à quelles colonnes correspondent l\'identifiant du client et ses scores. Les producteurs sont reliés par email, téléphone ou id AgroPrix.</p>'
+'<label style="font-size:12px;font-weight:600;">CSV</label>'
+'<textarea id="fin_csv" rows="6" placeholder="email,Score,Remboursement&#10;jean@ex.com,720,80" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;font-family:monospace;font-size:12px;box-sizing:border-box;margin-bottom:10px;"></textarea>'
+'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">'
+'<div><label style="font-size:12px;">Relier par</label><select id="fin_keyfield" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;font-family:inherit;"><option value="email">Email</option><option value="phone">Téléphone</option><option value="id">ID AgroPrix</option></select></div>'
+'<div><label style="font-size:12px;">Colonne identifiant</label><input id="fin_keycol" placeholder="ex: email" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;font-family:inherit;box-sizing:border-box;"></div>'
+'</div>'
+'<div style="font-size:11px;color:var(--text-light);font-weight:700;margin-bottom:4px;">Colonnes de score (laisser vide si absent)</div>'
+'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
+finColInput('score','Score global')+finColInput('repayment_score','Remboursement')
+finColInput('income_score','Revenus')+finColInput('debt_score','Endettement')
+finColInput('collateral_score','Garanties')+'</div>'
+'<label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-top:10px;"><input type="checkbox" id="fin_replace"> Remplacer les données existantes</label>'
+'<button class="btn-analyse" data-action="inst-import-financials" style="width:100%;margin-top:12px;padding:12px;"><i data-lucide="upload" class="lc"></i> Importer</button>'
+'<div id="instFinMsg" style="font-size:12px;margin-top:8px;"></div>'
+'</div>';icons();}
function finColInput(key,label){return'<div><label style="font-size:11px;">'+label+'</label>'
+'<input id="fin_col_'+key+'" placeholder="nom de colonne" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:8px;font-family:inherit;box-sizing:border-box;"></div>';}
function importFinancials(){var csv=(document.getElementById('fin_csv')||{}).value||'';var keyField=(document.getElementById('fin_keyfield')||{}).value||'email';var keyCol=(document.getElementById('fin_keycol')||{}).value||'';var replace=!!(document.getElementById('fin_replace')||{}).checked;var msg=document.getElementById('instFinMsg');if(!csv.trim()||!keyCol.trim()){if(msg){msg.style.color='#b91c1c';msg.textContent='CSV et colonne identifiant requis.';}
return;}
var columns={};['score','repayment_score','income_score','debt_score','collateral_score'].forEach(function(k){var v=(document.getElementById('fin_col_'+k)||{}).value;if(v&&v.trim())columns[k]=v.trim();});var mapping={user_key_field:keyField,user_key_column:keyCol.trim(),columns:columns};if(msg){msg.style.color='var(--text-light)';msg.textContent='Import en cours…';}
apiFetch('/me/financials',{method:'POST',body:JSON.stringify({csv_text:csv,mapping:mapping,replace:replace})}).then(function(res){if(msg){msg.style.color='#2D6A4F';msg.textContent='✓ Import terminé'+(res&&res.imported!=null?' : '+res.imported+' ligne(s).':'.');}}).catch(function(err){if(msg){msg.style.color='#b91c1c';msg.textContent='Erreur : '+((err&&err.detail)||'échec');}});}
function renderAccount(el){var inst=(_state.me&&_state.me.institution)||{};var acc=(_state.me&&_state.me.account)||{};el.innerHTML='<div class="card" style="padding:16px;">'
+'<div class="card-title"><span class="icon"><i data-lucide="building-2" class="lc"></i></span> Mon compte institution</div>'
+row('Institution',inst.institution_name||inst.institution_slug||'—')
+row('Type',inst.institution_type||'—')
+row('Identifiant (slug)',inst.institution_slug||'—')
+row('Compte',acc.name||'—')
+row('Email',acc.email||'—')
+'<button class="action-btn" data-action="logout" style="width:100%;margin-top:14px;color:#b91c1c;border-color:#b91c1c;"><i data-lucide="log-out" class="lc"></i> Se déconnecter</button>'
+'</div>';icons();}
function row(k,v){return'<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">'
+'<span style="font-size:12px;color:var(--text-light);">'+k+'</span>'
+'<span style="font-size:12px;font-weight:600;">'+esc(v)+'</span></div>';}
function errorBox(err){return'<div class="card" style="padding:16px;text-align:center;color:#b91c1c;">'
+((err&&err.code===401)?'Session expirée — reconnectez-vous.':'Erreur : '+esc((err&&err.detail)||'inconnue'))+'</div>';}
function renderProducerApply(el){if(!el)return;el.innerHTML='<div class="card" style="padding:14px;"><div style="color:var(--text-light);font-size:12px;">Chargement des institutions…</div></div>';var base=apiBase();Promise.all([fetch(base+'/api/scoring/institutions',{credentials:'include'}).then(function(r){return r.ok?r.json():{institutions:[]};}),fetch(base+'/api/institution-portal/my-applications',{credentials:'include'}).then(function(r){return r.ok?r.json():{applications:[]};}).catch(function(){return{applications:[]};})]).then(function(res){var insts=(res[0]&&res[0].institutions)||[];var apps={};((res[1]&&res[1].applications)||[]).forEach(function(a){apps[a.institution_slug]=a.status;});if(!insts.length){el.innerHTML='';return;}
var rows=insts.map(function(i){var st=apps[i.institution_slug];var right=st?'<span style="font-size:11px;font-weight:700;color:'+(STATUS_COLORS[st]||'#666')+';">'+(STATUS_LABELS[st]||st)+'</span>':'<button data-action="inst-apply" data-slug="'+esc(i.institution_slug)+'" style="padding:6px 12px;border:1px solid var(--primary);background:var(--primary);color:#fff;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">Demander</button>';return'<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);gap:8px;">'
+'<div><div style="font-size:13px;font-weight:600;">'+esc(i.institution_name||i.institution_slug)+'</div>'
+'<div style="font-size:10px;color:var(--text-light);">'+esc(i.institution_type||'')+'</div></div>'
+right+'</div>';}).join('');el.innerHTML='<div class="card" style="padding:16px;margin-bottom:16px;background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border:1px solid #1E40AF22;">'
+'<div class="card-title" style="color:#1E40AF;"><span class="icon"><i data-lucide="handshake" class="lc"></i></span> Demander un financement</div>'
+'<p style="font-size:11px;color:#1E3A8A;margin-bottom:8px;">Sollicitez une institution partenaire : elle pourra consulter votre profil producteur et votre score. Vous gardez le contrôle (opt-in).</p>'
+rows+'</div>';icons();}).catch(function(){el.innerHTML='';});}
function applyToInstitution(slug,el){if(el){el.disabled=true;el.textContent='Envoi…';}
fetch(apiBase()+'/api/institution-portal/apply',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({institution_slug:slug})}).then(function(r){if(r.status===401){alert('Connectez-vous pour demander un financement.');return;}
if(!r.ok)return r.json().then(function(b){throw new Error((b&&b.detail)||'Erreur');});var box=document.getElementById('finApplyBox');if(box)renderProducerApply(box);}).catch(function(e){if(el){el.disabled=false;el.textContent='Demander';}
alert('Demande impossible : '+(e&&e.message?e.message:'erreur'));});}
AP.institution={init:init,applyRole:applyRole,renderProducerApply:renderProducerApply};AP.actions=AP.actions||{};AP.actions['inst-tab']=function(el){_state.tab=el.getAttribute('data-tab');renderTab();};AP.actions['inst-applicant-detail']=function(el){showApplicantDetail(parseInt(el.getAttribute('data-uid'),10));};AP.actions['inst-status-change']=function(el){setStatus(parseInt(el.getAttribute('data-uid'),10),el.value);};AP.actions['inst-save-criteria']=function(){saveCriteria();};AP.actions['inst-import-financials']=function(){importFinancials();};AP.actions['inst-apply']=function(el){applyToInstitution(el.getAttribute('data-slug'),el);};})(window.AgroPrix);