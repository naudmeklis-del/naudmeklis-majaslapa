// ========== 1. SAVIENOJUMS AR SUPABASE ==========

var SUPABASE_URL = 'https://skyfwmjjchvjnudhrjea.supabase.co';
var SUPABASE_KEY = 'sb_publishable_5l6XZiifoA22UkH9cHz54Q_pKs5kHbQ';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Vai lapa atvērta no e-pastā saņemtās saites? Jāpaņem uzreiz, kamēr Supabase vēl nav notīrījis adresi.
var adresesDala = window.location.hash + window.location.search;
var epastsApstiprinats = /[#&?]type=signup/.test(adresesDala);
var saiteNederiga = /error_code=otp_expired/.test(adresesDala);


// ========== 2. KARTE ==========

var karte = L.map('karte').setView([56.9496, 24.1052], 12);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(karte);


// ========== 3. PIN'I ==========

var pinaIkona = L.divIcon({
  className: '',
  html: '<div class="pins"><span>€</span></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 43],
  popupAnchor: [0, -45]
});

// Tāds pats pin'š, bet ar dzeltenu apmali: tā tiek rādīti PAŠA lietotāja sludinājumi
var pinaIkonaMana = L.divIcon({
  className: '',
  html: '<div class="pins pins-mana"><span>€</span></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 43],
  popupAnchor: [0, -45]
});

// Darba meklētāju pin'i: cits izskats (cilvēka ikona vietā €), lai tos var atšķirt no haltūrām
var IKONA_CILVEKS = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';

var pinaIkonaMeklejs = L.divIcon({
  className: '',
  html: '<div class="pins pins-meklejs"><span>' + IKONA_CILVEKS + '</span></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 43],
  popupAnchor: [0, -45]
});

// Tāds pats, bet ar dzeltenu apmali: PAŠA lietotāja sludinājums
var pinaIkonaMeklejsMana = L.divIcon({
  className: '',
  html: '<div class="pins pins-meklejs pins-mana"><span>' + IKONA_CILVEKS + '</span></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 43],
  popupAnchor: [0, -45]
});

// Pieslēgtā lietotāja id (null, ja nav pieslēdzies). To atjauno sadaļā 5.
var manaLietotajaId = null;

// Pin'u saraksts pēc sludinājuma id (lai favorītu sarakstā varētu atrast pin'u un to atvērt)
var pinuMarkeri = {};

// Pieslēgtā lietotāja favorītu sludinājumu id
var manaFavoriti = new Set();

// Pārvērš tekstu drošā formā (lai neviens nevar ievietot savu kodu)
function drosiTeksts(teksts) {
  var d = document.createElement('div');
  d.textContent = teksts;
  return d.innerHTML;
}

// Atsevišķs slānis pin'iem, lai tos var notīrīt un ielādēt no jauna
var pinuSlanis = L.layerGroup().addTo(karte);

// Pārvērš datumu par tekstu: "Šodien, 14:32", "Vakar, 09:10" vai "12.11.2026., 18:05"
function formatetLaiku(isoTeksts) {
  var d = new Date(isoTeksts);
  if (isNaN(d.getTime())) return '';

  var hhmm = d.toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit' });
  var tagad = new Date();
  var sodienas = new Date(tagad.getFullYear(), tagad.getMonth(), tagad.getDate());
  var dienaD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var starpiba = Math.round((sodienas - dienaD) / 86400000);   // dienu skaits

  if (starpiba === 0) return 'Šodien, ' + hhmm;
  if (starpiba === 1) return 'Vakar, ' + hhmm;
  return d.toLocaleDateString('lv-LV') + ', ' + hhmm;
}

// Mazas līniju ikonas sludinājuma logam
var IKONA_VIETA = '<svg class="popup-ikona" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
var IKONA_TALRUNIS = '<svg class="popup-ikona" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
var IKONA_EPASTS = '<svg class="popup-ikona" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
var IKONA_LAIKS = '<svg class="popup-ikona" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';

// Kontaktinformācijas veids: 'epasts', 'talrunis' vai null (nav derīgs).
// Tālrunis: neobligāts +, pēc tā 8-15 cipari (atstarpes, domuzīmes un iekavas drīkst).
function kontaktaVeids(teksts) {
  teksts = (teksts || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teksts)) return 'epasts';
  if (/^\+?[\d\s\-()]+$/.test(teksts)) {
    var cipari = teksts.replace(/\D/g, '').length;
    if (cipari >= 8 && cipari <= 15) return 'talrunis';
  }
  return null;
}
var KONTAKTU_KLUDA = 'Kontaktinformācijai jābūt derīgam tālruņa numuram vai e-pasta adresei.';

// Kontaktinformācijas rinda: e-pastam e-pasta ikona un mailto: saite,
// tālrunim tālruņa ikona un tel: saite. To izmanto gan haltūru, gan darba meklētāju kartītēs.
function izveidotKontaktuRindu(kontakti) {
  kontakti = kontakti.trim();
  var veids = kontaktaVeids(kontakti);

  // Vecākiem ierakstiem teksts var būt brīvs: tad ikonu izvēlas pēc tā, vai tekstā ir e-pasts
  var irEpasts = veids ? (veids === 'epasts') : /\S+@\S+\.\S+/.test(kontakti);

  var rinda = document.createElement('div');
  rinda.className = 'popup-rinda popup-kontakti-rinda';
  rinda.innerHTML = (irEpasts ? IKONA_EPASTS : IKONA_TALRUNIS) + '<span class="popup-kontakti"></span>';
  var vieta = rinda.querySelector('.popup-kontakti');

  if (veids) {
    var saite = document.createElement('a');
    saite.textContent = kontakti;
    if (veids === 'epasts') {
      saite.href = 'mailto:' + kontakti;
    } else {
      saite.href = 'tel:' + (kontakti.charAt(0) === '+' ? '+' : '') + kontakti.replace(/\D/g, '');
    }
    // Lai klikšķis uz saites neatver favorītu kartīti
    saite.addEventListener('click', function (e) { e.stopPropagation(); });
    vieta.appendChild(saite);
  } else {
    vieta.textContent = kontakti;
  }
  return rinda;
}

// Kontaktu vieta kartītē. Ja nepieslēdzies, datubāze kontaktus neatdod vispār
// (contact ir undefined), un tad rādām pogu "Pieslēdzies, lai redzētu kontaktus".
// Ja kontaktu nav (vecs sludinājums), nerāda neko.
var IKONA_SLEDZENE = '<svg class="popup-ikona" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

function izveidotKontaktuVietu(kontakti) {
  if (kontakti === undefined) {
    var rinda = document.createElement('div');
    rinda.className = 'popup-rinda';
    rinda.innerHTML = IKONA_SLEDZENE;

    var poga = document.createElement('button');
    poga.type = 'button';
    poga.className = 'kontakti-slegti';
    poga.textContent = 'Pieslēdzies, lai redzētu kontaktus';
    poga.addEventListener('click', function (e) {
      e.stopPropagation();
      karte.closePopup();
      atvertAuth('login', 'Lai redzētu kontaktus, jāpieslēdzas.');
    });
    rinda.appendChild(poga);
    return rinda;
  }
  if (!kontakti) return null;
  return izveidotKontaktuRindu(kontakti);
}

// Attālums līdz lietotājam kā teksts ("1,2 km no tevis"); tukšs, ja vieta nav zināma
function attalumaTeksts(platums, garums) {
  if (!manaVieta) return '';
  var m = karte.distance(manaVieta.getLatLng(), [platums, garums]);
  return m < 1000
    ? Math.round(m) + ' m no tevis'
    : (m / 1000).toFixed(1).replace('.', ',') + ' km no tevis';
}

// Zvaigznīte (favorīts). Poga pati atjauno savu izskatu pēc funkcijas atjaunot()
function izveidotZvaigzni(gigId) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'zvaigzne-btn';
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

  btn.atjaunot = function () {
    var ir = manaFavoriti.has(gigId);
    btn.classList.toggle('aktivs', ir);
    btn.title = ir ? 'Noņemt no favorītiem' : 'Pievienot favorītiem';
    btn.setAttribute('aria-pressed', ir ? 'true' : 'false');
  };
  btn.atjaunot();

  btn.addEventListener('click', async function (e) {
    e.stopPropagation();   // lai klikšķis neatver kartīti (favorītu sarakstā)
    await pargretFavoritu(gigId);
    btn.atjaunot();
  });

  return btn;
}

