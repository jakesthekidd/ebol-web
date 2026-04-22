import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { WizardStateService } from '../services/wizard-state.service';
import type { BOLTemplate } from '../types/bol-template.types';

@Component({
  selector: 'ebol-template-list',
  imports: [ButtonModule, TagModule, TableModule, TooltipModule, ConfirmDialogModule, DatePipe],
  styles: [`
    .page { padding: 2rem; }
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 1.5rem; gap: 1rem;
    }
    .page-title { font-size: 1.25rem; font-weight: 700; color: var(--p-text-color); margin: 0 0 0.25rem; }
    .page-sub   { font-size: 13px; color: var(--p-text-muted-color); margin: 0; }

    .empty-state {
      text-align: center; padding: 5rem 1rem; color: var(--p-text-muted-color);
    }
    .empty-state i { font-size: 3rem; opacity: 0.3; margin-bottom: 1rem; display: block; }
    .empty-state h3 { font-size: 1rem; font-weight: 600; margin: 0 0 0.5rem; color: var(--p-text-color); }
    .empty-state p  { font-size: 13px; margin: 0 0 1.5rem; }

    .tpl-name { font-weight: 600; font-size: 13px; color: var(--p-text-color); }
    .mapping-count { font-size: 12px; color: var(--p-text-muted-color); }
    .actions { display: flex; gap: 0.25rem; justify-content: flex-end; }
  `],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">BOL Templates</h1>
          <p class="page-sub">Configure how shipment data maps to your Bill of Lading documents</p>
        </div>
        <p-button label="New template" icon="pi pi-plus" (click)="newTemplate()" />
      </div>

      @if (wizard.allTemplates().length === 0) {
        <div class="empty-state">
          <i class="pi pi-file-edit"></i>
          <h3>No templates yet</h3>
          <p>Create a template to define how your shipment data populates a BOL document.</p>
          <p-button label="Create your first template" icon="pi pi-plus" (click)="newTemplate()" />
        </div>
      } @else {
        <p-table [value]="wizard.allTemplates()" [rowHover]="true" stripedRows>
          <ng-template pTemplate="header">
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Fields mapped</th>
              <th>Created</th>
              <th style="width: 120px;"></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-tpl>
            <tr>
              <td><span class="tpl-name">{{ tpl.name }}</span></td>
              <td>
                <p-tag
                  [value]="tpl.status === 'published' ? 'Published' : 'Draft'"
                  [severity]="tpl.status === 'published' ? 'success' : 'secondary'"
                />
              </td>
              <td>
                <span class="mapping-count">{{ tpl.mappings.length }} / 9 slots</span>
              </td>
              <td style="font-size: 12px; color: var(--p-text-muted-color);">
                {{ tpl.createdAt | date: 'MMM d, y' }}
              </td>
              <td>
                <div class="actions">
                  <p-button
                    icon="pi pi-pencil" [text]="true" [rounded]="true"
                    size="small" severity="secondary"
                    pTooltip="Edit template"
                    (click)="editTemplate(tpl)"
                  />
                  <p-button
                    icon="pi pi-trash" [text]="true" [rounded]="true"
                    size="small" severity="danger"
                    pTooltip="Delete template"
                    (click)="confirmDelete(tpl)"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
})
export class TemplateListComponent {
  wizard = inject(WizardStateService);
  private router = inject(Router);
  private confirmation = inject(ConfirmationService);

  newTemplate(): void {
    this.wizard.newTemplate();
    this.router.navigate(['/bol-builder/new']);
  }

  editTemplate(tpl: BOLTemplate): void {
    this.wizard.loadTemplate(tpl.id);
    this.router.navigate(['/bol-builder', tpl.id]);
  }

  confirmDelete(tpl: BOLTemplate): void {
    this.confirmation.confirm({
      message: `Delete "${tpl.name}"? This cannot be undone.`,
      header: 'Delete template',
      icon: 'pi pi-trash',
      accept: () => this.wizard.deleteTemplate(tpl.id),
    });
  }
}
