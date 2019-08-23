let { range } = require('./utils');
const granularity = +process.argv[3] || 720;
const classes = +process.argv[4] || 10;

const fs = require('fs');
const s = process.argv[2];
const content = fs.readdirSync(s);

// Liste des catégories (ABCD...)
const cns = range(classes)
      .map((e, i) => String.fromCharCode(65 + i))
      .join('');

// Associe le nom d'une métrique à son étiquette
const metrics_labels = {
    check_cpu: 'C',
    check_memory: 'M',
    check_swap_openvz: 'S',
    check_openvz_backup_partition_usage: 'B',
    check_vz_partition_usage: 'P',
    keepalive: 'K'
};

// Pour tout les fichiers terminants en .txt
// instancier un objet contenant le nom du serveur associé à son contenu
// sous forme de tableau de chaines, chaque élément étant une ligne non vide du fichier
const lines = content
      .filter(fn => fn.endsWith('.txt'))
      .map(fn => ({fn, path: `${s}/${fn}`}))
      .map(ffn => ({
          name: ffn.fn.split('.')[0],
          data: fs.readFileSync(ffn.path).toString()
              .split('\n')
              .filter(l => l != '')
              .map(l => l.split('\t'))
      }));

if (lines.length == 0) { // rien à voir
    console.log([])
    return;
}

// Cherche les timestamps min et max parmi tout les fichiers des métriques
const mint = Math.min(...lines.map(l => +l.data[0][0]));
const maxt = Math.max(...lines.map(l => +l.data[l.data.length - 1][0]));
const inter = (maxt - mint) / granularity;

// calcul les débuts des intervals
const markers = range(granularity + 1)
      .map((e, i) => i * inter + mint);

const ebase = classes ** (2 / 100);

/*
  Pour chaque serveur:
  - génère la liste des indices qui correspondents aux coupes temporelles
  - instancies un objets contenant, pour chaque interval, 
  la tranche d'éléments correspondants
  - associe à chaque tranche d'éléments une étiquette selon leur moyenne
*/
const ret = lines.map(l => {
    // indices des éléments les plus proches d'une certaine période
    const stops = markers.map(m => l.data.bsearch(e => +e[0] - m));
    return stops
            .map((e, i) => {
                const label = metrics_labels[l.name];
                const b = l.data
                      .slice(stops[i], stops[i + 1])
                      .map(e => +e[1])
                // On conserve un trou pour conserver les timing entre les métriques
                if (b.length == 0) // si l'interval est vide
                    return;
                const m = b.mean();
                if (label == 'K') { // Cas spécial du keepalive
                    if (m >= 180)
                        return 'KA';
                    if (m >= 120)
                        return 'KB';
                    return 'KC';
                }
                return label + cns[~~(classes - (ebase ** m) / 10)];
            });
})
// Fusionne les métriques situés sur la même tranche temporelle en un seul itemset
      .reduce((a, b) => a.zip(b)) // les serveurs avec une seul métrique (ken), ne change pas la forme comme désirée...
      .map((e, i) => ({
          time: markers[i], // Conserve l'information de la tranche temporelle
          itemset: e instanceof Array ? e.filter(x => x) : e ? [e] : []
      }))
// Enlève les évènements qui se répètent successivement
/*      .map((e, i, a) => {
          for (let k = 0; k < e.itemset.length; ++k) {
              let cat = e.itemset[k][0] // catégorie de l'élément courant
              while (i > 0) { // On cherche en inverse
                  let oth = a[--i].itemset.find(x => x[0] == cat); // on cherche un élément de la meme catégorie
                  if (oth) { // si on trouve, on garde l'élément courant que si la classe est différente, sinon il est supprimé
                      if (e.itemset[k][1] == oth[1]) {
                          e.itemset.splice(k, 1);
                          --k;
                      }
                      break;
                  }
              }
          }
          return e;
      })
*/
      .filter(e => e.itemset.length); // Enlève les périodes qui ne contiennent aucun éléments

console.log(JSON.stringify(ret, 0, 4));
