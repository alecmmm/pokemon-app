
// groups an array by its intersections
function reduce(array) {

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
          e.matches.push(array.shift().not(e.subset))
          return true
        }
      }
    )

  }

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
  return this.filter(e => {return e != null && e != undefined})
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


Array.prototype.getAllIntersections = function () {
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
  return res
};
