import { h, render, Component } from 'preact'
import Header from 'UiKit/Header/index'

import {get_convo_html} from 'render'
import state from 'state'
import * as dom from 'dom'
import {restart_sentence} from 'convo'

import Button from 'UiKit/Button/'
import './styles.css'

const Story = () => {
  return (
    <div class="Story">
      <Header>Add a story</Header>

      <div id="signup" class={state.email ? 'hide' : ''}>
        <form id="login" onSubmit={dom.login} class="Story__form">
          <h3>Want to add something to the map?</h3>

          <p>We'd love to hear your stories! Let's start with your contact info:</p>
          <input name="email" id="email" type="text" placeholder="email" class="typeahead Story__input" />
          <Button type="submit" buttonStyle="next">Next
            <i class="fa fa-chevron-right pl_1" aria-hidden="true"></i>
          </Button>
        </form>
      </div>

      <div id="storytime" class={state.email ? '' : 'hide'}>
        <form id="the-conversation" onSubmit={dom.submit_convo}>
          <div dangerouslySetInnerHTML={{__html: get_convo_html()}}></div>

          <Button type="submit" buttonStyle="next">Next
            <i class="fa fa-chevron-right pl_1" aria-hidden="true"></i>
          </Button>

          <p onClick={restart_sentence}> Go back
            <i class="fa fa-chevron-left pl_1" aria-hidden="true"></i>
          </p>
        </form>
      </div>

    </div>
  )
}

export default Story
