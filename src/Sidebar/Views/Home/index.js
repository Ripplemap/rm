import { h, render } from 'preact';
import './styles.css'
import Header from '../../../UiKit/Header/index';
import Button from '../../../UiKit/Button/index';

const Home = ({changeView}) => {
  return (
    <div>

      {/* General Welcome Message  */}
      <section class="Home__welcome">

      </section>

      {/* Add a story CTA */}
      <section class="Home__cta-addstory">

        <p>Held every summer in Detroit, the Allied Media Conference brings together a vibrant and diverse community of people using media to incite change: filmmakers, radio producers, technologists, youth organizers, writers, entrepreneurs, musicians, dancers, and artists. This ripple map illustrates the many connections and outcomes that the AMC has fostered.</p>


        <p class="Home__cta_text">We'd love to hear your stories!</p>

        <Button onClick={() => changeView('story')}>Add a story ▶</Button>
      </section>

    </div>
  );
};

export default Home;
