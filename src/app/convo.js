import {add_thing, add_action, add_edge} from 'model'
// import * as dom from 'dom'
import {G} from 'graph'
import {force_rerender} from 'render'
import {error} from 'fun'
import {highlightyo} from 'highlight'


export let convo = new_conversation()
export {update_conversation, restart_sentence}

function restart_sentence() {
  convo.current = new_sentence()
  force_rerender()
}

function update_conversation(values, conversation) {
  var conversation = conversation || convo

  var wants = conversation.current.slots[0].key
  var value = values && values[wants] || false
  // var value = dom.el(wants).value

  // THINK: what could possibly go wrong?
  if(!value)
    return convo

  convo = fulfill_desire(conversation, value)

  return convo
}

function new_sentence() {
  var slots = [ {key: 'subject', type: 'word', cat: 'thing'}
              , {key: 'verb', type: 'word', cat: 'action'}
              , {key: 'object', type: 'word', cat: 'thing'}
              , {key: 'date', type: 'date'}
              , {key: 'consent', type: 'consent'}
              ]
  return {slots: slots, filled: []}
}

function new_conversation() {
  var sentence = new_sentence()
  return {sentences: [], current: sentence}
}

function fulfill_desire(conversation, value) {
  var conversation = conversation || convo

  var sentence = give_word(conversation.current, value)

  // TODO: allow multi-sentence conversations
  // TODO: bind convo and graph, so active_sentences can include the current convo and the convo can show highlighting etc (render::render_conversation)

  if(sentence.slots.length)
    return conversation

  return finalize_conversation(conversation, sentence)
}

function finalize_conversation(conversation, sentence) {
  var subject, verb, object, date, consent
  sentence.filled.forEach(function(slot) {
    if(slot.type === 'gettype') {
      var thing = add_thing(slot.value, {name: slot.name}, true)
      if(slot.oldkey === 'subject') subject = thing
      if(slot.oldkey === 'object' ) object  = thing
    }
    else if(slot.type === 'date') {
      date = slot.value
    }
    else if(slot.type === 'consent') {
      consent = slot.value
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
    verb = add_action(verb, {time: new Date(date).getTime(), consent: consent}, true)
    add_edge('the', verb._id, object._id, 0, true)
    add_edge('did', subject._id, verb._id, 0, true)
  }

  const q = G.v(verb).as('v').both().as('b').merge('v', 'b').run()
  highlightyo(q.map(x => x._id), 'activate')

  // start over
  // TODO: show the sentence
  // conversation = new_conversation()
  conversation.sentences.push(sentence)
  restart_sentence()
  // conversation.current = new_sentence()

  // force_rerender()

  return conversation
}

function give_word(sentence, value) {
  var slot = sentence.slots.shift()
  if(!slot)
    return error('This sentence is finished')

  // TODO: check this logic modularly
  if(slot.type === 'word') {
    var word = G.v({name: value, cat: slot.cat}).run()[0]
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
