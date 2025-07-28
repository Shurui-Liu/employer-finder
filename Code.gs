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
    // Load configuration to ensure we have the latest settings
    loadConfiguration();
    
    // Check if API key is configured
    if (!CONFIG.AI_API_KEY) {
      try {
        const setupResponse = SpreadsheetApp.getUi().alert(
          'API Key Required',
          'You need to configure your OpenAI API key first. Would you like to set it up now?',
          SpreadsheetApp.getUi().ButtonSet.YES_NO
        );
        
        if (setupResponse === SpreadsheetApp.getUi().Button.YES) {
          showConfigurationInterface();
        }
      } catch (uiError) {
        console.error('UI not available:', uiError);
        throw new Error('API key is not configured. Please configure your API key first using the "Configure Settings" menu option.');
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
      try {
        SpreadsheetApp.getUi().alert('No new companies found matching your criteria.');
      } catch (uiError) {
        console.error('UI not available:', uiError);
        throw new Error('No new companies found matching your criteria.');
      }
      return;
    }
    
    // Add new companies to the sheet
    const lastRow = sheet.getLastRow();
    const startRow = Math.max(lastRow, 0); // Ensure we start at row 1 or after the last row
    addCompaniesToSheet(sheet, newCompanies, startRow);
    
    // Show success message
    try {
      SpreadsheetApp.getUi().alert(`Successfully added ${newCompanies.length} new companies to the sheet!`);
    } catch (uiError) {
      console.error('UI not available:', uiError);
      console.log(`Successfully added ${newCompanies.length} new companies to the sheet!`);
    }
    
  } catch (error) {
    console.error('Error in searchAndAddCompanies:', error);
    try {
      SpreadsheetApp.getUi().alert('An error occurred: ' + error.message);
    } catch (uiError) {
      console.error('UI not available:', uiError);
      throw error; // Re-throw the original error
    }
  }
}

/**
 * Get existing companies from the first column of the sheet
 * Returns a Set for O(1) lookup efficiency
 */
function getExistingCompanies(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) return new Set();
  
  // Skip header row (row 1) and start from row 2
  const startRow = lastRow > 1 ? 2 : 1;
  const companyRange = sheet.getRange(startRow, 1, lastRow - startRow + 1, 1);
  const companies = companyRange.getValues().flat().filter(company => company !== '');
  
  // Create a Set for O(1) lookup efficiency
  const companySet = new Set();
  companies.forEach(company => {
    const normalizedName = normalizeCompanyName(company.toString());
    if (normalizedName) {
      companySet.add(normalizedName);
    }
  });
  
  console.log(`Found ${companies.length} companies, created Set with ${companySet.size} normalized names`);
  console.log('Sample normalized names:', Array.from(companySet).slice(0, 5));
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
 * Clean and improve company names for display
 * Removes numbering, formatting, and ensures specific names
 */
function cleanCompanyName(companyName) {
  if (!companyName || typeof companyName !== 'string') return null;
  
  let cleaned = companyName.trim();
  
  // Remove numbering patterns (e.g., "1. ", "12. ", "1)", "12)")
  cleaned = cleaned.replace(/^\d+\.?\s*/, ''); // Remove "1. ", "12. " etc.
  cleaned = cleaned.replace(/^\d+\)\s*/, ''); // Remove "1) ", "12) " etc.
  
  // Remove bullet points and other formatting
  cleaned = cleaned.replace(/^[•\-\*]\s*/, ''); // Remove "• ", "- ", "* " etc.
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Ensure we have a valid company name
  if (!cleaned || cleaned.length < 2) return null;
  
  // Capitalize properly (first letter of each word)
  cleaned = cleaned.replace(/\b\w/g, l => l.toUpperCase());
  
  // Ensure common company suffixes are properly formatted
  const suffixPatterns = [
    /\bInc\b/i, /\bCorp\b/i, /\bLLC\b/i, /\bLtd\b/i, /\bLimited\b/i,
    /\bCompany\b/i, /\bCo\b/i, /\bGroup\b/i, /\bTechnologies\b/i,
    /\bTech\b/i, /\bSystems\b/i, /\bSolutions\b/i, /\bServices\b/i,
    /\bInternational\b/i, /\bIntl\b/i
  ];
  
  suffixPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, match => match.toUpperCase());
  });
  
  return cleaned;
}

/**
 * Get user input for search criteria and company count
 */
function getUserInput() {
  try {
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
    
  } catch (uiError) {
    console.error('UI not available:', uiError);
    throw new Error('User interface is not available in this context. Please use the script from within Google Sheets.');
  }
}

