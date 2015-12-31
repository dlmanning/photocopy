var test = require('tape')
var reduce = require('universal-reduce')
var pc = require('./index')
var done = require('./done')

function incKey (next) {
  var inc = 0
  return function (acc, value, key) {
    if (done(acc, value, key)) {
      return next(acc)
    }
    inc += 1
    return next(acc, value, 'a' + inc)
  }
}

function pair (next) {
  var isFirst = true
  var first
  return function (acc, value, key) {
    if (!isFirst) {
      isFirst = true
      return next(acc, [first, value], key)
    } else {
      isFirst = false
      first = value
      return acc
    }
  }
}

test('iterate-all', function (t) {
  var a = pc([1, 2, 3], pc.map(function (i) { return i }))
  t.equal(a[1], 2, 'map identity over array')

  var b = pc([1, 2, 3])
  t.equal(b[0], 1, 'map identity over array by default')

  t.deepEqual(pc([1, 2, 3, 4], pair), [[1, 2], [3, 4]], 'even pair')
  t.deepEqual(pc([1, 2, 3], pair), [[1, 2], [3, undefined]], 'uneven pair')

  function all (next) {
    return function (acc, val, key) {
      if (done(acc, val, key)) {
        return next(acc)
      }
      if (!val) return reduce.reduced(false)
      return next(acc, val, key)
    }
  }

  t.equal(pc([true, false, true], all, true), false, 'early reduce')

  var obj = {a: 1, b: 2}
  var c = pc(obj, pc.map(function (v, k) { return k + v }))
  t.equal(c.b, 'b2', 'modify object while copying')
  obj.b = false
  t.equal(c.b, 'b2', 'confirm copy')

  var deep = new Set()
  deep.add([1, 2, 3])
  var tmp = new Map()
  tmp.set(1, 'a')
  tmp.set(2, 'b')
  tmp.set(3, 'c')
  deep.add(tmp)
  function notA4 (value, key) {
    return key !== 'a4'
  }
  var flat = pc(deep, pc.comp(pc.cat, incKey, pc.filter(notA4)), {})
  t.deepEqual(flat, {a1: 1, a2: 2, a3: 3, a5: 'b', a6: 'c'}, 'weeeee')
  t.deepEqual(pc(flat, pc.keyMap(() => 'a'), {}, pc.byKey),
    {a: [1, 2, 3, 'b', 'c']},
    'Partition by key'
  )

  ;(function () {
    t.equal(pc(arguments)[2], 3, 'arguments object')
    t.ok(Array.isArray(pc(arguments, null, [])), 'arguments to array')
  }(1, 2, 3))

  var d = { foo: 'bar' }
  d.constructor = null
  t.equal(pc(d).foo, 'bar', 'no constructor')

  var add = function (a, b) { return a + b }
  add.foo = 'bar'

  function wrap (fn) { return function () { return fn.apply(this, arguments) } }

  var wrappedAdd = pc(add, null, wrap(add))
  t.notEqual(add, wrappedAdd, 'wrapped function not the same ref')
  t.equal(add.foo, wrappedAdd.foo, 'props transfered')
  t.equal(add(1, 2), wrappedAdd(1, 2), 'work the same')

  var take1 = pc.take(1)
  t.deepEqual(pc([1, 2, 3], take1), [ 1 ], 'take')
  t.deepEqual(pc(tmp, take1, {}), { 1: 'a' }, 'take obj')
  var skip2 = pc.skip(2)
  t.deepEqual(pc([1, 2, 3], skip2), [ 3 ], 'skip')
  t.deepEqual(pc(tmp, skip2, {}), { 3: 'c' }, 'skip obj')

  t.end()
})
