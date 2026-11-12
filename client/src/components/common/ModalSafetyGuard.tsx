import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const MODAL_SELECTOR = '[data-modal-guard]';
const HISTORY_MARKER = '__protektorModalGuard';

function getOpenModal(): HTMLElement | null {
  return document.querySelector<HTMLElement>(MODAL_SELECTOR);
}

function stopBackAction(event?: unknown) {
  const candidate = event as {
    preventDefault?: () => void;
    stopImmediatePropagation?: () => void;
    stopPropagation?: () => void;
  } | undefined;

  candidate?.preventDefault?.();
  candidate?.stopImmediatePropagation?.();
  candidate?.stopPropagation?.();
}

function isCancelButton(button: HTMLElement): boolean {
  if (button.hasAttribute('data-modal-cancel-button')) return true;

  const label = [button.innerText, button.getAttribute('aria-label'), button.getAttribute('title')]
    .filter(Boolean)
    .join(' ')
    .trim()
    .toLocaleLowerCase();

  return /\b(abbrechen|abbruch|cancel|schließen|schliessen|close)\b/.test(label);
}

/**
 * App-wide safety net for dialogs, including custom dialogs that do not use
 * the shared Modal component. Backdrop clicks are intentionally not handled.
 */
export function ModalSafetyGuard() {
  useEffect(() => {
    let historyGuardActive = false;
    let releasingHistoryGuard = false;
    const guardState = { [HISTORY_MARKER]: true };

    const syncHistoryGuard = () => {
      const modalIsOpen = Boolean(getOpenModal());

      if (modalIsOpen && !historyGuardActive) {
        window.history.pushState(
          { ...(window.history.state ?? {}), ...guardState },
          '',
          window.location.href,
        );
        historyGuardActive = true;
      } else if (!modalIsOpen && historyGuardActive) {
        historyGuardActive = false;
        releasingHistoryGuard = true;
        window.history.back();
      }
    };

    const onPopState = (event: PopStateEvent) => {
      if (releasingHistoryGuard) {
        releasingHistoryGuard = false;
        return;
      }

      if (getOpenModal()) {
        stopBackAction(event);
        window.history.pushState(
          { ...(window.history.state ?? {}), ...guardState },
          '',
          window.location.href,
        );
        historyGuardActive = true;
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && getOpenModal()) {
        stopBackAction(event);
      }
    };

    const onBackButton = (event: unknown) => {
      if (getOpenModal()) stopBackAction(event);
    };

    const onCapacitorBackButton = ({ canGoBack }: { canGoBack: boolean }) => {
      // Registering Capacitor's listener disables its default handling, so keep
      // the normal history/exit behavior when no modal or popup is open.
      if (getOpenModal()) return;
      if (canGoBack) window.history.back();
      else void App.exitApp();
    };

    const onInput = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      target.closest<HTMLElement>(MODAL_SELECTOR)?.setAttribute('data-modal-dirty', 'true');
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLElement>('button, [role="button"]');
      const modal = button?.closest<HTMLElement>(MODAL_SELECTOR);
      if (!button || !modal || !isCancelButton(button) || modal.dataset.modalDirty !== 'true') return;

      if (!window.confirm('Änderungen verwerfen?')) {
        stopBackAction(event);
        return;
      }

      modal.removeAttribute('data-modal-dirty');
    };

    const observer = new MutationObserver(syncHistoryGuard);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener('keydown', onEscape, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('change', onInput, true);
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState, true);
    window.addEventListener('backbutton', onBackButton, true);
    window.addEventListener('backButton', onBackButton, true);

    // Capacitor's App plugin is only activated inside a native WebView.
    // Registering backButton suppresses the platform's default app-exit action.
    let removeCapacitorListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      void App.addListener('backButton', onCapacitorBackButton).then((handle) => {
        removeCapacitorListener = () => { void handle.remove(); };
      });
    }

    syncHistoryGuard();

    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', onEscape, true);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('change', onInput, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState, true);
      window.removeEventListener('backbutton', onBackButton, true);
      window.removeEventListener('backButton', onBackButton, true);
      removeCapacitorListener?.();
    };
  }, []);

  return null;
}
