const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/CheckoutPage.jsx',
  'src/pages/PaymentPendingPage.jsx',
  'src/pages/PaymentThanksPage.jsx',
];

const replacements = [
  [/bg-\[\#0f050a\]/g, 'bg-white'],
  [/radial-gradient\(circle at 50% 0%, #3d1226 0%, #0f050a 100%\)/g, 'none'],
  [/text-white\/[0-9]+/g, 'text-gray-500'],
  [/text-white/g, 'text-gray-900'],
  [/\btext-primary\b/g, 'text-[#1840f5]'],
  [/\bbg-primary\b/g, 'bg-[#1840f5]'],
  [/\bbg-primary\/10\b/g, 'bg-[#1840f5]/10'],
  [/\bbg-primary\/5\b/g, 'bg-[#1840f5]/5'],
  [/\bbg-primary\/20\b/g, 'bg-[#1840f5]/20'],
  [/\bborder-primary\b/g, 'border-[#1840f5]'],
  [/\bborder-primary\/20\b/g, 'border-[#1840f5]/20'],
  [/\bborder-primary\/40\b/g, 'border-[#1840f5]/40'],
  [/\bborder-primary\/50\b/g, 'border-[#1840f5]/50'],
  [/\bbg-white\/5\b/g, 'bg-gray-50'],
  [/\bbg-white\/10\b/g, 'bg-gray-100'],
  [/\bbg-white\/15\b/g, 'bg-gray-100 hover:bg-gray-200'],
  [/\bbg-white\/20\b/g, 'bg-gray-200'],
  [/\bborder-white\/10\b/g, 'border-gray-200'],
  [/\bborder-white\/20\b/g, 'border-gray-300'],
  [/shadow-\[0_8px_30px_rgba\(255,45,146,0.4\)\]/g, 'shadow-xl shadow-[#1840f5]/30'],
  [/shadow-\[0_0_20px_rgba\(255,45,146,0.2\)\]/g, 'shadow-lg shadow-[#1840f5]/20'],
  [/shadow-\[0_0_15px_rgba\(255,45,146,0.45\)\]/g, 'shadow-md shadow-[#1840f5]/10'],
  [/drop-shadow-\[0_0_15px_rgba\(255,45,146,0.45\)\]/g, 'drop-shadow-md'],
  [/linear-gradient\(to top, #0f050a [0-9]+%, transparent\)/g, 'linear-gradient(to top, white 80%, transparent)'],
];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  
  // Custom manual replacements for the main container
  content = content.replace(
    /className="min-h-screen text-gray-900 antialiased"/g,
    'className="min-h-screen bg-white text-gray-900 font-[Manrope] selection:bg-[#1840f5] selection:text-white antialiased"'
  );
  
  content = content.replace(
    /style=\{\{\s*backgroundColor: '#0f050a',\s*backgroundImage: 'none',\s*\}\}/g,
    ''
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated', file);
}
