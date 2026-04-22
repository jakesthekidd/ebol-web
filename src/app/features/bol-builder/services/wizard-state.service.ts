import { effect, Injectable, signal } from '@angular/core';
import { MOCK_SHIPMENT } from '../mock/mock-shipment';
import type { BOLTemplate, FieldMapping } from '../types/bol-template.types';

const STORAGE_KEY = 'ebol_bol_templates';

function generateId(): string {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptyTemplate(): BOLTemplate {
  return {
    id: generateId(),
    name: 'Untitled Template',
    status: 'draft',
    mappings: [],
    createdAt: new Date().toISOString(),
  };
}

function loadTemplates(): BOLTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BOLTemplate[]) : [];
  } catch {
    return [];
  }
}

@Injectable({ providedIn: 'root' })
export class WizardStateService {
  readonly mockData = MOCK_SHIPMENT;

  // Wizard session state
  step = signal<1 | 2 | 3>(1);
  template = signal<BOLTemplate>(emptyTemplate());
  selectedApiKeys = signal<Set<string>>(new Set());
  selectedFieldId = signal<string | null>(null);

  // Persisted template list
  allTemplates = signal<BOLTemplate[]>(loadTemplates());

  constructor() {
    effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.allTemplates()));
    });
  }

  newTemplate(): void {
    this.template.set(emptyTemplate());
    this.selectedApiKeys.set(new Set());
    this.selectedFieldId.set(null);
    this.step.set(1);
  }

  loadTemplate(id: string): void {
    const found = this.allTemplates().find((t) => t.id === id);
    if (!found) return;
    this.template.set({ ...found });
    // Rebuild selected keys from existing mappings — only valid MOCK_SHIPMENT keys
    const validKeys = new Set(Object.keys(MOCK_SHIPMENT));
    const keys = new Set(
      found.mappings
        .map((m) => m.apiKey as string)
        .filter((k) => k && validKeys.has(k))
    );
    this.selectedApiKeys.set(keys);
    this.selectedFieldId.set(null);
    this.step.set(1);
  }

  setStep(n: 1 | 2 | 3): void {
    this.step.set(n);
  }

  toggleApiKey(key: string): void {
    this.selectedApiKeys.update((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  updateMapping(m: FieldMapping): void {
    this.template.update((t) => {
      const existing = t.mappings.findIndex((x) => x.fieldId === m.fieldId);
      const mappings =
        existing >= 0
          ? t.mappings.map((x, i) => (i === existing ? m : x))
          : [...t.mappings, m];
      return { ...t, mappings };
    });
    this._autosave();
  }

  removeMapping(fieldId: string): void {
    this.template.update((t) => ({
      ...t,
      mappings: t.mappings.filter((m) => m.fieldId !== fieldId),
    }));
    this._autosave();
  }

  updateTemplateName(name: string): void {
    this.template.update((t) => ({ ...t, name }));
    this._autosave();
  }

  setLogo(dataUrl: string | null): void {
    this.template.update((t) => ({ ...t, logoDataUrl: dataUrl ?? undefined }));
    this._autosave();
  }

  selectField(id: string | null): void {
    this.selectedFieldId.set(id);
  }

  saveAsDraft(): void {
    this.template.update((t) => ({ ...t, status: 'draft' }));
    this._upsert();
  }

  publishTemplate(): void {
    this.template.update((t) => ({ ...t, status: 'published' }));
    this._upsert();
  }

  deleteTemplate(id: string): void {
    this.allTemplates.update((list) => list.filter((t) => t.id !== id));
  }

  private _autosave(): void {
    const t = this.template();
    const exists = this.allTemplates().some((x) => x.id === t.id);
    if (exists) this._upsert();
  }

  private _upsert(): void {
    const t = this.template();
    this.allTemplates.update((list) => {
      const idx = list.findIndex((x) => x.id === t.id);
      return idx >= 0 ? list.map((x, i) => (i === idx ? t : x)) : [t, ...list];
    });
  }
}
