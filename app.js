// ========== 1. SAVIENOJUMS AR SUPABASE ==========

var SUPABASE_URL = 'https://skyfwmjjchvjnudhrjea.supabase.co';
var SUPABASE_KEY = 'sb_publishable_5l6XZiifoA22UkH9cHz54Q_pKs5kHbQ';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


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

// Pieslēgtā lietotāja id (null, ja nav pieslēdzies). To atjauno sadaļā 5.
var manaLietotajaId = null;

// Pārvērš tekstu drošā formā (lai neviens nevar ievietot savu kodu)
function drosiTeksts(teksts) {
  var d = document.createElement('div');
  d.textContent = teksts;
  return d.innerHTML;
}

// Atsevišķs slānis pin'iem, lai tos var notīrīt un ielādēt no jauna
var pinuSlanis = L.layerGroup().addTo(karte);

function pievienotPinu(platums, garums, nosaukums, cena, apraksts, id, lietotajaId) {
  var teksts =
    '<div class="popup-nosaukums">' + drosiTeksts(nosaukums) + '</div>' +
    '<div class="popup-cena">' + drosiTeksts(cena) + '€</div>';

  // Aprakstu rāda tikai tad, ja tas ir ierakstīts
  if (apraksts) {
    teksts += '<div class="popup-apraksts">' + drosiTeksts(apraksts) + '</div>';
  }

  // Popup saturu veidojam kā elementu, lai varētu pievienot pogu "Ziņot"
  var saturs = document.createElement('div');
  saturs.innerHTML = teksts;

  var btnZinot = document.createElement('button');
  btnZinot.type = 'button';
  btnZinot.className = 'zinot-btn';
  btnZinot.textContent = '⚑ Ziņot';
  btnZinot.addEventListener('click', function () {
    atvertZinosanu(id);
  });
  saturs.appendChild(btnZinot);

  // Vai šis sludinājums pieder pieslēgtajam lietotājam?
  var irMans = manaLietotajaId !== null && lietotajaId === manaLietotajaId;

  L.marker([platums, garums], {
    icon: irMans ? pinaIkonaMana : pinaIkona,
    zIndexOffset: irMans ? 1000 : 0     // savi pin'i vienmēr virs pārējiem
  })
    .addTo(pinuSlanis)
    .bindPopup(saturs);
}


// ========== 4. DATU IELASĪŠANA UN FILTRI ==========

var visasHalturas = [];          // visas ielasītās haltūras
var izveletasKategorijas = [];   // kategorijas, ko lietotājs atzīmējis

async function ieladetPinus() {
  var rezultats = await sb.from('gigs').select('*').eq('hidden', false);

  if (rezultats.error) {
    console.error('Kļūda:', rezultats.error.message);
    document.getElementById('f-rezultati').textContent =
      'Neizdevās ielādēt haltūras. ' + latviskaKluda(rezultats.error);
    return;
  }

  visasHalturas = rezultats.data;   // iegaumējam visu sarakstu
  pielietotFiltrus();               // un parādām to, kas atbilst filtriem
}

