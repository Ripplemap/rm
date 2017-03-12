import { h, render } from 'preact';
import './styles.css'
import Header from '../../../UiKit/Header/index';
import Button from '../../../UiKit/Button/index';

const Home = ({changeView}) => {
  return (
    <div>

      {/* General Welcome Message  */}
      <section class="Home__welcome">
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Veniam quidem voluptatem laudantium fuga iste nulla eligendi mollitia velit amet laborum, quia blanditiis rerum, eius nobis quod ipsam sit recusandae ratione!
      </section>

      {/* Add a story CTA */}
      <section class="Home__cta-addstory">
        <p>We'd love to hear your stories!</p>
        <Button onClick={() => changeView('story')}>Add a story ▶</Button>
      </section>

    </div>
  );
};

export default Home;
