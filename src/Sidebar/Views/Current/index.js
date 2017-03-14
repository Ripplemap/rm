import { h, render } from 'preact';
import Header from 'UiKit/Header/index';

import {get_sentence_html} from 'render'

const Current = () => {
  return (
    <div>
      <Header>Currently Showing</Header>
      <h3>Click any story to edit</h3>
      <div id="sentences" dangerouslySetInnerHTML={{__html: get_sentence_html()}}> </div>
    </div>
  );
};

export default Current;
