import { h, render, Component } from 'preact'
import Header from 'UiKit/Header/index'

import {get_convo_html} from 'render'
import state from 'state'
import * as dom from 'dom'

const Story = () => {
  return (
    <div>
      <Header>Add a story</Header>

      <div id="signup" class={state.email ? 'hide' : ''}>
        <form id="login" onSubmit={dom.login}>
          <p>We'd love to hear your stories! Let's start with your contact info:</p>
          <input name="email" id="email" type="text" placeholder="email" class="typeahead" />
        </form>
      </div>

      <div id="storytime" class={state.email ? '' : 'hide'}>
        <h3>Want to add something to the map?</h3>
        <form id="the-conversation"
              onSubmit={dom.submit_convo}
              dangerouslySetInnerHTML={{__html: get_convo_html()}}>
        </form>
      </div>

      {/* TODO: give this a top-border */}
      {/* TODO: connect this to form submission */}
      {/* <NextButton>Next &gt;</NextButton> */}

    </div>
  )
}

export default Story
