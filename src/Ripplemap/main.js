import {add_data} from './graph'
import {init as render_init, render, render_all} from 'render'
import * as dom from 'dom' // just for effects
import state from 'state'


export {init, render_all}



///////////////////////// DOM GLUE ///////////////////////////////



export function do_the_glue() {

  dom.el('login').addEventListener('submit', dom.login)

  dom.el('addtag').addEventListener('submit', dom.submit_addtag)

  dom.el('the-conversation').addEventListener('submit', dom.submit_convo)

  dom.el('sentences').addEventListener('mouseover', dom.activate_highlighter)
  dom.el('sentences').addEventListener('mouseout', dom.deactivate_highlighter)
  dom.el('sentences').addEventListener('keyup', dom.keyup_sentences)
  dom.el('sentences').addEventListener('click', dom.click_sentences)

  dom.el('tagnames').addEventListener('click', dom.click_tagnames)
  dom.el('tagnames').addEventListener('mouseover', dom.mouseover_tagnames)
  dom.el('tagnames').addEventListener('mouseout', dom.mouseout_tagnames)

  document.addEventListener('keydown', dom.global_keydown)

  render_all()
}





///////////////////// END DOM GLUE ///////////////////////////////










// package and expose some functionality for the view side,
// and create outward-facing bindings to spin everything up.


// init network load
// expose rendering functions
// create dom hooks on demand as html is rendered





// TODO: partition incoming bleep bloops by action
// TODO: build edit functions
// TODO: build remove functions
// TODO: ask user for email address
// TODO: show current tags
// TODO: allow changing of tags
// TODO: allow multitag views
// TODO: add all tags on server
// TODO: try to get an additional compaction in

// TODO: consolidate like-named nodes
// TODO: consolidate email addresses on server
// TODO: copy tags into url









// INIT


// TODO: break this up a little so the logic is clearer

function init() {
  // do_the_glue()

  if(window.location.host.slice(0, 9) === "127.0.0.1") {
    if(window.location.hash)
      state.safe_mode = window.location.hash.slice(1)
    else
      state.safe_mode = true
  }

  if(window.location.search) {
    state.query = window.location.search.substr(1).split('&').reduce(function(acc, pair) {
      var p = pair.split('=')
      acc[p[0]] = p[1]
      return acc
    }, {})
    if(state.query.tag)
      state.tags = [state.query.tag]
    else if(state.query.tags)
      state.tags = state.query.tags.split('|')
  }

  // G = Dagoba.graph()

  render_init()

  function cb() {
    render_all()
    state.loading = false // TODO: get rid of this somehow
  }

  add_data(cb)

  setTimeout(function() {
    render()
  }, 111)
}

// init()
