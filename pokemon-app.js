

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

  // for (var variable1 in typeCoordinates) {
  //   for (var variable2 in typeCoordinates) {
  //     if(variable1 != variable2){
  //     console.log(getMostEffectiveType())
  //     ;}
  //   }
  // }



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

// format decimals into fractions
function formatDecimals(decimal) {
  switch (decimal) {
    case 1:
      return '1×'
    case 2:
      return '2×'
    case 4:
      return '4×'
    case 0.5:
      return '½×'
    case 0.25:
      return '¼×'
    case 0:
      return '0×'
    default:
      return decimal
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
* Gets all the stats related to two type searches, including:
* - defense stats
* - attack stats (type 1 and 2)
* - most effective types
*/
function getAllStats(searchType1, searchType2) {
  // calculate defense scores by multiplying two type defenses
  var defenseTypes = applyXtoTypes(filterTypes(searchType1, 'DEFENDING'),
    filterTypes(searchType2, 'DEFENDING'),
    function (type1, type2) {return type1 * type2}
  )

  // attack stats 1
  var attackTypes1 = filterTypes(searchType1, 'ATTACKING')

// attack stats 2
  var attackTypes2 = filterTypes(searchType2, 'ATTACKING')

// most effective types
  var mostEffectiveTypes = getMostEffectiveType(defenseTypes,
     applyXtoTypes(attackTypes1, attackTypes2, Math.max),
    applyXtoTypes(attackTypes1, attackTypes2, Math.min))

  return [defenseTypes, attackTypes1, attackTypes2, mostEffectiveTypes]
}





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
      // divide min type by two to weight less
    // score += attackCalc(getValueByKey(attackTypesMin, compType)) / 2

    // normalize score out of 0 to 1
    score = normalizeScore(score)

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

// normalize and format score
function normalizeScore(score) {
  return score
}

// calculation to get the defense score
function defenseCalc(num) {
  return num
}

// applies function x to get x of the two effects
// TODO: combine with multiply function
// e.g. if using Max.max, will get the max of the two effects
function applyXtoTypes(types1, types2, xFunction) {
  var res = []
  if (!types2) {
    return types1
  }

  for (var i = 0; i < types1.length; i++) {
    res[i] = {}
    res[i][getFirstKey(types1[i])] = xFunction(getFirstValue(types1[i]), getFirstValue(types2[i]))
  }

  return res
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

/*
*  Displays all stats from getAllStats
*  stats array is composed of the following ordered elements:
*  - defense stats
*  - attack 1 stats
*  - attack 2 stats
*  - attack 3 stats
*/
function displayAllStats(statsArray) {
  // display defense
  displayEffectsAtId(statsArray[0], "#defenseDisplay")

  // display attack types 1
  displayEffectsAtId(statsArray[1], "#attackDisplay1", 'DESCEND')

  // display attack types 2 if available
  if (statsArray[2]){
    $("#attackDisplay2").css("display","block")
    displayEffectsAtId(statsArray[2], "#attackDisplay2", 'DESCEND')
  }
  // if not, make make id invisible
  else {
    $("#attackDisplay2").css("display","none")
  }

  displayMostEffectiveTypes(statsArray[3])

  // make type boxes interactive
  $("#typeDisplays").find(".typeBox").each(
    function () {
      bounceHover(this)
    }
  )

}


/*
*  Displays all effects at given id in given order
*/
// TODO: separate out the grouping function that's created
// with filterTypesByEffect
function displayEffectsAtId(types, id, order='ASCEND') {

  var effectNums = [0, .25, .5, 1, 2, 4]
  if(order == 'DESCEND'){
    effectNums = effectNums.reverse()
  }

  res = effectNums.map((num) => {
    return filterTypesByEffect(types, "==", num)
  });

  var display = $(id)
  display.children(".typeBoxContainer").remove()
  res.forEach((item, i) => {
    if (item.data) {
      display.append('<div class="' + effectNums[i] + ' typeBoxContainer"></div>')
    }
  });

  $(id).children(".typeBoxContainer")
  .empty()
  .append("<h1></h1>")
  .append("<p></p>")
  .children("h1")
  .html((i, title) => {
    return formatDecimals(effectNums[i])
  })

  res.forEach((filteredType) => {
    displayTypesX(stringifyTypes(filteredType.data), id, filteredType.class)
  });
}

function displayMostEffectiveTypes(typeList) {

  var container = $("#matchup > .0 > p")

  $("#matchup > .0").css("max-width", "300px")

  // j
  container.find(".typeBox").remove()
  typeList.forEach((item, i) => {
    container.append('<div class="typeBox" style="background:'
    + colorScale(item.type) + ';">' + item.type + ': ' + item.score + '</div>')
  });

}

// attach change functions to sensors
function setUpUI() {
    // bind selectors to getAllstats and get input
    var sel1 = $("#selector1").selectmenu({
    change: function(event, ui) {
      selectorVariables[0][0] = ui.item.value
      displayAllStats(getAllStats(selectorVariables[0][0], selectorVariables[0][1]));
      $('#selector2 option').prop("disabled", false)
      $('#selector2 option[value="' + selectorVariables[0][0] +'"]').prop("disabled","true")
      $("#selector2").selectmenu("refresh")
    }, width: 150,
  });

    $("#selector2").selectmenu({
    change: function(event, ui) {
      selectorVariables[0][1] = ui.item.value
      displayAllStats(getAllStats(selectorVariables[0][0], selectorVariables[0][1]));
      $('#selector1 option').prop("disabled", false)
      $('#selector1 option[value="' + selectorVariables[0][1] +'"]').prop("disabled","true")
      $("#selector1").selectmenu("refresh")
    }, width: 150
  });
  // set up selector variable before jquery,
  // and run getAllStats once
    selectorVariables[0][0] = $("#selector1").val()
    displayAllStats(getAllStats($("#selector1").val(), "NONE"))
    $('#selector2 option[value="' + selectorVariables[0][0] +'"]').prop("disabled","true")
    $("#selector2").selectmenu("refresh")

    coloringButtons()
}

// doesn't work because classes not always visible
function coloringButtons() {
  // console.log($("body").find('[role="option"]'));
  console.log($("body").find('.ui-menu-item'));
  // console.log($("body").find(".typeBox"));
}

// makes element bounce on hover
function bounceHover(element) {
  $(element).hover(
    () => {
      $(element).animate({
        "width": "+=5px",
        "height": "+=2px",
        "font-size": "+=1px"
      }, "fast"
    )}, () => {
      $(element).animate({
      "width": "-=5px",
      "height": "-=2px",
      "font-size": "-=1px"
    }, "fast")
    })
}

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

/*
* Display types in specific id element and add header text
*/
function displayTypes(types, id, title) {
  $(id + " ." + title).css("display","flex")
  types.forEach((type) => {
    $(id + " ." + title + " p").append('<div class=typeBox style="background:'
    + colorScale(type) + ';">' + type + ' </div>')
  });

  }
}


// TODO: make top ones bigger
// put footnotes on where info is derived from
// change numbers to "1x, 2x, etc."
// Change "Combined Defense Effect" to "Damage Taken"
// make dropdown colorful
// shouldn't have the "select titles". It should be intuitive
// should have a titled betweento pokeballs
// j
