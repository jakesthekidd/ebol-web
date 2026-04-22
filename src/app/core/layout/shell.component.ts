import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MessageService } from 'primeng/api';
import type { MenuItem } from 'primeng/api';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../../features/auth/auth.service';
import { supabase } from '../../lib/supabase/client';
import type { Tables } from '../../lib/supabase/database.types';

@Component({
  selector: 'ebol-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ToastModule,
    ConfirmDialogModule,
    ButtonModule,
    MenuModule,
  ],
  styles: [
    `
      .shell {
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
      }
      .header {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0 1.25rem;
        min-height: 56px;
        background: #004b87;
        color: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      }
      .header-left {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        min-width: 0;
      }
      .brand {
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }
      .account-trigger {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        max-width: 320px;
        padding: 0.35rem 0.5rem;
        margin: 0;
        border: none;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        font-size: 12px;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
      }
      .account-trigger:hover {
        background: rgba(255, 255, 255, 0.18);
      }
      .account-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .header-nav {
        display: flex;
        align-items: stretch;
        gap: 0.25rem;
      }
      .nav-link {
        display: inline-flex;
        align-items: center;
        padding: 0.5rem 0.85rem;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        text-decoration: none;
        color: rgba(255, 255, 255, 0.92);
        border: none;
        border-bottom: 3px solid transparent;
        background: transparent;
        cursor: pointer;
        font-family: inherit;
        border-radius: 0;
      }
      .nav-link:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.08);
      }
      .nav-link.active {
        color: #ffd54f;
        border-bottom-color: #ffd54f;
      }
      .nav-link .pi {
        font-size: 0.65rem;
        margin-left: 0.25rem;
        opacity: 0.9;
      }
      .main {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .main-fill {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .main-fill > :not(router-outlet) {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
    `,
  ],
  template: `
    <p-toast position="top-right" />
    <p-confirmdialog />

    <div class="shell">
      <header class="header">
        <div class="header-left">
          <span class="brand">TRANSFLO Command Center</span>
          <button type="button" class="account-trigger" (click)="accountMenu.toggle($event)">
            <span class="account-text">{{ accountLabel() }}</span>
            <i class="pi pi-chevron-down" style="flex-shrink: 0; font-size: 10px;"></i>
          </button>
          <p-menu #accountMenu [model]="accountMenuItems" [popup]="true" appendTo="body" />
        </div>

        <nav class="header-nav">
          <a
            class="nav-link"
            routerLink="/"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            >HOME</a
          >
          <a class="nav-link" routerLink="/locations" routerLinkActive="active">LOCATIONS</a>
          <button type="button" class="nav-link" (click)="ebolMenu.toggle($event)">
            eBOL/ePOD
            <i class="pi pi-angle-down"></i>
          </button>
          <p-menu #ebolMenu [model]="ebolMenuItems" [popup]="true" appendTo="body" />
          <button type="button" class="nav-link" (click)="moreMenu.toggle($event)">
            MORE
            <i class="pi pi-angle-down"></i>
          </button>
          <p-menu #moreMenu [model]="moreMenuItems" [popup]="true" appendTo="body" />
        </nav>
      </header>

      <main class="main">
        <div class="main-fill">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class ShellComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  unreadCount = signal(0);

  private notificationChannel: RealtimeChannel | null = null;

  readonly userEmail = computed(() => this.auth.user()?.email ?? '');
  readonly displayName = computed(() => {
    const email = this.auth.user()?.email ?? '';
    return email.split('@')[0] || 'Shipper';
  });
  readonly accountLabel = computed(() => {
    const name = this.displayName();
    const email = this.userEmail();
    const short = email ? email.split('@')[0].toUpperCase() : 'SHIPPER';
    return `${name} • ${short} • shipper`;
  });

  ebolMenuItems: MenuItem[] = [];

  moreMenuItems: MenuItem[] = [
    {
      label: 'Shipment Repository',
      icon: 'pi pi-folder-open',
      command: () => void this.router.navigate(['/repository']),
    },
    {
      label: 'New Shipment',
      icon: 'pi pi-plus-circle',
      command: () => void this.router.navigate(['/upload']),
    },
    { separator: true },
    {
      label: 'BOL Templates',
      icon: 'pi pi-file-edit',
      command: () => void this.router.navigate(['/bol-builder']),
    },
  ];

  accountMenuItems: MenuItem[] = [];

  ngOnInit(): void {
    this.rebuildAccountMenu();
    this.rebuildEbolMenu();
    this.loadUnreadCount();
    this.subscribeToNotifications();
  }

  ngOnDestroy(): void {
    if (this.notificationChannel) {
      supabase.removeChannel(this.notificationChannel);
    }
  }

  private rebuildAccountMenu(): void {
    this.accountMenuItems = [
      { label: this.userEmail() || 'Signed in', disabled: true },
      { separator: true },
      {
        label: 'Sign out',
        icon: 'pi pi-sign-out',
        command: () => void this.onSignOut(),
      },
    ];
  }

  private rebuildEbolMenu(): void {
    const n = this.unreadCount();
    this.ebolMenuItems = [
      {
        label: 'New Shipment',
        command: () => void this.router.navigate(['/upload']),
      },
      {
        label: 'View eBOL/ePOD',
        command: () => void this.router.navigate(['/repository']),
        badge: n > 0 ? String(n) : undefined,
      },
    ];
  }

  private async loadUnreadCount(): Promise<void> {
    const uid = this.auth.uid;
    if (!uid) return;

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('read', false);

    this.unreadCount.set(count ?? 0);
    this.rebuildEbolMenu();
  }

  private subscribeToNotifications(): void {
    const uid = this.auth.uid;
    if (!uid) return;

    this.notificationChannel = supabase
      .channel('shell-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
        (payload) => {
          const n = payload.new as Tables<'notifications'>;
          this.unreadCount.update((c) => c + 1);
          this.rebuildEbolMenu();
          this.messageService.add({
            severity: 'info',
            summary: n.title,
            detail: n.body,
            life: 5000,
          });
        }
      )
      .subscribe();
  }

  async onSignOut(): Promise<void> {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
