


// function to get all existing utlility type comparsions
// not really used in prod
function getAllDualEffects(searchType1, searchType2) {
  var compTypes = Object.keys(typeCoordinates)
  var compTypes1 = Object.keys(typeCoordinates)
  compTypes1.push(null)


for (var b = 0; b < compTypes.length; b++) {
  for (var c = 0; c < compTypes.length; c++) {
    for (var i = 0; i < compTypes.length; i++) {
      for (var j = 0; j < compTypes.length; j++) {
        if (compTypes[j] != compTypes[i] && compTypes[b] != compTypes[c]) {
          var def = Math.max(formatFraction(getEffect(compTypes[j], compTypes[b])) *
          formatFraction(getEffect(compTypes[j], compTypes[c])),
          formatFraction(getEffect(compTypes[i], compTypes[b])) *
          formatFraction(getEffect(compTypes[i], compTypes[c])))
          var att = Math.max(formatFraction(getEffect(compTypes[b], compTypes[i])) *
          formatFraction(getEffect(compTypes[b], compTypes[j])),
          formatFraction(getEffect(compTypes[c], compTypes[j])) *
          formatFraction(getEffect(compTypes[c], compTypes[i])))
          console.log(compTypes[b] + "-" + compTypes[c], att - def, compTypes[j] + "-" + compTypes[i]);
        }
      }
    }
  }
}
}
