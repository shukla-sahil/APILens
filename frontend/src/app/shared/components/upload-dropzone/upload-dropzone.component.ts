import { ChangeDetectionStrategy, Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upload-dropzone',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label
      class="dropzone"
      [class.dropzone--active]="isActive()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <input type="file" accept=".json,.yaml,.yml" (change)="onFileInput($event)" />
      <h3>Upload OpenAPI or Postman specification</h3>
      <p>Drag and drop a JSON/YAML file here, or click to choose a file.</p>
      <span class="dropzone__meta">Accepted formats: OpenAPI JSON/YAML, Postman Collection JSON</span>
    </label>
  `,
  styles: [
    `
      .dropzone {
        background: linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 20%, transparent), transparent),
          var(--panel-bg);
        border: 1px dashed color-mix(in srgb, var(--brand-primary) 45%, var(--border-color));
        border-radius: 1rem;
        cursor: pointer;
        display: block;
        padding: 1.2rem;
        position: relative;
        transition: border-color 0.2s ease, transform 0.2s ease;
      }

      .dropzone:hover,
      .dropzone--active {
        border-color: var(--brand-primary);
        transform: translateY(-2px);
      }

      input[type='file'] {
        cursor: pointer;
        inset: 0;
        opacity: 0;
        position: absolute;
      }

      h3 {
        font-size: 1rem;
        margin: 0 0 0.35rem;
      }

      p {
        color: var(--text-secondary);
        margin: 0;
      }

      .dropzone__meta {
        color: var(--text-muted);
        display: inline-block;
        font-size: 0.8rem;
        margin-top: 0.7rem;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UploadDropzoneComponent {
  @Output() fileSelected = new EventEmitter<File>();

  readonly isActive = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isActive.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isActive.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isActive.set(false);

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
  }
}