// Sludinājuma kartīte. To izmanto gan logs uz pin'a, gan favorītu saraksts profilā.
// h ir sludinājuma ieraksts no datubāzes; ipasibas.popup = true rāda arī "Ziņot".
function izveidotKartiti(h, ipasibas) {
  var sakne = document.createElement('div');
  sakne.className = 'popup-karte';

  // 1. Nosaukums un zvaigznīte
  var galva = document.createElement('div');
  galva.className = 'popup-galva';

  var virsraksts = document.createElement('div');
  virsraksts.className = 'popup-nosaukums';
  virsraksts.textContent = h.title;
  galva.appendChild(virsraksts);

  var zvaigzne = izveidotZvaigzni(h.id);
  galva.appendChild(zvaigzne);
  sakne.appendChild(galva);

  // 2. Cena (violeta zīmīte) un kategorija (gaiša zīmīte)
  var zimes = document.createElement('div');
  zimes.className = 'popup-zimes';

  var cenaZime = document.createElement('div');
  cenaZime.className = 'popup-cena';
  if (h.price === null || h.price === undefined || h.price === '') {
    cenaZime.textContent = 'Cena pēc vienošanās';
  } else {
    var c = Number(h.price);
    cenaZime.textContent = '€' + (Number.isInteger(c) ? c : c.toFixed(2));
  }
  zimes.appendChild(cenaZime);

  if (h.category) {
    var kategorijaZime = document.createElement('div');
    kategorijaZime.className = 'popup-kategorija';
    kategorijaZime.textContent = h.category;
    zimes.appendChild(kategorijaZime);
  }
  sakne.appendChild(zimes);

  // 3. Attālums no lietotāja (rādās tikai, ja atrašanās vieta ir noteikta)
  var attalumaRinda = document.createElement('div');
  attalumaRinda.className = 'popup-rinda';
  attalumaRinda.style.display = 'none';
  attalumaRinda.innerHTML = IKONA_VIETA + '<span class="popup-attalums"></span>';
  sakne.appendChild(attalumaRinda);

  // 4. Apraksts
  if (h.description) {
    var aprakstsEl = document.createElement('div');
    aprakstsEl.className = 'popup-apraksts';
    aprakstsEl.textContent = h.description;
    sakne.appendChild(aprakstsEl);
  }

  // 5. Kontaktinformācija (vecākiem sludinājumiem tās var nebūt)
  var kontaktuEl = izveidotKontaktuVietu(h.contact);
  if (kontaktuEl) sakne.appendChild(kontaktuEl);

  // 6. Apakšējā rinda: laiks kreisajā pusē, "Ziņot" labajā pusē
  var apaksa = document.createElement('div');
  apaksa.className = 'popup-apakseja';

  var laiksEl = document.createElement('div');
  laiksEl.className = 'popup-rinda';
  var laiksTeksts = h.created_at ? formatetLaiku(h.created_at) : '';
  if (laiksTeksts) {
    laiksEl.innerHTML = IKONA_LAIKS + '<span class="popup-laiks"></span>';
    laiksEl.querySelector('.popup-laiks').textContent = laiksTeksts;
  }
  apaksa.appendChild(laiksEl);

  if (ipasibas && ipasibas.popup) {
    var btnZinot = document.createElement('button');
    btnZinot.type = 'button';
    btnZinot.className = 'zinot-btn';
    btnZinot.textContent = '⚑ Ziņot';
    btnZinot.addEventListener('click', function () {
      atvertZinosanu(h.id, 'haltura');
    });
    apaksa.appendChild(btnZinot);
  }
  sakne.appendChild(apaksa);

  return {
    sakne: sakne,
    zvaigzne: zvaigzne,
    atjaunotAttalumu: function () {
      var t = attalumaTeksts(h.lat, h.lon);
      attalumaRinda.querySelector('.popup-attalums').textContent = t;
      attalumaRinda.style.display = t ? 'flex' : 'none';
    }
  };
}

// Uzliek pin'u kartē; uzspiežot atveras sludinājuma kartīte
function pievienotPinu(h) {
  var kartite = izveidotKartiti(h, { popup: true });

  // Vai šis sludinājums pieder pieslēgtajam lietotājam?
  var irMans = manaLietotajaId !== null && h.user_id === manaLietotajaId;

  var pins = L.marker([h.lat, h.lon], {
    icon: irMans ? pinaIkonaMana : pinaIkona,
    zIndexOffset: irMans ? 1000 : 0     // savi pin'i vienmēr virs pārējiem
  })
    .addTo(pinuSlanis)
    .bindPopup(kartite.sakne, { minWidth: 240, maxWidth: 320, className: 'sludinajuma-popup' });

  pinuMarkeri[h.id] = pins;

  // Kad logs atveras: atjauno attālumu un zvaigznītes stāvokli
  pins.on('popupopen', function () {
    kartite.atjaunotAttalumu();
    kartite.zvaigzne.atjaunot();
  });
}


// Darba meklētāja kartīte (bez zvaigznītes: favorīti darbojas tikai haltūrām)
function izveidotMeklejaKartiti(m) {
  var sakne = document.createElement('div');
  sakne.className = 'popup-karte';

  // 1. Vārds un uzvārds
  var virsraksts = document.createElement('div');
  virsraksts.className = 'popup-nosaukums';
  virsraksts.textContent = m.first_name + (m.last_name ? ' ' + m.last_name : '');
  sakne.appendChild(virsraksts);

  // 2. Violetā zīmīte
  var zime = document.createElement('div');
  zime.className = 'popup-cena';
  zime.textContent = 'Meklē darbu';
  sakne.appendChild(zime);

  // 3. Attālums no lietotāja
  var attalumaRinda = document.createElement('div');
  attalumaRinda.className = 'popup-rinda';
  attalumaRinda.style.display = 'none';
  attalumaRinda.innerHTML = IKONA_VIETA + '<span class="popup-attalums"></span>';
  sakne.appendChild(attalumaRinda);

  // 4. Apraksts
  if (m.description) {
    var aprakstsEl = document.createElement('div');
    aprakstsEl.className = 'popup-apraksts';
    aprakstsEl.textContent = m.description;
    sakne.appendChild(aprakstsEl);
  }

  // 5. Kontaktinformācija
  var kontaktuEl = izveidotKontaktuVietu(m.contact);
  if (kontaktuEl) sakne.appendChild(kontaktuEl);

  // 6. Laiks
  var apaksa = document.createElement('div');
  apaksa.className = 'popup-apakseja';
  var laiksEl = document.createElement('div');
  laiksEl.className = 'popup-rinda';
  var laiksTeksts = m.created_at ? formatetLaiku(m.created_at) : '';
  if (laiksTeksts) {
    laiksEl.innerHTML = IKONA_LAIKS + '<span class="popup-laiks"></span>';
    laiksEl.querySelector('.popup-laiks').textContent = laiksTeksts;
  }
  apaksa.appendChild(laiksEl);

  var btnZinot = document.createElement('button');
  btnZinot.type = 'button';
  btnZinot.className = 'zinot-btn';
  btnZinot.textContent = '⚑ Ziņot';
  btnZinot.addEventListener('click', function () {
    atvertZinosanu(m.id, 'meklejs');
  });
  apaksa.appendChild(btnZinot);
  sakne.appendChild(apaksa);

  return {
    sakne: sakne,
    atjaunotAttalumu: function () {
      var t = attalumaTeksts(m.lat, m.lon);
      attalumaRinda.querySelector('.popup-attalums').textContent = t;
      attalumaRinda.style.display = t ? 'flex' : 'none';
    }
  };
}

// Uzliek darba meklētāja pin'u kartē
function pievienotMeklejaPinu(m) {
  var kartite = izveidotMeklejaKartiti(m);
  var irMans = manaLietotajaId !== null && m.user_id === manaLietotajaId;

  var pins = L.marker([m.lat, m.lon], {
    icon: irMans ? pinaIkonaMeklejsMana : pinaIkonaMeklejs,
    zIndexOffset: irMans ? 1000 : 0
  })
    .addTo(pinuSlanis)
    .bindPopup(kartite.sakne, { minWidth: 240, maxWidth: 320, className: 'sludinajuma-popup' });

  pins.on('popupopen', function () {
    kartite.atjaunotAttalumu();
  });
}


// ========== 4. DATU IELASĪŠANA UN FILTRI ==========

// Kolonnas, ko drīkst redzēt arī nepieslēgušies lietotāji (BEZ kontaktiem).
// Pieslēgušies lietotāji ielādē visu ("*"). Tām pašām kolonnām jābūt atļautām Supabase SQL.
var GIGS_PUBLISKIE = 'id,title,category,price,description,lat,lon,user_id,created_at,expires_at,hidden';
var SEEKERS_PUBLISKIE = 'id,first_name,last_name,description,lat,lon,user_id,created_at,expires_at,hidden';
var ieladesNumurs = 0;           // lai vecāka (lēnāka) ielāde nepārraksta jaunāko

var visasHalturas = [];          // visas ielasītās haltūras
var visiMeklejie = [];           // visi ielasītie darba meklētāji
var izveletasKategorijas = [];   // kategorijas, ko lietotājs atzīmējis

async function ieladetPinus() {
  var ielade = ++ieladesNumurs;

  // Pieslēgtie redz arī kontaktus, nepieslēgtie ne
  var sesijaPinam = await sb.auth.getSession();
  var pieslegtsPinam = !!sesijaPinam.data.session;

  var rezultats = await sb.from('gigs')
    .select(pieslegtsPinam ? '*' : GIGS_PUBLISKIE)
    .eq('hidden', false);
  if (ielade !== ieladesNumurs) return;   // starplaikā sākusies jaunāka ielāde

  if (rezultats.error) {
    console.error('Kļūda:', rezultats.error.message);
    document.getElementById('f-rezultati').textContent =
      'Neizdevās ielādēt haltūras. ' + latviskaKluda(rezultats.error);
    return;
  }

  visasHalturas = rezultats.data;   // iegaumējam visu sarakstu

  // Darba meklētāji. Ja kaut kas noiet greizi, haltūras tāpat tiek rādītas.
  var meklejuRez = await sb.from('seekers')
    .select(pieslegtsPinam ? '*' : SEEKERS_PUBLISKIE)
    .eq('hidden', false);
  if (ielade !== ieladesNumurs) return;

  if (meklejuRez.error) {
    console.error('Darba meklētāji:', meklejuRez.error.message);
    visiMeklejie = [];
  } else {
    visiMeklejie = meklejuRez.data;
  }
  atjaunotKategorijuSkaitu();       // uzliek skaitļus uz kategoriju pogām
  pielietotFiltrus();               // un parādām to, kas atbilst filtriem
}

