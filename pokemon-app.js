

// global variables
var dataTable
var typeCoordinates
var selector1
var selectorVariables = [[],[]];

// main async function, used to wait for completion of asynch tasks
(async function() {
  google.charts.load('current');
  // load and prepare trending data
  await setUpQuery('https://docs.google.com/spreadsheets/d/1KXLfRbQN3ZpheC7SimVsoZ-vonSR2TV9za8ovWyKMnQ/edit?usp=sharing',
'select *');
  dataTable = createTable(await getQuery());
  typeCoordinates = getTypeCoordinates()
  // TODO: move to other function
  colorScale = d3.scaleOrdinal(Object.keys(typeCoordinates),
    ["#A8A878","#C03028","#A890F0","#A040A0","#E0C068","#B8A038","#A8B820",
    "#705898","#B8B8D0","#F08030","#6890F0","#78C850","#F8D030","#F85888",
    "#98D8D8","#7038F8","#705848","#EE99AC"])


  setUpUI();
  // run stats once at beginning4



})();

/*
* GOOGLE SHEETS INTERACTIONS
*/
// set up google visualization query
function setUpQuery(sheetLocation, queryStatement) {
   var promise = new Promise(function(resolve, reject) {
       google.charts.setOnLoadCallback(function(){
           query = new google.visualization.Query(sheetLocation);
           query.setQuery(queryStatement);
          resolve('done');
       }
);
   });
   return promise;
}

// send query and return the response
function getQuery(){
  var promise = new Promise(function(resolve, reject){
    query.send(function(response){
      resolve(response);
    })
  });
  return promise;
}

// transform google response into an array and format fractions
function createTable(response){
  var dataArray =[];
  var data = response.getDataTable();
  var columns = data.getNumberOfColumns();
  var rows = data.getNumberOfRows();
  var table = [];

// start at 1 to remove first row and column
  for (var r = 1; r < rows; r++) {
    var row = [];
    for (var c = 1; c < columns; c++) {
      row.push(formatFraction(data.getFormattedValue(r, c)));
    }
    table.push(row)
  }

  return table;
}

// format fractions in chart to decimals
function formatFraction(fraction) {
  switch (fraction) {
    case '1×':
      return 1
    case '2×':
      return 2
    case '½×':
      return 0.5
    case '0×':
      return 0
    default:
      return fraction
  }
}

function getTypeCoordinates() {
  var coordinates = {}
  for (var i = 1; i < dataTable.length; i++) {
      coordinates[dataTable[0][i]] = i
  }
  return coordinates
}

// gets the type effect corresponding to attacking
//and defending types
function getEffect(attacking, defending) {
  return  dataTable[typeCoordinates[attacking]][typeCoordinates[defending]]
}

// TODO: is this way to complicated? Just need to return the corresponding row
// or column, mapped to the headers
function filterTypes(searchType, searchCond) {
  if (!Object.keys(typeCoordinates).includes(searchType)) {
    return null
  }
  var res = []
  for (var type in typeCoordinates) {
    var resultItem = {}
    if (searchCond == 'ATTACKING') {
      resultItem[type] = getEffect(searchType, type);
    }
    else if (searchCond == 'DEFENDING') {
      resultItem[type] = getEffect(type, searchType);
    }
    else {
      throw "searchCondition must be ATTACKING or DEFENDING"
    }
    res.push(resultItem)
  }
  return res
}

// multiply defense types to get combined effects
function multiplyTypes(defenseTypes1, defenseTypes2) {
  if(!defenseTypes2){
    return defenseTypes1
  }

  var res = cloneArray(defenseTypes1)
  for (var i = 0; i < res.length; i++) {
    // TODO: may need to sort to garuntee same order before we multiply
    res[i][getFirstKey(res[i])] = getFirstValue(defenseTypes1[i]) * getFirstValue(defenseTypes2[i])
  }
  return res
}

/*
* Convert list of types to stiring
*/
function stringifyTypes(types) {
  var res = [];
  for (var i = 0; i < types.length; i++) {
    res.push(getFirstKey(types[i]));
  }
  return res;
}


/*
* filter types by effect level (e.g. > 1x or == 0x)
*/
function filterTypesByEffect(types, operator, num) {
  if (types == null) {
    return []
  }
  var res = {}
  var clone = cloneArray(types)

  for (var i = 0; i < clone.length; i++) {
    if (!eval(clone[i][getFirstKey(clone[i])] + " " + operator + " " + num)) {
      delete clone[i]
    }
  }
  res.data = clone.filter(type => Object.keys(type).length !== 0)
  res.class = num.toString().replace('.',"\\.")
  return res
}

