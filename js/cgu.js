/*! AgroPrix cgu.js - generated from cgu.js.src on 2026-04-18 - DO NOT EDIT; edit the .src file and run `python build_js.py` */
(function(AP){'use strict';var CGU_KEY='agroprix_cgu_accepted';var PROFILE_KEY='agroprix_farmer_profile';var PROFILE_HISTORY_KEY='agroprix_profile_history';var CGU_INTERVAL_DAYS=90;var CGU_VERSION='1.0.0';function needsRevalidation(){var cguData=getCguData();if(!cguData||!cguData.acceptedAt)return true;var daysSince=Math.floor((Date.now()-new Date(cguData.acceptedAt).getTime())/86400000);return daysSince>=CGU_INTERVAL_DAYS||cguData.version!==CGU_VERSION;}
function getCguData(){try{return JSON.parse(localStorage.getItem(CGU_KEY));}catch(e){return null;}}
function getProfile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY))||{};}catch(e){return{};}}
function showCguModal(){if(document.getElementById('cguModal'))return;var profile=getProfile();var cguData=getCguData();var isFirstTime=!cguData;var cultures=AP.cultureNames||{};var countries=AP.countryMeta||{};var modal=document.createElement('div');modal.id='cguModal';modal.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';var title=isFirstTime?'Bienvenue sur AgroPrix!':'Mise a jour de vos informations';var subtitle=isFirstTime?'Completez votre profil pour acceder a toutes les fonctionnalites.':'Pour vous offrir un meilleur service, merci de verifier vos informations (tous les '+CGU_INTERVAL_DAYS+' jours).';var html='<div style="background:linear-gradient(180deg,#fff,#FAFCFB);border-radius:16px;max-width:480px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">'
+'<div style="padding:20px 20px 12px;background:linear-gradient(135deg,#2D6A4F,#40916c);border-radius:16px 16px 0 0;">'
+'<h2 style="margin:0;color:#fff;font-size:18px;">'+title+'</h2>'
+'<p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">'+subtitle+'</p>'
+'</div>'
+'<div style="padding:20px;">';html+='<div style="margin-bottom:12px;">'
+'<label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px;">Pays</label>'
+'<select id="cguCountry" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-family:inherit;">';Object.keys(countries).forEach(function(k){var sel=(profile.country===k)?' selected':'';html+='<option value="'+k+'"'+sel+'>'+countries[k].flag+' '+countries[k].name+'</option>';});html+='</select></div>';html+='<div style="margin-bottom:12px;">'
+'<label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px;">Cultures pratiquees</label>'
+'<div id="cguCrops" style="display:flex;flex-wrap:wrap;gap:4px;">';Object.keys(cultures).forEach(function(c){var active=profile.crops&&profile.crops.indexOf(c)>=0;html+='<button type="button" data-crop="'+c+'" onclick="AgroPrix.cgu.toggleCrop(this,\''+c+'\')" '
+'style="padding:4px 10px;border-radius:14px;font-size:11px;font-weight:600;border:1px solid '+(active?'#2D6A4F':'#ddd')+';background:'+(active?'#2D6A4F':'#fff')+';color:'+(active?'#fff':'#666')+';cursor:pointer;">'
+cultures[c]+'</button>';});html+='</div></div>';html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">'
+'<div><label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px;">Superficie (ha)</label>'
+'<input type="number" id="cguFarmSize" value="'+(profile.farmSize||'')+'" placeholder="Ex: 2.5" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-family:inherit;" step="0.1" min="0"></div>'
+'<div><label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px;">Genre</label>'
+'<select id="cguGender" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-family:inherit;">'
+'<option value="">—</option><option value="M"'+(profile.gender==='M'?' selected':'')+'>Homme</option><option value="F"'+(profile.gender==='F'?' selected':'')+'>Femme</option>'
+'</select></div></div>';html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">'
+'<div><label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px;">Age</label>'
+'<input type="number" id="cguAge" value="'+(profile.age||'')+'" placeholder="30" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-family:inherit;" min="15" max="99"></div>'
+'<div><label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px;">Experience (ans)</label>'
+'<input type="number" id="cguExperience" value="'+(profile.experience||'')+'" placeholder="5" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-family:inherit;" min="0"></div></div>';html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">'
+'<div><label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px;">Type exploitation</label>'
+'<select id="cguFarmerType" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-family:inherit;">'
+'<option value="individual"'+(profile.farmerType==='individual'?' selected':'')+'>Individuel</option>'
+'<option value="cooperative"'+(profile.farmerType==='cooperative'?' selected':'')+'>Cooperative</option>'
+'<option value="sme"'+(profile.farmerType==='sme'?' selected':'')+'>PME</option>'
+'</select></div>'
+'<div style="display:flex;align-items:end;padding-bottom:4px;">'
+'<label style="font-size:12px;font-weight:600;color:#333;display:flex;align-items:center;gap:6px;">'
+'<input type="checkbox" id="cguCoop"'+(profile.isCoop?' checked':'')+' style="width:16px;height:16px;"> Membre cooperative</label>'
+'</div></div>';html+='<div style="margin:16px 0;padding:12px;background:#f8f9fa;border-radius:8px;max-height:120px;overflow-y:auto;font-size:11px;color:#666;line-height:1.5;">'
+'<strong>Conditions Generales d\'Utilisation — v'+CGU_VERSION+'</strong><br><br>'
+'En utilisant AgroPrix, vous acceptez que vos donnees soient collectees, archivees et traitees pour :<br>'
+'• Vous fournir des analyses de prix et conseils personnalises<br>'
+'• Ameliorer nos services et algorithmes de recommandation<br>'
+'• Generer des statistiques anonymisees sur les marches agricoles<br>'
+'• Faciliter votre acces aux financements et services adaptes<br><br>'
+'Vos donnees personnelles ne sont jamais vendues a des tiers individuellement. '
+'Seules des donnees agregees et anonymisees peuvent etre partagees avec nos partenaires '
+'(institutions financieres, organismes de developpement) pour ameliorer l\'acces aux services agricoles.<br><br>'
+'Vous pouvez demander la suppression de vos donnees a tout moment via les parametres.'
+'</div>';html+='<label style="display:flex;align-items:start;gap:8px;margin-bottom:16px;cursor:pointer;">'
+'<input type="checkbox" id="cguAccept" style="width:18px;height:18px;margin-top:2px;">'
+'<span style="font-size:12px;color:#333;">J\'accepte les Conditions Generales d\'Utilisation et la collecte de mes donnees telles que decrites ci-dessus.</span>'
+'</label>';html+='<button id="cguSubmitBtn" onclick="AgroPrix.cgu.accept()" style="width:100%;padding:14px;background:linear-gradient(135deg,#2D6A4F,#40916c);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;opacity:0.5;" disabled>'
+'Valider et continuer</button>';html+='</div></div>';modal.innerHTML=html;document.body.appendChild(modal);var acceptBox=document.getElementById('cguAccept');var submitBtn=document.getElementById('cguSubmitBtn');if(acceptBox&&submitBtn){acceptBox.addEventListener('change',function(){submitBtn.disabled=!acceptBox.checked;submitBtn.style.opacity=acceptBox.checked?'1':'0.5';});}
modal._selectedCrops=(profile.crops||[]).slice();}
function toggleCrop(btn,crop){var modal=document.getElementById('cguModal');if(!modal)return;var crops=modal._selectedCrops||[];var idx=crops.indexOf(crop);if(idx>=0){crops.splice(idx,1);}else{crops.push(crop);}
modal._selectedCrops=crops;var active=crops.indexOf(crop)>=0;btn.style.background=active?'#2D6A4F':'#fff';btn.style.color=active?'#fff':'#666';btn.style.borderColor=active?'#2D6A4F':'#ddd';}
function accept(){var acceptBox=document.getElementById('cguAccept');if(!acceptBox||!acceptBox.checked)return;var modal=document.getElementById('cguModal');var newProfile={country:document.getElementById('cguCountry')?document.getElementById('cguCountry').value:'',crops:modal?(modal._selectedCrops||[]):[],farmSize:document.getElementById('cguFarmSize')?parseFloat(document.getElementById('cguFarmSize').value)||null:null,gender:document.getElementById('cguGender')?document.getElementById('cguGender').value:'',age:document.getElementById('cguAge')?parseInt(document.getElementById('cguAge').value)||null:null,experience:document.getElementById('cguExperience')?parseInt(document.getElementById('cguExperience').value)||null:null,farmerType:document.getElementById('cguFarmerType')?document.getElementById('cguFarmerType').value:'individual',isCoop:document.getElementById('cguCoop')?document.getElementById('cguCoop').checked:false};localStorage.setItem(PROFILE_KEY,JSON.stringify(newProfile));var history=[];try{history=JSON.parse(localStorage.getItem(PROFILE_HISTORY_KEY)||'[]');}catch(e){}
history.push({timestamp:new Date().toISOString(),profile:newProfile,cguVersion:CGU_VERSION,source:'cgu_revalidation'});localStorage.setItem(PROFILE_HISTORY_KEY,JSON.stringify(history));var cguData={acceptedAt:new Date().toISOString(),version:CGU_VERSION,profileSnapshot:newProfile};localStorage.setItem(CGU_KEY,JSON.stringify(cguData));if(modal)modal.remove();}
function checkOnStartup(){setTimeout(function(){var user=AP.auth?AP.auth.getUser():null;if(!user)return;if(user.demo)return;if(needsRevalidation()){showCguModal();}},2000);}
function forceShow(){showCguModal();}
function getProfileStats(){var history=[];try{history=JSON.parse(localStorage.getItem(PROFILE_HISTORY_KEY)||'[]');}catch(e){}
var profile=getProfile();var cguData=getCguData();return{profileComplete:!!(profile.country&&profile.crops&&profile.crops.length>0&&profile.farmSize),profileVersions:history.length,lastUpdate:history.length>0?history[history.length-1].timestamp:null,cguVersion:cguData?cguData.version:null,cguAcceptedAt:cguData?cguData.acceptedAt:null,daysSinceAcceptance:cguData?Math.floor((Date.now()-new Date(cguData.acceptedAt).getTime())/86400000):null};}
AP.cgu={checkOnStartup:checkOnStartup,forceShow:forceShow,toggleCrop:toggleCrop,accept:accept,needsRevalidation:needsRevalidation,getProfileStats:getProfileStats};})(window.AgroPrix);