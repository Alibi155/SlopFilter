import type { KeywordRule } from '../engine/rules';
import type { SlopCategory } from '../engine/types';
import { exportLearning, importLearning } from '../storage/feedback';
import { getModel, getSettings, resetLearning, setSettings } from '../storage/store';

function need<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

const list = need<HTMLUListElement>('keyword-list');
const empty = need<HTMLParagraphElement>('keyword-empty');
const status = need<HTMLParagraphElement>('status');

let keywords: KeywordRule[] = [];

function say(message: string): void {
  status.textContent = message;
}

function renderKeywords(): void {
  list.replaceChildren();
  empty.hidden = keywords.length > 0;

  keywords.forEach((keyword, index) => {
    const item = document.createElement('li');

    const term = document.createElement('span');
    term.className = 'sf-term';
    // textContent: keyword text is user input and is never parsed as markup.
    term.textContent = keyword.term;

    const category = document.createElement('span');
    category.className = 'sf-tag';
    category.textContent = keyword.category === 'brag' ? 'Bragging' : 'AI';

    const weight = document.createElement('span');
    weight.className = 'sf-tag';
    weight.textContent = `×${keyword.weight}`;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'sf-danger';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove keyword ${keyword.term}`);
    remove.addEventListener('click', () => {
      keywords = keywords.filter((_, i) => i !== index);
      void setSettings({ keywords }).then(() => {
        renderKeywords();
        say('Keyword removed.');
      });
    });

    item.append(term, category, weight, remove);
    list.appendChild(item);
  });
}

async function renderLearning(): Promise<void> {
  const model = await getModel();
  const featureCount = Object.keys(model.weights).length;
  need('learning-summary').textContent =
    model.labelCount === 0
      ? 'Nothing learned yet — SlopFilter is running on its built-in rules.'
      : `${model.labelCount} correction${model.labelCount === 1 ? '' : 's'} recorded, ` +
        `${featureCount} learned signal${featureCount === 1 ? '' : 's'}.`;
}

function download(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function init(): Promise<void> {
  const settings = await getSettings();
  keywords = settings.keywords;
  renderKeywords();

  const showBadge = need<HTMLInputElement>('show-badge');
  const showFlag = need<HTMLInputElement>('show-flag');
  showBadge.checked = settings.showBadge;
  showFlag.checked = settings.showFlagAffordance;
  showBadge.addEventListener('change', () => {
    void setSettings({ showBadge: showBadge.checked });
  });
  showFlag.addEventListener('change', () => {
    void setSettings({ showFlagAffordance: showFlag.checked });
  });

  need<HTMLFormElement>('keyword-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const termInput = need<HTMLInputElement>('keyword-term');
    const term = termInput.value.trim().toLowerCase();
    if (term.length === 0) return;
    if (keywords.some((keyword) => keyword.term === term)) {
      say('That keyword is already in the list.');
      return;
    }
    keywords = [
      ...keywords,
      {
        term,
        category: need<HTMLSelectElement>('keyword-category').value as SlopCategory,
        weight: Number(need<HTMLSelectElement>('keyword-weight').value),
      },
    ];
    void setSettings({ keywords }).then(() => {
      termInput.value = '';
      renderKeywords();
      say(`Added “${term}”.`);
    });
  });

  need('export').addEventListener('click', () => {
    void exportLearning().then((bundle) => {
      download(`slopfilter-${new Date().toISOString().slice(0, 10)}.json`, bundle);
      say('Exported.');
    });
  });

  const importFile = need<HTMLInputElement>('import-file');
  need('import').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', () => {
    const file = importFile.files?.[0];
    if (!file) return;
    void file
      .text()
      .then((text) => importLearning(JSON.parse(text) as unknown))
      .then(async (model) => {
        await renderLearning();
        say(`Imported and retrained on ${model.labelCount} corrections.`);
      })
      .catch((error: unknown) => {
        say(error instanceof Error ? error.message : 'Could not read that file.');
      })
      .finally(() => {
        importFile.value = '';
      });
  });

  need('reset').addEventListener('click', () => {
    // Destructive and not undoable, so it asks first.
    if (!confirm('Delete everything SlopFilter has learned? Your keywords are kept.')) return;
    void resetLearning().then(async () => {
      await renderLearning();
      say('Learning reset.');
    });
  });

  await renderLearning();
}

void init();
