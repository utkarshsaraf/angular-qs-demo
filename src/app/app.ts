import { Component, signal, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SafePipe } from './safe.pipe';
import { environment } from '../environments/environment';
import { createEmbeddingContext, EmbeddingContext, DashboardExperience } from 'amazon-quicksight-embedding-sdk';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SafePipe, FormsModule],
  templateUrl: './app.html'
})
export class App implements OnInit, OnDestroy {
  @ViewChild('dashboardContainer', { static: true }) dashboardContainer!: ElementRef;

  protected readonly embedConfig = signal({
    title: environment.quicksight.defaultTitle,
    url: environment.quicksight.defaultUrl,
    width: environment.quicksight.defaultWidth,
    height: environment.quicksight.defaultHeight
  });

  protected readonly newUrl = signal('');
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly isQuickSightMode = signal(false);

  private embeddingContext: EmbeddingContext | null = null;
  private currentDashboard: DashboardExperience | null = null;

  async ngOnInit() {
    try {
      // Create the embedding context for QuickSight (but don't use it initially)
      this.embeddingContext = await createEmbeddingContext({
        onChange: (changeEvent) => {
          console.log('QuickSight context change:', changeEvent);
          // Handle context changes - log for debugging
        }
      });
      
      // Initially load YouTube content in iframe mode
      this.isQuickSightMode.set(false);
    } catch (error) {
      console.error('Failed to initialize QuickSight embedding:', error);
      this.errorMessage.set('Failed to initialize QuickSight embedding');
    }
  }

  ngOnDestroy() {
    if (this.currentDashboard) {
      // Clean up dashboard if needed
      this.currentDashboard = null;
    }
  }

  async updateEmbedUrl() {
    if (this.newUrl().trim()) {
      const url = this.newUrl().trim();
      this.embedConfig.update(config => ({
        ...config,
        url: url
      }));
      
      try {
        // Check if it's a QuickSight URL
        if (this.isQuickSightUrl(url)) {
          await this.switchToQuickSightMode(url);
        } else {
          // Switch back to iframe mode for non-QuickSight URLs
          this.switchToIframeMode();
        }
        
        this.newUrl.set('');
        this.errorMessage.set('');
      } catch (error) {
        console.error('Failed to update content:', error);
        this.errorMessage.set('Failed to update content');
      }
    }
  }

  async resetToDefault() {
    const defaultConfig = {
      title: environment.quicksight.defaultTitle,
      url: environment.quicksight.defaultUrl,
      width: environment.quicksight.defaultWidth,
      height: environment.quicksight.defaultHeight
    };
    
    this.embedConfig.set(defaultConfig);
    
    try {
      // Reset to iframe mode for YouTube
      this.switchToIframeMode();
      this.errorMessage.set('');
    } catch (error) {
      console.error('Failed to reset content:', error);
      this.errorMessage.set('Failed to reset content');
    }
  }

  private isQuickSightUrl(url: string): boolean {
    return url.includes('quicksight.aws.amazon.com') || url.includes('quicksight.amazonaws.com');
  }

  private async switchToQuickSightMode(url: string) {
    if (!this.embeddingContext) {
      throw new Error('Embedding context not initialized');
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      // Clean up existing dashboard if any
      if (this.currentDashboard) {
        this.currentDashboard = null;
      }

      // Update title for QuickSight
      this.embedConfig.update(config => ({
        ...config,
        title: 'QuickSight Dashboard'
      }));

      // Embed the QuickSight dashboard
      this.currentDashboard = await this.embeddingContext.embedDashboard({
        url: url,
        container: this.dashboardContainer.nativeElement,
        width: this.embedConfig().width,
        height: this.embedConfig().height,
        withIframePlaceholder: true,
        onChange: (changeEvent) => {
          console.log('Dashboard change event:', changeEvent);
          // Handle dashboard changes - log for debugging
        }
      });

      this.isQuickSightMode.set(true);
      console.log('Switched to QuickSight mode');
    } catch (error) {
      console.error('Error switching to QuickSight mode:', error);
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  private switchToIframeMode() {
    // Clean up QuickSight dashboard if any
    if (this.currentDashboard) {
      this.currentDashboard = null;
    }

    // Update title for iframe content
    this.embedConfig.update(config => ({
      ...config,
      title: 'Embedded Content'
    }));

    this.isQuickSightMode.set(false);
    console.log('Switched to iframe mode');
  }
}
