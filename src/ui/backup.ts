import { ALL_KANJI } from '../practice/kanjiData';
import { itemsInGroup } from '../practice/catalog';
import {
  applyBackup,
  BACKUP_PARTS,
  buildBackup,
  MAX_BACKUP_LENGTH,
  parseBackup,
  type BackupPart,
  type ParsedBackup,
} from '../storage/backup';
import { store } from './appStore';
import { askConfirmation } from './dialog';
import { byId, flashMessage } from './dom';
import { showScreen, highlightTab } from './screens';
import { backupSummary, importedText, TEXT } from './text';

/* The "Backup & transfer" screen: export, import, and "Start over" (delete all data). */

const PART_NAMES: Record<BackupPart, string> = {
  lists: 'saved lists',
  passRates: 'pass rates',
  settings: 'settings',
};

const exportParts = new Set<BackupPart>(BACKUP_PARTS);
const importParts = new Set<BackupPart>();
let importMode: 'merge' | 'replace' = 'merge';
let pendingImport: ParsedBackup | null = null; // a checked backup, waiting for "Import"
let onDataChanged: () => void = () => {};

const knownIds = new Set(itemsInGroup('all', ALL_KANJI).map((item) => item.id));
const status = (text: string) => flashMessage(byId('backup-status'), text);
const backupHas = (backup: ParsedBackup, part: BackupPart) => backup[part] !== undefined;

function renderToggles(): void {
  byId('export-count-lists').textContent = String(
    store.data.lists.reduce((count, list) => count + list.sublists.length, 0),
  );
  byId('export-count-passRates').textContent = String(Object.keys(store.data.passRates).length);
  document.querySelectorAll<HTMLElement>('[data-backup-group]').forEach((button) => {
    const part = button.dataset.part as BackupPart;
    const chosen = button.dataset.backupGroup === 'export' ? exportParts : importParts;
    const isOn = chosen.has(part);
    button.classList.toggle('on', isOn);
    button.setAttribute('aria-pressed', String(isOn));
    if (button.dataset.backupGroup === 'import') {
      button.hidden = !pendingImport || !backupHas(pendingImport, part);
    }
  });
  document.querySelectorAll<HTMLElement>('[data-import-mode]').forEach((button) => {
    const isOn = button.dataset.importMode === importMode;
    button.classList.toggle('on', isOn);
    button.setAttribute('aria-pressed', String(isOn));
  });
}

function downloadFile(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportBackup(how: 'download' | 'copy'): Promise<void> {
  if (!exportParts.size) return status(TEXT.backup.chooseExportFirst);
  const now = new Date();
  const text = buildBackup(store.data, [...exportParts], now);
  const textBox = byId<HTMLTextAreaElement>('export-text');
  textBox.value = text;
  textBox.hidden = false;
  if (how === 'download') {
    downloadFile(`kaku-backup-${now.toISOString().slice(0, 10)}.json`, text);
    return status(TEXT.backup.downloaded);
  }
  try {
    await navigator.clipboard.writeText(text);
    status(TEXT.backup.copied);
  } catch {
    textBox.select(); // some browsers block the clipboard: let the user copy by hand
    status(TEXT.backup.copyByHand);
  }
}

function readBackupText(text: string): void {
  const result = parseBackup(text, knownIds);
  byId('import-options').hidden = !result.ok;
  if (!result.ok) {
    pendingImport = null;
    return status(TEXT.backup.errors[result.error]);
  }
  const backup = result.backup;
  pendingImport = backup;
  importParts.clear();
  for (const part of BACKUP_PARTS) if (backupHas(backup, part)) importParts.add(part);
  byId('import-summary').textContent = backupSummary(
    backup.exportedAt,
    (backup.lists ?? []).reduce((count, list) => count + list.sublists.length, 0),
    Object.keys(backup.passRates ?? {}).length,
    backup.settings !== undefined,
    backup.skipped,
  );
  renderToggles();
}

async function readBackupFile(file: File | undefined): Promise<void> {
  if (!file) return;
  if (file.size > MAX_BACKUP_LENGTH) return status(TEXT.backup.errors.tooBig);
  try {
    readBackupText(await file.text());
  } catch {
    status(TEXT.backup.fileUnreadable);
  }
}

function applyImport(): void {
  const backup = pendingImport;
  const parts = BACKUP_PARTS.filter(
    (part) => importParts.has(part) && backup && backupHas(backup, part),
  );
  if (!backup || !parts.length) return status(TEXT.backup.chooseImportFirst);
  const doImport = () => {
    store.data = applyBackup(store.data, backup, parts, importMode);
    const saved = store.save();
    pendingImport = null;
    byId('import-options').hidden = true;
    byId<HTMLTextAreaElement>('import-text').value = '';
    onDataChanged();
    renderToggles();
    status(
      importedText(parts.map((part) => PART_NAMES[part])) + (saved ? '' : TEXT.notSavedWarning),
    );
  };
  if (importMode === 'replace')
    askConfirmation(TEXT.backup.replaceQuestion, TEXT.backup.replace, doImport);
  else doImport();
}

function deleteAllData(): void {
  askConfirmation(TEXT.backup.deleteAllQuestion, TEXT.backup.deleteAll, () => {
    store.resetAll();
    pendingImport = null;
    byId('import-options').hidden = true;
    byId('export-text').hidden = true;
    onDataChanged();
    renderToggles();
    status(TEXT.backup.deletedAll);
  });
}

export function showBackup(): void {
  renderToggles();
  showScreen('backup-screen');
  highlightTab('#open-backup'); // no tab is highlighted: Backup lives in the ⋯ menu
}

/** `dataChanged` is called after an import or "Delete all data", so other screens re-read it. */
export function initBackup(dataChanged: () => void): void {
  onDataChanged = dataChanged;
  byId('open-backup').addEventListener('click', showBackup);
  byId('backup-screen').addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('button');
    if (button?.dataset.backupGroup) {
      const chosen = button.dataset.backupGroup === 'export' ? exportParts : importParts;
      const part = button.dataset.part as BackupPart;
      if (chosen.has(part)) chosen.delete(part);
      else chosen.add(part);
    } else if (button?.dataset.importMode) {
      importMode = button.dataset.importMode as 'merge' | 'replace';
    } else return;
    renderToggles();
  });
  byId('export-download').addEventListener('click', () => void exportBackup('download'));
  byId('export-copy').addEventListener('click', () => void exportBackup('copy'));
  byId('import-choose').addEventListener('click', () => byId('import-file').click());
  byId<HTMLInputElement>('import-file').addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    void readBackupFile(input.files?.[0]);
    input.value = ''; // choosing the same file again still triggers a read
  });
  byId('import-read').addEventListener('click', () =>
    readBackupText(byId<HTMLTextAreaElement>('import-text').value),
  );
  byId('import-apply').addEventListener('click', applyImport);
  byId('delete-all').addEventListener('click', deleteAllData);
}
