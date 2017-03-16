import {G} from 'graph'
import * as dom from 'dom'
import {unique} from 'fun'
import {force_rerender} from 'render'

export {activate, deactivate, highlightz, unhighlight, add_svg_listeners}


function do_for_edge(f, e) {

}


function activate(vertex) {
  vertex.active = true
}

function deactivate(vertex) {
  delete vertex.active
}

function highlight(vertex) {
  vertex.highlight = true
}

function unhighlight(vertex) {
  delete vertex.highlight
}






function add_svg_listeners(edges, nodes) {

  // add listeners
  function highlight_edge(e) {
    let id = e.target.id
    let ids = id.split('-')
    if(!ids[0]) return undefined

    // var fun = function(v) {return ~ids.indexOf(v._id)}
    // highlightyo(fun)
    highlightyo(ids)
  }

  let edge_click = highlight_edge
  let edge_hover = highlight_edge

  let good_edges = edges.filter(id => true)
  good_edges.map(id => dom.el(id).addEventListener('click', edge_click))
  good_edges.map(id => dom.el(id).addEventListener('mouseover', edge_hover))


  function highlight_node(e) {
    let id = e.target.id
    if(!id) return undefined

    let ids = G.v(id).both().both().run().map(x => x._id).filter(unique)
    // var fun = function(v) {return ~ids.indexOf(v._id)}

    setTimeout(x => highlightyo(ids), 300) // TODO: this is so weird
  }

  function activate_node(e) {
    let id = e.target.id
    if(!id) return undefined

    let ids = G.v(id).both().both().run().map(x => x._id).filter(unique)
    // var fun = function(v) {return ~ids.indexOf(v._id)}
    highlightyo(ids, 'activate')
  }

  let node_click = activate_node
  let node_hover = highlight_node

  let good_nodes = nodes.filter(id => +id)
  good_nodes.map(id => dom.el(id).addEventListener('click', node_click))
  good_nodes.map(id => dom.el(id).addEventListener('mouseover', node_hover))
}




let highlight_target = ''
let highlight_fun = ''

export function activate_highlighter() {
  highlight_fun = dom.el('sentences').addEventListener('mousemove', highlight_event)
}

export function deactivate_highlighter() {
  dom.el('sentences').removeEventListener('mousemove', highlight_fun)
}

function highlight_event(e) {
  for(var t=e.target; t && t.matches; t = t.parentNode) {
    if(t.matches('.sentence')) {
      if(highlight_target === t)
        return undefined

      highlight_target = t
      var ids = [].slice.call(t.children).map(node => node.dataset.id).filter(Boolean)
      // var fun = function(v) {return ~ids.indexOf(v._id)}
      // ids.forEach(id => G.v(id).run()[0].highlight = true)
      // render()
      highlightyo(ids)
      return undefined
    }
  }
}

function highlightyo(o_or_f, action='highlight') {
  var current = action === 'activate' ? G.v({active:    true}).run()
                                      : G.v({highlight: true}).run()


  current.forEach(function(node) {
    if(action === 'activate')
      deactivate(node)
    else
      unhighlight(node)
  })

  if(!o_or_f || !o_or_f.length) {
    force_rerender()
    return undefined
  }

  if(typeof o_or_f === 'function') {
    current = G.v().filter(o_or_f).run()
  } else {
    current = G.v(o_or_f).run()
  }

  current.forEach(function(node) {
    if(action === 'activate')
      activate(node)
    else
      highlight(node)
  })

  force_rerender()
}


export function mouseover_tagnames(ev) {
  var target = ev.target
  var tag = target.innerText

  if(!tag)
    return undefined

  if(highlight_target === tag)
    return undefined

  highlight_target = tag
  highlightyo(function(v) { return ~v.tags.indexOf(tag) })
}

export function mouseout_tagnames(ev) {
  if(!highlight_target)
    return undefined

  highlight_target = false
  highlightyo()
}




// HIGHLIGHT MODULE

/*
  So there's at least two kinds of highlighting:
  - click on a node in the viz (or cmd-click a story node?) to 'activate' it
  - mouseover a node/edge in the viz or stories to 'highlight' it

  highlighting is temporary, and makes a visual difference in all copies of the impacted nodes/edges

  activation lasts until deactivation (another subgraph is activated, or everything is deactivated)

  in either case, we should be adding that knowledge to the graph so it can be rendered correctly everywhere


  functions:
  activate(node_or_edge)
  highlight(node_or_edge)

  do_for_edge(f, e)
  do_for_connected_nodes(f, e) // this is based on the current rendering... :[

  need to add listeners to things... where should those live? in preact?
*/
