import { h, render, Component } from 'preact'
import Header from 'UiKit/Header/index'

import {get_convo_html, force_rerender} from 'render'
import state from 'state'
import * as dom from 'dom'
import {convo, restart_sentence} from 'convo'

import Button from 'UiKit/Button/'
import './styles.css'

const Story = () => {

  let consent_no = false

  function add_consent(param) {
    if(param) {
      // TODO: persist param
      return dom.submit_convo()
    }

    consent_no = true
  }

  const consent_list =
      <div>
        <div>- That you’re consenting to being named in a story on the MozFest Ripple Map, and that MozFest attendees and organizers will be able to read that story</div>
        <div>- You will be named in this story on the MozFest Ripple Map, and MozFest attendees and organizers will be able to read this story</div>
        <div>- That there are risks we will do our best to protect you from: unintentional data usage, monitoring, surveillance</div>
        <div>- That at any time, you can change your story or mark it for removal.</div>
      </div>

  const consent_disclaimer =
  <div>
    <div>To add this story we need the consent of everyone in it. To obtain someone’s informed consent tell them the following:</div>
    {consent_list}

        <div>Do you have the consent of everyone in this story?</div>
        <div class="choice org" onClick={add_consent('me')}>Yes, I’m the only one in this story</div>
        <div class="choice org" onClick={add_consent('verbal')}>Yes, verbal</div>
        <div class="choice org" onClick={add_consent('written')}>Yes, written</div>
        <div class="choice event" onClick={add_consent()}>No/not sure</div>
  </div>

  const thanks =
  <div>
    <p>Thanks for adding your story, it's on the map!</p>
  </div>

  const back_button =
  <p onClick={restart_sentence} style={{textAlign: 'left', flex: 'inherit'}}>
    <i class="fa fa-chevron-left pl_1" aria-hidden="true"></i>
    &nbsp;
    Go back
  </p>

  const footer_buttons =
  <Button type="submit" buttonStyle="next">
    {convo.current.filled.length && back_button || ''}
    Next
    <i class="fa fa-chevron-right pl_1" aria-hidden="true"></i>
  </Button>

  const how_to_consent =
  <div>
    <h4>Ask</h4>
    <p>If you’re not sure you have someone’s consent to add them to the Ripple Map, please ask them and provide the following information. You can print out or email this to yourself.</p>

<h4>Print/Email Consent Info</h4>
<p>Hi friend, I’d like to add a story about us meeting/collaborating/??? To the MozFest Ripple Map. The Ripple Map is a web application that visualizes stories about a program or event’s “ripple effect” — how the immediate outcomes of new learnings or connections give way to long term and large scale impacts.</p>

<p>Before you give me your consent, here’s what you need to know:</p>

    <div>- That you’re consenting to being named in a story on the MozFest Ripple Map, and that MozFest attendees and organizers will be able to read that story</div>
    <div>- You will be named in this story on the MozFest Ripple Map, and MozFest attendees and organizers will be able to read this story</div>
    <div>- That there are risks we will do our best to protect you from: unintentional data usage, monitoring, surveillance</div>
    <div>- That at any time, you can change your story or mark it for removal.</div>

    <p>Do I have your consent to name you in this story?</p>

  </div>

  const storytime = <div id="storytime">
    {!convo.current.filled.length && convo.sentences.length && thanks}

    <form id="the-conversation" onSubmit={dom.submit_convo}>
      <div dangerouslySetInnerHTML={{__html: get_convo_html()}}></div>

      {convo.current.slots.length === 1 && consent_disclaimer}

      {consent_no ? how_to_consent : ''}

      {footer_buttons}
    </form>
  </div>




  const signup =
  <div id="signup">
    <form id="login" onSubmit={dom.login} class="Story__form">
      <h3>Want to add something to the map?</h3>

      <p>We'd love to hear your stories! Let's start with your contact info:</p>
      <input name="email" id="email" type="text" placeholder="email" class="typeahead Story__input" />

      <p>Your name</p>
      <input name="name" id="name" type="text" placeholder="name" class="typeahead Story__input" />

      <p>How are you involved in Mozfest 2017?</p>
      <select name="mz_involved" id="mz_involved" class="Story__input">
        <option value="attended">attendee</option>
        <option value="wrangled at">wrangler</option>
        <option value="presented at">presenter</option>
      </select>

      <p>It’s really important to us that we have your informed consent to add your story to the map. Here’s what you need to know.</p>

      <p>Who will see this map: everyone at MozFest 2017</p>

      <p>You can change your story, but the edits are retained to ensure integrity. Stories (and edits) can be marked for removal. You will also be able to see if someone has added you to a story.</p>

      <p>Does this all sound okay to you?</p>

      <Button type="submit" buttonStyle="next">Next
        <i class="fa fa-chevron-right pl_1" aria-hidden="true"></i>
      </Button>
    </form>
  </div>



  return (
    <div class="Story">
      <Header>Add a story</Header>
      {state.email ? storytime : signup}
    </div>
  )
}

export default Story
