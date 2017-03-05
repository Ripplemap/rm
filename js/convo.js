import {add_thing, add_action, add_edge} from 'model'
import * as dom from 'dom'
import {G} from 'graph'
import {render} from 'render'
import {error} from 'fun'


export let conversation = new_conversation()
export {join_conversation}

function join_conversation(conversation) {
  var wants = conversation.current.slots[0].key
  var value = dom.el(wants).value

  var convo = fulfill_desire(conversation, value)

  conversation = convo
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
