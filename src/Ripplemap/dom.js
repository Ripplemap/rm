// this does some dom things

import state from 'state'
import {G, addtag, removetag} from 'graph'
import {join_conversation} from 'convo'
import {error, noop} from 'fun'
import {persist} from 'net'
import {render, whatsnext} from 'render'
import {init} from './main';
import {classMaker} from '../utils';

export {set_el, append_el}

export const el = function() {
  const els = {}
  const default_el = {addEventListener: noop}

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
  el('login').classList.add('hide')
  el('storytime').classList.remove('hide')
}

// SOME HIGHLIGHTING OR SOMETHING

var highlight_fun, highlight_target

export function activate_highlighter() {
  highlight_fun = el('sentences').addEventListener('mousemove', highlighter)
}

export function deactivate_highlighter() {
  el('sentences').removeEventListener('mousemove', highlight_fun)
}

function highlighter(e) {
  for(var t=e.target; t && t.matches; t = t.parentNode) {
    if(t.matches('.sentence')) {
      if(highlight_target === t)
        return undefined

      highlight_target = t
      var ids = [].slice.call(t.children).map(node => node.dataset.id).filter(Boolean)
      var fun = function(v) {return ~ids.indexOf(v._id)}
      // ids.forEach(id => G.v(id).run()[0].highlight = true)
      // render()
      highlight(fun)
      return undefined
    }
  }
}

function highlight(o_or_f) {
  var current = G.v({highlight: true}).run()
  current.forEach(function(node) {
    // node.highlight = false
    delete node.highlight // better when collapsing
  })

  if(!o_or_f) {
    render()
    return undefined
  }

  if(typeof o_or_f === 'function') {
    current = G.v().filter(o_or_f).run()
  } else {
    current = G.v(o_or_f).run()
  }

  current.forEach(function(node) {
    node.highlight = true
  })

  render()
}


// INTERACTIONS & DOM BINDINGS

export function click_tagnames(ev) {
  ev.preventDefault()
  var target = ev.target
  var tag = target.innerText
  if(!tag) return undefined
  removetag(tag)
}

export function mouseover_tagnames(ev) {
  var target = ev.target
  var tag = target.innerText

  if(!tag)
    return undefined

  if(highlight_target === tag)
    return undefined

  highlight_target = tag
  highlight(function(v) { return ~v.tags.indexOf(tag) })
}

export function mouseout_tagnames(ev) {
  if(!highlight_target)
    return undefined

  highlight_target = false
  highlight()
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
    render()
  }

  if(key === rarro || key === uarro || key === key_n) {
    ev.preventDefault()
    if(state.current_year >= state.my_maxyear) return false
    state.current_year++
    render()
  }

  if(key === key_f) {
    state.filter_sentences = !state.filter_sentences
    render()
  }

  if(key === key_e) {
    state.all_edges = !state.all_edges
    render()
  }

  if(key === key_l) {
    state.show_labels = !state.show_labels
    render()
  }

  if(key === tilde) {
    state.admin_mode = !state.admin_mode
    render()
  }
}

export function submit_addtag(ev) {
  ev.preventDefault()
  addtag(el('othertags').value)
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
    render(0)
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
  render()
}

export function submit_convo(ev) {
  ev.preventDefault()

  whatsnext(G, join_conversation())

  return false
}



// --- tees' non react - legend hack thing to avoid styling selectors. --- //
// BEWARE! HE has no idea what he's doing 🙀

// this is the equivalent of the react component "legendItem"... so class styles are
// in that css file (uikit/legenditem/styles.css)
const eventNouns = [
  {name: 'Event',        color: '#FF1E3A'},
  {name: 'Individual',   color: '#00A3D8'},
  {name: 'Group',        color: '#00AE57'},
  {name: 'Project',      color: '#FCB0DB'},
  {name: 'Outcome',      color: '#FFE98F'},
];


let eventButtonstimesCalled = 0
function testThing(){console.log('him im a button')}

export function eventButtons (){
  // lol. see `render_all` for more fun
  eventButtonstimesCalled++
  if (eventButtonstimesCalled > 1) return

  // where to shove this test thingy -- i put this in the `story` component
  var mount = document.getElementById('testarea');

  // pretend i'm doing react
  eventNouns.map(button => {
    mount.innerHTML += `
      <div class="legendItemBox">
        <button id="btn_noun_${button.name}" class="legendItem">
          <div class="legendCircle" style="background: ${button.color}"/>
          <span class="legendText">${button.name}</span>
        </button>
      </div>
    `;

    // add event listeners to the button just made
    // call a function on click that chooses an item from the select dropdown.
    // this is only attaching to the last item in the .map call...
    var x = document.getElementById(`btn_noun_${button.name}`)
    x.addEventListener('click', testThing)
    console.log('hiiii', x);

  });
};

