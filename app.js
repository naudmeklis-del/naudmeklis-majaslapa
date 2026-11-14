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

// Pārvērš tekstu drošā formā (lai neviens nevar ievietot savu kodu)
function drosiTeksts(teksts) {
  var d = document.createElement('div');
  d.textContent = teksts;
  return d.innerHTML;
}

// Atsevišķs slānis pin'iem, lai tos var notīrīt un ielādēt no jauna
var pinuSlanis = L.layerGroup().addTo(karte);

function pievienotPinu(platums, garums, nosaukums, cena, apraksts, id) {
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

  L.marker([platums, garums], { icon: pinaIkona })
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
    pievienotPinu(h.lat, h.lon, h.title, h.price, h.description, h.id);
  });

  document.getElementById('f-rezultati').textContent =
    'Atrastas haltūras: ' + atlasitas.length;
}

ieladetPinus();


// ========== 5. REĢISTRĀCIJA UN PIESLĒGŠANĀS ==========

var authLogs = document.getElementById('auth-logs');
var zinojums = document.getElementById('auth-zinojums');

document.getElementById('btn-pieslegties').addEventListener('click', function () {
  zinojums.textContent = '';
  authLogs.showModal();
});
document.getElementById('btn-aizvert').addEventListener('click', function () {
  authLogs.close();
});

document.getElementById('btn-register').addEventListener('click', async function () {
  var epasts = document.getElementById('epasts').value;
  var parole = document.getElementById('parole').value;

  var rezultats = await sb.auth.signUp({ email: epasts, password: parole });

  if (rezultats.error) {
    zinojums.textContent = 'Kļūda: ' + rezultats.error.message;
  } else if (rezultats.data.session) {
    authLogs.close();
  } else {
    zinojums.textContent = 'Reģistrācija izdevās! Pārbaudi e-pastu un uzspied apstiprinājuma saiti, tad pieslēdzies.';
  }
});

document.getElementById('btn-login').addEventListener('click', async function () {
  var epasts = document.getElementById('epasts').value;
  var parole = document.getElementById('parole').value;

  var rezultats = await sb.auth.signInWithPassword({ email: epasts, password: parole });

  if (rezultats.error) {
    zinojums.textContent = 'Kļūda: ' + rezultats.error.message;
  } else {
    authLogs.close();
  }
});

document.getElementById('btn-iziet').addEventListener('click', async function () {
  await sb.auth.signOut();
});

// Seko, vai lietotājs ir pieslēdzies, un parāda pareizās pogas
sb.auth.onAuthStateChange(function (notikums, sesija) {
  var pieslegts = sesija !== null;
  document.getElementById('btn-pieslegties').style.display = pieslegts ? 'none' : 'inline-block';
  document.getElementById('btn-iziet').style.display = pieslegts ? 'inline-block' : 'none';
  document.getElementById('btn-mani').style.display = pieslegts ? 'inline-block' : 'none';
});


// ========== 6. HALTŪRAS PIEVIENOŠANA ==========

var halturaLogs = document.getElementById('haltura-logs');
var hZinojums = document.getElementById('h-zinojums');
var gaidaKlikski = false;
var izveletaVieta = null;
var pagaiduPins = null;

document.getElementById('btn-pievienot').addEventListener('click', async function () {
  var sesija = await sb.auth.getSession();

  if (!sesija.data.session) {
    zinojums.textContent = 'Lai pievienotu haltūru, jāpieslēdzas.';
    authLogs.showModal();
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
    hZinojums.textContent = 'Kļūda: ' + rezultats.error.message;
    return;
  }

  if (pagaiduPins) karte.removeLayer(pagaiduPins);
  ieladetPinus();   // pārlādē visus pin'us no datubāzes

  document.getElementById('h-nosaukums').value = '';
  document.getElementById('h-cena').value = '';
  document.getElementById('h-apraksts').value = '';
  halturaLogs.close();
});


// ========== 7. MANI SLUDINĀJUMI ==========

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

  var rezultats = await sb.from('gigs')
    .select('*')
    .eq('user_id', sesija.data.session.user.id)
    .order('created_at', { ascending: false });

  if (rezultats.error) {
    maniSaraksts.textContent = 'Kļūda: ' + rezultats.error.message;
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
      alert('Kļūda: ' + r.error.message);
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
      alert('Kļūda: ' + r.error.message);
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
    zinojums.textContent = 'Lai ziņotu par sludinājumu, jāpieslēdzas.';
    authLogs.showModal();
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
      zZinojums.textContent = 'Kļūda: ' + rezultats.error.message;
    }
    return;
  }

  zinotLogs.close();
  alert('Paldies! Ziņojums nosūtīts.');
});