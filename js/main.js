/*global Dagoba */

import * as G from 'graph'
import {clone} from 'fun'
import {init as render_init, render, render_conversation} from 'render'
import * as dom from 'dom' // just for effects
import state from 'state'



// package and expose some functionality for the view side,
// and create outward-facing bindings to spin everything up.


// init network load
// expose rendering functions
// create dom hooks on demand as html is rendered



// THE BEGINNING

const RM = {}
RM.facts = []
RM.tags = [] // THINK: default to ['plain']?
RM.tagkeys = {}

// TODO: fix these globals

const safe_mode        = false // okay whatever
const query            = {}    // vroom vroom


RM.conversation = new_conversation()

// HELPERS




/* INTERFACES FOR RIPPLE MODEL
 *
 * There are four categories: Thing, Action, Effect, and Happening
 *
 * Each category has multiple types associated with it. Each node has a category and type.
 *
 * Each node also tracks its cron, the adding user, and some type of 'confidence interval' (later)
 *
 * Each edge has a type, which is its label. Nodes expect edges of certain types.
 *
 */

RM.cats = {} // ripplemap categories
RM.cats.thing = {}
RM.cats.action = {}
RM.cats.effect = {}
RM.cats.happening = {}

function get_node(catstr, typestr, props) {
  var node = convert_props(props)

  var cat = RM.cats[catstr]
  if(!cat)
    return error('that is not a valid cat', catstr)

  var type = cat[typestr]
  if(!type)
    return error('that is not a valid ' + catstr + ' type', typestr)

  // TODO: check props again the cattype's property list

  node.cat  = catstr
  node.type = typestr
  node.name = props.name || typestr // TODO: remove (or something...)

  return node
}

function add_alias(catstr, typestr, alias) {
  // TODO: check alias

  // add an alias to anything
  var cat = RM.cats[catstr]
  if(!cat)
    return error('Invalid cat', catstr)

  var type = cat[typestr]
  if(!type)
    return error('That is not a valid thing type', typestr)

  // add alias
  type.aliases.push(alias)

  // add type to list
  cat[alias] = type

  // THINK: alias rules?
}


function add_thing(type, props, persist) {
  var node = get_node('thing', type, props)
  if(!node) return false

  node.priority = 1 // bbq???

  add_to_graph('node', node)
  if(persist)
    add_to_server_facts('node', node)

  return node
}

function add_action(type, props, persist) {
  var node = get_node('action', type, props)
  if(!node) return false

  node.priority = 1 // bbq???

  // TODO: check props against type (what does this mean?)

  add_to_graph('node', node)
  if(persist)
    add_to_server_facts('node', node)

  return node
}

function add_effect(type, props, persist) {
  var node = get_node('effect', type, props)
  if(!node) return undefined

  node.priority = 0.5 // bbq???

  add_to_graph('node', node)
  if(persist)
    add_to_server_facts('node', node)
}

function add_happening(type, props, persist) {
  var node = get_node('happening', type, props)
  if(!node) return undefined

  node.priority = 0.4

  add_to_graph('node', node)
  if(persist)
    add_to_server_facts('node', node)
}



function new_thing_type(type, properties) {
  // TODO: valid type?

  // does this type exist already?
  var cattype = RM.cats.thing[type]
  if(cattype)
    return error('That thing type already exists', type)

  // manually create
  // THINK: should we copy properties here?
  cattype = {type: type}
  cattype.aliases = [] // THINK: but if you do don't override properties.aliases

  // add properties.cc
  cattype.cc = properties.cc || {}

  // add default props for all things
  cattype.props = {} // THINK: get props from properties.props?
  cattype.props.name = {}
  cattype.props.start = {} // THINK: these have both fuzziness and confidence issues (how sure is the user of the time, how sure are we of the user)
  cattype.props.end = {}

  // TODO: add questions

  // put in place
  RM.cats.thing[type] = cattype

  // add properties.aliases
  if(properties.aliases) {
    properties.aliases.forEach(function(alias) {
      add_alias('thing', type, alias)
    })
  }
}

