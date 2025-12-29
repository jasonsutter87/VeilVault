import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Global setup runs once before all tests
  console.log('Running global setup...');

  // Verify the app is reachable
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(config.projects[0].use?.baseURL || 'http://localhost:3000');
    console.log('App is reachable');
  } catch (error) {
    console.error('App is not reachable. Make sure it is running.');
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
