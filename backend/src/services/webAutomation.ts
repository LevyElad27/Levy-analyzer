import { Builder, WebDriver, By, until } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import locateChrome = require('locate-chrome');
import { existsSync } from 'fs';
import { ServiceBuilder } from 'selenium-webdriver/chrome';
import * as chrome from 'selenium-webdriver/chrome';
import * as path from 'path';

export class WebAutomator {
  private driver: WebDriver | null = null;
  private initializationTimeout = 60000; // Increased to 60 seconds

  private async findChromePath(): Promise<string | null> {
    try {
      const chromePath = await locateChrome();
      console.log('Found Chrome at:', chromePath);
      return chromePath || null;
    } catch (error) {
      console.error('Error finding Chrome:', error);
      return null;
    }
  }

  private async ensureDriver() {
    if (!this.driver) {
      console.log('Starting WebDriver initialization...');
      
      // Check Chrome installation
      const chromePath = await this.findChromePath();
      if (!chromePath || !existsSync(chromePath)) {
        throw new Error('Chrome not found. Please ensure Chrome is installed.');
      }
      console.log('Using Chrome from:', chromePath);

      try {
        // Set up ChromeDriver service
        console.log('Setting up ChromeDriver service...');
        const chromeDriverPath = require('chromedriver').path;
        console.log('ChromeDriver path:', chromeDriverPath);
        
        const service = new ServiceBuilder(chromeDriverPath);
        
        // Configure Chrome options
        const options = new chrome.Options();
        options.addArguments(
          '--disable-web-security',
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--remote-debugging-port=9222'
        );
        
        if (chromePath) {
          console.log('Setting Chrome binary path...');
          options.setChromeBinaryPath(chromePath);
        }

        // Create WebDriver with explicit service configuration
        console.log('Creating WebDriver builder...');
        const builder = new Builder()
          .forBrowser('chrome')
          .setChromeOptions(options)
          .setChromeService(service);

        console.log('Starting WebDriver build...');
        const initPromise = builder.build();

        console.log('Waiting for WebDriver initialization...');
        this.driver = await Promise.race([
          initPromise,
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error('WebDriver initialization timed out after 60 seconds'));
            }, this.initializationTimeout);
          })
        ]);

        // Test if driver is responsive
        console.log('Testing WebDriver responsiveness...');
        await this.driver.manage().setTimeouts({ implicit: 5000 });
        console.log('WebDriver initialized successfully');
      } catch (error: any) {
        console.error('Failed to initialize WebDriver:', error);
        if (error.message.includes('ChromeDriver')) {
          console.error('ChromeDriver error detected. Please ensure ChromeDriver is properly installed.');
        }
        // Clean up if initialization failed
        if (this.driver) {
          try {
            await this.driver.quit();
          } catch (cleanupError) {
            console.error('Error cleaning up failed driver:', cleanupError);
          }
          this.driver = null;
        }
        throw new Error(`Failed to initialize WebDriver: ${error.message}`);
      }
    }
    return this.driver;
  }

  async loginToChatGPT() {
    const driver = await this.ensureDriver();
    try {
      console.log('Navigating to ChatGPT...');
      await driver.get('https://chat.openai.com');
      
      // Wait for page to load with timeout
      await driver.wait(
        until.elementLocated(By.css('body')),
        10000,
        'Timeout waiting for ChatGPT page to load'
      );
      
      console.log('ChatGPT page loaded');
      return true;
    } catch (error: any) {
      console.error('Error during ChatGPT login:', error);
      throw new Error(`ChatGPT login failed: ${error.message}`);
    }
  }

  async analyzeSECFilings(template: string, urls: string[]) {
    const driver = await this.ensureDriver();
    try {
      // Format the prompt with the template and URLs
      const prompt = `${template}\n\nSEC Filing URLs:\n${urls.join('\n')}`;
      
      // Wait for the chat input to be ready
      const chatInput = await driver.wait(
        until.elementLocated(By.css('textarea[data-id="root"]')),
        10000,
        'Timeout waiting for chat input to be ready'
      );
      
      // Type the prompt
      await chatInput.sendKeys(prompt);
      
      // Find and click the submit button
      const submitButton = await driver.wait(
        until.elementLocated(By.css('button[data-testid="send-button"]')),
        5000,
        'Timeout waiting for submit button'
      );
      await submitButton.click();
      
      // Wait for response with timeout
      await driver.wait(
        until.elementsLocated(By.css('.markdown-content p')),
        30000,
        'Timeout waiting for ChatGPT response'
      );
      
      // Get the last response
      const responses = await driver.findElements(
        By.css('.markdown-content p')
      );
      
      if (responses.length === 0) {
        throw new Error('No response elements found');
      }
      
      const lastResponse = responses[responses.length - 1];
      return await lastResponse.getText();
    } catch (error: any) {
      console.error('Error during SEC filing analysis:', error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  async cleanup() {
    if (this.driver) {
      try {
        await this.driver.quit();
        this.driver = null;
        console.log('WebDriver cleaned up successfully');
      } catch (error: any) {
        console.error('Error during cleanup:', error);
      }
    }
  }
}

export const automator = new WebAutomator(); 