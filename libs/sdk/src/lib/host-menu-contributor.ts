import { inject, Injectable } from '@angular/core';
import type { MenuNode } from '@rwp2/contracts';
import { Workbench } from './workbench';

/**
 * Thin helper for live, instance-specific sidebar contributions — open drafts,
 * in-progress work (06 §2). Everything predictable belongs in the manifest or
 * the customer-menu endpoint, not here. Tracks the last-published set so a
 * component can add/remove items without recomputing the whole list.
 */
@Injectable({ providedIn: 'root' })
export class HostMenuContributor {
  private readonly wb = inject(Workbench);
  private items: MenuNode[] = [];

  /** Replace the running instance's contributed items. */
  set(items: MenuNode[]): void {
    this.items = [...items];
    this.wb.contributeMenu(this.items);
  }

  /** Add one item (deduped by id) and re-publish. */
  add(item: MenuNode): void {
    this.set([...this.items.filter((i) => i.id !== item.id), item]);
  }

  /** Remove one item by id and re-publish. */
  remove(id: string): void {
    this.set(this.items.filter((i) => i.id !== id));
  }

  /** Drop all contributed items. */
  clear(): void {
    this.set([]);
  }

  current(): readonly MenuNode[] {
    return this.items;
  }
}