/**
 * Search for companies using AI API with iterative duplicate prevention
 * Keeps searching until the requested number of non-duplicate companies are found
 */
function searchCompaniesWithAI(criteria, count, existingCompaniesSet) {
  try {
    // Ensure existingCompaniesSet is a Set
    if (!(existingCompaniesSet instanceof Set)) {
      console.warn('existingCompaniesSet is not a Set, converting to Set');
      existingCompaniesSet = new Set(existingCompaniesSet || []);
    }
    
    const foundCompanies = [];
    const maxAttempts = 15; // Increased from 5 to 15 for better coverage
    let attempts = 0;
    
    while (foundCompanies.length < count && attempts < maxAttempts) {
      attempts++;
      console.log(`Search attempt ${attempts}/${maxAttempts}: Found ${foundCompanies.length}/${count} companies so far`);
      
      // Show warning if we're struggling
      if (attempts > 5 && foundCompanies.length < count / 2) {
        console.warn(`Struggling to find companies: ${foundCompanies.length}/${count} found after ${attempts} attempts`);
      }
      
      // Calculate how many more companies we need
      const remainingCount = count - foundCompanies.length;
      
      // Convert Set to array for AI prompt (limit to first 20 to avoid token limits)
      const existingCompaniesArray = Array.from(existingCompaniesSet).slice(0, 20);
      const existingCompaniesText = existingCompaniesArray.length > 0 
        ? `Avoid these companies: ${existingCompaniesArray.join(', ')}`
        : '';
      
      // Ask for more companies than we need to account for potential duplicates
      // Increase request count if we're having trouble finding companies
      const baseRequestCount = remainingCount * 2;
      const difficultyMultiplier = Math.min(attempts, 3); // Increase request size for later attempts
      const requestCount = Math.min(baseRequestCount + (difficultyMultiplier * 2), 15); // Request more, max 15
      
      const prompt = `Find ${requestCount} real companies that match these detailed instructions: "${criteria}". 
      
Requirements:
- Return only company names, one per line
- Do not include any explanations or additional text
- Ensure companies are real and currently operating
- ${existingCompaniesText}
- Focus on companies that match ALL the specific criteria mentioned
- Consider industry, location, size, technology focus, funding stage, and other details provided
- Prioritize companies that best match the detailed requirements
- Try to provide different companies than in previous searches
- Use the FULL, SPECIFIC company names
- Do NOT include numbers, bullet points, or any formatting before company names

Format: Just list the company names, one per line, with full specific names.`;

      const requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7 + (attempts * 0.1) // Increase creativity with each attempt
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
      console.log(`AI Response (attempt ${attempts}):`, aiResponse);
      
      const newCompanies = aiResponse.split('\n')
        .map(company => cleanCompanyName(company))
        .filter(company => company && company.length > 0);
      
      console.log(`New companies from AI (attempt ${attempts}):`, newCompanies);
      
      // Filter out duplicates and add to our collection
      for (const company of newCompanies) {
        if (!isDuplicate(company, existingCompaniesSet) && !foundCompanies.includes(company)) {
          foundCompanies.push(company);
          if (foundCompanies.length >= count) {
            break;
          }
        }
      }
      
      console.log(`After attempt ${attempts}: Found ${foundCompanies.length}/${count} unique companies`);
      
      // Add a small delay between API calls to be respectful
      if (attempts < maxAttempts && foundCompanies.length < count) {
        Utilities.sleep(1000); // 1 second delay
      }
    }
    
    const finalCompanies = foundCompanies.slice(0, count);
    console.log('Final companies to add:', finalCompanies);
    
    if (finalCompanies.length === 0) {
      throw new Error('Unable to find any non-duplicate companies matching your criteria after multiple attempts.');
    }
    
    if (finalCompanies.length < count) {
      console.warn(`Only found ${finalCompanies.length} companies out of ${count} requested after ${attempts} attempts`);
      console.warn('This may be due to:');
      console.warn('- High duplicate rate with existing companies');
      console.warn('- Limited companies matching your specific criteria');
      console.warn('- AI struggling to find unique companies in this niche');
    }
    
    return finalCompanies;
    
  } catch (error) {
    console.error('Error calling AI API:', error);
    throw new Error(`Failed to search for companies: ${error.message}`);
  }
}

/**
 * Check if a company name is similar to existing companies using comprehensive checking
 * Checks against ALL existing companies, not just the first 20
 */
