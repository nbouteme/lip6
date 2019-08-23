let fs = require('fs');

const classes = +process.argv[3] || 10;

let range = rstr => {
    let mi = 0;
    let ma;
    if (typeof rstr != "number") {
	    rstr = rstr.split(':');
	    mi = +rstr[0] || 0;
	    ma = +rstr[1];
    } else
	    ma = rstr;
    return [...new Array(ma - mi)].map((e, i) => i + mi);
}

let cns = range(classes)
    .map((e, i) => String.fromCharCode(65 + i))

const labels = 'BCKMPS'.split('');

if (!Array.prototype.flat)
    Array.prototype.flat = function() {
	    let ret = [];
	    for (let e of this) {
	        if (e instanceof Array)
		        ret.push(...e);
	        else
		        ret.push(e);
	    }
	    return ret;
    }

let combs = labels.map(b => cns.map(c => `${b}${c}`)).flat();
let item_to_int = [];
for (let i = 0; i < combs.length; ++i)
    item_to_int[combs[i]] = i;

let seq = JSON.parse(fs.readFileSync(process.argv[2]).toString())
    .map(e => e.itemset.map(l => item_to_int[l]).join(' ') + ' -1')
    .join(' ') + ' -2';

console.log(seq);