// Atlasa haltūras pēc filtriem un uzliek pin'us kartē
function pielietotFiltrus() {
  var meklet = document.getElementById('f-meklet').value.trim().toLowerCase();
  var min = document.getElementById('f-min').value;
  var max = document.getElementById('f-max').value;
  var tikaiApmaksatas = document.getElementById('f-apmaksatas').checked;

  var rodiPiedavajumus = document.getElementById('f-rodit-piedavajumus').checked;
  var rodiMeklejus = document.getElementById('f-rodit-mekletajus').checked;

  var atlasitas = !rodiPiedavajumus ? [] : visasHalturas.filter(function (h) {

    // Meklēšana nosaukumā un aprakstā
    if (meklet !== '') {
      var teksts = (h.title + ' ' + (h.description || '')).toLowerCase();
      if (teksts.indexOf(meklet) === -1) return false;
    }

    // Kategorijas (ja nekas nav atzīmēts, rāda visas)
    if (izveletasKategorijas.length > 0 &&
        izveletasKategorijas.indexOf(h.category) === -1) return false;

    // Cena
    if (min !== '' && (h.price === null || h.price < Number(min))) return false;
    if (max !== '' && (h.price === null || h.price > Number(max))) return false;

    // Tikai apmaksātās
    if (tikaiApmaksatas && (!h.price || h.price <= 0)) return false;

    return true;   // visi nosacījumi izpildīti
  });

  // Darba meklētājiem nav kategorijas un cenas, tāpēc, kamēr kāds no šiem filtriem
  // ir aktīvs, viņi netiek rādīti. Meklēšana darbojas pēc vārda un apraksta.
  var kategorijaVaiCenaAktiva = izveletasKategorijas.length > 0 ||
    min !== '' || max !== '' || tikaiApmaksatas;

  var atlasitiMeklejie = (!rodiMeklejus || kategorijaVaiCenaAktiva) ? [] :
    visiMeklejie.filter(function (m) {
      if (meklet === '') return true;
      var teksts = (m.first_name + ' ' + (m.last_name || '') + ' ' + (m.description || '')).toLowerCase();
      return teksts.indexOf(meklet) !== -1;
    });

  pinuSlanis.clearLayers();
  pinuMarkeri = {};
  atlasitas.forEach(function (h) {
    pievienotPinu(h);
  });
  atlasitiMeklejie.forEach(function (m) {
    pievienotMeklejaPinu(m);
  });

  var rezultatuDalas = [];
  if (rodiPiedavajumus) rezultatuDalas.push('Atrastas haltūras: ' + atlasitas.length);
  if (rodiMeklejus) rezultatuDalas.push('Darba meklētāji: ' + atlasitiMeklejie.length);
  document.getElementById('f-rezultati').textContent =
    rezultatuDalas.length > 0 ? rezultatuDalas.join(' · ') : 'Atzīmē, ko rādīt kartē';
}

// Uzliek katras kategorijas pogai sludinājumu skaitu (skaita visus ielādētos sludinājumus)
function atjaunotKategorijuSkaitu() {
  var skaiti = {};
  visasHalturas.forEach(function (h) {
    skaiti[h.category] = (skaiti[h.category] || 0) + 1;
  });
  document.querySelectorAll('.chip-skaits').forEach(function (el) {
    el.textContent = skaiti[el.dataset.kategorija] || 0;
  });
}

ieladetPinus();


// ========== 5. REĢISTRĀCIJA UN PIESLĒGŠANĀS ==========

var authLogs          = document.getElementById('auth-logs');
var loginSkats        = document.getElementById('auth-login-skats');
var registerSkats     = document.getElementById('auth-register-skats');
var loginZinojums     = document.getElementById('login-zinojums');
var registerZinojums  = document.getElementById('reg-zinojums');
var resetSkats        = document.getElementById('auth-reset-skats');
var newpassSkats      = document.getElementById('auth-newpass-skats');
var resetZinojums     = document.getElementById('reset-zinojums');
var newpassZinojums   = document.getElementById('np-zinojums');

// ---------- Kļūdu tulkošana latviski ----------
// Pieņem Supabase kļūdu un atgriež saprotamu tekstu latviešu valodā.
// Ja gribi pievienot jaunu tulkojumu, pievieno jaunu "if" pirms pēdējās rindas.
function latviskaKluda(kluda) {
  var kods   = kluda.code || '';
  var teksts = (kluda.message || '').toLowerCase();

  // --- Pieslēgšanās un reģistrācija ---
  if (kods === 'invalid_credentials' || teksts.indexOf('invalid login credentials') !== -1) {
    return 'Nepareizs e-pasts vai parole.';
  }
  if (kods === 'email_not_confirmed' || teksts.indexOf('email not confirmed') !== -1) {
    return 'E-pasts vēl nav apstiprināts. Atver savu e-pastu un uzspied apstiprinājuma saiti.';
  }
  if (kods === 'user_already_exists' || kods === 'email_exists' || teksts.indexOf('already registered') !== -1) {
    return 'Šis e-pasts jau tiek lietots. Mēģini pieslēgties.';
  }
  if (kods === 'same_password' || teksts.indexOf('different from the old') !== -1) {
    return 'Jaunajai parolei jābūt citādai nekā vecajai.';
  }
  if (kods === 'weak_password' || teksts.indexOf('at least 6') !== -1 || teksts.indexOf('password should be') !== -1) {
    return 'Parole ir pārāk vāja. Tai jābūt vismaz 6 simbolus garai.';
  }
  if (kods === 'email_address_invalid' || teksts.indexOf('invalid format') !== -1 ||
      (teksts.indexOf('email') !== -1 && teksts.indexOf('invalid') !== -1)) {
    return 'E-pasta adrese nav derīga.';
  }
  if (kods === 'over_request_rate_limit' || kods === 'over_email_send_rate_limit' ||
      teksts.indexOf('rate limit') !== -1 || teksts.indexOf('for security purposes') !== -1) {
    return 'Pārāk daudz mēģinājumu. Uzgaidi mirkli un mēģini vēlreiz.';
  }
  if (kods === 'signup_disabled') {
    return 'Reģistrācija pašlaik nav pieejama.';
  }

  // --- Datubāze ---
  if (kods === '42501' || teksts.indexOf('row-level security') !== -1) {
    return 'Tev nav tiesību veikt šo darbību. Mēģini pieslēgties vēlreiz.';
  }
  if (kods === 'PGRST301' || teksts.indexOf('jwt') !== -1) {
    return 'Pieslēgšanās sesija ir beigusies. Pieslēdzies vēlreiz.';
  }
  if (kods === '23505') {
    return 'Šāds ieraksts jau pastāv.';
  }
  if (kods === '23502') {
    return 'Nav aizpildīts kāds obligātais lauks.';
  }
  if (kods === '23514' || kods === '22001') {
    return 'Ievadītā vērtība nav derīga vai ir pārāk gara.';
  }
  // Mūsu pašu ziņojumi no datubāzes (piem. ziņošanas pārbaudes) jau ir latviski
  if (kods === 'P0001') {
    return kluda.message;
  }

  // --- Savienojums ---
  if (teksts.indexOf('failed to fetch') !== -1 || teksts.indexOf('network') !== -1 ||
      kluda.name === 'AuthRetryableFetchError') {
    return 'Nav savienojuma ar serveri. Pārbaudi internetu un mēģini vēlreiz.';
  }

  return 'Kaut kas nogāja greizi. Pamēģini vēlreiz.';
}

// ---------- Palīgfunkcijas ----------
function epastsIrDerigs(epasts) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epasts);
}

// Parāda ziņojumu zem formas. veids: 'kluda' (sarkans), 'ok' (zaļš), 'info' (violets)
function paradiZinojumu(elements, teksts, veids) {
  elements.textContent = teksts;
  elements.className = 'auth-zinojums' + (veids === 'ok' ? ' ok' : veids === 'info' ? ' info' : '');
}

// Parāda vienu no skatiem: 'login', 'register', 'reset' (aizmirsta parole) vai 'newpass' (jauna parole)
function rutaAuthSkats(skats) {
  loginSkats.hidden    = (skats !== 'login');
  registerSkats.hidden = (skats !== 'register');
  resetSkats.hidden    = (skats !== 'reset');
  newpassSkats.hidden  = (skats !== 'newpass');
  paradiZinojumu(loginZinojums, '');
  paradiZinojumu(registerZinojums, '');
  paradiZinojumu(resetZinojums, '');
  paradiZinojumu(newpassZinojums, '');
}

// Atver logu. Pēc noklusējuma rāda pieslēgšanos.
// teksts (nav obligāts) ir paskaidrojums, piem. "Lai ziņotu, jāpieslēdzas."
function atvertAuth(skats, teksts) {
  skats = skats || 'login';
  rutaAuthSkats(skats);
  if (teksts) {
    var zinojumuVieta = {
      login: loginZinojums, register: registerZinojums,
      reset: resetZinojums, newpass: newpassZinojums
    }[skats];
    paradiZinojumu(zinojumuVieta, teksts, 'info');
  }
  if (!authLogs.open) authLogs.showModal();
}

