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

      <p>An annual celebration of the open Internet movement, where passionate technologists, educators, and makers come together to explore the future of the open Web and advocate for a healthy internet. This ripple map illustrates the many connections and outcomes that MozFest has fostered</p>

      <p class="Home__cta_text">We'd love to hear your stories!</p>

        <Button onClick={() => changeView('story')}>
          Add a story
          <i class="fa fa-chevron-right pl_1" aria-hidden="true"></i>
        </Button>

        <a href="mailto:una@andalsotoo.net?subject=Someone+added+me+to+the+Ripple+Map+without+my+consent&body=Please+remove+me,+my+name+is:">
          <button >Someone put me in without my consent</button>
        </a>

      </section>

    </div>
  );
};

export default Home;
