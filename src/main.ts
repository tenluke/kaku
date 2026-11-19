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
import { closeAbout, initAbout, isAboutOpen, openAbout } from './ui/about';
import { TEXT } from './ui/text';

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

/*
 * What "Again" on the results screen starts: the same kind of session as the one just done.
 * A session from the Kana, Kanji or Lists tab is drawn again from its settings (a new random
 * set in Random mode). "Practise weakest" and "Retry failed ones" repeat the same characters,
 * shuffled again: without this, "Again" fell back to the setup tab's characters.
 */
let itemsForAgain: () => PracticeItem[] = newSessionItems;

/** Starts a session and remembers how to start it again. */
function startRepeatable(itemsFor: () => PracticeItem[]): Promise<void> {
  itemsForAgain = itemsFor;
  return start(itemsFor());
}

/** For a fixed set of characters: each new session shuffles them again. */
const sameCharacters = (items: readonly PracticeItem[]) => () => shuffled(items);

function endSession(results: SessionResult[]): void {
  // Results are final here ("I was right" can only be pressed before moving on).
  store.data.passRates = recordResults(store.data.passRates, passRateResults(results), Date.now());
  store.save();
  if (results.length) showResults(results);
  else showSetup();
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeMoreMenu();
  if (isAboutOpen()) {
    if (event.key === 'Escape') closeAbout();
    return;
  }
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
initSetup((items) => {
  itemsForAgain = newSessionItems;
  void start(items);
});
initPractice(endSession);
initResults(
  (failedItems) => startRepeatable(sameCharacters(failedItems)),
  () => start(itemsForAgain()),
  () => showSetup(),
);
initProgress((weakItems) => startRepeatable(sameCharacters(weakItems)));
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
initAbout();
byId('open-about').addEventListener('click', () => {
  closeMoreMenu();
  openAbout();
});
document.addEventListener('keydown', onKeyDown);
// Buttons give up focus after a click, so the Space/Enter shortcuts don't press them again.
document.addEventListener('click', (event) => {
  const button = (event.target as Element).closest('button');
  if (button) button.blur();
});
