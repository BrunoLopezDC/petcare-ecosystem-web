import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

interface NoteDef {
  icon: string;
  text: string;
}

const NOTES: NoteDef[] = [
  { icon: 'pi pi-drop', text: 'Recuerda revisar el agua fresca de tu mascota.' },
  { icon: 'pi pi-sun', text: 'Un paseo corto al día mantiene feliz a tu perro.' },
  { icon: 'pi pi-book', text: 'Anota la próxima cita de vacunación.' },
  { icon: 'pi pi-heart', text: 'Dedica unos minutos a cepillar su pelaje.' }
];

@Component({
  selector: 'app-dom-demo',
  standalone: true,
  imports: [],
  templateUrl: './dom-demo.component.html',
  styleUrls: ['./dom-demo.component.scss'],
  // Las notas se crean con document.createElement() (nodos que Angular no
  // marca con su hash de encapsulado). Encapsulation.None permite que los
  // estilos namespaced apply tras esos nodos dinámicos.
  encapsulation: ViewEncapsulation.None
})
export class DomDemoComponent implements AfterViewInit {
  // Referencia al nodo nativo del navegador, no al DOM virtual de Angular.
  private readonly document = inject(DOCUMENT);

  @ViewChild('container', { static: true })
  private readonly containerRef!: ElementRef<HTMLDivElement>;

  private noteIndex = 0;
  private clickCount = 0;

  ngAfterViewInit(): void {
    // Registro de evento NATIVO con addEventListener (no binding (click) de Angular).
    const demo = this.document.querySelector<HTMLElement>('.dom-demo');
    demo?.addEventListener('mouseenter', () => {
      demo.classList.add('dom-demo--hover');
    });
    demo?.addEventListener('mouseleave', () => {
      demo.classList.remove('dom-demo--hover');
    });
  }

  private get container(): HTMLDivElement {
    return this.containerRef.nativeElement;
  }

  /** Crea y agrega una tarjeta de nota al contenedor usando APIs nativas del DOM. */
  addNote(): void {
    const note = this.document.createElement('div');
    note.classList.add('dom-demo__note');

    const icon = this.document.createElement('i');
    icon.className = `pi ${NOTES[this.noteIndex].icon}`;

    const label = this.document.createElement('span');
    label.textContent = NOTES[this.noteIndex].text;

    note.appendChild(icon);
    note.appendChild(label);

    this.container.appendChild(note);
    this.noteIndex = (this.noteIndex + 1) % NOTES.length;
  }

  /** Alterna una clase sobre el título usando querySelector + classList.toggle. */
  toggleStyle(): void {
    const title = this.document.querySelector<HTMLElement>('.dom-demo__title');
    title?.classList.toggle('dom-demo__title--highlight');
  }

  /** Actualiza el texto de un elemento por su id sin binding ({{ }}) de Angular. */
  updateContent(): void {
    this.clickCount++;
    const el = this.document.getElementById('dom-demo-clock');
    if (el) {
      const now = new Date();
      el.textContent = `Actualización #${this.clickCount} — ${now.toLocaleTimeString()}`;
    }
  }

  /** Elimina la última nota agregada usando remove() (API nativa del DOM). */
  removeLastNote(): void {
    const last = this.container.lastElementChild;
    last?.remove();
  }
}