# 🔑 How to Add Your OpenAI API Key (No Code Editing Required!)

## ✅ The Easy Way - User Interface

**You do NOT need to edit any code!** The system is designed so you enter your API key through a simple interface.

### Step 1: Get Your OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Give it a name (e.g., "Employer Finder")
5. Copy the generated key (starts with `sk-`)

### Step 2: Add API Key Through Interface
1. **Open your Google Sheet**
2. **Look for "Employer Finder" menu** in the toolbar
3. **Click: Employer Finder → Configure Settings**
4. **Enter your API key** in the "OpenAI API Key" field
5. **Set your preferences:**
   - Maximum companies per search (1-50)
   - Highlight color for new companies
6. **Click "Save Configuration"**

### Step 3: Test It Works
1. **Click: Employer Finder → Test API Connection**
2. You should see: "API connection successful!"
3. **Start searching: Employer Finder → Search for Companies**

## 🔒 Security Features

- ✅ **No hardcoded keys** - API key is never stored in the code
- ✅ **Secure storage** - Key is stored in Google's Properties Service
- ✅ **Password field** - Key is hidden by default in the interface
- ✅ **User control** - You can change or remove the key anytime

## 🚨 If You Don't See the Menu

If "Employer Finder" menu doesn't appear:

1. **Refresh the page** (Ctrl+F5 or Cmd+Shift+R)
2. **Check Apps Script:**
   - Go to Extensions → Apps Script
   - Make sure the code is saved
   - Run the `onOpen` function manually
3. **Grant permissions** when prompted

## 📝 What Happens When You Save

When you click "Save Configuration":
1. Your API key is securely stored
2. Settings are saved for future use
3. The system tests your API key
4. You can start using the tool immediately

## 🔄 Changing Your API Key

To update your API key later:
1. Click **Employer Finder → Configure Settings**
2. Enter your new API key
3. Click "Save Configuration"

## ❓ Troubleshooting

**"API connection failed"**
- Check your API key is correct (starts with `sk-`)
- Ensure you have credits in your OpenAI account
- Try regenerating your API key

**"Configuration saved successfully"**
- Great! Your API key is working
- You can now search for companies

**No menu appears**
- Refresh the Google Sheet page
- Check that the script is saved in Apps Script editor
- Run the `onOpen` function manually

## 🎯 Quick Start Checklist

- [ ] Get OpenAI API key from platform.openai.com
- [ ] Open your Google Sheet
- [ ] Click "Employer Finder → Configure Settings"
- [ ] Enter your API key
- [ ] Click "Save Configuration"
- [ ] Test with "Test API Connection"
- [ ] Start searching for companies!

**That's it! No code editing required.** 🎉 