import fs from 'fs';
import path from 'path';

const colorMap = {
  // Hex
  '#080808': '#050A07',
  '#0d0d0f': '#0A1410',
  '#C4B5FD': '#34D399',
  '#A78BFA': '#10B981',
  '#818CF8': '#059669',
  '#F1F5F9': '#ECFDF5',
  
  // RGB
  '196,181,253': '52,211,153',
  '196, 181, 253': '52, 211, 153',
  '167,139,250': '16,185,129',
  '167, 139, 250': '16, 185, 129',

  // Borders
  'rgba(255,255,255,0.08)': 'rgba(255,255,255,0.06)',
  'rgba(255,255,255,0.07)': 'rgba(255,255,255,0.06)',
  'rgba(255,255,255,0.05)': 'rgba(255,255,255,0.06)',
  'rgba(255,255,255,0.12)': 'rgba(255,255,255,0.06)',
  'rgba(255, 255, 255, 0.08)': 'rgba(255,255,255,0.06)',
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(file)) {
        processDirectory(fullPath);
      }
    } else if (file.match(/\.(jsx|js|tsx|ts|css)$/)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      for (const [oldVal, newVal] of Object.entries(colorMap)) {
        // use 'gi' because CSS tags or hexes might be case variations #C4B5FD vs #c4b5fd
        // but wait, if it replaces #f1f5f9 it's fine.
        // I want to escape regex special characters just in case it's a string like rgba(255,255,255,0.05)
        const escapedOldVal = oldVal.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        const regex = new RegExp(escapedOldVal, 'gi');
        content = content.replace(regex, newVal);
      }

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated colors in: ${fullPath}`);
      }
    }
  }
}

processDirectory('./src');
