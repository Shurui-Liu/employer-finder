/**
 * Google Apps Script for AI-Powered Employer Finder
 * This script searches for companies based on criteria and populates an Excel sheet
 */

// Configuration - Default values (can be overridden by user interface)
const CONFIG = {
  AI_API_KEY: '', // Will be set by user interface - NO HARDCODED KEY
  AI_API_URL: 'https://api.openai.com/v1/chat/completions', // OpenAI API endpoint
  MAX_COMPANIES: 10, // Default number of companies to add
  HIGHLIGHT_COLOR: '#FFE6CC', // Light orange color for new companies
  SHEET_NAME: 'Company List' // Name of the sheet to work with
};

/**
 * Main function to search and add companies
 * This function should be called from the Google Sheets UI
 */
function searchAndAddCompanies() {
  try {
    // Check if API key is configured
    if (!CONFIG.AI_API_KEY) {
      const setupResponse = SpreadsheetApp.getUi().alert(
        'API Key Required',
        'You need to configure your OpenAI API key first. Would you like to set it up now?',
        SpreadsheetApp.getUi().ButtonSet.YES_NO
      );
      
      if (setupResponse === SpreadsheetApp.getUi().Button.YES) {
        showConfigurationInterface();
      }
      return;
    }
    
    // Get the active spreadsheet and sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME) || spreadsheet.getActiveSheet();
    
    // Get existing companies from the first column
    const existingCompanies = getExistingCompanies(sheet);
    
    // Get user input for search criteria
    const userInput = getUserInput();
    if (!userInput) return; // User cancelled
    
    // Search for new companies using AI
    const newCompanies = searchCompaniesWithAI(userInput.criteria, userInput.count, existingCompanies);
    
    if (newCompanies.length === 0) {
      SpreadsheetApp.getUi().alert('No new companies found matching your criteria.');
      return;
    }
    
    // Add new companies to the sheet
    addCompaniesToSheet(sheet, newCompanies, existingCompanies.length);
    
    // Show success message
    SpreadsheetApp.getUi().alert(`Successfully added ${newCompanies.length} new companies to the sheet!`);
    
  } catch (error) {
    console.error('Error in searchAndAddCompanies:', error);
    SpreadsheetApp.getUi().alert('An error occurred: ' + error.message);
  }
}

/**
 * Get existing companies from the first column of the sheet
 * Returns a Set for O(1) lookup efficiency
 */
function getExistingCompanies(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) return new Set();
  
  const companyRange = sheet.getRange(1, 1, lastRow, 1);
  const companies = companyRange.getValues().flat().filter(company => company !== '');
  
  // Create a Set for O(1) lookup efficiency
  const companySet = new Set();
  companies.forEach(company => {
    const normalizedName = normalizeCompanyName(company.toString());
    if (normalizedName) {
      companySet.add(normalizedName);
    }
  });
  
  return companySet;
}

/**
 * Normalize company name for consistent comparison
 * Handles common variations and edge cases
 */
