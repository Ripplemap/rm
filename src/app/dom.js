// this does some dom things

import state from 'state'
import {G, addtag, removetag} from 'graph'
import {update_conversation} from 'convo'
import {error, noop} from 'fun'
import {persist} from 'net'
import {force_rerender, showtags, whatsnext} from 'render'


export {set_el, append_el}

export const el = function() {
  const els = {}
  const default_el = {addEventListener: noop, removeEventListener: noop}

  return function(el_id) {
    // NOTE: removing caching for now to deal with vdom
    // if(els[el_id])
    //   return els[el_id]
    els[el_id] = document.getElementById(el_id) || default_el
    return els[el_id]
  }
}()

function set_el(el_id, val) {
  el(el_id).innerHTML = val
}

function append_el(el_id, val) {
  el(el_id).innerHTML += val
}



// LOGIN/ORG/TAG STUFF

export function login(e) {
  e.preventDefault()
  state.email = el('email').value

  const name = el('name').value
  const verb = el('mz_involved').value
  let values = { subject: name
               , verb: verb
               , object: 'MozFest 2017'
               , date: '2017-10-26'
               }
  update_conversation(values)
  update_conversation(values)
  update_conversation(values)
  update_conversation(values)

  force_rerender()

  // el('login').classList.add('hide')
  // el('storytime').classList.remove('hide')
}




// INTERACTIONS & DOM BINDINGS

export function click_tagnames(ev) {
  ev.preventDefault()
  var target = ev.target
  var tag = target.innerText
  if(!tag) return undefined
  removetag(tag)

  force_rerender()
  showtags()
}

export function global_keydown(ev) {
  // TODO: clean this up (prevent span hijacking)
  if( ev.target.tagName === 'SPAN'
   || ev.target.tagName === 'INPUT'
   || ev.target.tagName === 'SELECT'
   || ev.target.tagName === 'TEXTAREA'
    )
    return true

  var key = ev.keyCode || ev.which

  // var key_a = 97
  var key_e = 69
  var key_f = 70
  var key_l = 76
  var key_n = 78
  var key_p = 80
  // var key_s = 115
  var tilde = 126
  var larro = 37
  var uarro = 38
  var rarro = 39
  var darro = 40
  // var langl = 60
  // var rangl = 62

  if(key === larro || key === darro || key === key_p) {
    ev.preventDefault()
    if(state.current_year <= state.my_minyear) return false
    state.current_year--
    force_rerender()
  }

  if(key === rarro || key === uarro || key === key_n) {
    ev.preventDefault()
    if(state.current_year >= state.my_maxyear) return false
    state.current_year++
    force_rerender()
  }

  if(key === key_f) {
    state.filter_sentences = !state.filter_sentences
    force_rerender()
  }

  if(key === key_e) {
    state.all_edges = !state.all_edges
    force_rerender()
  }

  if(key === key_l) {
    state.show_labels = !state.show_labels
    force_rerender()
  }

  if(key === tilde) {
    state.admin_mode = !state.admin_mode
    force_rerender()
  }
}

export function submit_addtag(ev) {
  ev.preventDefault()
  addtag(el('othertags').value)

  force_rerender()
  showtags()
}

export function keyup_sentences(ev) {
  // var key = ev.keyCode || ev.which
  var span = ev.target
  var type = span.classList.contains('edge') ? 'edge' : 'cat'
  var val = span.textContent
  var id = span.getAttribute('data-id')

  // TODO: trap return for special effects
  // TODO: maybe trap tab also

  // ev.preventDefault()

  // handle the node case
  if(type === 'cat' && id && val) {
    var node = G.vertexIndex[id]
    if(node && node.name !== val) {
      // update the name/label in the real graph
      node.name = val
      pub(id)
    }
  }

  // handle the edge case
  if(type === 'edge') {
    var id1 = span.getAttribute('data-id1')
    var id2 = span.getAttribute('data-id2')

    var node1 = G.vertexIndex[id1]
    var edges = node1._in.concat(node1._out)
    var edge = edges.filter
      (function(edge)
        {return ( edge._in._id === id1 && edge._out._id === id2 )
             || ( edge._in._id === id2 && edge._out._id === id1 ) })[0]

    if(!edge) return undefined

    edge.label = val
    edge.type = val

    // pub(id1 + '-' + id2)
    // Dagoba.persist(G, 'rripplemap')
    persist()
  }

  function pub(id) {
    // publish the change
    // Dagoba.persist(G, 'rripplemap')
    persist()

    // update all other sentences
    var spans = document.querySelectorAll('span.node-' + id)
    for(var i = 0; i < spans.length; i++) {
      if(spans[i] !== span)
        spans[i].textContent = val
    }

    // rerender the graph
    force_rerender(0)
  }

}

export function click_sentences(ev) {
  var target = ev.target
  if(target.nodeName !== 'BUTTON')
    return true

  var id = target.getAttribute('data-id')
  var node = G.vertexIndex[id]

  if(!node)
    return error('That node does not exist')

  if(node.cat === 'action') { // remove "sentence"
    G.removeVertex(node)
  }
  else {
    G.removeVertex(node) // THINK: is this really reasonable?
  }

  persist()
  force_rerender()
}

export function submit_convo(ev) {
  ev.preventDefault()

  // submit event to field key-value list:
  let fields = [...ev.currentTarget.elements]
  let values = fields.reduce((acc, el) => {acc[el.id] = el.value; return acc}, {})

  if(!Object.keys(values).reduce((acc, k) => acc + values[k], '')) // no values? don't submit
    return false

  update_conversation(values)

  // whatsnext(G, update_conversation())

  force_rerender()
}
