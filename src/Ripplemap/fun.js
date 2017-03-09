// Some fun functions that help or something

export {noop, not, eq, unique, strip, comp, prop, cp_prop, clone, truncate, push_it, pipe, error}


function noop() {}

function not(fun) {return function() {return !fun.apply(null, arguments)}}

function eq(attr, val) {return function(obj) {return obj[attr] === val}}

function unique(v, k, list) {return list.indexOf(v) === k}

function strip(attr) {return function(obj) { delete obj[attr]; return obj }}

function comp(f, g) {return function() { var args = [].slice.call(arguments); return f(g.apply(null, args)) }}

function prop (attr) {return function(obj) {return obj[attr]}}

function cp_prop(from_attr, to_attr) {return function(obj) {obj[to_attr] = obj[from_attr]; return obj}}

function clone(obj) {return JSON.parse(JSON.stringify(obj))}

function truncate(str, to) {
  if(!to || str.length <= to) return str
  return str.substr(0, to-2) + '...'
}

function push_it(list, key, val) {
  if(!list[key])
    return list[key] = [val]

  list[key].push(val)
  return list[key]
}

function pipe() {
  var all_funs = [].slice.call(arguments)

  function magic_pipe(data) {
    var funs = all_funs.slice()
    var fun

    function inner() {
      while(fun = funs.shift()) {
        if(fun.async) {              // fun is async
          return fun.async(data, cb)
        } else {                     // fun is a function
          data = fun(data)
        }
      }
    }

    function cb(new_data) {
      data = new_data
      inner()
    }

    // TODO: this should return a promise for data
    inner()
    return true
  }

  return magic_pipe
}

function error(mess) {
  console.log(arguments, mess)
}
