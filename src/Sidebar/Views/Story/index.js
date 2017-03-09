import { h, render } from 'preact';
import Header from '../../../UiKit/Header/index';

const Story = () => {
  return (
    <div>
      <Header>Add a story</Header>

        <div id="signup">
          <form id="login">
            <p>
              We'd love to hear your stories! Let's start with your contact info:
            </p>
            <input name="email" id="email" type="text" placeholder="email" class="typeahead" />
          </form>
        </div>

        <div id="storytime" class="hide">
          <h3>Want to add something to the map?</h3>
          <form id="the-conversation"></form>
          <p><em>Use <em>Tab</em> to autocomplete and <em>Return</em> to proceed. Reload the page to fix a mistake.</em></p>
        </div>

        <hr style="clear:both" />

        <div id="controls">
          <p>
            Currently viewing tags: <span id="tagnames"></span>
          </p>
          <p>
            Add a tag:
            <form id="addtag" action="">
              <select id="othertags" name="othertags"></select>
              <input name="" type="submit" value="Go!" />
            </form>
          </p>
        </div>

        <hr style="clear:both" />

        <h3>Click any story to edit</h3>

        <div id="sentences"> </div>

    </div>
  );
};

export default Story;