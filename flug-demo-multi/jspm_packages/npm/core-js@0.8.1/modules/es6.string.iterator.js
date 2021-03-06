/* */ 
var set = require("./$").set,
    at = require("./$.string-at")(true),
    ITER = require("./$.uid").safe('iter'),
    $iter = require("./$.iter"),
    step = $iter.step;
$iter.std(String, 'String', function(iterated) {
  set(this, ITER, {
    o: String(iterated),
    i: 0
  });
}, function() {
  var iter = this[ITER],
      O = iter.o,
      index = iter.i,
      point;
  if (index >= O.length)
    return step(1);
  point = at.call(O, index);
  iter.i += point.length;
  return step(0, point);
});
