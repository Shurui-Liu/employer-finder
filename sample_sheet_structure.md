# Sample Google Sheet Structure

## Recommended Setup

Create a Google Sheet with the following structure:

### Sheet Name: "Company List"

| Column A (Company Name) | Column B (Notes) |
|------------------------|------------------|
| Apple Inc.             | Existing company |
| Google LLC             | Existing company |
| Microsoft Corporation  | Existing company |
| [New companies will be added here with highlighting] | |

## Column Descriptions

### Column A: Company Name
- **Purpose**: Stores all company names
- **Format**: Text
- **Behavior**: 
  - Existing companies remain unchanged
  - New companies are added at the bottom
  - New companies are highlighted in light orange (#FFE6CC)

### Column B: User Notes (Optional)
- **Purpose**: Additional information about companies
- **Format**: Text
- **Behavior**: Manual entry only - script never touches this column

## Setup Instructions

1. **Create the sheet**:
   ```
   A1: Company Name
   B1: Notes
   ```

2. **Add existing companies**:
   - List your existing companies in Column A
   - Start from row 2 (row 1 is headers)

3. **Format headers**:
   - Make row 1 bold
   - Add background color to distinguish headers

4. **Set column widths**:
   - Column A: 200px (company names)
   - Column B: 200px (notes)

## Example Data

Here's how your sheet might look after running the script:

| Company Name | Notes |
|--------------|-------|
| Apple Inc. | Existing |
| Google LLC | Existing |
| Microsoft Corporation | Existing |
| **Tesla, Inc.** | **New** |
| **SpaceX** | **New** |
| **Palantir Technologies** | **New** |

*Note: Bold rows indicate newly added companies with highlighting*

## Tips for Best Results

1. **Start with existing companies**: Add your current company list to Column A
2. **Use specific search criteria**: Instead of "tech companies", try "AI startups in San Francisco"
3. **Use Column B for notes**: Add context about why companies were added or their relevance (script never touches this column)
4. **Regular cleanup**: Use "Clear Highlights" when you want to reset the visual indicators

## Troubleshooting Sheet Issues

### If companies aren't being added:
- Check that Column A is the first column
- Ensure the sheet name matches `CONFIG.SHEET_NAME` in the script
- Verify there are no empty rows in the middle of your data

### If highlighting isn't working:
- Make sure the script has permission to modify the sheet
- Check that the `HIGHLIGHT_COLOR` in the CONFIG is valid
- Try running "Clear Highlights" first

### If companies aren't being added:
- Check that Column A is the first column
- Ensure the sheet name matches `CONFIG.SHEET_NAME` in the script
- Verify there are no empty rows in the middle of your data

 