import { randomDaily } from './src/commands/bet';


// 0 ~ 50000, slice by 1000
const results = [...new Array(15)].map(_ => 0)

let i = 0;
const iter = 100000;
while (i++ < iter) {
  results[Math.floor(randomDaily() / 1000)] += 1;
}

console.log(results)
