#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if we can use sharp or puppeteer
let converter;

try {
  const sharp = require('sharp');
  converter = 'sharp';
} catch (e1) {
  try {
    const puppeteer = require('puppeteer');
    converter = 'puppeteer';
  } catch (e2) {
    console.error('Neither sharp nor puppeteer is installed. Installing sharp...');
    try {
      execSync('npm install sharp', { stdio: 'inherit' });
      converter = 'sharp';
    } catch (e3) {
      console.error('Failed to install dependencies. Please install "sharp" manually: npm install sharp');
      process.exit(1);
    }
  }
}

async function generateLogos() {
  const logos = [
    {
      name: 'cdl-mulher',
      svg: path.join(__dirname, '../frontend/assets/svg/cdl-mulher.svg'),
      png: path.join(__dirname, '../_cdl-current.png'),
      width: 1460,
      height: 500
    },
    {
      name: 'rural-pecas',
      svg: path.join(__dirname, '../frontend/assets/svg/rural-pecas.svg'),
      png: path.join(__dirname, '../_rural-current.png'),
      width: 2280,
      height: 1080
    }
  ];

  if (converter === 'sharp') {
    const sharp = require('sharp');
    
    for (const logo of logos) {
      try {
        console.log(`Generating ${logo.name}.png...`);
        const svgBuffer = fs.readFileSync(logo.svg);
        await sharp(svgBuffer)
          .png()
          .toFile(logo.png);
        console.log(`✓ ${logo.name}.png generated successfully`);
      } catch (error) {
        console.error(`✗ Failed to generate ${logo.name}.png:`, error.message);
      }
    }
  } else if (converter === 'puppeteer') {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch();
    
    try {
      for (const logo of logos) {
        try {
          console.log(`Generating ${logo.name}.png...`);
          const page = await browser.newPage();
          const svgContent = fs.readFileSync(logo.svg, 'utf-8');
          
          await page.setContent(`
            <!DOCTYPE html>
            <html>
            <body style="margin: 0; padding: 0;">
              ${svgContent}
            </body>
            </html>
          `);
          
          await page.screenshot({
            path: logo.png,
            type: 'png',
            omitBackground: false
          });
          
          await page.close();
          console.log(`✓ ${logo.name}.png generated successfully`);
        } catch (error) {
          console.error(`✗ Failed to generate ${logo.name}.png:`, error.message);
        }
      }
    } finally {
      await browser.close();
    }
  }
  
  console.log('\nLogo generation complete!');
}

generateLogos().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