function new_action_type(type, properties) {
  // TODO: valid type?

  // does this type exist already?
  var cattype = RM.cats.action[type]
  if(cattype)
    return error('That action type already exists', type)

  // manually create
  // THINK: should we copy properties here?
  cattype = {type: type}

  // add properties.edges and default edges
  cattype.edges = properties.edges || {}
  cattype.edges.did = {dir: 'in',  plural: 0, label: 'did', types: ['person'], aliases: []}
  cattype.edges.to  = {dir: 'in',  plural: 0, label: 'to',  types: ['effect'], aliases: []}
  cattype.edges.the = {dir: 'out', plural: 0, label: 'the', types: ['thing'],  aliases: []}

  // add default props for all actions
  cattype.props = {} // THINK: get props from properties.props?
  cattype.aliases = [] // THINK: but if you do don't override properties.aliases

  // TODO: add questions

  // put in place
  RM.cats.action[type] = cattype

  // add properties.aliases
  if(properties.aliases) {
    properties.aliases.forEach(function(alias) {
      add_alias('action', type, alias)
    })
  }
}

function new_effect_type(type, properties) {
  // TODO: valid type?

  // does this type exist already?
  var cattype = RM.cats.effect[type]
  if(cattype)
    return error('That effect type already exists', type)

  // manually create
  // THINK: should we copy properties here?
  cattype = {type: type}

  // add properties.edges and default edges
  cattype.edges = properties.edges || {}
  cattype.edges.to     = {dir: 'out', plural: 0, label: 'to',     types: ['action'],    aliases: []}
  cattype.edges.by     = {dir: 'in',  plural: 1, label: 'by',     types: ['thing'],     aliases: []}
  cattype.edges.was    = {dir: 'in',  plural: 1, label: 'was',    types: ['person'],    aliases: []}
  cattype.edges.during = {dir: 'out', plural: 0, label: 'during', types: ['happening'], aliases: []}

  // add default props for all effects
  cattype.props = {} // THINK: get props from properties.props?
  cattype.aliases = [] // THINK: but if you do don't override properties.aliases

  // TODO: add questions

  // put in place
  RM.cats.effect[type] = cattype

  // add properties.aliases
  if(properties.aliases) {
    properties.aliases.forEach(function(alias) {
      add_alias('effect', type, alias)
    })
  }
}

function new_happening_type(type, properties) {
  // what properties do happenings have?
  // an edge type can have an alias for storytelling purposes

  // TODO: valid type?

  // does this type exist already?
  var cattype = RM.cats.happening[type]
  if(cattype)
    return error('That happening type already exists', type)

  // manually create
  // THINK: should we copy properties here?
  cattype = {type: type}

  // add properties.edges and default edges
  cattype.edges = properties.edges || {}
  cattype.edges.at     = {dir: 'out', plural: 0, label: 'at',     types: ['place',   'event'], aliases: []}
  cattype.edges.the    = {dir: 'out', plural: 1, label: 'the',    types: ['outcome', 'event'], aliases: []}
  cattype.edges.did    = {dir: 'in',  plural: 1, label: 'did',    types: ['person'],           aliases: []}
  cattype.edges.during = {dir: 'in',  plural: 0, label: 'during', types: ['effect'],           aliases: []}

  // add default props for all happenings
  cattype.props = {} // THINK: get props from properties.props?
  cattype.aliases = [] // THINK: but if you do don't override properties.aliases

  // TODO: add questions

  // put in place
  RM.cats.happening[type] = cattype

  // add properties.aliases
  if(properties.aliases) {
    properties.aliases.forEach(function(alias) {
      add_alias('happening', type, alias)
    })
  }
}


function new_edge_type(type, properties) {
  // what properties do edges have?
}

function add_edge(type, from, to, props, persist) {
  var edge = {}

  // check from and to
  // check type against from and to interfaces
  // publish in dagoba + persist

  edge = convert_props(props)
  edge._in = to
  edge._out = from
  edge.type = type
  edge.label = type

  // THINK: if Dagoba supported proper subgraphs, we could have RM.facts and RM.G and keep them fully in sync, instead of limiting RM.G to just the "viewable" facts. we'll need a new RM.GG or something for the currently viewable subgraph. this would also help with all the duplicate node warning messages, cut down on allocations, and allow a pipeline based around building new graphs (or extending/syncing the main graph from the factbase). so facts_to_graph would take a graph and some facts and put them together, or something. or as you add new facts they're automatically ramified into the graph. or fizzlemorts.

  add_to_graph('edge', edge)
  if(persist)
    add_to_server_facts('edge', edge)
}

function import_graph(V, E) {
  // add V things
  // add V happenings
  // add edges
}

function extract_story(V, E) {
  // given a subgraph, extract a "story"
}

