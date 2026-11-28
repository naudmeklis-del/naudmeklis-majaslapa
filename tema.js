// ============================================================
//  Gaišais / tumšais izskats (der visām lapām)
//  - Izvēle tiek saglabāta pārlūkā (localStorage, atslēga "tema").
//  - Ja nekas nav izvēlēts, lapa ir gaišā (tāda, kāda tā bija līdz šim).
//  - Tumšajā režīmā <html> elementam tiek pielikts data-theme="dark";
//    visu pārējo izskatu nosaka style.css.
// ============================================================
(function () {
  var saknes = document.documentElement;

  // 1) Uzreiz (vēl pirms lapa tiek uzzīmēta) pielietojam saglabāto izvēli,
  //    lai nebūtu īsa "nomirkšķināšanās" gaišā krāsā.
  try {
    if (localStorage.getItem('tema') === 'dark') {
      saknes.setAttribute('data-theme', 'dark');
    }
  } catch (e) {
    // ja pārlūks neļauj glabāt datus, lapa vienkārši paliek gaišā
  }

  // 2) Kad lapa ielādēta, piesaistām pārslēgšanas pogu (ja lapā tāda ir)
  function sagatavotPogu() {
    var poga = document.getElementById('btn-tema');
    if (!poga) return;

    var taimeris;   // laiks, pēc kura noņem pārejas klasi

    function irTumsa() {
      return saknes.getAttribute('data-theme') === 'dark';
    }

    function atjaunotPogu() {
      var teksts = irTumsa() ? 'Ieslēgt gaišo režīmu' : 'Ieslēgt tumšo režīmu';
      poga.title = teksts;
      poga.setAttribute('aria-label', teksts);
    }

    atjaunotPogu();

    poga.addEventListener('click', function () {
      // uz brīdi ieslēdzam mīkstās krāsu pārejas (skat. style.css, "tema-pariet")
      saknes.classList.add('tema-pariet');
      clearTimeout(taimeris);
      taimeris = setTimeout(function () {
        saknes.classList.remove('tema-pariet');
      }, 450);

      var jaunaIzvele = irTumsa() ? 'light' : 'dark';
      if (jaunaIzvele === 'dark') {
        saknes.setAttribute('data-theme', 'dark');
      } else {
        saknes.removeAttribute('data-theme');
      }
      try {
        localStorage.setItem('tema', jaunaIzvele);
      } catch (e) {
        // nevar saglabāt, bet pārslēgšana šajā apmeklējumā tāpat strādā
      }
      atjaunotPogu();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sagatavotPogu);
  } else {
    sagatavotPogu();
  }
})();
