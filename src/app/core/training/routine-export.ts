import { createRoutineBackup, RoutinePlan } from './routine-backup';
export interface ExportFile { name: string; blob: Blob; }
export type ExportFormat = 'json' | 'pdf' | 'image';
interface Block { text: string; style: 'heading' | 'section' | 'body' | 'muted'; }
export function routineBlocks(plan: RoutinePlan): Block[] {
  const blocks: Block[] = [{ text: 'MINHA ROTINA', style: 'heading' }, { text: 'Sequência de treinos e biblioteca de exercícios', style: 'muted' }];
  plan.workouts.forEach((workout, index) => {
    blocks.push({ text: `${index + 1}. ${workout.name}${workout.id === plan.nextWorkoutId ? ' (próximo)' : ''}`, style: 'section' });
    workout.exercises.forEach((exercise, exerciseIndex) => {
      blocks.push({ text: `${exerciseIndex + 1}. ${exercise.name}`, style: 'body' });
      blocks.push({ text: exercise.kind === 'cardio' ? 'Cardio - duração medida ao iniciar e encerrar' : `${exercise.muscle} - ${exercise.sets} ${exercise.sets === 1 ? 'série' : 'séries'} - descanso: ${exercise.restSeconds} s`, style: 'muted' });
    });
  });
  blocks.push({ text: 'BIBLIOTECA DE EXERCÍCIOS', style: 'section' });
  plan.catalog.forEach((exercise, index) => blocks.push({ text: `${index + 1}. ${exercise.name} - ${exercise.kind === 'cardio' ? 'Cardio' : 'Musculação / ' + exercise.muscle}`, style: 'body' }));
  blocks.push({ text: 'Este documento contém a rotina cadastrada. Não inclui histórico, resultados ou sessão em andamento. Para importar a rotina no Academia, use a versão JSON.', style: 'muted' });
  return blocks;
}
function wrap(text: string, max: number, context: CanvasRenderingContext2D): string[] {
  const lines: string[] = []; let line = '';
  for (const word of text.split(/\s+/)) {
    if (context.measureText((line ? line + ' ' : '') + word).width <= max) { line += (line ? ' ' : '') + word; continue; }
    if (line) { lines.push(line); line = ''; }
    for (const char of Array.from(word)) {
      if (context.measureText(line + char).width > max) { lines.push(line); line = ''; }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}
interface DrawLine { text: string; y: number; size: number; bold: boolean; color: string; }
function documentPages(plan: RoutinePlan, context: CanvasRenderingContext2D): DrawLine[][] {
  const pages: DrawLine[][] = [[]]; let y = 190;
  for (const block of routineBlocks(plan)) {
    const size = block.style === 'heading' ? 44 : block.style === 'section' ? 32 : 25;
    const bold = block.style === 'heading' || block.style === 'section';
    const color = block.style === 'muted' ? '#46564b' : '#142c29';
    context.font = `${bold ? 'bold' : 'normal'} ${size}px Arial, sans-serif`;
    const lines = wrap(block.text, 1080, context), height = size * 1.5;
    const gap = block.style === 'section' ? 28 : 12;
    if (y + gap + Math.min(lines.length, 3) * height > 1610) { pages.push([]); y = 190; }
    y += gap;
    for (const text of lines) {
      if (y + height > 1610) { pages.push([]); y = 190; }
      pages[pages.length - 1].push({ text, y, size, bold, color }); y += height;
    }
  }
  return pages;
}
function drawPage(canvas: HTMLCanvasElement, lines: DrawLine[], page: number, total: number, date: string) {
  const context = canvas.getContext('2d'); if (!context) throw new Error('Não foi possível preparar a imagem.');
  context.fillStyle = '#f5f5eb'; context.fillRect(0, 0, 1240, 1754);
  context.fillStyle = '#142c29'; context.fillRect(0, 0, 1240, 116);
  context.fillStyle = '#f0d283'; context.font = 'bold 36px Arial, sans-serif'; context.fillText('ACADEMIA', 80, 74);
  context.fillStyle = '#142c29'; context.fillRect(80, 142, 1080, 4);
  for (const line of lines) { context.fillStyle = line.color; context.font = `${line.bold ? 'bold' : 'normal'} ${line.size}px Arial, sans-serif`; context.fillText(line.text, 80, line.y); }
  context.fillStyle = '#60766a'; context.fillRect(80, 1650, 1080, 2);
  context.font = '20px Arial, sans-serif'; context.fillText(`Rotina exportada em ${date}`, 80, 1694);
  context.textAlign = 'right'; context.fillText(`${page} / ${total}`, 1160, 1694); context.textAlign = 'left';
}
function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Não foi possível gerar a imagem.')), 'image/png'));
}
export async function exportRoutine(plan: RoutinePlan, format: ExportFormat): Promise<ExportFile[]> {
  const now = new Date(), localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const name = `academia-rotina-${localDate}`;
  if (format === 'json') return [{ name: name + '.json', blob: new Blob([JSON.stringify(createRoutineBackup(plan, now), null, 2)], { type: 'application/json' }) }];
  const canvas = document.createElement('canvas'); canvas.width = 1240; canvas.height = 1754;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Seu navegador não conseguiu criar a exportação visual.');
  const pages = documentPages(plan, context), date = now.toLocaleDateString('pt-BR');
  if (format === 'pdf') {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    pdf.setProperties({ title: 'Academia - Minha rotina', subject: 'Treinos e biblioteca de exercícios', creator: 'Academia' });
    for (let index = 0; index < pages.length; index++) {
      drawPage(canvas, pages[index], index + 1, pages.length, date);
      if (index) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, 210, 297);
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    canvas.width = 0; canvas.height = 0;
    return [{ name: name + '.pdf', blob: pdf.output('blob') }];
  }
  const files: ExportFile[] = [];
  for (let index = 0; index < pages.length; index++) {
    drawPage(canvas, pages[index], index + 1, pages.length, date);
    files.push({ name: `${name}-${String(index + 1).padStart(2, '0')}.png`, blob: await canvasBlob(canvas) });
  }
  canvas.width = 0; canvas.height = 0;
  return files;
}
