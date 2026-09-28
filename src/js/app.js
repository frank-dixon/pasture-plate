/**
 * Pasture Plate — forage quick-check for rabbits & hens
 * Catalog UX: search + animal pills + multi-select filters + sort.
 * Toxicity statuses come only from plants.json (never invented here).
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  plants: [],
  animal: 'all',       // 'all' | 'rabbit' | 'hen'
  mode: 'simple',      // 'simple' | 'advanced'
  query: '',
  sort: 'name-asc',
  // Multi-select filter sets (empty = no constraint on that axis)
  filters: {
    category: new Set(),
    season: new Set(),
    lifecycle: new Set(),
    drought: new Set(),
    safety: new Set()
  }
};

const els = {
  search: document.querySelector('#search'),
  results: document.querySelector('#results'),
  empty: document.querySelector('#empty'),
  summary: document.querySelector('#summary'),
  sources: document.querySelector('#source-list'),
  sort: document.querySelector('#sort'),
  clear: document.querySelector('#clear-filters'),
  chips: document.querySelector('#active-chips'),
  filterCategory: document.querySelector('#filter-category'),
  filterSeason: document.querySelector('#filter-season'),
  filterLifecycle: document.querySelector('#filter-lifecycle'),
  filterDrought: document.querySelector('#filter-drought'),
  filterSafety: document.querySelector('#filter-safety'),
  droughtFieldset: document.querySelector('#drought-fieldset')
};

// Cited reference links shown on cards / sources section
const sourceInfo = {
  'rabbit-diet': { label: 'Rabbit Welfare Association & Fund · rabbit diet', url: 'https://rabbitwelfare.co.uk/rabbit-care-advice/rabbit-diet/' },
  'poultry-feed': { label: 'Merck Veterinary Manual · feeding poultry', url: 'https://www.merckvetmanual.com/poultry/nutrition-and-management-of-poultry/feeding-poultry' },
  'aspca-toxic': { label: 'ASPCA · toxic and non-toxic plants', url: 'https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants' },
  'merck-plants': { label: 'Merck Veterinary Manual · overview of plant poisoning', url: 'https://www.merckvetmanual.com/toxicology/plant-poisoning/overview-of-plant-poisoning' }
};

const labels = { safe: 'Good starting point', caution: 'Use care', avoid: 'Avoid', unknown: 'Needs checking' };
const statusClass = { safe: 'status-safe', caution: 'status-caution', avoid: 'status-avoid', unknown: 'status-unknown' };

// Display labels for filter dimensions
const CATEGORY_LABELS = {
  'forage-weed': 'Forage weed',
  'pasture-grass': 'Pasture grass',
  herb: 'Herb',
  'garden-green': 'Garden green',
  fruiting: 'Fruiting',
  woody: 'Woody',
  ornamental: 'Ornamental',
  'toxic-weed': 'Toxic weed'
};
const SEASON_LABELS = { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' };
const LIFECYCLE_LABELS = { perennial: 'Perennial', annual: 'Annual', biennial: 'Biennial' };
const DROUGHT_LABELS = { low: 'Low', moderate: 'Moderate', high: 'High', unknown: 'Unknown' };
const SAFETY_LABELS = { safe: 'Safe', caution: 'Caution', avoid: 'Avoid', unknown: 'Unknown' };

const SAFETY_RANK = { avoid: 0, caution: 1, safe: 2, unknown: 3 };
const LIFECYCLE_RANK = { perennial: 0, biennial: 1, annual: 2 };

// ---------------------------------------------------------------------------
// Status helpers (animal-aware; never mutates plant.status)
// ---------------------------------------------------------------------------
function statusFor(plant) {
  if (state.animal === 'all') {
    const values = Object.values(plant.status);
    if (values.includes('avoid')) return 'avoid';
    if (values.includes('caution')) return 'caution';
    if (values.includes('unknown')) return 'unknown';
    return 'safe';
  }
  return plant.status[state.animal] || 'unknown';
}

// ---------------------------------------------------------------------------
// Filter + sort pipeline
// ---------------------------------------------------------------------------
function filtered() {
  const q = state.query.trim().toLowerCase();
  const { category, season, lifecycle, drought, safety } = state.filters;

  let list = state.plants.filter((p) => {
    // Text search across common name, scientific name, and aliases
    const hay = [p.name, p.scientific, ...(p.aliases || [])].join(' ').toLowerCase();
    if (q && !hay.includes(q)) return false;

    // Animal pill only gates relevance when a specific animal is chosen
    if (state.animal !== 'all' && !p.status[state.animal]) return false;

    if (category.size && !category.has(p.category)) return false;
    if (lifecycle.size && !lifecycle.has(p.lifecycle)) return false;
    if (drought.size && !drought.has(p.drought)) return false;
    // Season: plant matches if ANY of its seasons is selected
    if (season.size && !(p.seasons || []).some((s) => season.has(s))) return false;
    // Safety uses the animal-aware status
    if (safety.size && !safety.has(statusFor(p))) return false;

    return true;
  });

  list = list.slice().sort((a, b) => {
    switch (state.sort) {
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'safety-avoid':
        return SAFETY_RANK[statusFor(a)] - SAFETY_RANK[statusFor(b)] || a.name.localeCompare(b.name);
      case 'safety-safe':
        return SAFETY_RANK[statusFor(b)] - SAFETY_RANK[statusFor(a)] || a.name.localeCompare(b.name);
      case 'lifecycle':
        return (LIFECYCLE_RANK[a.lifecycle] ?? 9) - (LIFECYCLE_RANK[b.lifecycle] ?? 9) || a.name.localeCompare(b.name);
      case 'category':
        return (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name);
      case 'name-asc':
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return list;
}

function activeFilterCount() {
  return Object.values(state.filters).reduce((n, set) => n + set.size, 0);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function metaChip(text) {
  return `<span class="meta-chip">${escapeHtml(text)}</span>`;
}

function card(plant) {
  const status = statusFor(plant);
  const advanced = state.mode === 'advanced';
  const blurb = advanced
    ? plant.why
    : plant.part + '. ' + (
      status === 'safe' ? 'A cited forage option when clean and correctly identified.'
        : status === 'caution' ? 'Read the note before offering.'
          : 'Keep away and read the note.'
    );
  const catLabel = CATEGORY_LABELS[plant.category] || plant.category;
  const lifeLabel = LIFECYCLE_LABELS[plant.lifecycle] || plant.lifecycle;

  return `<article class="group rounded-2xl border border-[#ebe4d6] bg-paper p-4 transition hover:-translate-y-0.5 hover:border-moss hover:shadow-md">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="font-display text-xl font-bold">${escapeHtml(plant.name)}</h3>
        <p class="mt-0.5 text-xs italic text-[#789086]">${escapeHtml(plant.scientific)}</p>
      </div>
      <span class="${statusClass[status]} shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold">${labels[status]}</span>
    </div>
    <div class="mt-3 flex flex-wrap gap-1.5">${metaChip(catLabel)}${metaChip(lifeLabel)}</div>
    <p class="mt-3 text-sm leading-6 text-[#557064]">${escapeHtml(blurb)}</p>
    <button class="mt-4 text-sm font-bold text-moss underline decoration-moss/30 underline-offset-4 hover:decoration-moss" data-detail="${plant.id}">View details →</button>
  </article>`;
}

function renderChips() {
  const chips = [];
  const push = (key, value, label) => {
    chips.push(`<button type="button" class="chip-active" data-chip-key="${key}" data-chip-value="${escapeHtml(value)}" aria-label="Remove ${escapeHtml(label)} filter">
      ${escapeHtml(label)} <span aria-hidden="true">×</span>
    </button>`);
  };

  state.filters.category.forEach((v) => push('category', v, CATEGORY_LABELS[v] || v));
  state.filters.season.forEach((v) => push('season', v, SEASON_LABELS[v] || v));
  state.filters.lifecycle.forEach((v) => push('lifecycle', v, LIFECYCLE_LABELS[v] || v));
  state.filters.drought.forEach((v) => push('drought', v, `Drought: ${DROUGHT_LABELS[v] || v}`));
  state.filters.safety.forEach((v) => push('safety', v, `Safety: ${SAFETY_LABELS[v] || v}`));

  els.chips.innerHTML = chips.join('');
}

function render() {
  const list = filtered();
  els.results.innerHTML = list.map(card).join('');
  els.empty.classList.toggle('hidden', list.length > 0);
  els.results.classList.toggle('hidden', list.length === 0);

  const noun = list.length === 1 ? 'plant' : 'plants';
  const filterNote = activeFilterCount() ? ` · ${activeFilterCount()} filter${activeFilterCount() === 1 ? '' : 's'} on` : '';
  els.summary.innerHTML = `<span><strong class="text-ink">${list.length}</strong> ${noun} shown${state.query ? ` for “${escapeHtml(state.query)}”` : ''}${filterNote}</span><span class="hidden sm:inline">${state.mode === 'simple' ? 'Simple view · tap for details' : 'Advanced view · notes shown'}</span>`;

  renderChips();
  syncFilterButtonStates();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[c]);
}

// ---------------------------------------------------------------------------
// Detail dialog
// ---------------------------------------------------------------------------
function showDetail(id) {
  const p = state.plants.find((x) => x.id === id);
  if (!p) return;
  const status = statusFor(p);
  const catLabel = CATEGORY_LABELS[p.category] || p.category;
  const lifeLabel = LIFECYCLE_LABELS[p.lifecycle] || p.lifecycle;
  const seasonText = (p.seasons || []).map((s) => SEASON_LABELS[s] || s).join(', ');
  const droughtText = DROUGHT_LABELS[p.drought] || p.drought;

  const dialog = document.createElement('dialog');
  dialog.className = 'm-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-[#d9e1cf] bg-paper p-0 text-ink shadow-2xl backdrop:bg-[#243836]/25';
  dialog.innerHTML = `<div class="p-6 sm:p-8">
    <div class="flex items-start justify-between gap-4">
      <div>
        <span class="${statusClass[status]} inline-flex rounded-full px-3 py-1 text-xs font-bold">${labels[status]}</span>
        <h2 class="mt-4 font-display text-4xl font-bold">${escapeHtml(p.name)}</h2>
        <p class="mt-1 text-sm italic text-[#789086]">${escapeHtml(p.scientific)}</p>
        <div class="mt-3 flex flex-wrap gap-1.5">${metaChip(catLabel)}${metaChip(lifeLabel)}</div>
      </div>
      <button data-close class="grid h-9 w-9 place-items-center rounded-full bg-sage text-xl" aria-label="Close details">×</button>
    </div>
    <dl class="mt-7 grid gap-4 border-y border-[#ebe4d6] py-5 text-sm">
      <div><dt class="font-bold text-moss">Part checked</dt><dd class="mt-1 text-[#557064]">${escapeHtml(p.part)}</dd></div>
      <div><dt class="font-bold text-moss">Why this flag?</dt><dd class="mt-1 leading-6 text-[#557064]">${escapeHtml(p.why)}</dd></div>
      <div><dt class="font-bold text-moss">For ${state.animal === 'all' ? 'both animals' : state.animal + 's'}</dt><dd class="mt-1 text-[#557064]">${p.status.rabbit === p.status.hen ? labels[p.status.rabbit] : `Rabbit: ${labels[p.status.rabbit]} · Hen: ${labels[p.status.hen]}`}</dd></div>
      <div><dt class="font-bold text-moss">Season / drought</dt><dd class="mt-1 text-[#557064]">${escapeHtml(seasonText)} · drought ${escapeHtml(droughtText)}</dd></div>
    </dl>
    <p class="mt-5 text-xs leading-5 text-[#789086]">Plant ID and exposure details matter. This is a quick reference, not veterinary advice. For a suspected poisoning, contact a veterinarian promptly.</p>
    <div class="mt-5 flex flex-wrap gap-2">${p.sources.map((sid) => `<a class="rounded-full bg-sage px-3 py-2 text-xs font-bold text-moss hover:bg-[#cfe0bf]" href="${sourceInfo[sid].url}" target="_blank" rel="noreferrer">Source ↗</a>`).join('')}</div>
  </div>`;
  document.body.append(dialog);
  dialog.showModal();
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => dialog.remove());
}

function renderSources() {
  els.sources.innerHTML = `<p class="text-xs font-bold uppercase tracking-[.14em] text-moss">References used in the cards</p><ul class="mt-3 grid gap-2 text-sm sm:grid-cols-2">${Object.values(sourceInfo).map((s) => `<li><a class="font-semibold text-moss underline decoration-moss/30 underline-offset-4 hover:decoration-moss" href="${s.url}" target="_blank" rel="noreferrer">${s.label} ↗</a></li>`).join('')}</ul>`;
}

// ---------------------------------------------------------------------------
// Filter control builders
// ---------------------------------------------------------------------------
function toggleFilter(key, value) {
  const set = state.filters[key];
  if (set.has(value)) set.delete(value);
  else set.add(value);
  render();
}

function makeToggle(key, value, label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'filter-toggle';
  btn.dataset.filterKey = key;
  btn.dataset.filterValue = value;
  btn.textContent = label;
  btn.addEventListener('click', () => toggleFilter(key, value));
  return btn;
}

function syncFilterButtonStates() {
  document.querySelectorAll('.filter-toggle').forEach((btn) => {
    const key = btn.dataset.filterKey;
    const value = btn.dataset.filterValue;
    const on = state.filters[key] && state.filters[key].has(value);
    btn.classList.toggle('filter-toggle-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

function buildFilterControls() {
  // Category — all eight taxonomy buckets
  Object.entries(CATEGORY_LABELS).forEach(([value, label]) => {
    els.filterCategory.append(makeToggle('category', value, label));
  });

  // Season
  Object.entries(SEASON_LABELS).forEach(([value, label]) => {
    els.filterSeason.append(makeToggle('season', value, label));
  });

  // Lifecycle
  Object.entries(LIFECYCLE_LABELS).forEach(([value, label]) => {
    els.filterLifecycle.append(makeToggle('lifecycle', value, label));
  });

  // Drought — only show the control when enough plants have a non-unknown value
  const droughtKnown = state.plants.filter((p) => p.drought && p.drought !== 'unknown').length;
  if (droughtKnown >= 8) {
    ['low', 'moderate', 'high'].forEach((value) => {
      els.filterDrought.append(makeToggle('drought', value, DROUGHT_LABELS[value]));
    });
  } else {
    els.droughtFieldset.classList.add('hidden');
  }

  // Safety status for the selected animal (animal-aware via statusFor)
  Object.entries(SAFETY_LABELS).forEach(([value, label]) => {
    els.filterSafety.append(makeToggle('safety', value, label));
  });
}

function clearFilters() {
  Object.values(state.filters).forEach((set) => set.clear());
  render();
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------
document.addEventListener('click', (e) => {
  const detail = e.target.closest('[data-detail]');
  if (detail) showDetail(detail.dataset.detail);

  const animal = e.target.closest('[data-animal]');
  if (animal) {
    state.animal = animal.dataset.animal;
    document.querySelectorAll('.animal-button').forEach((b) => b.classList.toggle('pill-active', b === animal));
    render();
  }

  const mode = e.target.closest('[data-mode]');
  if (mode) {
    state.mode = mode.dataset.mode;
    document.querySelectorAll('.mode-button').forEach((b) => {
      b.classList.toggle('pill-active', b === mode);
      b.classList.toggle('text-moss', b !== mode);
    });
    render();
  }

  // Active chip removal
  const chip = e.target.closest('[data-chip-key]');
  if (chip) {
    const key = chip.dataset.chipKey;
    const value = chip.dataset.chipValue;
    state.filters[key].delete(value);
    render();
  }
});

els.search.addEventListener('input', (e) => {
  state.query = e.target.value;
  render();
});

els.sort.addEventListener('change', (e) => {
  state.sort = e.target.value;
  render();
});

els.clear.addEventListener('click', clearFilters);

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
fetch('data/plants.json')
  .then((r) => r.json())
  .then((plants) => {
    state.plants = plants;
    buildFilterControls();
    renderSources();
    render();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  })
  .catch(() => {
    els.summary.textContent = 'Plant data could not be loaded.';
  });
