# AI-Powered Employer Finder - Google Apps Script

This Google Apps Script uses AI API to search for companies based on specific criteria and automatically populates a Google Sheets document with the results.

## Features

- **AI-Powered Search**: Uses OpenAI's GPT API to find relevant companies
- **Duplicate Prevention**: Automatically avoids adding companies that already exist in the sheet
- **Visual Highlighting**: New companies are highlighted in a different color
- **User-Friendly Interface**: Simple prompts for search criteria and company count
- **Timestamp Tracking**: Records when each company was added
- **Custom Menu**: Easy access through Google Sheets menu

## Setup Instructions

### 1. Create a Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name the first sheet "Company List" (or update the `SHEET_NAME` in the script)

### 2. Set Up Google Apps Script
1. In your Google Sheet, go to **Extensions** → **Apps Script**
2. Delete any existing code in the editor
3. Copy and paste the entire contents of `Code.gs` into the editor
4. Save the project with a name like "Employer Finder"

### 3. Configure AI API (No Code Editing Required!)
1. Get an OpenAI API key:
   - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key
   - Copy the key

2. Configure through user interface:
   - In your Google Sheet, click **Employer Finder** → **Configure Settings**
   - Enter your OpenAI API key in the secure field
   - Set your preferred maximum companies per search (1-50)
   - Choose a highlight color for new companies
   - Click "Save Configuration"
   
   **Note:** You do NOT need to edit any code! The API key is entered through a user-friendly interface.

### 4. Set Up the Sheet Structure
Your Google Sheet should have this structure:
- **Column A**: Company names (existing companies go here, new companies will be added here)
- **Column B**: Left completely untouched by the script (you can use it for your own notes)

Example:
```
A
Company
Apple
Google
Microsoft
```

## Usage

### Running the Script
1. Open your Google Sheet
2. You'll see a new menu item: **Employer Finder**
3. Click **Employer Finder** → **Search for Companies**
4. Follow the prompts:
   - Enter your search criteria (e.g., "tech startups in San Francisco")
   - Specify how many companies to add (1-10)

### Example Search Criteria
- "manufacturing companies in Germany"
- "fintech startups in New York"
- "sustainable energy companies in Europe"
- "AI companies in California"
- "healthcare startups in Boston"

### Features Available
- **Search for Companies**: Main function to find and add companies
- **Configure Settings**: Set up API key, search limits, and appearance
- **Clear Highlights**: Remove highlighting from all cells
- **Test API Connection**: Verify your API key is working

## Configuration Options

You can customize the script through the **Configure Settings** interface:

- **API Key**: Your OpenAI API key (stored securely)
- **Maximum Companies**: Number of companies to add per search (1-50)
- **Highlight Color**: Color for newly added companies
- **Settings Persistence**: All settings are saved and restored automatically

## Troubleshooting

### Common Issues

1. **"API connection failed"**
   - Use **Configure Settings** to verify your API key
   - Ensure you have credits in your OpenAI account
   - Verify the API key has proper permissions

2. **"No new companies found"**
   - Try different search criteria
   - Check if existing companies are taking up all the slots
   - Ensure your criteria is specific enough

3. **Script not appearing in menu**
   - Refresh the Google Sheet page
   - Check that the `onOpen()` function is in your script
   - Ensure the script is saved

4. **Permission errors**
   - When first running, Google will ask for permissions
   - Click "Review Permissions" and authorize the script

### Testing Your Setup
1. Use **Configure Settings** to set up your API key
2. Run **Test API Connection** to verify your API key works
3. Try adding a few test companies to ensure the highlighting works
4. Check that duplicates are properly avoided

## Security Notes

- **API Key Security**: Never share your API key publicly
- **Google Apps Script**: Runs on Google's servers, so your API key is secure
- **Permissions**: The script only accesses the current spreadsheet

## Cost Considerations

- **OpenAI API**: Costs depend on usage (typically $0.002 per 1K tokens)
- **Google Apps Script**: Free for personal use, quotas apply for business use

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your API key and account status
3. Ensure your Google Sheet has the correct structure
4. Test with simple search criteria first

## Advanced Customization

### Using Different AI Models
You can change the AI model by modifying the `model` parameter in the `searchCompaniesWithAI` function:

```javascript
model: 'gpt-4', // For more advanced responses
// or
model: 'gpt-3.5-turbo', // For faster, more cost-effective responses
```

### Adding More Columns
To track additional information, modify the `addCompaniesToSheet` function to include more columns (e.g., industry, location, etc.).

### Custom Highlighting
Change the `HIGHLIGHT_COLOR` in the CONFIG object to use different colors:
- `'#FFE6CC'` - Light orange
- `'#E6F3FF'` - Light blue
- `'#E6FFE6'` - Light green
- `'#FFE6E6'` - Light red 