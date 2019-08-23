Array.prototype.bsearch = function(f) {
    let l = 0;
    let h = this.length - 1;
    while (l <= h) {
        const m = ~~((h + l) / 2);
        const val = f(this[m]);
        if (val == 0)
            return m;
        if (val > 0)
            h = m - 1;
        else
            l = m + 1;
    }
    return l;
}


Array.prototype.zip = function(other) {
    return range(Math.min(this.length, other.length))
        .map(i => {
            let left  =  this[i] instanceof Array ? this[i] :  [this[i]];
            let right = other[i] instanceof Array ? other[i] : [other[i]];
            return [...left, ...right];
        })
}

Array.prototype.sum = function() {
    return this.reduce((a, b) => a + b, 0);
}

Array.prototype.mean = function() {
    return this.sum() / this.length;
}

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


let labels = 'BCKMPS'.split('');

let servers = ['mario',  'dk', 'link',  'samus', 'yoshi',  'kirby',
			   'fox',  'pikachu',   'luigi',  'ganondorf',  'ness',
			   'falcon',  'rondoudou', 'peach',  'bowser', 'zelda',
			   'marth', 'roy'];

let makeobj = tuples => {
    let ret = {};
    for (let tuple of tuples)
	    ret[tuple[0]] = tuple[1];
    return ret;
}

let range = (a, b) => {
    if (b === undefined) { // un seul argument
        b = a;
        a = 0;
    }
    let rev = b < a;
    if (rev) {
        let c = a;
        a = b;
        b = c;
    }
    let ret = [...new Array(b - a)].map((e, i) => i + a + rev);
    if (rev)
        ret.reverse();
    return ret;
}


// évite les accès en dehors de tableau
let idx_clamp = (arr, i) => {
    if (i < 0) // Seulement pour complétude, mais en pratique i n'est jamais < 0
        return arr[0];
    else
        if (i >= arr.length) // Ce cas arrive quand le log d'un serveur passé en paramêtre s'arrête avant les autres
            return arr[arr.length - 1];
    return arr[i];
}

// calcule une fenetre glissante sur une période donnée, de taille donnée
let sliding = (timeline, periode, length) =>
    // la premiere partie est nécessaire pour récuperer, si présent, des éléments en dehors de la période
    // mais qui appartiennent quand même à la fenêtre
    [...range(periode.s, timeline.bsearch(x => x.time - (idx_clamp(timeline, periode.s).time + length)))
     .map(i => timeline.slice(timeline.bsearch(x => x.time - (idx_clamp(timeline, i).time - length)), i)),

     ...range(periode.s, periode.e)
     .map(i => 
          timeline
          .slice(i,
                 timeline.bsearch(x =>
                                  x.time - (idx_clamp(timeline, i).time + length))))]

// pareto est défini comme tout les éléments de arr qui ne perdent
// contre aucun autre élément
// un élément perd contre un autre ssi toute ses
// caractéristiques perdent à un autre 
let pareto = (arr, lose) => 
    arr.filter(x => !arr.some(y => lose(x, y)))

let loss = (a, b) => {
    const params = ['lift', 'rr', 'support', 'confidence'];
    return params.every(p => a[p] < b[p])
}

let memoize = x => {
    let mem = {};
    return (...t) => {
        let str = t.join();
        if (str in mem)
            return mem[str];
        let ret = x(...t)
        if (!(str in mem))
            mem[str] = ret;
        return ret;
    }
}

module.exports.memoize = memoize;
module.exports.loss = loss;
module.exports.pareto = pareto;
module.exports.sliding = sliding;
module.exports.makeobj = makeobj;
module.exports.range = range;
module.exports.servers = servers;
module.exports.labels = labels;

