const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#nav');

if (menuButton && navigation) {
  function closeMenu() {
    menuButton.setAttribute('aria-expanded', 'false');
  }
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
  });
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('pointerdown', event => {
    if (!menuButton.contains(event.target) && !navigation.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuButton.focus();
    }
  });
}

const filters = document.querySelectorAll('[data-filter]');
const cards = document.querySelectorAll('[data-topic]');
const filterStatus = document.querySelector('#filter-status');
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
  let visible = 0;
  cards.forEach(card => {
    card.hidden = button.dataset.filter !== 'all' && card.dataset.topic !== button.dataset.filter;
    if (!card.hidden) visible++;
  });
  filterStatus.textContent = `Showing ${visible} ${visible === 1 ? 'insight' : 'insights'}.`;
}));

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const integer = new Intl.NumberFormat('en-US');
const percentage = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });
const formatCost = (amount, count) => count ? currency.format(amount / count) : '—';
const formatRate = (part, total) => total ? percentage.format(part / total) : '—';

const workflows = {
  search: {
    label: 'Review Search terms',
    instructions: 'Group each query by high intent, research, irrelevant, or unclear. Return the original query, spend, classification, reason, confidence, and a proposed action. Flag any suggested negative that could block a valid buyer or adjacent offer. Produce a human review queue and leave any account changes for me to approve.',
    input: 'Paste a redacted table of search terms, clicks, spend, and leads here. Add the reporting period, currency, and protected terms.',
  },
  creative: {
    label: 'Plan a creative test',
    instructions: 'Propose three distinct ad angles based on different buyer problems or motivations. For each, give the hypothesis, hook, evidence required, and how to measure it. Identify a single primary outcome, a test window, and what should stay consistent across variants. Flag any claim that needs proof.',
    input: 'Paste a short audience description, the approved product claims, and the formats or placements available.',
  },
  reporting: {
    label: 'Explain campaign performance',
    instructions: 'Compare the two periods. Verify the arithmetic, separate observed changes from possible explanations, and flag missing information or reporting delays. Rank the three checks I should run before moving budget. Keep any proposed action conditional on the evidence.',
    input: 'Paste comparable aggregate totals for spend, clicks, leads, qualified outcomes, and the campaign change log. Include dates and currency.',
  },
};

const tools = {
  'lead-quality'(input) {
    const spend = Number(input.spend);
    const leads = Number(input.leads);
    const qualified = Number(input.qualified);
    const pending = Number(input.pending);
    if (qualified + pending > leads) throw new Error('Qualified and pending leads together cannot exceed total leads.');
    const resolved = leads - pending;
    const metrics = [
      ['Cost per lead', formatCost(spend, leads)],
      ['Cost per qualified lead', formatCost(spend, qualified)],
      ['All leads qualified', formatRate(qualified, leads)],
      ['Resolved leads qualified', formatRate(qualified, resolved)],
    ];
    const note = pending > 0
      ? `${integer.format(pending)} leads are still pending. Check the result again after sales has reviewed them.`
      : qualified ? 'Compare the cost per qualified lead with the value the business can support.' : 'A qualified lead is needed to calculate its cost.';
    return { metrics, note, goal: 'Improve tracking and lead quality' };
  },
  budget(input) {
    const target = Number(input.target);
    const cpc = Number(input.cpc);
    const conversionBasisPoints = Math.round(Number(input.conversion) * 100);
    const qualificationBasisPoints = Math.round(Number(input.qualification) * 100);
    const leads = Math.ceil(target * 10000 / qualificationBasisPoints);
    const clicks = Math.ceil(leads * 10000 / conversionBasisPoints);
    const spend = clicks * cpc;
    return {
      metrics: [
        ['Estimated ad spend', currency.format(spend)],
        ['Clicks needed', integer.format(clicks)],
        ['Leads needed', integer.format(leads)],
        ['Planned cost per qualified lead', formatCost(spend, target)],
      ],
      note: `Scenario for ${integer.format(target)} qualified leads. Recalculate with a lower conversion rate to see how sensitive your budget is.`,
      goal: 'Campaign strategy or implementation',
    };
  },
  roas(input) {
    const aov = Number(input.aov);
    const contribution = Math.round((aov - Number(input.cogs) - Number(input.other)) * 100) / 100;
    return {
      metrics: [
        ['Break-even ROAS', contribution > 0 ? `${(aov / contribution).toFixed(2)}×` : '—'],
        ['Maximum acquisition cost', contribution > 0 ? currency.format(contribution) : '—'],
        ['Contribution margin before ads', percentage.format(contribution / aov)],
      ],
      note: contribution > 0 ? 'At this ROAS, ad spend uses the contribution left after variable costs.' : 'There is no contribution left to pay for advertising with these inputs.',
      goal: 'Paid media audit',
    };
  },
  utm(input) {
    let url;
    try {
      url = new URL(input.url);
    } catch {
      throw new Error('Enter a full landing page URL, including https://.');
    }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Use a public HTTP or HTTPS landing page URL.');
    for (const name of ['source', 'medium', 'campaign']) {
      if (!input[name].trim()) throw new Error('Enter a source, medium, and campaign name.');
    }
    for (const name of ['source', 'medium', 'campaign', 'content', 'term']) {
      const value = input[name].trim();
      if (value) url.searchParams.set(`utm_${name}`, value);
      else url.searchParams.delete(`utm_${name}`);
    }
    return {
      output: url.href,
      note: 'Copy the link and test that the landing page opens before using it in an ad.',
      shared: 'Used the Campaign URL builder and would like help with campaign tracking.',
      goal: 'Improve tracking and lead quality',
    };
  },
  ai(input) {
    const workflow = workflows[input.workflow];
    if (!workflow || !input.offer.trim() || !input.audience.trim() || !input.goal.trim()) throw new Error('Add your offer, audience, and goal to build the prompt.');
    const context = [
      `Business or offer: ${input.offer.trim()}`,
      `Audience or market: ${input.audience.trim()}`,
      `Goal: ${input.goal.trim()}`,
      input.constraints.trim() && `Constraints: ${input.constraints.trim()}`,
    ].filter(Boolean).join('\n');
    return {
      output: `Act as a paid media analyst.\n\n${context}\n\n${workflow.instructions}\n\nIf the data is incomplete, tell me what’s missing and label your assumptions.\n\n[${workflow.input}]`,
      note: 'Add your redacted inputs before running this prompt. Check the output before making a campaign change.',
      shared: `Built an AI prompt for: ${workflow.label}. Goal: ${input.goal.trim()}`,
      goal: 'Build an AI workflow',
    };
  },
};

