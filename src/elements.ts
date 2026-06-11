/**
 * Defines the `<authkit-gate>` custom element — the client-side fallback used
 * by `<SignedIn>` / `<SignedOut>` / `<Show>` on prerendered pages, where the
 * server can't evaluate the session. The element starts `hidden` and toggles
 * its visibility from the client auth store once it hydrates.
 *
 * Importing this module (the components do it via an inline script) is enough;
 * the definition is idempotent.
 */
import { $auth, $isLoaded } from './client.js';
import { checkAuthCondition } from './shared.js';
import type { AuthCondition } from './shared.js';

if (typeof customElements !== 'undefined' && !customElements.get('authkit-gate')) {
  class AuthKitGate extends HTMLElement {
    #unsubscribers: Array<() => void> = [];

    connectedCallback(): void {
      let condition: AuthCondition;
      try {
        condition = JSON.parse(this.getAttribute('data-when') ?? 'null') as AuthCondition;
      } catch {
        return;
      }
      if (condition == null) return;

      const render = (): void => {
        // Stay hidden until the store hydrates — never flash the wrong state.
        if (!$isLoaded.get()) return;
        this.hidden = !checkAuthCondition($auth.get(), condition);
      };
      this.#unsubscribers.push($auth.subscribe(render), $isLoaded.subscribe(render));
    }

    disconnectedCallback(): void {
      for (const unsubscribe of this.#unsubscribers.splice(0)) unsubscribe();
    }
  }

  customElements.define('authkit-gate', AuthKitGate);
}

export {};
