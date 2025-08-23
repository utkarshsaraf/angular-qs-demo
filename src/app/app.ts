import { Component, signal, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../environments/environment';
import { createEmbeddingContext, EmbeddingContext, DashboardExperience, QSearchExperience } from 'amazon-quicksight-embedding-sdk';
import { DebugLoggerService } from '../logger';

export type EmbeddingType = 'dashboard' | 'qsearch';

export interface DashboardConfig {
  url: string;
  title: string;
  width: string;
  height: string;
}

export interface QSearchConfig {
  url: string;
  title: string;
  width: string;
  height: string;
  searchPlaceholderText?: string;
  showQIcon?: boolean;
  showPinboard?: boolean;
  showSearchBar?: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html'
})
export class App implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('dashboardContainer', { static: false }) dashboardContainer!: ElementRef;
  @ViewChild('qsearchContainer', { static: false }) qsearchContainer!: ElementRef;

  protected readonly embeddingType = signal<EmbeddingType>('dashboard');
  
  protected readonly dashboardConfig = signal<DashboardConfig>({
    url: environment.quicksight.defaultUrl,
    title: 'QuickSight Dashboard',
    width: '100%',
    height: '600px'
  });

  protected readonly qsearchConfig = signal<QSearchConfig>({
    url: environment.quicksight.defaultUrl,
    title: 'QuickSight Q Search',
    width: '100%',
    height: '400px',
    searchPlaceholderText: 'Ask a question about your data...',
    showQIcon: true,
    showPinboard: true,
    showSearchBar: true
  });

  protected readonly newUrl = signal('');
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly errorDetails = signal<any>(null);

  private embeddingContext: EmbeddingContext | null = null;
  private currentDashboard: DashboardExperience | null = null;
  private currentQSearch: QSearchExperience | null = null;
  private isViewInitialized = false;

  constructor(private logger: DebugLoggerService) {}

  async ngOnInit() {
    this.logger.info('Application initializing', { 
      embeddingType: this.embeddingType(),
      defaultUrl: this.dashboardConfig().url
    }, 'App');

    try {
      // Create the embedding context for QuickSight
      this.logger.debug('Creating QuickSight embedding context', null, 'App');
      this.embeddingContext = await createEmbeddingContext({
        onChange: (changeEvent) => {
          this.logger.info('QuickSight context change event', changeEvent, 'QuickSight');
        }
      });
      
      // Load default configuration for the selected embedding type
      await this.loadDefaultConfiguration();
      
      this.logger.info('Application initialized successfully', { 
        url: this.dashboardConfig().url 
      }, 'App');
    } catch (error) {
      this.logger.error('Failed to initialize QuickSight embedding', error, 'App');
      this.errorMessage.set('Failed to initialize QuickSight embedding');
    }
  }

  private async loadDefaultConfiguration() {
    const type = this.embeddingType();
    try {
      if (type === 'dashboard') {
        await this.embedDashboard(this.dashboardConfig().url);
      } else {
        await this.embedQSearch(this.qsearchConfig().url);
      }
    } catch (error) {
      this.logger.warn(`Failed to load default ${type} configuration`, error, 'App');
      // Don't show error to user for default loading failures
    }
  }

  ngAfterViewInit() {
    // Use a small delay to ensure the view is fully rendered
    setTimeout(() => {
      this.isViewInitialized = true;
      this.logger.debug('View initialized, containers available', {
        dashboardContainerExists: !!this.dashboardContainer,
        qsearchContainerExists: !!this.qsearchContainer
      }, 'App');
    }, 50);
  }

  ngOnDestroy() {
    this.logger.info('Application destroying', null, 'App');
    if (this.currentDashboard) {
      this.currentDashboard = null;
      this.logger.debug('QuickSight dashboard cleaned up', null, 'App');
    }
    if (this.currentQSearch) {
      this.currentQSearch = null;
      this.logger.debug('QuickSight QSearch cleaned up', null, 'App');
    }
  }

  onEmbeddingTypeChange(type: EmbeddingType) {
    this.embeddingType.set(type);
    this.logger.info('Embedding type changed', { type }, 'App');
    
    // Clear any existing content
    this.clearCurrentEmbedding();
    
    // Reset error states
    this.errorMessage.set('');
    this.errorDetails.set(null);
  }

  async updateEmbedUrl() {
    if (this.newUrl().trim()) {
      const url = this.newUrl().trim();
      const type = this.embeddingType();
      
      this.logger.info(`Updating ${type} URL`, { 
        oldUrl: type === 'dashboard' ? this.dashboardConfig().url : this.qsearchConfig().url,
        newUrl: url 
      }, 'App');

      try {
        if (type === 'dashboard') {
          this.dashboardConfig.update(config => ({ ...config, url }));
          await this.embedDashboard(url);
        } else {
          this.qsearchConfig.update(config => ({ ...config, url }));
          await this.embedQSearch(url);
        }
        
      this.newUrl.set('');
        this.errorMessage.set('');
        this.errorDetails.set(null);
        this.logger.info(`${type} URL updated successfully`, { finalUrl: url }, 'App');
      } catch (error) {
        const errorInfo = {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          stack: error instanceof Error ? error.stack : null,
          error: error,
          timestamp: new Date().toISOString(),
          url: url,
          embeddingType: type,
          containerState: {
            isViewInitialized: this.isViewInitialized,
            dashboardContainerExists: !!this.dashboardContainer,
            qsearchContainerExists: !!this.qsearchContainer
          }
        };
        
        this.logger.error(`Failed to update ${type}`, errorInfo, 'App');
        this.errorMessage.set(`Failed to update ${type}: ${errorInfo.message}`);
        this.errorDetails.set(errorInfo);
      }
    }
  }

  async resetToDefault() {
    const type = this.embeddingType();
    this.logger.info(`Resetting ${type} to default configuration`, null, 'App');
    
    try {
      if (type === 'dashboard') {
        const defaultConfig = {
          url: environment.quicksight.defaultUrl,
          title: 'QuickSight Dashboard',
          width: '100%',
          height: '600px'
        };
        this.dashboardConfig.set(defaultConfig);
        await this.embedDashboard(defaultConfig.url);
      } else {
        const defaultConfig = {
          url: environment.quicksight.defaultUrl,
          title: 'QuickSight Q Search',
          width: '100%',
          height: '400px',
          searchPlaceholderText: 'Ask a question about your data...',
          showQIcon: true,
          showPinboard: true,
          showSearchBar: true
        };
        this.qsearchConfig.set(defaultConfig);
        await this.embedQSearch(defaultConfig.url);
      }
      
      this.errorMessage.set('');
      this.errorDetails.set(null);
      this.logger.info(`Reset to default completed successfully for ${type}`, null, 'App');
    } catch (error) {
      const errorInfo = {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        stack: error instanceof Error ? error.stack : null,
        error: error,
        timestamp: new Date().toISOString(),
        operation: 'resetToDefault',
        embeddingType: type
      };
      
      this.logger.error(`Failed to reset ${type}`, errorInfo, 'App');
      this.errorMessage.set(`Failed to reset ${type}: ${errorInfo.message}`);
      this.errorDetails.set(errorInfo);
    }
  }

  private clearCurrentEmbedding() {
    if (this.currentDashboard) {
      this.currentDashboard = null;
      this.logger.debug('Dashboard cleaned up', null, 'App');
    }
    if (this.currentQSearch) {
      this.currentQSearch = null;
      this.logger.debug('QSearch cleaned up', null, 'App');
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
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait for container to be available with retry mechanism
    const containerReady = await this.waitForContainer('dashboard');
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
      // Clean up existing content
      this.clearCurrentEmbedding();

      // Embed the QuickSight dashboard
      this.logger.debug('Embedding QuickSight dashboard', { 
        url, 
        container: 'dashboardContainer',
        width: this.dashboardConfig().width,
        height: this.dashboardConfig().height
      }, 'QuickSight');

      this.currentDashboard = await this.embeddingContext.embedDashboard({
        url: url,
        container: this.dashboardContainer.nativeElement,
        width: this.dashboardConfig().width,
        height: this.dashboardConfig().height,
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

  private async embedQSearch(url: string) {
    if (!this.embeddingContext) {
      const error = 'Embedding context not initialized';
      this.logger.error(error, null, 'App');
      throw new Error(error);
    }

    // Wait for the view to be fully initialized and container to be available
    if (!this.isViewInitialized) {
      this.logger.debug('Waiting for view initialization', null, 'App');
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait for container to be available with retry mechanism
    const containerReady = await this.waitForContainer('qsearch');
    if (!containerReady) {
      const error = 'QSearch container not available after retries';
      this.logger.error(error, {
        isViewInitialized: this.isViewInitialized,
        containerExists: !!this.qsearchContainer,
        nativeElement: !!this.qsearchContainer?.nativeElement
      }, 'App');
      throw new Error(error);
    }

    this.logger.info('Embedding QuickSight QSearch', { url }, 'App');
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      // Clean up existing content
      this.clearCurrentEmbedding();

      // Embed the QuickSight QSearch
      this.logger.debug('Embedding QuickSight QSearch', { 
        url, 
        container: 'qsearchContainer',
        width: this.qsearchConfig().width,
        height: this.qsearchConfig().height,
        config: this.qsearchConfig()
      }, 'QuickSight');

      this.currentQSearch = await this.embeddingContext.embedQSearchBar({
        url: url,
        container: this.qsearchContainer.nativeElement,
        width: this.qsearchConfig().width,
        height: this.qsearchConfig().height,
        withIframePlaceholder: true,
        onChange: (changeEvent) => {
          this.logger.debug('QSearch change event', changeEvent, 'QuickSight');
        }
      });

      this.logger.info('Successfully embedded QuickSight QSearch', { 
        url,
        qsearchId: this.currentQSearch ? 'active' : 'none'
      }, 'QuickSight');
    } catch (error) {
      this.logger.error('Error embedding QuickSight QSearch', error, 'QuickSight');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  private async waitForContainer(type: 'dashboard' | 'qsearch', maxRetries: number = 5, delay: number = 100): Promise<boolean> {
    const container = type === 'dashboard' ? this.dashboardContainer : this.qsearchContainer;
    
    for (let i = 0; i < maxRetries; i++) {
      if (container?.nativeElement) {
        this.logger.debug(`${type} container ready after ${i + 1} attempts`, null, 'App');
        return true;
      }
      
      this.logger.debug(`Waiting for ${type} container, attempt ${i + 1}/${maxRetries}`, null, 'App');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.logger.error(`${type} container not ready after maximum retries`, {
      maxRetries,
      delay,
      containerExists: !!container,
      nativeElement: !!container?.nativeElement
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

  // Configuration update methods
  updateDashboardTitle(title: string) {
    this.dashboardConfig.update(config => ({ ...config, title }));
  }

  updateDashboardWidth(width: string) {
    this.dashboardConfig.update(config => ({ ...config, width }));
  }

  updateDashboardHeight(height: string) {
    this.dashboardConfig.update(config => ({ ...config, height }));
  }

  updateQSearchTitle(title: string) {
    this.qsearchConfig.update(config => ({ ...config, title }));
  }

  updateQSearchWidth(width: string) {
    this.qsearchConfig.update(config => ({ ...config, width }));
  }

  updateQSearchHeight(height: string) {
    this.qsearchConfig.update(config => ({ ...config, height }));
  }

  updateQSearchPlaceholder(placeholder: string) {
    this.qsearchConfig.update(config => ({ ...config, searchPlaceholderText: placeholder }));
  }

  updateQSearchShowQIcon(show: boolean) {
    this.qsearchConfig.update(config => ({ ...config, showQIcon: show }));
  }

  updateQSearchShowPinboard(show: boolean) {
    this.qsearchConfig.update(config => ({ ...config, showPinboard: show }));
  }

  updateQSearchShowSearchBar(show: boolean) {
    this.qsearchConfig.update(config => ({ ...config, showSearchBar: show }));
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
