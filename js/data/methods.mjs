// The comparison matrix behind every lesson's closing "method card" - the
// first authored form of the data a future statistical-test picker will route
// on. Spec: docs/superpowers/specs/2026-08-27-shadowbox-method-cards-design.md
//
// M7 scope (this commit): the umap record is complete. The four earlier
// records carry only a name, a lesson and a kind for their own `when` / `gives`
// / `assumes` fields - M8 backfills those with real prose, alongside their own
// pages' cards.
//
// notInstead completeness is NOT part of that backfill, and is not staged: spec
// §8 is explicit that "completeness is enforced now rather than when the
// picker is built", so every record below already carries a real notInstead
// entry for every method with a lower lesson number - ten pairs across five
// lessons (0 + 1 + 2 + 3 + 4) - even though only the umap record's card ships
// on a page today. The four earlier records' own comparison text is
// provisional and expected to be rewritten in M8 alongside their prose; only
// its structure (present, correctly tiered, vocabulary-clean) is load-bearing
// now.
//
// Every string field is plain text: no markup, no em-dash, and never the bare
// token "k" - a card is read out of the lesson's context, and "k" means two
// unrelated things across lessons 4 and 5. Pinned by test/methods.test.mjs.

export const METHODS = {
  leastSquares: {
    name: 'least squares',
    lesson: 1,
    kind: 'method',
    when: '',
    assumes: [],
    gives: '',
    notInstead: {},
  },

  covariance: {
    name: 'covariance',
    lesson: 2,
    // Nobody chooses covariance over clustering or an embedding. It is
    // something you understand, not something you do instead of another
    // method. Spec §3.1.
    kind: 'lens',
    when: '',
    assumes: [],
    gives: '',
    notInstead: {
      leastSquares: { depth: 'brief', text: 'Least squares fits a single line through two variables, while this describes the spread and tilt of the whole cloud those two variables make.' },
    },
  },

  pca: {
    name: 'PCA',
    lesson: 3,
    kind: 'method',
    when: '',
    assumes: [],
    gives: '',
    notInstead: {
      leastSquares: { depth: 'brief', text: 'Least squares relates two chosen variables with one line, while this looks for structure across every measurement at once.' },
      covariance: { depth: 'brief', text: 'This takes the covariance matrix and turns it into new directions, rather than reporting it as one matrix in the original variables.' },
    },
  },

  kmeans: {
    name: 'k-means',
    lesson: 4,
    kind: 'method',
    when: '',
    assumes: [],
    gives: '',
    notInstead: {
      leastSquares: { depth: 'brief', text: 'Least squares predicts one number from another, while this sorts rows into a fixed number of groups instead of predicting anything continuous.' },
      covariance: { depth: 'brief', text: 'Covariance summarizes the shape of a single cloud, while this splits the cloud into separate pieces.' },
      pca: { depth: 'brief', text: 'This assigns each row a single whole group number, while that keeps a continuous position along each new direction instead.' },
    },
  },

  // The umap record's own prose (when, gives, assumes and the notInstead text)
  // is written in Task 9, alongside the rest of lesson 5's prose, because it IS
  // prose and the same voice rules apply. What is here is placeholder-free and
  // already satisfies every structural and vocabulary test in
  // test/methods.test.mjs, and is expected to be replaced rather than kept.
  umap: {
    name: 'UMAP',
    lesson: 5,
    kind: 'method',
    when: 'you have several measurements per row and want to see whether rows that are alike across all of them also end up near each other on a page, without forcing every row into one of a fixed number of groups.',
    assumes: [
      'that being near in the original measurements is the relationship worth preserving',
      'that the rows have some lower dimensional shape running through them, an assumption a picture like this one can also get wrong',
    ],
    gives: 'a two dimensional picture in which nearby points are trustworthy neighbours, and the distance between two far apart points is not a claim the picture is making.',
    notInstead: {
      leastSquares: { depth: 'brief', text: 'Least squares relates two chosen variables with a single line, nowhere near the many-measurement neighbourhoods this method is built to compare.' },
      covariance: { depth: 'brief', text: 'Covariance summarizes one cloud with a matrix of numbers, while this draws many rows as a picture of who sits near whom.' },
      pca: { depth: 'deep', text: 'Principal components are straight lines through the cloud, chosen to keep the greatest spread, and every row lands on those lines by a plain average of its original measurements. This method is free to bend, which lets it lay a curved relationship flat that no straight line could, at the cost of the one thing those straight lines kept: a distance measured anywhere on the picture no longer relates reliably to a distance in the original data.' },
      kmeans: { depth: 'deep', text: 'Clustering hands back a single label per row and always returns exactly the number of groups you asked for, whether or not that many groups are really there. This instead draws every row\'s whole neighbourhood as a picture, which can show a gradient with no groups in it at all, the very case clustering could not represent.' },
    },
  },
};
