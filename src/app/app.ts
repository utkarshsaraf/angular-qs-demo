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
  protected readonly isQuickSightMode = signal(false);

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
      // Create the embedding context for QuickSight (but don't use it initially)
      this.logger.debug('Creating QuickSight embedding context', null, 'App');
      this.embeddingContext = await createEmbeddingContext({
        onChange: (changeEvent) => {
          this.logger.info('QuickSight context change event', changeEvent, 'QuickSight');
        }
      });
      
      // Initially load YouTube content in iframe mode
      this.isQuickSightMode.set(false);
      this.logger.info('Application initialized in iframe mode', { 
        mode: 'iframe',
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
      this.logger.info('Updating embed URL', { 
        oldUrl: this.embedConfig().url,
        newUrl: url 
      }, 'App');

      this.embedConfig.update(config => ({
        ...config,
        url: url
      }));
      
      try {
        // Check if it's a QuickSight URL
        if (this.isQuickSightUrl(url)) {
          this.logger.info('Detected QuickSight URL, switching to QuickSight mode', { url }, 'App');
          
          // Log container state before switching
          this.logger.debug('Container state before QuickSight switch', {
            isViewInitialized: this.isViewInitialized,
            containerExists: !!this.dashboardContainer,
            nativeElement: !!this.dashboardContainer?.nativeElement,
            containerRef: this.dashboardContainer
          }, 'App');
          
          await this.switchToQuickSightMode(url);
        } else {
          // Switch back to iframe mode for non-QuickSight URLs
          this.logger.info('Detected non-QuickSight URL, switching to iframe mode', { url }, 'App');
          this.switchToIframeMode();
        }
        
        this.newUrl.set('');
        this.errorMessage.set('');
        this.errorDetails.set(null);
        this.logger.info('URL update completed successfully', { 
          finalUrl: url,
          mode: this.isQuickSightMode() ? 'QuickSight' : 'iframe'
        }, 'App');
      } catch (error) {
        const errorInfo = {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          stack: error instanceof Error ? error.stack : null,
          error: error,
          timestamp: new Date().toISOString(),
          url: url,
          currentMode: this.isQuickSightMode(),
          containerState: {
            isViewInitialized: this.isViewInitialized,
            containerExists: !!this.dashboardContainer,
            nativeElement: !!this.dashboardContainer?.nativeElement
          }
        };
        
        this.logger.error('Failed to update content', errorInfo, 'App');
        this.errorMessage.set(`Failed to update content: ${errorInfo.message}`);
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
      // Reset to iframe mode for YouTube
      this.switchToIframeMode();
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
      
      this.logger.error('Failed to reset content', errorInfo, 'App');
      this.errorMessage.set(`Failed to reset content: ${errorInfo.message}`);
      this.errorDetails.set(errorInfo);
    }
  }

  private isQuickSightUrl(url: string): boolean {
    const isQuickSight = url.includes('quicksight.aws.amazon.com') || url.includes('quicksight.amazonaws.com');
    this.logger.debug('URL type detection', { 
      url, 
      isQuickSight,
      containsQuicksight: url.includes('quicksight'),
      containsAws: url.includes('aws.amazon.com')
    }, 'App');
    return isQuickSight;
  }

  private async switchToQuickSightMode(url: string) {
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

    this.logger.info('Switching to QuickSight mode', { url }, 'App');
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      // Clean up existing dashboard if any
      if (this.currentDashboard) {
        this.logger.debug('Cleaning up existing QuickSight dashboard', null, 'App');
        this.currentDashboard = null;
      }

      // Update title for QuickSight
      this.embedConfig.update(config => ({
        ...config,
        title: 'QuickSight Dashboard'
      }));

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

      this.isQuickSightMode.set(true);
      this.logger.info('Successfully switched to QuickSight mode', { 
        url,
        dashboardId: this.currentDashboard ? 'active' : 'none'
      }, 'QuickSight');
    } catch (error) {
      this.logger.error('Error switching to QuickSight mode', error, 'QuickSight');
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

  private switchToIframeMode() {
    this.logger.info('Switching to iframe mode', null, 'App');
    
    // Clean up QuickSight dashboard if any
    if (this.currentDashboard) {
      this.logger.debug('Cleaning up QuickSight dashboard', null, 'App');
      this.currentDashboard = null;
    }

    // Update title for iframe content
    this.embedConfig.update(config => ({
      ...config,
      title: 'Embedded Content'
    }));

    this.isQuickSightMode.set(false);
    this.logger.info('Successfully switched to iframe mode', { 
      url: this.embedConfig().url,
      title: this.embedConfig().title
    }, 'App');
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
