import { Component, signal, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SafePipe } from './safe.pipe';
import { environment } from '../environments/environment';
import { createEmbeddingContext, EmbeddingContext, DashboardExperience } from 'amazon-quicksight-embedding-sdk';
import { DebugLoggerService } from '../logger';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SafePipe, FormsModule],
  templateUrl: './app.html'
})
export class App implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('dashboardContainer', { static: false }) dashboardContainer!: ElementRef;

  protected readonly embedConfig = signal({
    title: environment.quicksight.defaultTitle,
    url: environment.quicksight.defaultUrl,
    width: environment.quicksight.defaultWidth,
    height: environment.quicksight.defaultHeight
  });

  protected readonly newUrl = signal('');
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly errorDetails = signal<any>(null);

  private embeddingContext: EmbeddingContext | null = null;
  private currentDashboard: DashboardExperience | null = null;
  private isViewInitialized = false;

  constructor(private logger: DebugLoggerService) {}

  async ngOnInit() {
    this.logger.info('Application initializing', { 
      defaultUrl: this.embedConfig().url,
      defaultTitle: this.embedConfig().title 
    }, 'App');

    try {
      // Create the embedding context for QuickSight
      this.logger.debug('Creating QuickSight embedding context', null, 'App');
      this.embeddingContext = await createEmbeddingContext({
        onChange: (changeEvent) => {
          this.logger.info('QuickSight context change event', changeEvent, 'QuickSight');
        }
      });
      
      this.logger.info('Application initialized successfully', { 
        url: this.embedConfig().url 
      }, 'App');
    } catch (error) {
      this.logger.error('Failed to initialize QuickSight embedding', error, 'App');
      this.errorMessage.set('Failed to initialize QuickSight embedding');
    }
  }

  ngAfterViewInit() {
    // Use a small delay to ensure the view is fully rendered
    setTimeout(() => {
      this.isViewInitialized = true;
      this.logger.debug('View initialized, dashboard container available', {
        containerExists: !!this.dashboardContainer,
        containerElement: !!this.dashboardContainer?.nativeElement,
        containerRef: this.dashboardContainer
      }, 'App');
    }, 50);
  }

  ngOnDestroy() {
    this.logger.info('Application destroying', null, 'App');
    if (this.currentDashboard) {
      // Clean up dashboard if needed
      this.currentDashboard = null;
      this.logger.debug('QuickSight dashboard cleaned up', null, 'App');
    }
  }

  async updateEmbedUrl() {
    if (this.newUrl().trim()) {
      const url = this.newUrl().trim();
      this.logger.info('Updating QuickSight dashboard URL', { 
        oldUrl: this.embedConfig().url,
        newUrl: url 
      }, 'App');

      this.embedConfig.update(config => ({
        ...config,
        url: url
      }));
      
      try {
        await this.embedDashboard(url);
        this.newUrl.set('');
        this.errorMessage.set('');
        this.errorDetails.set(null);
        this.logger.info('Dashboard URL updated successfully', { 
          finalUrl: url
        }, 'App');
      } catch (error) {
        const errorInfo = {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          stack: error instanceof Error ? error.stack : null,
          error: error,
          timestamp: new Date().toISOString(),
          url: url,
          containerState: {
            isViewInitialized: this.isViewInitialized,
            containerExists: !!this.dashboardContainer,
            nativeElement: !!this.dashboardContainer?.nativeElement
          }
        };
        
        this.logger.error('Failed to update dashboard', errorInfo, 'App');
        this.errorMessage.set(`Failed to update dashboard: ${errorInfo.message}`);
        this.errorDetails.set(errorInfo);
      }
    }
  }

  async resetToDefault() {
    this.logger.info('Resetting to default configuration', null, 'App');
    
    const defaultConfig = {
      title: environment.quicksight.defaultTitle,
      url: environment.quicksight.defaultUrl,
      width: environment.quicksight.defaultWidth,
      height: environment.quicksight.defaultHeight
    };
    
    this.embedConfig.set(defaultConfig);
    
    try {
      await this.embedDashboard(defaultConfig.url);
      this.errorMessage.set('');
      this.errorDetails.set(null);
      this.logger.info('Reset to default completed successfully', defaultConfig, 'App');
    } catch (error) {
      const errorInfo = {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        stack: error instanceof Error ? error.stack : null,
        error: error,
        timestamp: new Date().toISOString(),
        operation: 'resetToDefault',
        defaultConfig: defaultConfig
      };
      
      this.logger.error('Failed to reset dashboard', errorInfo, 'App');
      this.errorMessage.set(`Failed to reset dashboard: ${errorInfo.message}`);
      this.errorDetails.set(errorInfo);
    }
  }

  private async embedDashboard(url: string) {
    if (!this.embeddingContext) {
      const error = 'Embedding context not initialized';
      this.logger.error(error, null, 'App');
      throw new Error(error);
    }

    // Wait for the view to be fully initialized and container to be available
    if (!this.isViewInitialized) {
      this.logger.debug('Waiting for view initialization', null, 'App');
      // Wait a bit for the view to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait for container to be available with retry mechanism
    const containerReady = await this.waitForContainer();
    if (!containerReady) {
      const error = 'Dashboard container not available after retries';
      this.logger.error(error, {
        isViewInitialized: this.isViewInitialized,
        containerExists: !!this.dashboardContainer,
        nativeElement: !!this.dashboardContainer?.nativeElement
      }, 'App');
      throw new Error(error);
    }

    this.logger.info('Embedding QuickSight dashboard', { url }, 'App');
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      // Clean up existing dashboard if any
      if (this.currentDashboard) {
        this.logger.debug('Cleaning up existing QuickSight dashboard', null, 'App');
        this.currentDashboard = null;
      }

      // Embed the QuickSight dashboard
      this.logger.debug('Embedding QuickSight dashboard', { 
        url, 
        container: 'dashboardContainer',
        width: this.embedConfig().width,
        height: this.embedConfig().height
      }, 'QuickSight');

      this.currentDashboard = await this.embeddingContext.embedDashboard({
        url: url,
        container: this.dashboardContainer.nativeElement,
        width: this.embedConfig().width,
        height: this.embedConfig().height,
        withIframePlaceholder: true,
        onChange: (changeEvent) => {
          this.logger.debug('Dashboard change event', changeEvent, 'QuickSight');
        }
      });

      this.logger.info('Successfully embedded QuickSight dashboard', { 
        url,
        dashboardId: this.currentDashboard ? 'active' : 'none'
      }, 'QuickSight');
    } catch (error) {
      this.logger.error('Error embedding QuickSight dashboard', error, 'QuickSight');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  private async waitForContainer(maxRetries: number = 5, delay: number = 100): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      if (this.dashboardContainer?.nativeElement) {
        this.logger.debug(`Container ready after ${i + 1} attempts`, null, 'App');
        return true;
      }
      
      this.logger.debug(`Waiting for container, attempt ${i + 1}/${maxRetries}`, null, 'App');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.logger.error('Container not ready after maximum retries', {
      maxRetries,
      delay,
      containerExists: !!this.dashboardContainer,
      nativeElement: !!this.dashboardContainer?.nativeElement
    }, 'App');
    return false;
  }

  // Debug methods for development
  downloadLogs() {
    this.logger.downloadLogs();
  }

  clearLogs() {
    this.logger.clearLogs();
  }

  getLogs(): string {
    return this.logger.getLogs();
  }

  viewLogsInConsole() {
    const logs = this.getLogs();
    console.log('=== Current Debug Logs ===');
    console.log(logs);
    console.log('=== End of Logs ===');
  }

  copyErrorDetails() {
    if (this.errorDetails()) {
      try {
        const errorText = JSON.stringify(this.errorDetails(), null, 2);
        navigator.clipboard.writeText(errorText).then(() => {
          this.logger.info('Error details copied to clipboard', null, 'App');
        }).catch(() => {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = errorText;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          this.logger.info('Error details copied to clipboard (fallback method)', null, 'App');
        });
      } catch (error) {
        this.logger.error('Failed to copy error details', error, 'App');
      }
    }
  }

  clearErrors() {
    this.errorMessage.set('');
    this.errorDetails.set(null);
    this.logger.info('Errors cleared by user', null, 'App');
  }
}
