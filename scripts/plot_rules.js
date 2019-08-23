let fs = require('fs');
let { join } = require('path');
let cp = require('child_process');
let rules = JSON.parse(fs.readFileSync(process.argv[2]));
const output_dir = process.argv[3] || './rgraph';

let clamp = (i, j, k) => j < i ? i : (j > k ? k : j);

let mkdir = d => !fs.existsSync(d) && fs.mkdirSync(d);

const preamble = fs.readFileSync(`${__dirname}/preamble.gplt`);

mkdir(output_dir);
for (let rule of rules) {
    if (rule.servers.every(s => s.data.length < 2))
        continue;
    mkdir(join(output_dir, rule.rule));
    for (let server of rule.servers) {
        if (server.data.length < 2)
            continue;
        let fn = server.name.replace('.json', '.png');
        let plotdata = server.data.map(x => {
            x.beginning = ~~(+new Date(x.beginning) / 1000); // Unix timestamp en secondes
            if (x.rr === null) // infini
                x.rr = 10;
            x.rr = clamp(0, +x.rr, 10);
            x.lift = clamp(0, x.lift, 10);
            return x;
        }).reduce((a, b) =>
                  ({s: a.s + `${b.beginning - a.l > 6 * 3600 ? '\n' : ''}${b.beginning} ${b.rsup} ${b.confidence} ${b.lift} ${b.rr}\n`,
                    l: b.beginning
                   }), {
                       s:'',
                       l: server.data[0].beginning
                   });
        let output = join(output_dir, rule.rule, fn);
        let input =
            `
${preamble}
set title "${rule.rule} -- ${fn.replace('.png', '')}"
set output "${output}"
plot '-' u 1:2 title "Support" w lines, '' u 1:3 title "Confidence" w lines, '' u 1:4 title "Lift" w lines, '' u 1:5 title "Relative Risk" w lines
${plotdata.s}e
${plotdata.s}e
${plotdata.s}e
${plotdata.s}e
`;
        //console.log(rule.rule,  input);
        let ret = cp.spawnSync("gnuplot", {
	        input
        });
        if (ret.status != 0) {
	        console.log(ret.stdout.toString());
	        console.error(ret.stderr.toString());
        }

    }
}
