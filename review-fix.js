(function(){
  var LUXE_NUMBER = '+19258722494';

  function formObject(form){
    var fd = new FormData(form), obj = {};
    fd.forEach(function(v,k){ obj[k] = v; });
    return obj;
  }

  function esc(v){
    return String(v||'').replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];
    });
  }

  function renderReviews(items){
    var box = document.getElementById('publishedReviews');
    if(!box) return;
    if(!items || !items.length){
      box.innerHTML = '<p class="review-empty">Customer reviews will appear here.</p>';
      return;
    }
    box.innerHTML = items.map(function(r){
      var rating = Math.max(1,Math.min(5,Number(r.rating||5)));
      return '<article class="published-review">'+
        '<div class="stars">'+'★'.repeat(rating)+'☆'.repeat(5-rating)+'</div>'+
        '<p>'+esc(r.review)+'</p>'+
        '<small>'+esc(r.name)+' · '+esc(r.vehicle)+'</small>'+
      '</article>';
    }).join('');
  }

  async function loadReviews(){
    try{
      var r = await fetch('/.netlify/functions/reviews',{cache:'no-store'});
      if(!r.ok) throw new Error('load failed');
      var d = await r.json();
      renderReviews(d.reviews || []);
    }catch(e){
      renderReviews([]);
    }
  }

  function smsHref(message){
    var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent||'');
    return 'sms:'+LUXE_NUMBER+(isIOS?'&':'?')+'body='+encodeURIComponent(message);
  }

  function repairReviewForm(){
    var form = document.getElementById('reviewForm');
    if(!form) return;

    var oldBtn = form.querySelector('button[type="submit"], #reviewSubmit');
    if(!oldBtn) return;

    var btn = oldBtn.cloneNode(true);
    btn.type = 'button';
    btn.id = 'reviewSubmit';
    btn.textContent = 'Submit Review';
    oldBtn.replaceWith(btn);

    btn.addEventListener('click', async function(){
      if(!form.reportValidity()) return;

      var status = document.getElementById('reviewStatus');
      btn.disabled = true;
      btn.textContent = 'Submitting...';
      if(status) status.textContent = 'Publishing your review...';

      try{
        var r = await fetch('/.netlify/functions/reviews',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(formObject(form))
        });
        var body = {};
        try{ body = await r.json(); }catch(_){}
        if(!r.ok) throw new Error(body.error || 'Could not publish review');

        form.reset();
        btn.textContent = 'Submitted ✓';
        if(status) status.textContent = 'Thank you. Your review is now published.';
        await loadReviews();

        setTimeout(function(){
          btn.textContent = 'Submit Review';
          btn.disabled = false;
        },1200);
      }catch(err){
        console.error(err);
        btn.textContent = 'Submit Review';
        btn.disabled = false;
        if(status) status.textContent = 'Could not publish the review. Please try again.';
      }
    });
  }

  function repairQuoteForm(){
    var form = document.getElementById('bookingForm');
    if(!form) return;

    var oldBtn = form.querySelector('button[type="submit"], #bookingSubmit');
    if(!oldBtn) return;

    var btn = oldBtn.cloneNode(true);
    btn.type = 'button';
    btn.id = 'bookingSubmit';
    btn.textContent = 'Text My Quote';
    oldBtn.replaceWith(btn);

    btn.addEventListener('click', function(){
      if(!form.reportValidity()) return;
      var data = new FormData(form);
      var message = [
        'LUXE QUOTE REQUEST','',
        'Name: '+(data.get('name')||''),
        'Phone: '+(data.get('phone')||''),
        'Email: '+(data.get('email')||''),
        'Vehicle: '+(data.get('vehicle-type')||''),
        'Service: '+(data.get('service')||''),
        'Condition: '+(data.get('condition')||''),
        'City / ZIP: '+(data.get('location')||''),
        'Preferred Date: '+(data.get('date')||'')
      ].join('\n');
      var status = document.getElementById('bookingStatus');
      if(status) status.textContent = 'Opening Messages. Tap Send to send your quote to Luxe.';
      window.location.href = smsHref(message);
    });
  }

  function init(){
    repairReviewForm();
    repairQuoteForm();
    loadReviews();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();