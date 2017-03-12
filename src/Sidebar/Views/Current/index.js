import { h, render } from 'preact';
import Header from '../../../UiKit/Header/index';

const Current = () => {
  return (
    <div>
      <Header>Currently Showing</Header>
      <h3>Click any story to edit</h3>
      <div id="sentences"> </div>
    </div>
  );
};

export default Current;
