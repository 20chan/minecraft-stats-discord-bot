import { randomDaily } from './src/commands/bet';


// 0 ~ 50000, slice by 1000
const results = [...new Array(15)].map(_ => 0)

let i = 0;
const iter = 1000;
let resultAvg = 0;
while (i++ < iter) {
  let avg = 0;
  for (let j = 0; j < 1000; j += 1) {
    avg += randomDaily();
  }
  resultAvg += avg / 1000;
}

console.log(resultAvg / iter)
