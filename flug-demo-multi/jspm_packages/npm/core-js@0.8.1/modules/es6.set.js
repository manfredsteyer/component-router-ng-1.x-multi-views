/* */ 
'use strict';
var strong = require("./$.collection-strong");
require("./$.collection")('Set', {add: function(value) {
    return strong.def(this, value = value === 0 ? 0 : value, value);
  }}, strong);
