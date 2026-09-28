import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  title: string;
  detail?: string;
  tone: 'success' | 'ai' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  show(title: string, detail?: string, tone: Toast['tone'] = 'success'): void {
    const id = ++this.seq;
    this.toasts.update((t) => [...t.slice(-3), { id, title, detail, tone }]);
    setTimeout(() => this.dismiss(id), 4200);
  }

  dismiss(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
