export function About() {
  return (
    <div className="container page-about">
      <h1 className="about-title">About Us</h1>

      <section className="about-section">
        <h2 className="about-section-title">Our Story</h2>
        <p>
          Squad Webshop started in a small garage in 2018 with a simple idea: make quality products
          accessible to everyone, without the hassle. What began as a weekend side-project between
          three friends has grown into a thriving online store serving thousands of happy customers.
        </p>
      </section>

      <section className="about-section">
        <h2 className="about-section-title">What We Sell</h2>
        <p>
          We carry a carefully curated selection of everyday essentials — from electronics and home
          goods to clothing and accessories. Every product on our shelves passes our quality check
          before it reaches you. If we wouldn't buy it ourselves, it doesn't make the cut.
        </p>
      </section>

      <section className="about-section">
        <h2 className="about-section-title">Our Values</h2>
        <ul className="about-values">
          <li>
            <strong>Honesty first.</strong> Clear pricing, no hidden fees, honest product
            descriptions.
          </li>
          <li>
            <strong>Customer obsessed.</strong> Fast support, easy returns, and we actually read
            your feedback.
          </li>
          <li>
            <strong>Built to last.</strong> We partner with suppliers who share our commitment to
            durability and sustainability.
          </li>
        </ul>
      </section>

      <section className="about-section">
        <h2 className="about-section-title">Meet the Team</h2>
        <div className="about-team-grid">
          <div className="about-team-card">
            <div className="about-team-avatar">A</div>
            <p className="about-team-name">Alex Chen</p>
            <p className="about-team-role">Co-founder &amp; CEO</p>
          </div>
          <div className="about-team-card">
            <div className="about-team-avatar">J</div>
            <p className="about-team-name">Jordan Taylor</p>
            <p className="about-team-role">Head of Product</p>
          </div>
          <div className="about-team-card">
            <div className="about-team-avatar">S</div>
            <p className="about-team-name">Sam Rivera</p>
            <p className="about-team-role">Lead Engineer</p>
          </div>
        </div>
      </section>
    </div>
  );
}
