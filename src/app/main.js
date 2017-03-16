import {add_data} from './graph'
import {init as render_init, add_renderer as on_render, force_rerender, showtags, get_viz_html} from 'render'
import * as dom from 'dom' // just for effects
import state from 'state'
import {mouseover_tagnames, mouseout_tagnames, activate_highlighter, deactivate_highlighter} from 'highlight'


export {init, state, on_render}





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


function init() {

  // TODO: break this up a little so the logic is clearer

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
    force_rerender()
    showtags()
    tagglue()
  }

  add_data(cb)

  // setTimeout(function() {
  //   // render()
  // }, 111)

  on_render(get_viz_html)       // oh poo
}

function tagglue() {
  // barf yuck
  dom.el('tagnames').addEventListener('click', dom.click_tagnames)
  dom.el('tagnames').addEventListener('mouseover', mouseover_tagnames)
  dom.el('tagnames').addEventListener('mouseout', mouseout_tagnames)
  dom.el('addtag').addEventListener('submit', dom.submit_addtag)

  // not quite as barfy
  document.addEventListener('keydown', dom.global_keydown)
}


///////////////////////// DOM GLUE ///////////////////////////////



export function do_the_glue() {

  dom.el('login').addEventListener('submit', dom.login)

  dom.el('addtag').addEventListener('submit', dom.submit_addtag)

  dom.el('the-conversation').addEventListener('submit', dom.submit_convo)

  dom.el('sentences').addEventListener('mouseover', activate_highlighter)
  dom.el('sentences').addEventListener('mouseout', deactivate_highlighter)
  dom.el('sentences').addEventListener('keyup', dom.keyup_sentences)
  dom.el('sentences').addEventListener('click', dom.click_sentences)

  // dom.el('tagnames').addEventListener('click', dom.click_tagnames)
  // dom.el('tagnames').addEventListener('mouseover', dom.mouseover_tagnames)
  // dom.el('tagnames').addEventListener('mouseout', dom.mouseout_tagnames)

  // document.addEventListener('keydown', dom.global_keydown)



  // render_all()
}


///////////////////// END DOM GLUE ///////////////////////////////