function normalizeCompanyName(companyName) {
  if (!companyName || typeof companyName !== 'string') return null;
  
  return companyName
    .toLowerCase()
    .trim()
    // Remove common suffixes/prefixes that don't affect uniqueness
    .replace(/\s+(inc\.?|corp\.?|corporation|llc|ltd\.?|limited|company|co\.?|group|technologies|tech|systems|solutions|services|international|intl\.?)$/i, '')
    // Remove punctuation and extra spaces
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get user input for search criteria and company count
 */
function getUserInput() {
  const ui = SpreadsheetApp.getUi();
  
  // Show detailed instructions dialog
  const instructionsResponse = ui.alert(
    'Company Search Instructions',
    'You can now provide detailed instructions about the types of companies you want to find.\n\n' +
    'Examples of detailed instructions:\n' +
    '• "Tech startups in San Francisco focused on AI and machine learning with 10-100 employees"\n' +
    '• "Manufacturing companies in Germany with 100-500 employees in automotive industry"\n' +
    '• "Fintech companies in New York that are Series A or B funded and focus on mobile payments"\n' +
    '• "Healthcare startups in Boston working on digital health solutions and telemedicine"\n' +
    '• "Sustainable energy companies in Europe with renewable technology and solar focus"\n\n' +
    'Be as specific as possible about:\n' +
    '• Industry/sector\n' +
    '• Location/region\n' +
    '• Company size/stage\n' +
    '• Technology focus\n' +
    '• Funding stage\n' +
    '• Any other specific criteria\n\n' +
    'Click OK to continue with detailed input.',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (instructionsResponse === ui.Button.CANCEL) {
    return null;
  }
  
  // Get detailed search criteria
  const criteriaResponse = ui.prompt(
    'Detailed Company Search Instructions',
    'Please provide detailed instructions about the types of companies you want to find:\n\n' +
    'Examples:\n' +
    '• "Tech startups in San Francisco focused on AI and machine learning"\n' +
    '• "Manufacturing companies in Germany with 100-500 employees"\n' +
    '• "Fintech companies in New York that are Series A or B funded"\n' +
    '• "Healthcare startups in Boston working on digital health solutions"\n' +
    '• "Sustainable energy companies in Europe with renewable technology"\n\n' +
    'Be specific about:\n' +
    '• Industry/sector\n' +
    '• Location/region\n' +
    '• Company size/stage\n' +
    '• Technology focus\n' +
    '• Any other specific criteria:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (criteriaResponse.getSelectedButton() === ui.Button.CANCEL) {
    return null;
  }
  
  const criteria = criteriaResponse.getResponseText().trim();
  if (!criteria) {
    ui.alert('Please provide detailed search instructions.');
    return null;
  }
  
  // Get number of companies to add
  const countResponse = ui.prompt(
    'Number of Companies',
    `How many companies would you like to add? (1-${CONFIG.MAX_COMPANIES}):`,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (countResponse.getSelectedButton() === ui.Button.CANCEL) {
    return null;
  }
  
  let count = parseInt(countResponse.getResponseText());
  if (isNaN(count) || count < 1) {
    count = 5; // Default value
  } else if (count > CONFIG.MAX_COMPANIES) {
    count = CONFIG.MAX_COMPANIES;
  }
  
  return { criteria, count };
}

/**
 * Search for companies using AI API with efficient duplicate prevention
 */
function searchCompaniesWithAI(criteria, count, existingCompaniesSet) {
  try {
    // Convert Set to array for AI prompt (limit to first 20 to avoid token limits)
    const existingCompaniesArray = Array.from(existingCompaniesSet).slice(0, 20);
    const existingCompaniesText = existingCompaniesArray.length > 0 
      ? `Avoid these companies: ${existingCompaniesArray.join(', ')}`
      : '';
    
    const prompt = `Find ${count} real companies that match these detailed instructions: "${criteria}". 
    
Requirements:
- Return only company names, one per line
- Do not include any explanations or additional text
- Ensure companies are real and currently operating
- ${existingCompaniesText}
- Focus on companies that match ALL the specific criteria mentioned
- Consider industry, location, size, technology focus, funding stage, and other details provided
- Prioritize companies that best match the detailed requirements

Format: Just list the company names, one per line.`;

    const requestBody = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    };

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(requestBody)
    };

    const response = UrlFetchApp.fetch(CONFIG.AI_API_URL, options);
    const responseData = JSON.parse(response.getContentText());
    
    if (responseData.error) {
      throw new Error(`AI API Error: ${responseData.error.message}`);
    }
    
    const aiResponse = responseData.choices[0].message.content;
    const companies = aiResponse.split('\n')
      .map(company => company.trim())
      .filter(company => company && company.length > 0)
      // Use efficient Set lookup for duplicate checking
      .filter(company => !isDuplicate(company, existingCompaniesSet))
      .slice(0, count);
    
    return companies;
    
  } catch (error) {
    console.error('Error calling AI API:', error);
    throw new Error(`Failed to search for companies: ${error.message}`);
  }
}

/**
 * Efficient duplicate checking using normalized company names
 */
function isDuplicate(companyName, existingCompaniesSet) {
  const normalizedName = normalizeCompanyName(companyName);
  return normalizedName && existingCompaniesSet.has(normalizedName);
}

/**
 * Search for companies using instructions from the configuration interface
 */
function searchCompaniesWithInstructions(searchInstructions, count) {
  try {
    // Check if API key is configured
    if (!CONFIG.AI_API_KEY) {
      throw new Error('API key is not configured. Please configure your API key first.');
    }
    
    // Get the active spreadsheet and sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME) || spreadsheet.getActiveSheet();
    
    // Get existing companies from the first column
    const existingCompanies = getExistingCompanies(sheet);
    
    // Search for new companies using AI
    const newCompanies = searchCompaniesWithAI(searchInstructions, count, existingCompanies);
    
    if (newCompanies.length === 0) {
      throw new Error('No new companies found matching your criteria.');
    }
    
    // Add new companies to the sheet
    addCompaniesToSheet(sheet, newCompanies, existingCompanies.size);
    
    return `Successfully added ${newCompanies.length} new companies to the sheet!`;
    
  } catch (error) {
    console.error('Error in searchCompaniesWithInstructions:', error);
    throw new Error(error.message);
  }
}

/**
 * Add new companies to the sheet with highlighting
 * Only adds to Column A - Column B is left untouched
 */
function addCompaniesToSheet(sheet, newCompanies, startRow) {
  if (newCompanies.length === 0) return;
  
  // Get the range where we'll add new companies (Column A only)
  const targetRange = sheet.getRange(startRow + 1, 1, newCompanies.length, 1);
  
  // Set the company names
  const companyData = newCompanies.map(company => [company]);
  targetRange.setValues(companyData);
  
  // Highlight new companies
  targetRange.setBackground(CONFIG.HIGHLIGHT_COLOR);
  
  // Column B is completely untouched - no data added there
}

/**
 * Validate duplicate prevention by checking the entire sheet
 * This function can be run manually to verify no duplicates exist
 */
function validateNoDuplicates() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME) || spreadsheet.getActiveSheet();
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      SpreadsheetApp.getUi().alert('Sheet is empty or has only headers. No duplicates to check.');
      return;
    }
    
    const companyRange = sheet.getRange(2, 1, lastRow - 1, 1); // Skip header row
    const companies = companyRange.getValues().flat().filter(company => company !== '');
    
    const normalizedCompanies = new Map(); // Map to track original names
    const duplicates = [];
    
    companies.forEach((company, index) => {
      const normalizedName = normalizeCompanyName(company.toString());
      if (normalizedName) {
        if (normalizedCompanies.has(normalizedName)) {
          duplicates.push({
            original1: normalizedCompanies.get(normalizedName),
            original2: company.toString(),
            normalized: normalizedName,
            row1: normalizedCompanies.get(normalizedName + '_row'),
            row2: index + 2 // +2 because we skipped header and arrays are 0-indexed
          });
        } else {
          normalizedCompanies.set(normalizedName, company.toString());
          normalizedCompanies.set(normalizedName + '_row', index + 2);
        }
      }
    });
    
    if (duplicates.length === 0) {
      SpreadsheetApp.getUi().alert(`✅ No duplicates found! Checked ${companies.length} companies.`);
    } else {
      let message = `❌ Found ${duplicates.length} duplicate(s):\n\n`;
      duplicates.forEach((dup, index) => {
        message += `${index + 1}. "${dup.original1}" (row ${dup.row1}) and "${dup.original2}" (row ${dup.row2})\n`;
        message += `   Normalized: "${dup.normalized}"\n\n`;
      });
      SpreadsheetApp.getUi().alert(message);
    }
    
  } catch (error) {
    console.error('Error validating duplicates:', error);
    SpreadsheetApp.getUi().alert('Error checking for duplicates: ' + error.message);
  }
}

