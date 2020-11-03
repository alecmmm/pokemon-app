

// global variables
var dataTable
var typeCoordinates
var selector1
var currentSelection = "NORMAL"
// TODO: encapsulate in object
var buttonVariable = Math.max;
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

// var str = ""
//   for (var variable1 in typeCoordinates) {
//     for (var variable2 in typeCoordinates) {
//       if(variable1 != variable2){
//       getAllStats(variable1, variable2)[3].forEach((item) => {
//         str = str + variable1 + "-" + variable2 + ", " +
//           item.type + ", " + item.score + ", " + "\n"
//       });
//
//       ;}
//     }
//   }
//   console.log(str);



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
// maybe just apply to table, so I don't have to use this
// func so much
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

/*
* BACKEND INTERACTIONS
*/

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
  if(attacking == null || defending == null || attacking == '' || defending == ''){
    return 1
  }
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

  // getAllDualEffects()
  var mostEffectiveDualTypes = getMostEffectiveDualType(selectorVariables[0][0],
    selectorVariables[0][1])

  return [defenseTypes, attackTypes1, attackTypes2, mostEffectiveTypes,
  mostEffectiveDualTypes]
}

function getMostEffectiveDualType(searchType1, searchType2) {
  if(searchType2 == undefined){
    searchType2 = null
  }
  var compTypes1 = Object.keys(typeCoordinates)
  var compTypes2 = Object.keys(typeCoordinates)
  compTypes1.push(null)
  var res = []
  compTypes1.forEach((type1) => {
    // remove first item from array
    compTypes2.splice(0,1)
    compTypes2.forEach((type2) => {
      if (type1 != type2) {
        var defense = getDualDamage(searchType1, searchType2, type1, type2)
        var attack = getDualDamage(type1, type2, searchType1, searchType2)
        var score = attack - defense
        res.push({type1: type1, type2: type2, score: score})
      }
    });
  });

  return res;


// returns the dual defense between the search type (defending) and opposing
// type (attacking) j
  function getDualDamage(defendingT1, defendingT2, attackingT1, attackingT2) {
    return Math.max(
      formatFraction(getEffect(attackingT1, defendingT1)) *
      formatFraction(getEffect(attackingT1, defendingT2)),
      formatFraction(getEffect(attackingT2, defendingT1)) *
      formatFraction(getEffect(attackingT2, defendingT2))
    )
  }

}

/*
* Filters all dual types for either the most or least effective type and
* groups them into more readable groups
*/
function filterAndGroupDualTypes(dualTypes, sort=Math.max) {

  // var sortedTypes = separateByScore(dualTypes).map(
  //   e => {
  //     return {
  //       score: e,
  //       edges: dualTypes.filter(f => {
  //         return f.score == e
  //       })
  //     }
  //   }
  // )
  //
  // sortedTypes = sortedTypes.sort((e, f) => {
  //   return f.score - e.score
  // })
  //
  // sortedTypes.forEach(e => {
  //   e.edges = e.edges.map(
  //     f => {
  //       return [f.type1, f.type2]
  //     }
  //   )
  // });
  //
  // sortedTypes.forEach(e => {
  //   console.log(e.score, BronKerbosch(e.edges));
  // });

  // filter dual types based on value
  var sortValue = sort.apply(Math, dualTypes.map(
    function(b) { return b.score; }))
  dualTypes = dualTypes.filter((type) => { return type.score == sortValue});

  // groups all combinations into a smaller set
    var dualTypes = (() => {
      var res = []
      dualTypes.forEach( e => {
        res.push([e.type1, e.type2])
      });
      return res
    })()

    // use Bron Kerbosch algorithm to group and maximal cliques
    var cliques = BronKerbosch(dualTypes)
    // group all groups of size two
    console.log(cliques);
    var cliques2 = groupByVertex(cliques
    .filter(
      e => {
        return e.length == 2
      }
    ))

    // get rid of overlap
    cliques = cliques.filter(
      e => {
        return e.length != 2
      }
    )

    return {score: sortValue ,cliques: cliques, cliques2: cliques2}

  // further groups any bijective elements
  function groupByVertex(array) {
    array = array.filter((e) => {
      return e.length == 2
    })
    var vertexes = new Set()

    array.forEach(e => {
      vertexes.add(e[0])
      vertexes.add(e[1])
    });
    vertexes = Array.from(vertexes)

    vertexes = vertexes.map(
      (e) => {
        return {
          vertex: e,
          count: [...array].filter(x => (x[0]==e || x[1] == e)).length,
          connects: []
        }})
        .sort((e, f) => {
          return f.count - e.count
        })
    var i = 0
    while (i < vertexes.length) {
      var j = 0
      while(j < array.length){
        if (vertexes[i].vertex == array[j][0]) {
          vertexes[i].connects.push(array[j][1])
          array.splice(j,1)
        }

        else if (vertexes[i].vertex == array[j][1]) {
          vertexes[i].connects.push(array[j][0])
          array.splice(j,1)
        }

        else{
          j++
        }
      }
      i++
    }

    return vertexes.filter(e => {
      return e.connects.length != 0
    })
  }
}


