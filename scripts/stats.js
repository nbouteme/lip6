const spath = process.argv[2];
const classes = +process.argv[3] || 10;

let { range, pareto, loss, labels, memoize } = require('./utils');

const cns = range(classes)
    .map((e, i) => String.fromCharCode(65 + i))

const combs = labels.map(b => cns.map(c => `${b}${c}`)).flat();

const fs = require('fs');
const path = require('path');
const content = fs.readdirSync(spath)
      .filter(fn => fn.endsWith('.txt'))
      .map(n => `${spath}/${n}`);

const rule_to_str = (an, co) => [an, co].map(x => x.join(', ')).join(' => ');

let get_transaction_count = memoize(server => {
    return fs.readFileSync(`${path.dirname(server)}/../${path.basename(server)}`)
        .toString()
        .trim()
        .split('\n').length
});

const fdata = content
    .map(fn => {
	    let rules = JSON.parse(fs.readFileSync(fn).toString());
	    let trad = {};
	    for (let i = 0; i < rules.length; ++i) {
	        rules[i].antecedant = rules[i].antecedant.map(y => combs[y]);
	        rules[i].consequant = rules[i].consequant.map(y => combs[y]);
	        trad[rule_to_str(rules[i].antecedant, rules[i].consequant)] = i;
	    }
	    return {
	        fn: fn.replace('.txt', ''),
            transaction_count: get_transaction_count(fn),
            rule_count: rules.length,
	        d: rules,
	        trad
	    };
    });

fdata.sort((a, b) => b.transaction_count - a.transaction_count);

let sample_rules = db => {
    db.sort((a, b) => b.support - a.support);
    return pareto([...db.slice(0, 100),
                   ...db.slice(-100, 100)], loss);
}

console.log(JSON.stringify(fdata.map(x => ({
    name: path.basename(x.fn),
    transaction_count: x.transaction_count,
    rule_count: x.rule_count,
    max_support: Math.max(...x.d.map(x => x.support)),
    most_relevant: sample_rules(x.d)
})).slice(0, 20), null, 3));