// ---------- Pogas un pārslēgšanās ----------
document.getElementById('btn-pieslegties').addEventListener('click', function () {
  atvertAuth('login');
});
document.getElementById('btn-aizvert').addEventListener('click', function () {
  authLogs.close();
});

// "Nav konta? Reģistrēties" un "Jau ir konts? Pieslēgties" (e-pastu pārnes līdzi)
document.getElementById('btn-uz-registraciju').addEventListener('click', function () {
  var epasts = document.getElementById('login-epasts').value;
  rutaAuthSkats('register');
  document.getElementById('reg-epasts').value = epasts;
});
document.getElementById('btn-uz-pieslegsanos').addEventListener('click', function () {
  var epasts = document.getElementById('reg-epasts').value;
  rutaAuthSkats('login');
  document.getElementById('login-epasts').value = epasts;
});

// ---------- Pieslēgšanās ----------
document.getElementById('login-forma').addEventListener('submit', async function (e) {
  e.preventDefault();
  var forma  = e.target;
  var epasts = document.getElementById('login-epasts').value.trim();
  var parole = document.getElementById('login-parole').value;

  if (epasts === '')              { paradiZinojumu(loginZinojums, 'Ievadi e-pasta adresi.'); return; }
  if (!epastsIrDerigs(epasts))    { paradiZinojumu(loginZinojums, 'E-pasta adrese nav derīga.'); return; }
  if (parole === '')              { paradiZinojumu(loginZinojums, 'Ievadi paroli.'); return; }

  var poga = document.getElementById('btn-login');
  poga.disabled = true;
  poga.textContent = 'Uzgaidi...';
  paradiZinojumu(loginZinojums, '');

  var rezultats;
  try {
    rezultats = await sb.auth.signInWithPassword({ email: epasts, password: parole });
  } catch (err) {
    rezultats = { error: err };
  }

  poga.disabled = false;
  poga.textContent = 'Pieslēgties';

  if (rezultats.error) {
    paradiZinojumu(loginZinojums, latviskaKluda(rezultats.error));
    return;
  }

  forma.reset();
  authLogs.close();
});
// ---------- Pieslēgšanās ar Google un Facebook ----------
document.querySelectorAll('.google-btn, .facebook-btn').forEach(function (poga) {
  poga.addEventListener('click', async function () {
    var pakalpojums = poga.classList.contains('facebook-btn') ? 'facebook' : 'google';
    var vieta = poga.id.indexOf('-reg') !== -1 ? registerZinojums : loginZinojums;
    var atgriesanasAdrese = window.location.origin + window.location.pathname.replace(/index\.html$/, '');
    var r;
    try {
      r = await sb.auth.signInWithOAuth({
        provider: pakalpojums,
        options: { redirectTo: atgriesanasAdrese }
      });
    } catch (err) {
      r = { error: err };
    }
    if (r.error) paradiZinojumu(vieta, latviskaKluda(r.error));
  });
});
// ---------- Reģistrācija ----------
document.getElementById('register-forma').addEventListener('submit', async function (e) {
  e.preventDefault();
  var forma   = e.target;
  var epasts  = document.getElementById('reg-epasts').value.trim();
  var parole  = document.getElementById('reg-parole').value;
  var parole2 = document.getElementById('reg-parole2').value;

  if (epasts === '')            { paradiZinojumu(registerZinojums, 'Ievadi e-pasta adresi.'); return; }
  if (!epastsIrDerigs(epasts))  { paradiZinojumu(registerZinojums, 'E-pasta adrese nav derīga.'); return; }
  if (parole.length < 6)        { paradiZinojumu(registerZinojums, 'Parolei jābūt vismaz 6 simbolus garai.'); return; }
  if (parole !== parole2)       { paradiZinojumu(registerZinojums, 'Paroles nesakrīt.'); return; }

  var poga = document.getElementById('btn-register');
  poga.disabled = true;
  poga.textContent = 'Uzgaidi...';
  paradiZinojumu(registerZinojums, '');

  var rezultats;
  try {
    rezultats = await sb.auth.signUp({ email: epasts, password: parole });
  } catch (err) {
    rezultats = { error: err };
  }

  poga.disabled = false;
  poga.textContent = 'Reģistrēties';

  if (rezultats.error) {
    paradiZinojumu(registerZinojums, latviskaKluda(rezultats.error));
    return;
  }

  // Ja e-pasts jau ir reģistrēts, Supabase kļūdu neatgriež, bet "identities" ir tukšs
  var lietotajs = rezultats.data && rezultats.data.user;
  if (lietotajs && lietotajs.identities && lietotajs.identities.length === 0) {
    paradiZinojumu(registerZinojums, 'Šis e-pasts jau tiek lietots. Mēģini pieslēgties.');
    return;
  }

  // Ja apstiprināt e-pastu nav jāprasa, lietotājs jau ir pieslēdzies
  if (rezultats.data && rezultats.data.session) {
    forma.reset();
    authLogs.close();
    return;
  }

  // Citādi jāapstiprina e-pasts: pārslēdzam uz pieslēgšanos ar paskaidrojumu
  forma.reset();
  rutaAuthSkats('login');
  document.getElementById('login-epasts').value = epasts;
  paradiZinojumu(loginZinojums,
    'Reģistrācija izdevās! Nosūtījām apstiprinājuma saiti uz ' + epasts +
    '. Uzspied to, tad pieslēdzies.', 'ok');
});

// ---------- Aizmirsta parole ----------
// "Aizmirsi paroli?" atver e-pasta ievades skatu (e-pastu pārnes līdzi)
document.getElementById('btn-aizmirsu-paroli').addEventListener('click', function () {
  var epasts = document.getElementById('login-epasts').value;
  rutaAuthSkats('reset');
  document.getElementById('reset-epasts').value = epasts;
});
document.getElementById('btn-reset-atpakal').addEventListener('click', function () {
  var epasts = document.getElementById('reset-epasts').value;
  rutaAuthSkats('login');
  document.getElementById('login-epasts').value = epasts;
});

// Nosūta e-pastu ar paroles atjaunošanas saiti
document.getElementById('reset-forma').addEventListener('submit', async function (e) {
  e.preventDefault();
  var epasts = document.getElementById('reset-epasts').value.trim();

  if (epasts === '')           { paradiZinojumu(resetZinojums, 'Ievadi e-pasta adresi.'); return; }
  if (!epastsIrDerigs(epasts)) { paradiZinojumu(resetZinojums, 'E-pasta adrese nav derīga.'); return; }

  var poga = document.getElementById('btn-reset');
  poga.disabled = true;
  poga.textContent = 'Uzgaidi...';
  paradiZinojumu(resetZinojums, '');

  // Uz kurieni atgriezties pēc saites uzspiešanas (šī lapa). Šai adresei jābūt arī Supabase
  // sadaļā Authentication > URL Configuration > Redirect URLs.
  var atgriesanasAdrese = window.location.origin + window.location.pathname.replace(/index\.html$/, '');

  var rezultats;
  try {
    rezultats = await sb.auth.resetPasswordForEmail(epasts, { redirectTo: atgriesanasAdrese });
  } catch (err) {
    rezultats = { error: err };
  }

  if (rezultats.error) {
    poga.disabled = false;
    poga.textContent = 'Nosūtīt saiti';
    paradiZinojumu(resetZinojums, latviskaKluda(rezultats.error));
    return;
  }

  // Apzināti nesakām, vai šāds konts pastāv (lai citi nevarētu pārbaudīt svešus e-pastus)
  paradiZinojumu(resetZinojums,
    'Ja šāds konts pastāv, nosūtījām paroles atjaunošanas saiti uz ' + epasts +
    '. Pārbaudi arī surogātpasta (spam) mapi.', 'ok');

  // Nākamo e-pastu drīkst sūtīt tikai pēc minūtes
  setTimeout(function () {
    poga.disabled = false;
    poga.textContent = 'Nosūtīt saiti';
  }, 60000);
});

// Jaunas paroles saglabāšana (šis skats atveras pats, kad lietotājs atver saiti no e-pasta)
document.getElementById('newpass-forma').addEventListener('submit', async function (e) {
  e.preventDefault();
  var forma   = e.target;
  var parole  = document.getElementById('np-parole').value;
  var parole2 = document.getElementById('np-parole2').value;

  if (parole.length < 6)  { paradiZinojumu(newpassZinojums, 'Parolei jābūt vismaz 6 simbolus garai.'); return; }
  if (parole !== parole2) { paradiZinojumu(newpassZinojums, 'Paroles nesakrīt.'); return; }

  var poga = document.getElementById('btn-newpass');
  poga.disabled = true;
  poga.textContent = 'Uzgaidi...';
  paradiZinojumu(newpassZinojums, '');

  var rezultats;
  try {
    rezultats = await sb.auth.updateUser({ password: parole });
  } catch (err) {
    rezultats = { error: err };
  }

  poga.disabled = false;
  poga.textContent = 'Saglabāt paroli';

  if (rezultats.error) {
    paradiZinojumu(newpassZinojums, latviskaKluda(rezultats.error));
    return;
  }

  forma.reset();
  authLogs.close();
  paradiPazinojumu('✓ Parole nomainīta!');
});