function separateByScore(arr) {
   return Array.from(
     new Set(
       arr.map(
         e => {
           return e.score
         }
       )
     )
   )
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
  // // display defense
  // displayEffectsAtId(statsArray[0], "#defenseDisplay")
  //
  // // display attack types 1
  // displayEffectsAtId(statsArray[1], "#attackDisplay1", 'DESCEND')
  //
  // // display attack types 2 if available
  // if (statsArray[2]){
  //   $("#attackDisplay2").css("display","block")
  //   displayEffectsAtId(statsArray[2], "#attackDisplay2", 'DESCEND')
  // }
  // // if not, make make id invisible
  // else {
  //   $("#attackDisplay2").css("display","none")
  // }

  displayMostEffectiveTypes(statsArray[3])

  displayDualTypes2(filterAndGroupDualTypes(statsArray[4], buttonVariable));



  // make type boxes interactive
  $("body").find(".typeBox").each(
    function () {
      bounceHover(this)
    }
  )

}

// refreshes everything with most recent ui selections
function update() {
  displayAllStats(getAllStats(selectorVariables[0][0], selectorVariables[0][1]));
  displayDetails(currentSelection)
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

  $("#matchup > .0").css("max-width", "550px")

  // j
  container.find(".typeBox").remove()
  typeList.forEach((item, i) => {
    container.append('<div class="typeBox" data-type=' + item.type + ' style="background:'
    + colorScale(item.type) + ';">' + item.type + ': ' + item.score + '</div>')
  });

}

// attach change functions to sensors
function setUpUI() {
    // bind selectors to getAllstats and get input
    var sel1 = $("#selector1").selectmenu({
    change: function(event, ui) {
      selectorVariables[0][0] = ui.item.value
      $('#selector2 option').prop("disabled", false)
      $('#selector2 option[value="' + selectorVariables[0][0] +'"]').prop("disabled","true")
      $("#selector2").selectmenu("refresh")
      update()
      },
    width: 150,
    });

    $("#selector2").selectmenu({
    change: function(event, ui) {
      selectorVariables[0][1] = ui.item.value
      $('#selector1 option').prop("disabled", false)
      $('#selector1 option[value="' + selectorVariables[0][1] +'"]').prop("disabled","true")
      $("#selector1").selectmenu("refresh")
      update()
    }, width: 150
  });

  var $button = $( "#button" ).button()
  // on click switch direction of sort
  $button.click(
    function () {
      if (buttonVariable == Math.max) {
        buttonVariable = Math.min
        $button.html("Sort by Strongest Matches")
      }
      else {
        buttonVariable = Math.max
        $button.html("Sort by Weakest Matches")
      }
      update()
    }
  )


  // set up selector variable before jquery,
  // and run getAllStats once
    selectorVariables[0][0] = $("#selector1").val()
    displayAllStats(getAllStats($("#selector1").val(), "NONE"))
    $('#selector2 option[value="' + selectorVariables[0][0] +'"]').prop("disabled","true")
    $("#selector2").selectmenu("refresh")
    displayDetails(currentSelection)

    // coloringButtons()
}

// doesn't work because classes not always visible
function coloringButtons() {
  // console.log($("body").find('[role="option"]'));
  // console.log($("body").find('.ui-menu-item'));
  // console.log($("body").find(".typeBox"));
}

// makes element bounce on hover
// TODO: change name. does more than hover
function bounceHover(element) {
  $(element).hover(
    () => {
      $(element).animate({
        "transform": "translate(-2.5px, -1px)",
        "width": "+=5px",
        "height": "+=2px",
        "font-size": "+=1px"
      }, 100
    )}, () => {
      $(element).animate({
      "width": "-=5px",
      "height": "-=2px",
      "font-size": "-=1px"
    }, "fast")
    })
  $(element).click(
    () => {
      currentSelection = $(element).data("type")
      displayDetails($(element).data("type"))
    }
  )
}

