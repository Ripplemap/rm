import { h, render, Component } from 'preact'
import Header from 'UiKit/Header/index'

import {get_convo_html} from 'render'
import state from 'state'
import * as dom from 'dom'
import {convo, restart_sentence} from 'convo'

import Button from 'UiKit/Button/'
import './styles.css'

  // <p>We'd love to hear your stories! Let's start with your contact info:</p>
const consent_disclaimer =  <div>
  <p>To add your story, we need the consent of everyone in it. To obtain someone’s informed consent, they need to know:</p>
  <p>- That they’re consenting to being named in a story on the MozFest Ripple Map, and that MozFest attendees and organizers will be able to read that story</p>
  <p>- That there are risks we will do our best to protect them from: unintentional data usage, monitoring, surveillance</p>
  <p>- That at any time, they can change or remove their story.</p>
  <p>For transparency and accountability, they will be able to see that you have added them.</p>
</div>

const thanks = <div>
  <p>Thanks for adding your story, it's on the map!</p>
  <p>Tell us some other stories about your involvement in MozFest</p>
</div>


const Story = () => {
  return (
    <div class="Story">
      <Header>Add a story</Header>

      <div id="signup" class={state.email ? 'hide' : ''}>
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

          <p>At any time, you can change or remove your story. You will also be able to see if someone has added you to a story. Does this all sound okay to you?</p>


          <Button type="submit" buttonStyle="next">Next
            <i class="fa fa-chevron-right pl_1" aria-hidden="true"></i>
          </Button>
        </form>
      </div>

      <div id="storytime" class={state.email ? '' : 'hide'}>

    {!convo.current.filled.length && thanks}

        <form id="the-conversation" onSubmit={dom.submit_convo}>
          <div dangerouslySetInnerHTML={{__html: get_convo_html()}}></div>

    {convo.current.slots.length === 1 && consent_disclaimer}

          <Button type="submit" buttonStyle="next">
            <p onClick={restart_sentence} style={{textAlign: 'left', flex: 'inherit'}}>
              <i class="fa fa-chevron-left pl_1" aria-hidden="true"></i>
              Go back
            </p>
            Next
            <i class="fa fa-chevron-right pl_1" aria-hidden="true"></i>
          </Button>

        </form>

      </div>
    </div>
  )
}

export default Story
