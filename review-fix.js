(function(){
  var LUXE_NUMBER = '+19258722494';
  var REVIEW_ENDPOINT = '/.netlify/functions/reviews';

  function formObject(form){
    var fd = new FormData(form), obj = {};
    fd.forEach(function(v,k){ obj[k] = v; });
    return obj;
  }

  function esc(v){
    return String(v || '').replace(/[&<>"']/g, function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];
    });
  }

  function reviewMarkup(items){
    return items.map(function(r){
      var rating = Math.max(1, Math.min(5, Number(r.rating || 5)));
      return '<article class="testimonial luxe-live-review">' +
        '<div class="stars" aria-label="' + rating + ' out of 5 stars">' + '★'.repeat(rating) + '☆'.repeat(5-rating) + '</div>' +
        '<p class="quote">' + esc(r.review) + '</p>' +
        '<p class="attribution">' + esc(r.name) + ' · ' + esc(r.vehicle) + '</p>' +
      '</article>';
    }).join('');
  }

  function renderReviews(items){
    var approved = document.getElementById('approvedReviews');
    var published = document.getElementById('publishedReviews');

    if (published) {
      published.innerHTML = '';
      published.style.display = 'none';
    }

    if (!approved) return;

    if (!items || !items.length) {
      approved.innerHTML = '<div class="testimonial" id="noReviewsMessage"><p class="quote">Be the first to leave a review.</p><p class="attribution">Luxe Mobile Auto Detailing</p></div>';
      return;
    }

    approved.innerHTML = reviewMarkup(items);
  }

  async function loadReviews(){
    var response = await fetch(REVIEW_ENDPOINT, { cache: 'no-store' });
    var data = {};
    try { data = await response.json(); } catch (_) {}

    if (!response.ok || !Array.isArray(data.reviews)) {
      throw new Error(data.error || 'Could not load reviews');
    }

    renderReviews(data.reviews);
    return data.reviews;
  }

  function smsHref(message){
    var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    return 'sms:' + LUXE_NUMBER + (isIOS ? '&' : '?') + 'body=' + encodeURIComponent(message);
  }

  function quoteMessage(form){
    var data = new FormData(form);
    return [
      'LUXE QUOTE REQUEST','',
      'Name: ' + (data.get('name') || ''),
      'Phone: ' + (data.get('phone') || ''),
      'Email: ' + (data.get('email') || ''),
      'Vehicle: ' + (data.get('vehicle-type') || ''),
      'Service: ' + (data.get('service') || ''),
      'Condition: ' + (data.get('condition') || ''),
      'City / ZIP: ' + (data.get('location') || ''),
      'Preferred Date: ' + (data.get('date') || '')
    ].join('\n');
  }

  function copyText(text){
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function(resolve, reject){
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        ta.remove();
      }
    });
  }

  function repairReviewForm(){
    var form = document.getElementById('reviewForm');
    if (!form || form.dataset.luxeRepaired === '1') return;
    form.dataset.luxeRepaired = '1';

    var oldBtn = form.querySelector('button[type="submit"], #reviewSubmit');
    if (!oldBtn) return;

    var btn = oldBtn.cloneNode(true);
    btn.type = 'button';
    btn.id = 'reviewSubmit';
    btn.textContent = 'Submit Review';
    oldBtn.replaceWith(btn);

    btn.addEventListener('click', async function(){
      if (!form.reportValidity()) return;

      var status = document.getElementById('reviewStatus');
      var previousText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Submitting...';
      if (status) status.textContent = 'Publishing your review...';

      try {
        var response = await fetch(REVIEW_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formObject(form))
        });

        var data = {};
        try { data = await response.json(); } catch (_) {}
        if (!response.ok || !data.ok) throw new Error(data.error || 'Could not publish review');

        if (Array.isArray(data.reviews)) {
          renderReviews(data.reviews);
        } else if (data.review) {
          renderReviews([data.review]);
        }

        form.reset();
        btn.textContent = 'Submitted ✓';
        if (status) status.textContent = 'Thank you. Your review is live on the website.';

        try { await loadReviews(); } catch (_) {}

        setTimeout(function(){
          btn.textContent = previousText || 'Submit Review';
          btn.disabled = false;
        }, 1400);
      } catch (err) {
        console.error('Review submit failed', err);
        btn.textContent = previousText || 'Submit Review';
        btn.disabled = false;
        if (status) status.textContent = 'Your review was not published. Please try again.';
      }
    });
  }

  function makeQuoteFallback(form, link){
    var existing = document.getElementById('quoteSmsFallback');
    if (existing) return existing;

    var panel = document.createElement('div');
    panel.id = 'quoteSmsFallback';
    panel.style.display = 'none';
    panel.style.marginTop = '14px';
    panel.style.padding = '14px';
    panel.style.border = '1px solid rgba(184,151,90,.35)';
    panel.style.borderRadius = '12px';
    panel.style.background = 'rgba(184,151,90,.08)';

    var text = document.createElement('p');
    text.style.margin = '0 0 10px';
    text.textContent = "Messages didn't open? Instagram can block phone links. Tap Open Messages below, or use Instagram's ••• menu and choose Open in external browser.";

    var open = document.createElement('a');
    open.className = 'btn';
    open.textContent = 'Open Messages';
    open.style.marginRight = '10px';

    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn';
    copy.textContent = 'Copy Quote';

    function refresh(){
      open.href = smsHref(quoteMessage(form));
    }

    copy.addEventListener('click', function(){
      copyText(quoteMessage(form)).then(function(){
        copy.textContent = 'Copied ✓';
        setTimeout(function(){ copy.textContent = 'Copy Quote'; }, 1200);
      }).catch(function(){
        copy.textContent = 'Copy failed';
      });
    });

    panel.appendChild(text);
    panel.appendChild(open);
    panel.appendChild(copy);

    var status = document.getElementById('bookingStatus');
    if (status && status.parentNode) status.parentNode.insertBefore(panel, status.nextSibling);
    else form.appendChild(panel);

    refresh();
    form.addEventListener('input', refresh);
    form.addEventListener('change', refresh);
    link.addEventListener('click', refresh);

    return panel;
  }

  function repairQuoteForm(){
    var form = document.getElementById('bookingForm');
    if (!form || form.dataset.luxeRepaired === '1') return;
    form.dataset.luxeRepaired = '1';

    var oldBtn = form.querySelector('button[type="submit"], #bookingSubmit');
    if (!oldBtn) return;

    var link = document.createElement('a');
    link.id = 'bookingSubmit';
    link.className = oldBtn.className || 'btn';
    link.textContent = 'Text My Quote';
    link.setAttribute('role', 'button');
    link.href = 'sms:' + LUXE_NUMBER;
    oldBtn.replaceWith(link);

    var fallback = makeQuoteFallback(form, link);
    var leftPage = false;

    function refreshHref(){
      link.href = smsHref(quoteMessage(form));
    }

    function markLeft(){ leftPage = true; }
    window.addEventListener('pagehide', markLeft);
    document.addEventListener('visibilitychange', function(){
      if (document.visibilityState === 'hidden') leftPage = true;
    });

    form.addEventListener('input', refreshHref);
    form.addEventListener('change', refreshHref);
    refreshHref();

    link.addEventListener('click', function(e){
      if (!form.reportValidity()) {
        e.preventDefault();
        return;
      }

      leftPage = false;
      refreshHref();
      if (fallback) fallback.style.display = 'none';

      var status = document.getElementById('bookingStatus');
      if (status) status.textContent = 'Opening Messages. Tap Send to send your quote to Luxe.';

      setTimeout(function(){
        if (!leftPage && document.visibilityState === 'visible' && fallback) {
          fallback.style.display = 'block';
        }
      }, 900);
    });

    var disclaimer = form.querySelector('.form-disclaimer');
    if (disclaimer) disclaimer.textContent = 'Tap Text My Quote to open Messages with your request already filled in. You choose Send.';
  }

  async function init(){
    repairReviewForm();
    repairQuoteForm();

    try {
      await loadReviews();
    } catch (err) {
      console.error('Review load failed', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
