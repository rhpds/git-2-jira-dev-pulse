# Browser Debugging Guide

If you're seeing a blank page when opening http://localhost:5175, follow these steps:

## Quick Fix (Most Common)

### 1. Hard Refresh
- **Chrome/Edge**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
- **Firefox**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+F5` (Windows/Linux)
- **Safari**: `Cmd+Option+R`

This clears the browser cache and forces a fresh load.

### 2. Clear Browser Cache
1. Open DevTools: `F12` or `Cmd+Option+I` (Mac)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### 3. Open DevTools Console
1. Press `F12` or `Cmd+Option+I` (Mac)
2. Click "Console" tab
3. Look for JavaScript errors (red text)
4. Share any errors you see for debugging

## Verification Steps

### Step 1: Check Servers are Running

```bash
# Check backend
curl http://localhost:8000/api/health

# Check frontend
curl http://localhost:5175

# Run full test suite
node test-e2e.mjs
```

**Expected**: All should respond without errors.

### Step 2: Check Browser Console

Open http://localhost:5175 in your browser:

1. **Open DevTools**: Press `F12`
2. **Console Tab**: Look for errors
3. **Network Tab**: Check if files are loading (200 status)
4. **Elements Tab**: Check if `<div id="root">` has content

**Common Errors:**
- `Failed to load module` → Check network tab for 404s
- `Unexpected token` → Check if CSS/JS is loading correctly
- `React is not defined` → Dependencies not loaded

### Step 3: Check Network Tab

In DevTools Network tab:

- **main.tsx**: Should load (200 status)
- **App.tsx**: Should load (200 status)
- **glassmorphism.css**: Should load (200 status)
- **/api/health**: Should return JSON (200 status)
- **/api/config/**: Should return JSON (200 status)

**Red flags:**
- 404 errors → File not found
- 500 errors → Server error
- CORS errors → Backend not running
- Timeout errors → Server not responding

## Common Issues

### Issue 1: Blank White Page

**Symptoms**: Page loads, but shows only white screen. No errors in console.

**Causes**:
1. React app failed to render
2. CSS loaded but JS didn't run
3. API calls failing silently

**Fix**:
```bash
# Restart both servers
pkill -f "vite" && pkill -f "uvicorn"

# Restart backend
cd backend && uvicorn api.main:app --reload --port 8000 &

# Restart frontend
cd frontend && npm run dev &

# Wait 5 seconds
sleep 5

# Test
curl http://localhost:5175
curl http://localhost:8000/api/health
```

### Issue 2: JavaScript Errors in Console

**Symptoms**: Console shows errors like "Cannot read property X of undefined"

**Fix**:
```bash
# Check for TypeScript errors
cd frontend
npm run type-check

# Rebuild dependencies
rm -rf node_modules package-lock.json
npm install

# Restart
npm run dev
```

### Issue 3: API Calls Failing

**Symptoms**: Console shows "Failed to fetch" or CORS errors

**Fix**:
```bash
# Verify backend is running
curl http://localhost:8000/api/health

# If not running, start it
cd backend
uvicorn api.main:app --reload --port 8000

# Check logs for errors
tail -f backend/logs/*.log
```

### Issue 4: CSS Not Loading

**Symptoms**: Page renders but looks broken, no styling

**Fix**:
```bash
# Check if glassmorphism.css exists
ls -la frontend/src/styles/glassmorphism.css

# Check if PatternFly CSS is loading
curl -s http://localhost:5175 | grep "patternfly"

# Hard refresh browser (Cmd+Shift+R)
```

## Advanced Debugging

### Enable Verbose Logging

**Frontend (Vite):**
```bash
cd frontend
DEBUG=vite:* npm run dev
```

**Backend (FastAPI):**
```bash
cd backend
uvicorn api.main:app --reload --port 8000 --log-level debug
```

### Check React DevTools

1. Install React DevTools browser extension
2. Open DevTools → "Components" tab
3. See if React component tree renders
4. Check component props and state

### Inspect Root Element

In browser console:
```javascript
// Check if root element exists
document.getElementById('root')

// Check if React rendered
document.getElementById('root').children.length

// Check for errors
console.log(window.onerror)
```

## Browser-Specific Issues

### Safari
- Disable "Prevent cross-site tracking" in Preferences → Privacy
- Allow localhost in Develop → Disable Cross-Origin Restrictions

### Firefox
- Disable Enhanced Tracking Protection for localhost
- about:config → network.proxy.allow_hijacking_localhost → true

### Chrome
- Disable extensions that might block requests
- Try Incognito mode: `Cmd+Shift+N`

## Still Not Working?

### 1. Check Logs

**Backend:**
```bash
tail -f /private/tmp/claude-501/-Users-joshuadisraeli-repos-git-2-jira-dev-pulse/tasks/b0bf404.output
```

**Frontend:**
```bash
tail -f /private/tmp/claude-501/-Users-joshuadisraeli-repos-git-2-jira-dev-pulse/tasks/b8ff064.output
```

### 2. Run Test Suite
```bash
node test-e2e.mjs
```

If tests pass but browser still shows blank page, it's a browser-specific issue.

### 3. Try Different Browser

- Chrome
- Firefox
- Safari
- Edge

### 4. Check Firewall/Security

- Allow port 5175 (frontend)
- Allow port 8000 (backend)
- Disable VPN temporarily
- Check antivirus settings

### 5. Nuclear Option: Fresh Install

```bash
# Stop everything
pkill -f "vite" && pkill -f "uvicorn"

# Clean install
cd backend
rm -rf venv __pycache__
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd ../frontend
rm -rf node_modules package-lock.json dist
npm install

# Start fresh
cd ..
make all
```

## Success Checklist

When everything works, you should see:

✅ **Backend**: http://localhost:8000/api/health returns `{"status":"ok"}`
✅ **Frontend**: http://localhost:5175 loads HTML
✅ **Console**: No errors (or only warnings)
✅ **Network**: All files load with 200 status
✅ **UI**: Page displays with navigation and content
✅ **Test**: `node test-e2e.mjs` passes all tests

## Getting Help

If none of the above works:

1. **Capture Screenshots**:
   - Browser console (F12)
   - Network tab showing failed requests
   - Actual page appearance

2. **Share Logs**:
   ```bash
   # Backend logs
   tail -100 /private/tmp/claude-501/-Users-joshuadisraeli-repos-git-2-jira-dev-pulse/tasks/b0bf404.output > backend-log.txt

   # Frontend logs
   tail -100 /private/tmp/claude-501/-Users-joshuadisraeli-repos-git-2-jira-dev-pulse/tasks/b8ff064.output > frontend-log.txt
   ```

3. **Test Results**:
   ```bash
   node test-e2e.mjs > test-results.txt
   ```

4. **System Info**:
   ```bash
   node --version
   python --version
   npm --version
   curl --version
   uname -a
   ```

Share these files when reporting the issue.

---

**Note**: The most common cause of blank pages is browser cache. Always try a hard refresh first!
