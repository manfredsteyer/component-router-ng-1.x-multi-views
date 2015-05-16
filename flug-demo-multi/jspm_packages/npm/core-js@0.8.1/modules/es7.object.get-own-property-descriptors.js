/* */ 
var $ = require("./$"),
    $def = require("./$.def"),
    ownKeys = require("./$.own-keys");
$def($def.S, 'Object', {getOwnPropertyDescriptors: function(object) {
    var O = $.toObject(object),
        result = {};
    $.each.call(ownKeys(O), function(key) {
      $.setDesc(result, key, $.desc(0, $.getDesc(O, key)));
    });
    return result;
  }});
