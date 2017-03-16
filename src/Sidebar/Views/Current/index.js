import { h, render } from 'preact';
import Header from 'UiKit/Header/index';

import {get_sentence_html} from 'render'
import * as dom from 'dom'
import {activate_highlighter, deactivate_highlighter} from 'highlight'


const Current = () => {
  return (
    <div>
      <Header>Currently Showing</Header>
      <h3>Click any story to edit</h3>
      <div id="sentences"
           onMouseover={activate_highlighter}
           onMouseout={deactivate_highlighter}
           onKeyup={dom.keyup_sentences}
           onClick={dom.click_sentences}
           dangerouslySetInnerHTML={{__html: get_sentence_html()}}>
      </div>
    </div>
  );
};

export default Current;
