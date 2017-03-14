import { h, render } from 'preact';
import Header from 'UiKit/Header/index';

import {get_convo_html} from 'render'
import './styles.css'

const Story = () => {
  return (
    <div class="Story">
      <Header>Add a story</Header>

      <div id="signup" >
        <form id="login" class="Story__form">
          <p>We'd love to hear your stories! Let's start with your contact info:</p>
          <input name="email" id="email" type="text" placeholder="email" class="typeahead Story__input" />
        </form>
      </div>

      <div id="storytime" class="hide">
        <h3>Want to add something to the map?</h3>
        <form id="the-conversation" dangerouslySetInnerHTML={{__html: get_convo_html()}}></form>
      </div>

      {/* TODO: give this a top-border */}
      {/* TODO: connect this to form submission */}
      {/* <NextButton>Next &gt;</NextButton> */}

    </div>
  );
};

export default Story;