document.getElementById('btn-iziet').addEventListener('click', async function () {
  await sb.auth.signOut();
});

// Ja e-pasta saite ir novecojusi vai jau izmantota
if (saiteNederiga) {
  setTimeout(function () { paradiPazinojumu('Saite ir novecojusi vai jau izmantota. Mēģini vēlreiz.', 5000); }, 600);
}

// Seko, vai lietotājs ir pieslēdzies, un parāda pareizās pogas
var pedejaisPieslegts = null;   // lai zinātu, vai pieslēgšanās stāvoklis tiešām mainījies

sb.auth.onAuthStateChange(function (notikums, sesija) {
  var pieslegts = sesija !== null;
  manaLietotajaId = pieslegts ? sesija.user.id : null;

  // Lietotājs atvēra paroles atjaunošanas saiti no e-pasta: parādām jaunas paroles logu
  if (notikums === 'PASSWORD_RECOVERY') {
    setTimeout(function () { atvertAuth('newpass'); }, 0);
  }

  // Lietotājs uzspieda apstiprinājuma saiti e-pastā: parādām paziņojumu ekrāna vidū (tikai vienreiz)
  if (notikums === 'SIGNED_IN' && epastsApstiprinats) {
    epastsApstiprinats = false;
    setTimeout(function () { paradiPazinojumu('✓ E-pasts apstiprināts! Tu esi pieslēdzies.', 4000); }, 0);
  }
  if (visasHalturas.length > 0 || visiMeklejie.length > 0) pielietotFiltrus();   // pārzīmē pin'us, lai savi sludinājumi iegūtu dzelteno apmali

  // Kontakti ir redzami tikai pieslēgtiem, tāpēc pieslēdzoties vai izejot sludinājumus ielādē no jauna
  // (setTimeout, lai neizsauktu Supabase tieši šajā funkcijā)
  if (pedejaisPieslegts !== null && pedejaisPieslegts !== pieslegts) setTimeout(ieladetPinus, 0);
  pedejaisPieslegts = pieslegts;
  document.getElementById('btn-pieslegties').style.display = pieslegts ? 'none' : 'inline-block';
  document.getElementById('btn-iziet').style.display = pieslegts ? 'inline-block' : 'none';
  document.getElementById('btn-mani').style.display = pieslegts ? 'inline-block' : 'none';
  document.getElementById('btn-pievienot').style.display = pieslegts ? 'inline-block' : 'none';

  // Favorīti: ielādē pēc pieslēgšanās, notīra pēc iziešanas
  // (setTimeout, lai neizsauktu Supabase tieši šajā funkcijā)
  if (pieslegts) {
    setTimeout(ieladetFavoritusId, 0);
  } else {
    manaFavoriti = new Set();
  }
});


// ========== 6. HALTŪRAS PIEVIENOŠANA ==========

// Cik aktīvus sludinājumus vienlaikus drīkst turēt viens lietotājs.
// (Tas pats skaitlis jānorāda arī Supabase SQL trigerī!)
var MAKS_SLUDINAJUMI = 2;
var LIMITA_TEKSTS = 'Vari pievienot ne vairāk kā ' + MAKS_SLUDINAJUMI +
  ' sludinājumus vienlaikus. Izdzēs kādu no esošajiem sadaļā "Mans profils".';

// Īss paziņojums ekrāna vidū, kas pēc brīža pats pazūd
function paradiPazinojumu(teksts, ms) {
  var el = document.getElementById('pazinojums-centra');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pazinojums-centra';
    el.className = 'pazinojums-centra';
    document.body.appendChild(el);
  }
  el.textContent = teksts;
  el.classList.add('redzams');
  clearTimeout(el._taimeris);
  el._taimeris = setTimeout(function () {
    el.classList.remove('redzams');
  }, ms || 2500);   // ms nav obligāts, pēc noklusējuma 2,5 sekundes
}

var halturaLogs = document.getElementById('haltura-logs');
var hZinojums = document.getElementById('h-zinojums');
var gaidaKlikski = false;
var izveletaVieta = null;
var pagaiduPins = null;

var izveleLogs = document.getElementById('pievienot-izvele-logs');
var seviLogs = document.getElementById('sevi-logs');
var sZinojums = document.getElementById('s-zinojums');
var pievienosanasVeids = 'haltura';   // 'haltura' vai 'sevi': ko šobrīd pievieno

// Poga "Pievienot": atver izvēles logu (ja lietotājs ir pieslēdzies)
document.getElementById('btn-pievienot').addEventListener('click', async function () {
  var sesija = await sb.auth.getSession();

  if (!sesija.data.session) {
    atvertAuth('login', 'Lai pievienotu sludinājumu, jāpieslēdzas.');
    return;
  }

  izveleLogs.showModal();
});

document.getElementById('btn-izvele-atcelt').addEventListener('click', function () {
  izveleLogs.close();
});
document.getElementById('btn-izvele-haltura').addEventListener('click', function () {
  saktPievienosanu('haltura');
});
document.getElementById('btn-izvele-sevi').addEventListener('click', function () {
  saktPievienosanu('sevi');
});

// Kopīga sākšana abiem veidiem: pārbauda limitu un gaida klikšķi kartē
async function saktPievienosanu(veids) {
  izveleLogs.close();

  var sesija = await sb.auth.getSession();
  if (!sesija.data.session) {
    atvertAuth('login', 'Lai pievienotu sludinājumu, jāpieslēdzas.');
    return;
  }

  // Pārbauda, vai lietotājam jau nav pieļaujamais sludinājumu skaits (katrai tabulai atsevišķi)
  var tabula = (veids === 'sevi') ? 'seekers' : 'gigs';
  var skaits = await sb.from(tabula)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', sesija.data.session.user.id);

  if (!skaits.error && skaits.count >= MAKS_SLUDINAJUMI) {
    paradiPazinojumu(LIMITA_TEKSTS, 4000);
    return;
  }

  pievienosanasVeids = veids;
  gaidaKlikski = true;
  alert(veids === 'sevi'
    ? 'Uzklikšķini kartē aptuvenā vietā, kur vēlies, lai tevi atrod.'
    : 'Uzklikšķini kartē vietā, kur ir haltūra.');
}

karte.on('click', function (e) {
  if (!gaidaKlikski) return;
  gaidaKlikski = false;
  izveletaVieta = e.latlng;

  if (pagaiduPins) karte.removeLayer(pagaiduPins);
  pagaiduPins = L.marker(e.latlng).addTo(karte);

  if (pievienosanasVeids === 'sevi') {
    sZinojums.textContent = '';
    seviLogs.showModal();
  } else {
    hZinojums.textContent = '';
    halturaLogs.showModal();
  }
});

document.getElementById('btn-atcelt').addEventListener('click', function () {
  halturaLogs.close();
  if (pagaiduPins) karte.removeLayer(pagaiduPins);
});

document.getElementById('btn-saglabat').addEventListener('click', async function () {
  var nosaukums = document.getElementById('h-nosaukums').value.trim();
  var kategorija = document.getElementById('h-kategorija').value;
  var cena = document.getElementById('h-cena').value;
  var kontakti = document.getElementById('h-kontakti').value.trim();
  var apraksts = document.getElementById('h-apraksts').value.trim();

  if (nosaukums === '') {
    hZinojums.textContent = 'Ieraksti nosaukumu.';
    return;
  }
  if (kontakti === '') {
    hZinojums.textContent = 'Ieraksti kontaktinformāciju (tālruni vai e-pastu).';
    return;
  }
  if (!kontaktaVeids(kontakti)) {
    hZinojums.textContent = KONTAKTU_KLUDA;
    return;
  }

  var sesija = await sb.auth.getSession();
  var lietotajs = sesija.data.session.user;

  var rezultats = await sb.from('gigs').insert({
    title: nosaukums,
    category: kategorija,
    price: cena === '' ? null : Number(cena),
    contact: kontakti,
    description: apraksts === '' ? null : apraksts,
    lat: izveletaVieta.lat,
    lon: izveletaVieta.lng,
    user_id: lietotajs.id
  });

  if (rezultats.error) {
    // Datubāzes limits (P0001): aizveram logu un parādām paziņojumu ekrāna vidū
    if (rezultats.error.code === 'P0001') {
      if (pagaiduPins) karte.removeLayer(pagaiduPins);
      halturaLogs.close();
      paradiPazinojumu(LIMITA_TEKSTS, 4000);
      return;
    }
    hZinojums.textContent = latviskaKluda(rezultats.error);
    return;
  }

  if (pagaiduPins) karte.removeLayer(pagaiduPins);
  ieladetPinus();   // pārlādē visus pin'us no datubāzes

  document.getElementById('h-nosaukums').value = '';
  document.getElementById('h-cena').value = '';
  document.getElementById('h-kontakti').value = '';
  document.getElementById('h-apraksts').value = '';
  halturaLogs.close();
  paradiPazinojumu('✓ Sludinājums veiksmīgi pievienots!');
});


// ---------- "Pievienot sevi": darba meklētāja saglabāšana ----------
document.getElementById('btn-s-atcelt').addEventListener('click', function () {
  seviLogs.close();
  if (pagaiduPins) karte.removeLayer(pagaiduPins);
});

