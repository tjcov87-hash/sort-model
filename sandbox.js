// ── ALL INPUTS ──
const ids = {
  // Shared
  chutes:   's-chutes',   dpc:     's-dpc',
  sorthrs:  's-sorthrs',  pkgs:    's-pkgs',
  opdays:   's-opdays',
  // Left (sort worker)
  currdist: 'l-currdist', futdist:  'l-futdist',
  rate:     'l-rate',     fixed:    'l-fixed',
  speed:    'l-speed',    sections: 'l-sections',
  // Right (business case)
  loadtime: 'r-loadtime', delrate:  'r-delrate',
  cbase: 'r-cbase',
  fbase: 'r-fbase', fperf: 'r-fperf', fmdpct: 'r-fmdpct', fmddis: 'r-fmddis',
};

const get = id => +document.getElementById(id).value;

function fmt(n, dec=0) {
  if (n === undefined || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return sign + '$' + (abs/1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return sign + '$' + abs.toLocaleString('en-AU', {maximumFractionDigits:dec});
  return sign + '$' + abs.toFixed(dec > 0 ? dec : 2);
}

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function updateAll() {
  // ── SHARED ──
  const chutes  = get('s-chutes');
  const dpc     = get('s-dpc');
  const sorthrs = get('s-sorthrs');
  const pkgs    = get('s-pkgs');
  const opdays  = get('s-opdays');
  const totalDrivers = chutes * dpc;
  const pkgsPerChute = dpc * pkgs;

  set('sv-chutes',  chutes);
  set('sv-dpc',     dpc);
  set('sv-sorthrs', sorthrs + 'h');
  set('sv-pkgs',    pkgs);
  set('sv-opdays',  opdays);
  set('sv-totaldrivers', totalDrivers.toLocaleString());
  set('sv-totalpkgs', (totalDrivers * pkgs).toLocaleString());

  // ── SORT WORKER MODEL ──
  const currDist   = get('l-currdist');
  const futDist    = get('l-futdist');
  const sortRate   = get('l-rate');
  const fixedTime  = get('l-fixed');
  const speed      = get('l-speed');
  const sections   = get('l-sections');

  set('lv-currdist', currDist.toFixed(1) + 'm');
  set('lv-futdist',  futDist.toFixed(1) + 'm');
  set('lv-rate',     '$' + sortRate.toFixed(sortRate % 1 === 0 ? 0 : 1));
  set('lv-fixed',    fixedTime + 's');
  set('lv-speed',    speed.toFixed(1) + ' m/s');
  set('lv-sections', sections);

  const currT          = fixedTime + 2 * currDist / speed;
  const currPkgHr      = 3600 / currT;
  const currWRaw       = pkgsPerChute / (sorthrs * currPkgHr);
  const currW          = Math.ceil(currWRaw);

  const futT           = fixedTime + 2 * futDist / speed;
  const futPkgHr       = 3600 / futT;
  const futWRaw        = pkgsPerChute / (sorthrs * futPkgHr);
  const futW           = Math.ceil(futWRaw);

  const extraPerChute  = futW - currW;
  const totalExtra     = extraPerChute * chutes;
  const overheadPct    = ((futW - currW) / currW * 100).toFixed(0);
  const extraSortCostDay  = Math.max(0, totalExtra) * sorthrs * sortRate;
  const extraSortCostYear = extraSortCostDay * opdays;

  const T_max   = (currW * sorthrs * 3600) / pkgsPerChute;
  const maxWalk = Math.max(0, (T_max - fixedTime) * speed / 2);

  set('lr-currT',       currT.toFixed(1) + 's');
  set('lr-currPkgHr',   Math.round(currPkgHr) + ' pkgs/worker/hr');
  set('lr-currW',       currWRaw.toFixed(2) + ' → ' + currW);
  set('lr-pkgschute',   pkgsPerChute.toLocaleString() + ' pkgs / chute');
  set('lr-futT',        futT.toFixed(1) + 's');
  set('lr-futPkgHr',    Math.round(futPkgHr) + ' pkgs/worker/hr');
  set('lr-futW',        futWRaw.toFixed(2) + ' → ' + futW);
  set('lr-bins',        (dpc * sections) + ' sort bins / chute');
  set('lr-extraPerChute', (extraPerChute >= 0 ? '+' : '') + extraPerChute + ' worker' + (Math.abs(extraPerChute)!==1?'s':''));
  set('lr-extraTotal',  (totalExtra >= 0 ? '+' : '') + totalExtra + ' workers total');
  set('lr-overhead',    (extraPerChute >= 0 ? '+' : '') + overheadPct + '%');
  set('lr-target',      maxWalk.toFixed(2) + 'm');

  const targetBox    = document.getElementById('l-targetbox');
  const targetEl     = document.getElementById('lr-target');
  const statusEl     = document.getElementById('lr-targetstatus');
  if (futDist <= maxWalk) {
    targetBox.style.background  = 'var(--green-dim)';
    targetBox.style.border      = '1px solid var(--green-border)';
    targetEl.style.color        = 'var(--green)';
    statusEl.style.color        = 'var(--green)';
    statusEl.textContent        = `✓ ${futDist.toFixed(1)}m is within target — no extra workers needed`;
  } else {
    const over = (futDist - maxWalk).toFixed(2);
    targetBox.style.background  = 'var(--orange-dim)';
    targetBox.style.border      = '1px solid var(--orange-border)';
    targetEl.style.color        = 'var(--orange)';
    statusEl.style.color        = 'var(--orange)';
    statusEl.textContent        = `⚠ ${futDist.toFixed(1)}m exceeds target by ${over}m — needs ${extraPerChute} extra worker(s) / chute`;
  }

  // connector
  set('conn-value', fmt(extraSortCostDay) + '/day');

  // ── BUSINESS CASE ──
  const loadMins    = get('r-loadtime');
  const delRate     = get('r-delrate');

  // Current rate structure — flat rate only
  const cBase    = get('r-cbase') / 100;
  const currRate = cBase;

  // Future rate structure
  const fBase    = get('r-fbase') / 100;
  const fPerf    = get('r-fperf') / 100;
  const fMdPct   = get('r-fmdpct') / 100;
  const fMdDis   = get('r-fmddis') / 100;
  const futRate  = fBase * (1 + fPerf) * (1 - fMdPct * fMdDis);

  set('rv-loadtime', loadMins + ' min');
  set('rv-delrate',  delRate + ' p/h');

  // Display slider values
  set('rv-cbase',  '$' + cBase.toFixed(2));
  set('rv-fbase',  '$' + fBase.toFixed(2));
  set('rv-fperf',  get('r-fperf') + '%');
  set('rv-fmdpct', get('r-fmdpct') + '%');
  set('rv-fmddis', get('r-fmddis') + '%');

  // Future blended rate badge
  set('fut-formula',  `$${fBase.toFixed(2)} × ${(1+fPerf).toFixed(2)} × (1 − ${(fMdPct*100).toFixed(0)}%×${(fMdDis*100).toFixed(0)}%)`);
  set('rv-futblended',  '$' + futRate.toFixed(3) + '/pkg');

  const currentLoadHrs  = 1.5;  // fixed baseline
  const targetLoadHrs   = loadMins / 60;
  const timeFree        = Math.max(0, currentLoadHrs - targetLoadHrs);
  const extraPkgs       = Math.round(timeFree * delRate);
  const futurePkgs      = pkgs + extraPkgs;
  const totalExtraYr    = totalDrivers * extraPkgs * opdays;

  const currentDP       = pkgs * currRate;
  const futureDP        = futurePkgs * futRate;
  const dpGain          = futureDP - currentDP;
  const dpGainYr        = dpGain * totalDrivers * opdays;
  const breakeven       = currentDP / futurePkgs;

  const networkCurrDay  = totalDrivers * pkgs * currRate;
  const networkFutDay   = totalDrivers * pkgs * futRate;
  const rateSaveDay     = networkCurrDay - networkFutDay; // same baseline volume — rate drop only
  const netSaveDay      = rateSaveDay - extraSortCostDay;
  const netSaveYear     = netSaveDay * opdays;

  set('rr-timefree',   timeFree.toFixed(1) + ' hr' + (timeFree !== 1 ? 's' : ''));
  set('rr-extrapkgs',  extraPkgs);
  set('rr-extrapkgsyr', totalExtraYr >= 1e6
    ? (totalExtraYr/1e6).toFixed(2) + 'M extra / year'
    : totalExtraYr.toLocaleString() + ' extra / year');
  set('rr-dpearnings', fmt(futureDP));
  set('rr-dpgain',     (dpGain>=0?'+':'') + fmt(dpGain) + ' (' + (dpGain/currentDP*100).toFixed(1) + '%) vs today');
  set('rr-breakeven',  '$' + breakeven.toFixed(2));
  set('rr-sortcost',   fmt(extraSortCostDay));
  set('rr-ratesave',   fmt(rateSaveDay));
  set('rr-netsaveyear', fmt(netSaveYear) + ' / year');
  set('rr-netsaveday',  fmt(netSaveDay) + ' / day');
  set('rr-dpyear',     dpGainYr >= 1e6
    ? '$' + (dpGainYr/1e6).toFixed(2) + 'M'
    : fmt(dpGainYr));
  set('bc-sortcost',   fmt(extraSortCostDay));

  // colour the net saving card
  const netCard = document.querySelector('.rc.green:last-of-type');

  // ── DISTANCE TABLE ──
  const tbody = document.getElementById('dist-tbody');
  tbody.innerHTML = '';
  [0.5, 0.8, 1.0, 1.3, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0].forEach(d => {
    const T_d      = fixedTime + 2 * d / speed;
    const pkgHr_d  = 3600 / T_d;
    const wRaw_d   = pkgsPerChute / (sorthrs * pkgHr_d);
    const w_d      = Math.ceil(wRaw_d);
    const extra_d  = w_d - currW;
    const extTot   = extra_d * chutes;
    const cost_d   = Math.max(0, extTot) * sorthrs * sortRate;
    const costYr   = cost_d * opdays;

    const isCurr = Math.abs(d - currDist) < 0.08;
    const isFut  = Math.abs(d - futDist) < 0.08;
    const isTgt  = !isCurr && !isFut && Math.abs(d - maxWalk) < 0.18;

    const tr = document.createElement('tr');
    if (isCurr) tr.className = 'row-curr';
    else if (isFut) tr.className = 'row-fut';
    else if (isTgt) tr.className = 'row-tgt';

    const tag = isCurr ? ' <span style="color:#f87171;font-size:10px;">◄ current</span>'
                       : isFut  ? ' <span style="color:#4ade80;font-size:10px;">◄ future</span>'
                       : isTgt  ? ' <span style="color:#ff6b85;font-size:10px;">◄ ~target</span>' : '';

    tr.innerHTML = `
      <td><strong>${d.toFixed(1)}m</strong>${tag}</td>
      <td>${T_d.toFixed(1)}s</td>
      <td>${Math.round(pkgHr_d)}</td>
      <td>${wRaw_d.toFixed(2)} → <strong>${w_d}</strong></td>
      <td style="color:${extra_d > 0 ? 'var(--orange)' : 'var(--green)'}">${extra_d>=0?'+':''}${extra_d} / chute</td>
      <td style="color:${extra_d > 0 ? 'var(--orange)' : 'var(--green)'}">${extTot>=0?'+':''}${extTot} total</td>
      <td style="color:${cost_d > 0 ? 'var(--orange)' : 'var(--green)'}">${cost_d > 0 ? fmt(cost_d)+'/day' : '✓ nil'}</td>
      <td style="color:${costYr > 0 ? 'var(--orange)' : 'var(--green)'}">${costYr > 0 ? fmt(costYr)+'/yr' : '✓ nil'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// wire all inputs
Object.values(ids).forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', updateAll);
});

updateAll();