function isDuplicate(companyName, existingCompaniesSet) {
  // Ensure existingCompaniesSet is a Set
  if (!(existingCompaniesSet instanceof Set)) {
    console.warn('existingCompaniesSet is not a Set, converting to Set');
    existingCompaniesSet = new Set(existingCompaniesSet || []);
  }
  
  const normalizedName = normalizeCompanyName(companyName);
  if (!normalizedName) return false;
  
  // Check for exact normalized match first (fast check)
  if (existingCompaniesSet.has(normalizedName)) {
    console.log(`Exact duplicate found: "${companyName}" -> normalized: "${normalizedName}"`);
    return true;
  }
  
  // If no exact match, check against ALL existing companies using AI
  const existingCompaniesArray = Array.from(existingCompaniesSet);
  if (existingCompaniesArray.length > 0) {
    return checkSimilarityWithAllCompanies(companyName, existingCompaniesArray);
  }
  
  return false;
}

/**
 * Use AI to check if a company name is similar to any existing companies
 * Checks against ALL existing companies by processing them in batches
 */
function checkSimilarityWithAllCompanies(newCompanyName, existingCompanies) {
  try {
    const batchSize = 20; // Process 20 companies at a time to stay within token limits
    const totalCompanies = existingCompanies.length;
    
    console.log(`Checking "${newCompanyName}" against ${totalCompanies} existing companies in batches of ${batchSize}`);
    
    // Process companies in batches
    for (let i = 0; i < totalCompanies; i += batchSize) {
      const batch = existingCompanies.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(totalCompanies / batchSize);
      
      console.log(`Checking batch ${batchNumber}/${totalBatches} with ${batch.length} companies`);
      
      const isSimilar = checkSimilarityWithAIBatch(newCompanyName, batch);
      
      if (isSimilar) {
        console.log(`Duplicate found in batch ${batchNumber}: "${newCompanyName}" is similar to existing companies`);
        return true;
      }
    }
    
    console.log(`No duplicates found for "${newCompanyName}" after checking all ${totalCompanies} companies`);
    return false;
    
  } catch (error) {
    console.error('Error in comprehensive similarity check:', error);
    return false; // Default to not duplicate if AI check fails
  }
}

/**
 * Use AI to check if a company name is similar to any companies in a specific batch
 * This is the original checkSimilarityWithAI function renamed for clarity
 */
function checkSimilarityWithAIBatch(newCompanyName, existingCompaniesBatch) {
  try {
    const prompt = `I need to check if a new company name is similar to any existing companies in a list.

New company: "${newCompanyName}"

Existing companies:
${existingCompaniesBatch.map((company, index) => `${index + 1}. ${company}`).join('\n')}

Instructions:
- Check if the new company name is the same as or very similar to any existing company
- Consider variations like "D Wave" vs "DWave Technologies Ltd" as the same company
- Consider abbreviations like "IBM" vs "International Business Machines" as the same company
- Consider different legal forms like "Microsoft Corp" vs "Microsoft Corporation" as the same company
- Consider common name variations and alternative spellings

Respond with ONLY:
- "YES" if the new company is similar to any existing company
- "NO" if the new company is completely different from all existing companies

Do not include any explanations or additional text.`;

    const requestBody = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 10,
      temperature: 0.1
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
      console.error('AI similarity check error:', responseData.error);
      return false; // Default to not duplicate if AI check fails
    }
    
    const aiResponse = responseData.choices[0].message.content.trim().toUpperCase();
    const isSimilar = aiResponse.includes('YES');
    
    if (isSimilar) {
      console.log(`AI detected similarity: "${newCompanyName}" is similar to existing companies in this batch`);
    }
    
    return isSimilar;
    
  } catch (error) {
    console.error('Error in AI similarity check batch:', error);
    return false; // Default to not duplicate if AI check fails
  }
}



/**
 * Search for companies using instructions from the configuration interface
 */
