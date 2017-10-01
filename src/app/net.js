import {G} from 'graph'
import state from 'state'

export {add_to_server_facts, persist, get_facts_from_server}


let loaded = false

function add_to_server_facts(type, live_item) {
  if(!loaded)
    return undefined // can't save facts until you have all the facts

  /*

   data model:
   user: id
   action: add/remove/edit
   type: node/edge
   tags: [...]
   [maybe other stats can live here?]
   data:
     node: {id, name, type, cat...}
     edge: {_in, _out, type, label}

   */

  // var item = JSON.parse(JSON.stringify(live_item))
  var item = Object.keys(live_item).reduce(function(acc, key) {
        if(['_in', '_out'].indexOf(key) !== -1) return acc
        acc[key] = live_item[key]
        return acc
      }, {})

  if(type === 'edge') {
    item._out = live_item._out._id
    item._in  = live_item._in._id
  }

  // FIXME: present splash page of some kind

  var fact = { email: state.email
             , action: 'add'
             , type: type
             , tags: state.tags
             , data: item
             }

  send_data_to_server(fact)
}

function persist() {
  // THINK: do we still need localstorage caching?
  Dagoba.persist(G, 'rripplemap')
}

persist = debounce(persist, 1000)

function debounce(func, wait, immediate) {
  // via underscore, needs cleaning
  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.

  var timeout
  return function() {
    var context = this, args = arguments
    var later = function() {
          timeout = null
          if (!immediate) func.apply(context, args)
        }
    var callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func.apply(context, args)
  }
}

function send_data_to_server(data, cb) {
  var url = 'http://ripplemap.io:8888'

  if(state.safe_mode === 'daring') {
    url = 'http://localhost:8888'
  }
  else if(state.safe_mode) {
    return console.log(G)
  }

  fetch(url, { method: 'post'
             , body: JSON.stringify(data)
             })
  .then(response => response.json())
  .then(result   => cb ? cb(result) : null)
}

function get_facts_from_server(cb) {
  var url = 'http://ripplemap.io:8888'
  var org = state.org || 1

  // local shunt for airplane mode
  if(state.safe_mode === 'local')
    return cb(JSON.parse(localStorage['DAGOBA::ripmapdata']))

  if(state.safe_mode === 'daring')
    url = 'http://localhost:8888'

  url += '?org=' + org

  fetch(url, { method: 'get'})
  .then(response => response.json())
  .then(data => cb(data))
  .then(data => {loaded = true; return data})
  .catch(err => console.log('lalalal', err))
}