document.getElementById('btn-s-saglabat').addEventListener('click', async function () {
  var vards = document.getElementById('s-vards').value.trim();
  var uzvards = document.getElementById('s-uzvards').value.trim();
  var kontakti = document.getElementById('s-kontakti').value.trim();
  var apraksts = document.getElementById('s-apraksts').value.trim();

  if (vards === '') {
    sZinojums.textContent = 'Ieraksti vārdu.';
    return;
  }
  if (kontakti === '') {
    sZinojums.textContent = 'Ieraksti kontaktinformāciju (tālruni vai e-pastu).';
    return;
  }
  if (!kontaktaVeids(kontakti)) {
    sZinojums.textContent = KONTAKTU_KLUDA;
    return;
  }
  if (apraksts === '') {
    sZinojums.textContent = 'Uzraksti aprakstu.';
    return;
  }

  var sesija = await sb.auth.getSession();
  var lietotajs = sesija.data.session.user;

  var rezultats = await sb.from('seekers').insert({
    first_name: vards,
    last_name: uzvards === '' ? null : uzvards,
    contact: kontakti,
    description: apraksts,
    lat: izveletaVieta.lat,
    lon: izveletaVieta.lng,
    user_id: lietotajs.id
  });

  if (rezultats.error) {
    // Datubāzes limits (P0001): aizveram logu un parādām paziņojumu ekrāna vidū
    if (rezultats.error.code === 'P0001') {
      if (pagaiduPins) karte.removeLayer(pagaiduPins);
      seviLogs.close();
      paradiPazinojumu(LIMITA_TEKSTS, 4000);
      return;
    }
    sZinojums.textContent = latviskaKluda(rezultats.error);
    return;
  }

  if (pagaiduPins) karte.removeLayer(pagaiduPins);
  ieladetPinus();   // pārlādē visus pin'us no datubāzes

  document.getElementById('s-vards').value = '';
  document.getElementById('s-uzvards').value = '';
  document.getElementById('s-kontakti').value = '';
  document.getElementById('s-apraksts').value = '';
  seviLogs.close();
  paradiPazinojumu('✓ Sludinājums veiksmīgi pievienots!');
});


// ========== 7. MANS PROFILS (profils + mani sludinājumi) ==========

var maniLogs = document.getElementById('mani-logs');
var maniSaraksts = document.getElementById('mani-saraksts');
// Šeit ir VIENĪGĀ vieta, kur jāmaina kategorijas.
// No šī saraksta tiek izveidotas filtru pogas, izvēlne "Pievienot haltūru"
// un izvēlne sludinājumu rediģēšanā.
var kategorijas = [
  'Dārza darbi',
  'Malka un pagalms',
  'Sniega tīrīšana',
  'Pārvākšana un nešana',
  'Uzkopšana',
  'Sīki remonti',
  'Dzīvnieku pieskatīšana',
  'Citi'
];

// Aizpilda kategoriju izvēlni logā "Pievienot haltūru"
var hKategorijaIzvelne = document.getElementById('h-kategorija');
kategorijas.forEach(function (k) {
  var o = document.createElement('option');
  o.textContent = k;
  hKategorijaIzvelne.appendChild(o);
});

document.getElementById('btn-mani').addEventListener('click', function () {
  rodiProfilaTabu('sludinajumi');
  maniLogs.showModal();
  ieladetManus();
});
document.getElementById('btn-mani-aizvert').addEventListener('click', function () {
  maniLogs.close();
});

async function ieladetManus() {
  maniSaraksts.textContent = 'Ielādē...';

  var sesija = await sb.auth.getSession();
  if (!sesija.data.session) return;

  // Profila augšdaļa: e-pasts un avatārs ar e-pasta pirmo burtu
  var epasts = sesija.data.session.user.email || '';
  document.getElementById('profils-epasts').textContent = epasts;
  document.getElementById('profils-avatars').textContent =
    epasts ? epasts.charAt(0).toUpperCase() : '?';

  var lietotajaId = sesija.data.session.user.id;

  var rezultats = await sb.from('gigs')
    .select('*')
    .eq('user_id', lietotajaId)
    .order('created_at', { ascending: false });

  if (rezultats.error) {
    maniSaraksts.textContent = latviskaKluda(rezultats.error);
    return;
  }

  var meklejuRezultats = await sb.from('seekers')
    .select('*')
    .eq('user_id', lietotajaId)
    .order('created_at', { ascending: false });

  if (meklejuRezultats.error) {
    maniSaraksts.textContent = latviskaKluda(meklejuRezultats.error);
    return;
  }

  maniSaraksts.textContent = '';

  if (rezultats.data.length === 0 && meklejuRezultats.data.length === 0) {
    maniSaraksts.textContent = 'Tev vēl nav sludinājumu.';
    return;
  }

  rezultats.data.forEach(function (h) {
    maniSaraksts.appendChild(izveidotRindu(h));
  });
  meklejuRezultats.data.forEach(function (m) {
    maniSaraksts.appendChild(izveidotMeklejaRindu(m));
  });
}

// Izveido vienu sludinājuma rindu ar laukiem un pogām
function izveidotRindu(h) {
  var rinda = document.createElement('div');
  rinda.style.borderBottom = '1px solid #ddd';
  rinda.style.padding = '10px 0';

  // Ievietošanas laiks un atlikušās dienas
  var datums = new Date(h.created_at).toLocaleString('lv-LV');
  var dienas = Math.ceil((new Date(h.expires_at) - new Date()) / 86400000);
  var info = document.createElement('small');
  info.textContent = 'Pievienots: ' + datums + ' (beigsies pēc ' + dienas + ' d.)';
  if (h.hidden) info.textContent += ' – PASLĒPTS pēc lietotāju ziņojumiem';

  var nosaukumsLauks = document.createElement('input');
  nosaukumsLauks.value = h.title;

  var kategorijaLauks = document.createElement('select');
  kategorijas.forEach(function (k) {
    var o = document.createElement('option');
    o.textContent = k;
    if (k === h.category) o.selected = true;
    kategorijaLauks.appendChild(o);
  });

  // Ja sludinājumam ir vecā kategorija, kuras vairs nav sarakstā,
  // pievieno to, lai saglabājot kategorija netiktu nejauši nomainīta
  if (kategorijas.indexOf(h.category) === -1) {
    var vecaOpcija = document.createElement('option');
    vecaOpcija.textContent = h.category;
    vecaOpcija.selected = true;
    kategorijaLauks.appendChild(vecaOpcija);
  }

  var cenaLauks = document.createElement('input');
  cenaLauks.type = 'number';
  cenaLauks.value = h.price;
  cenaLauks.style.width = '70px';

  var kontaktiLauks = document.createElement('input');
  kontaktiLauks.value = h.contact || '';
  kontaktiLauks.placeholder = 'Kontaktinformācija (tālrunis vai e-pasts)';
  kontaktiLauks.maxLength = 150;
  kontaktiLauks.style.width = '100%';

  var aprakstsLauks = document.createElement('textarea');
  aprakstsLauks.value = h.description || '';
  aprakstsLauks.rows = 3;
  aprakstsLauks.maxLength = 500;
  aprakstsLauks.style.width = '100%';

  var btnSaglabat = document.createElement('button');
  btnSaglabat.textContent = 'Saglabāt';
  btnSaglabat.addEventListener('click', async function () {
    if (kontaktiLauks.value.trim() === '') {
      alert('Kontaktinformācija ir obligāta.');
      return;
    }
    if (!kontaktaVeids(kontaktiLauks.value)) {
      alert(KONTAKTU_KLUDA);
      return;
    }

    var r = await sb.from('gigs').update({
      title: nosaukumsLauks.value.trim(),
      category: kategorijaLauks.value,
      price: cenaLauks.value === '' ? null : Number(cenaLauks.value),
      contact: kontaktiLauks.value.trim(),
      description: aprakstsLauks.value.trim() || null
    }).eq('id', h.id);

    if (r.error) {
      alert(latviskaKluda(r.error));
    } else {
      alert('Saglabāts!');
      ieladetPinus();
    }
  });

  var btnDzest = document.createElement('button');
  btnDzest.textContent = 'Dzēst';
  btnDzest.addEventListener('click', async function () {
    if (!confirm('Tiešām dzēst šo sludinājumu?')) return;

    var r = await sb.from('gigs').delete().eq('id', h.id);

    if (r.error) {
      alert(latviskaKluda(r.error));
    } else {
      ieladetManus();
      ieladetPinus();
    }
  });

  rinda.append(info, document.createElement('br'),
    nosaukumsLauks, ' ', kategorijaLauks, ' ', cenaLauks, ' €',
    document.createElement('br'), kontaktiLauks,
    document.createElement('br'), aprakstsLauks,
    document.createElement('br'), btnSaglabat, ' ', btnDzest);

  return rinda;
}