function story_to_text(story) {
  // what is a story?
  // how do we turn it into text?
}

function subgraph_of(thing1, thing2) {
  // find all the paths between them, and their attached bits
}


// SET UP CATEGORIES AND EDGES

new_thing_type('person',  {})
new_thing_type('org',     {cc: ['org']})
new_thing_type('place',   {cc: ['place', 'event']})
new_thing_type('event',   {cc: ['event', 'outcome'], timerange: true}) // already has start and end, so... ?
new_thing_type('outcome', {cc: ['outcome'], aliases: ['artwork', 'session']}) // local vs ubiquitous outcomes -- they're structurally different

new_action_type('pass',      {aliases: []})
new_action_type('join',      {aliases: []})
new_action_type('leave',     {aliases: []})
new_action_type('create',    {aliases: []})
new_action_type('attend',    {aliases: ['participate in']})
new_action_type('manage',    {aliases: ['run', 'lead', 'facilitate', 'coordinate', 'organize']})
new_action_type('assist',    {aliases: ['help', 'host', 'contribute']})
new_action_type('present',   {aliases: []})
new_action_type('represent', {aliases: []})
new_action_type('fund',      {aliases: []})
new_action_type('inspire',   {aliases: []})
new_action_type('invite',    {aliases: []})

new_effect_type('inspire',   {aliases: ['influenced']})
new_effect_type('convince',  {aliases: ['ask']})
new_effect_type('introduce', {aliases: ['meet']})

new_happening_type('conversation', {aliases: []})
new_happening_type('experience',   {aliases: ['see', 'hear', 'watch', 'attend']})




// MODEL HELPERS

var loading = true // TODO: fix this

function add_to_server_facts(type, live_item) {
  if(loading)
    return undefined

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
             , tags: RM.tags
             , data: item
             }

  send_data_to_server(fact)
}

function add_to_graph(type, item) {
  if(type === 'node') {
    // TODO: this is kind of a hack, but also kind of not
    if(!item._id)
      item._id = get_new_id()
    RM.G.addVertex(item)
  }

  if(type === 'edge') {
    RM.G.addEdge(item)
  }
}

function get_new_id() {
  // TODO: swap this out for maybe a mongo_id implementation
  return ("" + Math.random()).slice(2)
}

function persist() {
  // THINK: do we still need localstorage caching?
  Dagoba.persist(RM.G, 'rripplemap')
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

  if(safe_mode === 'daring') {
    url = 'http://localhost:8888'
  }
  else if(safe_mode) {
    return console.log(RM.G)
  }

  fetch(url, { method: 'post'
             , body: JSON.stringify(data)
  }).then(function(response) {
    return response.json()
  }).then(function(result) {
    if(cb)
      cb(result)
  })
}

function get_facts_from_server(cb) {
  var url = 'http://ripplemap.io:8888'

  // local shunt for airplane mode
  if(safe_mode === 'local')
    return cb(JSON.parse(localStorage['DAGOBA::ripmapdata']))

  if(safe_mode === 'daring') {
    url = 'http://localhost:8888'
  }

  fetch(url, {
    method: 'get'
  }).then(function(response) {
    return response.json()
  }).then(function(data) {
    cb(data)
  }).catch(function(err) {
    console.log('lalalal', err)
  })
}

function convert_props(props) {
  if(typeof props !== 'object')
    return {}

  if(Array.isArray(props))
    return {}

  return clone(props)
}


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








function join_conversation(conversation) {
  var wants = conversation.current.slots[0].key
  var value = el(wants).value

  var convo = fulfill_desire(conversation, value)

  RM.conversation = convo
  return convo
}

function new_sentence() {
  var slots = [ {key: 'subject', type: 'word', cat: 'thing'}
              , {key: 'verb', type: 'word', cat: 'action'}
              , {key: 'object', type: 'word', cat: 'thing'}
              , {key: 'date', type: 'date'}
              ]
  return {slots: slots, filled: []}
}

function new_conversation() {
  var sentence = new_sentence()
  return {sentences: [sentence], current: sentence}
}