function searchCompaniesWithInstructions(searchInstructions, count) {
  try {
    console.log('Starting searchCompaniesWithInstructions with:', { searchInstructions, count });
    
    // Load configuration to ensure we have the latest settings
    loadConfiguration();
    
    // Check if API key is configured
    if (!CONFIG.AI_API_KEY) {
      throw new Error('API key is not configured. Please configure your API key first.');
    }
    
    // Get the active spreadsheet and sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME) || spreadsheet.getActiveSheet();
    
    // Get existing companies from the first column
    const existingCompaniesSet = getExistingCompanies(sheet);
    console.log('Existing companies Set type:', typeof existingCompaniesSet, 'Is Set:', existingCompaniesSet instanceof Set);
    
    // Search for new companies using AI
    const newCompanies = searchCompaniesWithAI(searchInstructions, count, existingCompaniesSet);
    
    if (newCompanies.length === 0) {
      throw new Error('No new companies found matching your criteria.');
    }
    
    // Add new companies to the sheet
    const lastRow = sheet.getLastRow();
    const startRow = Math.max(lastRow, 0); // Ensure we start at row 1 or after the last row
    addCompaniesToSheet(sheet, newCompanies, startRow);
    
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
  
  // Ensure startRow is valid (minimum 0, which becomes row 1 when we add 1)
  const validStartRow = Math.max(startRow, 0);
  
  // Get the range where we'll add new companies (Column A only)
  const targetRange = sheet.getRange(validStartRow + 1, 1, newCompanies.length, 1);
  
  // Set the company names
  const companyData = newCompanies.map(company => [company]);
  targetRange.setValues(companyData);
  
  // Highlight new companies
  targetRange.setBackground(CONFIG.HIGHLIGHT_COLOR);
  
  // Column B is completely untouched - no data added there
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
    
    try {
      SpreadsheetApp.getUi().alert('All highlights have been cleared.');
    } catch (uiError) {
      console.error('UI not available:', uiError);
      console.log('All highlights have been cleared.');
    }
  } catch (error) {
    console.error('Error clearing highlights:', error);
    try {
      SpreadsheetApp.getUi().alert('Error clearing highlights: ' + error.message);
    } catch (uiError) {
      console.error('UI not available:', uiError);
      throw error;
    }
  }
}

/**
 * Test function to verify API connection
 */
function testAPIConnection() {
  try {
    if (!CONFIG.AI_API_KEY) {
      try {
        SpreadsheetApp.getUi().alert('Please configure your API key first using "Configure Settings".');
      } catch (uiError) {
        console.error('UI not available:', uiError);
        throw new Error('Please configure your API key first using "Configure Settings".');
      }
      return;
    }
    
    const testPrompt = 'List 3 well-known technology companies.';
    const companies = searchCompaniesWithAI(testPrompt, 3, []);
    
    if (companies.length > 0) {
      try {
        SpreadsheetApp.getUi().alert(`API connection successful! Test found: ${companies.join(', ')}`);
      } catch (uiError) {
        console.error('UI not available:', uiError);
        console.log(`API connection successful! Test found: ${companies.join(', ')}`);
      }
    } else {
      try {
        SpreadsheetApp.getUi().alert('API connection successful but no companies returned.');
      } catch (uiError) {
        console.error('UI not available:', uiError);
        console.log('API connection successful but no companies returned.');
      }
    }
  } catch (error) {
    try {
      SpreadsheetApp.getUi().alert('API connection failed: ' + error.message);
    } catch (uiError) {
      console.error('UI not available:', uiError);
      throw error;
    }
  }
}

/**
 * Show configuration interface for user settings
 */
function showConfigurationInterface() {
  try {
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
  } catch (uiError) {
    console.error('UI not available:', uiError);
    throw new Error('Configuration interface is not available in this context. Please use the script from within Google Sheets.');
  }
}

/**
 * Show advanced search instructions interface
 */
function showSearchInstructionsInterface() {
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
    
    // Create HTML template for search instructions
    const htmlTemplate = HtmlService.createTemplateFromFile('SearchInstructionsInterface');
    
    const htmlOutput = htmlTemplate.evaluate()
      .setWidth(600)
      .setHeight(700);
    
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Advanced Company Search');
  } catch (uiError) {
    console.error('UI not available:', uiError);
    throw new Error('Search interface is not available in this context. Please use the script from within Google Sheets.');
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
    
    console.log('Configuration saved to Properties Service');
    console.log('API key saved:', !!CONFIG.AI_API_KEY);
    
    try {
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
    } catch (uiError) {
      console.error('UI not available:', uiError);
      console.log('Configuration saved successfully!');
    }
    
  } catch (error) {
    try {
      SpreadsheetApp.getUi().alert('Error saving configuration: ' + error.message);
    } catch (uiError) {
      console.error('UI not available:', uiError);
      throw error;
    }
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
    
    console.log('Loading configuration - savedApiKey exists:', !!savedApiKey);
    
    if (savedApiKey) {
      CONFIG.AI_API_KEY = savedApiKey;
      console.log('API key loaded successfully');
    } else {
      console.log('No saved API key found');
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