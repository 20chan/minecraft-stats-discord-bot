import dotenv = require('dotenv');
dotenv.config();

import { randomDaily } from './src/commands/bet';

function testAbsolute() {
  let money = 10000;

  const iter = 1000;
  for (let i = 0; i < iter; i += 1) {
    // const multiplier = 0.1;

    const price = 500;
    const amount = Math.max(1, Math.round(randomDaily() * 1));

    money = money - price + amount;
  }

  console.log(money);
}

function testRelative() {
  let money = 10000;

  const iter = 100;
  for (let i = 0; i < iter; i += 1) {
    const multiplier = money / 500 * 0.1;
    const price = 500 * multiplier;

    const amount = Math.max(1, Math.round(randomDaily() * multiplier));

    money = money - price + amount;
  }

  console.log(money);
}

function testRelatives() {
  const percents = [0.1, 0.3]

  for (const percent of percents) {
    const iter = 20;
    const results = [];
    for (let j = 0; j < iter; j += 1) {
      let money = 10000;
      for (let i = 0; i < 100; i += 1) {
        const multiplier = money / 500 * percent
        const price = 500 * multiplier;

        const amount = Math.max(1, Math.round(randomDaily() * multiplier));

        money = Math.round(money - price + amount);
      }

      results.push(money);
    }

    results.sort((a, b) => a - b);
    console.log(percent, results);
  }
}

async function main() {
  testRelatives();
}

main()
  .catch(console.error)
  .then(() => process.exit(0));