/*
  1er arg = ensemble de règles à tester
  2..n args = ensembles de serveurs à tester

  sortie:
  association de, pour chaque règles, pour chaque serveur, les mesures de qualité associées chaque jours du mois
*/

let { range, sliding } = require('./utils');
let fs = require('fs');
let rules = JSON.parse(fs.readFileSync(process.argv[2]));
let servers = process.argv.slice(3); // {time: number, itemset: string[]}[]
const ONE_HOUR = 60 * 60 * 1000; // ms

// est-ce qu'il y a une intersection entre a et b
const intersects = (a, b) => [...a].some(x => b.has(x))
// est-ce que a est un surensemble (non-strict) de b
const is_superset = (a, b) => [...b].every(x => a.has(x))

// Recherche binaire pour des tableau trié, en fonction d'un prédicat

let evalcrits = (rule, day, beginning) => {
    // évalue les critères de qualité sur une fenetre données
    let [l, r] = rule
        .split('=>')
        .map(e =>
             e
             .trim()
             .split(',')
             .map(x => x.trim()))
        .map(x => new Set(x));
    let sa = 0;
    let sb = 0;
    let sab = 0;
    let sanb = 0;

    for (let tr of day) {
        let t = tr.map(x => x.itemset);
        // Soit t une transaction
        // on dit que l'antécédant occure dans une transaction si l'ensemble
        // constitué de l'ensemble des itemset d'indice [0, k[ est un sur-ensemble de
        // l'antécédent
        // on dit que la règle est valide si l'union des itemset d'indices [k, n[
        // de la transaction est un sur-ensemble du conséquent

        let cl = new Set();
        let k = 0;

        while (k < t.length && !is_superset(cl, l)) {
            for(let x of t[k++])
                cl.add(x);
//            cl = new Set([...cl, ...t[k++]]);
        }

        let hasa = is_superset(cl, l); // est-ce qu'il y a un antécédent dans la transaction?
        cl2 = new Set();
        while (k < t.length && !is_superset(cl, r)) {
            for(let x of t[k]) {
                cl.add(x); // On a besoin de savoir si les éléments de b occurent dans la séquence entière
                cl2.add(x);
            }
            ++k;
        }

        let hasbf = is_superset(cl2, r); // est-ce que le conséquent a suivi l'antécédent?

        sa += hasa;
        sb += is_superset(cl, r); // est-ce qu'il y avait un conséquent?
        // hasbf est impliqué par hasa car si hasa == false, cl2 vaut l'ensemble vide,
        // qui n'est jamais un sur-ensemble d'un ensemble contenant au moins un élément
        sab += /*hasa &&*/ hasbf;
        sanb += hasa && !hasbf;
    }

    // supports relatifs
    let rsa = sa / day.length;
    let rsb = sb / day.length;
    let rsab = sab / day.length;
    let rsanb = sanb / day.length;
    return {
        beginning: new Date(beginning),
        support: sab,
        lift: rsab / (rsa * rsb),
        rr: rsab / rsanb || Infinity,
        confidence: rsab / rsa
    };
}

let serverdata = servers.map(s => JSON.parse(fs.readFileSync(s).toString()));

const beg = Math.min(...serverdata.map(x => x.length ? x[0].time : Infinity))
const last = Math.max(...serverdata.map(x => x.length ? x[x.length - 1].time : -Infinity))

let period = [beg, last];
let markers = [];
for (let i = 0; period[0] + i * ONE_HOUR * 24 < period[1]; ++i)
    markers.push({
        beg: period[0] + i * ONE_HOUR * 24,
        end: period[0] + (i + 1) * ONE_HOUR * 24
    });

let k = rules.map(r => ({
    rule: r,
    servers: serverdata.map((timeline, i) => {
        let sects = markers
            .map(periode =>
                 ({
                     b: periode.beg,
                     s: timeline.bsearch(x => x.time - periode.beg),
                     e: timeline.bsearch(x => x.time - periode.end)
                 }));
        return {
            name: servers[i],
            data: sects.map(se => evalcrits(r, sliding(timeline, se, ONE_HOUR), se.b)).filter(x => x.support)
        };
    }).filter(s => s.data.length)
}));

console.log(JSON.stringify(k, null, 3));
