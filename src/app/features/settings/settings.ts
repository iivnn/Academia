import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, Field, Panel } from '../../shared/ui';
import { TrainingStore } from '../../core/training/training.store';
import { createRoutineBackup, MAX_BACKUP_BYTES, readRoutineBackup, RoutinePlan } from '../../core/training/routine-backup';
import { ExportFormat, exportRoutine } from '../../core/training/routine-export';
@Component({ selector: 'app-settings', imports: [RouterLink, Button, Field, Panel], templateUrl: './settings.html', styleUrl: './settings.css' })
export class Settings {
  readonly store = inject(TrainingStore);
  readonly success = signal(false);
  readonly error = signal('');
  readonly format = signal<ExportFormat>('json');
  readonly exporting = signal(false);
  readonly reading = signal(false);
  readonly notice = signal('');
  readonly operationError = signal('');
  readonly files = signal<{ name: string; url: string }[]>([]);
  readonly importPlan = signal<RoutinePlan | null>(null);
  readonly importFileName = signal('');
  readonly importError = signal('');
  readonly seedError = signal('');
  private readonly seedDialog = viewChild.required<ElementRef<HTMLDialogElement>>('seedDialog');
  private destroyed = false;
  private readonly importDialog = viewChild.required<ElementRef<HTMLDialogElement>>('importDialog');
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('resetDialog');
  constructor() { inject(DestroyRef).onDestroy(() => { this.destroyed = true; this.releaseFiles(); }); }
  private releaseFiles() { for (const file of this.files()) URL.revokeObjectURL(file.url); this.files.set([]); }
  setFormat(value: string) { this.format.set(value === 'pdf' || value === 'image' ? value : 'json'); this.releaseFiles(); this.notice.set(''); }
  async export() {
    if (this.exporting() || !this.store.ready() || !this.store.state().workouts.length) return;
    this.exporting.set(true); this.operationError.set(''); this.notice.set(''); this.releaseFiles();
    try {
      const snapshot = structuredClone(this.store.state());
      readRoutineBackup(JSON.stringify(createRoutineBackup(snapshot)));
      const files = await exportRoutine(snapshot, this.format());
      if (this.destroyed) return;
      this.files.set(files.map(file => ({ name: file.name, url: URL.createObjectURL(file.blob) })));
      this.notice.set(files.length > 1 ? `Exportação pronta em ${files.length} imagens. Baixe todas para ter a rotina completa.` : 'Exportação pronta. Toque no arquivo abaixo para baixar.');
    } catch (error) { this.operationError.set(error instanceof Error ? error.message : 'Não foi possível exportar a rotina.'); }
    finally { this.exporting.set(false); }
  }
  async readImport(event: Event) {
    const input = event.target as HTMLInputElement, file = input.files?.[0];
    if (!file || this.reading() || this.store.resetting()) return;
    this.reading.set(true); this.operationError.set(''); this.notice.set(''); this.importError.set('');
    try {
      if (!file.name.toLowerCase().endsWith('.json')) throw new Error('Escolha um arquivo JSON exportado pelo Academia.');
      if (file.size > MAX_BACKUP_BYTES) throw new Error('O arquivo deve ter no máximo 2 MB.');
      const plan = readRoutineBackup(await file.text());
      if (this.destroyed) return;
      this.importPlan.set(plan); this.importFileName.set(file.name); this.importDialog().nativeElement.showModal();
    } catch (error) { this.operationError.set(error instanceof Error ? error.message : 'Não foi possível ler o arquivo.'); }
    finally { this.reading.set(false); input.value = ''; }
  }
  cancelImport() { if (!this.store.resetting()) { this.importDialog().nativeElement.close(); this.importPlan.set(null); this.notice.set('Importação cancelada. A rotina atual foi mantida.'); } }
  async confirmImport() {
    const plan = this.importPlan(); if (!plan || this.store.resetting()) return;
    this.importError.set('');
    if (await this.store.importRoutine(plan)) {
      this.importDialog().nativeElement.close(); this.importPlan.set(null); this.success.set(false);
      this.notice.set('Rotina importada. A biblioteca e a sequência foram substituídas. O histórico anterior foi preservado; a nova rotina começa com novas referências.');
    } else this.importError.set(this.store.error());
  }
  openReset() { this.error.set(''); this.success.set(false); this.dialog().nativeElement.showModal(); }
  openSeed() { this.seedError.set(''); this.seedDialog().nativeElement.showModal(); }
  cancelSeed() { if (!this.store.resetting()) this.seedDialog().nativeElement.close(); }
  async confirmSeed() {
    if (this.store.resetting()) return;
    this.seedError.set('');
    if (await this.store.loadTestData()) {
      this.seedDialog().nativeElement.close(); this.success.set(false); this.releaseFiles(); this.operationError.set('');
      this.notice.set('Base fictícia carregada: 180 sessões, 3 treinos e 14 exercícios. Abra Evolução para explorar os gráficos.');
    } else this.seedError.set(this.store.error());
  }
  cancelReset() { if (!this.store.resetting()) this.dialog().nativeElement.close(); }
  async confirmReset() {
    if (this.store.resetting()) return;
    this.error.set('');
    if (await this.store.resetAll()) { this.dialog().nativeElement.close(); this.success.set(true); this.releaseFiles(); this.notice.set(''); this.operationError.set(''); }
    else this.error.set(this.store.error());
  }
}