// Izveido vienu darba meklētāja sludinājuma rindu ar laukiem un pogām
function izveidotMeklejaRindu(m) {
  var rinda = document.createElement('div');
  rinda.style.borderBottom = '1px solid #ddd';
  rinda.style.padding = '10px 0';

  var datums = new Date(m.created_at).toLocaleString('lv-LV');
  var dienas = Math.ceil((new Date(m.expires_at) - new Date()) / 86400000);
  var info = document.createElement('small');
  info.textContent = 'Darba meklētājs · Pievienots: ' + datums + ' (beigsies pēc ' + dienas + ' d.)';
  if (m.hidden) info.textContent += ' – PASLĒPTS';

  var vardsLauks = document.createElement('input');
  vardsLauks.value = m.first_name;
  vardsLauks.placeholder = 'Vārds';
  vardsLauks.maxLength = 50;

  var uzvardsLauks = document.createElement('input');
  uzvardsLauks.value = m.last_name || '';
  uzvardsLauks.placeholder = 'Uzvārds (nav obligāts)';
  uzvardsLauks.maxLength = 50;

  var kontaktiLauks = document.createElement('input');
  kontaktiLauks.value = m.contact;
  kontaktiLauks.placeholder = 'Kontaktinformācija';
  kontaktiLauks.maxLength = 150;

  var aprakstsLauks = document.createElement('textarea');
  aprakstsLauks.value = m.description || '';
  aprakstsLauks.rows = 3;
  aprakstsLauks.maxLength = 500;
  aprakstsLauks.style.width = '100%';

  var btnSaglabat = document.createElement('button');
  btnSaglabat.textContent = 'Saglabāt';
  btnSaglabat.addEventListener('click', async function () {
    if (vardsLauks.value.trim() === '' || kontaktiLauks.value.trim() === '' ||
        aprakstsLauks.value.trim() === '') {
      alert('Vārds, kontaktinformācija un apraksts ir obligāti.');
      return;
    }
    if (!kontaktaVeids(kontaktiLauks.value)) {
      alert(KONTAKTU_KLUDA);
      return;
    }

    var r = await sb.from('seekers').update({
      first_name: vardsLauks.value.trim(),
      last_name: uzvardsLauks.value.trim() || null,
      contact: kontaktiLauks.value.trim(),
      description: aprakstsLauks.value.trim()
    }).eq('id', m.id);

    if (r.error) {
      alert(latviskaKluda(r.error));
    } else {
      alert('Saglabāts!');
      ieladetPinus();
    }
  });

  var btnDzest = document.createElement('button');
  btnDzest.textContent = 'Dzēst';
  btnDzest.addEventListener('click', async function () {
    if (!confirm('Tiešām dzēst šo sludinājumu?')) return;

    var r = await sb.from('seekers').delete().eq('id', m.id);

    if (r.error) {
      alert(latviskaKluda(r.error));
    } else {
      ieladetManus();
      ieladetPinus();
    }
  });

  rinda.append(info, document.createElement('br'),
    vardsLauks, document.createElement('br'),
    uzvardsLauks, document.createElement('br'),
    kontaktiLauks, document.createElement('br'),
    aprakstsLauks,
    document.createElement('br'), btnSaglabat, ' ', btnDzest);

  return rinda;
}


// ========== 8. FILTRU PANELIS ==========

// Kategoriju pogas izveido no esošā saraksta
var chipsVieta = document.getElementById('f-kategorijas');

// IKONAS PIE KATEGORIJĀM
// Pie katras kategorijas ieraksti ceļu uz savu ikonu, piemēram:
//   'Dārza darbi': 'ikonas/darza-darbi.svg',
// Atstāj '' (tukšu), ja ikonas vēl nav. Nosaukumam jāsakrīt ar sarakstu "kategorijas".
var kategorijuIkonas = {
  'Dārza darbi': '',
  'Malka un pagalms': '',
  'Sniega tīrīšana': '',
  'Pārvākšana un nešana': '',
  'Uzkopšana': '',
  'Sīki remonti': '',
  'Dzīvnieku pieskatīšana': '',
  'Citi': ''
};

// Vai vismaz vienai kategorijai ir ikona? (ja jā, visām rezervē vietu, lai teksts sakrīt)
var irKadaIkona = Object.keys(kategorijuIkonas).some(function (k) {
  return kategorijuIkonas[k] !== '';
});

kategorijas.forEach(function (k) {
  var chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';

  // Ikona (pa kreisi)
  if (irKadaIkona) {
    var ikona;
    if (kategorijuIkonas[k]) {
      ikona = document.createElement('img');
      ikona.src = kategorijuIkonas[k];
      ikona.alt = '';
    } else {
      ikona = document.createElement('span');   // tukša vieta
    }
    ikona.className = 'chip-ikona';
    chip.appendChild(ikona);
  }

  // Nosaukums
  var teksts = document.createElement('span');
  teksts.className = 'chip-teksts';
  teksts.textContent = k;
  chip.appendChild(teksts);

  // Sludinājumu skaits šajā kategorijā (labajā pusē)
  var skaits = document.createElement('span');
  skaits.className = 'chip-skaits';
  skaits.dataset.kategorija = k;
  skaits.textContent = '0';
  chip.appendChild(skaits);

  // Ķeksītis (redzams tikai aktīvai kategorijai)
  var ok = document.createElement('span');
  ok.className = 'chip-ok';
  ok.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  chip.appendChild(ok);

  chip.addEventListener('click', function () {
    var vieta = izveletasKategorijas.indexOf(k);
    if (vieta === -1) {
      izveletasKategorijas.push(k);          // pievieno
      chip.classList.add('aktivs');
    } else {
      izveletasKategorijas.splice(vieta, 1); // noņem
      chip.classList.remove('aktivs');
    }
    pielietotFiltrus();
  });

  chipsVieta.appendChild(chip);
});

atjaunotKategorijuSkaitu();   // ja sludinājumi jau ielādēti, uzreiz uzliek skaitļus

// Katru reizi, kad lietotājs kaut ko ieraksta vai atzīmē, filtrus pielieto no jauna
['f-meklet', 'f-min', 'f-max'].forEach(function (id) {
  document.getElementById(id).addEventListener('input', pielietotFiltrus);
});
document.getElementById('f-apmaksatas').addEventListener('change', pielietotFiltrus);
document.getElementById('f-rodit-piedavajumus').addEventListener('change', pielietotFiltrus);
document.getElementById('f-rodit-mekletajus').addEventListener('change', pielietotFiltrus);

// Notīrīt visus filtrus
document.getElementById('btn-notirit').addEventListener('click', function () {
  document.getElementById('f-meklet').value = '';
  document.getElementById('f-min').value = '';
  document.getElementById('f-max').value = '';
  document.getElementById('f-apmaksatas').checked = false;
  document.getElementById('f-rodit-piedavajumus').checked = true;
  document.getElementById('f-rodit-mekletajus').checked = true;
  izveletasKategorijas = [];
  document.querySelectorAll('.chip').forEach(function (c) {
    c.classList.remove('aktivs');
  });
  pielietotFiltrus();
});

// Telefonā: poga "Filtri" atver un aizver paneli
document.getElementById('btn-filtri').addEventListener('click', function () {
  document.getElementById('filtri-panel').classList.toggle('atverts');
});


// ========== 9. MANA ATRAŠANĀS VIETA ==========

var manaVieta = null;         // zilais punkts
var manaPrecizitate = null;   // aplis, kas rāda noteikšanas precizitāti
var automatiskaMeklesana = true;   // true, kamēr notiek meklēšana lapas atverot

// Kad vieta ir atrasta, uzzīmē punktu
karte.on('locationfound', function (e) {
  automatiskaMeklesana = false;
  if (manaVieta) {
    karte.removeLayer(manaVieta);
    karte.removeLayer(manaPrecizitate);
  }

  // e.accuracy ir precizitāte metros
  manaPrecizitate = L.circle(e.latlng, {
    radius: e.accuracy,
    color: '#5b2a9e',
    weight: 1,
    fillOpacity: 0.1
  }).addTo(karte);

  manaVieta = L.circleMarker(e.latlng, {
    radius: 8,
    color: 'white',
    weight: 3,
    fillColor: '#2a7de1',
    fillOpacity: 1
  }).addTo(karte).bindPopup('Tu esi šeit');
});

// Ja neizdodas (piem. lietotājs atteica atļauju)
karte.on('locationerror', function () {
  // Ja lietotājs neļāva vai vieta nav pieejama lapas atverot, klusi paliekam pie Rīgas
  if (automatiskaMeklesana) {
    automatiskaMeklesana = false;
    return;
  }
  alert('Neizdevās noteikt atrašanās vietu. Pārbaudi, vai pārlūkam ir atļauta piekļuve atrašanās vietai.');
});

// Lapas atverot, uzreiz mēģina noteikt atrašanās vietu
karte.locate({ setView: true, maxZoom: 15 });


// ========== 10. ZIŅOŠANA PAR SLUDINĀJUMU ==========

var zinotLogs = document.getElementById('zinot-logs');
var zZinojums = document.getElementById('z-zinojums');
var zinojamaisId = null;   // sludinājums, par kuru šobrīd ziņo
var zinojamaisVeids = 'haltura';   // 'haltura' vai 'meklejs'

// Pārlūka "ierīces ID": nejaušs teksts, kas saglabājas šajā pārlūkā.
// Tas palīdz atšķirt dažādas ierīces (pilnībā neuzticams, tāpēc lietojam kopā ar IP un kontu).
function iegutIericesId() {
  try {
    var id = localStorage.getItem('ierices_id');
    if (!id) {
      id = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now()) + '-' + Math.random().toString(36).slice(2);
      localStorage.setItem('ierices_id', id);
    }
    return id;
  } catch (e) {
    return null;
  }
}

async function atvertZinosanu(id, veids) {
  var sesija = await sb.auth.getSession();

  if (!sesija.data.session) {
    atvertAuth('login', 'Lai ziņotu par sludinājumu, jāpieslēdzas.');
    return;
  }

  zinojamaisId = id;
  zinojamaisVeids = veids || 'haltura';
  zZinojums.textContent = '';
  document.getElementById('z-komentars').value = '';
  zinotLogs.showModal();
}

