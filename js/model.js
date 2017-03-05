import {G} from 'graph'
import {error, clone} from 'fun'
import {add_to_server_facts} from 'net'

export const cats = {} // ripplemap categories
export {add_thing, add_action, add_edge}

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

cats.thing = {}
cats.action = {}
cats.effect = {}
cats.happening = {}

function get_node(catstr, typestr, props) {
  var node = convert_props(props)

  var cat = cats[catstr]
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
  var cat = cats[catstr]
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
  var cattype = cats.thing[type]
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
  cats.thing[type] = cattype

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
  var cattype = cats.action[type]
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
  cats.action[type] = cattype

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
  var cattype = cats.effect[type]
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
  cats.effect[type] = cattype

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
  var cattype = cats.happening[type]
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
  cats.happening[type] = cattype

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


function add_to_graph(type, item) {
  if(type === 'node') {
    // TODO: this is kind of a hack, but also kind of not
    if(!item._id)
      item._id = get_new_id()
    G.addVertex(item)
  }

  if(type === 'edge') {
    G.addEdge(item)
  }
}

function get_new_id() {
  // TODO: swap this out for maybe a mongo_id implementation
  return ("" + Math.random()).slice(2)
}

function convert_props(props) {
  if(typeof props !== 'object')
    return {}

  if(Array.isArray(props))
    return {}

  return clone(props)
}
