/* ===========================================================================
   AgroPrix — Bandeau de fraicheur des donnees
   ---------------------------------------------------------------------------
   Pourquoi ce fichier existe
   ---------------------------------------------------------------------------
   Entre mai et aout 2026, l'application a servi des prix vieux de 3 mois sans
   le moindre signal : l'API repondait 200, le front affichait les prix comme
   s'ils etaient a jour. Un producteur qui decide de vendre son mais sur un
   prix de mars prend une decision economique sur une donnee fausse.

   Ce module lit /api/health (qui expose desormais `data_freshness`) et affiche
   un bandeau honnete quand les donnees ont vieilli.

   Il est volontairement AUTONOME et AUTO-EFFACANT :
   - aucune dependance (ni Lucide, ni framework) ;
   - si la sync repart, le bandeau disparait tout seul au rechargement suivant.
     Personne n'a besoin de penser a le retirer -- c'est la difference avec un
     bandeau « maintenance » ecrit en dur qu'on oublie en place six mois.

   En cas d'echec reseau : on n'affiche RIEN. Un bandeau d'alerte declenche par
   une simple coupure de connexion serait pire que pas de bandeau du tout.
   =========================================================================== */
(function () {
  'use strict';

  var STYLES = {
    stale: {
      bg: '#FFF4E5',
      border: '#E8A33D',
      text: '#6B4A12',
      icon: '⚠️', // ⚠️
      title: 'Mise à jour des prix en retard'
    },
    critical: {
      bg: '#FDECEC',
      border: '#D64545',
      text: '#7A1F1F',
      icon: '⛔', // ⛔
      title: 'Prix non actualisés'
    }
  };

  function frenchDate(iso) {
    try {
      var d = new Date(iso + 'T00:00:00Z');
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
      });
    } catch (e) {
      return iso;
    }
  }

  function render(freshness) {
    var style = STYLES[freshness.status];
    if (!style) return;

    if (document.getElementById('dataFreshnessBanner')) return; // idempotent

    var when = freshness.latest_observation
      ? frenchDate(freshness.latest_observation)
      : 'date inconnue';
    var age = typeof freshness.age_days === 'number' ? freshness.age_days : null;

    var message = freshness.status === 'critical'
      ? 'Les prix affichés datent du <strong>' + when + '</strong>'
        + (age ? ' (' + age + ' jours)' : '')
        + '. Ils ne reflètent plus le marché actuel — à ne pas utiliser pour une décision de vente.'
      : 'Dernière mise à jour des prix : <strong>' + when + '</strong>'
        + (age ? ' (' + age + ' jours)' : '')
        + '. La mise à jour des prix est en retard.';

    var bar = document.createElement('div');
    bar.id = 'dataFreshnessBanner';
    bar.setAttribute('role', 'status');
    bar.style.cssText = [
      'position:relative', 'z-index:9998',
      'background:' + style.bg,
      'border-bottom:2px solid ' + style.border,
      'color:' + style.text,
      'padding:10px 16px',
      'font-size:13px', 'line-height:1.5',
      'font-family:inherit',
      'display:flex', 'align-items:flex-start', 'gap:10px'
    ].join(';');

    var icon = document.createElement('span');
    icon.textContent = style.icon;
    icon.style.cssText = 'flex-shrink:0;font-size:15px;line-height:1.4';

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;min-width:0';
    var strong = document.createElement('div');
    strong.textContent = style.title;
    strong.style.cssText = 'font-weight:700;margin-bottom:2px';
    var p = document.createElement('div');
    p.innerHTML = message; // contenu construit ici, pas de saisie utilisateur
    body.appendChild(strong);
    body.appendChild(p);

    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Masquer ce message');
    close.textContent = '×';
    close.style.cssText = [
      'flex-shrink:0', 'background:none', 'border:none',
      'color:' + style.text, 'font-size:20px', 'line-height:1',
      'cursor:pointer', 'padding:0 4px', 'opacity:.6'
    ].join(';');
    close.addEventListener('click', function () { bar.remove(); });

    bar.appendChild(icon);
    bar.appendChild(body);
    bar.appendChild(close);

    document.body.insertBefore(bar, document.body.firstChild);
  }

  function check() {
    var AP = window.AgroPrix;
    if (!AP || !AP.API_BASE) return;

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 6000) : null;

    fetch(AP.API_BASE + '/api/health', ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { return r.ok || r.status === 503 ? r.json() : null; })
      .then(function (json) {
        if (timer) clearTimeout(timer);
        if (!json || !json.checks) return;
        var f = json.checks.data_freshness;
        if (f && (f.status === 'stale' || f.status === 'critical')) render(f);
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        /* silence volontaire : voir l'en-tete du fichier */
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check);
  } else {
    check();
  }
})();
