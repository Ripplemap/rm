import { h, render } from 'preact';
import Header from '../../../UiKit/Header/index';
import Button from '../../../UiKit/Button/index';

const YourSelection = () => {
  return (
    <div>
      <Header>Your Selection</Header>

      {/* Add a story CTA */}
      <section class="YourSelection__cta-addstory">
        <p>Ready to add your own story?</p>
        <Button>Add a story ▶</Button>
      </section>

    </div>
  );
};

export default YourSelection;