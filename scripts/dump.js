let fs = require('fs');

const outputdir = process.argv[3] || './edata'
let { servers, makeobj } = require('./utils')
let { join } = require('path')

let extrreg = {
    check_cpu: /total=(\d+)/,
    check_memory: /system memory usage: (\d+)/,
    check_swap_openvz: /: (\d+)/,
    check_vz_partition_usage: /(\d+)(.\d+)?%/,
    check_openvz_backup_partition_usage: /(\d+)(.\d+)?%/,
    keepalive: /(\d+) seconds/
};

let metrics = Object.keys(extrreg);

// Prends en paramètre le chemin du log
let data = fs.readFileSync(process.argv[2]).toString();
// Sépare en ligne et ignore les lignes mal formées
let parsed = data.split('\n').filter(l => l[0] == '{').map(JSON.parse);

/*
  Initialise un objet de la forme:
  {
      [server1]: { check_cpu: {}, check...: {}, ...},
      [server2]: ...,
      ...,
      [servern]: ...
  }
*/
let datasets = makeobj(servers.map(n => [n, makeobj(metrics.map(m => [m, {}]))]));

// Pour chaque message, extrait la valeur de la métrique et stoque dans l'objet plus haut
for (let msg of parsed) {
    let time = +new Date(msg.timestamp);
    if (!(msg.event.check.name in extrreg)) {
	    //console.log("unhandled type:", msg.event.check.name);
	    continue;
    }
    let val;
    try {
	    val = extrreg[msg.event.check.name].exec(msg.event.check.output)[1];
    } catch(e) {
	    console.log(`failed to process ${msg.event.check.name} with value ${msg.event.check.output}`)
	    process.exit(1);
    }
    if (!(msg.event.client.name in datasets)) {
	    console.log("unhandled client:", msg.event.client.name);
	    continue;
    }
    datasets[msg.event.client.name][msg.event.check.name][time] = val;
}

console.log("processed, generating datasheets");

// Sauvegarde les données dans le système de fichier
for (let server of servers) {
    let fold = join(outputdir, server);
    if (!fs.existsSync(fold))
	    fs.mkdirSync(fold);
    for (let m of metrics) {
	    let mdata = datasets[server][m];
	    let k = Object.keys(mdata);
	    if (k.length == 0)
	        continue;
	    let sorted = k.sort((a, b) => a - b).map(v => [v, mdata[v]]);
	    let content = sorted.reduce((a, b) => a + `${b[0]}\t${b[1]}\n`, '');

	    fs.writeFileSync(`${fold}/${m}.txt`, content);

	    // Version des données utilisées pour plot les temps, les timestamps sont en secondes
	    content = sorted.reduce((a, b) => a + `${~~(b[0] / 1000)}\t${b[1]}\n`, '');
	    fs.writeFileSync(`${fold}/${m}.plt`, content);
    }
    console.log('Finished saving ', server);
}
