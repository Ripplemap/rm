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
          Use this handy button to get started!
        </p>

        <Button onClick={() => changeView('story')}>
          Add a story
          <i class="fa fa-chevron-right pl_1" aria-hidden="true"></i>
        </Button>

        <p>
          You can also click around the map to read other people's stories of their Mozfest experience.
        </p>

        <p>
          If someone added you without your consent use the button below to let us know right away.
        </p>

        <a href="mailto:una@andalsotoo.net?subject=Someone added me to the Ripple Map without my consent&body=Please remove me, my name is:" style={{'text-decoration': 'none'}}>
          <Button>Someone put me in without my consent</Button>
        </a>

      </section>

    </div>
  );
};

export default Home;
