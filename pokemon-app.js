

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

  // var array1 = [1,2]
  //
  // var array2 = [null]
  //
  // console.log(array1.concat(array2));


  setUpUI();

})();

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
  res = cloneArray(types)
  for (var i = 0; i < res.length; i++) {
    if (!eval(res[i][getFirstKey(res[i])] + " " + operator + " " + num)) {
      delete res[i]
    }
  }
return res.filter(type => Object.keys(type).length !== 0)
}

/*
* Gets all the stats related to two type searches
*/
// TODO: monster of a function
function getAllStats(searchType1, searchType2) {
  var types1 = filterTypes(searchType1, 'DEFENDING')
  var types2 = filterTypes(searchType2, 'DEFENDING')
  if (types2 != null) {
    types1 = multiplyTypes(types1, types2)
  }
  // defense getAllStats
  displayTypesX(stringifyTypes(filterTypesByEffect(types1, "==", 4)), "#defenseDisplay", "4X")
  displayTypesX(stringifyTypes(filterTypesByEffect(types1, "==", 2)), "#defenseDisplay", "2X")
  displayTypesX(stringifyTypes(filterTypesByEffect(types1, "==", 1)), "#defenseDisplay", "1X")
  displayTypesX(stringifyTypes(filterTypesByEffect(types1, "==", 0.5)), "#defenseDisplay", "1_2X")
  displayTypesX(stringifyTypes(filterTypesByEffect(types1, "==", 0.25)), "#defenseDisplay", "1_4X")
  displayTypesX(stringifyTypes(filterTypesByEffect(types1, "==", 0)), "#defenseDisplay", "0X")

  // types1 = filterTypes(searchType1, 'ATTACKING')
  // types2 = filterTypes(searchType2, 'ATTACKING')

  types1 = removeDups(filterTypes(searchType1, 'ATTACKING')
    .concat(filterTypes(searchType2, 'ATTACKING'))
    .filter((el) => {return el != null;}))

  // attack stats
  displayTypesX(stringifyTypes(filterTypesByEffect(types1, "==", 4)), "#attackDisplay", "4X")
  displayTypesX(stringifyTypes(filterTypesByEffect(types1, "==", 2)), "#attackDisplay", "2X")
  displayTypesX(stringifyTypes(filterTypesByEffect(types1, "==", 1)), "#attackDisplay", "1X")
  displayTypesX(stringifyTypes(filterTypesByEffect(types1, "==", 0.5)), "#attackDisplay", "1_2X")
  displayTypesX(stringifyTypes(filterTypesByEffect(types1, "==", 0.25)), "#attackDisplay", "1_4X")
  displayTypesX(stringifyTypes(filterTypesByEffect(types1, "==", 0)), "#attackDisplay", "0X")

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
    $("#selector1").selectmenu({
    change: function(event, ui) {
      selectorVariables[0][0] = ui.item.value
      getAllStats(selectorVariables[0][0], selectorVariables[0][1])
    }
  });
    $("#selector2").selectmenu({
    change: function(event, ui) {
      selectorVariables[0][1] = ui.item.value
      getAllStats(selectorVariables[0][0], selectorVariables[0][1])
    }
  });
}

function displayTypes(types, id, title) {
  // if null, erase
  if (types === undefined || types.length == 0) {
    $(id + " ." + title + " h1").text("")
    $(id + " ." + title + " p").text("")
  }
  else {
    $(id + " ." + title + " h1").text(title.replace("_","/"))
    $(id + " ." + title + " p").text(types)
  }
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
