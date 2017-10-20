import { h, render } from 'preact';
import './styles.css'
import Header from 'UiKit/Header/index';
import Button from 'UiKit/Button/index';

const Home = ({changeView}) => {
  return (
    <div>

      {/* General Welcome Message  */}
      <section class="Home__welcome">

      </section>

      {/* Add a story CTA */}
      <section class="Home__cta-addstory">

        <p class="Home__cta_text">
          Go ahead and add a new story or click around the map to read stories that have already been added
        </p>

        <Button onClick={() => changeView('story')}>
          Add a story
          <i class="fa fa-chevron-right pl_1" aria-hidden="true"></i>
        </Button>

        <a href="mailto:una@andalsotoo.net?subject=Someone added me to the Ripple Map without my consent&body=Please remove me, my name is:">
          <button >Someone put me in without my consent</button>
        </a>

      </section>

    </div>
  );
};

export default Home;
