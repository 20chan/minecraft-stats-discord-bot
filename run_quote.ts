import dotenv = require('dotenv');
dotenv.config();

import { createQuoteImage } from './src/commands/quote';
import { download } from './src/commands/tts';

async function testQuote() {
  const url = await download('테스트');
  console.log(url);
}

async function main() {
  await testQuote();
}

main()
  .catch(console.error)
  .then(() => process.exit(0));