function makeText(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
}

function renderResult(body, result) {
  body.replaceChildren();
  if (result.metrics) {
    const list = document.createElement('dl');
    list.className = 'metric-grid';
    result.metrics.forEach(([label, value]) => {
      const item = document.createElement('div');
      item.append(makeText('dt', label), makeText('dd', value));
      list.append(item);
    });
    body.append(list);
  }
  if (result.output) body.append(makeText('pre', result.output, 'text-result'));
  body.append(makeText('p', result.note, 'result-note'));
}

const resultKey = 'charbel-inquiry-tool';
document.querySelectorAll('[data-tool]').forEach(form => {
  const key = form.dataset.tool;
  const section = form.nextElementSibling;
  const output = section.querySelector('.tool-result-body');
  const status = section.querySelector('.small-status');
  const error = form.querySelector('.tool-error');
  let result;
  let summary = '';

  form.addEventListener('input', () => {
    section.hidden = true;
    error.hidden = true;
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      result = tools[key](Object.fromEntries(new FormData(form)));
      summary = result.shared ?? result.metrics.map(([label, value]) => `${label}: ${value}`).join(' · ');
      error.hidden = true;
      status.textContent = '';
      renderResult(output, result);
      section.hidden = false;
      section.focus();
    } catch (problem) {
      error.textContent = problem.message;
      error.hidden = false;
      section.hidden = true;
    }
  });

  section.querySelector('[data-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(result.output ?? summary);
      status.textContent = 'Copied.';
    } catch {
      status.textContent = 'You can select the result above and copy it.';
    }
  });

  section.querySelector('[data-inquiry]').addEventListener('click', () => {
    try {
      sessionStorage.setItem(resultKey, JSON.stringify({ key, summary, goal: result.goal }));
    } catch {
      status.textContent = 'You can add your result to the inquiry manually.';
    }
  });
});

function createRequestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

const inquiry = document.querySelector('#inquiry-form');
if (inquiry) {
  const source = new URLSearchParams(location.search).get('from');
  if (source === 'paid-media-audit') inquiry.elements.goal.value = 'Paid media audit';
  if (source === 'services') inquiry.elements.goal.value = 'Media buying and ad creation';
  if (source === 'privacy-policy') inquiry.elements.goal.value = 'Privacy request';
  const attachedResult = document.querySelector('#attached-result');
  const include = document.querySelector('#include-result');
  const error = inquiry.querySelector('.tool-error');
  const send = inquiry.querySelector('button[type="submit"]');
  let result;
  try {
    const saved = JSON.parse(sessionStorage.getItem(resultKey) ?? 'null');
    if (saved?.key === source && typeof saved.summary === 'string') {
      result = saved;
      attachedResult.hidden = false;
      document.querySelector('#attached-preview').textContent = result.summary;
      inquiry.elements.goal.value = result.goal;
    }
  } catch {
    // Direct contact still works if session storage is unavailable.
  }

  const goal = inquiry.elements.goal;
  const company = inquiry.elements.company;
  const companyOptional = document.querySelector('#company-optional');
  const optionalFields = inquiry.querySelector('.inquiry-options');
  optionalFields.addEventListener('invalid', () => { optionalFields.open = true; }, true);
  function updateCompanyRequirement() {
    company.required = goal.value !== 'Privacy request';
    companyOptional.hidden = company.required;
  }
  goal.addEventListener('change', updateCompanyRequirement);
  updateCompanyRequirement();

  let requestId;
  inquiry.addEventListener('submit', async event => {
    event.preventDefault();
    error.hidden = true;
    send.disabled = true;
    try {
      requestId ??= createRequestId();
      const payload = Object.fromEntries(new FormData(inquiry));
      payload.id = requestId;
      payload.confirm = inquiry.elements.confirm.checked;
      payload.toolResult = include.checked && result ? result.summary : '';
      const response = await fetch(inquiry.action, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.reference) throw new Error(data.error ?? 'Please try again.');
      inquiry.reset();
      inquiry.hidden = true;
      const confirmation = document.querySelector('#inquiry-success');
      document.querySelector('#inquiry-reference').textContent = `Your inquiry reference is ${data.reference}.`;
      confirmation.hidden = false;
      confirmation.focus();
      try {
        sessionStorage.removeItem(resultKey);
      } catch {
        // The inquiry was already stored on the server.
      }
    } catch (problem) {
      error.textContent = problem instanceof SyntaxError ? 'Could not reach the inquiry inbox. Your answers are still here. Please try again.' : problem.message;
      error.hidden = false;
    } finally {
      send.disabled = false;
    }
  });
}
