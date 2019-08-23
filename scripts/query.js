const classes = +process.argv[3] || 10;

const { range, labels, pareto, loss } = require('./utils');

const cns = range(classes)
    .map((e, i) => String.fromCharCode(65 + i))

const combs = labels.map(b => cns.map(c => `${b}${c}`)).flat();
const fs = require('fs');
const content = fs.readdirSync('.')
    .filter(fn => fn.endsWith('.txt'));
const rule_to_str = (an, co) => [an, co].map(x => x.join(', ')).join(' => ');

let rules = new Set();

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
	        d: rules,
	        trad
	    };
    });

const data = fdata.reduce((a, b) => a.concat(b.d), []);

let counts = {};
for (let d of data) {
    let r = rule_to_str(d.antecedant, d.consequant);
    rules.add(r);
    if (counts[r] === undefined)
	    counts[r] = {n: 0, r: [d.antecedant, d.consequant]};
    counts[r].n++;
}

let res = [];
for (let r of rules) {
    if (counts[r].n < 3)
	    delete counts[r];
    else
	    if (!counts[r].r[0].concat(counts[r].r[1])     // Garder seulement les règles où l'antécédent et le conséquent concernent des catégories différentes
	        .every(x => x[0] == counts[r].r[0][0][0]))
	        res.push({r, n: counts[r]});
}

res.sort((a, b) => b.n.n - a.n.n);

let most_commons = res
// Décommenter pour garder les 20 règles qui touchent le plus de serveurs
//    .slice(0, 20)
    .map(r => ({
	    rule: r.r,
	    data: fdata
		    .filter(s => r.r in s.trad)
		    .map(s => ({
			    name: s.fn,
			    lift: s.d[s.trad[r.r]].lift,
			    support: s.d[s.trad[r.r]].support,
			    confidence: s.d[s.trad[r.r]].confidence,
			    rr: s.d[s.trad[r.r]].rr,
                rules_count: s.d.length,
		    }))
	})).filter(x => {
        // Décommenter si on veut garder les règles qui ont aussi été trouvée en minant
        // l'ensemble des serveurs
	    //return x.data[0].name == 'all'
	    return true;
    });

// Commenter pour désactiver pareto
//most_commons = pareto(most_commons, (a, b) => loss(a.data[0], b.data[0]));

console.log(JSON.stringify(most_commons, null, 3))
