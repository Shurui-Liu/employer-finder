# Quick Setup Guide

## 5-Minute Setup

### Step 1: Create Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com)
2. Create new spreadsheet
3. Rename first sheet to "Company List"
4. Add headers: A1="Company Name", B1="Added Date"

### Step 2: Add Apps Script
1. In your sheet: **Extensions** → **Apps Script**
2. Delete existing code
3. Copy entire `Code.gs` content into editor
4. Save project as "Employer Finder"

### Step 3: Get API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new API key
3. Copy the key

### Step 4: Configure Script
1. Refresh your Google Sheet
2. Click **Employer Finder** → **Configure Settings**
3. Enter your OpenAI API key
4. Set maximum companies (1-50) and highlight color
5. Click "Save Configuration"

### Step 5: Test
1. Refresh your Google Sheet
2. You'll see "Employer Finder" menu
3. Click **Employer Finder** → **Search for Companies**
4. Enter criteria like "tech companies in California"
5. Choose number of companies (1-10)

## Done! 🎉

Your script is now ready to find and add companies to your sheet.

## Need Help?

- **API Issues**: Use **Configure Settings** to check your API key, then **Test API Connection**
- **No Menu**: Refresh the page or check script is saved
- **Permission Errors**: Click "Review Permissions" when prompted

## Example Usage

**Search Criteria Examples:**
- "fintech startups in New York"
- "manufacturing companies in Germany" 
- "AI companies in San Francisco"
- "healthcare startups in Boston"
- "sustainable energy companies in Europe"

**What Happens:**
1. Script asks for your search criteria
2. AI finds relevant companies
3. New companies are added to Column A
4. New companies are highlighted in orange
5. Timestamps are added to Column B
6. Duplicates are automatically avoided 