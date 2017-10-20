import { h, render } from 'preact';
import Header from 'UiKit/Header/index';
import Button from 'UiKit/Button/index';

import {get_active_sentence_html} from 'render'

const YourSelection = ({changeView}) => {
  return (
    <div>
      <Header>Your Selection</Header>

      {/* Add a story CTA */}
      <section class="YourSelection__cta-addstory">
        {/* <p>Ready to add your own story?</p> */}
        <Button onClick={() => changeView('read_stories')}>Read all stories in the map ▶</Button>
      </section>

      <h3>Click any story to edit</h3>
      <div id="sentences" dangerouslySetInnerHTML={{__html: get_active_sentence_html()}}> </div>

    </div>
  );
};

export default YourSelection;
