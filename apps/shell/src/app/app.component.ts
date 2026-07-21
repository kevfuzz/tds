import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WorkbenchStore } from './state/workbench.store';
import { ShellUiStore } from './state/shell-ui.store';
import { MenuBarComponent } from './chrome/menu-bar/menu-bar.component';
import { ActivityRailComponent } from './chrome/activity-rail/activity-rail.component';
import { SidebarComponent } from './chrome/sidebar/sidebar.component';
import { TabStripComponent } from './chrome/tab-strip/tab-strip.component';
import { StatusBarComponent } from './chrome/status-bar/status-bar.component';
import { SplashComponent } from './chrome/splash/splash.component';
import { CommandCenterComponent } from './chrome/command-center/command-center.component';
import { ContentAreaComponent } from './content/content-area.component';

/**
 * Fixed bands, the shell NEVER scrolls (05 §3): menu bar 36px · content row
 * (rail · sidebar · [tab strip 36px + content area]) · status bar 24px.
 * While `state()` is null the splash covers everything (auth/registry boot).
 */
@Component({
  selector: 'rwp-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MenuBarComponent,
    ActivityRailComponent,
    SidebarComponent,
    TabStripComponent,
    StatusBarComponent,
    SplashComponent,
    CommandCenterComponent,
    ContentAreaComponent,
  ],
  template: `
    @if (store.state()) {
      <div class="flex h-full w-full flex-col overflow-hidden">
        <rwp-menu-bar class="shrink-0" style="height: 36px"></rwp-menu-bar>
        <div class="flex min-h-0 flex-1">
          <rwp-activity-rail class="shrink-0"></rwp-activity-rail>
          @if (ui.sidebarVisible()) {
            <rwp-sidebar class="shrink-0" style="width: 264px"></rwp-sidebar>
          }
          <div class="flex min-w-0 flex-1 flex-col">
            <rwp-tab-strip class="shrink-0" style="height: 36px"></rwp-tab-strip>
            <rwp-content-area class="flex min-h-0 flex-1"></rwp-content-area>
          </div>
        </div>
        <rwp-status-bar class="shrink-0" style="height: 24px"></rwp-status-bar>
      </div>
      <rwp-command-center></rwp-command-center>
    } @else {
      <rwp-splash></rwp-splash>
    }
  `,
})
export class AppComponent {
  readonly store = inject(WorkbenchStore);
  readonly ui = inject(ShellUiStore);
}
