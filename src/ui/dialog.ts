import { TEXT } from './text';
import { byId } from './dom';

// An in-page confirmation box (the browser's own confirm/alert are blocked in some views).
// Without `onConfirm` it is a plain notice with a single button.

const overlay = byId('confirm-overlay');
const okButton = byId<HTMLButtonElement>('confirm-ok');
const cancelButton = byId<HTMLButtonElement>('confirm-cancel');
const input = byId<HTMLInputElement>('confirm-input');

export const isDialogOpen = (): boolean => !overlay.hidden;

export function askConfirmation(
  question: string,
  confirmLabel: string,
  onConfirm?: () => void,
): void {
  input.hidden = true;
  byId('confirm-text').textContent = question;
  okButton.textContent = confirmLabel;
  cancelButton.textContent = TEXT.cancel;
  cancelButton.hidden = !onConfirm;
  const close = () => (overlay.hidden = true);
  okButton.onclick = () => {
    close();
    onConfirm?.();
  };
  cancelButton.onclick = close;
  overlay.hidden = false;
  okButton.focus();
}

/** Asks for a short text, e.g. a new name; `onConfirm` gets what was typed. */
export function askForText(
  question: string,
  confirmLabel: string,
  initialText: string,
  onConfirm: (text: string) => void,
): void {
  askConfirmation(question, confirmLabel, () => onConfirm(input.value));
  input.hidden = false;
  input.value = initialText;
  input.focus();
  input.select();
}

/** Enter answers the box with its main button (OK, End session, Close). */
export function confirmDialog(): void {
  okButton.click();
}

/** Escape closes the box: it cancels a question, or acknowledges a notice. */
export function closeDialogWithEscape(): void {
  if (cancelButton.hidden) okButton.click();
  else cancelButton.click();
}
