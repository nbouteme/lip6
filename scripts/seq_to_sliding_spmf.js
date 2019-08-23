let fs = require('fs');

const classes = +process.argv[3] || 10;
const arg2 = +process.argv[4] || 60; // minutes
const length = arg2 * 60 * 1000; // ms
const { range, labels, sliding } = require('./utils');

let cns = range(classes)
    .map((e, i) => String.fromCharCode(65 + i))

let combs = labels.map(b => cns.map(c => `${b}${c}`)).flat();
let item_to_int = [];
for (let i = 0; i < combs.length; ++i)
    item_to_int[combs[i]] = i;

let transactions = JSON.parse(fs.readFileSync(process.argv[2]).toString())

let seq = sliding(transactions, {s: 0, e: transactions.length}, length)
    .map(window => window.map(m => m.itemset.map(e => item_to_int[e]).join(' ')).join(' -1 '))
    .filter(w => w.length)
    .join(' -2\n')

console.log(seq);
