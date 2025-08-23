import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SafePipe } from './safe.pipe';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SafePipe, FormsModule],
  templateUrl: './app.html'
})
export class App {
  protected readonly embedConfig = signal({
    title: environment.quicksight.defaultTitle,
    url: environment.quicksight.defaultUrl,
    width: environment.quicksight.defaultWidth,
    height: environment.quicksight.defaultHeight
  });

  protected readonly newUrl = signal('');

  updateEmbedUrl() {
    if (this.newUrl().trim()) {
      const url = this.newUrl().trim();
      this.embedConfig.update(config => ({
        ...config,
        url: url
      }));
      this.newUrl.set('');
    }
  }

  resetToDefault() {
    this.embedConfig.set({
      title: environment.quicksight.defaultTitle,
      url: environment.quicksight.defaultUrl,
      width: environment.quicksight.defaultWidth,
      height: environment.quicksight.defaultHeight
    });
  }
}