function displayDetails(type) {
// clear contents
  $("#typeDetail").empty()
  $("#attackDetail1").empty()
  $("#attackDetail2").empty()
  .css("display", "none")
  $("#defenseDetail").empty()

// add new contents
  $("#typeDetail").append(createTypeBox(type))

  var div1 = '<div class="detail-number">'
  var div2 = '</div>'

  $("#attackDetail1").append(
    "Type 1 attack: " + div1 + formatDecimals(getEffect(selectorVariables[0][0], type)) + div2
  )

// if there's a type 2
  if(selectorVariables[0][1]){
    $("#attackDetail2").append(
      "Type 2 attack: " + div1 + formatDecimals(getEffect
        (selectorVariables[0][1], type)) + div2)
        .css("display", "inline-block")

    $("#defenseDetail").append(
      "Damage taken: " + div1 + formatDecimals(getEffect(type, selectorVariables[0][0]) *
      getEffect(type, selectorVariables[0][1])) + div2
    )
  }
  else{
    $("#defenseDetail").append(
      'Damage taken: ' + div1 + formatDecimals(getEffect(type, selectorVariables[0][0])) + div2
    )
  }


}

function displayDualTypes2(dualTypesObj) {
  console.log(dualTypesObj  );
  var cliques = $("#cliques")
  .empty()
  .css("display", "flex")
  .css("max-width", "550px")
  .append('<h1>Max Dual Score: ' + dualTypesObj.score + '</h1>')

  dualTypesObj.cliques.forEach(e => {
    var $detail = $('<div class="dualTypesDetail"></div>')

    e.forEach(f => {
      $detail.append(createTypeBox(f, 100, 15, 15))
    });
    cliques.append($detail)
  });

  dualTypesObj.cliques2.forEach(e => {
    if (e.connects.length == 1) {
      var $detail = $('<div class="dualTypesDetail"></div>')
      $detail.append(createTypeBox(e.vertex, 100, 15, 15))
      $detail.append(createTypeBox(e.connects[0], 100, 15, 15))
      cliques.append($detail)
    }

    else if(e.connects.length > 1) {
      var $detail = $('<div class="dualTypesDetail"></div>')
        .css("flex-direction", "column")
      var $detail2 = $('<div class="dualTypesDetail"></div>')
      $detail.append(createTypeBox(e.vertex, 100, 15, 15))

      e.connects.forEach(f => {
        $detail2.append(createTypeBox(f, 100, 15, 15))
      });
      $detail.append($detail2)
      cliques.append($detail)
    }
  });





}

function displayDualTypes(dualTypesObj) {
  console.log(dualTypesObj);
  //clique groups greater than 2
  if (dualTypesObj.cliques.length != 0) {
    var cliques = $("#cliques")
    .css("display", "flex")
    .css("max-width", "550px")

    var p = cliques.find("p")
      .empty()

    cliques.find("h1").html("Most Effective Against Any Dual Combo Of")

    dualTypesObj.cliques.forEach(e => {
      e.forEach(f => {
        p.append(createTypeBox(f, 100, 15, 15))
      });

    });
  }
  else {
    $("#cliques").css("display", "none")
  }
  // clique groups of size 2
  if (dualTypesObj.cliques2.length != 0) {
    var cliques2 = $("#cliques2")
    .css("display", "flex")
    .css("max-width", "550px")
    .css("color", "black")
    .empty()


    dualTypesObj.cliques2.forEach(e => {
      // if there is only one connection, just display
      // the dual type
      if (e.connects.length == 1) {
        $h1 = $('<h1>Most Effective Dual Type Combo: </h1>')
        $p1 = $('<p></p>')
        cliques2.append($h1)
        .append($p1)
        $p1.append(createTypeBox(e.vertex, 200, 30, 25))
        $p1.append(createTypeBox(e.connects[0], 200, 30, 25))
      }
      // if there are more, display the vetex separately
      // from the connecitons
      else {
        $subContainer = $('<div class="basicSubContainer"></div>')
        $h1 = $('<h1>Most Effective Against Any Combo Of: </h1>')
        $h2 = $('<h1>and</h1>')
        $p1 = $('<p style="margin: auto; width: 50%;"></p>')
        $p2 = $('<p></p>')
        cliques2.append($subContainer)
        $subContainer.append($h1)
        .append($p1)
        .append($h2)
        .append($p2)
        $p1.append(createTypeBox(e.vertex, 200, 30, 25))
        .find(".typeBox").css("margin", "auto")
        e.connects.forEach(f => {
          $p2.append(createTypeBox(f, 100, 15, 15))
          .find(".typeBox").css("margin", "auto")
        });
      }
    });
  }
  else {
    $("#cliques2").css("display", "none")
  }
}

function createTypeBox(typeName, width=250, height=35, fontSize=25) {
  return '<div class="typeBox" data-type="' + typeName + '" style="background:'+ colorScale(typeName) +
  '; width:' + width + 'px; height: ' + height + 'px; font-size: ' + fontSize + 'px; text-align: center;">' + typeName + '</div>'
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


// TODO: have one page that only shows the most effective/least effective type
// matchup (showing best of single or double type)
// have a second page that shows the total breakdown of all single and double
 // types
 // have a third page for teams

// j