/**
 * Create a custom menu in Google Sheets
 */
function onOpen() {
  // Load saved configuration
  loadConfiguration();
  
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Employer Finder')
    .addItem('Search for Companies', 'searchAndAddCompanies')
    .addSeparator()
    .addItem('Configure Settings', 'showConfigurationInterface')
    .addItem('Test API Connection', 'testAPIConnection')
    .addItem('Clear API Key', 'clearAPIKey')
    .addSeparator()
    .addItem('Validate No Duplicates', 'validateNoDuplicates')
    .addItem('Clear Highlights', 'clearHighlights')
    .addToUi();
}

/**
 * Clear highlighting from all cells
 */
function clearHighlights() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME) || spreadsheet.getActiveSheet();
    
    const lastRow = sheet.getLastRow();
    if (lastRow > 0) {
      const range = sheet.getRange(1, 1, lastRow, sheet.getLastColumn());
      range.setBackground(null);
    }
    
    SpreadsheetApp.getUi().alert('All highlights have been cleared.');
  } catch (error) {
    console.error('Error clearing highlights:', error);
    SpreadsheetApp.getUi().alert('Error clearing highlights: ' + error.message);
  }
}

/**
 * Test function to verify API connection
 */
function testAPIConnection() {
  try {
    if (!CONFIG.AI_API_KEY) {
      SpreadsheetApp.getUi().alert('Please configure your API key first using "Configure Settings".');
      return;
    }
    
    const testPrompt = 'List 3 well-known technology companies.';
    const companies = searchCompaniesWithAI(testPrompt, 3, []);
    
    if (companies.length > 0) {
      SpreadsheetApp.getUi().alert(`API connection successful! Test found: ${companies.join(', ')}`);
    } else {
      SpreadsheetApp.getUi().alert('API connection successful but no companies returned.');
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert('API connection failed: ' + error.message);
  }
}

/**
 * Show configuration interface for user settings
 */
function showConfigurationInterface() {
  const ui = SpreadsheetApp.getUi();
  
  // Get current settings
  const currentApiKey = CONFIG.AI_API_KEY || '';
  const currentMaxCompanies = CONFIG.MAX_COMPANIES;
  const currentHighlightColor = CONFIG.HIGHLIGHT_COLOR;
  
  // Create HTML template for configuration
  const htmlTemplate = HtmlService.createTemplateFromFile('ConfigurationInterface');
  htmlTemplate.currentApiKey = currentApiKey;
  htmlTemplate.currentMaxCompanies = currentMaxCompanies;
  htmlTemplate.currentHighlightColor = currentHighlightColor;
  
  const htmlOutput = htmlTemplate.evaluate()
    .setWidth(500)
    .setHeight(600);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Employer Finder Configuration');
}

/**
 * Show advanced search instructions interface
 */
function showSearchInstructionsInterface() {
  // Check if API key is configured
  if (!CONFIG.AI_API_KEY) {
    const setupResponse = SpreadsheetApp.getUi().alert(
      'API Key Required',
      'You need to configure your OpenAI API key first. Would you like to set it up now?',
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );
    
    if (setupResponse === SpreadsheetApp.getUi().Button.YES) {
      showConfigurationInterface();
    }
    return;
  }
  
  // Create HTML template for search instructions
  const htmlTemplate = HtmlService.createTemplateFromFile('SearchInstructionsInterface');
  
  const htmlOutput = htmlTemplate.evaluate()
    .setWidth(600)
    .setHeight(700);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Advanced Company Search');
}

/**
 * Search for companies using detailed instructions from the interface
 */
function searchCompaniesWithInstructions(searchInstructions, count) {
  try {
    // Get the active spreadsheet and sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME) || spreadsheet.getActiveSheet();
    
    // Get existing companies from the first column
    const existingCompanies = getExistingCompanies(sheet);
    
    // Search for new companies using AI with detailed instructions
    const newCompanies = searchCompaniesWithAI(searchInstructions, count, existingCompanies);
    
    if (newCompanies.length === 0) {
      throw new Error('No new companies found matching your detailed criteria.');
    }
    
    // Add new companies to the sheet
    addCompaniesToSheet(sheet, newCompanies, existingCompanies.size);
    
    // Show success message
    SpreadsheetApp.getUi().alert(`Successfully added ${newCompanies.length} new companies to the sheet!`);
    
  } catch (error) {
    console.error('Error in searchCompaniesWithInstructions:', error);
    throw new Error('Failed to search for companies: ' + error.message);
  }
}

/**
 * Save configuration settings
 */
function saveConfiguration(apiKey, maxCompanies, highlightColor) {
  try {
    // Validate inputs
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is required');
    }
    
    const maxCompaniesNum = parseInt(maxCompanies);
    if (isNaN(maxCompaniesNum) || maxCompaniesNum < 1 || maxCompaniesNum > 50) {
      throw new Error('Maximum companies must be between 1 and 50');
    }
    
    // Update CONFIG object
    CONFIG.AI_API_KEY = apiKey.trim();
    CONFIG.MAX_COMPANIES = maxCompaniesNum;
    CONFIG.HIGHLIGHT_COLOR = highlightColor;
    
    // Save to Properties Service for persistence
    const properties = PropertiesService.getScriptProperties();
    properties.setProperties({
      'AI_API_KEY': CONFIG.AI_API_KEY,
      'MAX_COMPANIES': CONFIG.MAX_COMPANIES.toString(),
      'HIGHLIGHT_COLOR': CONFIG.HIGHLIGHT_COLOR
    });
    
    SpreadsheetApp.getUi().alert('Configuration saved successfully!');
    
    // Test the API connection
    const testResponse = SpreadsheetApp.getUi().alert(
      'Test API Connection',
      'Would you like to test the API connection now?',
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );
    
    if (testResponse === SpreadsheetApp.getUi().Button.YES) {
      testAPIConnection();
    }
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error saving configuration: ' + error.message);
  }
}

