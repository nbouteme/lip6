let fs = require('fs');
let cp = require('child_process');

let servers = ['mario',  'dk', 'link',  'samus', 'yoshi',  'kirby',
			   'fox',  'pikachu',   'luigi',  'ganondorf',  'ness',
			   'falcon',  'rondoudou', 'peach',  'bowser', 'zelda',
			   'marth', 'roy'];

const preamble = fs.readFileSync(`${__dirname}/preamble.gplt`);

// Ce script invoque gnuplot avec les commandes nécessaires pour générer les graphs
// avec les métriques présentes

if (!fs.existsSync('./graphs'))
	fs.mkdirSync('./graphs');

for (let d of servers) {
    let output = `./graphs/${d}.png`;
    let content = fs.readdirSync(d)
	    .filter(fn => fn.endsWith('.plt'));
    let idx = content.indexOf('keepalive.plt');
    let ka;
    if (idx != -1) {
	    ka = true;
	    content.splice(idx, 1); // on plot keepalive séparément
    }
    content = content.map(fn => `"./${d}/${fn}" using 1:2`).join(', \\\n');
    if (content == '') {
	    console.log(`No data for ${d}. Skipping...`);
	    continue;
    }

    // Il faudra changer quelques réglages pour d'autres périodes
    let input =
        `
${preamble}
set output "${output}"
plot ${content} ${ka && `, "./${d}/keepalive.plt" using 1:2 axis x1y2` || ''}
`;
    //    console.log(input)
    let ret = cp.spawnSync("gnuplot", {
	    input
    });
    if (ret.status != 0) {
	    console.log(ret.stdout.toString());
	    console.error(ret.stderr.toString());
    }
}