function fulfill_desire(conversation, value) {
  var sentence = give_word(conversation.current, value)

  // TODO: allow multi-sentence conversations


  if(!sentence.slots.length) {
    var subject, verb, object, date
    sentence.filled.forEach(function(slot) {
      if(slot.type === 'gettype') {
        var thing = add_thing(slot.value, {name: slot.name}, true)
        if(slot.oldkey === 'subject') subject = thing
        if(slot.oldkey === 'object' ) object  = thing
      }
      else if(slot.type === 'date') {
        date = slot.value
      }
      else if(slot.key === 'subject') {
        subject = slot.word
      }
      else if(slot.key === 'object') {
        object = slot.word
      }
      else if(slot.key === 'verb') {
        verb = (slot.word||{}).type || slot.value
      }
    })

    if(subject && verb && object) {
      verb = add_action(verb, {time: new Date(date).getTime() }, true)
      add_edge('the', verb._id, object._id, 0, true)
      add_edge('did', subject._id, verb._id, 0, true)
    }

    // start over
    // TODO: show the sentence
    conversation = new_conversation()
    render() // THINK: this should queue or something... rAF?
  }

  return conversation
}

function give_word(sentence, value) {
  var slot = sentence.slots.shift()
  if(!slot)
    return error('This sentence is finished')

  // TODO: check this logic modularly
  if(slot.type === 'word') {
    var word = RM.G.v({name: value, cat: slot.cat}).run()[0]
    if(word) {
      slot.word = word
    }
  }

  if(slot.cat === 'thing') {
    if(slot.type === 'word') {
      if(!slot.word) {
        sentence.slots.unshift({key: 'type', type: 'gettype', name: value, cat: slot.cat, oldkey: slot.key})
      }
    }
    else if(slot.type === 'gettype') {
      // var nameslot = sentence.filled[sentence.filled.length-1]
    }
  }

  // fix it in post
  slot.value = value
  sentence.filled.push(slot)

  return sentence
}


function render_all() {
  render()
  render_conversation(RM.conversation)
  showtags()
}

// INIT

function add_data(cb) {
  get_facts_from_server(function(facts) {
    cb(fact_to_graph(capture_facts(facts)))
  })
}

function capture_facts(facts) {
  RM.facts = facts
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
  RM.tagkeys = get_tagkeys(facts)

  tree.nodes.add.forEach(function(node) {
    var fun = window['add_' + node.cat] // FIXME: ugh erk yuck poo
    if(!fun) return undefined
    fun(node.type, node)
  })

  tree.edges.add.forEach(function(edge) { // we need to delay these so the nodes are all in place (sometimes the facts get added in weird orders)
    add_edge(edge.type, edge._out, edge._in, edge)
  })

  tree.nodes.edit.forEach(function(node) {
    RM.graph.edit(node) //////
  })
}

function get_tagkeys(facts) {
  var keys = {}
  facts.forEach(function(fact) {
    ~(fact.tags||[]).forEach(function(tag) {
      keys[tag] = true
    })
  })
  return keys
}

function filter_facts(facts) {
  facts = facts.filter(function(fact) {
    return !!set_intersect(fact.tags, RM.tags).length // THINK: this implies no empty tag arrays (so 'plain' as default?)
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
    var list = tree[fact.type+'s'][fact.action] // TODO: error handling

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

function set_minus(xs, ys) {
  return xs.filter(function(x) {
    return ys.indexOf(x) === -1
  })
}

function showtags() {
  // generate current tags
  // hoverable span for highlight, plus clickable for remove
  var tagwrapper = ['<span class="tag">', '</span>']
  var tagstr = RM.tags.map(function(tag) { return tagwrapper[0] + tag + tagwrapper[1] }).join(', ')
  dom.set_el('tagnames', tagstr)

  // generate select box
  var unused = set_minus(Object.keys(RM.tagkeys), RM.tags).sort()
  var optionstr = '<option>' + unused.join('</option><option>') + '</option>'
  dom.set_el('othertags', optionstr)
}


function init() {
  if(window.location.host === "127.0.0.1") {
    if(window.location.hash)
      safe_mode = window.location.hash.slice(1)
    else
      safe_mode = true
  }

  if(window.location.search) {
    query = window.location.search.substr(1).split('&').reduce(function(acc, pair) {
      var p = pair.split('=')
      acc[p[0]] = p[1]
      return acc
    }, {})
    if(query.tag)
      RM.tags = [query.tag]
    else if(query.tags)
      RM.tags = query.tags.split('|')
  }

  RM.G = Dagoba.graph()

  render_init()

  function cb() {
    render_all()
    loading = false // TODO: get rid of this somehow
  }

  add_data(cb)

  setTimeout(function() {
    render()
  }, 111)
}

init()
