import { createQuoteImage } from './src/commands/quote';

async function testQuote() {
  await createQuoteImage({
    avatarUrl: 'https://avatars.githubusercontent.com/u/16171816',
    author: '이영찬',
    content: '모든 다리는 무너지기 전 안전한 다리다',
    savePath: 'imgs/quotes/test.png',
  });
}

async function main() {
  await testQuote();
}

main()
  .catch(console.error)
  .then(() => process.exit(0));