/*
* Gets all the stats related to two type searches
*/
// TODO: monster of a function
function getAllStats(searchType1, searchType2) {

  var defenseTypes = multiplyTypes(filterTypes(searchType1, 'DEFENDING'),
    filterTypes(searchType2, 'DEFENDING'))

  // defense getAllEffects
  getAllEffects(defenseTypes, "#defenseDisplay")

  // attack stats 1
  var attackTypes1 = filterTypes(searchType1, 'ATTACKING')
  getAllEffects(attackTypes1, "#attackDisplay1")

// attack stats 2
  var attackTypes2 = filterTypes(searchType2, 'ATTACKING')

  if (attackTypes2){
    $("#attackDisplay2").css("display","block")
    getAllEffects(filterTypes(searchType2, 'ATTACKING'), "#attackDisplay2")
  }
  else {
    $("#attackDisplay2").css("display","none")
  }

  var attackTypesMax =  getXEffect(attackTypes1, attackTypes2, Math.max)

  var attackTypesMin =  getXEffect(attackTypes1, attackTypes2, Math.min)


  console.log(getMostEffectiveType(defenseTypes, attackTypesMax, attackTypesMin));

// debate on what's more effective: should dual attacks both get full values?
// on one hand, if you already have an effective STAB attack, having more isn't
// that useful. Especially if you're up against a dual type, it's better to have
// different types of attacks. Also, it gives attack equal weighting with defense.
// However, if we're assuming we're up against a single type, maybe this
// shouldn't be taken into consideration.
  function getMostEffectiveType(defenseTypes, attackTypesMax, attackTypesMin) {
    var compTypes = Object.keys(typeCoordinates)
    compTypes = compTypes.map((compType) => {
      var score = 0
      score -= defenseCalc(getValueByKey(defenseTypes, compType))
      score += attackCalc(getValueByKey(attackTypesMax, compType))
      if (attackTypes2) {
        // divide min type by two to weight less
      score += attackCalc(getValueByKey(attackTypesMin, compType)) / 2
      }

      return {type: compType, score: score}
    })

    compTypes = compTypes.sort(function(a, b) {
      return b.score - a.score;
    });
    return compTypes
  }

// calculation to get the attack score
  function attackCalc(num) {
    return num
  }

  // calculation to get the defense score
  function defenseCalc(num) {
    return num
  }

// applies function x to get x of the two effects
// TODO: combine with multiply function
// e.g. if using Max.max, will get the max of the two effects
  function getXEffect(types1, types2, xFunction) {
    if (!types2) {
      return types1
    }

    for (var i = 0; i < types1.length; i++) {
      types1[i][getFirstKey(types1[i])] = xFunction(getFirstValue(types1[i]), getFirstValue(types2[i]))
    }
    return types1
  }


    function getAllEffects(types, id) {

      var res = [0, .25, .5, 1, 2, 4]
      res = res.map((num) => {
        return filterTypesByEffect(types, "==", num)
      });

      res.forEach((filteredType) => {
        displayTypesX(stringifyTypes(filteredType.data), id, filteredType.class)
      });
    }
}

/*
*  UTILITIES
*/
{
/*
* Returns first key of an Object
*/
function getFirstKey(object) {
  return Object.keys(object)[0]
}

/*
* Returns first value of an object
*/
function getFirstValue(object) {
  return object[getFirstKey(object)]
}

/*
* Returns value of matching key in
* the array of objects
*/
function getValueByKey(list, key) {
  var res
  list.forEach((item) => {
    if (getFirstKey(item) == key) {
      res = getFirstValue(item)
      return false
    }
  });
  return res
}

/*
* Removes duplicate objects from array.
* Note, that order of keys affects what is
* considered unique. e.g. {a: 1, b: 2} != {b: 2, a: 1}
*/
function removeDups(array) {
  return Array.from(new Set(array.map(JSON.stringify))).map(JSON.parse)
}

function cloneArray(array) {
  return JSON.parse(JSON.stringify(array));
}

}

/*
*  USER INTERFACE
*/
{
// Global variables
var colorScale

// attach change functions to sensors
function setUpUI() {
    // bind selectors to getAllstats and get input
    $("#selector1").selectmenu({
    change: function(event, ui) {
      selectorVariables[0][0] = ui.item.value
      getAllStats(selectorVariables[0][0], selectorVariables[0][1]);
      $('#selector2 option').prop("disabled", false)
      $('#selector2 option[value="' + selectorVariables[0][0] +'"]').prop("disabled","true")
      $("#selector2").selectmenu("refresh")
    }, width: 150
  });
    $("#selector2").selectmenu({
    change: function(event, ui) {
      selectorVariables[0][1] = ui.item.value
      getAllStats(selectorVariables[0][0], selectorVariables[0][1]);
      $('#selector1 option').prop("disabled", false)
      $('#selector1 option[value="' + selectorVariables[0][1] +'"]').prop("disabled","true")
      $("#selector1").selectmenu("refresh")
    }, width: 150
  });
  // set up selector variable before jquery,
  // and run getAllStats once
    selectorVariables[0][0] = $("#selector1").val()
    getAllStats($("#selector1").val(), "NONE")
    $('#selector2 option[value="' + selectorVariables[0][0] +'"]').prop("disabled","true")
    $("#selector2").selectmenu("refresh")
}

/*
* Display types in specific id element and add header text
*/
function displayTypesX(types, id, title) {
  // blank slate
  $(id + " ." + title + " p").html("")
  // if null, erase
  if (types === undefined || types.length == 0) {
    $(id + " ." + title).css("display","none")
  }
  else {
    $(id + " ." + title).css("display","flex")
    types.forEach((type) => {
      $(id + " ." + title + " p").append('<div class=typeBox style="background:'
      + colorScale(type) + ';">' + type + ' </div>')
    });

  }
  }
}
