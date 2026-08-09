import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-task-manager',
  standalone: true,
  templateUrl: './task-manager.component.html',
  styleUrls: ['./task-manager.component.scss'],
  // La lista y los botones se crean con document.createElement() (nodos que
  // Angular no marca con su hash de encapsulated). Encapsulation.None permite
  // que los estilos namespaced utilicen también esos nodos dinámicos.
  encapsulation: ViewEncapsulation.None
})
export class TaskManagerComponent implements AfterViewInit {
  private readonly document = inject(DOCUMENT);

  @ViewChild('input', { static: true }) private readonly inputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('list', { static: true }) private readonly listRef!: ElementRef<HTMLUListElement>;
  @ViewChild('counter', { static: true }) private readonly counterRef!: ElementRef<HTMLElement>;
  @ViewChild('empty', { static: true }) private readonly emptyRef!: ElementRef<HTMLElement>;
  @ViewChild('error', { static: true }) private readonly errorRef!: ElementRef<HTMLElement>;

  private readonly CLASS_DONE = 'task-manager__task--done';

  ngAfterViewInit(): void {
    // Registro de eventos NATIVO con addEventListener (no (click) de Angular).
    this.document.getElementById('task-add')?.addEventListener('click', () => this.addTask());
    this.document.getElementById('task-form')?.addEventListener('submit', (ev) => {
      ev.preventDefault();
      this.addTask();
    });
  }

  private get input(): HTMLInputElement {
    return this.inputRef.nativeElement;
  }

  private get list(): HTMLUListElement {
    return this.listRef.nativeElement;
  }

  private get counter(): HTMLElement {
    return this.counterRef.nativeElement;
  }

  private get empty(): HTMLElement {
    return this.emptyRef.nativeElement;
  }

  private get error(): HTMLElement {
    return this.errorRef.nativeElement;
  }

  private updateCounter(): void {
    const pending = [...this.list.querySelectorAll<HTMLLIElement>('li')].filter(
      (li) => !li.classList.contains(this.CLASS_DONE)
    ).length;
    this.counter.textContent = `${pending} tarea${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'}`;
    this.empty.style.display = this.list.childElementCount === 0 ? '' : 'none';
  }

  private showError(message: string): void {
    this.error.textContent = message;
    this.error.hidden = false;
  }

  private hideError(): void {
    this.error.hidden = true;
  }

  addTask(): void {
    const text = this.input.value.trim();
    if (!text) {
      this.showError('Escribe una tarea antes de agregarla.');
      return;
    }

    this.hideError();

    // Crear el <li> con APIs nativas del DOM.
    const li = this.document.createElement('li');
    li.className = 'task-manager__task';

    const label = this.document.createElement('span');
    label.textContent = text;

    const doneBtn = this.document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.textContent = 'Completar';
    doneBtn.className = 'p-button p-component task-manager__btn';
    doneBtn.addEventListener('click', () => {
      li.classList.toggle(this.CLASS_DONE);
      this.updateCounter();
    });

    const delBtn = this.document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = 'Eliminar';
    delBtn.className = 'p-button p-component p-button-danger task-manager__btn task-manager__btn--danger';
    delBtn.addEventListener('click', () => {
      li.remove();
      this.updateCounter();
    });

    li.appendChild(label);
    li.appendChild(doneBtn);
    li.appendChild(delBtn);
    this.list.appendChild(li);

    this.input.value = '';
    this.updateCounter();
  }
}