/**
 * Load configuration from Properties Service
 */
function loadConfiguration() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const savedApiKey = properties.getProperty('AI_API_KEY');
    const savedMaxCompanies = properties.getProperty('MAX_COMPANIES');
    const savedHighlightColor = properties.getProperty('HIGHLIGHT_COLOR');
    
    if (savedApiKey) {
      CONFIG.AI_API_KEY = savedApiKey;
    }
    if (savedMaxCompanies) {
      CONFIG.MAX_COMPANIES = parseInt(savedMaxCompanies);
    }
    if (savedHighlightColor) {
      CONFIG.HIGHLIGHT_COLOR = savedHighlightColor;
    }
  } catch (error) {
    console.error('Error loading configuration:', error);
  }
}

/**
 * Clear the stored API key
 */
function clearAPIKey() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'Clear API Key',
      'Are you sure you want to clear your stored API key? You will need to reconfigure it to use the tool.',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      // Clear from CONFIG
      CONFIG.AI_API_KEY = '';
      
      // Clear from Properties Service
      const properties = PropertiesService.getScriptProperties();
      properties.deleteProperty('AI_API_KEY');
      
      ui.alert('API key has been cleared. You will need to configure a new API key to use the tool.');
    }
  } catch (error) {
    console.error('Error clearing API key:', error);
    SpreadsheetApp.getUi().alert('Error clearing API key: ' + error.message);
  }
}

/**
 * Initialize configuration on script load
 */
function initializeConfiguration() {
  loadConfiguration();
} 