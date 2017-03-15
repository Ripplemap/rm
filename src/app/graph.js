/*global Dagoba */

import state from 'state'
import {get_facts_from_server} from 'net'
import {adders, add_edge} from 'model'
import {force_rerender} from 'render'

export let G = Dagoba.graph()
export {addtag, removetag, add_data}


function addtag(tag) {
  state.tags.push(tag)
  G = Dagoba.graph() // THINK: can we thread this through instead?
  fact_to_graph(state.facts)
  force_rerender()
}

function removetag(tag) {
  var index = state.tags.indexOf(tag)
  if(index === -1)
    return undefined

  state.tags.splice(index, 1)
  G = Dagoba.graph() // THINK: can we thread this through instead?
  fact_to_graph(state.facts)
  force_rerender()
}

// function reset_graph() {
//   G = Dagoba.graph()
// }

function add_data(cb) {
  get_facts_from_server(function(facts) {
    if(Array.isArray(facts))
      cb(fact_to_graph(capture_facts(facts)))
    else
      cb(facts) // already a graph, from localStorage
  })
}

function capture_facts(facts) {
  state.facts = facts
  return facts
}

function fact_to_graph(facts) {
  /*

   data model:
   user: id
   action: add/remove/edit
   type: node/edge
   tags: [...]
   org: id
   [maybe other stats can live here?]
   data:
   node: {id, name, type, cat...}
   edge: {_in, _out, type, label}

   */

  var tree = factor_facts(filter_facts(facts))
  state.tagkeys = get_tagkeys(facts)

  tree.nodes.add.forEach(function(node) {
    // var fun = window['add_' + node.cat] // FIXME: ugh erk yuck poo
    var fun = adders[node.cat]
    if(!fun) return undefined
    fun(node.type, node)
  })

  tree.edges.add.forEach(function(edge) { // we need to delay these so the nodes are all in place (sometimes the facts get added in weird orders)
    add_edge(edge.type, edge._out, edge._in, edge)
  })

  tree.nodes.edit.forEach(function(node) {
    // FIXME: what on earth is this??? should it be G.edit?
    // RM.graph.edit(node) //////
  })
}

function get_tagkeys(facts) {
  var keys = {}
  facts.forEach(function(fact) {
    if(fact.action !== 'add') return undefined

    ~(fact.tags||[]).forEach(function(tag) {
      if(tag)
        keys[tag] = true
    })
  })
  return keys
}

function filter_facts(facts) {
  facts = facts.filter(function(fact) {
    return !!set_intersect(fact.tags, state.tags).length // THINK: this implies no empty tag arrays (so 'plain' as default?)
  })

  return facts
}

function factor_facts(facts) {
  var tree = {nodes: {add: [], edit: [], remove: []}, edges: {add: [], edit: [], remove: []}}
  facts.forEach(function(fact) {
    // var branch = tree[fact.type+'s']
    // var list = branch[fact.action] || []
    // if(!branch[fact.action])
    //   branch[fact.action] = list
    var list = tree[fact.type+'s'][fact.action] || [] // TODO: error handling

    // var item = clone(fact.data)
    var item = fact.data // THINK: is mutating here okay?
    item.org = fact.org
    item.user = fact.user
    item.tags = fact.tags
    list.push(item)
  })
  return tree
}

function set_intersect(xs, ys) {
  return xs.filter(function(x) {
    return ys.indexOf(x) !== -1
  })
}
