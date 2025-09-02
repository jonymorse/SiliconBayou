// CollectManager.js
// @input Component.Text countText
// @input Component.Text lastText   {"hint":"(optional) 'Last: Gator' display"}
// @input Component.AudioComponent sfx

var total = 0;
var countsByType = {};        // e.g., { frog: 2, gator: 1 }
var seenById = {};            // optional de-dupe by item id
var collectedLog = [];        // [{id,name,type,value,timestamp}...]

function updateHUD(){
  if (script.countText) script.countText.text = "Collected: " + total;
}

function setLastLabel(item){
  if (!script.lastText || !item) return;
  script.lastText.text = "Last: " + (item.name || "Unknown");
}

function addItem(item){
  var value = item.value || 1;
  if (item.id && seenById[item.id]) {
    // skip duplicates if the same item gets tapped twice
    return;
  }
  if (item.id) seenById[item.id] = true;

  total += value;
  var t = item.type || "item";
  countsByType[t] = (countsByType[t] || 0) + 1;

  item.timestamp = getTime();
  collectedLog.push(item);

  updateHUD(); setLastLabel(item);
  if (script.sfx) script.sfx.play(1);
}

updateHUD();

global.collectManager = {
  add: function(v){ addItem({ value: v || 1, name: "Unknown", type: "item" }); }, // backward compat
  addItem: addItem,
  stats: function(){ return { total: total, counts: Object.assign({}, countsByType), log: collectedLog.slice() }; },
  has: function(id){ return !!seenById[id]; },
  reset: function(){
    total = 0; countsByType = {}; seenById = {}; collectedLog = [];
    updateHUD(); setLastLabel(null);
  }
};