// Atlasa haltūras pēc filtriem un uzliek pin'us kartē
function pielietotFiltrus() {
  var meklet = document.getElementById('f-meklet').value.trim().toLowerCase();
  var min = document.getElementById('f-min').value;
  var max = document.getElementById('f-max').value;
  var tikaiApmaksatas = document.getElementById('f-apmaksatas').checked;

  var atlasitas = visasHalturas.filter(function (h) {

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

  pinuSlanis.clearLayers();
  atlasitas.forEach(function (h) {
    pievienotPinu(h.lat, h.lon, h.title, h.price, h.description, h.id, h.user_id);
  });

  document.getElementById('f-rezultati').textContent =
    'Atrastas haltūras: ' + atlasitas.length;
}

ieladetPinus();


// ========== 5. REĢISTRĀCIJA UN PIESLĒGŠANĀS ==========

var authLogs          = document.getElementById('auth-logs');
var loginSkats        = document.getElementById('auth-login-skats');
var registerSkats     = document.getElementById('auth-register-skats');
var loginZinojums     = document.getElementById('login-zinojums');
var registerZinojums  = document.getElementById('reg-zinojums');

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

// Parāda vienu no diviem skatiem: 'login' vai 'register'
function rutaAuthSkats(skats) {
  loginSkats.hidden    = (skats !== 'login');
  registerSkats.hidden = (skats !== 'register');
  paradiZinojumu(loginZinojums, '');
  paradiZinojumu(registerZinojums, '');
}

// Atver logu. Pēc noklusējuma rāda pieslēgšanos.
// teksts (nav obligāts) ir paskaidrojums, piem. "Lai ziņotu, jāpieslēdzas."
function atvertAuth(skats, teksts) {
  skats = skats || 'login';
  rutaAuthSkats(skats);
  if (teksts) {
    paradiZinojumu(skats === 'login' ? loginZinojums : registerZinojums, teksts, 'info');
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

document.getElementById('btn-iziet').addEventListener('click', async function () {
  await sb.auth.signOut();
});

// Seko, vai lietotājs ir pieslēdzies, un parāda pareizās pogas
sb.auth.onAuthStateChange(function (notikums, sesija) {
  var pieslegts = sesija !== null;
  manaLietotajaId = pieslegts ? sesija.user.id : null;
  if (visasHalturas.length > 0) pielietotFiltrus();   // pārzīmē pin'us, lai savi sludinājumi iegūtu dzelteno apmali
  document.getElementById('btn-pieslegties').style.display = pieslegts ? 'none' : 'inline-block';
  document.getElementById('btn-iziet').style.display = pieslegts ? 'inline-block' : 'none';
  document.getElementById('btn-mani').style.display = pieslegts ? 'inline-block' : 'none';
  document.getElementById('btn-pievienot').style.display = pieslegts ? 'inline-block' : 'none';
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

document.getElementById('btn-pievienot').addEventListener('click', async function () {
  var sesija = await sb.auth.getSession();

  if (!sesija.data.session) {
    atvertAuth('login', 'Lai pievienotu haltūru, jāpieslēdzas.');
    return;
  }

  // Pārbauda, vai lietotājam jau nav pieļaujamais sludinājumu skaits
  var skaits = await sb.from('gigs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', sesija.data.session.user.id);

  if (!skaits.error && skaits.count >= MAKS_SLUDINAJUMI) {
    paradiPazinojumu(LIMITA_TEKSTS, 4000);
    return;
  }

  gaidaKlikski = true;
  alert('Uzklikšķini kartē vietā, kur ir haltūra.');
});

karte.on('click', function (e) {
  if (!gaidaKlikski) return;
  gaidaKlikski = false;
  izveletaVieta = e.latlng;

  if (pagaiduPins) karte.removeLayer(pagaiduPins);
  pagaiduPins = L.marker(e.latlng).addTo(karte);

  hZinojums.textContent = '';
  halturaLogs.showModal();
});

document.getElementById('btn-atcelt').addEventListener('click', function () {
  halturaLogs.close();
  if (pagaiduPins) karte.removeLayer(pagaiduPins);
});

document.getElementById('btn-saglabat').addEventListener('click', async function () {
  var nosaukums = document.getElementById('h-nosaukums').value.trim();
  var kategorija = document.getElementById('h-kategorija').value;
  var cena = document.getElementById('h-cena').value;
  var apraksts = document.getElementById('h-apraksts').value.trim();

  if (nosaukums === '') {
    hZinojums.textContent = 'Ieraksti nosaukumu.';
    return;
  }

  var sesija = await sb.auth.getSession();
  var lietotajs = sesija.data.session.user;

  var rezultats = await sb.from('gigs').insert({
    title: nosaukums,
    category: kategorija,
    price: cena === '' ? null : Number(cena),
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
  document.getElementById('h-apraksts').value = '';
  halturaLogs.close();
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

  var rezultats = await sb.from('gigs')
    .select('*')
    .eq('user_id', sesija.data.session.user.id)
    .order('created_at', { ascending: false });

  if (rezultats.error) {
    maniSaraksts.textContent = latviskaKluda(rezultats.error);
    return;
  }

  maniSaraksts.textContent = '';

  if (rezultats.data.length === 0) {
    maniSaraksts.textContent = 'Tev vēl nav sludinājumu.';
    return;
  }

  rezultats.data.forEach(function (h) {
    maniSaraksts.appendChild(izveidotRindu(h));
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

  var aprakstsLauks = document.createElement('textarea');
  aprakstsLauks.value = h.description || '';
  aprakstsLauks.rows = 3;
  aprakstsLauks.maxLength = 500;
  aprakstsLauks.style.width = '100%';

  var btnSaglabat = document.createElement('button');
  btnSaglabat.textContent = 'Saglabāt';
  btnSaglabat.addEventListener('click', async function () {
    var r = await sb.from('gigs').update({
      title: nosaukumsLauks.value.trim(),
      category: kategorijaLauks.value,
      price: cenaLauks.value === '' ? null : Number(cenaLauks.value),
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
    document.createElement('br'), aprakstsLauks,
    document.createElement('br'), btnSaglabat, ' ', btnDzest);

  return rinda;
}


// ========== 8. FILTRU PANELIS ==========

// Kategoriju pogas izveido no esošā saraksta
var chipsVieta = document.getElementById('f-kategorijas');

kategorijas.forEach(function (k) {
  var chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  chip.textContent = k;

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

// Katru reizi, kad lietotājs kaut ko ieraksta vai atzīmē, filtrus pielieto no jauna
['f-meklet', 'f-min', 'f-max'].forEach(function (id) {
  document.getElementById(id).addEventListener('input', pielietotFiltrus);
});
document.getElementById('f-apmaksatas').addEventListener('change', pielietotFiltrus);

// Notīrīt visus filtrus
document.getElementById('btn-notirit').addEventListener('click', function () {
  document.getElementById('f-meklet').value = '';
  document.getElementById('f-min').value = '';
  document.getElementById('f-max').value = '';
  document.getElementById('f-apmaksatas').checked = false;
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

async function atvertZinosanu(id) {
  var sesija = await sb.auth.getSession();

  if (!sesija.data.session) {
    atvertAuth('login', 'Lai ziņotu par sludinājumu, jāpieslēdzas.');
    return;
  }

  zinojamaisId = id;
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

  var rezultats = await sb.from('reports').insert({
    gig_id: zinojamaisId,
    reason: iemesls,
    comment: komentars === '' ? null : komentars,
    device_id: iegutIericesId()
  });

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