export interface ContentAppGeneratorSchema {
  /** App id everywhere: project name, manifest id, API prefix. Kebab-case. */
  name: string;
  /** Manifest name + tab labels. Defaults to title-cased `name`. */
  displayName?: string;
  /** PrimeIcons class, `^pi pi-[a-z-]+$`. Defaults to `pi pi-box`. */
  icon?: string;
  /** Dev serve port. Defaults to the next free 42xx port. */
  port?: number;
  /** Proxy target for the team's Java service. Defaults to `port + 4000`. */
  backendPort?: number;
  /** Include `menu.customerMenuUrl` in the manifest. Defaults to true. */
  customerMenu?: boolean;
  /** Emit to `dist/team-templates/` for external teams. Defaults to false. */
  standaloneRepo?: boolean;
}
