import { Injectable, inject, signal } from '@angular/core';
import { HostService } from '../services/host.service';

export type ActivityPanel = 'explorer' | 'search' | 'queues' | 'favourites' | 'apps';

/**
 * Ephemeral, shell-only view state that main does NOT own: which activity-rail
 * panel is selected, whether the sidebar is shown, and whether ⌘K is open.
 * Reacts to main's `wb:shortcut` pushes (⌘K / ⌘B relayed from global
 * shortcuts, 04 §1) but never writes back to main.
 */
@Injectable({ providedIn: 'root' })
export class ShellUiStore {
  readonly activePanel = signal<ActivityPanel>('explorer');
  readonly sidebarVisible = signal(true);
  readonly commandCenterOpen = signal(false);

  constructor() {
    const host = inject(HostService);
    host.on('wb:shortcut', ({ id }) => {
      if (id === 'toggleSidebar') this.sidebarVisible.update((v) => !v);
      if (id === 'commandCenter') this.commandCenterOpen.set(true);
    });
  }

  selectPanel(panel: ActivityPanel): void {
    // Clicking the active panel's icon toggles the sidebar (VSCode behaviour).
    if (this.activePanel() === panel && this.sidebarVisible()) {
      this.sidebarVisible.set(false);
      return;
    }
    this.activePanel.set(panel);
    this.sidebarVisible.set(true);
  }

  openCommandCenter(): void {
    this.commandCenterOpen.set(true);
  }

  closeCommandCenter(): void {
    this.commandCenterOpen.set(false);
  }
}