document.getElementById('btn-z-atcelt').addEventListener('click', function () {
  zinotLogs.close();
});

document.getElementById('btn-z-sutit').addEventListener('click', async function () {
  var iemesls = document.getElementById('z-iemesls').value;
  var komentars = document.getElementById('z-komentars').value.trim();

  var dati = {
    reason: iemesls,
    comment: komentars === '' ? null : komentars,
    device_id: iegutIericesId()
  };
  // Par haltūrām ziņojumi iet tabulā "reports", par darba meklētājiem tabulā "seeker_reports"
  var tabula;
  if (zinojamaisVeids === 'meklejs') {
    tabula = 'seeker_reports';
    dati.seeker_id = zinojamaisId;
  } else {
    tabula = 'reports';
    dati.gig_id = zinojamaisId;
  }

  var rezultats = await sb.from(tabula).insert(dati);

  if (rezultats.error) {
    if (rezultats.error.code === '23505') {
      zZinojums.textContent = 'Tu jau esi ziņojis par šo sludinājumu.';
    } else {
      zZinojums.textContent = latviskaKluda(rezultats.error);
    }
    return;
  }

  zinotLogs.close();
  alert('Paldies! Ziņojums nosūtīts.');
});


// ========== 11. FAVORĪTI ==========

// Ielasa lietotāja favorītu id (lai zvaigznītes būtu pareizi aizpildītas)
async function ieladetFavoritusId() {
  var r = await sb.from('favorites').select('gig_id');
  if (r.error) {
    console.error('Favorīti:', r.error.message);
    return;
  }
  manaFavoriti = new Set(r.data.map(function (f) { return f.gig_id; }));
}

// Pievieno vai noņem favorītu. Atgriež true, ja izdevās.
async function pargretFavoritu(gigId) {
  var sesija = await sb.auth.getSession();
  if (!sesija.data.session) {
    atvertAuth('login', 'Lai saglabātu favorītus, jāpieslēdzas.');
    return false;
  }
  var lietotajaId = sesija.data.session.user.id;

  if (manaFavoriti.has(gigId)) {
    var d = await sb.from('favorites').delete()
      .eq('gig_id', gigId)
      .eq('user_id', lietotajaId);
    if (d.error) {
      paradiPazinojumu(latviskaKluda(d.error), 3500);
      return false;
    }
    manaFavoriti.delete(gigId);
  } else {
    var i = await sb.from('favorites').insert({ gig_id: gigId, user_id: lietotajaId });
    if (i.error) {
      paradiPazinojumu(latviskaKluda(i.error), 3500);
      return false;
    }
    manaFavoriti.add(gigId);
  }

  // Ja favorītu saraksts profilā ir atvērts, atsvaidzina to
  if (maniLogs.open && !document.getElementById('panelis-favoriti').hidden) {
    ieladetFavoritus();
  }
  return true;
}

// Atver sludinājumu kartē: pārceļ karti uz pin'u un atver tā kartīti
async function atvertSludinajumu(id) {
  maniLogs.close();
  document.getElementById('filtri-panel').classList.remove('atverts');

  var atrasts = visasHalturas.some(function (g) { return g.id === id; });
  if (!atrasts) {
    await ieladetPinus();   // varbūt sludinājums pievienots pēc lapas ielādes
    atrasts = visasHalturas.some(function (g) { return g.id === id; });
  }
  if (!atrasts) {
    paradiPazinojumu('Šis sludinājums vairs nav pieejams.', 3500);
    return;
  }

  var pins = pinuMarkeri[id];
  if (!pins) {
    // Pin'š ir paslēpts ar filtriem: notīra filtrus
    document.getElementById('btn-notirit').click();
    pins = pinuMarkeri[id];
  }
  if (!pins) return;

  karte.setView(pins.getLatLng(), Math.max(karte.getZoom(), 15), { animate: false });
  pins.openPopup();
}

// Ielasa un parāda favorītu sarakstu profilā
async function ieladetFavoritus() {
  var vieta = document.getElementById('favoritu-saraksts');
  vieta.textContent = 'Ielādē...';

  var r = await sb.from('favorites')
    .select('gig_id, created_at, gigs(*)')
    .order('created_at', { ascending: false });

  if (r.error) {
    vieta.textContent = latviskaKluda(r.error);
    return;
  }

  // Atstāj tikai sludinājumus, kas vēl pastāv un nav paslēpti vai beigušies
  var saraksts = r.data
    .map(function (f) { return f.gigs; })
    .filter(function (g) {
      return g && !g.hidden && new Date(g.expires_at).getTime() > Date.now();
    });

  vieta.textContent = '';

  if (saraksts.length === 0) {
    vieta.textContent = 'Tev vēl nav favorītu. Uzspied ☆ uz sludinājuma kartē, lai to saglabātu šeit.';
    return;
  }

  saraksts.forEach(function (h) {
    var kartite = izveidotKartiti(h, { popup: false });
    kartite.atjaunotAttalumu();

    // Visa kartīte ir uzspiežama: aizved uz pin'u kartē
    var kaste = document.createElement('div');
    kaste.className = 'favorita-karte';
    kaste.tabIndex = 0;
    kaste.setAttribute('role', 'button');
    kaste.appendChild(kartite.sakne);

    kaste.addEventListener('click', function () { atvertSludinajumu(h.id); });
    kaste.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') atvertSludinajumu(h.id);
    });

    vieta.appendChild(kaste);
  });
}

// Profila cilnes: "Mani sludinājumi" | "Favorīti"
function rodiProfilaTabu(tabs) {
  var favoriti = (tabs === 'favoriti');
  document.getElementById('panelis-sludinajumi').hidden = favoriti;
  document.getElementById('panelis-favoriti').hidden = !favoriti;
  document.getElementById('tab-sludinajumi').classList.toggle('aktivs', !favoriti);
  document.getElementById('tab-favoriti').classList.toggle('aktivs', favoriti);
  if (favoriti) ieladetFavoritus();
}

document.getElementById('tab-sludinajumi').addEventListener('click', function () {
  rodiProfilaTabu('sludinajumi');
});
document.getElementById('tab-favoriti').addEventListener('click', function () {
  rodiProfilaTabu('favoriti');
});


// ========== 12. KONTA DZĒŠANA ==========

var dzestKontaLogs  = document.getElementById('dzest-konta-logs');
var dzestCheckbox   = document.getElementById('dzest-checkbox');
var dzestPoga       = document.getElementById('btn-dzest-apstiprinat');
var dzestZinojums   = document.getElementById('dzest-zinojums');

// "Dzēst kontu" profilā: aizver profilu un atver apstiprinājuma logu
document.getElementById('btn-dzest-kontu').addEventListener('click', function () {
  maniLogs.close();
  dzestCheckbox.checked = false;
  dzestPoga.disabled = true;
  paradiZinojumu(dzestZinojums, '');
  dzestKontaLogs.showModal();
});

// Dzēšanas poga ieslēdzas tikai tad, kad atzīmēts "Es saprotu..."
dzestCheckbox.addEventListener('change', function () {
  dzestPoga.disabled = !dzestCheckbox.checked;
});

document.getElementById('btn-dzest-atcelt').addEventListener('click', function () {
  dzestKontaLogs.close();
});

dzestPoga.addEventListener('click', async function () {
  dzestPoga.disabled = true;
  dzestPoga.textContent = 'Dzēšu...';
  paradiZinojumu(dzestZinojums, '');

  // Datubāzes funkcija "dzest_manu_kontu" (sk. failu supabase-konta-dzesana.sql)
  // izdzēš lietotāja sludinājumus, favorītus un pašu kontu
  var rezultats;
  try {
    rezultats = await sb.rpc('dzest_manu_kontu');
  } catch (err) {
    rezultats = { error: err };
  }

  dzestPoga.textContent = 'Dzēst kontu';

  if (rezultats.error) {
    dzestPoga.disabled = false;
    paradiZinojumu(dzestZinojums, latviskaKluda(rezultats.error));
    return;
  }

  // Konts vairs neeksistē: notīra sesiju šajā pārlūkā
  try {
    await sb.auth.signOut({ scope: 'local' });
  } catch (err) {
    console.error('Izrakstīšanās pēc konta dzēšanas:', err);
  }

  dzestKontaLogs.close();
  ieladetPinus();
  paradiPazinojumu('Tavs konts ir izdzēsts.', 4000);
});


// ---------- Logi aizveras, uzspiežot ārpus loga ----------
// Uzspiežot uz tumšā fona ap logu, logs aizveras (tas pats, kas pogai "Aizvērt"/"Atcelt").
// Ja peli nospiež logā (piem., iezīmējot tekstu) un atlaiž ārpus tā, logs NEaizveras.
document.querySelectorAll('dialog').forEach(function (logs) {
  var nospiestsArpus = false;

  function irArpusLoga(e) {
    var r = logs.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right ||
           e.clientY < r.top  || e.clientY > r.bottom;
  }

  logs.addEventListener('pointerdown', function (e) {
    nospiestsArpus = (e.target === logs) && irArpusLoga(e);
  });

  logs.addEventListener('click', function (e) {
    if (e.target === logs && nospiestsArpus && irArpusLoga(e)) {
      logs.close();
    }
    nospiestsArpus = false;
  });
});