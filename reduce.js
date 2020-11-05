
/*
* Groups an array by its intersections. Groups with the largest number of
* matched elements are prioritized.
* e.g. [ [1,2,3], [1,2,4], [1,2,5], [1,2,5] ] will be grouped to
* { subset: [1, 2], matches: [3, 5] }
*/
function reduce(array) {

  // get all intersection, remove duplicates,
  // remove nones, and create objects with subsets and
  // matches for each
  var res = array.getAllIntersections()
    .removeDups()
    .removeNones()
    .sort((e, f) => {
      return f.length - e.length
    })
    .map(
      e => {
        return {subset: e, matches: []}
      }
    )

  while (array.length != 0) {
    res.some( e => {
        if (e.subset.isSubset(array[0])) {
          // get element that subsumes the subset.
          // remove intersection
          var match = array.shift().not(e.subset)
          // if intersection is not null, push
          if (match.length != 0) {
            e.matches.push(match)
          }
          return true
        }
      }
    )
  }
  // if any matches are of size 1, just add to the subset
  res.forEach(e => {
    if (e.matches.length == 1) {
      e.subset.push(e.matches.shift())
    }
  });

  return res
}




// j from stack
Array.prototype.getAllSubsets = function () {
  var array = this
  const getAllSubsets = array => array.reduce(
    (subsets, value) => subsets.concat(
     subsets.map(set => [value,...set])
    ),
    [[]]
  );
  return getAllSubsets(this)
};


Array.prototype.not = function (arr) {
  return this.filter( e => !arr.includes(e))
};


Array.prototype.removeNones = function () {
  return this.filter(e => {
    if (Array.isArray(e)) {
      return e.length != 0
    }
    return e != null && e != undefined
  })
};



Array.prototype.isSubset = function (arr) {
  return this.every(
    e => {
      if (!Array.isArray(e)) {
        return arr.includes(e)
      }
      else {
          var res = false
          arr.forEach((f) => {
            if (e.isSubset(f)) {
              res = true
              // return true
            }
          });
          return res
      }
  })
};

// from stack
Array.prototype.removeDups = function () {
  var seen = {};
  return this.filter(function(e) {
      return seen.hasOwnProperty(e) ? false : (seen[e] = true);
  });
  return seen
};

Array.prototype.getIntersection = function (array) {
  return this.filter(e => array.includes(e))
};

/*
* Gets all the intersections between arrays in a 2D array.
* In the special case where array size is 1, the array itself
* is returned.In special case where there are no intersections
* found, then just return the original array
*/
Array.prototype.getAllIntersections = function () {
  if (this.length == 1) {
    return this
  }
  var subsets = this.getAllSubsets()
  var res = []
  subsets.forEach(e => {
    // filter out length 0 and 1 (everything is an interexection
    // with itself)
    if (e.length != 0 && e.length != 1) {
      var intersection = e[0]
      for (var i = 0; i < e.length - 1; i++) {
        intersection = intersection.getIntersection(e[i + 1])
      }
    }
    res.push(intersection)
  });
  // special case where no intersections found
  if (res.length == 0) {
    return this
  }
  return res
};

// console.log(reduce([ [1,2,3], [1,2,4], [1,2,5], [1,2,5,6] ]));

// maybe we should change grouping order with priority:
// 1 accross the most
// 2 the most number of matches
// jjj
