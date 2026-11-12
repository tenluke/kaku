import './style.css';
import { shuffled, type PracticeItem } from './practice/items';
import { recordResults } from './practice/passRates';
import { onDataChangedInOtherTab, store } from './ui/appStore';
import { askConfirmation, closeDialogWithEscape, confirmDialog, isDialogOpen } from './ui/dialog';
import { byId } from './ui/dom';
import {
  handlePracticeKey,
  initPractice,
  passRateResults,
  startSession,
  type SessionResult,
} from './ui/practice';
import { initBackup, showBackup } from './ui/backup';
import { addAppIcons } from './ui/icons';
import { initProgress, showProgress } from './ui/progress';
import { initResults, showResults } from './ui/results';
import { closeMoreMenu, initMenu } from './ui/screens';
import { applySavedTheme, initTheme } from './ui/theme';
import {
  initSetup,
  newSessionItems,
  refreshSetupFromStorage,
  reloadSettings,
  setStartLoading,
  showSetup,
} from './ui/setup';
import { aboutText, TEXT, versionLabel } from './ui/text';
import { APP_VERSION } from './ui/version';

/* Starts the app and connects the screens. */

async function start(items: PracticeItem[]): Promise<void> {
  setStartLoading(true);
  try {
    await startSession(items);
  } catch {
    askConfirmation(TEXT.loadFailed, TEXT.close);
  } finally {
    setStartLoading(false);
  }
}

function endSession(results: SessionResult[]): void {
  // Results are final here ("I was right" can only be pressed before moving on).
  store.data.passRates = recordResults(store.data.passRates, passRateResults(results), Date.now());
  store.save();
  if (results.length) showResults(results);
  else showSetup();
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeMoreMenu();
  if (isDialogOpen()) {
    if (event.key === 'Escape') closeDialogWithEscape();
    if (event.key === 'Enter') {
      event.preventDefault(); // or the focused button would also be pressed
      confirmDialog();
    }
    return;
  }
  const typing = event.target instanceof HTMLInputElement;
  if (!byId('practice-screen').hidden && !typing) handlePracticeKey(event);
}

addAppIcons();
initTheme(); // first, so the page shows its colours as early as possible
initMenu();
initSetup(start);
initPractice(endSession);
initResults(
  (failedItems) => start(shuffled(failedItems)),
  () => start(newSessionItems()),
  () => showSetup(),
);
initProgress((weakItems) => start(shuffled(weakItems)));
// After an import or "Delete all data", the settings (and so the theme) may have changed.
initBackup(() => {
  reloadSettings();
  applySavedTheme();
});
// Another tab saved: show its data here too. A session in progress isn't interrupted; its
// results are added to the newest data when it ends.
onDataChangedInOtherTab(() => {
  applySavedTheme();
  refreshSetupFromStorage();
  if (!byId('progress-screen').hidden) showProgress();
  else if (!byId('backup-screen').hidden) showBackup();
});
byId('app-version').textContent = versionLabel(APP_VERSION);
byId('open-about').addEventListener('click', () => {
  closeMoreMenu();
  askConfirmation(aboutText(APP_VERSION), TEXT.close);
});
document.addEventListener('keydown', onKeyDown);
// Buttons give up focus after a click, so the Space/Enter shortcuts don't press them again.
document.addEventListener('click', (event) => {
  const button = (event.target as Element).closest('button');
  if (button) button.blur();
});
